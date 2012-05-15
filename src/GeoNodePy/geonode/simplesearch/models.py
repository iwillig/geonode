from django.contrib.gis.db import models
from django.contrib.gis.gdal import Envelope
from geonode.maps.models import Layer
from geonode.maps.models import Map
from logging import getLogger
from geonode.simplesearch import util

_logger = getLogger(__name__)

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
    
def filter_by_period(index, start, end):
    q = index.objects.all()
    if start:
        q = q.filter(time_start__gte = util.iso_str_to_jdate(start))
    if end:
        q = q.filter(time_end__lte = util.iso_str_to_jdate(end))
    return q
    
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
        _logger.warn('could not get WMS info for %s', obj.typename)
        return
    
    if start:
        index.time_start = util.iso_str_to_jdate(start)
    if end:
        index.time_end = util.iso_str_to_jdate(end)
        
    wms_metadata = obj.metadata()

    min_x, min_y, max_x, max_y = wms_metadata.boundingBoxWGS84
    index.extent = Envelope(min_x,min_y,max_x,max_y).wkt;
    index.save()
    
def index_map(index, obj):
    time_start = None
    time_end = None
    extent = Envelope(0,0,0,0)
    for l in obj.local_layers:
        try:
            start, end = l.get_time_extent()
        except:
            _logger.warn('could not get WMS info for %s', l.typename )
            continue
        if start:
            start = util.iso_str_to_jdate(start)
            if time_start is None:
                time_start = start
            else:
                time_start = min(time_start, start)
        if end:
            end = util.iso_str_to_jdate(end)
            if time_end is None:
                time_end = start
            else:
                time_end = max(time_end, end)
            
        wms_metadata = l.metadata()
                
        extent.expand_to_include(wms_metadata.boundingBoxWGS84)
        
    if time_start:
        index.time_start = time_start
    if time_end:
        index.time_end = time_end
    index.extent = extent.wkt
    index.save()
        
