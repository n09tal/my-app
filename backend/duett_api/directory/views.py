import logging

from django.conf import settings
from django.db import transaction
from django.core.mail.message import EmailMessage
from django.template.loader import render_to_string
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView

from .models import (
    VendorDirectory,
    FavoriteVendor,
    VendorReview,
    VendorClaim,
    VendorClaimDocument,
    PrivatePayCareRequest,
)
from .filters import VendorDirectoryFilter
from duett_api.services.models import ServiceType, FundingSource, County
from .serializers import (
    VendorDirectoryListSerializer,
    VendorDirectoryDetailSerializer,
    VendorDirectoryUpdateSerializer,
    FavoriteVendorSerializer,
    VendorReviewSerializer,
    VendorClaimSubmitSerializer,
    VendorClaimResponseSerializer,
    PrivatePayCareRequestSerializer,
)
from duett_api.users.handle_s3_utility import upload_to_s3
from django.core.files.storage import default_storage

logger = logging.getLogger(__name__)


@permission_classes([AllowAny])
class VendorDirectoryViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = VendorDirectory.objects.all()
    ordering = ["legal_name"]
    filter_backends = [DjangoFilterBackend]
    filterset_class = VendorDirectoryFilter

    def get_serializer_class(self):
        if self.action == "retrieve":
            return VendorDirectoryDetailSerializer
        if self.action in ["update", "partial_update"]:
            return VendorDirectoryUpdateSerializer
        return VendorDirectoryListSerializer

    def get_permissions(self):
        if self.action in ["update", "partial_update"]:
            return [IsAuthenticated()]
        return [AllowAny()]

    def get_queryset(self):
        return VendorDirectory.objects.prefetch_related(
            "county_services",
            "county_services__county",
            "county_services__service",
            "favorited_by",
            "funding_sources",
            "reviews",
        )

    def update(self, request, *args, **kwargs):
        vendor = self.get_object()

        if vendor.claimed_by != request.user and not request.user.is_staff:
            return Response(
                {"error": "You do not have permission to edit this vendor."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        vendor = self.get_object()

        if vendor.claimed_by != request.user and not request.user.is_staff:
            return Response(
                {"error": "You do not have permission to edit this vendor."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().partial_update(request, *args, **kwargs)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def mine(self, request):
        vendors = VendorDirectory.objects.filter(claimed_by=request.user)
        serializer = VendorDirectoryListSerializer(
            vendors, many=True, context={"request": request}
        )
        return Response(serializer.data)


@permission_classes([IsAuthenticated])
class FavoriteVendorViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = FavoriteVendorSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return FavoriteVendor.objects.filter(user=self.request.user).select_related(
            "vendor"
        )

    def destroy(self, request, pk=None):
        FavoriteVendor.objects.filter(user=request.user, vendor_id=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class VendorReviewViewSet(viewsets.ModelViewSet):
    serializer_class = VendorReviewSerializer

    def get_queryset(self):
        from django.db.models import Q

        queryset = VendorReview.objects.filter(
            vendor_id=self.kwargs["vendor_pk"]
        ).select_related("user")

        if self.request.user.is_authenticated:
            queryset = queryset.filter(
                Q(status=VendorReview.Status.APPROVED)
                | Q(
                    status__in=[
                        VendorReview.Status.PENDING,
                        VendorReview.Status.REJECTED,
                    ],
                    user=self.request.user,
                )
            )
        else:
            queryset = queryset.filter(status=VendorReview.Status.APPROVED)

        return queryset

    def list(self, request, *args, **kwargs):
        """Override list to customize count - only count approved reviews."""
        queryset = self.filter_queryset(self.get_queryset())

        # Calculate count based only on approved reviews
        # (excludes pending and rejected reviews from count)
        approved_count = queryset.filter(status=VendorReview.Status.APPROVED).count()

        # Get paginated results (includes user's pending/rejected reviews)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            # Override the count with approved reviews count
            response.data["count"] = approved_count
            return response

        # If pagination is not used, return consistent format
        serializer = self.get_serializer(queryset, many=True)
        return Response({"count": approved_count, "results": serializer.data})

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_object(self):
        if self.action in ["update", "partial_update", "destroy"]:
            from rest_framework.exceptions import NotFound

            try:
                obj = VendorReview.objects.get(
                    pk=self.kwargs["pk"], vendor_id=self.kwargs["vendor_pk"]
                )
            except VendorReview.DoesNotExist:
                raise NotFound("Review not found.")
            if obj.user != self.request.user:
                raise PermissionDenied("You can only modify your own reviews.")
            return obj
        return super().get_object()


class ServiceTypeListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        services = ServiceType.objects.all().order_by("name")
        data = [{"id": s.id, "name": s.name} for s in services]
        return Response(data)


class FundingSourceListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        funding_sources = FundingSource.objects.all().order_by("name")
        data = [{"id": f.id, "name": f.name} for f in funding_sources]
        return Response(data)


class CountyListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        counties = County.objects.all().order_by("name")
        data = [{"id": c.id, "name": c.name} for c in counties]
        return Response(data)


@permission_classes([IsAuthenticated])
class PrivatePayCareRequestViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = PrivatePayCareRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            PrivatePayCareRequest.objects.filter(created_by=self.request.user)
            .select_related("selected_vendor")
            .prefetch_related("notified_vendors", "notified_vendors__reviews")
        )


class VendorClaimViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    queryset = VendorClaim.objects.none()

    def get_serializer_class(self):
        if self.action == "create":
            return VendorClaimSubmitSerializer
        return VendorClaimResponseSerializer

    def create(self, request, vendor_pk=None):
        try:
            vendor = VendorDirectory.objects.get(pk=vendor_pk)
        except VendorDirectory.DoesNotExist:
            return Response(
                {"detail": "Vendor not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if vendor.claim_status == VendorDirectory.ClaimStatus.CLAIMED:
            return Response(
                {"detail": "This vendor has already been claimed."},
                status=status.HTTP_409_CONFLICT,
            )

        if VendorClaim.objects.filter(
            vendor=vendor,
            user=request.user,
            status=VendorClaim.Status.PENDING,
        ).exists():
            return Response(
                {"detail": "You already have a pending claim for this vendor."},
                status=status.HTTP_409_CONFLICT,
            )

        serializer = VendorClaimSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            claim = VendorClaim.objects.create(
                vendor=vendor,
                user=request.user,
                claimant_name=serializer.validated_data["claimant_name"],
                claimant_email=serializer.validated_data["claimant_email"],
                claimant_phone=serializer.validated_data["claimant_phone"],
                status=VendorClaim.Status.PENDING,
            )

            for doc in serializer.validated_data["documents"]:
                ext = doc.name.rsplit(".", 1)[-1].lower() if "." in doc.name else ""
                if getattr(settings, "AWS_STORAGE_BUCKET_NAME", None):
                    link = upload_to_s3(doc, doc.name)
                    if not link:
                        logger.error(
                            "Failed to upload document %s for claim %s",
                            doc.name,
                            claim.id,
                        )
                        raise Exception(f"Failed to upload file: {doc.name}")
                else:
                    path = f"vendor-claims/{claim.vendor_id}/{claim.id}/{doc.name}"
                    saved_path = default_storage.save(path, doc)
                    link = default_storage.url(saved_path)
                VendorClaimDocument.objects.create(
                    claim=claim,
                    link=link,
                    original_filename=doc.name,
                    file_type=ext,
                    file_size=doc.size,
                )

            vendor.claim_status = VendorDirectory.ClaimStatus.PENDING
            vendor.save(update_fields=["claim_status", "updated_at"])

        self._send_claim_submitted_emails(claim)

        response_serializer = VendorClaimResponseSerializer(claim)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="status")
    def claim_status(self, request, vendor_pk=None):
        try:
            VendorDirectory.objects.get(pk=vendor_pk)
        except VendorDirectory.DoesNotExist:
            return Response(
                {"detail": "Vendor not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        pending_claim = VendorClaim.objects.filter(
            vendor_id=vendor_pk,
            user=request.user,
            status=VendorClaim.Status.PENDING,
        ).first()

        if pending_claim:
            return Response(
                {
                    "has_pending_claim": True,
                    "claim_id": pending_claim.id,
                    "submitted_at": pending_claim.created_at,
                }
            )

        return Response(
            {
                "has_pending_claim": False,
                "claim_id": None,
                "submitted_at": None,
            }
        )

    def _send_claim_submitted_emails(self, claim):
        try:
            claimant_context = {
                "claimant_name": claim.claimant_name,
                "vendor_name": claim.vendor.display_name,
            }
            claimant_html = render_to_string(
                "directory/claim-submitted-claimant-email.html",
                claimant_context,
            )
            message = EmailMessage(
                "Your profile claim has been submitted",
                claimant_html,
                settings.DEFAULT_FROM_EMAIL,
                [claim.claimant_email],
            )
            message.content_subtype = "html"
            message.send()
        except Exception as e:
            logger.error(
                "Error sending claim submitted email to claimant: %s", e, exc_info=True
            )

        try:
            admin_email = getattr(settings, "DUETT_ADMIN_EMAIL", None)
            if admin_email:
                admin_context = {
                    "claimant_name": claim.claimant_name,
                    "claimant_email": claim.claimant_email,
                    "vendor_name": claim.vendor.display_name,
                    "vendor_id": claim.vendor.id,
                }
                admin_html = render_to_string(
                    "directory/claim-submitted-admin-email.html",
                    admin_context,
                )
                message = EmailMessage(
                    "New vendor claim requires review",
                    admin_html,
                    settings.DEFAULT_FROM_EMAIL,
                    [admin_email],
                )
                message.content_subtype = "html"
                message.send()
        except Exception as e:
            logger.error(
                "Error sending claim submitted email to admin: %s", e, exc_info=True
            )
