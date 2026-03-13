from django.conf import settings
from django.dispatch import receiver
from django.utils.http import urlsafe_base64_encode
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.urls import reverse
import logging

# from django.contrib.auth.forms import PasswordResetForm
from django.db.models.signals import post_save, Signal, m2m_changed
from django.db import transaction
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.contrib.sites.models import Site

from ..constant_test import user_email_list
from ..models import User
from duett_api.users.models import UserProfile, UploadDocs, ProviderProfile
from duett_api.services.models import County, ZipCode
from django.conf import settings
from functools import wraps
from django.db.models import QuerySet

post_send_document_upload_email = Signal()
post_new_provider_profile_notify = Signal()
logger = logging.getLogger(__name__)


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance, first_name="N/A", last_name="")


@receiver(post_save, sender=User)
def new_user_notify(sender, instance, created, **kwargs):
    """
    Notifies new user that their account has been created.
    """
    if instance.email in user_email_list:
        user_email_list.remove(instance.email)
        return

    if created and not instance.is_verified:
        uidb64 = urlsafe_base64_encode(str(instance.pk).encode())
        default_token_generator = PasswordResetTokenGenerator()
        token = default_token_generator.make_token(instance)
        current_site = Site.objects.get_current()

        if Site.objects.filter(domain="qa2.app.duett.io"):
            env_label = "QA2:"
        elif Site.objects.filter(domain="qa.app.duett.io"):
            env_label = "QA:"
        elif Site.objects.filter(domain="staging.app.duett.io"):
            env_label = "STG:"
        else:
            env_label = ""

        url = f"https://{current_site.domain}/reset/{uidb64}/{token}/"

        html_message = render_to_string("new-user-email.html", {"url": url})

        message = EmailMessage(
            f"{env_label} Welcome to Duett! Set up Account Now!",
            html_message,
            settings.DEFAULT_FROM_EMAIL,
            [instance.email],
        )
        message.content_subtype = "html"
        message.send()


@receiver(post_send_document_upload_email)
def send_document_upload_email(
    sender, instance, provider_profile, created, new_documents=None, **kwargs
):
    """
    Notifies Admin user that the documents for a provider profile have been uploaded.
    """
    if Site.objects.filter(domain="qa2.app.duett.io"):
        env_label = "QA2:"
    elif Site.objects.filter(domain="qa.app.duett.io"):
        env_label = "QA:"
    elif Site.objects.filter(domain="staging.app.duett.io"):
        env_label = "STG:"
    else:
        env_label = ""

    current_site = Site.objects.get_current().domain
    backend_domain = current_site.replace("app.", "api.")
    provider_profile_admin_url = f"http://{backend_domain}{reverse('admin:users_providerprofile_change', args=[provider_profile.pk])}"

    # Determine which documents to show and which template to use
    if new_documents:  # This is an update
        all_documents = (
            new_documents
            if isinstance(new_documents, (list, QuerySet))
            else [new_documents]
        )
        template_name = "doc-update-admin-email.html"
        is_update = True
    else:  # This is an initial upload
        if isinstance(instance, list):
            new_doc_names = [doc["file_name"] for doc in instance]
            all_documents = UploadDocs.objects.filter(
                provider_profile=provider_profile, file_name__in=new_doc_names
            )
        else:
            all_documents = UploadDocs.objects.filter(provider_profile=provider_profile)
        template_name = "doc-upload-admin-email.html"
        is_update = False

    html_message = render_to_string(
        template_name,
        {
            "sender": (
                provider_profile.account.name
                if hasattr(provider_profile.account, "name")
                else provider_profile
            ),
            "all_documents": all_documents,
            "provider_profile_admin_url": provider_profile_admin_url,
        },
    )

    message = EmailMessage(
        f"{env_label} {'Provider Has Added New Documents' if is_update else 'A New Provider Has Registered'} - Please Review",
        html_message,
        settings.DEFAULT_FROM_EMAIL,
        [settings.DUETT_ADMIN_EMAIL],
    )
    message.content_subtype = "html"
    message.send()


# @receiver(post_new_provider_profile_notify)
def new_provider_profile_notify(sender, instance, created, **kwargs):
    """
    Notifies new provider that their account has been created.
    """
    if Site.objects.filter(domain="qa2.app.duett.io"):
        env_label = "QA2:"
    elif Site.objects.filter(domain="qa.app.duett.io"):
        env_label = "QA:"
    elif Site.objects.filter(domain="staging.app.duett.io"):
        env_label = "STG:"
    else:
        env_label = ""

    current_site = Site.objects.get_current()
    login_url = f"https://{current_site.domain}"

    html_message = render_to_string("new-provider-email.html", {"login_url": login_url})

    message = EmailMessage(
        f"{env_label} Welcome to Duett! Your Account is Ready",
        html_message,
        settings.DEFAULT_FROM_EMAIL,
        [instance.email],
    )
    message.content_subtype = "html"
    message.send()


class ChangeTracker:
    zip_codes_changing = False
    counties_changing = False


@receiver(m2m_changed, sender=ProviderProfile.zip_codes.through)
def handle_zip_code_changes(sender, instance, action, pk_set, **kwargs):
    if ChangeTracker.zip_codes_changing:
        logger.debug(
            "Exiting handle_zip_code_changes due to active zip_codes_changing flag."
        )
        return  # Exit if already handling zip code changes to prevent recursion

    if not instance.pk:
        logger.warning(
            "ProviderProfile instance does not have a primary key. Exiting handle_zip_code_changes."
        )
        return  # Exit if instance is not yet saved and has no primary key

    if pk_set:
        try:
            ChangeTracker.zip_codes_changing = True
            logger.debug(
                f"Starting handle_zip_code_changes with action: {action}, pk_set: {pk_set}"
            )

            if action == "post_add":
                # Ensure all zip codes are attached to the ProviderProfile
                logger.debug(
                    f"Attaching zip codes {pk_set} to ProviderProfile with primary key {instance.pk}"
                )
                instance.zip_codes.add(*pk_set)

                # Re-fetch counties associated with the newly added zip codes
                counties_of_new_zips = County.objects.filter(
                    zip_codes__id__in=pk_set
                ).distinct()
                logger.debug(
                    f"Counties associated with new zip codes: {list(counties_of_new_zips)}"
                )

                # For each county of the new zip codes, attach it if not already linked
                for county in counties_of_new_zips:
                    if not instance.counties.filter(id=county.id).exists():
                        logger.debug(
                            f"Attaching county {county.id} to ProviderProfile with primary key {instance.pk}"
                        )
                        instance.counties.add(county)
                    else:
                        logger.debug(
                            f"County {county.id} is already attached to ProviderProfile with primary key {instance.pk}"
                        )

            elif action == "post_remove":
                # Only remove zip codes, do not remove associated counties
                zip_codes_to_remove = ZipCode.objects.filter(id__in=pk_set).distinct()
                logger.debug(
                    f"Removing zip codes {pk_set} from ProviderProfile with primary key {instance.pk}"
                )
                for zip_code in zip_codes_to_remove:
                    instance.zip_codes.remove(zip_code)

            elif action == "post_clear":
                # Clear all zip codes but keep counties attached
                logger.debug(
                    f"Clearing all zip codes from ProviderProfile with primary key {instance.pk}"
                )
                instance.zip_codes.clear()

        finally:
            ChangeTracker.zip_codes_changing = False
            logger.debug("Resetting zip_codes_changing flag.")


@receiver(m2m_changed, sender=ProviderProfile.counties.through)
def handle_county_changes(sender, instance, action, pk_set, **kwargs):
    if ChangeTracker.counties_changing:
        return  # Exit if already handling county changes to prevent recursion

    if pk_set:
        try:
            ChangeTracker.counties_changing = True

            if action == "post_add":
                zip_codes_to_add = ZipCode.objects.filter(
                    county_id__in=pk_set
                ).distinct()
                instance.zip_codes.add(*zip_codes_to_add)

            elif action == "post_remove":
                zip_codes_to_remove = ZipCode.objects.filter(
                    county_id__in=pk_set
                ).distinct()
                instance.zip_codes.remove(*zip_codes_to_remove)

            elif action == "post_clear":
                instance.zip_codes.clear()

        finally:
            ChangeTracker.counties_changing = False
