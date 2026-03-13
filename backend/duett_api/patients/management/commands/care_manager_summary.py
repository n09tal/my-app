from datetime import date
from django.core.management.base import BaseCommand
from django.utils import timezone
from duett_api.users.models import User
from duett_api.patients.models import PatientRequest
import datetime

from django.db.models import Avg



from auditlog.models import LogEntry
class Command(BaseCommand):
    help = 'Displays current time'

    def add_arguments(self, parser):
        parser.add_argument('start_date', type=datetime.date.fromisoformat, help='Indicates the number of users to be created')
        parser.add_argument('end_date', type=datetime.date.fromisoformat, help='Indicates the number of users to be created')

    def handle(self, *args, **kwargs):
        start_date = kwargs['start_date']
        end_date = kwargs['end_date']
        manager_user = User.objects.filter(groups=3)      
        lst = []
        for user in manager_user:            
            p_request = PatientRequest.objects.filter(created_by=user,refreshed_time__date__range=[start_date, end_date])
            broken = PatientRequest.objects.filter(created_by=user,status=3,refreshed_time__date__range=[start_date, end_date])
            print(user,"count", p_request.count())
            print(user,"broken_count", broken.count())
            for pr in p_request:
                log_entry = LogEntry.objects.filter(actor=user,object_id=pr.id)
                for entry in log_entry:                    
                    ct = entry.content_type                  
                    if ct.model == 'patientrequest':
                        changes = entry.changes
                        if changes == '{"status": ["1", "3"]}':
                            pr_id = pr.id
                            time = entry.timestamp
                            lst.append(time)
        if lst:
            date = sorted(lst)
            second = date[0]
            pr_r = PatientRequest.objects.get(id=pr_id)
            first = pr_r.refreshed_time
            avg = first + (second-first) / 2    
            print("Average Time",avg.time())   
