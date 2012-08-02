from django.conf.urls.defaults import patterns, url

urlpatterns = patterns('geonode.printing.views',
    url(r'^templates$', 'printing_template_list', name='printing_templates'),
    url(r'^print/(?P<templateid>\d+)/(?P<mapid>\d+)$', 'printing_print', name='printing_print')
)
