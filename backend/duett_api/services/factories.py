from duett_api.users.factories import AgencyFactory
import factory.fuzzy
from factory.django import DjangoModelFactory
from duett_api.services.models import ZipCode, FundingSource, ServiceType



class ZipCodeFactory(DjangoModelFactory):
    class Meta:
        model = ZipCode

    zip = factory.Faker("12345")

class ServiceTypeFactory(DjangoModelFactory):
    class Meta:
        model = ServiceType
    
    name = factory.Faker("service name")

class FundingSourceFactory(DjangoModelFactory):
    class Meta:
        model = FundingSource

    @factory.post_generation
    def servicetype(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            # A list of users were passed in, use them
            # NOTE: This does not seem to be the problem. Setting a breakpoint                     
            # here, this part never even fires
            for servicetype in extracted:
                self.servicetype.add(servicetype)
