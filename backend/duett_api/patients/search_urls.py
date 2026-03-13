
from django.urls import path, include,re_path
from .views import CareRequestSearchView,ClientSearchView,ClientHistorySearchView

urlpatterns = [
    re_path(r'clientsearch/(?P<user_id>\d+)/$',ClientSearchView.as_view(),name="client-search"),
    re_path(r'clientsearch/(?P<user_id>\d+)/(?P<search_input>[\w-]+)/$',ClientSearchView.as_view(),name="client-search"),
    re_path(r'carerequestsearch/(?P<user_id>\d+)/$',CareRequestSearchView.as_view(),name="care-request-search"),
    re_path(r'carerequestsearch/(?P<user_id>\d+)/(?P<search_input>[\w-]+)/$',CareRequestSearchView.as_view(),name="care-request-search"),
    re_path(r'^clienthistorysearch/(?P<user_id>\d+)/$',ClientHistorySearchView.as_view(),name='client-history-search'),
    re_path(r'^clienthistorysearch/(?P<user_id>\d+)/(?P<search_input>[\w-]+)/$',ClientHistorySearchView.as_view(),name='client-history-search')
]        