from django.db.models import Q, Avg, Value, F, Case, When, BooleanField, CharField
from django.db.models.functions import MD5, Concat, Cast
from django_filters import rest_framework as filters

from .models import VendorDirectory
from duett_api.services.models import ZipCode


class VendorDirectoryFilter(filters.FilterSet):
    agency_name = filters.CharFilter(method="filter_agency_name")
    zip_code = filters.CharFilter(method="filter_zip_code")
    services = filters.BaseInFilter(method="filter_services")
    min_rating = filters.NumberFilter(method="filter_min_rating")
    languages = filters.BaseInFilter(method="filter_languages")
    funding_sources = filters.BaseInFilter(method="filter_funding_sources")
    search_pattern = filters.CharFilter(method="filter_search_pattern")

    class Meta:
        model = VendorDirectory
        fields = []

    def filter_agency_name(self, queryset, name, value):
        if not value or not value.strip():
            return queryset
        value = value.strip()
        return queryset.filter(Q(legal_name__icontains=value) | Q(dba__icontains=value))

    def filter_zip_code(self, queryset, name, value):
        if not value or not str(value).strip():
            return queryset
        value = str(value).strip()

        zip_obj = ZipCode.objects.filter(zip=value).first()
        if not zip_obj or not zip_obj.county:
            return queryset.none()

        return queryset.filter(county_services__county=zip_obj.county).distinct()

    def filter_services(self, queryset, name, value):
        if not value:
            return queryset

        # Handle both IDs (integers) and names (strings)
        service_ids = []
        service_names = []

        for v in value:
            if v:
                try:
                    # Try to convert to integer (ID)
                    service_ids.append(int(v))
                except (ValueError, TypeError):
                    # If not an integer, treat as name
                    service_names.append(str(v).strip())

        # Build query
        query = Q()
        if service_ids:
            query |= Q(county_services__service__id__in=service_ids)
        if service_names:
            # Match by name (case-insensitive contains)
            for name in service_names:
                query |= Q(county_services__service__name__icontains=name)

        if not query:
            return queryset

        return queryset.filter(query).distinct()

    def filter_min_rating(self, queryset, name, value):
        if value is None or value == "":
            return queryset

        try:
            min_rating = float(value)
        except (ValueError, TypeError):
            return queryset

        # Only calculate average from approved reviews
        from duett_api.directory.models import VendorReview

        return queryset.annotate(
            avg_rating=Avg(
                "reviews__stars", filter=Q(reviews__status=VendorReview.Status.APPROVED)
            )
        ).filter(avg_rating__gte=min_rating)

    def filter_languages(self, queryset, name, value):
        if not value:
            return queryset

        languages = [v.strip() for v in value if v and v.strip()]
        if not languages:
            return queryset

        language_query = Q()
        for lang in languages:
            language_query |= Q(languages__icontains=lang)

        return queryset.filter(language_query)

    def filter_funding_sources(self, queryset, name, value):
        if not value:
            return queryset

        # Handle both IDs (integers) and names (strings)
        funding_ids = []
        funding_names = []

        for v in value:
            if v:
                try:
                    # Try to convert to integer (ID)
                    funding_ids.append(int(v))
                except (ValueError, TypeError):
                    # If not an integer, treat as name
                    funding_names.append(str(v).strip())

        # Build query
        query = Q()
        if funding_ids:
            query |= Q(funding_sources__id__in=funding_ids)
        if funding_names:
            # Match by name (case-insensitive contains)
            for name in funding_names:
                query |= Q(funding_sources__name__icontains=name)

        if not query:
            return queryset

        return queryset.filter(query).distinct()

    def filter_search_pattern(self, queryset, name, value):
        if not value or not value.strip():
            return queryset

        queryset = queryset.annotate(
            random_order=MD5(
                Concat(
                    Cast(F("id"), CharField()),
                    Value("-"),
                    Value(value.strip()),
                )
            )
        )

        request = self.request
        if request and request.user.is_authenticated:
            queryset = queryset.annotate(
                is_favorite_priority=Case(
                    When(favorited_by__user=request.user, then=Value(True)),
                    default=Value(False),
                    output_field=BooleanField(),
                )
            )
            return queryset.order_by("-is_favorite_priority", "random_order")

        return queryset.order_by("random_order")
