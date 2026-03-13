from duett_api.services.factories import FundingSourceFactory, ServiceTypeFactory
from duett_api.users.factories import AgencyFactory, ProviderFactory
import factory.fuzzy
from factory.django import DjangoModelFactory
from duett_api.patients.models import Patient, PatientRequest, RequestNotes, ServiceRequested


class PatientFactory(DjangoModelFactory):
    class Meta:
        model = Patient

    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    # https://stackoverflow.com/questions/59779008/factory-boy-date-provider-is-returning-string
    birth_date = factory.Faker("date_object")
    email = factory.Faker("email")
    address = factory.Faker("street_address")
    city = factory.Faker("city")
    state = factory.Faker("state_abbr")
    zip = factory.Faker("12345")
    age = factory.fuzzy.FuzzyInteger(18, 120)
    phone = factory.fuzzy.FuzzyInteger(1111111111, 9999999999)
    gender = factory.fuzzy.FuzzyChoice([1, 2, 3])
    created_by = factory.SubFactory(AgencyFactory)


class PatientRequestFactory(DjangoModelFactory):
    class Meta:
        model = PatientRequest

    request_prior_authorization = factory.fuzzy.FuzzyChoice([True, False])
    transportation_required = factory.fuzzy.FuzzyChoice([True, False])
    pets = factory.fuzzy.FuzzyChoice([True, False])
    smoking = factory.fuzzy.FuzzyChoice([True, False])
    equipment = factory.fuzzy.FuzzyChoice([True, False])
    notes = factory.fuzzy.FuzzyText(length=25)
    requested_schedule = factory.fuzzy.FuzzyText(length=255)
    patient = factory.SubFactory(PatientFactory)


class ServiceRequestedFactory(DjangoModelFactory):
    class Meta:
        model = ServiceRequested

    hours = factory.fuzzy.FuzzyInteger(1, 19)
    frequency = factory.fuzzy.FuzzyChoice([1, 2])
    request = factory.SubFactory(PatientRequestFactory)
    service = factory.SubFactory(ServiceTypeFactory)
    funding_source = factory.SubFactory(FundingSourceFactory)
    match = factory.SubFactory(ProviderFactory)


class RequestNotesFactory(DjangoModelFactory):
    class Meta:
        model = RequestNotes