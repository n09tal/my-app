from duett_api.patients.utils import is_hijack_user
from duett_api.patients.permissions import RequestNotesPermissions
from rest_framework import serializers
from django.db.models import Q
from django.utils.translation import gettext_lazy as _

from .models import (
    Patient,
    PatientActivity,
    PatientRequest,
    ServiceRequested,
    RequestNotes,
    TableColumns,
    ArchivedDeletePatientRequest
)
from duett_api.users.models import ProviderProfile
from duett_api.services.models import FundingSource, ServiceType
from duett_api.users.serializers import (
    AccountSerializer,
    CustomUserDetailsSerializer,
    CustomUserDetailsSearchSerializer,
    UserSerializer)


class ProviderPatientSerializer(serializers.ModelSerializer):
    gender = serializers.CharField(source="get_gender_display")

    class Meta:
        model = Patient
        fields = [
            "id",
            "email",
            "gender",
            "phone",
            "address",
            "city",
            "state",
            "zip",
            "created_by",
            "age",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class AgencyPatientSerializer(serializers.ModelSerializer):

    class Meta:
        model = Patient
        fields = [
            "id",
            "first_name",
            "last_name",
            "birth_date",
            "email",
            "gender",
            "phone",
            "address",
            "city",
            "state",
            "zip",
            "created_by",
            "age",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=("first_name", "last_name","birth_date",),
                message=_("Patient already exists. Use the search function to select the existing patient.")
            )
        ]

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if is_hijack_user(self.context.get('request')):
            representation['first_name'] = instance._first_name()
            representation['last_name'] = instance._last_name()
            representation['email'] = instance._email()
            representation['birth_date'] = ''
            representation['address'] = ''
        return representation


class ObjectStringPropertyField(serializers.Field):
    """
    Serialize an object instance into a property on of that object
    """

    def __init__(self, model=None, property_name=None, *args, **kwargs):
        self.model = model
        self.property_name = property_name
        super().__init__(*args, **kwargs)

    def to_internal_value(self, data):
        pass

    def to_representation(self, value):
        if not isinstance(value, self.model):
            raise Exception("Incorrect model")
        if not hasattr(value, self.property_name):
            raise Exception(
                f'{self.model} has no property "{self.property_name}"'
            )

        ret = getattr(value, self.property_name)
        if not isinstance(ret, str):
            raise Exception(f"{ret} is not a str")
        return ret


class FrequencyField(serializers.Field):
    def to_internal_value(self, data):
        pass

    def to_representation(self, value):
        if value == 2:
            return "Per Month"
        return "Per Week"


class StatusField(serializers.Field):
    def to_internal_value(self, data):
        pass

    def to_representation(self, value):
        return ServiceRequested.Statuses(value).label


class ProviderStatusField(serializers.Field):
    def to_internal_value(self, data):
        pass

    def to_representation(self, value):
        if value == ServiceRequested.Statuses.OPEN:
            return "New"
        elif value == ServiceRequested.Statuses.PENDING:
            return "Submitted"
        else:
            return "Matched"


class RequestNotesHistoricalRecordSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    history_user = UserSerializer(read_only=True)

    class Meta:
        model = RequestNotes.history.model
        fields = ["id", "created_at", "updated_at", "body", "account", "history_id", "history_user","author"]


class RequestNotesSerializer(serializers.ModelSerializer):

    history = RequestNotesHistoricalRecordSerializer(read_only=True, many=True)

    class Meta:
        model = RequestNotes
        fields = ["id", "body", "request", "author", "created_at", "account", "history"]


class ProviderServiceRequestedSerializer(serializers.ModelSerializer):
    service = ObjectStringPropertyField(
        model=ServiceType, property_name="name"
    )
    funding_source = ObjectStringPropertyField(
        model=FundingSource, property_name="name"
    )
    frequency = FrequencyField()
    status = serializers.SerializerMethodField()
    interested = serializers.SerializerMethodField()
    matched = serializers.SerializerMethodField()

    class Meta:
        model = ServiceRequested
        fields = [
            "id",
            "request",
            "service",
            "funding_source",
            "frequency",
            "status",
            "interested",
            "matched",
            "hours",
            "is_delete",
            "reason",
            "message",
        ]

    def get_interested(self, obj):
        return obj.interests.filter(pk=self.provider_profile.pk).exists()

    def get_matched(self, obj):
        return obj.match == self.provider_profile

    def get_status(self, obj):
        if self.get_matched(obj):
            return "Matched"
        if self.get_interested(obj):
            return "Submitted"
        if obj.status == PatientRequest.Statuses.CLOSED:
            # This case will not come up in practice as service requests closed
            # for the benefit of other care providers will be filtered out by
            # the query.
            return "Closed"
        return "New"

    @property
    def provider_profile(self):
        request = self.context.get("request")
        assert request
        return request.user.account.providerprofile


class ProviderPatientRequestGetSerializer(serializers.ModelSerializer):
    patient = ProviderPatientSerializer(many=False)
    care_manager = CustomUserDetailsSerializer(many=False, source="assigned_to")
    additional_notes = serializers.CharField(source="notes")
    hidden = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    agency_name = serializers.SerializerMethodField()
    services = serializers.SerializerMethodField()

    class Meta:
        model = PatientRequest
        fields = [
            "id",
            "patient",
            "request_prior_authorization",
            "transportation_required",
            "pets",
            "care_manager",
            "smoking",
            "equipment",
            "status",
            "services",
            "additional_notes",
            "refreshed_time",
            "updated_at",
            "hidden",
            "requested_schedule",
            "agency_name",
            "is_archived",
        ]


    def get_hidden(self, obj):
        request = self.context.get("request")
        if request:
            return request.user.account.providerprofile.provider_hides.filter(
                id=obj.id
            ).exists()
        else:
            return False

    def get_status(self, obj):
        try:
            return self.context['request'].patient_request_status_map[obj.id]
        except AttributeError as e:
            pp = self.context['request'].user.account.providerprofile
            if obj.servicerequested_set.filter(match__pk=pp).exists():
                return "Matched"
            elif obj.servicerequested_set.filter(interests__pk=pp).exists():
                return "Submitted"
            else:
                return "New"


    def get_agency_name(self, obj):
        return str(obj.patient.created_by)

    def get_services(self, obj):
        queryset = obj.servicerequested_set.filter(is_delete=0)
        serializer_context = {'request': self.context.get('request') }
        return ProviderServiceRequestedSerializer(queryset, context=serializer_context, many=True).data


class AgencyServiceRequestedSerializer(serializers.ModelSerializer):
    service = ObjectStringPropertyField(
        model=ServiceType, property_name="name"
    )
    funding_source = ObjectStringPropertyField(
        model=FundingSource, property_name="name"
    )
    frequency = FrequencyField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = ServiceRequested
        fields = [
            "id",
            "request",
            "service",
            "funding_source",
            "frequency",
            "hours",
            "status",
            "match",
            "is_delete",
            "reason",
            "message",
            "match_date",
        ]

    def get_status(self, obj):
        if obj.status == 1:
            return "Open"
        elif obj.status == 2:
            return "Submissions Received"
        else:
            return "Matched"


class ServiceRequestedPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceRequested
        fields = [
            "id",
            "request",
            "service",
            "funding_source",
            "frequency",
            "hours",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["request"]

    def create(self, validated_data):
        request_obj = self.context["request"]
        request_id = request_obj.parser_context["kwargs"]["request_pk"]
        service = ServiceRequested.objects.create(
            request_id=request_id, **validated_data
        )
        return service


class ProviderInterestSerializer(serializers.ModelSerializer):
    account = AccountSerializer(many=False)
    services = serializers.SerializerMethodField()

    class Meta:
        model = ProviderProfile
        fields = ("account", "phone", "services", "email")

    def __init__(self, patient_request=None, **kwargs):
        self.patient_request = patient_request
        super().__init__(**kwargs)

    def get_services(self, obj):
        request = self.context.get("request")
        if request:
            services = obj.interested_services.filter(
                request=self.patient_request,
                is_delete=0
            )
            serializer = AgencyServiceRequestedSerializer(
                instance=services, many=True
            )
            return serializer.data
        else:
            return []

class RequestActivitySerializer(serializers.ModelSerializer):
    activity_date = serializers.SerializerMethodField()
    activity_time = serializers.SerializerMethodField()

    class Meta:
        model = PatientActivity
        fields = [            
            "activity_date",
            "activity_time",
            "message"
        ]

    def get_activity_date(self, obj):
        return obj.created_at.strftime("%m/%d/%Y")

    def get_activity_time(self, obj):
        return obj.created_at.strftime("%H:%M %p")


class AgencyPatientRequestGetSerializer(serializers.ModelSerializer):
    patient = AgencyPatientSerializer(many=False)
    care_manager = CustomUserDetailsSerializer(many=False, source="assigned_to")
    additional_notes = serializers.CharField(source="notes")
    interests = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    services = serializers.SerializerMethodField(source="servicerequested_set")

    def get_services(self, obj):
        return AgencyServiceRequestedSerializer(obj.servicerequested_set.filter(is_delete=0), many=True, read_only=True).data
    
    class Meta:
        model = PatientRequest
        fields = [
            "id",
            "patient",
            "care_manager",
            "request_prior_authorization",
            "transportation_required",
            "pets",
            "smoking",
            "equipment",
            "status",
            "services",
            "additional_notes",
            "refreshed_time",
            "updated_at",
            "interests",
            "requested_schedule",
            "is_archived",
            "hide_manager_contact_info",
        ]



    def get_interests(self, obj):
        providers = ProviderProfile.objects.filter(
            interested_services__in=obj.servicerequested_set.all()
        ).distinct()
        serializer = ProviderInterestSerializer(
            instance=providers,
            many=True,
            patient_request=obj,
            context=self.context,
        )
        return serializer.data

    def get_status(self, obj):
        try:
            return obj.display_status
        except AttributeError as e:
            if obj.is_archived:
                return "Archived"
            elif obj.status == 1:
                return "Open"
            elif obj.status == 2:
                return "Submissions Received"
            elif obj.status == 4:
                return "Partially Matched"
            else:
                return "Matched"


class PatientRequestUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientRequest
        fields = [
            "id",
            "patient",
            "request_prior_authorization",
            "transportation_required",
            "pets",
            "created_by",
            "assigned_to",
            "notes",
            "smoking",
            "equipment",
            "status",
            "refreshed_time",
            "updated_at",
            "requested_schedule",
        ]
        read_only_fields = ["id", "refreshed_time", "updated_at"]
        depth = 1


class TableColumnsSerializer(serializers.ModelSerializer):
    class Meta:
        model = TableColumns
        fields = [
            "id",
            "name",
            "sequence",
            "role",
            "table_name",
            "sort_label",
            "column_type",
        ]


class ArchivedDeletePatientRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArchivedDeletePatientRequest
        fields = '__all__'


class AgencyPatientSearchSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    birth_date = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = [
            "id",
            "name",
            "birth_date",
            "zip"
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=("first_name", "last_name", "birth_date",),
                message=_("Patient already exists. Use the search function to select the existing patient.")
            )
        ]

    def get_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"

    def get_birth_date(self, obj):
        formatted_date = obj.birth_date.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
        return formatted_date


class AgencyPatientRequestSearchSerializer(serializers.ModelSerializer):
    patient = AgencyPatientSearchSerializer(many=False)
    care_manager = CustomUserDetailsSearchSerializer(many=False, source="assigned_to")
    status = serializers.SerializerMethodField()
    services = serializers.SerializerMethodField(source="servicerequested_set")

    def get_services(self, obj):
        return AgencyServiceRequestedSerializer(obj.servicerequested_set.filter(is_delete=0), many=True, read_only=True).data
    
    class Meta:
        model = PatientRequest
        fields = [
            "id",
            "patient",
            "care_manager",
            "status",
            "services",
            "refreshed_time",
            "updated_at",
        ]



    def get_interests(self, obj):
        providers = ProviderProfile.objects.filter(
            interested_services__in=obj.servicerequested_set.all()
        ).distinct()
        serializer = ProviderInterestSerializer(
            instance=providers,
            many=True,
            patient_request=obj,
            context=self.context,
        )
        return serializer.data

    def get_status(self, obj):
        try:
            return obj.display_status
        except AttributeError as e:
            if obj.is_archived:
                return "Archived"
            elif obj.status == 1:
                return "Open"
            elif obj.status == 2:
                return "Submissions Received"
            elif obj.status == 4:
                return "Partially Matched"
            else:
                return "Matched"
