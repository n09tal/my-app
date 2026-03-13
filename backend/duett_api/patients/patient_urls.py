from django.urls import path, include
from rest_framework_nested import routers
from .views import (
    PatientViewSet,
    CreatePatientRequestView,
    RetrieveUpdatePatientRequestView,
    PatientRequestAssignView,
    PatientRequestChangeAssigneeView, PatientRequestDownloadPdfView,
    # PatientRequestDownloadPdfView,

)

router = routers.SimpleRouter()
router.register(r"", PatientViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path(
        "<int:patient_pk>/requests/",
        CreatePatientRequestView.as_view(),
        name="create-request",
    ),
    path(
        "<int:patient_pk>/requests/<int:request_pk>/",
        RetrieveUpdatePatientRequestView.as_view(),
        name="request-update",
    ),
    path(
        "request/<int:request_pk>/",
        PatientRequestAssignView.as_view(),
        name='change-request-assignee'),
    path(
        "request/<int:request_pk>/download-data/",
        PatientRequestDownloadPdfView.as_view(),
        name='download-request-intereted-providers-details'),
    path(
        "request/<int:request_pk>/care-manager/<int:pk>/",
        PatientRequestChangeAssigneeView.as_view(),
        name='change-assignee'),
]
