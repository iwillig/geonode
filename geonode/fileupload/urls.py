from django.conf.urls.defaults import *
from geonode.fileupload.views import PictureCreateView, PictureDeleteView

urlpatterns = patterns('',
    url(r'^new/$', PictureCreateView.as_view(), name='upload-new'),
    url(r'^delete/(?P<pk>\d+)$', PictureDeleteView.as_view(), name='upload-delete'),
)

