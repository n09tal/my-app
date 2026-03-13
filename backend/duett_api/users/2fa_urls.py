from django.urls import path

from .views import (
    ConfigureOTP, VerifyOTP, PromptProviderAccount, GenerateQR, VerifyQR, ValidateQR, DisableQR,
)
urlpatterns = [
    path("configure-otp/", ConfigureOTP.as_view(), name="configure-otp"),
    path("verify-otp/", VerifyOTP.as_view(), name="verify-otp"),
    path("prompt-provider/", PromptProviderAccount.as_view(), name="prompt-provider"),
    path('generate-qr/', GenerateQR.as_view(), name="generate-qr"),
    path('verify-qr/', VerifyQR.as_view(), name="verify-qr"),
    path('validate-qr/', ValidateQR.as_view(), name="validate-qr"),
    path('disable-qr/', DisableQR.as_view(), name="disable-qr")
]