from rest_framework import serializers

from .models import (
    VendorDirectory,
    VendorCountyService,
    FavoriteVendor,
    VendorReview,
    VendorClaim,
    VendorClaimDocument,
    PrivatePayCareRequest,
)
from duett_api.services.models import County, ServiceType, FundingSource


class ServiceTypeSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceType
        fields = ("id", "name")


class CountySimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = County
        fields = ("id", "name")


class FundingSourceSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = FundingSource
        fields = ("id", "name")


class VendorDirectoryListSerializer(serializers.ModelSerializer):
    display_name = serializers.ReadOnlyField()
    is_favorite = serializers.SerializerMethodField()
    counties = serializers.SerializerMethodField()
    services = serializers.SerializerMethodField()
    funding_sources = serializers.SerializerMethodField()
    website = serializers.CharField(read_only=True)
    rating = serializers.SerializerMethodField()
    reviews = serializers.SerializerMethodField()
    contact_email = serializers.CharField(source="email", read_only=True)

    class Meta:
        model = VendorDirectory
        fields = (
            "id",
            "legal_name",
            "dba",
            "display_name",
            "vendor_type",
            "primary_county",
            "contact_phone",
            "contact_email",
            "verified",
            "availability",
            "description",
            "languages",
            "image",
            "website",
            "is_favorite",
            "counties",
            "services",
            "claim_status",
            "claimed_by",
            "rating",
            "funding_sources",
            "rating",
            "reviews",
        )

    def get_is_favorite(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.favorited_by.filter(user=request.user).exists()
        return False

    def get_counties(self, obj):
        county_ids = obj.county_services.values_list("county_id", flat=True).distinct()
        counties = County.objects.filter(id__in=county_ids)
        return CountySimpleSerializer(counties, many=True).data

    def get_services(self, obj):
        service_ids = obj.county_services.values_list(
            "service_id", flat=True
        ).distinct()
        services = ServiceType.objects.filter(id__in=service_ids)
        return ServiceTypeSimpleSerializer(services, many=True).data

    def get_funding_sources(self, obj):
        return FundingSourceSimpleSerializer(obj.funding_sources.all(), many=True).data

    def get_rating(self, obj):
        # Only calculate rating from approved reviews
        reviews = obj.reviews.filter(status=VendorReview.Status.APPROVED)
        if reviews.exists():
            total = sum(r.stars for r in reviews)
            return round(total / reviews.count(), 1)
        return None

    def get_reviews(self, obj):
        # Only count approved reviews
        return obj.reviews.filter(status=VendorReview.Status.APPROVED).count()


class VendorCountyServiceSerializer(serializers.ModelSerializer):
    county_name = serializers.CharField(source="county.name", read_only=True)
    service_name = serializers.CharField(source="service.name", read_only=True)

    class Meta:
        model = VendorCountyService
        fields = ("id", "county", "county_name", "service", "service_name")


class VendorDirectoryDetailSerializer(VendorDirectoryListSerializer):
    county_services = VendorCountyServiceSerializer(many=True, read_only=True)

    class Meta(VendorDirectoryListSerializer.Meta):
        fields = VendorDirectoryListSerializer.Meta.fields + (
            "email",
            "noa_email",
            "contact_person",
            "owning_business_unit",
            "county_services",
            "created_at",
            "updated_at",
        )


class FavoriteVendorSerializer(serializers.ModelSerializer):
    vendor = VendorDirectoryListSerializer(read_only=True)
    vendor_id = serializers.PrimaryKeyRelatedField(
        queryset=VendorDirectory.objects.all(), source="vendor", write_only=True
    )

    class Meta:
        model = FavoriteVendor
        fields = ("id", "vendor", "vendor_id", "created_at")
        read_only_fields = ("id", "created_at")

    def create(self, validated_data):
        user = self.context["request"].user
        vendor = validated_data["vendor"]
        favorite, created = FavoriteVendor.objects.get_or_create(
            user=user, vendor=vendor
        )
        return favorite


class VendorReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorReview
        fields = (
            "id",
            "vendor",
            "user",
            "first_name",
            "last_name",
            "stars",
            "description",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "vendor",
            "user",
            "first_name",
            "last_name",
            "status",
            "created_at",
            "updated_at",
        )

    def validate_description(self, value):
        """Validate that description does not exceed 500 characters."""
        if len(value) > 500:
            raise serializers.ValidationError(
                "Too many characters. Maximum 500 characters allowed."
            )
        return value

    def validate(self, attrs):
        request = self.context["request"]
        vendor_id = self.context["view"].kwargs.get("vendor_pk")

        if self.instance is None:
            if VendorReview.objects.filter(
                user=request.user, vendor_id=vendor_id
            ).exists():
                raise serializers.ValidationError(
                    "You have already reviewed this vendor."
                )
        return attrs

    def _get_user_name_fields(self, user):
        """Extract first_name and last_name from user's profile."""
        try:
            user_profile = user.userprofile
            return {
                "first_name": user_profile.first_name,
                "last_name": user_profile.last_name,
            }
        except AttributeError:
            return {
                "first_name": "",
                "last_name": "",
            }

    def create(self, validated_data):
        user = self.context["request"].user
        validated_data["user"] = user
        validated_data["vendor_id"] = self.context["view"].kwargs["vendor_pk"]
        name_fields = self._get_user_name_fields(user)
        validated_data.update(name_fields)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        user = self.context["request"].user
        name_fields = self._get_user_name_fields(user)
        validated_data.update(name_fields)
        validated_data["status"] = VendorReview.Status.PENDING
        return super().update(instance, validated_data)

    def to_representation(self, instance):
        """Return initials in first_name and last_name fields for privacy.
        Currently shows initials. A user preference setting could be added to show
        full names. Then extend the logic to return the full name if the user
        preference is set.
        """
        data = super().to_representation(instance)

        if instance.first_name:
            data["first_name"] = instance.first_name[0].upper() + "."
        else:
            data["first_name"] = ""

        if instance.last_name:
            data["last_name"] = instance.last_name[0].upper() + "."
        else:
            data["last_name"] = ""

        return data


class VendorClaimDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorClaimDocument
        fields = (
            "id",
            "link",
            "original_filename",
            "file_type",
            "file_size",
            "created_at",
        )
        read_only_fields = (
            "id",
            "link",
            "original_filename",
            "file_type",
            "file_size",
            "created_at",
        )


class VendorClaimSerializer(serializers.ModelSerializer):
    documents = VendorClaimDocumentSerializer(many=True, read_only=True)

    class Meta:
        model = VendorClaim
        fields = (
            "id",
            "vendor",
            "claimant_name",
            "claimant_email",
            "claimant_phone",
            "status",
            "documents",
            "created_at",
        )
        read_only_fields = ("id", "vendor", "status", "documents", "created_at")


class VendorClaimSubmitSerializer(serializers.Serializer):
    claimant_name = serializers.CharField(max_length=255)
    claimant_email = serializers.EmailField()
    claimant_phone = serializers.CharField(max_length=20)
    documents = serializers.ListField(
        child=serializers.FileField(),
        min_length=1,
        max_length=5,
    )

    def validate_documents(self, value):
        max_file_size = 10 * 1024 * 1024
        allowed_types = VendorClaimDocument.ALLOWED_FILE_TYPES

        for doc in value:
            if doc.size > max_file_size:
                raise serializers.ValidationError(
                    f"File {doc.name} exceeds maximum size of 10MB."
                )
            ext = doc.name.rsplit(".", 1)[-1].lower() if "." in doc.name else ""
            if ext not in allowed_types:
                allowed = ", ".join(allowed_types)
                raise serializers.ValidationError(
                    f"File {doc.name} has invalid type. Allowed: {allowed}"
                )
        return value


class VendorClaimResponseSerializer(serializers.ModelSerializer):
    message = serializers.SerializerMethodField()

    class Meta:
        model = VendorClaim
        fields = ("id", "vendor", "status", "message", "created_at")
        read_only_fields = ("id", "vendor", "status", "message", "created_at")

    def get_message(self, obj):
        return "Your claim has been submitted and is pending review."


class VendorDirectoryUpdateSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(source="dba", required=False)
    contact_email = serializers.EmailField(source="email", required=False)

    services = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )
    funding_sources = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )
    counties = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )

    class Meta:
        model = VendorDirectory
        fields = (
            "display_name",
            "availability",
            "primary_county",
            "description",
            "contact_phone",
            "contact_email",
            "languages",
            "services",
            "counties",
            "funding_sources",
            "website",
            "image",
        )

    def validate_services(self, value):
        if value:
            existing_ids = set(
                ServiceType.objects.filter(id__in=value).values_list("id", flat=True)
            )
            invalid_ids = set(value) - existing_ids
            if invalid_ids:
                raise serializers.ValidationError(
                    f"Invalid service IDs: {list(invalid_ids)}"
                )
        return value

    def validate_funding_sources(self, value):
        if value:
            existing_ids = set(
                FundingSource.objects.filter(id__in=value).values_list("id", flat=True)
            )
            invalid_ids = set(value) - existing_ids
            if invalid_ids:
                raise serializers.ValidationError(
                    f"Invalid funding source IDs: {list(invalid_ids)}"
                )
        return value

    def validate_counties(self, value):
        if value:
            existing_ids = set(
                County.objects.filter(id__in=value).values_list("id", flat=True)
            )
            invalid_ids = set(value) - existing_ids
            if invalid_ids:
                raise serializers.ValidationError(
                    f"Invalid county IDs: {list(invalid_ids)}"
                )
        return value

    def update(self, instance, validated_data):
        services_ids = validated_data.pop("services", None)
        county_ids = validated_data.pop("counties", None)  # add this
        funding_source_ids = validated_data.pop("funding_sources", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if funding_source_ids is not None:
            funding_sources = FundingSource.objects.filter(id__in=funding_source_ids)
            instance.funding_sources.set(funding_sources)

        if county_ids is not None or services_ids is not None:
            if county_ids is not None:
                counties = County.objects.filter(id__in=county_ids)
            else:
                counties = County.objects.filter(
                    id__in=instance.county_services.values_list(
                        "county_id", flat=True
                    ).distinct()
                )

            if services_ids is not None:
                services = ServiceType.objects.filter(id__in=services_ids)
            else:
                services = ServiceType.objects.filter(
                    id__in=instance.county_services.values_list(
                        "service_id", flat=True
                    ).distinct()
                )

            VendorCountyService.objects.filter(vendor=instance).delete()
            for county in counties:
                for service in services:
                    VendorCountyService.objects.create(
                        vendor=instance, county=county, service=service
                    )

        return instance

    def to_representation(self, instance):
        return VendorDirectoryListSerializer(instance, context=self.context).data


class PrivatePayNotifiedVendorSerializer(serializers.ModelSerializer):
    vendor_id = serializers.IntegerField(source="id", read_only=True)
    vendor_name = serializers.CharField(source="display_name", read_only=True)
    vendor_county = serializers.CharField(source="primary_county", read_only=True)
    vendor_image = serializers.CharField(source="image", read_only=True)
    vendor_rating = serializers.SerializerMethodField()
    notified_at = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = VendorDirectory
        fields = (
            "vendor_id",
            "vendor_name",
            "vendor_county",
            "vendor_image",
            "vendor_rating",
            "notified_at",
        )

    def get_vendor_rating(self, obj):
        reviews = obj.reviews.filter(status=VendorReview.Status.APPROVED)
        if reviews.exists():
            total = sum(r.stars for r in reviews)
            return round(total / reviews.count(), 1)
        return 0.0


class PrivatePayCareRequestSerializer(serializers.ModelSerializer):
    notified_vendors = PrivatePayNotifiedVendorSerializer(many=True, read_only=True)
    selected_vendor = PrivatePayNotifiedVendorSerializer(read_only=True)

    class Meta:
        model = PrivatePayCareRequest
        fields = (
            "id",
            "client_name",
            "services",
            "status",
            "source",
            "is_urgent",
            "needs_assistance",
            "is_private_pay",
            "notes",
            "notified_vendors",
            "selected_vendor",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "status",
            "is_private_pay",
            "notified_vendors",
            "selected_vendor",
            "created_at",
            "updated_at",
        )

    def validate_client_name(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Client name is required.")
        return value

    def validate_services(self, value):
        if not isinstance(value, list) or len(value) == 0:
            raise serializers.ValidationError("Please select at least one service.")

        cleaned = []
        for service in value:
            text = str(service).strip()
            if text:
                cleaned.append(text)

        if not cleaned:
            raise serializers.ValidationError("Please select at least one service.")

        return cleaned

    def create(self, validated_data):
        request = self.context["request"]
        return PrivatePayCareRequest.objects.create(
            created_by=request.user,
            is_private_pay=True,
            **validated_data,
        )
