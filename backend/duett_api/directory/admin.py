import logging

from django.conf import settings
from django.contrib import admin
from django.core.mail.message import EmailMessage
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.html import format_html

from .models import (
    VendorDirectory,
    VendorCountyService,
    FavoriteVendor,
    VendorReview,
    VendorClaim,
    VendorClaimDocument,
    PrivatePayCareRequest,
)

logger = logging.getLogger(__name__)


class VendorCountyServiceInline(admin.TabularInline):
    model = VendorCountyService
    extra = 0
    autocomplete_fields = ["county", "service"]


@admin.register(VendorDirectory)
class VendorDirectoryAdmin(admin.ModelAdmin):
    list_display = (
        "legal_name",
        "dba",
        "vendor_type",
        "primary_county",
        "verified",
        "contact_phone",
        "claim_status",
    )
    list_filter = ("vendor_type", "verified", "primary_county", "claim_status")
    search_fields = ("legal_name", "dba", "contact_person", "email")
    ordering = ("legal_name",)
    inlines = [VendorCountyServiceInline]
    fieldsets = (
        (None, {"fields": ("legal_name", "dba", "vendor_type", "verified")}),
        (
            "Contact Information",
            {"fields": ("contact_person", "contact_phone", "email", "noa_email")},
        ),
        ("Location", {"fields": ("primary_county", "owning_business_unit")}),
        ("Details", {"fields": ("description", "availability", "languages", "image")}),
        ("Claim Status", {"fields": ("claim_status", "claimed_by", "claimed_at")}),
        ("Raw Data", {"fields": ("county_service_map_raw",), "classes": ("collapse",)}),
    )


@admin.register(VendorCountyService)
class VendorCountyServiceAdmin(admin.ModelAdmin):
    list_display = ("vendor", "county", "service")
    list_filter = ("county", "service")
    search_fields = ("vendor__legal_name", "vendor__dba")
    autocomplete_fields = ["vendor", "county", "service"]


@admin.register(FavoriteVendor)
class FavoriteVendorAdmin(admin.ModelAdmin):
    list_display = ("user", "vendor", "created_at")
    list_filter = ("created_at",)
    search_fields = ("user__email", "vendor__legal_name")
    autocomplete_fields = ["user", "vendor"]


@admin.register(VendorReview)
class VendorReviewAdmin(admin.ModelAdmin):
    list_display = (
        "vendor",
        "user",
        "first_name",
        "last_name",
        "stars",
        "status",
        "created_at",
    )
    list_filter = ("status", "stars", "created_at")
    search_fields = (
        "vendor__legal_name",
        "vendor__dba",
        "user__email",
        "first_name",
        "last_name",
        "description",
    )
    autocomplete_fields = ["vendor", "user"]
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)
    fieldsets = (
        (None, {"fields": ("vendor", "user", "status")}),
        ("Reviewer Info", {"fields": ("first_name", "last_name")}),
        ("Review", {"fields": ("stars", "description")}),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )


class VendorClaimDocumentInline(admin.TabularInline):
    model = VendorClaimDocument
    extra = 0
    readonly_fields = [
        "original_filename",
        "file_type",
        "file_size",
        "created_at",
        "file_link",
    ]
    fields = ["original_filename", "file_type", "file_size", "created_at", "file_link"]

    def file_link(self, obj):
        if obj.link:
            return format_html('<a href="{}" target="_blank">Download</a>', obj.link)
        return "-"

    file_link.short_description = "Document"


@admin.register(VendorClaim)
class VendorClaimAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "vendor",
        "claimant_name",
        "claimant_email",
        "status",
        "created_at",
    ]
    list_filter = ["status", "created_at"]
    search_fields = [
        "claimant_name",
        "claimant_email",
        "vendor__legal_name",
        "vendor__dba",
    ]
    readonly_fields = [
        "vendor",
        "user",
        "claimant_name",
        "claimant_email",
        "claimant_phone",
        "created_at",
        "updated_at",
        "reviewed_by",
        "reviewed_at",
    ]
    ordering = ["-created_at"]
    inlines = [VendorClaimDocumentInline]

    fieldsets = (
        (
            "Claim Information",
            {
                "fields": (
                    "vendor",
                    "claimant_name",
                    "claimant_email",
                    "claimant_phone",
                    "user",
                )
            },
        ),
        ("Review", {"fields": ("status", "admin_notes")}),
        (
            "Timestamps",
            {
                "fields": ("created_at", "updated_at", "reviewed_by", "reviewed_at"),
                "classes": ("collapse",),
            },
        ),
    )

    actions = ["approve_claims", "reject_claims"]

    def approve_claims(self, request, queryset):
        count = 0
        for claim in queryset.filter(status="pending"):
            claim.status = "approved"
            claim.reviewed_by = request.user
            claim.reviewed_at = timezone.now()
            claim.save()
            self._handle_approval(claim)
            count += 1
        self.message_user(request, f"{count} claim(s) approved.")

    approve_claims.short_description = "Approve selected claims"

    def reject_claims(self, request, queryset):
        count = 0
        for claim in queryset.filter(status="pending"):
            claim.status = "rejected"
            claim.reviewed_by = request.user
            claim.reviewed_at = timezone.now()
            claim.save()
            self._handle_rejection(claim)
            count += 1
        self.message_user(request, f"{count} claim(s) rejected.")

    reject_claims.short_description = "Reject selected claims"

    def save_model(self, request, obj, form, change):
        if change and "status" in form.changed_data:
            obj.reviewed_by = request.user
            obj.reviewed_at = timezone.now()
            if obj.status == "approved":
                super().save_model(request, obj, form, change)
                self._handle_approval(obj)
                return
            elif obj.status == "rejected":
                super().save_model(request, obj, form, change)
                self._handle_rejection(obj)
                return
        super().save_model(request, obj, form, change)

    def _handle_approval(self, claim):
        vendor = claim.vendor
        vendor.claim_status = "claimed"
        vendor.claimed_by = claim.user
        vendor.claimed_at = timezone.now()
        vendor.save()

        try:
            context = {
                "claimant_name": claim.claimant_name,
                "vendor_name": vendor.display_name,
            }
            html_message = render_to_string(
                "directory/claim-approved-email.html",
                context,
            )
            message = EmailMessage(
                "Your profile claim has been approved!",
                html_message,
                settings.DEFAULT_FROM_EMAIL,
                [claim.claimant_email],
            )
            message.content_subtype = "html"
            message.send()
        except Exception as e:
            logger.error("Error sending claim approved email: %s", e, exc_info=True)

    def _handle_rejection(self, claim):
        vendor = claim.vendor
        vendor.claim_status = None
        vendor.save()

        try:
            context = {
                "claimant_name": claim.claimant_name,
                "vendor_name": vendor.display_name,
                "admin_notes": claim.admin_notes or "",
            }
            html_message = render_to_string(
                "directory/claim-rejected-email.html",
                context,
            )
            message = EmailMessage(
                "Update on your profile claim",
                html_message,
                settings.DEFAULT_FROM_EMAIL,
                [claim.claimant_email],
            )
            message.content_subtype = "html"
            message.send()
        except Exception as e:
            logger.error("Error sending claim rejected email: %s", e, exc_info=True)


@admin.register(VendorClaimDocument)
class VendorClaimDocumentAdmin(admin.ModelAdmin):
    list_display = (
        "claim",
        "original_filename",
        "file_type",
        "file_size",
        "created_at",
    )
    list_filter = ("file_type", "created_at")
    search_fields = (
        "original_filename",
        "claim__claimant_name",
        "claim__vendor__legal_name",
    )
    readonly_fields = (
        "claim",
        "link",
        "original_filename",
        "file_type",
        "file_size",
        "created_at",
        "updated_at",
    )


@admin.register(PrivatePayCareRequest)
class PrivatePayCareRequestAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "client_name",
        "created_by",
        "status",
        "source",
        "is_urgent",
        "needs_assistance",
        "is_private_pay",
        "created_at",
    )
    list_filter = ("status", "source", "is_urgent", "needs_assistance", "is_private_pay")
    search_fields = ("client_name", "created_by__email", "notes")
    autocomplete_fields = ("created_by", "selected_vendor", "notified_vendors")
    readonly_fields = ("created_at", "updated_at")
