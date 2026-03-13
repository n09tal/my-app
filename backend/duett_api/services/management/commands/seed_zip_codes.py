import csv
import os
from django.core.management.base import BaseCommand
from duett_api.services.models import County, ZipCode


class Command(BaseCommand):
    help = (
        "Seed the database with zip codes and their respective counties from a CSV file"
    )

    def handle(self, *args, **kwargs):
        current_directory = os.path.dirname(os.path.abspath(__file__))
        file_path = os.path.join(current_directory, "indiana_zip_codes.csv")

        try:
            with open(file_path, "r") as csvfile:
                reader = csv.reader(csvfile)
                next(reader)
                for row in reader:
                    zip_code, county_name = row
                    county, created = County.objects.get_or_create(name=county_name)

                    zip_instance, created = ZipCode.objects.get_or_create(
                        zip=zip_code, defaults={"county": county}
                    )

                    if created:
                        self.stdout.write(
                            self.style.SUCCESS(
                                f"Successfully added ZIP code {zip_code} for County {county_name}"
                            )
                        )
                    else:
                        if zip_instance.county is None:
                            zip_instance.county = county
                            zip_instance.save()
                            self.stdout.write(
                                self.style.SUCCESS(
                                    f"Updated ZIP code {zip_code} with County {county_name}"
                                )
                            )
                        elif zip_instance.county != county:
                            self.stdout.write(
                                self.style.ERROR(
                                    f"ZIP code {zip_code} already exists and belongs to {zip_instance.county.name}, not {county_name}"
                                )
                            )
                        else:
                            self.stdout.write(
                                self.style.WARNING(
                                    f"ZIP code {zip_code} already exists for County {county_name}"
                                )
                            )
        except FileNotFoundError:
            self.stdout.write(self.style.ERROR(f"File not found at {file_path}"))
