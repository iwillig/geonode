from django.conf.urls.defaults import *

urlpatterns = patterns('geonode.simplesearch.views',
    url(r'^search/?$', 'new_search_page', name='new_search'),
    url(r'^search/api?$', 'new_search_api', name='new_search_api'),
    url(r'^search/sapi?$', 'new_search_api_reduced', name='new_search_api_reduced'),
    #override search urls with specific views
    url(r'^data/search$','new_search_page',kwargs={'bytype':'layer'}, name='search_layers'),
    url(r'^maps/search$','new_search_page',kwargs={'bytype':'map'}, name='search_maps'),
)