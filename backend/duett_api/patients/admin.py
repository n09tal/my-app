from admin_auto_filters.filters import AutocompleteFilter
from django.contrib import admin
from django.contrib import messages
import random

from django.contrib.sites.models import Site
from django.template.loader import render_to_string
from django.core.mail.message import EmailMessage
from django.conf import settings
from django.contrib import messages

from .models import (
    Patient,
    PatientRequest,
    RequestNotes,
    ServiceRequested,
    TableColumns, ArchivedDeletePatientRequest
)

from duett_api.utils.admin import SimpleHistoryMixin, SimpleHistoryShowDeletedFilter









@admin.register(Patient)
class PatientAdmin(SimpleHistoryMixin):
    list_display = ("id", "_first_name", "_last_name", "_email", "state", "zip")
    search_fields = ("first_name", "last_name", "email", "zip")
    list_filter = [SimpleHistoryShowDeletedFilter]
    edit_exclude = ("first_name", "last_name", "email", "address", "birth_date",)

    def change_view(self, *args, **kwargs):
        self.exclude = getattr(self, 'edit_exclude', ())
        return super(PatientAdmin, self).change_view(*args, **kwargs)

    def _email(self, obj):
        try:
            return obj._email()
        except AttributeError as e:
            if obj.email:
                email = list(obj.email)
                random.shuffle(email)
                return ''.join(email)

    def _first_name(self, obj):
        try:
            return obj._first_name()
        except AttributeError as e:
            return obj.first_name[0] if obj.first_name else ''

    def _last_name(self, obj):
        try:
            return obj._last_name()
        except AttributeError as e:
            return obj.last_name[0:3] if obj.last_name else ''


class ServiceRequestedInline(admin.TabularInline):
    model = ServiceRequested
    extra = 0


class CareManagerFilter(AutocompleteFilter):
    title = 'Care manager'  # display title
    field_name = 'created_by'  # name of the foreign key field


@admin.register(PatientRequest)
class PatientRequestAdmin(SimpleHistoryMixin):

    inlines = (ServiceRequestedInline,)
    list_display = ("id", "_patient", "status", "_created_by", "_assigned_to")
    search_fields = ("id","patient__first_name",
                     "patient__last_name", "patient__zip", "patient__city")
    # edit_exclude = ("patient", "created_by")
    readonly_fields = ["_initial_created_time", "_refreshed_time"]

    def _patient(self, obj):
        try:
            return obj._patient()
        except AttributeError as e:
            first_name = obj.patient.first_name[0] if obj.patient.first_name else ''
            last_name = obj.patient.last_name[0:3] if obj.patient.last_name else ''
            return first_name + ' ' + last_name

    def _created_by(self, obj):
        try:
            return obj._created_by()
        except AttributeError as e:
            created_by = list(obj.created_by.email)
            random.shuffle(created_by)
            return ''.join(created_by)

    def _assigned_to(self, obj):
        try:
            return obj._assigned_to()
        except AttributeError as e:
            assigned_to = list(obj.assigned_to.email)
            random.shuffle(assigned_to)
            return ''.join(assigned_to)

    def _refreshed_time(self, obj):
        try:
            return obj.refreshed_time.strftime('%Y-%m-%d %H:%M:%S')
        except AttributeError as e:
            return ""

    def _initial_created_time(self, obj):
        try:
            return obj.initial_created_time.strftime('%Y-%m-%d %H:%M:%S')
        except AttributeError as e:
            return ""


    list_filter = (
        "pets",
        "smoking",
        "equipment",
        "transportation_required",
        "request_prior_authorization",
        "is_archived",
        SimpleHistoryShowDeletedFilter,
        CareManagerFilter
    )

    def change_view(self, *args, **kwargs):
        self.exclude = getattr(self, 'edit_exclude', ())
        return super(PatientRequestAdmin, self).change_view(*args, **kwargs)


@admin.register(RequestNotes)
class RequestNotesAdmin(admin.ModelAdmin):
    list_display = ("_request", "body", "_author")

    def change_view(self, request, object_id, extra_context=None):
       self.exclude = ("author",)
       return super(RequestNotesAdmin, self).change_view(request, object_id, extra_context)


@admin.register(ServiceRequested)
class ServiceRequestedAdmin(SimpleHistoryMixin):
    list_display = ("id", "_request", "hours", "frequency", "status")
    list_filter = [SimpleHistoryShowDeletedFilter]


@admin.register(TableColumns)
class TableColumnsAdmin(admin.ModelAdmin):
    list_display = ("id", "sequence", "name", "role")


@admin.register(ArchivedDeletePatientRequest)
class ArchivedDeletePatientRequestAdmin(SimpleHistoryMixin):
    list_display = ("id", "request_id", "reason", "is_type", "message")




from auditlog.admin import LogEntryAdmin
from auditlog.filters import ResourceTypeFilter
from auditlog.models import LogEntry

class AuditLogEntryAdmin(LogEntryAdmin):
    list_display = ['created', 'resource_url', 'action', 'msg_short', 'user_url']
    search_fields = ['timestamp', 'object_repr', 'changes']
    list_filter = ['action', ResourceTypeFilter]
    readonly_fields = ['created', 'resource_url', 'action', 'user_url', 'msg']
    fieldsets = [
        (None, {'fields': ['created', 'user_url', 'resource_url']}),
        ('Changes', {'fields': ['action', 'msg']}),
    ]

admin.site.unregister(LogEntry)
admin.site.register(LogEntry, AuditLogEntryAdmin)




