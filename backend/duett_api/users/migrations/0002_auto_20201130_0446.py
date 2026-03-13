from django.db import migrations


def create_groups(apps, schema_editor):
    Group = apps.get_model("auth.Group")
    Group.objects.bulk_create(
        [
            Group(name="Care Agency Admin"),
            Group(name="Care Manager Supervisor"),
            Group(name="Care Manager"),
            Group(name="Care Provider"),
        ]
    )


def revert_groups(apps, schema_editor):
    Group = apps.get_model("auth.Group")
    Group.objects.filter(
        name__in=[
            "Care Agency Admin",
            "Care Manager Supervisor",
            "Care Manager",
            "Care Provider",
        ]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(create_groups, revert_groups),
    ]
