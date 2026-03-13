from django.core.management.base import BaseCommand
from django.db.models import Count
from duett_api.users.models import ProviderProfile, Account
from tqdm import tqdm


class Command(BaseCommand):
    help = "Syncs counties for provider profiles based on their existing zip codes"

    def add_arguments(self, parser):
        parser.add_argument(
            "--provider",
            type=int,
            help="Sync specific provider profile by ID",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be done without making changes",
        )

    def get_provider_identifier(self, provider):
        """Get a string to identify the provider in logs"""
        try:
            account = Account.objects.filter(id=provider.account_id).first()
            if account and account.name:
                return account.name
        except Exception:
            pass

        # Fallback identifiers if account name isn't available
        if provider.email:
            return f"Provider (Email: {provider.email})"
        return f"Provider ID: {provider.account_id}"

    def handle(self, *args, **options):
        provider_id = options["provider"]
        dry_run = options["dry_run"]

        # Get queryset based on whether a specific provider was requested
        if provider_id:
            queryset = ProviderProfile.objects.filter(account_id=provider_id)
            if not queryset.exists():
                self.stdout.write(
                    self.style.ERROR(
                        f"Provider profile with ID {provider_id} not found"
                    )
                )
                return
        else:
            queryset = ProviderProfile.objects.all()

        # Get initial counts for reporting
        total_providers = queryset.count()
        self.stdout.write(f"Processing {total_providers} provider profiles...")

        # Track statistics
        updates = 0
        no_changes = 0
        errors = 0
        providers_without_accounts = 0

        for provider in tqdm(queryset):
            try:
                # Check if provider has an account (for statistics only)
                if not Account.objects.filter(id=provider.account_id).exists():
                    providers_without_accounts += 1

                # Get existing counties
                existing_counties = set(provider.counties.all())

                # Get counties from zip codes
                zip_code_counties = set(
                    zip_code.county
                    for zip_code in provider.zip_codes.all()
                    if zip_code.county
                )

                # Calculate differences
                counties_to_add = zip_code_counties - existing_counties

                if counties_to_add:
                    if not dry_run:
                        provider.counties.add(*counties_to_add)
                    updates += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"{self.get_provider_identifier(provider)}: Added {len(counties_to_add)} counties"
                        )
                    )
                else:
                    no_changes += 1

            except Exception as e:
                errors += 1
                self.stdout.write(
                    self.style.ERROR(
                        f"Error processing {self.get_provider_identifier(provider)}: {str(e)}"
                    )
                )

        # Print summary
        self.stdout.write("\nSync Summary:")
        self.stdout.write(f"Total providers processed: {total_providers}")
        self.stdout.write(f"Providers updated: {updates}")
        self.stdout.write(f"Providers unchanged: {no_changes}")
        self.stdout.write(f"Providers without accounts: {providers_without_accounts}")
        self.stdout.write(f"Errors encountered: {errors}")

        if dry_run:
            self.stdout.write(
                self.style.WARNING("This was a dry run. No changes were made.")
            )

        if providers_without_accounts > 0:
            self.stdout.write(
                self.style.WARNING(
                    f"\nFound {providers_without_accounts} provider profiles without valid account references. "
                    "You may want to investigate these records later."
                )
            )
