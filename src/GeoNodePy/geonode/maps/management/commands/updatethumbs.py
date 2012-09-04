from django.core.management.base import BaseCommand
from geonode.maps.models import Thumbnail
import os

class Command(BaseCommand):
    help = 'Regenerate thumbnails'
    args = '[all]'

    def handle(self, *args, **keywordargs):
        all = 'all' in args
        for t in Thumbnail.objects.all():
            if all or not os.path.exists(t.get_thumbnail_path()):
                print "generate thumb for : %s" % t.content_object
                t.generate_thumbnail()
