from rest_framework import filters


class UserFilterBackend(filters.BaseFilterBackend):
    def filter_queryset(self, request, queryset, view):
        """
        Only Admins and Agency Supervisors should be able to reach this code.
        """

        user_groups = request.user.groups
        account = request.user.account
        is_admin = user_groups.filter(
            name__in=["Care Agency Admin", "Care Provider Admin"]
        ).exists()

        is_supervisor = queryset.filter(
            managed_user__supervisor=request.user
        ).exists()

        if is_admin or is_supervisor:
            # admin and supervisor both can see the all the users of an account
            queryset = queryset.filter(account=account)
        else:
            # Non-admin and supervisor users can have access to themselves only
            queryset = queryset.filter(id=request.user.id)

        return queryset


class AngencyRequestsFilterBackend(filters.BaseFilterBackend):
    def filter_queryset(self, request, queryset, view):
        """
        Pull all requests for a certain agency.
        """
        queryset = queryset.filter(created_by__account=request.user.account)

        return queryset
