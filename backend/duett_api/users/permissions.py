from rest_framework.permissions import BasePermission

from .models import User


class AgencyPermissions(BasePermission):
    def has_permission(self, request, view):
        return request.user.groups.filter(
            name__in=[
                "Care Manager",
                "Care Manager Supervisor",
                "Care Agency Admin",
            ]
        ).exists()


class ProviderPermissions(BasePermission):
    def has_permission(self, request, view):
        return request.user.groups.filter(
            name__in=["Care Provider", "Care Provider Admin"]
        ).exists()


class UserPermissions(BasePermission):
    def has_permission(self, request, view):
        if view.action == "list":
            return request.user.groups.filter(
                name__in=[
                    "Care Manager Supervisor",
                    "Care Agency Admin",
                    "Care Provider Admin",
                ]
            ).exists()

        if view.action == "retrieve":
            return request.user.groups.filter(
                name__in=[
                    "Care Manager Supervisor",
                    "Care Agency Admin",
                    "Care Provider Admin",
                ]
            ).exists()
        # otherwise, pass through to object permissions

        return True

    def has_object_permission(self, request, view, obj):
        return obj == request.user or obj.account == request.user.account


class UserProfilePermissions(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.user == request.user


class AgencyAdminOnly(BasePermission):
    def has_permission(self, request, view):
        is_admin = request.user.groups.filter(
            name__in=["Care Agency Admin"]
        ).exists()
        return is_admin


class AgencyManagedUserPermissions(BasePermission):
    def has_permission(self, request, view):
        user_id = view.kwargs["user_pk"]
        supervisor = User.objects.get(pk=user_id)
        # check if that user is from the same account
        return supervisor.account == request.user.account


class AdminOnly(BasePermission):
    def has_permission(self, request, view):
        return request.user.groups.filter(
            name__in=[
                "Care Agency Admin",
                "Care Provider Admin",
            ]
        ).exists()


class AgencyRequestsPermissions(BasePermission):
    def has_permission(self, request, view):
        agency_id = view.kwargs["agency_pk"]
        return int(agency_id) == request.user.account.id


class UserPreferencesPermissions(BasePermission):
    def has_permission(self, request, view):
        user_pk = view.kwargs["pk"]
        return int(user_pk) == request.user.id
