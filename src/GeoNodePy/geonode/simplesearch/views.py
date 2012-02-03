from django.http import HttpResponse
from django.shortcuts import render_to_response
from django.conf import settings
from django.template import RequestContext

from geonode.maps.views import default_map_config
from geonode.maps.models import *
from geonode.simplesearch.search import combined_search_results

import json

DEFAULT_MAPS_SEARCH_BATCH_SIZE = 10
MAX_MAPS_SEARCH_BATCH_SIZE = 25

def new_search_page(request, **kw):
    DEFAULT_MAP_CONFIG, DEFAULT_BASE_LAYERS = default_map_config(request)
    # for non-ajax requests, render a generic search page

    if request.method == 'GET':
        params = request.GET
    elif request.method == 'POST':
        params = request.POST
    else:
        return HttpResponse(status=405)
    
    if kw:
        params = dict(params)
        params.update(kw)

    map = Map(projection="EPSG:900913", zoom = 1, center_x = 0, center_y = 0)

    counts = {
        'maps' : Map.objects.count(),
        'layers' : Layer.objects.count(),
        'vector' : Layer.objects.filter(storeType='dataStore').count(),
        'raster' : Layer.objects.filter(storeType='coverageStore').count(),
        'users' : Contact.objects.count()
    }
    topics = Layer.objects.all().values_list('topic_category',flat=True)
    topic_cnts = {}
    for t in topics: topic_cnts[t] = topic_cnts.get(t,0) + 1
     
    return render_to_response('maps/new_search.html', RequestContext(request, {
        'init_search': json.dumps(params or {}),
        'viewer_config': json.dumps(map.viewer_json(added_layers=DEFAULT_BASE_LAYERS, authenticated=request.user.is_authenticated())),
        'GOOGLE_API_KEY' : settings.GOOGLE_API_KEY,
        "site" : settings.SITEURL,
        'counts' : counts,
        'users' : User.objects.all(),
        'topics' : topic_cnts,
        'keywords' : Layer.objects.gn_catalog.get_all_keywords()
    }))

def new_search_api(request):
    if request.method == 'GET':
        params = request.GET
    elif request.method == 'POST':
        params = request.POST
    else:
        return HttpResponse(status=405)

    # grab params directly to implement defaults as
    # opposed to panicy django forms behavior.
    query = params.get('q', '')
    try:
        start = int(params.get('start', '0'))
    except:
        start = 0
    try:
        limit = min(int(params.get('limit', DEFAULT_MAPS_SEARCH_BATCH_SIZE)),
                    MAX_MAPS_SEARCH_BATCH_SIZE)
    except:
        limit = DEFAULT_MAPS_SEARCH_BATCH_SIZE
        
    # handle old search link parameters
    if 'sort' in params and 'dir' in params:
        sort_field = params['sort']
        sort_asc = params['dir'] == 'ASC'
    else:    
        sort_field, sort_asc = {
            'newest' : ('last_modified',False),
            'oldest' : ('last_modified',True),
            'alphaaz' : ('title',True),
            'alphaza' : ('title',False),

        }[params.get('sort','newest')]

    filters = {}
    for k in ('bytype','bytopic','bykw'):
        if k in params:
            if params[k]:
                filters[k] = params[k]

    result = _new_search(query, start, limit, sort_field, sort_asc, filters)

    result['success'] = True
    return HttpResponse(json.dumps(result), mimetype="application/json")



def _new_search(query, start, limit, sort_field, sort_asc, filters):
    from time import time
    
    ts = time()

    results = combined_search_results(query, filters)

    filter_fun = []
    # careful when creating lambda or function filters inline like this
    # as multiple filters cannot use the same local variable or they
    # will overwrite each other
    if 'kw' in filters:
        kw = filters['kw']
        filter_fun.append(lambda r: 'keywords' in r and kw in r['keywords'])
    
    for fun in filter_fun:
        results = filter(fun,results)

    # default sort order by id (could be last_modified when external layers are dealt with)
    results.sort(key=lambda r: getattr(r,sort_field),reverse=not sort_asc)

    totalQueryCount = len(results)
    results = results[start:start+limit]
    # unique item id for ext store (this could be done client side)
    iid = start
    for r in results:
        r.iid = iid
        iid += 1
        
    results = map(lambda r: r.as_dict(),results)
        
    ts = time() - ts
    logger.info('generated combined search results in %s',ts)
    return {
        '_time' : ts,
        'rows' : results,
        'total' : totalQueryCount
    }