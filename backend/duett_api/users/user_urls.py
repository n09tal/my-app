from django.urls import path, include
from rest_framework_nested import routers

from .views import (
    ActivateUsersView,
    DeactivateUsersView,
    UserViewSet,
    UserProfileView,
    AgencyManagedUserViewSet,
    UserPreferencesView,
    AboutMeView,
    CreateProviderProfileView,
    ProviderProfileServiceTypeView,
    ProviderProfileFundingSourceView,
    CustomProviderProfileView,
    UploadDocsView,
    UploadDocsPatchView,
    ProviderProfileDashBoardView,
    CheckUserSignupStatus,
    ProviderZipCodesView,
)

router = routers.SimpleRouter()
router.register(r"", UserViewSet)

managed_user_router = routers.NestedSimpleRouter(router, "", lookup="user")
managed_user_router.register(
    "managed-users", AgencyManagedUserViewSet, basename="users"
)

urlpatterns = [
    path("deactivate/", DeactivateUsersView.as_view()),
    path("activate/", ActivateUsersView.as_view()),
    path("me/", AboutMeView.as_view()),
    path("<int:pk>/profile/", UserProfileView.as_view(), name="user-profile"),
    path("<int:pk>/preferences/", UserPreferencesView.as_view()),
    path(
        "provider/service-type/",
        ProviderProfileServiceTypeView.as_view(),
        name="provider-service-type",
    ),
    path(
        "provider/funding-source/",
        ProviderProfileFundingSourceView.as_view(),
        name="provider-funding-source",
    ),
    path("upload-docs/", UploadDocsView.as_view(), name="upload-docs"),
    path("upload-docs/<int:pk>/", UploadDocsPatchView.as_view(), name="upload-docs"),
    path(
        "custom-provider-profile/",
        CustomProviderProfileView.as_view(),
        name="custom-provider-profile",
    ),
    path(
        "dashboard-view/", ProviderProfileDashBoardView.as_view(), name="dashboard-view"
    ),
    path(
        "check_user_signup_status/",
        CheckUserSignupStatus.as_view(),
        name="check_user_signup_status",
    ),
    path(
        "provider/zip-codes/", ProviderZipCodesView.as_view(), name="provider-zip-codes"
    ),
    path("", include(router.urls)),
    path("", include(managed_user_router.urls)),
]
