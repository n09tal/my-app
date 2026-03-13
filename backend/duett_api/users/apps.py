from django.apps import AppConfig

class UsersConfig(AppConfig):
    name = "duett_api.users"

    def ready(self):
       import duett_api.users.signals.handlers
