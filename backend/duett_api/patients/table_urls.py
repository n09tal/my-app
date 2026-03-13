from django.urls import path
from .views import TableColumnsView

urlpatterns = [
    path("", TableColumnsView.as_view(), name="table-columns"),
]
