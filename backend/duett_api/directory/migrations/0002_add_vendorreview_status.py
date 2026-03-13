# Generated manually to add status field to existing VendorReview table

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("directory", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="vendorreview",
            name="status",
            field=models.CharField(
                choices=[("pending", "Pending"), ("approved", "Approved")],
                default="pending",
                max_length=20,
            ),
        ),
    ]
