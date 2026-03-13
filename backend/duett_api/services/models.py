from django.db import models

from duett_api.utils.models import TimestampMixin


class ServiceType(TimestampMixin):
    immediate_notification = models.BooleanField(default=False)
    name = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.name}"


class FundingSource(TimestampMixin):
    name = models.CharField(max_length=100)
    service_type = models.ManyToManyField(ServiceType, blank=True)

    def __str__(self):
        return f"{self.name}"


class ZipCode(TimestampMixin):
    """
    This is for many to many relationships with Providers
    """

    zip = models.CharField(max_length=5)
    county = models.ForeignKey(
        "County",
        on_delete=models.CASCADE,
        related_name="zip_codes",
        null=True,
        blank=True,
    )
    is_serviceable = models.BooleanField(
        default=True, help_text="Indicates if this zip code is in Duett's service area"
    )

    def __str__(self):
        return f"{self.zip}"


class County(TimestampMixin):
    """
    This Model representing a county, with a one-to-many relationship to zip codes.
    """

    name = models.CharField(max_length=255)

    class Meta:
        ordering = ["name"]
        verbose_name = "County"
        verbose_name_plural = "Counties"

    def __str__(self):
        return self.name

    @property
    def zip(self):
        return ZipCode.objects.filter(county=self)
