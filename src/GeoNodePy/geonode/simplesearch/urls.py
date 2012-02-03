from django.conf.urls.defaults import *

urlpatterns = patterns('geonode.simplesearch.views',
    url(r'^search/?$', 'new_search_page', name='new_search'),
    url(r'^search/api?$', 'new_search_api', name='new_search_api'),
    #override search urls with specific views
    url(r'^data/search$','new_search_page',kwargs={'bytype':'layer'}),
    url(r'^maps/search$','new_search_page',kwargs={'bytype':'map'}),
)