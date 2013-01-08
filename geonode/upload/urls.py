from django.conf.urls.defaults import *
from geonode.upload.views import UploadFileCreateView, UploadFileDeleteView

urlpatterns = patterns('geonode.upload.views',
    url(r'^new/$', UploadFileCreateView.as_view(), name='data_upload_new'),
    url(r'^progress$', 'data_upload_progress', name='data_upload_progress'),
    url(r'^(?P<step>\w+)?$', 'view', name='data_upload'),
    url(r'^delete/(?P<id>\d+)?$', 'delete', name='data_upload_delete'),
    url(r'^remove/(?P<pk>\d+)$', UploadFileDeleteView.as_view(), name='data_upload_remove'),
)
