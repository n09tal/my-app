from django.urls import path
from .views import DirectoryUserView, DirectoryUserRegistrationView

urlpatterns = [
    path(
        "register/", DirectoryUserRegistrationView.as_view(), name="directory-register"
    ),
    path("me/", DirectoryUserView.as_view(), name="directory-user"),
]
