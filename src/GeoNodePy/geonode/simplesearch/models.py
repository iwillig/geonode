from django.contrib.gis.db import models
from django.contrib.gis.gdal import Envelope
from geonode.maps.models import Layer
from geonode.maps.models import Map
import time

class SpatialTemporalIndex(models.Model):
    time_start = models.BigIntegerField(null=True)
    time_end = models.BigIntegerField(null=True)
    extent = models.PolygonField()
    objects = models.GeoManager() 
    
    class Meta:
        abstract = True
    
class LayerIndex(SpatialTemporalIndex):
    indexed = models.OneToOneField(Layer,related_name='spatial_temporal_index')
    
class MapIndex(SpatialTemporalIndex):
    indexed = models.OneToOneField(Map,related_name='spatial_temporal_index')
    
    
def index_object(obj):
    if type(obj) == Layer:
        index = LayerIndex
        func = index_layer
    elif type(obj) == Map:
        index = MapIndex
        func = index_map
    else:
        raise Exception('cannot index %s' % obj)
    
    try:
        index_obj = index.objects.get(indexed=obj)
    except index.DoesNotExist:
        index_obj = index(indexed=obj)
    
    func(index_obj, obj)
        
def index_layer(index, obj):
    try:
        start, end = obj.get_time_extent()
    except:
        print 'could not get WMS info for %s' % obj.typename
        return
    
    if start:
        index.time_start = convert_time(start)
    if end:
        index.time_end = convert_time(end)
        wms_metadata = obj.metadata()

    min_x, min_y, max_x, max_y = wms_metadata.boundingBoxWGS84
    index.extent = Envelope(min_x,min_y,max_x,max_y).wkt;
    index.save()
    
def convert_time(time_str):
    if time_str[0] == '-':
        raise Exception('cannot handle negative time yet')
    else:
        import re,datetime
        print time_str
        d=datetime.datetime(*map(int, re.split('[^\d]', time_str)[:-1]))
        return time.mktime(d.timetuple())
    
def index_map(index, obj):
    pass

def iso_date_to_int(val):
    pass
    
def int_to_iso_date(val):
    pass