import threading
import logging
from datetime import timedelta, datetime
from itertools import product

from duett_api.djcelery_email.tasks import TASK_CONFIG
from django.conf import settings

logger = logging.getLogger(__name__)
from django.utils import timezone
from django.template.loader import render_to_string
from django.contrib.sites.models import Site
from duett_api.patients.models import EmailData, ServiceRequested
from django.contrib.sites.models import Site
from django.core.mail.message import EmailMessage
from django.template.loader import render_to_string
from duett_api.patients.models import ServiceRequested, PatientRequest
import time
from django.db.models import Count, F
from celery import shared_task
from duett_api.patients.utils import send_patient_request_daily_notifications
from duett_api.users.models import User, ProviderProfile, ServiceType
from django.core.mail.message import EmailMessage
from .models import PatientRequest
from django.utils import timezone
from django.db.models import Q
import json
import requests

@shared_task
def refresh_patient_request_time():
    current_time = timezone.now()
    fifteen_days_ago = current_time - timedelta(days=15)
    sixteen_days_ago = current_time - timedelta(days=16)
    time_window = timedelta(seconds=5)
    requests = PatientRequest.objects. \
        filter(initial_created_time__gte=sixteen_days_ago, initial_created_time__lt=fifteen_days_ago). \
        filter(Q(refreshed_time__gte=F('initial_created_time') - time_window) & Q(
        refreshed_time__lte=F('initial_created_time') + time_window)). \
        filter(status=1)
    for request in requests:
        request.refreshed_time = timezone.now()
        request.save()


@shared_task
def send_email_task():
    email_data = EmailData.objects.filter(status=0, email_title='provider-match-email')
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
            email = rec.parameter.get('email')
            url = rec.parameter.get('url')
            html_message = render_to_string(
                "provider-match-email.html", {"request_url": url}
            )

            message = EmailMessage(
                f"{env_label} Request Update: Matched",
                html_message,
                settings.DEFAULT_FROM_EMAIL,
                [email],
            )
            message.content_subtype = "html"
            message.send()
            rec.status = 1
            rec.save()


# @shared_task
# def daily_report():
#     if settings.SEND_PATIENT_REQUEST_REPORTS and settings.SEND_PATIENT_REQUEST_REPORTS.lower() != 'false':
#         send_patient_request_daily_notifications()

@shared_task
def update_request_partially_matched():
    patient_reqs = PatientRequest.objects.all()
    for request in patient_reqs:
        service_requested = request.servicerequested_set.all()
        service_requested_ = service_requested.annotate(interest_count=Count("interests")).all()
        total_count = len(list(service_requested_))
        match_count = sum(sr.match is not None for sr in service_requested)
        interest_count = sum(sr.match is None and sr.interest_count > 0 for sr in service_requested_)

        if match_count == total_count:
            new_status = PatientRequest.Statuses.CLOSED
        elif interest_count > 0:
            new_status = PatientRequest.Statuses.PENDING
        elif match_count > 0:
            new_status = PatientRequest.Statuses.PARTIALLY_MATCHED
            request.status = new_status
            request.save()
        else:
            new_status = PatientRequest.Statuses.OPEN


@shared_task
def daily_digest_emails():
    refresh_patient_request_time()
    process_provider_email()
    process_care_manager_email()


@shared_task
def process_provider_email():
    try:
        if Site.objects.filter(domain="qa2.app.duett.io"):
            env_label = "QA2:"
        elif Site.objects.filter(domain="qa.app.duett.io"):
            env_label = "QA:"
        elif Site.objects.filter(domain="staging.app.duett.io"):
            env_label = "STG:"
        else:
            env_label = ""

        providers = ProviderProfile.objects.prefetch_related('zip_codes', 'services', 'funding_sources').all()
        num_threads = 5
        providers_per_thread = (providers.count() + num_threads - 1) // num_threads

        def process_chunk(chunk):
            for provider in chunk:
                zip_codes = provider.zip_codes.values_list("zip", flat=True)
                services = provider.services.values_list("name", flat=True)
                funding_sources = provider.funding_sources.values_list("name", flat=True)

                patient_requests = PatientRequest.objects.prefetch_related(
                    "servicerequested__service", "servicerequested__funding_source"
                ).filter(
                    initial_created_time__gte=datetime.now() - timedelta(days=1)
                ).exclude(hides=provider).distinct()

                service_results = (
                    patient_requests.filter(
                        patient__zip__in=zip_codes,
                        servicerequested__service__name__in=services,
                        servicerequested__funding_source__name__in=funding_sources,
                    )
                    .exclude(hides=provider)
                    .values("patient__zip", "servicerequested__service__name")
                    .annotate(count=Count("id"))
                    .values("servicerequested__service__name", "patient__zip", "count")
                )

                service_results = [
                    {
                        "service_name": result["servicerequested__service__name"],
                        "zip_code": result["patient__zip"],
                        "count": result["count"],
                    }
                    for result in service_results
                ]

                if len(service_results) > 0:
                    service_results.sort(key=lambda x: (x["service_name"], int(x["zip_code"])))
                    provider_dict = {"provider": provider.email, "results": service_results}
                    send_statics(provider_dict, env_label)

        chunks = [providers[i:i + providers_per_thread] for i in range(0, providers.count(), providers_per_thread)]

        threads = []

        for chunk in chunks:
            thread = threading.Thread(target=process_chunk, args=(chunk,))
            threads.append(thread)
            thread.start()

        for thread in threads:
            thread.join()

    except Exception as e:
        logger.error("Error in process_provider_email: %s", e, exc_info=True)


def send_statics(result, label):
    try:
        provider = ProviderProfile.objects.get(email=result["provider"])
        users = User.objects.filter(account=provider.account)
        current_site = Site.objects.get_current().domain

        for user in users:
            html_message = render_to_string(
                "provider-statics-email.html",
                {"results": result["results"], "last_login": user.last_login, "current_site": current_site}
            )
            message = EmailMessage(
                f"{label} New Care Requests Posted",
                html_message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
            )
            message.content_subtype = "html"
            message.send()

    except Exception as e:
        logger.error("Error in send_statics: %s", e, exc_info=True)


def send_care_manager_statics(result, label):
    try:
        current_site = Site.objects.get_current().domain
        current_date = datetime.now().date().strftime('%m/%d/%Y')

        html_message = render_to_string(
            "care-manager-statics.html",
            {"data": result, "current_site": current_site}
        )
        message = EmailMessage(
            f"{label} Case Activity Report for {current_date}",
            html_message,
            settings.DEFAULT_FROM_EMAIL,
            [result["email"]],
        )
        message.content_subtype = "html"
        message.send()

    except Exception as e:
        logger.error("Error in send_statics: %s", e, exc_info=True)

@shared_task
def process_care_manager_email():
    try:
        if Site.objects.filter(domain="qa2.app.duett.io"):
            env_label = "QA2:"
        elif Site.objects.filter(domain="qa.app.duett.io"):
            env_label = "QA:"
        elif Site.objects.filter(domain="staging.app.duett.io"):
            env_label = "STG:"
        else:
            env_label = ""

        care_manager_users = User.objects.filter(
            groups__name__in=['Care Manager', 'Care Agency Admin', 'Care Manager Supervisor'])
        num_threads = 5
        users_per_thread = (care_manager_users.count() + num_threads - 1) // num_threads

        def process_chunk(chunk):
            for user in chunk:
                user_requests = PatientRequest.objects.\
                    filter(assigned_to=user,
                           status__in=[PatientRequest.Statuses.OPEN, PatientRequest.Statuses.PENDING,
                                       PatientRequest.Statuses.PARTIALLY_MATCHED],
                           is_archived=PatientRequest.Archived.NOT_ARCHIVED)
                user_data = {
                    "last_login": user.last_login,
                    "email": user.email,
                    "results": []
                }
                for req in user_requests:
                    interested_providers_count = ProviderProfile.objects.filter(
                        interested_services__in=req.servicerequested_set.all()).distinct().count()
                    user_data["results"].append({
                        "caseId": req.id,
                        "case_status": req.get_status_display(),
                        "interest_count": interested_providers_count,
                    })
                if user_data["results"]:
                    send_care_manager_statics(user_data, env_label)
        chunks = [care_manager_users[i:i + users_per_thread] for i in range(0, care_manager_users.count(), users_per_thread)]

        threads = []

        for chunk in chunks:
            thread = threading.Thread(target=process_chunk, args=(chunk,))
            threads.append(thread)
            thread.start()

        for thread in threads:
            thread.join()

    except Exception as e:
        logger.error("Error in send_statics: %s", e, exc_info=True)

def send_mailgun_email(email_subject, recipient, template_name, template_variables):
    return requests.post(
        "https://api.mailgun.net/v3/duett.io/messages",
        auth=("api", settings.MAILGUN_WEBHOOK_KEY),  # Use your actual API key
        data={
            "from": settings.DEFAULT_FROM_EMAIL,
            "to": [recipient],
            "subject": email_subject,
            "template": template_name,
            "h:X-Mailgun-Variables": json.dumps(template_variables)
        }
    )   


@shared_task
def send_care_request_notifications(care_request_id, provider_ids, zip):
    care_request = PatientRequest.objects.get(pk=care_request_id)
    providers = ProviderProfile.objects.filter(pk__in=provider_ids)

    current_site = Site.objects.get_current()
    url = f"https://{current_site.domain}/request/{care_request.pk}/"
    login_url = f"https://{current_site.domain}/"
    frequency_map = {
        1: "week",
        2: "month",
    }

    if Site.objects.filter(domain="qa2.app.duett.io"):
        env_label = "QA2:"
    elif Site.objects.filter(domain="qa.app.duett.io"):
        env_label = "QA:"
    elif Site.objects.filter(domain="staging.app.duett.io"):
        env_label = "STG:"
    else:
        env_label = ""

    for provider in providers:
        valid_service_request_found = False
        DuettTableData = '<table style="font-family:\'Lato\',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"><tbody>'
        for service_request in care_request.servicerequested_set.all():
            if service_request.service.immediate_notification:
                provider_can_serve_service_type = provider.services.filter(id=service_request.service.id).exists() 
                provider_can_serve_funding_source = provider.funding_sources.filter(id=service_request.funding_source.id).exists() 
                if provider_can_serve_service_type and provider_can_serve_funding_source:
                    frequency_label = frequency_map.get(service_request.frequency, "Per Week")
                    hours_string = f"{service_request.hours} hours / {frequency_label}"
                    DuettTableData += f'<tr><td><a href="{url}">Care Request #{care_request.pk}</a></td><td>{service_request.service.name}</td><td>{hours_string}</td><td>{zip}</td></tr>'
                    valid_service_request_found = True
        DuettTableData += '</tbody></table>'  
        if valid_service_request_found:
            try:
                users = User.objects.filter(account=provider.account)
            except Exception as e:
                logger.error("Error filtering users for provider account %s: %s", provider.account_id, e)
                continue
            email_subject = f"{env_label} New Care Request Available"

            template_variables = {
                'CareRequestURL': url,
                'LoginURL': login_url,
                'DuettTableData': DuettTableData
            }
            for user in users:
                response = send_mailgun_email(
                    email_subject,
                    user.email,
                    "immediate notification html",
                    template_variables,
                )
                print(response.text)  