from datetime import date
from duett_api.patients.admin import AuditLogEntryAdmin
from django.core.management.base import BaseCommand
from django.utils import timezone
from duett_api.users.models import User
from duett_api.patients.models import PatientRequest, ServiceRequested
import datetime
import json

from django.db.models import Avg

from duett_api.users.models import ProviderProfile, User
from auditlog.models import LogEntry

class Command(BaseCommand):

    def add_arguments(self, parser):
        parser.add_argument('start_date', type=datetime.date.fromisoformat)
        parser.add_argument('end_date', type=datetime.date.fromisoformat)

    def handle(self, *args, **kwargs):
        start_date = kwargs['start_date']
        end_date = kwargs['end_date']

        profiles = ProviderProfile.objects.filter(created_at__date__range=[start_date, end_date])
        for profile in profiles:
            created_time_list = []
            service_request = profile.interested_services.all()
            intrest = ServiceRequested.objects.filter(interests=profile)
            print("Total number of services requested |",profile,service_request.count())
            print("Number of service requests provider interest in |",intrest.count())
            match = profile.provider_match.all()
            print("Match |",match.count())
            if service_request.count() and intrest.count() != 0:
                ratio_1 = service_request.count()/intrest.count()                
                print("ratio_1 |", ratio_1)

            if intrest.count() and match.count()!= 0:
                ratio_2 = intrest.count()/match.count()                
                print("ratio_2 |", ratio_2)
            for ser_request in intrest: 
                try:
                    pr_id = ser_request.request.id #Patient Request ID
                    log_entry = LogEntry.objects.filter(object_id=pr_id)
                    
                    for entry in log_entry:                    
                        ct = entry.content_type           
                        if ct.model == 'patientrequest': #to confirm the model is PatientRequest
                            changes = json.loads(entry.changes) 
                            if changes.get('status')== ['1', '3']:
                                time = entry.timestamp
                                created_time_list.append(time)
                except:
                    pass
           
            if created_time_list:
                date = sorted(created_time_list)
                second = date[0]
                try:
                    pr_r = PatientRequest.objects.get(id=pr_id)
                    first = pr_r.refreshed_time
                    avg = first + (second-first) / 2    
                    print("Average Time |",avg.time())   
                except:
                    pass

        
        