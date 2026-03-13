from django.urls import path, include
from rest_framework_nested import routers
from .views import (
    RequestNotesViewSet,
    PatientRequestViewSet,
    ServiceProviderListAPIView,
    ServiceRequestDeleteAPIView,
    ServiceRequestReAssignAPIView,
    ServiceRequestedViewSet,
    ProviderHideView,
    ProviderUnhideView,
    ZipcodeAPIView,
    ArchiveView,
    UnArchiveView,
    ServiceReOpenAPIView,
    PatientRequestActivityAPIView
)

router = routers.SimpleRouter()
router.register(r"", PatientRequestViewSet)

notes_router = routers.NestedSimpleRouter(router, r"", lookup="request")
notes_router.register("notes", RequestNotesViewSet)

services_router = routers.NestedSimpleRouter(router, "", lookup="request")
services_router.register("services", ServiceRequestedViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path("", include(notes_router.urls)),
    path("", include(services_router.urls)),
    path(
        "<int:request_pk>/hide/",
        ProviderHideView.as_view(),
        name="provider-hide",
    ),
    path(
        "<int:request_pk>/unhide/",
        ProviderUnhideView.as_view(),
        name="provider-unhide",
    ),
    path(
        "zipcode/<str:zipcode>/",
        ZipcodeAPIView.as_view(),
        name="request-zipcode"
    ) ,
    path(
        "<int:pk>/archive/",
        ArchiveView.as_view({"put":"update"}),
        name="provider-unhide",
    ),
    path(
        "<int:pk>/unarchive/",
        UnArchiveView.as_view({"put":"update"}),
        name="provider-unhide",
    ),
    path(
        "<int:request_pk>/service_reopen/<int:service_pk>",
        ServiceReOpenAPIView.as_view(),
        name="service-reopen",
    ),
    path(
        "<int:request_pk>/service_request_delete/<int:service_pk>",
        ServiceRequestDeleteAPIView.as_view(),
        name="service-reqeust-delete",
    ),
    path(
        "<int:request_pk>/service_reassign/<int:service_pk>",
        ServiceRequestReAssignAPIView.as_view(),
        name="service-reassign",
    ),
    path(
        "<int:request_pk>/service_provider_list/<int:service_pk>",
        ServiceProviderListAPIView.as_view(),
        name="service-provider-list",
    ),
    path(
        "<int:request_pk>/request_activity",
        PatientRequestActivityAPIView.as_view(),
        name="activity-list",
    ),
]
