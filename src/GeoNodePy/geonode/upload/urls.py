from django.conf.urls.defaults import *

urlpatterns = patterns('geonode.upload.views',
    url(r'^(?P<step>\w+)?$', 'view', name='data_upload'),
)