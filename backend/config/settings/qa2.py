# flake8: noqa
from .base import *

SECRET_KEY = os.environ.get("SECRET_KEY")

if not AWS_S3_BUCKET_NAME and AWS_S3_BUCKET_NAME_STATIC:
    AWS_S3_BUCKET_NAME = AWS_S3_BUCKET_NAME_STATIC
# INSTANCE_PRIVATE_IP = os.environ.get("INSTANCE_PRIVATE_IP")
DEBUG = False
ALLOWED_HOSTS = [
    "duett-qa2.eba-rjpputhm.us-east-2.elasticbeanstalk.com",
    "qa2.api.duett.io",
]
ALLOWED_CIDR_NETS = ["172.31.0.0/16"]

# private_ip = os.environ.get("INSTANCE_PRIVATE_IP")
# if private_ip:
#     ALLOWED_HOSTS.append(private_ip)

# load_balancer_ip = os.environ.get("LOAD_BALANCER_IP")

# if load_balancer_ip:
#     ALLOWED_HOSTS.append(load_balancer_ip)

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # So we can connect locally to test
    "https://qa2.app.duett.io",
    "https://127.0.0.1",
    "http://127.0.0.1",
    "https://peaceful-fox-8f97bf.netlify.app",  # TODO remove once Duett hosts Care4Me, this is the RHIT team's temporary frontend
]

SITE_ID = 2  # Update with actual SITE_ID after creating site in admin

# ROLLBAR Settings
ROLLBAR = {
    "access_token": os.environ.get(
        "ROLLBAR_ACCESS_TOKEN", "671c5108076e46f89c43349064187c5a"
    ),
    "environment": "qa2",
    "root": BASE_DIR,
}

rollbar.init(**ROLLBAR)
