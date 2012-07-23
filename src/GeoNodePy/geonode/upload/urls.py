from django.conf.urls.defaults import *

urlpatterns = patterns('geonode.upload.views',
    url(r'^(?P<step>\w+)?$', 'view', name='data_upload'),
    url(r'^delete/(?P<id>\d+)?$', 'delete', name='data_upload_delete'),
)