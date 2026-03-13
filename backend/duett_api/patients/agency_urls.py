
from django.urls import path, include
from .views import CareRequestGetApiView,ClientGetApiView,ClientHistoryGetAPIView

urlpatterns = [
    path("client/<int:user_id>/",ClientGetApiView.as_view(),name="client-search"),
    path("carerequest/<int:user_id>/",CareRequestGetApiView.as_view(),name="care-request-search"),
    path("clienthistory/<int:user_id>/",ClientHistoryGetAPIView.as_view(),name='client-history-search'),
]
