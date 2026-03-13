from rest_framework.permissions import BasePermission
from django.contrib.auth import get_user_model
from .models import Patient
from duett_api.users.models import AgencyProfile

from duett_api.users.models import ProviderProfile, Account


def check_provider_zip_codes(patient, account):
    """
    Check that the patients zip code is in the list of authorized
    ones for that provider.
    """
    provider = ProviderProfile.objects.get(account=account)
    return provider.zip_codes.filter(zip=patient.zip).exists()


def check_provider_services(patient_request, account):
    provider = ProviderProfile.objects.get(account=account)
    provider_services = provider.services.values_list("name", flat=True)
    return patient_request.servicerequested_set.filter(
        service__name__in=provider_services
    ).exists()


class AgencyOnly(BasePermission):
    def has_permission(self, request, view):
        return request.user.account.type == Account.Types.Agency


class ProviderOnly(BasePermission):
    def has_permission(self, request, view):
        return request.user.account.type == Account.Types.Provider


class PatientPermissions(BasePermission):
    """
    Can have CRUD access to patient if user is care manager that
    created the patient, or if they are a Care Agency Admin for the same
    agency.
    """

    def has_permission(self, request, view):
        if view.action in [
            "list",
            "retrieve",
            "create",
            "update",
            "partial_update",
            "destroy",
        ]:
            # pass through to check object permissions
            return True
        return False

    def has_object_permission(self, request, view, obj):
        account = request.user.account
        return obj.created_by == account.agencyprofile


class PatientRequestPermissions(BasePermission):
    """
    Agencies: Can have CRUD access to patient if user is a care manager
    from the same agency.

    Providers can see patients in the Zip Codes and for the services
    that they are authorized for.
    """

    def has_permission(self, request, view):
        if view.action in [
            "list",
            "retrieve",
            "create",
            "update",
            "partial_update",
            "destroy",
        ]:
            # pass through to check object permissions
            # *list filtering is handled in filters.py*
            return True
        return False

    def has_object_permission(self, request, view, obj):
        account = request.user.account

        if account.type == Account.Types.Agency:
            if view.action == "list":
                group = request.user.groups.first()
                if group.name == "Care Agency Admin":
                    return obj.patient.created_by == account.agencyprofile
                elif group.name == "Care Manager Supervisor":
                    # if they are a supervisor, they can see patients that any
                    # subordinate creates
                    users = get_user_model().objects.filter(
                        managed_user__supervisor=request.user
                    )
                    return obj.created_by == request.user or obj.created_by in users
                else:
                    return obj.created_by == request.user
            else:
                return obj.patient.created_by == account.agencyprofile or obj.created_by.account.agencyprofile == account.agencyprofile



        # if provider, then must match zip code on patient
        # Providers can only view
        elif (
                account.type == Account.Types.Provider
                and view.action == "retrieve"
        ):
            can_view = check_provider_services(
                obj, account
            ) and check_provider_zip_codes(obj.patient, account)
            return can_view

        return False


class RequestNotesPermissions(BasePermission):
    """
    Only authorized agencies can have crud access to request notes.
    """

    def has_permission(self, request, view):
        if view.action in [
            "create",
            "list",
            "retrieve",
            "update",
            "partial_update",
            "destroy",
        ]:
            # pass through to check object permissions
            # *list filtering is handled in filters.py*
            return True
        return False

    def has_object_permission(self, request, view, obj):
        account = request.user.account

        view1 = type('View', (object,), {})()
        view1.action = "retrieve"
        has_request_permission = PatientRequestPermissions.has_object_permission(self, request, view1, obj.request)
        if has_request_permission:
            if view.action in ["create"]:
                return True
            elif view.action in ["retrieve", "update", "partial_update", "destroy"] and obj.account.id == account.id:
                return True


class ServiceInterestPermissions(BasePermission):
    """
    List: must be an agency who owns this request to view the list of
    providers who are interested in a service request.

    Create: must be a provider to be able to express interest in a
    service request. User can only express interest for their own account.
    """

    def has_permission(self, request, view):
        if view.action == "list":
            account = request.user.account
            patient = Patient.objects.filter(
                patientrequest=view.kwargs["request_pk"]
            ).first()
            agency = AgencyProfile.objects.get(account=account)
            return patient.created_by == agency

        if view.action == "create":
            return request.user.account.type == 1

        return False


class ServiceMatchPermissions(BasePermission):
    # TODO: will finish this after merge since I changed
    # account types of on other branch
    def has_permission(self, request, view):
        if request.method == "POST":
            # agencies can post a match, but must be from interested party
            # agency must own that patient attached to request
            pass

        if request.method == "GET":
            # agencies can see the match
            pass

        return True


class ProviderMatchPermissions(BasePermission):
    """
    Only the matched provider can remove themselves.
    """

    def has_object_permission(self, request, view, obj):
        return self.user.account.providerprofile == obj.match


class AgencyManagerOnly(BasePermission):
    def has_permission(self, request, view):
        allowed_user = ['Care Agency Admin', 'Care Manager Supervisor', 'Care Manager']
        group = request.user.groups.first()
        return group.name in allowed_user