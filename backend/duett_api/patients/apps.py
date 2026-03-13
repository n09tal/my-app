from django.apps import AppConfig


class PatientsConfig(AppConfig):
    name = "duett_api.patients"

    def ready(self):
        import duett_api.patients.signals
