from django.contrib import admin
from simple_history.admin import SimpleHistoryAdmin
from django.db.models import Count

class SimpleHistoryShowDeletedFilter(admin.SimpleListFilter):
    title = "Entries"
    parameter_name = "entries"
    def lookups(self, request, model_admin):
        return (
            ("deleted_only", "Only Deleted"),
        )

    def queryset(self, request, queryset):
        if self.value():
            _queryset = queryset.model.history.filter(history_type='-').exclude(id__in=queryset.model.objects.all().values_list("id",flat=True))
            _queryset = _queryset.values('id', 'history_id').annotate(cnt=Count('id'))
            dct = {}
            for d in _queryset:
                dct[d.get('id')] =  d.get('history_id')
            ids = list(dct.values())
            queryset = queryset.model.history.filter(history_id__in=ids)

        return queryset


class SimpleHistoryMixin(SimpleHistoryAdmin):
    def get_changelist(self, request, **kwargs):
        def url_from_result_maker(history=False):
            def custom_url_for_result(self, result):
                from django.urls import reverse
                from django.contrib.admin.utils import quote

                pk = getattr(result, self.pk_attname)
                route_type = 'history' if history else 'change'
                route = f"{self.opts.app_label}_{self.opts.model_name}_{route_type}"
                return reverse(f'admin:{route}',
                               args=(quote(pk),),
                               current_app=self.model_admin.admin_site.name)

            return custom_url_for_result

        ChangeList = super().get_changelist(request, **kwargs)
        if request.GET.get('entries', None) == 'deleted_only':
            ChangeList.url_for_result = url_from_result_maker(history=True)
        else:
            ChangeList.url_for_result = url_from_result_maker(history=False)
        return ChangeList
