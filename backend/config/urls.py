from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include, re_path
from django.contrib import admin
from django.views.generic import RedirectView
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from rest_framework import permissions
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from duett_api.utils.views import health_check
from two_factor.admin import AdminSiteOTPRequired, AdminSiteOTPRequiredMixin
from two_factor.urls import urlpatterns as tf_urls
from django.http import HttpResponseRedirect
from django.contrib.auth import REDIRECT_FIELD_NAME
from django.contrib.auth.views import redirect_to_login
from django.shortcuts import resolve_url
from django.urls import reverse
from django.utils.http import url_has_allowed_host_and_scheme


class AdminSiteOTPRequiredMixinRedirSetup(AdminSiteOTPRequired):
    def login(self, request, extra_context=None):
        redirect_to = request.POST.get(
            REDIRECT_FIELD_NAME, request.GET.get(REDIRECT_FIELD_NAME)
        )
        # For users not yet verified the AdminSiteOTPRequired.has_permission
        # will fail. So use the standard admin has_permission check:
        # (is_active and is_staff) and then check for verification.
        # Go to index if they pass, otherwise make them setup OTP device.
        if request.method == "GET" and super(
            AdminSiteOTPRequiredMixin, self
        ).has_permission(request):
            # Already logged-in and verified by OTP
            if request.user.is_verified():
                # User has permission
                index_path = reverse("admin:index", current_app=self.name)
            else:
                # User has permission but no OTP set:
                index_path = reverse("two_factor:setup", current_app=self.name)
            return HttpResponseRedirect(index_path)

        if not redirect_to or not url_has_allowed_host_and_scheme(
            url=redirect_to, allowed_hosts={request.get_host()}
        ):
            redirect_to = resolve_url(settings.LOGIN_REDIRECT_URL)

        return redirect_to_login(redirect_to)


admin.site.__class__ = AdminSiteOTPRequiredMixinRedirSetup


schema_view = get_schema_view(
    openapi.Info(
        title="Duett API",
        default_version="v1",
        description="",
        terms_of_service="",
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include(tf_urls, "two_factor")),
    # App URLS
    path("api/users/", include("duett_api.users.user_urls")),
    path("api/2fa/", include("duett_api.users.2fa_urls")),
    path("api/agencies/", include("duett_api.users.agency_urls")),
    path("api/providers/", include("duett_api.users.provider_urls")),
    path("api/patients/", include("duett_api.patients.patient_urls")),
    path("api/requests/", include("duett_api.patients.request_urls")),
    path("api/search/", include("duett_api.patients.search_urls")),
    path("api/get/", include("duett_api.patients.agency_urls")),
    path("api/services-requested/", include("duett_api.patients.service_urls")),
    path("api/funding-sources/", include("duett_api.services.funding_urls")),
    path("api/table-columns/", include("duett_api.patients.table_urls")),
    path("api/directory/", include("duett_api.directory.urls")),
    path("api/directory/users/", include("duett_api.users.directory_urls")),
    # Auth URLS
    # contrib.auth is used for reverse lookups like password_reset_confirm
    path("", include("django.contrib.auth.urls")),
    path("auth/", include("dj_rest_auth.urls")),
    path("auth/registration/", include("dj_rest_auth.registration.urls")),
    path("health-check/", health_check, name="health-check"),
    path("", RedirectView.as_view(url="/admin")),
    path(
        "api/token/",
        TokenObtainPairView.as_view(),
        name="token_obtain_pair",
    ),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.DEBUG:
    import debug_toolbar

    urlpatterns = [
        path("__debug__/", include(debug_toolbar.urls)),
        # Swagger URLS
        re_path(
            r"^swagger(?P<format>\.json|\.yaml)$",
            schema_view.without_ui(cache_timeout=0),
            name="schema-json",
        ),
        re_path(
            r"^swagger/$",
            schema_view.with_ui("swagger", cache_timeout=0),
            name="schema-swagger-ui",
        ),
        re_path(
            r"^redoc/$",
            schema_view.with_ui("redoc", cache_timeout=0),
            name="schema-redoc",
        ),
        path(  # these api/token urls are just for testing
            "api/token/",
            TokenObtainPairView.as_view(),
            name="token_obtain_pair",
        ),
        path(  # these api/token urls are just for testing
            "api/token/refresh/",
            TokenRefreshView.as_view(),
            name="token_refresh",
        ),
    ] + urlpatterns
