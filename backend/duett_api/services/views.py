from rest_framework import viewsets, mixins, status
from rest_framework.views import APIView
from rest_framework.decorators import permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import (
    FundingSource,
    ZipCode,
    County
)
from .serializers import (
    ServiceTypeSerializer,
    FundingSourceSerializer,
    ZipCodeSerializer,
    CountySerializer
)
from duett_api.users.models import ProviderProfile

@permission_classes([IsAuthenticated])
class FundingSourceViewSet(
    mixins.RetrieveModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet
):
    queryset = FundingSource.objects.all()
    serializer_class = FundingSourceSerializer


@permission_classes([IsAuthenticated])
class FundingServiceViewSet(viewsets.ViewSet):
    def list(self, request, funding_source_pk):
        fs = FundingSource.objects.get(pk=funding_source_pk)
        queryset = fs.service_type.all()
        serializer = ServiceTypeSerializer(queryset, many=True)
        return Response(serializer.data)


class CountyViewSet(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            provider_profile = ProviderProfile.objects.get(account=request.user.account.id)
        except ProviderProfile.DoesNotExist:
            return Response({"error": "Provider profile was not found."}, status=status.HTTP_404_NOT_FOUND)

        queryset = County.objects.all()
        serializer = CountySerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        try:
            provider_profile = ProviderProfile.objects.get(account=request.user.account.id)
        except ProviderProfile.DoesNotExist:
            return Response({"error": "Provider profile was not found."}, status=status.HTTP_404_NOT_FOUND)
        county_ids = request.data.get('county_ids', [])
        if not county_ids:
            return Response({"status": "No county was selected."}, status=status.HTTP_400_BAD_REQUEST)

        counties = County.objects.filter(id__in=county_ids)
        if not counties:
            return Response({"detail": "One or more counties not found."}, status=status.HTTP_404_NOT_FOUND)

        zip_codes = ZipCode.objects.filter(county__in=counties)
        provider_profile.zip_codes.set(zip_codes)
        provider_profile.save()
        serializer = ZipCodeSerializer(zip_codes, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ZipCodeViewSet(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        try:
            provider_profile = ProviderProfile.objects.get(account=request.user.account.id)
        except ProviderProfile.DoesNotExist:
            return Response({"error": "Provider profile was not found."}, status=status.HTTP_404_NOT_FOUND)

        zip_code_ids = request.data.get('zip_code_ids', [])
        if not zip_code_ids:
            return Response({"status": "No zipcode was selected."}, status=status.HTTP_400_BAD_REQUEST)

        zip_codes = ZipCode.objects.filter(id__in=zip_code_ids)
        provider_profile.zip_codes.set(zip_codes)
        provider_profile.save()
        return Response({"status": "Zipcode was added successfully."}, status=status.HTTP_201_CREATED)
