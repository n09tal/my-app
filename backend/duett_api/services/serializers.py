from rest_framework import serializers

from .models import (
    ServiceType,
    FundingSource,
    ZipCode,
    County,
)
from duett_api.users.models import ProviderProfile

class ServiceTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceType
        fields = ["id", "name"]


class FundingSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = FundingSource
        fields = ["id", "name", "service_type"]


class ZipCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ZipCode
        fields = ["id", "zip", "county"]


class CountySerializer(serializers.ModelSerializer):
    class Meta:
        model = County
        fields = ["id", "name"]


class ProviderProfileFundingSourceSerializer(serializers.ModelSerializer):
    service_type = serializers.PrimaryKeyRelatedField(queryset=FundingSource.objects.all(), many=True)

    class Meta:
        model = ProviderProfile
        fields = ["account", "service_type"]
