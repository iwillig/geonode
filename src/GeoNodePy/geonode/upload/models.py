from geonode.maps.models import Layer

from django.conf import settings
from django.contrib.auth.models import User
from django.db import models

import cPickle as pickle
from datetime import datetime
import logging
from os import path
import shutil


class UploadManager(models.Manager):
    def __init__(self):
        models.Manager.__init__(self)
        
    def update_from_session(self, import_session):
        self.get(import_id = import_session.id).update_from_session(import_session)
        
    def create_from_session(self, user, import_session):
        return self.create(
            user = user, 
            import_id = import_session.id, 
            state= import_session.state)
            
    def get_incomplete_uploads(self, user):
        return self.filter(user=user, complete=False)
    
        
class Upload(models.Model):
    objects = UploadManager()
    
    import_id = models.BigIntegerField(null=True)
    user = models.ForeignKey(User, null=True)
    state = models.CharField(max_length=16)
    date = models.DateTimeField('date', default = datetime.now)
    layer = models.ForeignKey(Layer, null=True)
    upload_dir = models.CharField(max_length=100, null=True)
    name = models.CharField(max_length=64, null=True)
    complete = models.BooleanField(default = False)
    session = models.TextField(null=True)
    
    def get_session(self):
        if self.session:
            return pickle.load(self.session)
    
    def update_from_session(self, import_session):
        self.state = import_session.state
        if "COMPLETE" == self.state:
            self.complete = True
            self.session = None
        self.date = datetime.now()
        self.session = pickle.dumps(import_session)
        self.save()
        
    def get_import_url(self):
        return "%srest/imports/%s" % (settings.GEOSERVER_BASE_URL, self.import_id)
    
    def delete(self, cascade=True):
        models.Model.delete(self)
        if cascade:
            session = Layer.objects.gs_uploader.get_session(self.import_id)
            if session:
                try:
                    session.delete()
                except:
                    logging.exception('error deleting upload session')
            if self.upload_dir and path.exists(self.upload_dir):
                shutil.rmtree(self.upload_dir)