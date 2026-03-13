from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator

from duett_api.utils.models import TimestampMixin


class VendorDirectory(TimestampMixin):
    class VendorType(models.TextChoices):
        PSA = "PSA", "Person Services Agency"
        NON = "NON", "Non-Agency Provider (Individual Provider)"
        OTHER = "OTHER", "Other"

    class ClaimStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        CLAIMED = "claimed", "Claimed"

    legal_name = models.CharField(max_length=255)
    dba = models.CharField(max_length=255, blank=True)
    vendor_type = models.CharField(max_length=100, blank=True)
    contact_person = models.CharField(max_length=255, blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    noa_email = models.EmailField(blank=True)
    primary_county = models.CharField(max_length=100, blank=True)
    owning_business_unit = models.CharField(max_length=200, blank=True)
    county_service_map_raw = models.TextField(blank=True)
    languages = models.JSONField(default=list, blank=True)
    verified = models.BooleanField(default=False)
    availability = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    image = models.TextField(blank=True)
    website = models.URLField(blank=True)
    funding_sources = models.ManyToManyField(
        "services.FundingSource", related_name="directory_vendors", blank=True
    )
    claim_status = models.CharField(
        max_length=10,
        choices=ClaimStatus.choices,
        null=True,
        blank=True,
    )
    claimed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="claimed_vendors",
    )
    claimed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Vendor Directory Entry"
        verbose_name_plural = "Vendor Directory Entries"
        ordering = ["legal_name"]

    def __str__(self):
        return self.dba or self.legal_name

    @property
    def display_name(self):
        return self.dba if self.dba else self.legal_name


class VendorCountyService(TimestampMixin):
    vendor = models.ForeignKey(
        VendorDirectory, on_delete=models.CASCADE, related_name="county_services"
    )
    county = models.ForeignKey(
        "services.County", on_delete=models.CASCADE, related_name="vendor_services"
    )
    service = models.ForeignKey(
        "services.ServiceType", on_delete=models.CASCADE, related_name="vendor_counties"
    )

    class Meta:
        verbose_name = "Vendor County Service"
        verbose_name_plural = "Vendor County Services"
        unique_together = ("vendor", "county", "service")

    def __str__(self):
        return f"{self.vendor} - {self.county} - {self.service}"


class FavoriteVendor(TimestampMixin):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="favorite_vendors",
    )
    vendor = models.ForeignKey(
        VendorDirectory, on_delete=models.CASCADE, related_name="favorited_by"
    )

    class Meta:
        verbose_name = "Favorite Vendor"
        verbose_name_plural = "Favorite Vendors"
        unique_together = ("user", "vendor")

    def __str__(self):
        return f"{self.user} - {self.vendor}"


class VendorReview(TimestampMixin):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    vendor = models.ForeignKey(
        VendorDirectory,
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="vendor_reviews",
    )
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    stars = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    description = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    class Meta:
        verbose_name = "Vendor Review"
        verbose_name_plural = "Vendor Reviews"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.vendor} - {self.stars}* by {self.first_name} {self.last_name}"


class VendorClaim(TimestampMixin):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    vendor = models.ForeignKey(
        VendorDirectory,
        on_delete=models.CASCADE,
        related_name="claims",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="vendor_claims",
    )
    claimant_name = models.CharField(max_length=255)
    claimant_email = models.EmailField()
    claimant_phone = models.CharField(max_length=20)
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
    )
    admin_notes = models.TextField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_claims",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Vendor Claim"
        verbose_name_plural = "Vendor Claims"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.vendor} - {self.claimant_name} ({self.status})"


class VendorClaimDocument(TimestampMixin):
    ALLOWED_FILE_TYPES = ["pdf", "jpg", "jpeg", "png", "gif", "bmp"]

    claim = models.ForeignKey(
        VendorClaim,
        on_delete=models.CASCADE,
        related_name="documents",
    )
    link = models.CharField(max_length=500)
    original_filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=10)
    file_size = models.IntegerField()

    class Meta:
        verbose_name = "Vendor Claim Document"
        verbose_name_plural = "Vendor Claim Documents"
        ordering = ["-created_at"]

    def __str__(self):
        return self.original_filename


class PrivatePayCareRequest(TimestampMixin):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        OPEN = "open", "Open"
        CLOSED = "closed", "Closed"
        URGENT = "urgent", "Urgent"
        NEEDS_ASSISTANCE = "needs_assistance", "Needs Assistance"

    class Source(models.TextChoices):
        CONSUMER = "consumer", "Consumer"
        SOCIAL_WORKER = "social_worker", "Social Worker"

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="private_pay_care_requests",
    )
    client_name = models.CharField(max_length=255)
    services = models.JSONField(default=list)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
    )
    source = models.CharField(
        max_length=20,
        choices=Source.choices,
        default=Source.CONSUMER,
    )
    is_urgent = models.BooleanField(default=False)
    needs_assistance = models.BooleanField(default=False)
    is_private_pay = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    notified_vendors = models.ManyToManyField(
        VendorDirectory,
        blank=True,
        related_name="notified_private_pay_requests",
    )
    selected_vendor = models.ForeignKey(
        VendorDirectory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="selected_private_pay_requests",
    )

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if self.needs_assistance:
            self.status = self.Status.NEEDS_ASSISTANCE
        elif self.is_urgent:
            self.status = self.Status.URGENT
        elif self.status in [self.Status.URGENT, self.Status.NEEDS_ASSISTANCE]:
            self.status = self.Status.OPEN
        super().save(*args, **kwargs)
