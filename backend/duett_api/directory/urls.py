from django.urls import path, include
from rest_framework_nested import routers

from .views import (
    VendorDirectoryViewSet,
    FavoriteVendorViewSet,
    VendorReviewViewSet,
    ServiceTypeListView,
    FundingSourceListView,
    VendorClaimViewSet,
    CountyListView,
    PrivatePayCareRequestViewSet,
)

router = routers.SimpleRouter()
router.register(r"vendors", VendorDirectoryViewSet, basename="vendors")
router.register(r"favorites", FavoriteVendorViewSet, basename="favorites")
router.register(r"care-requests", PrivatePayCareRequestViewSet, basename="care-requests")

vendors_router = routers.NestedSimpleRouter(router, r"vendors", lookup="vendor")
vendors_router.register(r"reviews", VendorReviewViewSet, basename="vendor-reviews")
vendors_router.register(r"claim", VendorClaimViewSet, basename="vendor-claim")


urlpatterns = [
    path("services/", ServiceTypeListView.as_view(), name="service-list"),
    path(
        "funding-sources/", FundingSourceListView.as_view(), name="funding-source-list"
    ),
    path("counties/", CountyListView.as_view(), name="county-list"),
    path("", include(router.urls)),
    path("", include(vendors_router.urls)),
]
