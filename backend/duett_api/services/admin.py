from django.contrib import admin
from import_export import resources
from import_export.admin import ImportMixin

from .models import ServiceType, FundingSource, ZipCode, County


class FundingSourceInline(admin.TabularInline):
    model = FundingSource.service_type.through
    verbose_name = "Funding Source"
    verbose_name_plural = "Funding Sources"


@admin.register(ServiceType)
class ServiceTypeAdmin(admin.ModelAdmin):
    inlines = (FundingSourceInline,)
    list_display = ("name",)
    search_fields = ("name",)


@admin.register(FundingSource)
class FundingSourceAdmin(admin.ModelAdmin):
    pass


class ZipCodeInline(admin.TabularInline):
    model = ZipCode
    extra = 1
    fields = ("zip", "county")

    def has_change_permission(self, request, obj=None):
        """
        Override to control whether users can change existing ZipCode instances.
        For example, restrict changes to users with a certain permission.
        """
        # Allow changes only if the user is a superuser
        if request.user.is_superuser:
            return True
        return False


@admin.register(County)
class CountyAdmin(admin.ModelAdmin):
    inlines = (ZipCodeInline,)
    list_display = ("name",)
    search_fields = ("name",)


class ZipCodeResource(resources.ModelResource):
    class Meta:
        model = ZipCode
        fields = ["zip"]
        import_id_fields = ["zip"]


@admin.register(ZipCode)
class ZipCodeAdmin(ImportMixin, admin.ModelAdmin):
    resource_class = ZipCodeResource
    list_display = ("zip", "get_county")
    search_fields = ("zip", "county__name")

    def get_county(self, obj):
        return obj.county.name if obj.county else "No County"

    get_county.short_description = "County"
    get_county.admin_order_field = "county__name"
