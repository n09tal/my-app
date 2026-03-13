from duett_api.patients.models import PatientRequest
from django_filters import (
    BaseInFilter,
    FilterSet,
    NumberFilter,
    BooleanFilter,
    CharFilter,
)
from django.contrib.auth import get_user_model
from django.db.models import Count, F, Prefetch, Value, Q, Case, When, Value, CharField

from django.db.models import IntegerField
from django.db.models.functions import Cast

from django.db.models.functions import Concat
from rest_framework import filters

from duett_api.patients.models import PatientRequest, ServiceRequested
from duett_api.users.models import (
    ProviderProfile,
    Account,
)


class PatientFilterBackend(filters.BaseFilterBackend):
    def filter_queryset(self, request, queryset, view):
        account = request.user.account
        if account.type == Account.Types.Provider:
            # If they are a provider, filter by zip codes
            try:
                provider = ProviderProfile.objects.get(account=account)
                zip_codes = provider.zip_codes.values_list("zip", flat=True)
                queryset = queryset.filter(zip__in=zip_codes)
            except ProviderProfile.DoesNotExist:
                # If provider profile doesn't exist, return empty queryset
                return queryset.none()
        else:
            queryset = queryset.filter(created_by=account.agencyprofile)

        return queryset


class PatientRequestFilterBackend(filters.BaseFilterBackend):
    def filter_queryset(self, request, queryset, view):
        account = request.user.account
        if account.type == Account.Types.Provider:
            # If they are a provider, filter by zip codes and service types
            try:
                provider = request.user.account.providerprofile
            except ProviderProfile.DoesNotExist:
                # If provider profile doesn't exist, return empty queryset
                return queryset.none()
            
            zip_codes = provider.zip_codes.values_list("zip", flat=True)
            services = provider.services.values_list("name", flat=True)
            funding_sources = provider.funding_sources.values_list(
                "name", flat=True
            )
            # as provider can only see the not archived
            queryset = queryset.filter(is_archived=PatientRequest.Archived.NOT_ARCHIVED)
            queryset = queryset.filter(
                patient__zip__in=zip_codes,
                servicerequested__service__name__in=services,
                servicerequested__funding_source__name__in=funding_sources,
            )

            # Exclude Closed PatientRequests if the Provider does not have
            # any matches
            queryset = queryset.annotate(
                num_services=Count("servicerequested"),
                num_closed=Count(
                    "servicerequested",
                    Q(
                        servicerequested__status=(
                            ServiceRequested.Statuses.CLOSED
                        )
                    ),
                ),
                num_match=Count(
                    "servicerequested",
                    Q(
                        servicerequested__match=provider
                    ),
                ),
            )
            queryset = queryset.exclude(
                Q(num_closed=F("num_services")) & Q(num_match__lt=1)
            )
            status = request.query_params.get("status_in")
            
            if not status:
                queryset = queryset.prefetch_related(
                    Prefetch(
                        "servicerequested_set",
                        queryset=ServiceRequested.objects.filter(
                            ~Q(status=PatientRequest.Statuses.CLOSED) | Q(match=provider),
                            service__name__in=services,
                            funding_source__name__in=funding_sources,
                        )
                        .exclude(declines__in=[provider])
                        .distinct(),
                    )
                )
        else:
            if view.action == "list":
                group = request.user.groups.first()
                show_caa_cases = request.query_params.get('show_caa_cases', False)
                if group.name == "Care Agency Admin":
                    if show_caa_cases == 'true':
                        queryset = queryset.filter(assigned_to=request.user)
                    else:
                        queryset = queryset.filter(
                            patient__created_by=account.agencyprofile
                        )
                elif group.name == "Care Manager Supervisor":
                    # if they are a supervisor, they can see patients that any
                    # subordinate creates
                    users = get_user_model().objects.filter(
                        managed_user__supervisor=request.user
                    )
                    queryset = queryset.filter(
                        Q(assigned_to=request.user) | Q(assigned_to__in=users)
                    )
                else:
                    # If they don't match anything above,
                    # they must be a care manager
                    queryset = queryset.filter(assigned_to=request.user)
            else:
                # CMS1 had access to CMS2 request of same agency
                # in case of view all request detail page
                queryset = queryset.filter(
                    Q(patient__created_by=account.agencyprofile)| Q(assigned_to__account__agencyprofile=account.agencyprofile)
                )

        return queryset


class PatientRequestSearchFilter(filters.SearchFilter):
    def get_search_fields(self, view, request):
        if request.user.account.type == Account.Types.Provider:
            return [
                "created_by__userprofile__first_name",
                "created_by__userprofile__last_name",
                "patient__zip",
            ]
        else:
            return [
                "patient__first_name",
                "patient__last_name",
                "patient__zip",
            ]

class PatientRequestOrderingFilter(filters.OrderingFilter):
    def filter_queryset(self, request, queryset, view):
        ordering = self.get_ordering(request, queryset, view)

        if "status" in ordering or "-status" in ordering:
            queryset, ordering = self.get_status_order(queryset, ordering)
        
        if "patient__zip" in ordering or "-patient__zip" in ordering:
            queryset, ordering = self.get_zip_order(queryset, ordering)            

        if ordering:
            return queryset.order_by(*ordering)

        return queryset
    
    def get_status_order(self, queryset, ordering):
        # removed the sorting from status field to support storing on  zip, and name
        return queryset, ordering

    def get_zip_order(self, queryset, ordering):
        if "patient__zip" in ordering:
            queryset = queryset.order_by( 'patient__zip')
            ordering.remove('patient__zip')
        elif "-patient__zip" in ordering:
            queryset = queryset.order_by('-patient__zip')
            ordering.remove('-patient__zip')
        return queryset, ordering


class RequestNotesFilterBackend(filters.BaseFilterBackend):
    def filter_queryset(self, request, queryset, view):
        return queryset.filter(request=view.kwargs["request_pk"], account=request.user.account)


class NumberInFilter(BaseInFilter, NumberFilter):
    pass


class PatientRequestFilterSet(FilterSet):
    status_in = NumberInFilter(method="get_status_in")
    show_hidden = BooleanFilter(method="get_hidden")
    search = CharFilter(method="get_search")

    class Meta:
        model = PatientRequest
        fields = [
            "show_hidden",
            "status_in",
            "equipment",
            "smoking",
            "pets",
            "request_prior_authorization",
            "transportation_required",
            "is_archived",
        ]

    def get_search(self, queryset, name, value):
        filters = Q()
        if self.request.user.account.type == Account.Types.Provider:
            queryset = queryset.annotate(
                fullname=Concat(
                    "assigned_to__userprofile__first_name",
                    Value(" "),
                    "assigned_to__userprofile__last_name",
                )
            )
            filters |= Q(fullname__icontains=value)

            statuses = [
                {"name": "NEW", "value": ServiceRequested.Statuses.OPEN},
                {
                    "name": "SUBMITTED",
                    "value": ServiceRequested.Statuses.PENDING,
                },
                {"name": "MATCHED", "value": ServiceRequested.Statuses.CLOSED},
            ]
            filters |= Q(
                servicerequested__status__in=[
                    status["value"]
                    for status in statuses
                    if value.upper() in status["name"]
                ]
            )
        else:
            queryset = queryset.annotate(
                fullname=Concat(
                    "patient__first_name", Value(" "), "patient__last_name"
                )
            )
            filters |= Q(fullname__icontains=value)

            statuses = [
                {"name": "OPEN", "value": PatientRequest.Statuses.OPEN},
                {
                    "name": "SUBMISSIONS RECEIVED",
                    "value": PatientRequest.Statuses.PENDING,
                },
                {"name": "MATCHED", "value": PatientRequest.Statuses.CLOSED},
                {"name": "PARTIALLY MATCHED", "value": PatientRequest.Statuses.PARTIALLY_MATCHED},
            ]
            filters |= Q(
                status__in=[
                    status["value"]
                    for status in statuses
                    if value.upper() in status["name"]
                ]
            )

        if value.isdigit():
            value = int(value)
            queryset = queryset.filter(
                Q(pk__exact=value)
                | Q(patient__zip__exact=value)
                | Q(servicerequested__hours__exact=value)
                | filters
            )
        else:
            frequencies = [
                {"name": "WEEK", "value": 1},
                {"name": "MONTH", "value": 2},
            ]
            filters |= Q(
                servicerequested__frequency__in=[
                    fre["value"]
                    for fre in frequencies
                    if value.upper() in fre["name"]
                ]
            )
            queryset = queryset.filter(
                Q(servicerequested__funding_source__name__icontains=value)
                | Q(servicerequested__service__name__icontains=value)
                | filters
            )

        return queryset.distinct()

    def get_status_in(self, queryset, name, value):
        statuses = list(map(lambda s: int(s), value))

        if self.request.user.account.type == Account.Types.Provider:
            queryset = self._create_provider_status_in_queryset(
                queryset, statuses
            )
        else:
            if PatientRequest.Statuses.CLOSED in statuses:
                queryset = queryset.filter(Q(status__in=statuses) | Q(is_archived=PatientRequest.Archived.ARCHIVED))
            else:
                queryset = queryset.filter(status__in=statuses)

        return queryset.distinct()

    def get_hidden(self, queryset, name, value):
        if (
            self.request.user.account.type == Account.Types.Provider
            and not value
        ):
            try:
                provider = self.request.user.account.providerprofile
                queryset = queryset.exclude(hides=provider)
            except ProviderProfile.DoesNotExist:
                pass

        if (
            self.request.user.account.type == Account.Types.Provider
            and value
        ):
            try:
                provider = self.request.user.account.providerprofile
                queryset = queryset.filter(hides=provider)
            except ProviderProfile.DoesNotExist:
                return queryset.none()
        return queryset

    def _create_provider_status_in_queryset(self, queryset, statuses):
        """
        Filter PatientRequests and related ServiceRequests based on statuses
        """
        try:
            provider = self.request.user.account.providerprofile
        except ProviderProfile.DoesNotExist:
            # If provider profile doesn't exist, return empty queryset
            return queryset.none()
        # 1 = open = new care requests for care providers
        # 2 = pending = submitted care requests for care providers
        # 3 = closed = matched care requests for care providers

        request_filters = Q()
        service_filters = Q()

        # Show PatientRequests the Provider is eligible for: Open and Pending
        if ServiceRequested.Statuses.OPEN in statuses:
            request_filters |= Q(servicerequested__status__in=[1, 2])
            service_filters |= ~Q(interests=provider) & ~Q(status=3)

        # Show PatientRequests the Provider has shown interest in.
        # Note, this always will be a subset of OPEN.
        if ServiceRequested.Statuses.PENDING in statuses:
            service_filters |= Q(interests=provider) & Q(
                status__in=[1, 2]
            )
            request_filters |= Q(servicerequested__interests=provider) & Q(
                servicerequested__status__in=[1, 2]
            )

        # Show the Provider's matched PatientRequests
        if ServiceRequested.Statuses.CLOSED in statuses:
            request_filters |= (
                Q(servicerequested__status=3)
                & Q(servicerequested__match=provider)
                & Q(servicerequested__interests=provider)
            )
            service_filters |= Q(interests=provider) & Q(match=provider)

        # Provider can only see the services requested that they are
        # authorized to see (based off of service type and funding source)
        services = provider.services.values_list("name", flat=True)
        funding_sources = provider.funding_sources.values_list(
            "name", flat=True
        )

        return queryset.filter(request_filters).prefetch_related(
            Prefetch(
                "servicerequested_set",
                queryset=ServiceRequested.objects.filter(
                    service_filters,
                    service__name__in=services,
                    funding_source__name__in=funding_sources,
                )
                .exclude(declines__in=[provider])
                .distinct(),
            )
        )
