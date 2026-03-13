# Generated manually to add rejected status to VendorReview

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("directory", "0002_add_vendorreview_status"),
    ]

    operations = [
        migrations.AlterField(
            model_name="vendorreview",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("approved", "Approved"),
                    ("rejected", "Rejected"),
                ],
                default="pending",
                max_length=20,
            ),
        ),
    ]
