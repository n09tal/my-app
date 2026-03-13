# from duett_api.patients.factories import PatientFactory
# from duett_api.services.factories import ZipCodeFactory
import factory
import factory.fuzzy
from django.contrib.auth import get_user_model
import django.contrib.auth.models as auth_models
from factory.django import DjangoModelFactory

from duett_api.users.models import Account, AgencyProfile, ProviderProfile, UserProfile


class AccountFactory(DjangoModelFactory):
    class Meta:
        model = Account

    name = factory.Faker("company")


class AgencyFactory(DjangoModelFactory):
    class Meta:
        model = AgencyProfile

    account = factory.SubFactory(AccountFactory, type=2)


class ProviderFactory(DjangoModelFactory):
    class Meta:
        model = ProviderProfile
        django_get_or_create = ("account",)

    account = factory.SubFactory(AccountFactory, type=1)
    email = factory.Faker("email")


class UserProfileFactory(DjangoModelFactory):
    class Meta:
        model = UserProfile
        django_get_or_create = ("user",)

    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    factory.fuzzy.FuzzyInteger(1111111111, 9999999999)


class UserFactory(DjangoModelFactory):
    class Meta:
        model = get_user_model()

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    is_staff = False
    is_active = True
    userprofile = factory.RelatedFactory(
        UserProfileFactory, factory_related_name="user"
    )
    account = factory.SubFactory(AccountFactory, type=1)


class AgencyProfileFactory(DjangoModelFactory):
    class Meta:
        model = AgencyProfile

    account = factory.SubFactory(AccountFactory, type=2)


class AgencyAdminFactory(UserFactory):
    pass


class GroupFactory(DjangoModelFactory):
    class Meta:
        model = auth_models.Group
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "Group #%s" % n)


class CareAgencyAdminUserFactory(UserFactory):
    pass


class CareManagerSupervisorUserFactory(UserFactory):
    pass


class CareManagerUserFactory(UserFactory):
    pass


class CareProviderAdminUserFactory(UserFactory):
    pass


class CareProviderFactory(UserFactory):
    pass
