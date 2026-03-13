# flake8: noqa
from .base import *
#INSTANCE_PRIVATE_IP = os.environ.get("INSTANCE_PRIVATE_IP")
ALLOWED_HOSTS = [
    "duett-production-docker.us-east-2.elasticbeanstalk.com",
    "api.duett.io",
]
ALLOWED_CIDR_NETS = ['172.31.0.0/16']

# private_ip = os.environ.get("INSTANCE_PRIVATE_IP")
# if private_ip:
#     ALLOWED_HOSTS.append(private_ip)

CORS_ALLOWED_ORIGINS = ["https://app.duett.io"]

# ROLLBAR Settings
ROLLBAR = {
    "access_token": os.environ.get(
        "ROLLBAR_ACCESS_TOKEN", "671c5108076e46f89c43349064187c5a"
    ),
    "environment": "production",
    "root": BASE_DIR,
}

rollbar.init(**ROLLBAR)
