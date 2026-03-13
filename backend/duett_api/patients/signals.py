from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db.models import Count

from duett_api.patients.models import PatientRequest, ServiceRequested


@receiver(post_save, sender=ServiceRequested)
def update_patient_request_status(sender, instance, created, **kwargs):
    """
    Update the PatientRequest status to reflect the service requests' statuses
    """
    if not created:
        request = instance.request
        service_requested = request.servicerequested_set.all()
        service_requested_ = service_requested.annotate(interest_count=Count("interests")).all()
        total_count = len(list(service_requested_))
        match_count = sum(sr.match is not None for sr in service_requested)
        interest_count = sum(sr.match is None and sr.interest_count > 0 for sr in service_requested_)
        if match_count == total_count:
            new_status = PatientRequest.Statuses.CLOSED
        elif match_count > 0:
            new_status = PatientRequest.Statuses.PARTIALLY_MATCHED
        elif interest_count > 0:
            new_status = PatientRequest.Statuses.PENDING        
        else:
            new_status = PatientRequest.Statuses.OPEN

        request.status = new_status
        request.save()
