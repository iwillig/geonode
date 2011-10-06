import os
import logging
import json

STATE_PENDING = "PENDING"
STATE_READY = "READY"
STATE_RUNNING = "RUNNING"
STATE_INCOMPLETE = "INCOMPLETE"
STATE_COMPLETE = "COMPLETE"

_logger = logging.getLogger("gsuploader")

def parse_response(args):
    headers, response = args
    resp = json.loads(response)
    if "import" in resp:
        return Session(json=resp['import'])
    if "task" in resp:
        return Task(resp['task'])
    raise Exception("Unknown response %s" % resp)

class _UploadBase(object):
    _uploader = None
    def __init__(self,json,parent=None):
        self._parent = parent
        if parent == self:
            raise Exception('bogus')
        self._bind_json(json)
    def _bind(self,json):
        for k in json:
            v = json[k]
            if not isinstance(v,dict):
                setattr(self,k,v)
    def _build(self,json,clazz):
        return [ clazz(j,self) for j in json ]
    def _getuploader(self):
        comp = self
        while comp:
            if comp._uploader:
                return comp._uploader
            comp = comp._parent
    def _url(self,spec,*parts):
        return self._getuploader().client.url( spec % parts )
    def _client(self):
        return self._getuploader().client
    def __repr__(self):
        #@todo hide private fields
        return "%s : %s" % (self.__class__.__name__,vars(self))
        
class Task(_UploadBase):
    def _bind_json(self,json):
        self._bind(json)
        self.source = Source(json['source'],self)
        target = json['target']
        target_type = target.keys
        self.target = Target(json['target'],self)
        self.items = self._build(json['items'],Item)
    def _add_url_part(self,parts):
        parts.append('tasks/%s' % self.id)
    
class Source(_UploadBase):
    def _bind_json(self,json):
        self._bind(json)
        # @todo more
        
class Target(_UploadBase):
    def _bind_json(self,json):
        key,val = json.items()[0]
        self.target_type = key
        self._bind(val)
        self.workspace = val['workspace']['name']
        # @todo more

class Item(_UploadBase):
    def _bind_json(self,json):
        self._bind(json)
        # @todo iws - why is layer nested in another layer
        self.layer = Layer(json['layer']['layer'],self)
        resource = json['resource']
        if 'featureType' in resource:
            self.resource = FeatureType(resource['featureType'],self)
        else:
            raise Exception('not handling resource %s' % resource)
        
class Layer(_UploadBase):
    def _bind_json(self,json):
        self.layer_type = json.pop('type')
        self._bind(json)
        
class FeatureType(_UploadBase):
    resource_type = "featureType"
    def _bind_json(self,json):
        self._bind(json)
        attributes = json['attributes']['attribute'] # why extra
        self.attributes = self._build(attributes,Attribute)
        
    def add_meta_data_entry(self,key,mtype,**kw):
        if not hasattr(self,'metadata'):
            self.metadata = []
        self.metadata.append((key,mtype,kw))
        
    def add_time_dimension_info(self,att_name,presentation,amt,period):
    
        kw = {
            'enabled' : True,
            'attribute' : att_name,
            'presentation' : presentation
        }
        if amt and period:
            mult = {
                'seconds': 1,
                'minutes': 60,
                'hours': 3600,
                'days': 86400,
                'months': 2628000000, # this is the number geoserver computes for 1 month
                'years': 31536000000
            }
            kw['resolution'] = int(amt) * mult[period]
        
        self.add_meta_data_entry('time','dimensionInfo',**kw)
        
    def save(self):
        """@todo,@hack This really only saves meta_data additions and will overwrite existing"""
        item = self._parent
        entry = []
        for m in self.metadata:
            entry.append({
                "@key" : m[0],
                m[1] : m[2]
            })
        data = {
            "item" : {
                "id" : item.id,
                "resource" : {
                    "featureType" : {
                        "metadata" : {
                            "entry": entry
                        }
                    }
                }
            }
        
        }
        self._client().put_json(item.href,json.dumps(data))
        
                
class Attribute(_UploadBase):
    def _bind_json(self,json):
        self._bind(json)

class Session(_UploadBase):
    def __init__(self,json=None):
        self.tasks = []
        if json:
            self.id = json['id']
            if 'tasks' in json:
                self.tasks = self._build(json['tasks'],Task)
                

    def upload_task(self,files):
        """create a task with the provided files"""
        fname = os.path.basename(files[0])
        _,ext = os.path.splitext(fname)
        if ext == '.zip':
            url = self._url("imports/%s/tasks/%s" % (self.id,fname))
            resp = self._client().put_zip(url, payload)
        else:
            url = self._url("imports/%s/tasks" % self.id)
            resp = self._client().post_multipart(url, files)
        task = parse_response( resp )
        task._parent = self
        if not isinstance(task,Task):
            raise Exception("expected Task, got %s" % task)
        self.tasks.append(task)

    def commit(self):
        """complete upload"""
        #@todo check status if we don't have it already
        url = self._url("imports/%s",self.id)
        resp, content = self._client().post(url)
        return resp, content  
    

