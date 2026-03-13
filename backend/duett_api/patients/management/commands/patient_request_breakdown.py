from datetime import date
from duett_api.services.models import FundingSource, ServiceType, ZipCode
from django.core.management.base import BaseCommand
from django.db.models.fields import CharField
from django.utils import timezone
from duett_api.users.models import User
from duett_api.patients.models import PatientRequest, ServiceRequested
import datetime
from django.db.models import Avg
from auditlog.models import LogEntry


class Command(BaseCommand):   
    def add_arguments(self, parser):  
        parser.add_argument('dimension', type=str)
        parser.add_argument('start_date', type=datetime.date.fromisoformat)
        parser.add_argument('end_date', type=datetime.date.fromisoformat)

    def handle(self, *args, **kwargs):
        dimension = kwargs['dimension']
        start_date = kwargs['start_date']
        end_date = kwargs['end_date']

        funding = FundingSource.objects.filter(created_at__date__range=[start_date, end_date])
        if dimension == "funding_source":
            print("Funding Source | Number of PRs")    
            for fun_d in funding:
                count1 = 0
                s_request = fun_d.funding_source.all() #service_requests
                for req in s_request:
                    fund = req.funding_source
                    try: 
                        req.request
                        count1 = count1+1
                    except:
                        pass
                print(fund,"         |     ",count1)

        elif dimension == "service_type":
            print("Service Type | Number of PRs")
            service_type = ServiceType.objects.filter(created_at__date__range=[start_date, end_date])
            for service in service_type:
                count2 = 0  
                service_request = service.service_type.all() #service request
                for s_request in service_request:
                    ser_vice = s_request.service
                    try: 
                        s_request.request
                        count2 = count2+1
                    except:
                        pass
                print(ser_vice,"         |     ",count2)

        elif dimension == "care_manager_agency":
            print("Care Manager        | Number of PRs")
            manager_user = User.objects.filter(groups=3)      
            count3 = 0
            for user in manager_user:            
                p_request = PatientRequest.objects.filter(refreshed_time__date__range=[start_date, end_date])
                for request in p_request:
                    count3 = count3+1
                print(user,"    |     ",count3)
        
        elif dimension == "zip_code":
                print("Zip Code | Number of PRs")
                zip_code = ZipCode.objects.filter(created_at__date__range=[start_date, end_date])
                count4 = 0 
                for zip in zip_code:
                    provider = zip.zip_code.all() 
                    for prov_ider in provider:
                        service = ServiceRequested.objects.filter(interests=prov_ider)
                        for ser_vice in service:
                            
                            try: 
                                ser_vice.request
                                count4 = count4+1
                            except:
                                pass
                    print(zip,"    |     ",count4)
           
                