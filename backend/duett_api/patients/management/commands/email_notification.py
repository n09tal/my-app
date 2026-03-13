from django.conf import settings
from django.utils import timezone
from django.core import mail
from django.contrib.auth import get_user_model
from django.template.loader import render_to_string
from django.core.management.base import BaseCommand
from django.contrib.sites.models import Site
from duett_api.patients.models import EmailData, ServiceRequested
from django.contrib.sites.models import Site
from django.core.mail.message import EmailMessage
from django.template.loader import render_to_string
from datetime import datetime
import time


class Command(BaseCommand):
    help = """
        Sends email to proivder.
    """

    def handle(self, *args, **kwargs):
        email_data = EmailData.objects.filter(status=0, email_title = 'send_email_closed')
        current_time = timezone.now()
        if Site.objects.filter(domain="qa2.app.duett.io"):
            env_label = "QA2:"
        elif Site.objects.filter(domain="qa.app.duett.io"):
            env_label = "QA:"
        elif Site.objects.filter(domain="staging.app.duett.io"):
            env_label = "STG:"
        else:
            env_label = ""

        for rec in email_data:
            if current_time > rec.send_time:
                sr = ServiceRequested.objects.get(id=rec.parameter.get('service'))
                current_site = Site.objects.get_current()
                domain_name = f"https://{current_site.domain}"
                request_id = sr.request.id
                for provider in sr.interests.all().exclude(pk=rec.parameter.get('provider')):
                    email = provider.email
                    html_message = render_to_string(
                        "provider-request-closed-email.html",
                        {
                            "request_list_url": domain_name,
                            "domain_name": domain_name,
                            "request_id": request_id,
                        },
                    )
                    message = EmailMessage(
                        f"{env_label} Request Update: Closed",
                        html_message,
                        settings.DEFAULT_FROM_EMAIL,
                        [email],
                    )
                    message.content_subtype = "html"
                    message.send()
                    rec.status = 1
                    rec.save()