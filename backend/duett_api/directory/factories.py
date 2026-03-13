import factory
from factory.django import DjangoModelFactory
from django.contrib.auth import get_user_model
from duett_api.users.factories import UserFactory

from duett_api.directory.models import (
    VendorDirectory,
    VendorCountyService,
    FavoriteVendor,
    VendorReview,
    VendorClaim,
    VendorClaimDocument,
)
from duett_api.services.models import County, ServiceType


class CountyFactory(DjangoModelFactory):
    class Meta:
        model = County
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: f"County {n}")


class ServiceTypeTestFactory(DjangoModelFactory):
    class Meta:
        model = ServiceType
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: f"Service {n}")


class VendorDirectoryFactory(DjangoModelFactory):
    class Meta:
        model = VendorDirectory

    legal_name = factory.Sequence(lambda n: f"Vendor Legal Name {n}")
    dba = factory.Sequence(lambda n: f"Vendor DBA {n}")
    vendor_type = "PSA"
    contact_person = factory.Faker("name")
    contact_phone = factory.Sequence(lambda n: f"555-{n:03d}-1234")
    email = factory.Faker("email")
    noa_email = factory.Faker("email")
    primary_county = "Los Angeles"
    owning_business_unit = "Unit A"
    languages = ["English", "Spanish"]
    verified = True
    availability = "Full Time"
    description = factory.Faker("text")


class VendorCountyServiceFactory(DjangoModelFactory):
    class Meta:
        model = VendorCountyService

    vendor = factory.SubFactory(VendorDirectoryFactory)
    county = factory.SubFactory(CountyFactory)
    service = factory.SubFactory(ServiceTypeTestFactory)


class FavoriteVendorFactory(DjangoModelFactory):
    class Meta:
        model = FavoriteVendor

    user = factory.LazyFunction(lambda: get_user_model().objects.first())
    vendor = factory.SubFactory(VendorDirectoryFactory)


class VendorReviewFactory(DjangoModelFactory):
    class Meta:
        model = VendorReview

    vendor = factory.SubFactory(VendorDirectoryFactory)
    user = factory.SubFactory(UserFactory)
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    stars = factory.fuzzy.FuzzyInteger(1, 5)
    description = factory.Faker("paragraph")


class VendorClaimFactory(DjangoModelFactory):
    class Meta:
        model = VendorClaim

    vendor = factory.SubFactory(VendorDirectoryFactory)
    user = factory.SubFactory(UserFactory)
    claimant_name = factory.Faker("name")
    claimant_email = factory.Faker("email")
    claimant_phone = factory.Sequence(lambda n: f"555-{n:03d}-9999")
    status = VendorClaim.Status.PENDING


class VendorClaimDocumentFactory(DjangoModelFactory):
    class Meta:
        model = VendorClaimDocument

    claim = factory.SubFactory(VendorClaimFactory)
    link = factory.Sequence(lambda n: f"https://example.com/documents/test_{n}.pdf")
    original_filename = "test.pdf"
    file_type = "pdf"
    file_size = 11
