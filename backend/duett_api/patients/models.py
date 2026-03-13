import datetime
import logging
from django.conf import settings
from django.db import models
import random
from django.core.exceptions import ObjectDoesNotExist
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.db.models.signals import m2m_changed
from django.contrib.sites.models import Site
from auditlog.registry import auditlog
from simple_history.models import HistoricalRecords

logger = logging.getLogger(__name__)

from duett_api.utils.models import TimestampMixin
from duett_api.services.models import ServiceType, FundingSource
from duett_api.users.models import ProviderProfile, AgencyProfile, Account
from django.utils import timezone
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType


class Patient(TimestampMixin):
    first_name = models.CharField(max_length=60)
    last_name = models.CharField(max_length=60)
    birth_date = models.DateField(null=True)
    email = models.EmailField(blank=True, null=True)
    address = models.CharField(max_length=200)
    city = models.CharField(max_length=30)
    state = models.CharField(max_length=30)
    zip = models.CharField(max_length=10)
    age = models.IntegerField()
    phone = models.CharField(max_length=16)

    gender = models.IntegerField(
        choices=((1, "Female"), (2, "Male"), (3, "Other"))
    )

    created_by = models.ForeignKey(AgencyProfile, on_delete=models.DO_NOTHING, db_constraint=False)

    history = HistoricalRecords()

    def __str__(self):
        return f"{self.id}"

    class Meta:
        unique_together = (
            "first_name",
            "last_name",
            "birth_date",
        )

    def _first_name(self):
        return self.first_name[0] if self.first_name else ''

    def _last_name(self):
        return self.last_name[0:3] if self.last_name else ''

    def _email(self):
        if self.email:
            email = list(self.email)
            random.shuffle(email)
            return ''.join(email)


class PatientRequest(TimestampMixin):
    """
    Requests for patient care
    """

    patient = models.ForeignKey(
        Patient, on_delete=models.DO_NOTHING, db_constraint=False)

    request_prior_authorization = models.BooleanField(default=False)
    transportation_required = models.BooleanField(default=False)

    pets = models.BooleanField(default=False)
    smoking = models.BooleanField(default=False)
    equipment = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.DO_NOTHING,
        db_constraint=False
    )

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.DO_NOTHING,
        db_constraint=False, default=None, blank=True, null=True, related_name='+'
    )
    # for providers to hide requests
    hides = models.ManyToManyField(
        ProviderProfile, related_name="provider_hides", blank=True
    )

    initial_created_time = models.DateTimeField(auto_now_add=True, null=True)
    refreshed_time = models.DateTimeField(auto_now_add=True, null=True)
    hide_manager_contact_info = models.BooleanField(default=False)
    # from now on
    # pending status aka status=2=Submission received for care manager
    class Statuses(models.IntegerChoices):
        OPEN = 1, "Open"
        PENDING = 2, "Pending"
        CLOSED = 3, "Closed"
        PARTIALLY_MATCHED = 4, "Partially Matched"

    status = models.IntegerField(
        choices=Statuses.choices, default=Statuses.OPEN
    )

    class Archived(models.IntegerChoices):
        NOT_ARCHIVED = 0, "NOT_ARCHIVED"
        ARCHIVED = 1, "ARCHIVED"

    is_archived = models.IntegerField(choices=Archived.choices, default=Archived.NOT_ARCHIVED)
    requested_schedule = models.CharField(
        max_length=255, null=True, blank=True
    )

    history = HistoricalRecords()

    def __str__(self):
        return f"PatientRequest<{self.id}>"

    def _created_by(self):
        created_by = list(self.created_by.email)
        return ''.join(created_by)

    def _patient(self):
        first_name = self.patient.first_name[0] if self.patient.first_name else ''
        last_name = self.patient.last_name[0:3] if self.patient.last_name else ''
        return first_name+' '+last_name

    def _assigned_to(self):
        assigned_to = list(self.assigned_to.email)
        return ''.join(assigned_to)

    def save(self, *args, **kwargs):
        if not self.id and not self.assigned_to:
            self.assigned_to = self.created_by
        super().save(*args, **kwargs)

class RequestNotes(TimestampMixin):
    request = models.ForeignKey(
        PatientRequest, on_delete=models.DO_NOTHING, db_constraint=False)
    body = models.TextField()
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.DO_NOTHING, db_constraint=False
    )
    account = models.ForeignKey(
        Account, on_delete=models.DO_NOTHING, db_constraint=False)

    history = HistoricalRecords(related_name="histories")

    def __str__(self):
        try:
            return f"{self.request}"
        except:
            return f"{self.request_id}"
            
    class Meta:
        verbose_name_plural = "Request notes"

    def _author(self):
        email = list(self.author.email)
        random.shuffle(email)
        return ''.join(email)

    def _request(self):
        first_name = self.request.patient.first_name
        last_name = self.request.patient.last_name
        first_name = first_name[0] if first_name else ''
        last_name = last_name[0:3] if last_name else ''
        return first_name+' '+last_name


class ServiceRequested(TimestampMixin):
    """
    This is for each service that a patient requests.
    There can be multiple services requested for each patient care request.
    """

    request = models.ForeignKey(
        PatientRequest, on_delete=models.DO_NOTHING, db_constraint=False)
    service = models.ForeignKey(
        ServiceType, on_delete=models.DO_NOTHING,related_name="service_type", db_constraint=False)
    funding_source = models.ForeignKey(
        FundingSource, on_delete=models.DO_NOTHING, related_name="funding_source", null=True, blank=True, db_constraint=False
    )

    hours = models.PositiveIntegerField()
    choices = (
        (1, "Per Week"),
        (2, "Per Month"),
    )
    frequency = models.IntegerField(choices=choices)

    class Statuses(models.IntegerChoices):
        OPEN = 1, "Open"
        PENDING = 2, "Pending"
        CLOSED = 3, "Closed"

    status = models.IntegerField(
        choices=Statuses.choices, default=Statuses.OPEN
    )

    # Providers
    interests = models.ManyToManyField(
        ProviderProfile, related_name="interested_services", blank=True,
        db_constraint=False
    )
    match = models.ForeignKey(
        ProviderProfile,
        related_name="provider_match",
        on_delete=models.DO_NOTHING,
        db_constraint=False,
        null=True,
        blank=True,
    )
    declines = models.ManyToManyField(
        ProviderProfile, related_name="provider_declines", blank=True
    )
    class DeleteReason(models.IntegerChoices):
        OTHER = 1, "Other (tell us why)."
        INFO_INCORRECT = 2, "Client information entered incorrectly"
        REQUEST_INCORRECT = 3, "Care plan/request entered incorrectly"

    class DelType(models.IntegerChoices):
        NOT_DELETE = 0, "NOT_DELETE"
        DELETED = 1, "DELETED"

    reason = models.IntegerField(choices=DeleteReason.choices, default=1)
    is_delete = models.IntegerField(choices=DelType.choices, default=0)
    message = models.TextField(null=True, blank=True)
    match_date = models.DateTimeField(blank=True, null=True)

    history = HistoricalRecords()

    # def __str__(self):
        # return f"{self.request}"

    def save(self, *args, **kwargs):
        try:
            # Get original match from database if this is an update
            original_match = None
            if self.pk:
                try:
                    original_instance = ServiceRequested.objects.get(pk=self.pk)
                    original_match = original_instance.match
                except ServiceRequested.DoesNotExist:
                    pass
            
            # Only send email if match is set and has changed
            if self.match and self.match != original_match:
                email = self.match.email
                current_site = Site.objects.get_current()

                if Site.objects.filter(domain="qa2.app.duett.io"):
                    env_label = "QA2:"
                elif Site.objects.filter(domain="qa.app.duett.io"):
                    env_label = "QA:"
                elif Site.objects.filter(domain="staging.app.duett.io"):
                    env_label = "STG:"
                else:
                    env_label = ""

                id = self.request.id
                url = f"https://{current_site.domain}/request/{id}"
                send_time = timezone.now() + datetime.timedelta(minutes=settings.SEND_EMAIL_CLOSED_TIME)
                records = {
                            'email_title':'provider-match-email',
                            'send_time':send_time,
                            'parameter':{"service_id":self.id,"url":url,"email":email}
                        }
                email = self.match.email
                html_message = render_to_string(
                    "provider-match-email.html", {"request_url": url}
                )

                message = EmailMessage(
                    f"{env_label} Request Update: Matched",
                    html_message,
                    settings.DEFAULT_FROM_EMAIL,
                    [email],
                )
                message.content_subtype = "html"
                message.send()
                EmailData.objects.create(**records)
        except (AttributeError, ObjectDoesNotExist) as e:
            logger.warning("Email failed to send for ServiceRequested %s: %s", self.pk, e)

        super(ServiceRequested, self).save(*args, **kwargs)


    class Meta:
        verbose_name_plural = "Service Requests"


    def _request(self):
        first_name = self.request.patient.first_name
        last_name = self.request.patient.last_name
        first_name = first_name[0] if first_name else ''
        last_name = last_name[0:3] if last_name else ''
        return first_name+' '+last_name


class TableColumns(TimestampMixin):
    """
    This is a general purpose schema defining the columns
    that will be displayed in any table on the front-end.

    'sequence' is the order in which the fields will display.
    """

    name = models.CharField(max_length=100)
    sequence = models.IntegerField()

    # Types: provider or agency
    # If null, the column is for any user type
    role = models.IntegerField(
        choices=Account.Types.choices, blank=True, null=True
    )

    class TableName(models.IntegerChoices):
        """
        These correspond to the names of the tables
        where the information is displayed on the front-end.
        """

        PATIENT_REQUESTS = 1

    table_name = models.IntegerField(
        choices=TableName.choices, default=TableName.PATIENT_REQUESTS
    )

    # Example of sort_label: patient__last_name
    # if this is null, then the column cannot be sorted
    sort_label = models.CharField(max_length=255, blank=True, null=True)

    class ColumnTypes(models.IntegerChoices):
        DEFAULT = 1
        CUSTOM = 2

    column_type = models.IntegerField(
        choices=ColumnTypes.choices, default=ColumnTypes.DEFAULT
    )

    class Meta:
        verbose_name_plural = "Table Columns"

class ArchivedDeletePatientRequest(TimestampMixin):
    """
    This is for archived patient requests.
    """

    request = models.ForeignKey(
        PatientRequest, on_delete=models.DO_NOTHING, db_constraint=False)

    class AcrhivedReason(models.IntegerChoices):
        DECEASED = 1, "Client deceased."
        CIRCUMSTANCES = 2, "Client circumstances changed."
        NEW_AGENCY = 3, "Client has moved to new agency."
        OUTSIDE_OF_DUETT = 4, "Request fulfilled outside of Duett."
        OTHER = 5, "Other (tell us why)."
        INFO_INCORRECT = 6, "Client information entered incorrectly"
        REQUEST_INCORRECT = 7, "Care plan/request entered incorrectly"

    class AcrhivedDelType(models.IntegerChoices):
        ARCHIVED = 0, "ARCHIVED"
        DELETED = 1, "DELETED"

    reason = models.IntegerField(choices=AcrhivedReason.choices, default=1)
    is_type = models.IntegerField(choices=AcrhivedDelType.choices, default=0)
    message = models.TextField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.DO_NOTHING,
        db_constraint=False
    )


class EmailData(TimestampMixin):
    email_title = models.CharField(null=True, blank=True, max_length=300)
    send_time = models.DateTimeField(null=True, blank=True)
    status = models.IntegerField(choices=[(0,1)], default=0)
    parameter = models.JSONField(null=True, blank=True)


class PatientActivity(TimestampMixin):
    message = models.CharField(null=True, blank=True, max_length=300)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.DO_NOTHING,
        db_constraint=False
    )
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')





auditlog.register(Patient)
auditlog.register(PatientRequest)
auditlog.register(RequestNotes)
auditlog.register(ServiceRequested)
