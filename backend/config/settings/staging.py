# flake8: noqa
from .base import *
SECRET_KEY = os.environ.get("SECRET_KEY")
#INSTANCE_PRIVATE_IP = os.environ.get("INSTANCE_PRIVATE_IP")
DEBUG = False
ALLOWED_HOSTS = [
    "staging.api.duett.io",
    "duett-stage-docker-2.us-east-2.elasticbeanstalk.com",
    "duett-stage-docker-1.us-east-2.elasticbeanstalk.com",
]
ALLOWED_CIDR_NETS = ['172.31.0.0/16']

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # So we can connect locally to test
    "https://staging.app.duett.io",
]

# ROLLBAR Settings
ROLLBAR = {
    "access_token": os.environ.get(
        "ROLLBAR_ACCESS_TOKEN", "671c5108076e46f89c43349064187c5a"
    ),
    "environment": "staging",
    "root": BASE_DIR,
}

rollbar.init(**ROLLBAR)
