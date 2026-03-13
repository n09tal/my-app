import jwt
from django.conf import settings

from duett_api.patients.models import PatientActivity

from django.template.loader import render_to_string
from django.contrib.sites.models import Site

from duett_api.patients.models import PatientRequest,ServiceRequested
import datetime
from datetime import timedelta
from django.core.mail.message import EmailMessage
from django.utils import timezone
from duett_api.users.models import User


REQUEST_EVENT = {
    1:  "Care request opened by {created_by_name}",     #When care request will be create
    2: "{provider_name} showed interest",               #When provider notify
    3: "{service_name} matched",                        #When service matched by CAA/CMS/CM
    4: "{service_name} removed",                        #When delete one service(if more than there)
    5: "{service_name} re-opened",                      #When reopen service
    6: "{service_name} re-assgined to {provider_name}", #When service reassinged
}

def is_hijack_user(request):
    try:
        token = request.META.get('HTTP_AUTHORIZATION')
        token = str.replace(str(token), 'Bearer ', '')
        extractd_token = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        if  extractd_token.get("kind") and  extractd_token.get("kind") == 'hijack':
            return True
    except:
        pass


def insert_patient_activity(message, created_by, obj):
    records = {
                'message': message,
                'created_by': created_by,
                'content_object': obj
            }
    PatientActivity.objects.create(**records)



def get_user_open_patient_requests(user):
    date_threshold = timezone.now() - datetime.timedelta(days=30)
    return PatientRequest.objects.filter(
        created_by=user, status__in=[1, 2, 4], created_at__gte=date_threshold  ,is_archived__in=[0])

def send_patient_request_daily_notifications(*args, **kwargs):
    # Get site attributes.
    if Site.objects.filter(domain = "qa2.app.duett.io"):
        env_label = "QA2"
        current_site = "qa2.app.duett.io"
    elif Site.objects.filter(domain = "qa.app.duett.io"):
        env_label = "QA"
        current_site = "qa.app.duett.io"
    elif Site.objects.filter(domain = "staging.app.duett.io"):
        env_label = "STAGING"
        current_site = "staging.app.duett.io"
    else:
        current_site = Site.objects.get_current().domain
        env_label = ""
     # Compose subject line.
    dry_run = kwargs.get("dry_run")
    users = User.objects.all()
    for user in users:
        subject = "Updates to Your Care Request"

        # Get a list of open patient requests.
        patient_requests = get_user_open_patient_requests(user)
        if patient_requests.exists():
            # Get a list of patient request details.
            pr_data = []
            for patient_request in patient_requests:
                service_requests = list(ServiceRequested.objects.filter(request=patient_request))
                pr_data.append({
                    'id': patient_request.id,
                    'service_requests': service_requests,
                })

            if len(patient_requests) > 1:
                subject += "s"
            if env_label:
                subject = f"{env_label}: {subject}"
            # Compose message text.
            html_message = render_to_string("provider-interest-email.html", {
                "patient_requests": pr_data,
                "current_site": current_site,
            })

            # Roll it up into an EmailMessage.
            message = EmailMessage(
                subject,
                html_message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email]
            )
            # Message content type is text/html
            message.content_subtype = "html"
            # Don't send if we're just testing from the shell.
            if not dry_run:
                message.send()
