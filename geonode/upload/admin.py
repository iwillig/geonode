from geonode.upload.models import Upload, UploadFile

from django.contrib import admin


def import_link(obj):
        return "<a href='%s'>Geoserver Importer Link</a>" % obj.get_import_url()

import_link.short_description = 'Link'
import_link.allow_tags = True

class UploadAdmin(admin.ModelAdmin):
    list_display = ('user','date', 'state', import_link)
    date_hierarchy = 'date'
    list_filter = ('user','state')
    
admin.site.register(Upload, UploadAdmin)
admin.site.register(UploadFile)
