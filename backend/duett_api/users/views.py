import json
import random
from django.shortcuts import get_object_or_404
from django.http import Http404
from django.contrib.auth import get_user_model
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, status, mixins
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import permission_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Count, F, Prefetch, Value, Q, Case, When, Value, CharField
from django.conf import settings
from datetime import datetime, timezone, timedelta
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
import pyotp
from .signals.handlers import new_provider_profile_notify
from .filters import AngencyRequestsFilterBackend, UserFilterBackend
from .handle_s3_utility import upload_to_s3
from .models import (
    UserProfile,
    AgencyProfile,
    ProviderProfile,
    AgencyManagedUser,
    UserPreferences,
    TwoFactorAuthentication,
    UploadDocs,
)
from .serializers import (
    UserProfileSerializer,
    UserSerializer,
    AgencyProfileSerializer,
    ProviderProfileSerializer,
    AgencyManagedUserSerializer,
    UserPreferencesSerializer,
    CreateProviderProfileSerializer,
    CustomProviderProfileSerializer,
    UploadDocsPostSerializer,
    FileUploadSerializer,
    SingleFileUploadSerializer,
    CustomProviderProfileUpdateSerializer,
    DirectoryUserSerializer,
)
from .permissions import (
    AdminOnly,
    AgencyPermissions,
    ProviderPermissions,
    UserPermissions,
    UserProfilePermissions,
    AgencyAdminOnly,
    AgencyManagedUserPermissions,
    AgencyRequestsPermissions,
    UserPreferencesPermissions,
)
from duett_api.patients.models import Patient, PatientRequest
from duett_api.patients.serializers import (
    AgencyPatientSerializer,
    AgencyPatientRequestGetSerializer,
)
from django.http import JsonResponse
from django.core.exceptions import ObjectDoesNotExist
import logging
from .models import (
    UserProfile,
    AgencyProfile,
    ProviderProfile,
    AgencyManagedUser,
    UserPreferences,
    TwoFactorAuthentication,
    UploadDocs,
    Account,
)


from duett_api.patients.filters import (
    PatientRequestFilterSet,
    PatientRequestOrderingFilter,
)
from duett_api.services.models import ServiceType, FundingSource, ZipCode, County
from duett_api.services.serializers import (
    ServiceTypeSerializer,
    FundingSourceSerializer,
)
from duett_api.users.signals.handlers import send_document_upload_email

logger = logging.getLogger(__name__)


@permission_classes([AllowAny, UserPermissions])
class UserViewSet(viewsets.ModelViewSet):
    queryset = get_user_model().objects.all()
    serializer_class = UserSerializer

    filter_backends = (
        UserFilterBackend,
        # SearchFilter,
        OrderingFilter,
        DjangoFilterBackend,
    )

    search_fields = (
        "email",
        "userprofile__first_name",
        "userprofile__last_name",
        "groups__name",
    )

    ordering_fields = (
        "created_at",
        "email",
        "groups__name",
        "is_active",
        "updated_at",
        "userprofile__first_name",
        "userprofile__last_name",
    )

    def get_valid_date(self, param):
        try:
            return datetime.strptime(param, "%m/%d/%Y").strftime("%Y-%m-%d")
        except:
            pass

    def add_query(self, request):
        terms = request.GET.get("search").lower()
        valid_date = self.get_valid_date(terms)
        query = Q()
        if not valid_date:
            term_list = terms.split(" ")
            query = (
                Q(email__icontains=term_list[0])
                | Q(groups__name__icontains=term_list[0])
                | Q(userprofile__last_name__icontains=term_list[0])
                | Q(userprofile__first_name__icontains=term_list[0])
            )
            for term in term_list[1:]:
                query.add(Q(), Q.AND)
                query.add(
                    (
                        Q(email__icontains=term)
                        | Q(groups__name__icontains=term)
                        | Q(userprofile__last_name__icontains=term)
                        | Q(userprofile__first_name__icontains=term)
                    ),
                    query.connector,
                )
            if terms == "inactive":
                query.add(Q(is_active=False), Q.OR)
            elif terms == "active":
                query.add(Q(is_active=True), Q.OR)
        else:
            query.add(Q(created_at__date=valid_date), Q.OR)
            query.add(Q(updated_at__date=valid_date), Q.OR)
        return query

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        query = self.add_query(request)
        queryset = queryset.filter(query)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        queryset = get_user_model().objects.all()
        user = get_object_or_404(queryset, pk=pk)
        self.check_object_permissions(request, user)
        serializer = UserSerializer(user)
        return Response(serializer.data)

    @action(detail=True)
    def groups(self, request, pk=None):
        """
        Returns a list of all the group names that the given
        user belongs to.
        In the application so far, there should only be one
        group per user.
        """
        user = self.get_object()
        user_groups = user.groups.all()
        return Response([group.name for group in user_groups])


@permission_classes([IsAuthenticated, UserProfilePermissions])
class UserProfileView(APIView):
    def get_object(self, pk):
        try:
            return UserProfile.objects.get(pk=pk)
        except UserProfile.DoesNotExist:
            raise Http404

    def get(self, request, pk):
        profile = self.get_object(pk)
        serializer = UserProfileSerializer(profile)
        return Response(serializer.data)

    def put(self, request, pk, format=None):
        profile = self.get_object(pk)
        serializer = UserProfileSerializer(profile, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AboutMeView(APIView):
    def get(self, request):
        try:
            serializer = UserSerializer(request.user)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                "User does not exists.",
                status=status.HTTP_401_UNAUTHORIZED,
            )


@permission_classes([IsAuthenticated, AgencyPermissions])
class AgencyViewSet(
    mixins.RetrieveModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet
):
    queryset = AgencyProfile.objects.all()
    serializer_class = AgencyProfileSerializer


@permission_classes([IsAuthenticated, AgencyPermissions])
class AgencyPatientsViewSet(viewsets.ViewSet):
    def list(self, request, agency_pk):
        queryset = Patient.objects.filter(created_by=agency_pk)
        serializer = AgencyPatientSerializer(queryset, many=True)
        return Response(serializer.data)


@permission_classes([IsAuthenticated, ProviderPermissions])
class ProviderViewSet(
    mixins.RetrieveModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet
):
    queryset = ProviderProfile.objects.all()
    serializer_class = ProviderProfileSerializer


@permission_classes([IsAuthenticated, AgencyAdminOnly, AgencyManagedUserPermissions])
class AgencyManagedUserViewSet(viewsets.ModelViewSet):
    """
    Get list of users managed by a particular user.
    user_pk is for the supervisor's user id.
    """

    queryset = AgencyManagedUser.objects.all()
    serializer_class = AgencyManagedUserSerializer

    def list(self, request, user_pk):
        users = AgencyManagedUser.objects.filter(supervisor=user_pk)
        serializer = AgencyManagedUserSerializer(users, many=True)
        return Response(serializer.data)

    def create(self, request, user_pk):
        """
        Must pass in user_id of managed user in the request body.
        """
        user = get_object_or_404(get_user_model(), pk=request.data["user_id"])
        supervisor = get_object_or_404(get_user_model(), pk=user_pk)

        # check that user and supervisor are with the same account
        if user.account == supervisor.account:
            managed_user, created = AgencyManagedUser.objects.get_or_create(
                supervisor=supervisor, managed_user=user
            )
            serializer = AgencyManagedUserSerializer(managed_user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response("Unable to manage user", status=status.HTTP_400_BAD_REQUEST)


@permission_classes([IsAuthenticated, AgencyPermissions])
class AgencyUsersViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """
    Agency users can pull the list of other users from
    their own agency.
    """

    def list(self, request, agency_pk):
        if request.user.account.id == int(agency_pk):
            profiles = UserProfile.objects.filter(user__account=agency_pk)
            serializer = UserProfileSerializer(profiles, many=True)
            return Response(serializer.data)
        return Response(
            "Can only retrieve users from own agency.",
            status=status.HTTP_401_UNAUTHORIZED,
        )


@permission_classes([IsAuthenticated, AgencyPermissions, AgencyRequestsPermissions])
class AgencyRequestsViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """
    Agency users can pull a list of all requests from
    their own agency.
    """

    serializer_class = AgencyPatientRequestGetSerializer

    filter_backends = (
        AngencyRequestsFilterBackend,
        OrderingFilter,
        SearchFilter,
        DjangoFilterBackend,
        PatientRequestOrderingFilter,
    )
    filterset_class = PatientRequestFilterSet

    ordering_fields = (
        "id",
        "equipment",
        "smoking",
        "pets",
        "status",
        "request_prior_authorization",
        "transportation_required",
        "patient__first_name",
        "patient__last_name",
        "patient__zip",
        "created_by__userprofile__last_name",
        "refreshed_time",
        "patient__created_by__account__name",
    )
    # search_fields = (
    #     "patient__first_name",
    #     "patient__last_name",
    #     "patient__zip",
    # )
    ordering = "-refreshed_time"

    def get_queryset(self):
        queryset = PatientRequest.objects.all()
        queryset = queryset.annotate(
            display_status=Case(
                When(
                    is_archived=PatientRequest.Archived.ARCHIVED, then=Value("Archived")
                ),
                When(status=PatientRequest.Statuses.OPEN, then=Value("Open")),
                When(status=PatientRequest.Statuses.CLOSED, then=Value("Matched")),
                When(
                    status=PatientRequest.Statuses.PENDING,
                    then=Value("Submissions Received"),
                ),
                When(
                    status=PatientRequest.Statuses.PARTIALLY_MATCHED,
                    then=Value("Partially Matched"),
                ),
                default=Value("Open"),
                output_field=CharField(),
            )
        )
        return queryset


@permission_classes([IsAuthenticated, AdminOnly])
class DeactivateUsersView(APIView):
    http_method_names = ["post"]

    def post(self, request):
        user_ids = request.data.get("user_ids")
        if not user_ids:
            raise Exception("You must provide a list of user IDs")

        get_user_model().objects.filter(
            account=request.user.account, id__in=user_ids
        ).exclude(id=request.user.id).update(is_active=False)

        return Response("Success", status.HTTP_200_OK)


@permission_classes([IsAuthenticated, AdminOnly])
class ActivateUsersView(APIView):
    http_method_names = ["post"]

    def post(self, request):
        user_ids = request.data.get("user_ids")
        if not user_ids:
            raise Exception("You must provide a list of user IDs")

        get_user_model().objects.filter(
            account=request.user.account, id__in=user_ids
        ).update(is_active=True)

        return Response("Success", status.HTTP_200_OK)


@permission_classes([IsAuthenticated, UserPreferencesPermissions])
class UserPreferencesView(APIView):
    def post(self, request, pk):
        request_table_columns = request.data["request_table_columns"]
        user = get_object_or_404(get_user_model(), pk=pk)
        obj, created = UserPreferences.objects.update_or_create(
            user=user,
            defaults={"request_table_columns": request_table_columns},
        )
        serializer = UserPreferencesSerializer(obj)
        if created:
            return Response(serializer.data, status.HTTP_201_CREATED)
        return Response(serializer.data)

    def get(self, request, pk):
        obj = get_object_or_404(UserPreferences, user=pk)
        serializer = UserPreferencesSerializer(obj)
        return Response(serializer.data)


def is_valid_phone_number(phone_number):

    account_sid = settings.TWILIO_ACCOUNT_SID
    auth_token = settings.TWILIO_AUTH_TOKEN

    try:
        client = Client(account_sid, auth_token)
        response = client.lookups.phone_numbers(f"+1{phone_number}").fetch(
            type="carrier"
        )
        return True
    except TwilioRestException as e:
        return False


@permission_classes([IsAuthenticated])
class ConfigureOTP(APIView):
    def post(self, request):
        try:
            user_id = request.data.get("user_id")
            user = get_object_or_404(get_user_model(), pk=user_id)
            phone_number = request.data.get("phone_number")
            account_sid = settings.TWILIO_ACCOUNT_SID
            auth_token = settings.TWILIO_AUTH_TOKEN
            twilio_phone_number = settings.TWILIO_PHONE_NUMBER

            otp_obj = TwoFactorAuthentication.objects.get(user=user)
            if not phone_number:
                phone_number = otp_obj.phone_number
        except TwoFactorAuthentication.DoesNotExist:
            pass

        if not phone_number:
            return Response(
                {"error": "Phone number is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not is_valid_phone_number(phone_number):
            return Response(
                {"error": "Please enter a valid US number"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Continue with the rest of your code for generating OTP and sending SMS
        otp = str(random.randint(0, 999999)).zfill(6)
        expiration = datetime.now(timezone.utc) + timedelta(seconds=300)

        otp_obj, _ = TwoFactorAuthentication.objects.update_or_create(
            user=user,
            defaults={
                "otp_code": otp,
                "otp_expiration": expiration,
                "phone_number": phone_number,
                "last_configured_2fa": datetime.now(timezone.utc),
            },
        )

        # Send OTP via Twilio SMS
        try:
            client = Client(account_sid, auth_token)
            message = client.messages.create(
                body=f"Your 6-digit code for verification is: {otp}",
                from_=twilio_phone_number,
                to=f"+1{phone_number}",
            )
        except TwilioRestException as e:
            return Response(
                {"error": "Failed to send OTP via SMS."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        response_data = {"status": "success", "expiration": expiration}

        return Response(response_data, status=status.HTTP_200_OK)


@permission_classes([IsAuthenticated])
class VerifyOTP(APIView):
    def post(self, request):
        try:
            user_id = request.data.get("user_id")
            user_otp = request.data.get("otp")

            user = get_object_or_404(get_user_model(), pk=user_id)
            otp_obj = TwoFactorAuthentication.objects.get(user=user)
        except TwoFactorAuthentication.DoesNotExist:
            return Response(
                {"status": "error", "message": "Invalid code entered"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if otp_obj.otp_expiration.replace(tzinfo=timezone.utc) < datetime.now(
            timezone.utc
        ):
            return Response(
                {
                    "status": "error",
                    "message": "Your code has expired. Click 'Resend Code' and enter the new code you receive to login.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if str(otp_obj.otp_code).zfill(6).strip() != user_otp.strip():
            return Response(
                {
                    "error": "error",
                    "message": "Invalid code entered. Please re-enter the code you received",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not otp_obj.otp_2fa_enabled:
            otp_obj.otp_2fa_enabled = True
            otp_obj.last_login_2fa = datetime.now(timezone.utc)
            otp_obj.last_prompted_provider = None
            otp_obj.save()

        response_data = {"status": "success", "expiration": datetime.now()}

        return Response(response_data, status=status.HTTP_200_OK)


@permission_classes([IsAuthenticated])
class PromptProviderAccount(APIView):
    def post(self, request):

        try:
            user_id = request.data.get("user_id")
            user = get_object_or_404(get_user_model(), pk=user_id)
            otp_obj, _ = TwoFactorAuthentication.objects.update_or_create(
                user=user,
                defaults={
                    "last_prompted_provider": datetime.now(timezone.utc),
                },
            )
        except TwoFactorAuthentication.DoesNotExist:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        return Response(status=status.HTTP_200_OK)


@permission_classes([IsAuthenticated])
class GenerateQR(APIView):
    def post(self, request):
        data = request.data
        user_id = data.get("user_id", None)

        user = get_object_or_404(get_user_model(), pk=user_id)
        if user is None:
            return Response(
                {"status": "fail", "message": f"No user found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        qr_base32 = pyotp.random_base32()
        qr_auth_url = pyotp.totp.TOTP(qr_base32).provisioning_uri(
            name=user.email.lower(), issuer_name="Duett App"
        )

        otp_obj, _ = TwoFactorAuthentication.objects.update_or_create(
            user=user,
            defaults={
                "qr_auth_url": qr_auth_url,
                "qr_base32": qr_base32,
            },
        )

        return Response(
            {"base32": qr_base32, "auth_url": qr_auth_url},
            status=status.HTTP_201_CREATED,
        )


@permission_classes([IsAuthenticated])
class VerifyQR(APIView):
    def post(self, request):
        try:
            data = request.data
            user_id = data.get("user_id")
            otp_token = data.get("token")
            user = get_object_or_404(get_user_model(), pk=user_id)
            otp_obj = TwoFactorAuthentication.objects.get(user=user)
            totp = pyotp.TOTP(otp_obj.qr_base32)
            if not totp.verify(otp_token):
                return Response(
                    {
                        "status": "error",
                        "message": "Invalid code entered. Please re-enter the correct code",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            otp_obj.qr_2fa_enabled = True
            otp_obj.verified = True
            otp_obj.save()

        except TwoFactorAuthentication.DoesNotExist:
            return Response(
                {"status": "error", "message": "User do not exist"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(status=status.HTTP_200_OK)


@permission_classes([IsAuthenticated])
class ValidateQR(APIView):
    def post(self, request):
        message = "Invalid code entered. Please re-enter the correct code"
        data = request.data
        user_id = data.get("user_id", None)
        otp_token = data.get("token", None)

        user = get_object_or_404(get_user_model(), pk=user_id)
        otp_obj = TwoFactorAuthentication.objects.get(user=user)

        if otp_obj is None:
            return Response(
                {"status": "fail", "message": f"No user found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not otp_obj.verified:
            return Response(
                {"status": "fail", "message": "QR must be verified first"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        totp = pyotp.TOTP(otp_obj.qr_base32)
        if not totp.verify(otp_token, valid_window=1):
            return Response(
                {"status": "fail", "message": message},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(status=status.HTTP_200_OK)


@permission_classes([IsAuthenticated])
class DisableQR(APIView):
    def post(self, request):
        data = request.data
        user_id = data.get("user_id", None)

        try:
            user = get_object_or_404(get_user_model(), pk=user_id)
            otp_obj = TwoFactorAuthentication.objects.get(user=user)
            otp_obj.qr_2fa_enabled = False
            otp_obj.verified = False
            otp_obj.qr_base32 = None
            otp_obj.qr_auth_url = None
            otp_obj.save()

        except:
            return Response(
                {"status": "fail", "message": f"No user found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(status=status.HTTP_200_OK)


class CreateProviderProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreateProviderProfileSerializer(data=request.data, many=True)
        if serializer:
            return Response(
                {"message": "Profile created"}, status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProviderProfileServiceTypeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk=None):
        try:
            provider_profile = ProviderProfile.objects.get(
                account=request.user.account.id
            )
        except ProviderProfile.DoesNotExist:
            return Response(
                {"status": "No profile was found against this Email."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        funding_sources = provider_profile.funding_sources.all()
        service_type_ids = (
            ServiceType.objects.filter(fundingsource__in=funding_sources)
            .distinct()
            .values_list("id", flat=True)
        )
        service_types = ServiceType.objects.filter(id__in=service_type_ids)
        serializer = ServiceTypeSerializer(service_types, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, pk=None):

        try:
            provider_profile = ProviderProfile.objects.get(
                account=request.user.account.id
            )
        except ProviderProfile.DoesNotExist:
            return Response(
                {"status": "No profile found against this ID."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        service_type_ids = request.data.get("service_type_ids", [])
        if not service_type_ids:
            return Response(
                {"status": "No service was selected."},
                status=status.HTTP_204_NO_CONTENT,
            )

        service_types = ServiceType.objects.filter(id__in=service_type_ids)
        provider_profile.services.set(service_types)
        provider_profile.save()
        updated_service_types = provider_profile.services.all()
        serializer = ServiceTypeSerializer(updated_service_types, many=True)

        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ProviderProfileFundingSourceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk=None):
        provider_profile = ProviderProfile.objects.filter(
            account=request.user.account
        ).first()
        if not provider_profile:
            return Response(
                {"status": "No profile was found against this Email."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        funding_sources = FundingSource.objects.all()
        serializer = FundingSourceSerializer(funding_sources, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, pk=None):
        try:
            provider_profile = ProviderProfile.objects.get(
                account=request.user.account.id
            )
        except ProviderProfile.DoesNotExist:
            return Response(
                {"status": "No profile was found against this ID."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        funding_source_ids = request.data.get("funding_source_ids", [])
        if not funding_source_ids:
            return Response(
                {"status": "No funding source was selected"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        funding_sources = FundingSource.objects.filter(id__in=funding_source_ids)
        provider_profile.funding_sources.set(funding_sources)
        return Response(
            {"status": "Funding sources was added successfully"},
            status=status.HTTP_201_CREATED,
        )


class UploadDocsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk=None):
        try:
            provider_profile = ProviderProfile.objects.get(
                account=request.user.account.id
            )
        except ProviderProfile.DoesNotExist:
            return Response(
                {"error": "Provider profile was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        records = UploadDocs.objects.filter(provider_profile=provider_profile)
        serializer = UploadDocsPostSerializer(records, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        try:
            provider_profile = ProviderProfile.objects.get(
                account=request.user.account.id
            )
        except ProviderProfile.DoesNotExist:
            return Response(
                {"error": "Provider profile was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not request.data:
            return Response(
                {"error": "No document was provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = FileUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Process and upload files
        files = request.FILES.getlist("files")
        files_data = []
        uploaded_docs = []  # To store the actual UploadDocs objects

        for file in files:
            file_name = file.name
            link = upload_to_s3(file, file_name)
            if not link:
                return Response(
                    {"error": f"Invalid file '{file_name}'"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            files_data.append(dict(file_name=file_name, link=link))

        # Create the documents
        serializer = UploadDocsPostSerializer(
            data=files_data,
            many=True,
            context={
                "provider_profile": provider_profile,
            },
        )

        if serializer.is_valid():
            # Save the new documents
            uploaded_docs = serializer.save()

            # Determine if this is an update or initial upload
            existing_docs_count = UploadDocs.objects.filter(
                provider_profile=provider_profile
            ).count()

            is_update = existing_docs_count > len(files)

            if is_update:
                # For updates, only send the newly uploaded documents for review
                send_document_upload_email(
                    sender=UploadDocs,
                    instance=None,  # Not needed when we pass new_documents
                    provider_profile=provider_profile,
                    created=False,
                    new_documents=uploaded_docs,  # Pass the newly created documents
                )
            else:
                # For initial upload, send all documents
                send_document_upload_email(
                    sender=UploadDocs,
                    instance=files_data,
                    provider_profile=provider_profile,
                    created=True,
                )

                # Send welcome email only for initial upload
                User = get_user_model()
                try:
                    user = User.objects.get(account=provider_profile.account)
                    new_provider_profile_notify(
                        sender=ProviderProfile, instance=user, created=True
                    )
                except User.DoesNotExist:
                    logger.warning(
                        f"No user found for provider profile: {provider_profile.id}"
                    )

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UploadDocsPatchView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk=None):
        try:
            provider_profile = ProviderProfile.objects.get(
                account=request.user.account.id
            )
        except ProviderProfile.DoesNotExist:
            return Response(
                {"error": "Provider profile was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if provider_profile.all_docs_accepted:
            return Response(
                {"status": "Documents for this profile have been accepted."},
                status=status.HTTP_200_OK,
            )

        instance = UploadDocs.objects.get(id=pk)
        file = request.FILES.get("file")
        file_name = file.name
        link = upload_to_s3(file, file_name)
        if not link:
            return Response(
                {"error": f"Invalid file '{file_name}'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        file_data = dict(file_name=file_name, link=link)
        serializer = UploadDocsPostSerializer(instance, data=file_data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CustomProviderProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            user_email = get_user_model().objects.get(account=request.user.account)
        except Exception:
            return Response(
                {"error": "Profile against this email does not exist."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = CustomProviderProfileSerializer(request.data)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        user_email = request.user.email
        if not get_user_model().objects.filter(email=user_email).exists():
            return Response(
                {"error": "This email does not exist."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = CustomProviderProfileSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        user = request.user
        try:
            user_profile = UserProfile.objects.get(user=user)
        except UserProfile.DoesNotExist:
            return Response(
                {"error": "Profile does not exist."}, status=status.HTTP_400_BAD_REQUEST
            )

        serializer = CustomProviderProfileUpdateSerializer(
            user_profile, data=request.data, context={"request": request}, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProviderProfileDashBoardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            provider_profile = ProviderProfile.objects.get(
                account=request.user.account.id
            )
        except ProviderProfile.DoesNotExist:
            return Response(
                {"error": "Provider profile was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if provider_profile.all_docs_accepted:
            return Response(
                {"status": "Documents for this profile have been accepted."},
                status=status.HTTP_202_ACCEPTED,
            )

        return Response(
            {"status": "Documents for this profile have not been accepted."},
            status=status.HTTP_206_PARTIAL_CONTENT,
        )


class CheckUserSignupStatus(APIView):
    def post(self, request, *args, **kwargs):
        data = request.data
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return Response(
                {"status": "Email and password required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        User = get_user_model()

        # Debug: Log the total number of users
        total_users = User.objects.count()
        logger.info(f"Total users in database: {total_users}")

        # Debug: Check if email exists in a case-insensitive manner
        user_exists_case_insensitive = User.objects.filter(email__iexact=email).exists()
        logger.info(f"User exists (case-insensitive): {user_exists_case_insensitive}")

        try:
            user = User.objects.get(email=email)
            logger.info(f"User found for email: {email}")
        except ObjectDoesNotExist:
            logger.warning(f"User not found for email: {email}")
            return Response(
                {
                    "status": "Email does not exist",
                    "debug_info": {
                        "total_users": total_users,
                        "case_insensitive_match": user_exists_case_insensitive,
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if not user.check_password(password):
            return Response(
                {"status": "Invalid password"}, status=status.HTTP_401_UNAUTHORIZED
            )

        # Check if the user belongs to the "Care Provider Admin" group
        if not user.groups.filter(name="Care Provider Admin").exists():
            logger.info(
                f"User {email} is not a Care Provider Admin. Skipping profile checks."
            )
            return Response(
                {"status": "User is not a Care Provider Admin"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # User exists and password is correct, start checking steps
        step_counter = 0
        response_data = {"email": user.email}
        # Check for Account and ProviderProfile (Step 1)
        try:
            account = user.account
            provider_profile = ProviderProfile.objects.get(account=account)
            if provider_profile.all_docs_accepted:
                return Response(
                    {"status": "Complete signup", "message": "User can login normally"},
                    status=status.HTTP_200_OK,
                )
            step_counter = 1
            response_data["provider_profile"] = {
                "phone": provider_profile.phone,
                "first_name": user.userprofile.first_name,
                "last_name": user.userprofile.last_name,
                "company": account.name,
                "legalEntity": account.legal_name,
            }
            logger.info(f"ProviderProfile found for user: {user.email}")
        except ObjectDoesNotExist:
            logger.warning(f"ProviderProfile not found for user: {user.email}")
            return Response(
                {
                    "status": "Incomplete signup",
                    "step": step_counter,
                    "data": response_data,
                },
                status=status.HTTP_200_OK,
            )

        # Check for Funding Sources (Step 2)
        funding_sources = provider_profile.funding_sources.all()
        if funding_sources.exists():
            step_counter = 2
            response_data["funding_sources"] = list(
                funding_sources.values_list("id", flat=True)
            )
            logger.info(f"Funding sources found for user: {user.email}")
        else:
            logger.warning(f"No funding sources found for user: {user.email}")
            return Response(
                {
                    "status": "Incomplete signup",
                    "step": step_counter,
                    "data": response_data,
                },
                status=status.HTTP_200_OK,
            )

        # Check for Services (Step 3)
        services = provider_profile.services.all()
        if services.exists():
            step_counter = 3
            response_data["services"] = list(services.values("id", "name"))
            logger.info(f"Services found for user: {user.email}")
        else:
            logger.warning(f"No services found for user: {user.email}")
            return Response(
                {
                    "status": "Incomplete signup",
                    "step": step_counter,
                    "data": response_data,
                },
                status=status.HTTP_200_OK,
            )

        # Check for Zip Codes and Counties (Step 4)
        zip_codes = provider_profile.zip_codes.all()
        if zip_codes.exists():
            step_counter = 4
            counties = zip_codes.values("county__id", "county__name").distinct()
            response_data["counties"] = [
                {"id": county["county__id"], "name": county["county__name"]}
                for county in counties
            ]
            logger.info(f"Zip codes and counties found for user: {user.email}")
        else:
            logger.warning(f"No zip codes found for user: {user.email}")
            return Response(
                {
                    "status": "Incomplete signup",
                    "step": step_counter,
                    "data": response_data,
                },
                status=status.HTTP_200_OK,
            )

        # Check for uploaded documents (Step 5)
        upload_docs = UploadDocs.objects.filter(provider_profile=provider_profile)
        if upload_docs.exists():
            logger.info(f"Documents found for user: {user.email}")
            return Response(
                {"status": "Complete signup", "message": "User can login normally"},
                status=status.HTTP_200_OK,
            )
        else:
            logger.warning(f"No documents found for user: {user.email}")
            return Response(
                {
                    "status": "Incomplete signup",
                    "step": step_counter,
                    "data": response_data,
                },
                status=status.HTTP_200_OK,
            )


class ProviderZipCodesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            provider_profile = ProviderProfile.objects.get(account=request.user.account)

            # Get all counties linked to the provider
            provider_counties = provider_profile.counties.all().order_by("name")

            # Get all zip codes currently linked to the provider
            provider_zip_codes = provider_profile.zip_codes.all()
            provider_zip_codes_ids = set(
                provider_zip_codes.values_list("id", flat=True)
            )

            response_data = []
            for county in provider_counties:
                # Add the is_serviceable filter here
                county_zip_codes = county.zip_codes.filter(
                    is_serviceable=True
                ).order_by("zip")

                # Only proceed if county has serviceable zip codes
                if county_zip_codes.exists():
                    county_data = {
                        "id": county.id,
                        "name": county.name,
                        "zipCodes": [
                            {
                                "id": zip_code.id,
                                "zip": zip_code.zip,
                                "isLinked": zip_code.id in provider_zip_codes_ids,
                            }
                            for zip_code in county_zip_codes
                        ],
                    }
                    response_data.append(county_data)

            return Response(response_data, status=status.HTTP_200_OK)

        except ProviderProfile.DoesNotExist:
            return Response(
                {"error": "Provider profile not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

    def patch(self, request):
        try:
            provider_profile = ProviderProfile.objects.get(account=request.user.account)

            zip_code_ids = request.data.get("zipCodeIds", [])
            print(f"Received zip code IDs: {zip_code_ids}")

            if not isinstance(zip_code_ids, list):
                return Response(
                    {"error": "zipCodeIds must be a list"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Get the zip codes that were sent
            selected_zip_codes = ZipCode.objects.filter(id__in=zip_code_ids)

            # Start a transaction to ensure data consistency
            from django.db import transaction

            with transaction.atomic():
                # Only update zip codes, leave counties unchanged
                provider_profile.zip_codes.set(selected_zip_codes)

            return Response(
                {
                    "message": "Successfully updated zip codes",
                    "zip_codes_updated": list(
                        selected_zip_codes.values_list("zip", flat=True)
                    ),
                },
                status=status.HTTP_200_OK,
            )

        except ProviderProfile.DoesNotExist:
            return Response(
                {"error": "Provider profile not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            logger.error("Error in PATCH for provider profile: %s", e, exc_info=True)
            return Response(
                {"error": f"An error occurred while saving: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@permission_classes([IsAuthenticated])
class DirectoryUserView(APIView):
    def get(self, request):
        user = request.user

        if user.account is not None:
            return Response(
                {"error": "This endpoint is for directory users only."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = DirectoryUserSerializer(user)
        return Response(serializer.data)

    def put(self, request):
        user = request.user

        if user.account is not None:
            return Response(
                {"error": "This endpoint is for directory users only."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = DirectoryUserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        user = request.user

        if user.account is not None:
            return Response(
                {"error": "This endpoint is for directory users only."},
                status=status.HTTP_403_FORBIDDEN,
            )

        user.is_active = False
        user.save()
        return Response({"message": "Account deactivated"}, status=status.HTTP_200_OK)


class DirectoryUserRegistrationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = DirectoryUserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(
                DirectoryUserSerializer(user).data, status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
