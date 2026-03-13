from django.urls import path, include
from rest_framework_nested import routers
from .views import (
    AgencyViewSet,
    AgencyPatientsViewSet,
    AgencyUsersViewSet,
    AgencyRequestsViewSet,
)

router = routers.SimpleRouter()
router.register(r"", AgencyViewSet)

patients_router = routers.NestedSimpleRouter(router, "", lookup="agency")
patients_router.register(
    "patients", AgencyPatientsViewSet, basename="patients"
)

# Agency users can pull list of other users in their agency
users_router = routers.NestedSimpleRouter(router, "", lookup="agency")
users_router.register("users", AgencyUsersViewSet, basename="users")

# Agency users can pull requests from coworkers
user_requests_router = routers.NestedSimpleRouter(router, "", lookup="agency")
user_requests_router.register(
    "requests", AgencyRequestsViewSet, basename="requests"
)

urlpatterns = [
    path("", include(router.urls)),
    path("", include(patients_router.urls)),
    path("", include(users_router.urls)),
    path("", include(user_requests_router.urls)),
]
