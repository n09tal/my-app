import io
import os
import json
import logging
import zipcodes
from datetime import datetime
from django.conf import settings

logger = logging.getLogger(__name__)
from django.http import HttpResponseNotFound, Http404, request, HttpResponse
from django.shortcuts import get_object_or_404
from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import SimpleDocTemplate, Spacer, Paragraph, Table, TableStyle, Image, PageTemplate
from rest_framework import status, viewsets, mixins
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.db.models import Q, Prefetch
from django.contrib.sites.models import Site
from django.utils import timezone
from duett_api.users.models import User
from rest_framework.generics import CreateAPIView, RetrieveUpdateAPIView
from rest_framework.views import APIView
from rest_framework.decorators import permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import LimitOffsetPagination 
from django.db.models.functions import Concat,Lower
from duett_api.patients.tasks import send_care_request_notifications
# from reportlab.pdfgen import canvas
# from reportlab.lib.pagesizes import letter
# from reportlab.lib import colors
# from reportlab.lib.styles import getSampleStyleSheet
# from reportlab.lib.pagesizes import letter, landscape   
# from reportlab.lib.units import inch
# from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
# from django.http import HttpResponse
# import io

from rest_framework.filters import (
    SearchFilter,
    OrderingFilter,
)
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, F, Prefetch, Value, Q, Case, When, Value, CharField
from rest_framework.decorators import action

from .filters import (
    PatientRequestFilterBackend,
    PatientFilterBackend,
    PatientRequestFilterSet,
    RequestNotesFilterBackend,
    PatientRequestOrderingFilter
)
from .models import (
    EmailData,
    Patient,
    PatientRequest,
    ServiceRequested,
    RequestNotes,
    TableColumns,
    ArchivedDeletePatientRequest,
    PatientActivity
)
from duett_api.users.models import Account, ProviderProfile, User
from duett_api.services.models import ServiceType, FundingSource, ZipCode
from duett_api.services.serializers import (
    FundingSourceSerializer,
    ServiceTypeSerializer,
)
from .serializers import (
    AgencyPatientRequestGetSerializer,
    ArchivedDeletePatientRequestSerializer,
    PatientRequestUpdateSerializer,
    AgencyPatientSerializer,
    ProviderPatientRequestGetSerializer,
    RequestNotesSerializer,
    ServiceRequestedPostSerializer,
    TableColumnsSerializer,
    RequestActivitySerializer,
    AgencyPatientRequestSearchSerializer,
    AgencyPatientSearchSerializer
)
from .permissions import (
    PatientPermissions,
    PatientRequestPermissions,
    AgencyOnly,
    ProviderOnly,
    RequestNotesPermissions,
    ServiceMatchPermissions,
    ProviderMatchPermissions,
    AgencyManagerOnly
)
from duett_api.patients.utils import insert_patient_activity, REQUEST_EVENT


@permission_classes([IsAuthenticated, PatientPermissions])
class PatientViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Patient.objects.all()
    serializer_class = AgencyPatientSerializer

    filter_backends = (
        PatientFilterBackend,
        SearchFilter,
        OrderingFilter,
        DjangoFilterBackend,
    )
    search_fields = ("first_name", "last_name", "email")
    ordering_fields = (
        "first_name",
        "last_name",
        "zip",
        "state",
        "gender",
    )
    ordering = ("last_name", "first_name")
    filterset_fields = (
        "first_name",
        "last_name",
        "zip",
        "state",
        "gender",
        "email",
    )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(
            data={
                "created_by": request.user.account.agencyprofile.pk,
                **request.data,
            }
        )
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )


@permission_classes([IsAuthenticated, PatientRequestPermissions])
class PatientRequestViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """
    This viewset is for endpoint `/api/requests/`
    and will return all patients that the user is authorized
    to see.
    This viewset is not meant for creating new PatientRequest objects.
    Use CreateRequestView for creating new requests, because it uses
    `/api/patients/:id/requests/` to associate the request with a patient.
    """

    queryset = PatientRequest.objects.all()

    filter_backends = (
        PatientRequestFilterBackend,
        # PatientRequestSearchFilter,
        OrderingFilter,
        DjangoFilterBackend,
    )

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
    ordering = ("-refreshed_time",)
    filterset_class = PatientRequestFilterSet

    def get_queryset(self):
        queryset = PatientRequest.objects.all()
        account = self.request.user.account
        if account.type == Account.Types.Provider:
            queryset = queryset.filter(
                patient__zip__in=ZipCode.objects.filter(
                    is_serviceable=True
                ).values_list("zip", flat=True)
            )
        else:
            queryset = queryset.annotate(
                display_status=Case(
                    When(is_archived=PatientRequest.Archived.ARCHIVED, then=Value("Archived")),
                    When(status=PatientRequest.Statuses.OPEN, then=Value("Open")),
                    When(status=PatientRequest.Statuses.CLOSED, then=Value("Matched")),
                    When(status=PatientRequest.Statuses.PENDING, then=Value("Submissions Received")),
                    When(status=PatientRequest.Statuses.PARTIALLY_MATCHED, then=Value("Partially Matched")),
                    default=Value("Open"),
                    output_field=CharField()
                )
            )
        return queryset

    def filter_queryset(self, *args, **kwargs):
        queryset = super(PatientRequestViewSet, self).filter_queryset(*args, **kwargs)
        if self.action == "list":
            queryset = self._modify_queryset(queryset)
        return queryset

    def _modify_queryset(self, queryset):
        account = self.request.user.account
        if account.type == Account.Types.Provider:
            try:
                provider_profile = account.providerprofile
            except ProviderProfile.DoesNotExist:
                # If provider profile doesn't exist, return empty queryset
                return queryset.none()
            qs = queryset
            # Todo: As of now 3 query is firing at backend, tried to use annotate But annotate was giving duplicate
            #  records. Some more optimization scope can be done.
            qs0 = qs.filter(is_archived=PatientRequest.Archived.ARCHIVED).annotate(
                display_status=Value("Archived", output_field=CharField())
            )
            lst_id_qs0 = qs0.values_list("id", flat=True)

            qs1 = (
                qs.exclude(id__in=lst_id_qs0)
                .filter(servicerequested__match__pk=provider_profile.pk)
                .annotate(display_status=Value("Matched", output_field=CharField()))
            )

            lst_id_qs1 = qs1.values_list("id", flat=True)

            qs2 = (
                qs.filter(servicerequested__interests__pk=provider_profile.pk)
                .exclude(id__in=lst_id_qs1)
                .annotate(display_status=Value("Submitted", output_field=CharField()))
            )

            lst_id_qs2 = qs2.values_list("id", flat=True)

            qs3 = (
                qs.exclude(id__in=lst_id_qs1)
                .exclude(id__in=lst_id_qs2)
                .annotate(display_status=Value("New", output_field=CharField()))
            )

            qs = qs1.union(qs2).union(qs3)

            # This is a temp fix/hack , which is to create patient_request : status has map and add that in the request
            # so it can be accessed in the serializer
            patient_request_status_map = {}
            for patient_request in qs:
                patient_request_status_map[patient_request.id] = (
                    patient_request.display_status
                )

            self.request.patient_request_status_map = patient_request_status_map

        queryset = PatientRequestOrderingFilter().filter_queryset(
            self.request, queryset, self
        )

        return queryset

    def get_serializer_class(self):
        if self.request.method == "PUT" or self.request.method == "PATCH":
            return PatientRequestUpdateSerializer
        is_provider = self.request.user.account.type == Account.Types.Provider
        return (
            ProviderPatientRequestGetSerializer
            if is_provider
            else AgencyPatientRequestGetSerializer
        )

    def get_serializer_context(self):
        context = super(PatientRequestViewSet, self).get_serializer_context()
        context.update({"request": self.request})
        return context

    def retrieve(self, request, *args, **kwargs):
        patient_request = self.get_object()
        try:
            if any(service_request.status == 3 and service_request.is_delete == 0 for service_request in patient_request.servicerequested_set.all()):
                serializer = self.get_serializer(patient_request)
                return Response(serializer.data, status=status.HTTP_200_OK)

            cal_time = ((timezone.now() - patient_request.created_at).total_seconds()) / 3600
            if patient_request.hide_manager_contact_info and cal_time <= 72:
                patient_request.assigned_to.email = "N/A"
                patient_request.assigned_to.userprofile.phone = "N/A"
            serializer = self.get_serializer(patient_request)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except PatientRequest.DoesNotExist:
            return Response({"error": "PatientRequest not found"}, status=status.HTTP_404_NOT_FOUND)

    def destroy(self, request, *args, **kwargs):
        patient_request_obj = self.get_object()
        serializer = ArchivedDeletePatientRequestSerializer(
            data={
                "request": patient_request_obj.id,
                "created_by": request.user.pk,
                "is_type": ArchivedDeletePatientRequest.AcrhivedDelType.DELETED,
                **request.data,
            }
        )
        serializer.is_valid(raise_exception=True)
        patient_request_obj.save()
        serializer.save()
        self.perform_destroy(patient_request_obj)
        return Response(status=status.HTTP_204_NO_CONTENT)


@permission_classes([IsAuthenticated, AgencyOnly])
class CreatePatientRequestView(APIView):
    """
    Agency can create a request for a specific patient
    they must be the owner of that patient record
    """

    http_method_names = ["post"]

    def post(self, request, patient_pk):
        patient = get_object_or_404(Patient, pk=patient_pk)

        if patient.created_by == request.user.account.agencyprofile:
            patient_request = PatientRequest.objects.create(
                patient=patient, created_by=request.user, **request.data
            )

            serializer = AgencyPatientRequestGetSerializer(patient_request)
            message = REQUEST_EVENT.get(1)
            message = message.format(created_by_name=request.user.userprofile.full_name)
            insert_patient_activity(message, request.user, patient_request)
            return Response(serializer.data, status.HTTP_201_CREATED)

        return Response("Bad request", status.HTTP_400_BAD_REQUEST)


class RetrieveUpdatePatientRequestView(RetrieveUpdateAPIView):
    serializer_class = AgencyPatientRequestGetSerializer
    permission_classes = (
        IsAuthenticated,
        AgencyOnly,
    )

    def get_object(self):
        try:
            return PatientRequest.objects.get(pk=self.kwargs["request_pk"])
        except PatientRequest.DoesNotExist:
            raise Http404

    def put(self, request, *args, **kwargs):
        # TODO try to update this later with serializer.
        instance = self.get_object()
        instance.patient_id = self.kwargs["patient_pk"]
        instance.equipment = request.data.get("equipment")
        instance.notes = request.data.get("notes")
        instance.pets = request.data.get("pets")
        instance.request_prior_authorization = request.data.get(
            "request_prior_authorization"
        )
        instance.smoking = request.data.get("smoking")
        instance.requested_schedule = request.data.get("requested_schedule")
        instance.transportation_required = request.data.get(
            "transportation_required"
        )
        instance.hide_manager_contact_info = request.data.get("hide_manager_contact_info")
        instance.save()
        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)


@permission_classes([IsAuthenticated, RequestNotesPermissions])
class RequestNotesViewSet(viewsets.ModelViewSet):
    queryset = RequestNotes.objects.all().prefetch_related(
        Prefetch('histories', queryset=RequestNotes.history.order_by('-history_date'), to_attr='history'))
    serializer_class = RequestNotesSerializer

    filter_backends = (
        RequestNotesFilterBackend,
        SearchFilter,
    )
    search_fields = ("body",)
    ordering = ("updated_at",)

    def create(self, request, request_pk, *args, **kwargs):
        serializer = self.get_serializer(
            data={
                "request": request_pk,
                "author": request.user.pk,
                "account": request.user.account.id,
                **request.data,
            }
        )
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )


@permission_classes([IsAuthenticated, AgencyOnly])
class ServiceRequestedViewSet(viewsets.ModelViewSet):
    queryset = ServiceRequested.objects.all()
    serializer_class = ServiceRequestedPostSerializer

    def get_serializer(self, *args, **kwargs):
        if isinstance(kwargs.get("data", {}), list):
            kwargs["many"] = True

        return super().get_serializer(*args, **kwargs)

    def list(self, request, request_pk):
        p = PatientRequest.objects.get(pk=request_pk)
        queryset = p.servicerequested_set.all()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def update(self, request, request_pk, pk):
        # TODO try to update this later with serializer. in fact we might not
        # need to update it with serializer since we are using viewset.
        # updating serializers fields will solve the problem
        # for the time being couldn't manage to update this with serializer
        try:
            instance = self.queryset.get(pk=self.kwargs.get("pk"))
            instance.service_id = request.data.get("service")
            instance.funding_source_id = request.data.get("funding_source")
            instance.frequency = request.data.get("frequency")
            instance.hours = request.data.get("hours")
            instance.requested_schedule = request.data.get(
                "requested_schedule"
            )
            instance.save()
            serializer = self.get_serializer(instance)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception:
            return Response(status=status.HTTP_400_BAD_REQUEST)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        services = [service['service'] for service in request.data]
        service_types = ServiceType.objects.filter(id__in=services)
        request_pk = kwargs.get('request_pk')
        care_request = PatientRequest.objects.get(pk=request_pk)
        zip = care_request.patient.zip    

        # Fetch providers based on the care request and service type
        providers = ProviderProfile.objects.filter(
            services__immediate_notification=True,
            services__in=service_types,
            zip_codes__zip=zip
        ).prefetch_related('services').distinct()

        if providers.exists():
            # Trigger the Celery task to send emails asynchronously
            send_care_request_notifications.delay(care_request.pk, [provider.pk for provider in providers], zip)


        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


@permission_classes([IsAuthenticated, ProviderOnly])
class ServiceInterestCreateView(APIView):
    """
    Providers can show interest in a group of ServiceRequests
    """

    def post(self, request):
        with transaction.atomic():
            services_ids = request.data.get("services")
            if not services_ids:
                return HttpResponseNotFound(
                    "Must provide IDs of the services."
                )
            provider = get_object_or_404(
                ProviderProfile, pk=request.user.account
            )
            services = ServiceRequested.objects.filter(id__in=services_ids).exclude(
                status=ServiceRequested.Statuses.CLOSED)
            if not services.exists():
                return HttpResponseNotFound(
                    "Service Request is already matched or closed."
                )

            for service in services:
                # We must add the provider to the service for the m2m_changed
                # signal to fire correctly
                service.interests.add(provider)
                service.status = ServiceRequested.Statuses.PENDING
                message = REQUEST_EVENT.get(2)
                message = message.format(provider_name=provider.account.name)
                insert_patient_activity(message, request.user, service.request)
                service.save()

            return Response("Success", status=status.HTTP_201_CREATED)


@permission_classes([IsAuthenticated, ProviderOnly])
class ServiceInterestCancelView(APIView):
    """
    Providers can cancel interest in a ServiceRequest
    """

    def post(self, request, service_pk):
        service = get_object_or_404(ServiceRequested, id=service_pk)
        provider = get_object_or_404(ProviderProfile, pk=request.user.account)
        provider.interested_services.remove(service)
        if not service.interests.count() and not service.match:
            service.status = ServiceRequested.Statuses.OPEN
            service.save()
        return Response("Success", status=status.HTTP_201_CREATED)


@permission_classes([IsAuthenticated, ServiceMatchPermissions])
class ServiceMatchCreateView(CreateAPIView):
    """
    This is for care managers to match a provider to a service request
    """

    def post(self, request, provider_pk):
        service_ids = request.data.get("services")

        if not service_ids:
            return HttpResponseNotFound(
                "Must provide IDs of services to match."
            )

        provider = get_object_or_404(ProviderProfile, account_id=provider_pk)
        try:
            services = ServiceRequested.objects.filter(id__in=service_ids)
            for service in services:
                service.match = provider
                service.match_date = datetime.now()
                service.status = ServiceRequested.Statuses.CLOSED
                service.save()
                message = REQUEST_EVENT.get(3)
                message = message.format(service_name=service.service.name)
                insert_patient_activity(message, request.user, service.request)
                self.send_email_closed(service, provider)
            return Response("Success", status=status.HTTP_201_CREATED)
        except ObjectDoesNotExist:
            return HttpResponseNotFound("Service not found.")

    def send_email_closed(self, sr, provider_matched):
        current_site = Site.objects.get_current()
        domain_name = f"https://{current_site.domain}"

        if Site.objects.filter(domain="qa2.app.duett.io"):
            env_label = "QA2:"
        elif Site.objects.filter(domain="qa.app.duett.io"):
            env_label = "QA:"
        elif Site.objects.filter(domain="staging.app.duett.io"):
            env_label = "STG:"
        else:
            env_label = ""

        request_id = sr.request.id
        for provider in sr.interests.all().exclude(pk=provider_matched.pk):
            email = provider.email
            html_message = render_to_string(
                "provider-request-closed-email.html",
                {
                    "request_list_url": domain_name,
                    "domain_name": domain_name,
                    "request_id": request_id,
                },
            )
            message = EmailMessage(
                f"{env_label} Request Update: Closed",
                html_message,
                settings.DEFAULT_FROM_EMAIL,
                [email],
            )
            message.content_subtype = "html"
            message.send()


@permission_classes([IsAuthenticated, ProviderOnly, ProviderMatchPermissions])
class RemoveProviderMatchViewSet(APIView):
    """
    This is for providers to remove themselves as a match.
    """

    def post(self, request, service_pk):
        service = get_object_or_404(ServiceRequested, pk=service_pk)
        service.match = None
        service.save()

        # Send email to care manager to notify them:
        email = service.request.created_by.email
        current_site = Site.objects.get_current()

        id = service.request.id
        url = f"https://{current_site.domain}/request/{id}/"
        html_message = render_to_string(
            "remove-match-email.html",
            {"request_url": url, "provider": request.user.account.name},
        )

        message = EmailMessage(
            "A request match has been removed",
            html_message,
            settings.DEFAULT_FROM_EMAIL,
            [email],
        )
        message.content_subtype = "html"
        message.send()

        return Response("Success")


@permission_classes([IsAuthenticated, ProviderOnly])
class ProviderHideView(APIView):
    """
    Providers can hide a PatientRequest
    """

    def post(self, request, request_pk):
        patient_request = get_object_or_404(PatientRequest, pk=request_pk)
        provider = get_object_or_404(ProviderProfile, pk=request.user.account)
        patient_request.hides.add(provider)
        return Response("Success", status=status.HTTP_201_CREATED)


@permission_classes([IsAuthenticated, ProviderOnly])
class ProviderUnhideView(APIView):
    def post(self, request, request_pk):
        patient_request = get_object_or_404(PatientRequest, pk=request_pk)
        provider = get_object_or_404(ProviderProfile, pk=request.user.account)
        patient_request.hides.remove(provider)
        return Response("Success", status=status.HTTP_200_OK)


@permission_classes([IsAuthenticated, PatientRequestPermissions])
class ArchiveView(mixins.UpdateModelMixin,
                  viewsets.GenericViewSet):
    """
    Archive PatientRequest
    """
    queryset = PatientRequest.objects.filter(is_archived=PatientRequest.Archived.NOT_ARCHIVED)

    filter_backends = (
        PatientRequestFilterBackend,
    )

    def update(self, request, pk):
        patient_request_obj = self.get_object()
        serializer = ArchivedDeletePatientRequestSerializer(
            data={
                "request": patient_request_obj.id,
                "created_by": request.user.pk,
                "is_type": ArchivedDeletePatientRequest.AcrhivedDelType.ARCHIVED,
                **request.data,
            }
        )
        serializer.is_valid(raise_exception=True)
        patient_request_obj.is_archived = PatientRequest.Archived.ARCHIVED
        patient_request_obj.save()
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


@permission_classes([IsAuthenticated, PatientRequestPermissions])
class UnArchiveView(
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet):
    """
    UnArchive PatientRequest
    """

    queryset = PatientRequest.objects.filter(is_archived=PatientRequest.Archived.ARCHIVED)

    filter_backends = (
        PatientRequestFilterBackend,
    )

    def update(self, request, pk):
        patient_request_obj = self.get_object()

        patient_request_obj.is_archived = PatientRequest.Archived.NOT_ARCHIVED
        patient_request_obj.save()
        return Response({"message": "success"}, status=status.HTTP_200_OK)


@permission_classes([IsAuthenticated])
class TableColumnsView(APIView):
    """
    Users can get list of table columns to display in tables in
    front-end.
    """

    def get(self, request):
        account = request.user.account
        table_name = request.GET.get("table")
        queryset = TableColumns.objects.filter(
            Q(role=None) | Q(role=(account.type if account != None else None)),
            table_name=table_name,
            # this column_type query will have to be updated when
            # we want to support custom table columns
            column_type=TableColumns.ColumnTypes.DEFAULT,
        ).order_by("sequence")
        serializer = TableColumnsSerializer(queryset, many=True)
        return Response(serializer.data)


@permission_classes([IsAuthenticated])
class ZipcodeAPIView(APIView):
    def get(self, request, zipcode):
        if zipcodes.is_real(zipcode):
            return Response(zipcodes.matching(zipcode))
        return Response({"message": "Zip code not found"})


@permission_classes([IsAuthenticated, AgencyManagerOnly])
class ServiceReOpenAPIView(APIView):
    """
    Only (Care Agency Admin,Care Manager Supervisor,Care Manager)  can reopen
    """

    def post(self, request, request_pk, service_pk):
        patient_req = get_object_or_404(PatientRequest, id=request_pk)
        service = get_object_or_404(ServiceRequested, id=service_pk)
        provider_id = request.data.get('provider_id')
        if not provider_id:
            return Response({"error": "Please provide Provider ID"}, status=status.HTTP_400_BAD_REQUEST)
        patient_req.status = patient_req.history.last().status
        patient_req.save()
        if int(service.status) == 3:  # move to notify state from Matched
            service.match = None
        if int(service.status) > 1:
            service.status = int(service.status) - 1
        if service.status == 1:
            provider = get_object_or_404(ProviderProfile, pk=provider_id)
            provider.interested_services.remove(service)
        message = REQUEST_EVENT.get(5)
        message = message.format(service_name=service.service.name)
        insert_patient_activity(message, request.user, service.request)
        service.save()
        return Response("Success", status=status.HTTP_201_CREATED)


@permission_classes([IsAuthenticated, AgencyManagerOnly])
class ServiceRequestDeleteAPIView(APIView):
    """
    Only (Care Agency Admin,Care Manager Supervisor,Care Manager) can delete
    """

    def delete(self, request, request_pk, service_pk):
        patient_req = get_object_or_404(PatientRequest, id=request_pk)
        service = get_object_or_404(ServiceRequested, id=service_pk)
        total_service = patient_req.servicerequested_set.count()
        deleted_ser_count = patient_req.servicerequested_set.filter(is_delete=1).count()
        remain_service = total_service - deleted_ser_count
        if remain_service <= 1:
            patient_req.delete()
        else:
            message = REQUEST_EVENT.get(4)
            message = message.format(service_name=service.service.name)
            insert_patient_activity(message, request.user, service.request)
            service.is_delete = 1
            if request.data:
                service.reason = request.data.get('reason')
                service.message = request.data.get('message')
            service.save()
        return Response("Success", status=status.HTTP_204_NO_CONTENT)


@permission_classes([IsAuthenticated, AgencyManagerOnly])
class ServiceRequestReAssignAPIView(APIView):
    """
    Only (Care Agency Admin,Care Manager Supervisor,Care Manager) can reassign
    """

    def post(self, request, request_pk, service_pk):
        patient_req = get_object_or_404(PatientRequest, id=request_pk)
        service = get_object_or_404(ServiceRequested, id=service_pk)
        provider_id = request.data.get('provider_id')
        if not provider_id:
            return Response({"error": "Please provide Provider ID"}, status=status.HTTP_400_BAD_REQUEST)
        provider = get_object_or_404(ProviderProfile, pk=provider_id)
        service.match = provider
        service.save()
        message = REQUEST_EVENT.get(6)
        message = message.format(service_name=service.service.name, provider_name=provider.account.name)
        insert_patient_activity(message, request.user, service.request)
        self.send_email_closed(service, provider)
        return Response("Success", status=status.HTTP_200_OK)

    def send_email_closed(self, sr, provider_matched):
        current_site = Site.objects.get_current()
        domain_name = f"https://{current_site.domain}"

        if Site.objects.filter(domain="qa2.app.duett.io"):
            env_label = "QA2:"
        elif Site.objects.filter(domain="qa.app.duett.io"):
            env_label = "QA:"
        elif Site.objects.filter(domain="staging.app.duett.io"):
            env_label = "STG:"
        else:
            env_label = ""

        request_id = sr.request.id
        for provider in sr.interests.all().exclude(pk=provider_matched.pk):
            email = provider.email
            html_message = render_to_string(
                "provider-request-closed-email.html",
                {
                    "request_list_url": domain_name,
                    "domain_name": domain_name,
                    "request_id": request_id,
                },
            )
            message = EmailMessage(
                f"{env_label} Request Update: Closed",
                html_message,
                settings.DEFAULT_FROM_EMAIL,
                [email],
            )
            message.content_subtype = "html"
            message.send()


@permission_classes([IsAuthenticated, AgencyManagerOnly])
class ServiceProviderListAPIView(APIView):
    """
    Only (Care Agency Admin,Care Manager Supervisor,Care Manager) can get provider list
    """

    def get(self, request, request_pk, service_pk):
        patient_req = get_object_or_404(PatientRequest, id=request_pk)
        service = get_object_or_404(ServiceRequested, id=service_pk)
        provider_list = service.interests.all()
        res = []
        for provider in provider_list:
            if service.match_id != provider.account.id:
                res.append({"id": provider.account.id, "name": provider.account.name})
        return Response({"data": res}, status=status.HTTP_200_OK)


@permission_classes([IsAuthenticated, AgencyManagerOnly])
class PatientRequestActivityAPIView(APIView):
    """
    Only (Care Agency Admin,Care Manager Supervisor,Care Manager) can get activity list
    """

    def get(self, request, request_pk, ):
        patient_req = get_object_or_404(PatientRequest, id=request_pk)
        activity_list = PatientActivity.objects.filter(object_id=request_pk).order_by('-id')
        data = RequestActivitySerializer(activity_list, many=True).data
        return Response({"data": data}, status=status.HTTP_200_OK)


@permission_classes([IsAuthenticated])
class PatientRequestAssignView(APIView):
    """
    Only (Care Agency Admin,Care Manager Supervisor,Care Manager) can get activity list
    """

    def get(self, request, request_pk, ):
        patient_req = get_object_or_404(PatientRequest, pk=request_pk)
        user_account = patient_req.assigned_to
        agency_name = user_account.account.name
        account = Account.objects.get(name=agency_name)
        users = account.user_set.all()
        user_list = list(users)
        data = []
        emptylist = []
        for user in user_list:
            try:
                if user_account != user:
                    data.append(
                        {'user_id': user.pk, 'agency_name': user.userprofile.first_name + " " + user.userprofile.last_name})
            except Exception as e:
                emptylist.append(user)
                logger.warning("Empty user list for user %s: %s", user.pk if user else None, e)
        return Response({"data": data}, status=status.HTTP_200_OK)


class PatientRequestChangeAssigneeView(APIView):
    def post(self, request, request_pk, pk):
        current_user = request.user
        patient_req = get_object_or_404(PatientRequest, pk=request_pk)
        user = User.objects.get(pk=pk)
        current_CM = patient_req.assigned_to
        patient_req.assigned_to = user
        if current_user.group in ['Care Agency Admin', 'Care Manager Supervisor']:
            if current_user != current_CM:
                self.email_send_to_current_CM(request_pk, current_CM.email, user.userprofile.first_name,
                                              user.userprofile.last_name)
                self.email_sent_to_new_CM(request_pk, user.email, current_user.userprofile.first_name, current_user.userprofile.last_name)
            else:
                self.email_sent_to_new_CM(request_pk, user.email, current_user.userprofile.first_name,
                                          current_user.userprofile.last_name)
        else:
            self.email_sent_to_new_CM(request_pk, user.email, current_user.userprofile.first_name,
                                      current_user.userprofile.last_name)
        patient_req.save()
        return Response(status=status.HTTP_200_OK)

    def email_send_to_current_CM(self,id,email,f_name,l_name):
        current_site = Site.objects.get_current()
        url = f"https://{current_site.domain}/request/{id}"
        html_message = render_to_string(
           "forwarded-request.html", {"request_url": url,"AssigningUserFirstName":f_name,"AssigningUserLastName":l_name}
        )
        message = EmailMessage(
           "Your Care Request has been re-assigned",
           html_message,
           settings.DEFAULT_FROM_EMAIL,
           [email],
        )
        message.content_subtype = "html"
        message.send()
    def email_sent_to_new_CM(self,id,email,f_name,l_name):
        current_site = Site.objects.get_current()
        url = f"https://{current_site.domain}/request/{id}"
        html_message = render_to_string(
           "new_assignee-cm-request.html", {"request_url": url,"AssigningUserFirstName":f_name,"AssigningUserLastName":l_name}
        )
        message = EmailMessage(
           "You have been assigned a Care Request",
           html_message,
           settings.DEFAULT_FROM_EMAIL,
           [email],
        )
        message.content_subtype = "html"
        message.send()


class PatientRequestDownloadPdfView(APIView):
    def format_frequency(self, frequency):
        ret = ""
        if frequency == "Per Week":
            ret = "week"
        elif frequency == "Per Month":
            ret = "month"
        else:
            ret = "week"
        return ret

    def P(self, txt):
        style = getSampleStyleSheet()['Normal']
        return Paragraph(txt, style)

    def get(self, request, request_pk):
        buffer = io.BytesIO()
        response = PatientRequest.objects.get(id=request_pk)
        serializer = AgencyPatientRequestGetSerializer(response, context={"request": self.request})
        f_name = serializer.data['care_manager']['userprofile']['first_name']
        l_name = serializer.data['care_manager']['userprofile']['last_name']
        CM_phone = serializer.data['care_manager']['userprofile']['phone']
        CM_email = serializer.data['care_manager']['email']
        CM_name = f_name + " " + l_name
        CR_id = serializer.data['id']
        interests = serializer.data['interests']
        data = [
            ['Provider Name', 'Provider Email', 'Provider Phone', 'Funding Source', 'Service', 'Hours']]
        for i in interests:
            account = i['account']
            services = i['services']
            for j in services:
                data_list = []
                data_list.append(self.P(account['name']))
                data_list.append(self.P(i['email']))
                data_list.append(self.P(i['phone']))
                data_list.append(self.P(j['funding_source']))
                data_list.append(self.P(j['service']))
                data_list.append(f"{j['hours']} hours / {self.format_frequency(j['frequency'])}")
                data.append(data_list)
        pdf = SimpleDocTemplate(buffer, pagesize=landscape(A4), title=f"{CM_name}", author=f"{CM_name}")
        additional_data = [
            f'<font color="black"><strong>Care Manager: {CM_name}</strong></font>',
            f'<font color="black"><strong>Email: {CM_email}</strong></font>',
            f'<font color="black"><strong>Phone Number: {CM_phone}</strong></font>',
            f'<font color="black"><strong>Case ID: {CR_id}</strong></font>',
            '', ''
        ]
        style = getSampleStyleSheet()['Normal']
        style.leftIndent = -20

        col_widths = [120, 160, 110, 120, 120, 100]
        # create the table with fixed width columns
        table = Table(data, colWidths=col_widths)
        table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BACKGROUND', (0, 0), (-1, 0), colors.black),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('ALIGN', (0, 1), (-1, -1), 'LEFT'),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 10),
        ]))
        elements = []

        logo_path = os.path.join('duett_api', 'static', 'images', 'Duett_FullColor_logo.png')
        logo_height = 50
        logo_width = logo_height / Image(logo_path).imageHeight * Image(
            logo_path).imageWidth

        elements.append(Spacer(1, 0.05 * inch))
        elements.append(Image(logo_path, width=logo_width, height=logo_height, hAlign='RIGHT'))
        elements.append(Spacer(1, 0.25 * inch))

        for text in additional_data:
            elements.append(Paragraph(text, style))
            elements.append(Spacer(1, 0.1 * inch))
        elements.append(table)
        pdf.build(elements)
        buffer.seek(0)
        return HttpResponse(buffer, content_type='application/pdf')


def process_data_with_threading(data):
        # Initialize sets for services_list and funding_source_list
        import threading

        services_list = set()
        funding_source_list = set()

        num_threads = 5
        data_per_thread = (len(data) + num_threads - 1) // num_threads

        def process_chunk(chunk):
            for request in chunk:
                # print(f"Service requests for Patient Request ID {request.id}:")
                service_requests = request.servicerequested_set.all()
                for service_request in service_requests:
                    services_list.add(service_request.service.name)
                    funding_source_list.add(service_request.funding_source.name)

        chunks = [data[i:i + data_per_thread] for i in range(0, len(data), data_per_thread)]

        threads = []
        for chunk in chunks:
            thread = threading.Thread(target=process_chunk, args=(chunk,))
            threads.append(thread)
            thread.start()

        for thread in threads:
            thread.join()

        return list(services_list), list(funding_source_list)

@permission_classes([IsAuthenticated, AgencyManagerOnly])
class ClientSearchView(APIView):
    pagination_class = LimitOffsetPagination

    def paginate_results(self, request, results):
        ordering = request.GET.get('ordering')
        if ordering:
            if ordering == 'patient__zip':
                ordering= 'zip'
            elif ordering == '-patient__zip':
                ordering= '-zip'
            elif ordering == 'birthday':
                ordering = 'birth_date'
            elif ordering == '-birthday':
                ordering = '-birth_date'
            try:
                results = results.annotate(
                full_name=Concat(Lower('first_name'), Value(" "), Lower('last_name'))
                ).order_by(ordering).distinct()
            except Exception as e:
                logger.warning("Ordering key not provided: %s", e)

        count = len(results)
        # Paginate the results based on frontend parameters
        paginator = self.pagination_class()
        paginated_results = paginator.paginate_queryset(results, request)

        return paginated_results, count 

    def parse_and_normalize_date(self, date_str):
        supported_formats = ['%m/%d/%Y', '%m/%d/%y', '%m-%d-%Y', '%m-%d-%y']
        parsed_date = None
        for date_format in supported_formats:
            try:
                parsed_date = datetime.strptime(date_str, date_format).date()
                break
            except Exception as e:
                continue

        if parsed_date is not None:
            # Normalize the date if needed
            threshold_year = 50  # e.g., consider years less than 50 as 21st century
            if parsed_date.year <= threshold_year:
                parsed_date = parsed_date.replace(year=parsed_date.year + 2000)
            return parsed_date
        else:
            # Handle the case when none of the formats match
            raise ValueError("Unsupported date format")
        
    def get(self, request,user_id):
        try:
            search_input = request.GET.get('search_input')
            agency_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"message":"Agency User does not exist"}, status=status.HTTP_400_BAD_REQUEST)
        if not search_input:
            return Response({
                'message': "Search Term required"
            }, status=status.HTTP_400_BAD_REQUEST)
        columns=[
            { "id": 1, "field": 'full_name', "headerName": 'Client Name'},
            { "id": 2, "field": 'patient__zip', "headerName": 'Zip Code'},
            { "id": 3, "field": 'birthday', "headerName": 'Birth Date'},
            { "id": 4, "field": 'actions', "headerName": 'Actions'}
        ]
        search_terms = search_input.split()
        date_query = None
        number_query=None
        if len(search_terms) == 2 and isinstance(search_terms[1],str):
            if '/'  in search_terms[-1] or  '-'  in search_terms[-1] :
                try:
                    date_query = self.parse_and_normalize_date(search_terms[-1])
                    search_terms = search_terms[:-1]
                except ValueError:
                    date_query = None
            else:
                try:
                    date_query = self.parse_and_normalize_date(search_terms[0])
                    search_terms = search_terms[1:]
                except ValueError:
                    date_query = None
            
        elif len(search_terms) > 1 and search_terms[-1].isdigit():
            try:
                date_query = self.parse_and_normalize_date(search_terms[-2])
                number_query=search_terms[-1]
                search_terms = search_terms[:-2]
            except ValueError:
                date_query = None
        elif len(search_terms) == 3 and isinstance(search_terms[1],str) and isinstance(search_terms[2],str):
            if '/' in search_terms[-1] or '-' in search_terms[-1]:
                try:
                    date_query = self.parse_and_normalize_date(search_terms[-1])
                    search_terms = search_terms[:-1]
                except ValueError:
                    date_query = None
            else:
                try:
                    date_query = self.parse_and_normalize_date(search_terms[0])
                    search_terms = search_terms[1:]
                except ValueError:
                    date_query = None   
        else:
            try:
                date_query = self.parse_and_normalize_date(search_terms[-1])
                search_terms = search_terms[:-1]
            except ValueError:
                date_query = None
                
        if len(search_terms) == 0 and date_query:
            results = PatientRequest.objects.filter(Q(assigned_to__account__agencyprofile=agency_user.account.agencyprofile) &
                Q(patient__birth_date__exact=date_query)).values_list("patient", flat=True)
            results = Patient.objects.filter(id__in=results)
            results, count = self.paginate_results(request, results)
            return_results = AgencyPatientSearchSerializer(results, many=True)
            if len(return_results.data) == 0:
                return Response({'message': "No Search Results","columns":columns}, status=status.HTTP_400_BAD_REQUEST)
            if len(return_results.data) <= 250:
                transformed_data = [{'patient': item} for item in return_results.data]
                return Response({"rows":transformed_data,"columns":columns,"count":count},status=status.HTTP_200_OK)
            else:
                return Response({"message":"Too many records to display. Please narrow your search.","columns":columns}, status=status.HTTP_400_BAD_REQUEST)
            
        # Your existing code for handling single-word search
        if len(search_terms) == 1:
            results = PatientRequest.objects.filter(Q(patient__created_by=agency_user.account.agencyprofile) & (Q(patient__first_name__icontains=search_terms[0]) | Q(patient__last_name__icontains=search_terms[0]))).values_list("patient", flat=True)
            results = Patient.objects.filter(id__in=results)

        # Handling single-word search with a date
        if len(search_terms) == 1 and date_query:
            results = PatientRequest.objects.filter(Q(patient__created_by=agency_user.account.agencyprofile) & (Q(patient__birth_date__exact=date_query) & (Q(patient__first_name__icontains=search_terms[0]) | Q(patient__last_name__icontains=search_terms[0])))).values_list("patient", flat=True)
            results = Patient.objects.filter(id__in=results)
        
        # Handling two-word search
        if len(search_terms) == 2 and not search_terms[0].isdigit():
            term1, term2 = search_terms
            results = PatientRequest.objects.filter(Q(patient__created_by=agency_user.account.agencyprofile) & ((
                    (Q(patient__first_name__icontains=term1) & Q(patient__last_name__icontains=term2)) |
                    (Q(patient__first_name__icontains=term2) & Q(patient__last_name__icontains=term1))
                ))
            ).values_list("patient", flat=True)
            results = Patient.objects.filter(id__in=results)

        # Handling two-word search with a date
        if len(search_terms) == 2 and date_query:
            term1, term2 = search_terms[:2]
            results = PatientRequest.objects.filter((Q(patient__created_by=agency_user.account.agencyprofile) & (Q(patient__birth_date__exact=date_query)) & ((
                    (Q(patient__first_name__icontains=term1) & Q(patient__last_name__icontains=term2)) |
                    (Q(patient__first_name__icontains=term2) & Q(patient__last_name__icontains=term1))
                )))).values_list("patient", flat=True)
            results = Patient.objects.filter(id__in=results)

        if len(search_terms)==3 and isinstance(search_terms[0],str) and isinstance(search_terms[1],str) and search_terms[2].isdigit():
            term1, term2, care_id = search_terms
            results = PatientRequest.objects.filter((Q(id=care_id) & Q(assigned_to__account__agencyprofile=agency_user.account.agencyprofile)) & (
                (Q(patient__first_name__icontains=term1) & Q(patient__last_name__icontains=term2)) |
                (Q(patient__first_name__icontains=term2) & Q(patient__last_name__icontains=term1))
            )).values_list("patient", flat=True)
            results = Patient.objects.filter(id__in=results)

        # Display instructional message for three-word search
        if (len(search_terms) == 3) and (not search_terms[2].isdigit()):
            return Response({
                'message': 'Please search for a First Name and Last Name of Client Name. If the record you are searching for has multiple last names, please simply search for one of the last names. You may also search for a birthdate by providing the date in MM/DD/YYYY format. For example, 10/14/1950.',"columns":columns
            }, status=status.HTTP_400_BAD_REQUEST)
        

        # Handling search for a number plus other terms
        if (search_terms[0].isdigit() and len(search_terms) > 1) or (search_terms[0].isdigit() and date_query):
            return Response({"message":"If you want to search for a specific Care Request, please just search for the Care Request ID "
                            "by searching for only that number. For example: 12345.","columns":columns}, status=status.HTTP_400_BAD_REQUEST)
        
        # Handling search for Care Request ID
        if search_terms[0].isdigit() and (len(search_terms) == 1):
            care_request_id = int(search_terms[0])
            try:
                results = PatientRequest.objects.filter(Q(id=care_request_id) & Q(assigned_to__account__agencyprofile=agency_user.account.agencyprofile)).values_list("patient", flat=True)
                results = Patient.objects.filter(id__in=results)
                return_result = AgencyPatientSearchSerializer(results, many=True)
                if len(return_result.data) == 0:
                    return Response({'message': "Could not find a Care Request ID with that identifier. Please try a different number or try searching by Client Name. For example, type John Smith in the search field to search for all cases that match to the name John Smith."}, status=status.HTTP_400_BAD_REQUEST)
                transformed_data = [{'patient': item} for item in return_result.data]
                return Response({"rows":transformed_data,"columns":columns} ,status=status.HTTP_200_OK)
            except Exception as e:
                return Response({"message":"Patient Request does not exist","columns":columns}, 
                                status=status.HTTP_404_NOT_FOUND)

        if number_query and len(search_terms) == 1 and date_query:
            results = PatientRequest.objects.filter(Q(id=number_query) & (Q(assigned_to__account__agencyprofile=agency_user.account.agencyprofile) &
                Q(patient__birth_date__exact=date_query)) & ((Q(patient__first_name__icontains=search_terms[0]) | 
                Q(patient__last_name__icontains=search_terms[0])))).values_list("patient", flat=True)
            results = Patient.objects.filter(id__in=results)
        if number_query and len(search_terms) == 2 and date_query:
            term1, term2 = search_terms[:2]
            results = PatientRequest.objects.filter(Q(id = number_query) & (Q(assigned_to__account__agencyprofile=agency_user.account.agencyprofile) & Q(patient__birth_date__exact=date_query)) & ((
                (Q(patient__first_name__icontains=term1) & Q(patient__last_name__icontains=term2)) |
                (Q(patient__first_name__icontains=term2) & Q(patient__last_name__icontains=term1))
            ))).values_list("patient", flat=True)
            results = Patient.objects.filter(id__in=results)

        if len(search_terms)==2 and search_terms[-1].isdigit() and isinstance(search_terms[0],str):
            results = PatientRequest.objects.filter((Q(id=search_terms[-1]) & Q(assigned_to__account__agencyprofile=agency_user.account.agencyprofile)) &
                    ((Q(patient__first_name__icontains=search_terms[0]) | Q(patient__last_name__icontains=search_terms[0])))).values_list("patient", flat=True)
            results = Patient.objects.filter(id__in=results)
        if date_query and len(search_terms)==1 and isinstance(search_terms[0],str):
            results = PatientRequest.objects.filter((Q(assigned_to__account__agencyprofile=agency_user.account.agencyprofile) &
                    Q(patient__birth_date__exact=date_query)) & ((Q(patient__first_name__icontains=search_terms[0]) | 
                    Q(patient__last_name__icontains=search_terms[0])))).values_list("patient", flat=True)
            results = Patient.objects.filter(id__in=results)
        

        try:
            results, count = self.paginate_results(request, results)
            return_results = AgencyPatientSearchSerializer(results, many=True)
        except:
            return Response({'message': "Please search for a First Name and Last Name of Client Name. If the record you are searching for has multiple last names, please simply search for one of the last names. You may also search for a birthdate by providing the date in MM/DD/YYYY format. For example, 10/14/1950","columns":columns}, status=status.HTTP_400_BAD_REQUEST)
        if len(return_results.data) == 0:
                return Response({'message': "Please search for a First Name and Last Name of Client Name. If the record you are searching for has multiple last names, please simply search for one of the last names. You may also search for a birthdate by providing the date in MM/DD/YYYY format. For example, 10/14/1950","columns":columns}, status=status.HTTP_400_BAD_REQUEST)
        if len(return_results.data) <= 250:
            transformed_data = [{'patient': item} for item in return_results.data]
            return Response({"rows":transformed_data,"columns":columns,"count":count},status=status.HTTP_200_OK)
        else:
            return Response({"message":"Too many records to display. Please narrow your search.","columns":columns}, status=status.HTTP_400_BAD_REQUEST)


@permission_classes([IsAuthenticated, AgencyManagerOnly]) 
class CareRequestSearchView(APIView):
    pagination_class = LimitOffsetPagination

    def get_columns(self, agency_user):
        if agency_user.group == 'Care Manager':
            columns = [
                { "id": 1, "field": 'id', "headerName": 'ID'},
                { "id": 2, "field": 'clientName', "headerName": 'Client Name'},
                { "id": 3, "field": 'patient__zip', "headerName": 'Zip Code'},
                { "id": 4, "field": 'funding', "headerName": 'Funding'},
                { "id": 5, "field": 'services', "headerName": 'Services'},
                { "id": 6, "field": 'hours', "headerName": 'Hours'},
                { "id": 7, "field": 'status', "headerName": 'Status'},
                { "id": 8, "field": 'refreshed_time', "headerName": 'Time Since Posted'},
            ]
            results = PatientRequest.objects.filter(assigned_to=agency_user)
        else:
            columns = [
                { "id": 1, "field": 'id', "headerName": 'ID'},
                { "id": 2, "field": 'caseManager', "headerName": 'Case Manager'},
                { "id": 3, "field": 'full_name', "headerName": 'Client Name'},
                { "id": 4, "field": 'patient__zip', "headerName": 'Zip Code'},
                { "id": 5, "field": 'funding', "headerName": 'Funding'},
                { "id": 6, "field": 'services', "headerName": 'Services'},
                { "id": 7, "field": 'hours', "headerName": 'Hours'},
                { "id": 8, "field": 'status', "headerName": 'Status'},
                { "id": 9, "field": 'refreshed_time', "headerName": 'Time Since Posted'},
            ]
        return columns
    
    def filter_results(self,request,results):
        funding_filters = request.GET.get('funding')
        services_filters = request.GET.get('services')
        status_filters = request.GET.get('status')
        manager_name_filter = request.GET.get('manager_name')

        # Convert stringified JSON filters to Python objects
        if funding_filters:
            funding_filters = json.loads(funding_filters)
        if services_filters:
            services_filters = json.loads(services_filters)
        if status_filters:
            status_filters = json.loads(status_filters)
        if manager_name_filter:
            manager_name_filter = json.loads(manager_name_filter)

         # Apply filters to the results
        if funding_filters:
            filter_conditions = Q()
            for funding in funding_filters:
                filter_conditions |= Q(servicerequested__funding_source__name=funding)
            results = results.filter(filter_conditions)
        
        if services_filters:
            filter_conditions = Q()
            for service in services_filters:
                filter_conditions |= Q(servicerequested__service__name__icontains=service)
            results = results.filter(filter_conditions)
        
        if status_filters:
            filter_conditions = Q()
            status_mapping = {
                'opened': PatientRequest.Statuses.OPEN,
                'pending': PatientRequest.Statuses.PENDING,
                'closed': PatientRequest.Statuses.CLOSED,
                'partiallyMatched': PatientRequest.Statuses.PARTIALLY_MATCHED,
            }
            archived_mapping = {
                'archived': PatientRequest.Archived.ARCHIVED,
                'not_archived': PatientRequest.Archived.NOT_ARCHIVED,
            }
            status_conditions = Q()
            archived_conditions = Q()

            for key, value in status_filters.items():
                if key in status_mapping and value:
                    status_conditions |= Q(status=status_mapping[key])
                elif key in archived_mapping and value:
                    archived_conditions |= Q(is_archived=archived_mapping[key])
            filter_conditions = status_conditions | archived_conditions

            if 'archived' in status_filters and status_filters['archived'] == False:
                filter_conditions &= ~Q(is_archived=True)
            results = results.filter(filter_conditions)

        if manager_name_filter:
            manager_name_filter=manager_name_filter['caseManager']
            results = results.annotate(full_name=Concat(Lower('assigned_to__userprofile__first_name'), Value(" "), Lower('assigned_to__userprofile__last_name'))).filter(full_name__icontains=manager_name_filter)

        return results


    def paginate_results(self, request, results):
        ordering = request.GET.get('ordering')
        if ordering:
            try:
                results = results.annotate(
                full_name=Concat(Lower('patient__first_name'), Value(" "), Lower('patient__last_name'))
                ).order_by(ordering).distinct()
            except Exception as e:
                logger.warning("Ordering key not provided: %s", e)

        count = len(results)
        # Paginate the results based on frontend parameters
        paginator = self.pagination_class()
        paginated_results = paginator.paginate_queryset(results, request)

        return paginated_results, count 


    def parse_and_normalize_date(self, date_str):
        supported_formats = ['%m/%d/%Y', '%m/%d/%y', '%m-%d-%Y', '%m-%d-%y']
        parsed_date = None
        for date_format in supported_formats:
            try:
                parsed_date = datetime.strptime(date_str, date_format).date()
                break 
            except ValueError as e:
                continue

        if parsed_date is not None:
            # Normalize the date if needed
            threshold_year = 50  # e.g., consider years less than 50 as 21st century
            if parsed_date.year <= threshold_year:
                parsed_date = parsed_date.replace(year=parsed_date.year + 2000)

            return parsed_date
        else:
            # Handle the case when none of the formats match
            raise ValueError("Unsupported date format")
        
    def get(self, request,user_id):
        try:
            search_input = request.GET.get('search_input')
            agency_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"message":"Agency User does not exist", "columns": self.get_columns(agency_user)}, status=status.HTTP_400_BAD_REQUEST)
        
        if not search_input:
            return Response({
                'message': "Search Term required",
                "columns": self.get_columns(agency_user)
            }, status=status.HTTP_400_BAD_REQUEST)
        search_terms = search_input.split()
        date_query = None
        number_query=None
        if len(search_terms) == 2 and isinstance(search_terms[1],str):
            if '/' in search_terms[-1] or '-' in search_terms[-1]:
                try:
                    date_query = self.parse_and_normalize_date(search_terms[-1])
                    search_terms = search_terms[:-1]
                except ValueError:
                    date_query = None
            else:
                try:
                    date_query = self.parse_and_normalize_date(search_terms[0])
                    search_terms = search_terms[1:]
                except ValueError:
                    date_query = None
            
        elif len(search_terms) > 1 and search_terms[-1].isdigit():
            try:
                date_query = self.parse_and_normalize_date(search_terms[-2])
                number_query=search_terms[-1]
                search_terms = search_terms[:-2]
            except ValueError:
                date_query = None
        elif len(search_terms) == 3 and isinstance(search_terms[1],str) and isinstance(search_terms[2],str):
            if '/' in search_terms[-1] or '-' in search_terms[-1]:
                try:
                    date_query = self.parse_and_normalize_date(search_terms[-1])
                    search_terms = search_terms[:-1]
                except ValueError:
                    date_query = None
            else:
                try:
                    date_query = self.parse_and_normalize_date(search_terms[0])
                    search_terms = search_terms[1:]
                except ValueError:
                    date_query = None
        else:
            try:
                date_query = self.parse_and_normalize_date(search_terms[-1])
                search_terms = search_terms[:-1]
            except ValueError:
                date_query = None  
        if len(search_terms)==0 and date_query:
            try:
                results = PatientRequest.objects.filter(Q(assigned_to__account__agencyprofile=agency_user.account.agencyprofile) &
                    Q(patient__birth_date__exact=date_query))
                results=self.filter_results(request, results)
                results = results.order_by('-refreshed_time').distinct()
                results, count = self.paginate_results(request, results)
                return_results = AgencyPatientRequestSearchSerializer(results, many=True)
                services_list, funding_source_list = process_data_with_threading(results)
                if len(return_results.data) == 0:
                    return Response({'message': "No Search Results", "columns": self.get_columns(agency_user)}, status=status.HTTP_400_BAD_REQUEST)
                if len(return_results.data) <= 250:
                    return Response({'service_type': services_list, 'funding_source': funding_source_list, "rows": return_results.data, "count": count, "columns": self.get_columns(agency_user)}, status= status.HTTP_200_OK)
                else:
                    return Response({"message":"Too many records to display. Please narrow your search.", "columns": self.get_columns(agency_user)}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                return Response({"message":"No Search Results.", "columns": self.get_columns(agency_user)}, status=status.HTTP_404_NOT_FOUND)

        # Your existing code for handling single-word search
        if len(search_terms) == 1:
            results = PatientRequest.objects.filter(Q(assigned_to__account__agencyprofile=agency_user.account.agencyprofile) & ((Q(patient__first_name__icontains=search_terms[0]) | Q(patient__last_name__icontains=search_terms[0]))))
        # Handling single-word search with a date
        if len(search_terms) == 1 and date_query:
            results = PatientRequest.objects.filter((Q(assigned_to__account__agencyprofile=agency_user.account.agencyprofile) &
                Q(patient__birth_date__exact=date_query)) & ((Q(patient__first_name__icontains=search_terms[0]) | 
                Q(patient__last_name__icontains=search_terms[0]))))
        
        # Handling two-word search
        if len(search_terms) == 2 and not search_terms[0].isdigit():
            term1, term2 = search_terms
            results = PatientRequest.objects.filter(Q(assigned_to__account__agencyprofile=agency_user.account.agencyprofile) & (
                (Q(patient__first_name__icontains=term1) & Q(patient__last_name__icontains=term2)) |
                (Q(patient__first_name__icontains=term2) & Q(patient__last_name__icontains=term1))
            ))

        # Handling two-word search with a date
        if len(search_terms) == 2 and date_query:
            term1, term2 = search_terms[:2]
            results = PatientRequest.objects.filter((Q(assigned_to__account__agencyprofile=agency_user.account.agencyprofile) & Q(patient__birth_date__exact=date_query)) & ((
                (Q(patient__first_name__icontains=term1) & Q(patient__last_name__icontains=term2)) |
                (Q(patient__first_name__icontains=term2) & Q(patient__last_name__icontains=term1))
            )))
        if len(search_terms)==3 and isinstance(search_terms[0],str) and isinstance(search_terms[1],str) and search_terms[2].isdigit():
            term1, term2, care_id = search_terms
            results = PatientRequest.objects.filter((Q(id=care_id) & Q(assigned_to__account__agencyprofile=agency_user.account.agencyprofile)) & (
                (Q(patient__first_name__icontains=term1) & Q(patient__last_name__icontains=term2)) |
                (Q(patient__first_name__icontains=term2) & Q(patient__last_name__icontains=term1))
            ))

        # Display instructional message for three-word search
        if (len(search_terms) == 3) and (not search_terms[2].isdigit()):
            return Response({
                'message': 'Please search for a First Name and Last Name of Client Name. If the record you are searching for has multiple last names, please simply search for one of the last names. You may also search for a birthdate by providing the date in MM/DD/YYYY format. For example, 10/14/1950.'
            , "columns": self.get_columns(agency_user)}, status=status.HTTP_400_BAD_REQUEST)
        
        if (search_terms[0].isdigit() and len(search_terms) > 1) or (search_terms[0].isdigit() and date_query):
            return Response({"message":"If you want to search for a specific Care Request, please just search for the Care Request ID by putting searching for only that number. For example: 12345", "columns": self.get_columns(agency_user)}, status=status.HTTP_400_BAD_REQUEST)
        
        # Handling search for Care Request ID
        if search_terms[0].isdigit() and (len(search_terms) == 1):
            care_request_id = int(search_terms[0])
            try:
                result = PatientRequest.objects.filter(Q(id=care_request_id) & Q(assigned_to__account__agencyprofile=agency_user.account.agencyprofile))
                return_result = AgencyPatientRequestSearchSerializer(result, many=True)
                services_list, funding_source_list = process_data_with_threading(result)
                if len(return_result.data) == 0:
                    return Response({'message': "Could not find a Care Request ID with that identifier. Please try a different number or try searching by Client Name. For example, type John Smith in the search field to search for all cases that match to the name John Smith.", "columns": self.get_columns(agency_user)}, status=status.HTTP_400_BAD_REQUEST)
                return Response({'service_type': services_list, 'funding_source': funding_source_list,"rows":return_result.data, "columns": self.get_columns(agency_user),"count":1}, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({"message":"Patient Request does not exist", "columns": self.get_columns(agency_user)}, 
                                status=status.HTTP_404_NOT_FOUND)
        
        if number_query and len(search_terms) == 1 and date_query:
            results = PatientRequest.objects.filter(Q(id=number_query) & (Q(assigned_to__account__agencyprofile=agency_user.account.agencyprofile) &
                Q(patient__birth_date__exact=date_query)) & ((Q(patient__first_name__icontains=search_terms[0]) | 
                Q(patient__last_name__icontains=search_terms[0]))))

        if number_query and len(search_terms) == 2 and date_query:
            term1, term2 = search_terms[:2]
            results = PatientRequest.objects.filter(Q(id = number_query) & (Q(assigned_to__account__agencyprofile=agency_user.account.agencyprofile) & Q(patient__birth_date__exact=date_query)) & ((
                (Q(patient__first_name__icontains=term1) & Q(patient__last_name__icontains=term2)) |
                (Q(patient__first_name__icontains=term2) & Q(patient__last_name__icontains=term1))
            )))
        if len(search_terms)==2 and search_terms[-1].isdigit() and isinstance(search_terms[0],str):
            results = PatientRequest.objects.filter((Q(id=search_terms[-1]) & Q(assigned_to__account__agencyprofile=agency_user.account.agencyprofile)) &
                    ((Q(patient__first_name__icontains=search_terms[0]) | Q(patient__last_name__icontains=search_terms[0]))))
        if date_query and len(search_terms)==1 and isinstance(search_terms[0],str):
            results = PatientRequest.objects.filter((Q(assigned_to__account__agencyprofile=agency_user.account.agencyprofile) &
                    Q(patient__birth_date__exact=date_query)) & ((Q(patient__first_name__icontains=search_terms[0]) | 
                    Q(patient__last_name__icontains=search_terms[0]))))
        
        try:
            results= self.filter_results(request, results)
            results = results.order_by('-refreshed_time').distinct()
            results, count = self.paginate_results(request, results)
            return_results = AgencyPatientRequestSearchSerializer(results, many=True)
            services_list, funding_source_list = process_data_with_threading(results)
        except:
            return Response({'message': "Please search for a First Name and Last Name of Client Name. If the record you are searching for has multiple last names, please simply search for one of the last names. You may also search for a birthdate by providing the date in MM/DD/YYYY format. For example, 10/14/1950", "columns": self.get_columns(agency_user)}, status=status.HTTP_400_BAD_REQUEST)
        if len(return_results.data) == 0:
                return Response({'message': "Please search for a First Name and Last Name of Client Name. If the record you are searching for has multiple last names, please simply search for one of the last names. You may also search for a birthdate by providing the date in MM/DD/YYYY format. For example, 10/14/1950", "columns": self.get_columns(agency_user)}, status=status.HTTP_400_BAD_REQUEST)
        if len(return_results.data) <= 250:
            return Response({'service_type': services_list, 'funding_source': funding_source_list, "rows": return_results.data, "count": count, "columns": self.get_columns(agency_user)}, status= status.HTTP_200_OK)
        else:
            return Response({"message":"Too many records to display. Please narrow your search.", "columns": self.get_columns(agency_user)}, status=status.HTTP_400_BAD_REQUEST)


@permission_classes([IsAuthenticated, AgencyManagerOnly])
class ClientHistorySearchView(APIView):

    def parse_and_normalize_date(self, date_str):
            supported_formats = ['%m/%d/%Y', '%m/%d/%y', '%m-%d-%Y', '%m-%d-%y']
            parsed_date = None
            for date_format in supported_formats:
                try:
                    parsed_date = datetime.strptime(date_str, date_format).date()
                    break
                except Exception as e:
                    continue

            if parsed_date is not None:
                # Normalize the date if needed
                threshold_year = 50  # e.g., consider years less than 50 as 21st century
                if parsed_date.year <= threshold_year:
                    parsed_date = parsed_date.replace(year=parsed_date.year + 2000)
                return parsed_date
            else:
                # Handle the case when none of the formats match
                raise ValueError("Unsupported date format")
        
    def get(self, request,user_id):
        try:
            search_input = request.GET.get('search_input')
            patient = Patient.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response("Patient does not exist", status=status.HTTP_400_BAD_REQUEST)
        
        if not search_input:
            return Response({
                'message': "Search Term required"
            }, status=status.HTTP_400_BAD_REQUEST)

        search_terms = search_input.split()
        date_query = None
        number_query=None
        if len(search_terms) == 2 and isinstance(search_terms[1],str):
            if '/'  in search_terms[-1] or  '-'  in search_terms[-1] :
                try:
                    date_query = self.parse_and_normalize_date(search_terms[-1])
                    search_terms = search_terms[:-1]
                except ValueError:
                    date_query = None
            else:
                try:
                    date_query = self.parse_and_normalize_date(search_terms[0])
                    search_terms = search_terms[1:]
                except ValueError:
                    date_query = None
            
        elif len(search_terms) > 1 and search_terms[-1].isdigit():
            try:
                date_query = self.parse_and_normalize_date(search_terms[-2])
                number_query=search_terms[-1]
                search_terms = search_terms[:-2]
            except ValueError:
                date_query = None
        elif len(search_terms) == 3 and isinstance(search_terms[1],str) and isinstance(search_terms[2],str):
            if '/' in search_terms[-1] or '-' in search_terms[-1]:
                try:
                    date_query = self.parse_and_normalize_date(search_terms[-1])
                    search_terms = search_terms[:-1]
                except ValueError:
                    date_query = None
            else:
                try:
                    date_query = self.parse_and_normalize_date(search_terms[0])
                    search_terms = search_terms[1:]
                except ValueError:
                    date_query = None   
        else:
            try:
                date_query = self.parse_and_normalize_date(search_terms[-1])
                search_terms = search_terms[:-1]
            except ValueError:
                date_query = None

        if len(search_terms)==0 and date_query:
                patient_queryset = patient.patientrequest_set.all()  
                results = patient_queryset.filter(Q(patient__birth_date__exact=date_query))
                return_results = AgencyPatientRequestSearchSerializer(results, many=True)
                if len(return_results.data) == 0:
                    return Response({'message': "No Search Results"}, status=status.HTTP_400_BAD_REQUEST)
                if len(return_results.data) <= 250:
                    return Response({return_results.data},status=status.HTTP_200_OK)
                else:
                    return Response({"message":"Too many records to display. Please narrow your search."}, status=status.HTTP_400_BAD_REQUEST)

         # Your existing code for handling single-word search
        patient_queryset = patient.patientrequest_set.all()  
        if len(search_terms) == 1:
                results = patient_queryset.filter(Q(patient__first_name__icontains=search_terms[0]) |
                    Q(patient__last_name__icontains=search_terms[0]))
                
        # Handling single-word search with a date
        if len(search_terms) == 1 and date_query:
                results = patient_queryset.filter(Q(patient__birth_date__exact=date_query) & (Q(patient__first_name__icontains=search_terms[0]) |
                    Q(patient__last_name__icontains=search_terms[0])))
        # Handling two-word search  
        if len(search_terms) == 2 and not search_terms[0].isdigit():
            term1, term2 = search_terms
            results = patient_queryset.filter((
                    (Q(patient__first_name__icontains=term1) & Q(patient__last_name__icontains=term2)) |
                    (Q(patient__first_name__icontains=term2) & Q(patient__last_name__icontains=term1))
                ))

        # Handling two-word search with a date
        if len(search_terms) == 2 and date_query:
            term1, term2 = search_terms[:2]
            results = patient_queryset.filter(Q(patient__birth_date__exact=date_query) & (
                (Q(patient__first_name__icontains=term1) & Q(patient__last_name__icontains=term2)) |
                (Q(patient__first_name__icontains=term2) & Q(patient__last_name__icontains=term1))
            ))

        if len(search_terms)==3 and isinstance(search_terms[0],str) and isinstance(search_terms[1],str) and search_terms[2].isdigit():
            term1, term2, care_id = search_terms
            results = patient_queryset.filter(Q(id=care_id) & (
                (Q(patient__first_name__icontains=term1) & Q(patient__last_name__icontains=term2)) |
                (Q(patient__first_name__icontains=term2) & Q(patient__last_name__icontains=term1))
            ))

        # Display instructional message for three-word search
        if (len(search_terms) == 3) and (not search_terms[2].isdigit()):
            return Response({
                'message': 'Please search for a First Name and Last Name of Client Name. If the record you are searching for has multiple last names, please simply search for one of the last names. You may also search for a birthdate by providing the date in MM/DD/YYYY format. For example, 10/14/1950.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if (search_terms[0].isdigit() and len(search_terms) > 1) or (search_terms[0].isdigit() and date_query):
            return Response( {"message":"If you want to search for a specific Care Request, please just search for the Care Request ID "
                            "by searching for only that number. For example: 12345."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Handling search for Care Request ID
        if search_terms[0].isdigit() and (len(search_terms) == 1):
            care_request_id = int(search_terms[0])
            try:    
                result = patient_queryset.filter(id=care_request_id)
                return_result = AgencyPatientRequestSearchSerializer(result, many=True)
                if len(return_result.data) == 0:
                    return Response({'message': "Could not find a Care Request ID with that identifier. Please try a different number or try searching by Client Name. For example, type John Smith in the search field to search for all cases that match to the name John Smith."}, status=status.HTTP_400_BAD_REQUEST)
                return Response(return_result.data, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({"message":"Patient Request does not exist."}, 
                                status=status.HTTP_404_NOT_FOUND)

        if number_query and len(search_terms) == 1 and date_query:
                results = patient_queryset.filter((Q(id=number_query) &
                    Q(patient__birth_date__exact=date_query)) & 
                    (Q(patient__first_name__icontains=search_terms[0]) | Q(patient__last_name__icontains=search_terms[0])))
        if number_query and len(search_terms) == 2 and date_query:
            term1, term2 = search_terms[:2]
            results = patient_queryset.filter(Q(id=number_query) & Q(patient__birth_date__exact=date_query) & ((
                (Q(patient__first_name__icontains=term1) & Q(patient__last_name__icontains=term2)) |
                (Q(patient__first_name__icontains=term2) & Q(patient__last_name__icontains=term1))
            )))

        if len(search_terms)==2 and search_terms[-1].isdigit() and isinstance(search_terms[0],str):
            results =patient_queryset.filter(Q(id=search_terms[-1]) &
                    ((Q(patient__first_name__icontains=search_terms[0]) | Q(patient__last_name__icontains=search_terms[0]))))
        if date_query and len(search_terms)==1 and isinstance(search_terms[0],str):
            results = patient_queryset.filter(Q(patient__birth_date__exact=date_query) & ((Q(patient__first_name__icontains=search_terms[0]) | 
                    Q(patient__last_name__icontains=search_terms[0]))))
        

        try:
            return_results = AgencyPatientRequestSearchSerializer(results, many=True)
        except:
            return Response({'message': "Please search for a First Name and Last Name of Client Name. If the record you are searching for has multiple last names, please simply search for one of the last names. You may also search for a birthdate by providing the date in MM/DD/YYYY format. For example, 10/14/1950"}, status=status.HTTP_400_BAD_REQUEST)
        if len(return_results.data) == 0:
                return Response({'message': "Please search for a First Name and Last Name of Client Name. If the record you are searching for has multiple last names, please simply search for one of the last names. You may also search for a birthdate by providing the date in MM/DD/YYYY format. For example, 10/14/1950"}, status=status.HTTP_400_BAD_REQUEST)
        if len(return_results.data) <= 250:
            return Response(return_results.data)
        else:
            return Response({"message":"Too many records to display. Please narrow your search."}, status=status.HTTP_400_BAD_REQUEST)


@permission_classes([IsAuthenticated, AgencyManagerOnly])
class CareRequestGetApiView(APIView):
    pagination_class = LimitOffsetPagination

    def get(self, request, user_id):
        try:
            agency_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response("User does not exist", status=status.HTTP_400_BAD_REQUEST)

        try:
            if agency_user.group == 'Care Manager':
                columns = [
                    {"id": 1, "field": 'id', "headerName": 'ID'},
                    {"id": 2, "field": 'clientName', "headerName": 'Client Name'},
                    {"id": 3, "field": 'patient__zip', "headerName": 'Zip Code'},
                    {"id": 4, "field": 'funding', "headerName": 'Funding'},
                    {"id": 5, "field": 'services', "headerName": 'Services'},
                    {"id": 6, "field": 'hours', "headerName": 'Hours'},
                    {"id": 7, "field": 'status', "headerName": 'Status'},
                    {"id": 8, "field": 'refreshed_time', "headerName": 'Time Since Posted'},
                ]
                results = PatientRequest.objects.prefetch_related('servicerequested_set').filter(assigned_to=agency_user)
            else:
                columns = [
                    {"id": 1, "field": 'id', "headerName": 'ID'},
                    {"id": 2, "field": 'caseManager', "headerName": 'Case Manager'},
                    {"id": 3, "field": 'full_name', "headerName": 'Client Name'},
                    {"id": 4, "field": 'patient__zip', "headerName": 'Zip Code'},
                    {"id": 5, "field": 'funding', "headerName": 'Funding'},
                    {"id": 6, "field": 'services', "headerName": 'Services'},
                    {"id": 7, "field": 'hours', "headerName": 'Hours'},
                    {"id": 8, "field": 'status', "headerName": 'Status'},
                    {"id": 9, "field": 'refreshed_time', "headerName": 'Time Since Posted'},
                ]
                results = PatientRequest.objects.prefetch_related('servicerequested_set').filter(
                    assigned_to__account__agencyprofile=agency_user.account.agencyprofile)

        except Exception as e:
            return Response({'message': "User is not Agency User"}, status=status.HTTP_400_BAD_REQUEST)

        funding_filters = request.GET.get('funding')
        services_filters = request.GET.get('services')
        status_filters = request.GET.get('status')
        manager_name_filter = request.GET.get('manager_name')

        # Convert stringified JSON filters to Python objects
        if funding_filters:
            funding_filters = json.loads(funding_filters)
        if services_filters:
            services_filters = json.loads(services_filters)
        if status_filters:
            status_filters = json.loads(status_filters)
        if manager_name_filter:
            manager_name_filter = json.loads(manager_name_filter)

         # Apply filters to the results
        if funding_filters:
            filter_conditions = Q()
            for funding in funding_filters:
                filter_conditions |= Q(servicerequested__funding_source__name=funding)
            results = results.filter(filter_conditions)
        
        if services_filters:
            filter_conditions = Q()
            for service in services_filters:
                filter_conditions |= Q(servicerequested__service__name__icontains=service)
            results = results.filter(filter_conditions)
        
        if status_filters:
            filter_conditions = Q()
            status_mapping = {
                'opened': PatientRequest.Statuses.OPEN,
                'pending': PatientRequest.Statuses.PENDING,
                'closed': PatientRequest.Statuses.CLOSED,
                'partiallyMatched': PatientRequest.Statuses.PARTIALLY_MATCHED,
            }
            archived_mapping = {
                'archived': PatientRequest.Archived.ARCHIVED,
                'not_archived': PatientRequest.Archived.NOT_ARCHIVED,
            }
            status_conditions = Q()
            archived_conditions = Q()
            for key, value in status_filters.items():
                if key in status_mapping and value:
                    status_conditions |= Q(status=status_mapping[key])
                elif key in archived_mapping and value: 
                    archived_conditions |= Q(is_archived=archived_mapping[key])

            
            filter_conditions = status_conditions | archived_conditions

            if 'archived' in status_filters and status_filters['archived'] == False:
                filter_conditions &= ~Q(is_archived=True)
            results = results.filter(filter_conditions)

        if manager_name_filter:
            manager_name_filter = manager_name_filter['caseManager']
            results = results.annotate(full_name=Concat(Lower('assigned_to__userprofile__first_name'), Value(" "),
                                                        Lower('assigned_to__userprofile__last_name'))).filter(
                full_name__icontains=manager_name_filter)
        
        
        results = results.order_by('-refreshed_time').distinct()
        ordering = request.GET.get('ordering')
        if ordering:
            try:
                results = results.annotate(
                    full_name=Concat(Lower('patient__first_name'), Value(" "), Lower('patient__last_name'))
                ).order_by(ordering).distinct()
            except Exception as e:
                logger.warning("Ordering key not provided: %s", e)

        # Paginate the results based on frontend parameters
        paginator = self.pagination_class()
        paginated_results = paginator.paginate_queryset(results, request)

        # Serialize paginated results
        return_results = AgencyPatientRequestSearchSerializer(paginated_results, many=True)
        if results:
            services_list, funding_source_list = process_data_with_threading(results)
        else:
            services_list = []
            funding_source_list = []

        response_data = {
            'service_type': services_list,
            'funding_source': funding_source_list,
            'rows': return_results.data,
            'columns': columns,
            'count': len(results),
        }

        return Response(response_data, status=status.HTTP_200_OK)


@permission_classes([IsAuthenticated, AgencyManagerOnly])
class ClientGetApiView(APIView):
    pagination_class = LimitOffsetPagination

    def get(self, request, user_id):

        columns=[
            { "id": 1, "field": 'full_name', "headerName": 'Client Name'},
            { "id": 2, "field": 'patient__zip', "headerName": 'Zip Code'},
            { "id": 3, "field": 'birthday', "headerName": 'Birth Date'},
            { "id": 4, "field": 'actions', "headerName": 'Actions'}
        ]

        error = ('Please search for a First Name and Last Name. If the record you are searching for has multiple last'
                 'names, please simply search for one of the last names. You may also search for a birthdate by '
                 'providing the date in MM/DD/YYYY format. For example, 10/14/1950.'),

        response_data = {'message': error, 'columns': columns}
        return Response(response_data, status=status.HTTP_400_BAD_REQUEST)
    
@permission_classes([IsAuthenticated, AgencyManagerOnly])
class ClientHistoryGetAPIView(APIView):
    pagination_class = LimitOffsetPagination


    def get(self, request, user_id):
        try:
            patient = Patient.objects.get(id=user_id)
        except Exception as e:
            return Response("Patient does not exist", status=status.HTTP_400_BAD_REQUEST)
        columns = [
                { "id": 1, "field": 'id', "headerName": 'ID'},
                { "id": 2, "field": 'caseManager', "headerName": 'Case Manager'},
                { "id": 3, "field": 'funding', "headerName": 'Funding'},
                { "id": 4, "field": 'services', "headerName": 'Services'},
                { "id": 5, "field": 'hours', "headerName": 'Hours'},
                { "id": 6, "field": 'posted', "headerName": 'Posted'},
                { "id": 7, "field": 'matched', "headerName": 'Matched'},
                { "id": 8, "field": 'status', "headerName": 'Status'},
            ]
        
        results = patient.patientrequest_set.all()
        funding_filters = request.GET.get('funding')
        services_filters = request.GET.get('services')
        status_filters = request.GET.get('status')
        manager_name_filter = request.GET.get('manager_name')

        # Convert stringified JSON filters to Python objects
        if funding_filters:
            funding_filters = json.loads(funding_filters)
        if services_filters:
            services_filters = json.loads(services_filters)
        if status_filters:
            status_filters = json.loads(status_filters)
        if manager_name_filter:
            manager_name_filter = json.loads(manager_name_filter)

         # Apply filters to the results
        if funding_filters:
            filter_conditions = Q()
            for funding in funding_filters:
                filter_conditions |= Q(servicerequested__funding_source__name=funding)
            results = results.filter(filter_conditions)
        
        if services_filters:
            filter_conditions = Q()
            for service in services_filters:
                filter_conditions |= Q(servicerequested__service__name__icontains=service)
            results = results.filter(filter_conditions)
        
        if status_filters:
            filter_conditions = Q()
            status_mapping = {
                'opened': PatientRequest.Statuses.OPEN,
                'pending': PatientRequest.Statuses.PENDING,
                'closed': PatientRequest.Statuses.CLOSED,
                'partiallyMatched': PatientRequest.Statuses.PARTIALLY_MATCHED,
            }
            archived_mapping = {
                'archived': PatientRequest.Archived.ARCHIVED,
                'not_archived': PatientRequest.Archived.NOT_ARCHIVED,
            }
            status_conditions = Q()
            archived_conditions = Q()

            for key, value in status_filters.items():
                if key in status_mapping and value:
                    status_conditions |= Q(status=status_mapping[key])
                elif key in archived_mapping and value:
                    archived_conditions |= Q(is_archived=archived_mapping[key])
            filter_conditions = status_conditions | archived_conditions
            results = results.filter(filter_conditions)
            
        if manager_name_filter:
            manager_name_filter=manager_name_filter['caseManager']
            results = results.annotate(full_name=Concat(Lower('assigned_to__userprofile__first_name'), Value(" "), Lower('assigned_to__userprofile__last_name'))).filter(full_name__icontains=manager_name_filter)

        
       
        results = results.order_by('-refreshed_time').distinct()
        ordering = request.GET.get('ordering')
        if ordering:
            if ordering == 'posted':
                ordering= 'refreshed_time'
            elif ordering == '-posted':
                ordering= '-refreshed_time'
            elif ordering == 'matched':
                ordering = 'servicerequested__match_date'
            elif ordering == '-matched':
                ordering = '-servicerequested__match_date'
            try:
                results = results.annotate(
                    full_name=Concat(Lower('patient__first_name'), Value(" "), Lower('patient__last_name'))
                ).order_by(ordering).distinct()
            except Exception as e:
                logger.warning("Ordering key not provided: %s", e)

        count = len(results)
        # Paginate the results based on frontend parameters
        paginator = self.pagination_class()
        paginated_results = paginator.paginate_queryset(results, request)
        return_results = AgencyPatientRequestSearchSerializer(paginated_results, many=True)

        if results:
            services_list, funding_source_list = process_data_with_threading(results)
        else:
            services_list = []
            funding_source_list = []
        response_data = {'service_type' : services_list, 'funding_source' : funding_source_list,'rows': return_results.data, 'columns': columns, 'count': count}
        return Response(response_data, status=status.HTTP_200_OK)