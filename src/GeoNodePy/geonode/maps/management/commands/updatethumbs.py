from django.core.management.base import BaseCommand
from geonode.maps.models import Thumbnail
import os

class Command(BaseCommand):
    help = 'Regenerate thumbnails'
    args = '[all]'

    def handle(self, *args, **keywordargs):
        all = 'all' in args
        for t in Thumbnail.objects.all():
            tpath = t.get_thumbnail_path()
            if all or not os.path.exists(tpath) or os.stat(tpath).st_size == 0:
                print "generate thumb for : %s" % t.content_object
                try:
                    t.generate_thumbnail()
                except Exception, ex:
                    print 'warning', ex
