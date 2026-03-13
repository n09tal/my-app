from django.http import JsonResponse,HttpResponse
from config.settings import base


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
class HealthCheckMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path == '/health-check/':
            return HttpResponse('ok')
        return self.get_response(request)
