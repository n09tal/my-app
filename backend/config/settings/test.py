# flake8: noqa
from .base import *
import os

DEBUG = True

SECRET_KEY = os.environ.get(
    "SECRET_KEY", "!aj07k2jtx8zf0q%7+ho8qcxg4rn$z**a3obe=y593a=*3f1a2"
)


DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "ebdb",
        "USER": "duettadin",
        "PASSWORD": "qadocker",
        "HOST": "qadocker.cvacvubhvnip.us-east-2.rds.amazonaws.com",
        "PORT": "5432"
    }
}

DEFAULT_FILE_STORAGE = "django.core.files.storage.FileSystemStorage"
DEFAULT_FROM_EMAIL = os.environ.get(
    "DEFAULT_FROM_EMAIL", "dev@rocketbuild.com"
)



STATICFILES_STORAGE = "django.contrib.staticfiles.storage.StaticFilesStorage"
STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "static")

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://qa.app.duett.io",
    "https://qa2.app.duett.io",
    "https://staging.app.duett.io"
]
