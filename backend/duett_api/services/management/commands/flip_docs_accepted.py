from django.core.management.base import BaseCommand
from duett_api.users.models import ProviderProfile  # Adjust the import path as needed


class Command(BaseCommand):
    help = "Flips all_docs_accepted to True for all existing ProviderProfiles"

    def handle(self, *args, **options):
        updated_count = ProviderProfile.objects.filter(all_docs_accepted=False).update(
            all_docs_accepted=True
        )

        self.stdout.write(
            self.style.SUCCESS(f"Successfully updated {updated_count} ProviderProfiles")
        )
