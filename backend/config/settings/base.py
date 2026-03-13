# flake8: noqa
import rollbar
import os
from datetime import timedelta

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get("SECRET_KEY")

WSGI_APPLICATION = "config.wsgi.application"

DEBUG = False

ALLOWED_HOSTS = []

LIB_APPS = [
    "config.settings",
    "django.contrib.sites",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "dj_rest_auth",
    "dj_rest_auth.registration",
    "rest_framework",
    "rest_framework.authtoken",
    "rest_framework_nested",
    "debug_toolbar",
    "drf_yasg",
    "django_s3_storage",
    "corsheaders",
    "django_filters",
    "ebhealthcheck.apps.EBHealthCheckConfig",
    "auditlog",
    "import_export",
    "simple_history",
    "admin_auto_filters",
    "django_celery_beat",
    "django_otp",
    "django_otp.plugins.otp_static",
    "django_otp.plugins.otp_totp",
    "two_factor",
]

LOCAL_APPS = [
    "duett_api",
    "duett_api.users",
    "duett_api.utils",
    "duett_api.services",
    "duett_api.patients",
    "duett_api.directory",
]

INSTALLED_APPS = LIB_APPS + LOCAL_APPS

SITE_ID = 1
MAINTENANCE_MODE = os.environ.get("MAINTENANCE_MODE", "False").lower() in (
    "true",
    "1",
    "t",
)

MIDDLEWARE = [
    "allow_cidr.middleware.AllowCIDRMiddleware",
    "duett_api.middleware.HealthCheckMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "debug_toolbar.middleware.DebugToolbarMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
]

# Add allauth middleware if available (django-allauth 0.56.0+)
# Check version to avoid importing during settings load (which causes circular dependency)
# Only add middleware if version >= 0.56.0 (older versions don't have this middleware)
try:
    import pkg_resources

    allauth_dist = pkg_resources.get_distribution("django-allauth")
    allauth_version = pkg_resources.parse_version(allauth_dist.version)
    min_version = pkg_resources.parse_version("0.56.0")
    if allauth_version >= min_version:
        MIDDLEWARE.append("allauth.account.middleware.AccountMiddleware")
except pkg_resources.DistributionNotFound:
    # django-allauth not installed, skip middleware
    pass
except Exception:
    # If version check fails for any other reason, don't add middleware
    # This prevents errors in pipeline with older django-allauth versions
    pass

MIDDLEWARE.extend(
    [
        "django_otp.middleware.OTPMiddleware",
        "django.contrib.messages.middleware.MessageMiddleware",
        "django.middleware.clickjacking.XFrameOptionsMiddleware",
        "auditlog.middleware.AuditlogMiddleware",
        "rollbar.contrib.django.middleware.RollbarNotifierMiddleware",
        "simple_history.middleware.HistoryRequestMiddleware",
        "duett_api.middleware.MaintenanceMiddleware",
        "duett_api.middleware.AlertStatusMiddleware",
    ]
)

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [os.path.join(BASE_DIR, "config/templates")],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

###
# AWS
########
AWS_REGION = os.environ.get("AWS_REGION")
AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")
AWS_STORAGE_BUCKET_NAME = os.environ.get("AWS_STORAGE_BUCKET_NAME")
AWS_S3_CUSTOM_DOMAIN = os.environ.get("AWS_S3_CUSTOM_DOMAIN")

AWS_ACCESS_KEY = os.environ.get("AWS_ACCESS_KEY")
AWS_SECRET_KEY = os.environ.get("AWS_SECRET_KEY")

###
# Files
########
DEFAULT_FILE_STORAGE = "django_s3_storage.storage.S3Storage"
STATICFILES_STORAGE = "django_s3_storage.storage.StaticS3Storage"

AWS_S3_BUCKET_NAME = os.environ.get("AWS_S3_BUCKET_NAME")  # Used for file uploads
AWS_S3_BUCKET_NAME_STATIC = os.environ.get(
    "AWS_S3_BUCKET_NAME_STATIC"
)  # Used for static files only
AWS_S3_KEY_PREFIX_STATIC = os.environ.get("AWS_S3_KEY_PREFIX_STATIC") or ""

# django-s3-storage setting to disable ACLs for buckets that don't support them
# Set to 'true' (string) to disable ACLs, 'false' or None to enable ACLs
AWS_S3_BUCKET_AUTH = os.environ.get("AWS_S3_BUCKET_AUTH", "false").lower() == "true"

# Construct STATIC_URL safely, handling None/empty values
# Use AWS_REGION if available, otherwise default to us-east-2
if AWS_S3_BUCKET_NAME_STATIC:
    region = AWS_REGION or "us-east-2"
    prefix = f"{AWS_S3_KEY_PREFIX_STATIC}/" if AWS_S3_KEY_PREFIX_STATIC else ""
    STATIC_URL = (
        f"https://{AWS_S3_BUCKET_NAME_STATIC}.s3.{region}.amazonaws.com/{prefix}"
    )
else:
    STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "static")

MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")

###
# Database
########
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql_psycopg2",
        "NAME": os.environ.get("RDS_DB_NAME"),
        "USER": os.environ.get("RDS_USERNAME"),
        "PASSWORD": os.environ.get("RDS_PASSWORD"),
        "HOST": os.environ.get("RDS_HOSTNAME"),
        "PORT": os.environ.get("RDS_PORT"),
    }
}


DEFAULT_AUTO_FIELD = "django.db.models.AutoField"

###
# Email
########
EMAIL_BACKEND = os.environ.get(
    "EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend"
)
EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS")
EMAIL_HOST = os.environ.get("EMAIL_HOST")
EMAIL_PORT = os.environ.get("EMAIL_PORT")
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD")
DEFAULT_FROM_EMAIL = os.environ.get(
    "DEFAULT_FROM_EMAIL", "Duett Notifications <do-not-reply@duett.io>"
)
MAILGUN_WEBHOOK_KEY = os.environ.get("MAILGUN_WEBHOOK_KEY")


# Passwords and Auth

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": False,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "VERIFYING_KEY": None,
    "AUDIENCE": None,
    "ISSUER": None,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
    "TOKEN_TYPE_CLAIM": "token_type",
    "JTI_CLAIM": "jti",
    "SLIDING_TOKEN_REFRESH_EXP_CLAIM": "refresh_exp",
    "SLIDING_TOKEN_LIFETIME": timedelta(minutes=15),
    "SLIDING_TOKEN_REFRESH_LIFETIME": timedelta(days=1),
}

REST_AUTH_REGISTER_SERIALIZERS = {
    "REGISTER_SERIALIZER": "duett_api.users.serializers.UserRegistrationSerializer"
}
REST_AUTH_SERIALIZERS = {
    "USER_DETAILS_SERIALIZER": "duett_api.users.serializers.UserSerializer",
    "PASSWORD_RESET_SERIALIZER": "duett_api.users.serializers.PasswordResetSerializer",
}

REST_USE_JWT = True

JWT_AUTH_COOKIE = "d_auth_cookie"

# allauth options

ACCOUNT_USER_MODEL_USERNAME_FIELD = None
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_AUTHENTICATION_METHOD = "email"
ACCOUNT_EMAIL_REQUIRED = True

# REST Framework

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "dj_rest_auth.jwt_auth.JWTCookieAuthentication",
    ),
    "DEFAULT_FILTER_BACKENDS": ("django_filters.rest_framework.DjangoFilterBackend",),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.LimitOffsetPagination",
    "DATE_INPUT_FORMATS": ["%d-%m-%Y", "%m-%d-%Y", "%m/%d/%Y", "iso-8601"],
    "DATE_FORMAT": "%m-%d-%Y",
}

# Internationalization

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_L10N = True

USE_TZ = True

# Other Options

APPEND_SLASH = True

AUTH_USER_MODEL = "users.User"
OLD_PASSWORD_FIELD_ENABLED = True

INTERNAL_IPS = ["127.0.0.1"]

SWAGGER_SETTINGS = {
    "SECURITY_DEFINITIONS": {
        "api_key": {"type": "apiKey", "in": "header", "name": "Authorization"}
    },
}

DAILY_EMAILS_ENABLED = False

DATA_UPLOAD_MAX_NUMBER_FIELDS = None

SEND_EMAIL_CLOSED_TIME = int(os.environ.get("SEND_EMAIL_CLOSED_TIME", 48))

# celery configurations
CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL")
CELERY_RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND")
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60

# Twilio configurations
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER")

# SEND_PATIENT_REQUEST_REPORTS = os.environ.get("SEND_PATIENT_REQUEST_REPORTS")

# 2FA ADMIN PANEL
TWO_FACTOR_FORCE_OTP_ADMIN = True
LOGIN_URL = "two_factor:login"
LOGIN_REDIRECT_URL = "/admin"

DUETT_ADMIN_EMAIL = os.environ.get("DUETT_ADMIN_EMAIL")
