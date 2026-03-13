from duett_api import services
import duett_api
import os
from celery import Celery
from django.conf import settings
from celery.schedules import crontab


CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL")
CELERY_RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND")




os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
app = Celery("config")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()


app.conf.timezone = "UTC"

# app.conf.beat_schedule = {
#     "sample_task": {
#         "task": "duett_api.patients.tasks.send_email_task",
#         "schedule": crontab(minute="*/5"),
#     },
# }


app.conf.beat_schedule = {
    "new_task":{
        "task":"duett_api.patients.tasks.daily_digest_emails",
        "schedule": crontab(minute=0,hour=10),
    }
    # "sample_task": {
    #     "task": "duett_api.patients.tasks.daily_report",
    #     "schedule": crontab(minute=0, hour=10),
    # },   
}

