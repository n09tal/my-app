# This command is run by a cronjob:
# The Care Manager receives a request to review or close out requests
# that have reached expiration (After 72 hours) - This meeting will
# send each morning at 9 AM and include any requests that fall within
# the 72 hr window.

from django.conf import settings
from django.utils import timezone
from django.core import mail
from django.contrib.auth import get_user_model
from django.template.loader import render_to_string
from django.core.management.base import BaseCommand
from django.contrib.sites.models import Site

from duett_api.patients.models import PatientRequest


class Command(BaseCommand):
    help = """
        Sends message to care managers reminding
        them to close out requests that are nearing 72 hours of age.
    """

    def handle(self, *args, **kwargs):
        if not settings.DAILY_EMAILS_ENABLED:
            self.stdout.write("Disabled")
            return

        time_48 = timezone.now() - timezone.timedelta(hours=48)
        user_ids = (
            PatientRequest.objects.filter(
                refreshed_time__lt=time_48, status__in=[1, 2]
            )
            .values_list("created_by", flat=True)
            .distinct()
        )

        current_site = Site.objects.get_current()
        url = f"https://{current_site.domain}/"

        connection = mail.get_connection()
        message_list = []

        for user_id in user_ids:
            try:
                creator = get_user_model().objects.get(pk=user_id)

                html_message = render_to_string(
                    "care-manager-reminder-email.html", {"dashboard_url": url}
                )

                message = mail.EmailMessage(
                    "You have care requests that need your attention",
                    html_message,
                    settings.DEFAULT_FROM_EMAIL,
                    [creator.email],
                )
                message.content_subtype = "html"
                message_list.append(message)
            except Exception:
                print(
                    f"Daily care manager email failed for user id: {user_id}"
                )

        connection.send_messages(message_list)
        connection.close()
