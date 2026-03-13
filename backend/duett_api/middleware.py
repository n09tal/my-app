from django.http import JsonResponse,HttpResponse
from config.settings import base
from django.urls import resolve
from duett_api.patients.models import *
from duett_api.services.models import ZipCode
from django.contrib.auth import get_user_model
import json

class BaseMiddleware(object):
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

MAINTENANCE = base.MAINTENANCE_MODE

class MaintenanceMiddleware(BaseMiddleware):
    def process_view(self, request, view_func, view_args, view_kwargs):
        if MAINTENANCE == True:
            return JsonResponse({'error': 'Service unavailable'}, status=503)

        return None



class AlertStatusMiddleware:

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Process request
        response = self.get_response(request)
        
        # Check if the request path matches the desired pattern
        path_parts = request.path.strip('/').split('/')
        if len(path_parts) == 3 and path_parts[0] == 'api' and path_parts[1] == 'requests' and path_parts[2].isdigit():
            id_value = int(path_parts[2]) 
            try:
                pr = PatientRequest.objects.get(id=id_value)
                user= request.user
                new_alert_message = self.get_alert_status(pr, user)
            except PatientRequest.DoesNotExist:
                new_alert_message = [True]
        try:
        # Process response
            if new_alert_message is not None:
                if True in new_alert_message:
                    new_alert_message = True
                else:
                    new_alert_message = False
                if response.get('Content-Type', '').startswith('application/json'):
                    # Assuming the response is a JSON response
                    data = json.loads(response.content)
                    data['new_alert_message'] = new_alert_message
                    response.content = json.dumps(data)
                    response['Content-Length'] = str(len(response.content))
        except:
            pass
        
        return response
    
    def get_alert_status(self,obj, user):
        ret = []
        account = user.account
        zip_code = obj.patient.zip
        if account.type == Account.Types.Provider:
            if obj.is_archived == 1:
                return [True]
            if obj.status == 3 or obj.status == 4:
                for i in  obj.servicerequested_set.all():
                    if i.match_id:
                        zip_code = ZipCode.objects.get(zip=zip_code)
                        providers = ProviderProfile.objects.filter(zip_codes__zip=zip_code,services=i.service_id).distinct()
                        for provider in providers:
                            try:
                                users = get_user_model().objects.filter(account=provider.account)
                                user_exists = users.filter(id=user.pk).exists()
                                if user_exists:
                                    ret.append(True)
                            except:
                                continue
                        if user_exists:
                            ret.append(True)
                    else:
                        ret.append(False)
            return ret
    

class HealthCheckMiddleware:
    arr=["/health-check/","/health-check"]
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path in self.arr:
            return HttpResponse('ok')
        return self.get_response(request)
