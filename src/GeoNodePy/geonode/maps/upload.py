from geonode.maps.utils import *
from django import forms
from geonode.maps.models import Map, Layer, MapLayer, Contact, ContactRole, Role

_separator = '\n' + ('-' * 100) + '\n'
#@todo remove title, abstract, permissions, keywords - these are not used in this, but allow compat to old function
def save(layer, base_file, user, overwrite = True, title=None, abstract=None, permissions=None, keywords = []):
    """Upload layer data to Geoserver and registers it with Geonode.

       If specified, the layer given is overwritten, otherwise a new layer is created.
    """
    logger.info(_separator)
    logger.info('Uploading layer: [%s], base filename: [%s]', layer, base_file)

    # Step 0. Verify the file exists
    logger.info('>>> Step 0. Verify if the file %s exists so we can create the layer [%s]' % (base_file, layer))
    if not os.path.exists(base_file):
        msg = ('Could not open %s to save %s. Make sure you are using a valid file' %(base_file, layer))
        logger.warn(msg)
        raise GeoNodeException(msg)

    # Step 1. Figure out a name for the new layer, the one passed might not be valid or being used.
    logger.info('>>> Step 1. Figure out a name for %s', layer)
    name = get_valid_layer_name(layer, overwrite)
    logger.info('figured out name "%s"', name)

    # Step 2. Check that it is uploading to the same resource type as the existing resource
    logger.info('>>> Step 2. Make sure we are not trying to overwrite a existing resource named [%s] with the wrong type', name)
    the_layer_type = layer_type(base_file)

    # Get a short handle to the gsconfig geoserver catalog
    cat = Layer.objects.gs_catalog
    uploader = Layer.objects.gs_uploader

    # Check if the store exists in geoserver
    try:
        store = cat.get_store(name)
    except geoserver.catalog.FailedRequestError, e:
        # There is no store, ergo the road is clear
        pass
    else:
        # If we get a store, we do the following:
        resources = store.get_resources()
        # Is it empty?
        if len(resources) == 0:
            # What should we do about that empty store?
            if overwrite:
                # We can just delete it and recreate it later.
                store.delete()
            else:
                msg = ('The layer exists and the overwrite parameter is %s' % overwrite)
                raise GeoNodeException(msg)
        else:
            # If our resource is already configured in the store it needs to have the right resource type
            for resource in resources:
                if resource.name == name:
                    assert overwrite, "Name already in use and overwrite is False"
                    existing_type = resource.resource_type
                    if existing_type != the_layer_type:
                        msg =  ('Type of uploaded file %s (%s) does not match type '
                            'of existing resource type %s' % (layer_name, the_layer_type, existing_type))
                        logger.info(msg)
                        raise GeoNodeException(msg)

    # Step 3. Identify whether it is vector or raster and which extra files are needed.
    logger.info('>>> Step 3. Identifying if [%s] is vector or raster and gathering extra files', name)
    if the_layer_type == FeatureType.resource_type:
        logger.debug('Uploading vector layer: [%s]', base_file)
        

    elif the_layer_type == Coverage.resource_type:
        logger.debug("Uploading raster layer: [%s]", base_file)
        
    else:
        msg = 'The layer type for name %s is %s. It should be %s or %s,' % (layer_name, the_layer_type,
                                                                            FeatureType.resource_type,
                                                                            Coverage.resource_type)
        logger.warn(msg)
        raise GeoNodeException(msg)

    # Step 4. Create the store in GeoServer
    logger.info('>>> Step 4. Starting upload of [%s] to GeoServer...', base_file)

    error_msg = None
    try:
        import_session = uploader.upload(base_file)
        if not import_session.tasks:
            error_msg = 'No upload tasks were created'
        elif not import_session.tasks[0].items:
            error_msg = 'No upload items found for task'
        # @todo once the random tmp9723481758915 type of name is not around, need to track the name
        # computed above, for now, the target store name can be used
    except Exception, e:
        error_msg = str(e)
        logger.exception('Error during upload')
        
    if error_msg:
        msg = 'Could not save the layer %s, there was an upload error: %s' % (name, error_msg)
        logger.warn(msg)
        raise Exception(msg)
    else:
        logger.debug("Finished upload of [%s] to GeoServer without errors.", name)

    return import_session

    
class TimeForm(forms.Form):
    presentation_strategy = forms.CharField(required=False)
    srs = forms.CharField(required=False)
    precision_value = forms.IntegerField(required=False)
    precision_step = forms.ChoiceField(required=False,choices=[
        ('years',)*2,
        ('months',)*2,
        ('days',)*2,
        ('hours',)*2,
        ('minutes',)*2,
        ('seconds',)*2
    ])
    
    def __init__(self, *args, **kwargs):
        # have to remove these from kwargs or Form gets mad
        time_names = kwargs.pop('time_names',None)
        text_names = kwargs.pop('text_names',None)
        year_names = kwargs.pop('year_names',None)
        super(TimeForm, self).__init__(*args,**kwargs)
        self._build_choice('time_attribute',time_names)
        self._build_choice('text_attribute',text_names)
        if text_names:
            self.fields['text_attribute_format'] = forms.CharField(required=False)
        self._build_choice('year_attribute',year_names)
            
    def _build_choice(self, att, names):
        if names:
            choices =  [ ("","<None>") ] + [ (a,a) for a in names ]
            self.fields[att] = forms.ChoiceField(choices=choices,required=False)
    # @todo implement clean
    
def _create_time_form(req):
    import_session = req.session['import_session']
    feature_type = import_session.tasks[0].items[0].resource
    filter_type = lambda b : [ att.name for att in feature_type.attributes if att.binding == b]
    args = dict(
        time_names = filter_type('java.util.Date'),
        text_names = filter_type('java.lang.String'),
        year_names = filter_type('java.lang.Integer')
    )
    if req.method == 'POST':
        return TimeForm(req.POST,**args)
    return TimeForm(**args)

def _create_db_featurestore():
    """Override the imported method from utils that does too much"""
    cat = Layer.objects.gs_catalog
    try:
        ds = cat.get_store(settings.DB_DATASTORE_NAME)
    except FailedRequestError, e:
        logging.info("Creating target datastore %s",settings.DB_DATASTORE_NAME)
        ds = cat.create_datastore(settings.DB_DATASTORE_NAME)
        ds.connection_parameters.update(
            host=settings.DB_DATASTORE_HOST,
            port=settings.DB_DATASTORE_PORT,
            database=settings.DB_DATASTORE_DATABASE,
            user=settings.DB_DATASTORE_USER,
            passwd=settings.DB_DATASTORE_PASSWORD,
            dbtype=settings.DB_DATASTORE_TYPE)
        cat.save(ds)
        ds = cat.get_store(settings.DB_DATASTORE_NAME)

    return ds
    
def upload_step2_context(req):
    import_session = req.session['import_session']

    context =  {
        'time_form' : _create_time_form(req),
        'layer_name' : import_session.tasks[0].items[0].layer.name
    }

    # check for various recoverable incomplete states
    if import_session.tasks[0].state == 'INCOMPLETE':
        # CRS missing/unknown
        if import_session.tasks[0].items[0].state == 'NO_CRS':
            context['missing_crs'] = True
            # there should be a native_crs
            context['native_crs'] = import_session.tasks[0].items[0].resource.nativeCRS

    return context

def run_import(req):
    import_session = req.session['import_session']
    # if a target datastore is configured, ensure the datastore exists in geoserver
    # and set the uploader target appropriately
    if settings.DB_DATASTORE:
        target = _create_db_featurestore()
        logger.info('setting target datastore %s %s',target.name,target.workspace.name)
        import_session.tasks[0].set_target(target.name,target.workspace.name)
    else:
        target = import_session.tasks[0].target

    update_mode = req.session.get('update_mode',None)
    if update_mode:
        logger.info('setting updateMode to %s',update_mode)
        import_session.tasks[0].set_update_mode(update_mode)

    logger.info('running import session')
    import_session.commit()
    # @todo the importer chooses an available featuretype name late in the game
    # need to reload the item from the uploader and verify the resource.name
    # otherwise things will fail. This happens when the same data is uploaded
    # a second time and the default name is chosen

    # @todo check status of import session - it may fail, but due to protocol,
    # this will not be reported during the commit
    return target
    
def upload_step2(req):
    #
    # handle time dimension form and commit session
    #
    form = _create_time_form(req)
    #@todo validation feedback
    
    
    import_session = req.session['import_session']
    if form.is_valid():
        cleaned = form.cleaned_data
        time_attribute = cleaned.get('time_attribute',None)
        transforms = []
        if not time_attribute:
            time_attribute = cleaned.get('text_attribute',None)
            if time_attribute:
                transforms.append({
                    'type' : 'DateFormatTransform',
                    'field' : time_attribute,
                    'format' : cleaned['text_attribute_format']
                })
        if not time_attribute:
            time_attribute = cleaned.get('year_attribute',None)
            if time_attribute:
                transforms.append({
                    'type' : 'IntegerFieldToDateTransform',
                    'field' : time_attribute
                })
            
        if time_attribute:
            transforms.append({
                'type' : 'CreateIndexTransform',
                'field' : time_attribute
            })
            resource = import_session.tasks[0].items[0].resource
            resource.add_time_dimension_info(
                time_attribute,
                cleaned['presentation_strategy'],
                cleaned['precision_value'],
                cleaned['precision_step']
            )
            logger.info('Setting time dimension info')
            resource.save()
        if transforms:
            logger.info('Setting transforms %s',transforms)
            import_session.tasks[0].items[0].set_transforms(transforms)
            import_session.tasks[0].items[0].save()

        if 'srs' in cleaned:
            srs = cleaned['srs']
            logger.info('Setting SRS to %s',srs)
            import_session.tasks[0].items[0].resource.set_srs(srs)
    else:
        #@todo validation feedback
        raise Exception("form invalid")

    target = run_import(req)
    
    # reload the session to check for status
    logger.info('Reloading session %s to check validity',import_session.id)
    import_session = Layer.objects.gs_uploader.get_session(import_session.id)

    
    # Get a short handle to the gsconfig geoserver catalog
    cat = Layer.objects.gs_catalog

    # @todo iws - session objects
    base_file = req.session['import_base_file']
    files = get_files(base_file)
    
    # Step 7. Create the style and assign it to the created resource
    # FIXME: Put this in gsconfig.py
    
    # @todo see above in save, regarding computed unique name
    name = import_session.tasks[0].items[0].layer.name
    
    logger.info('>>> Step 7. Creating style for [%s]' % name)
    publishing = cat.get_layer(name)
    if publishing is None:
        raise Exception("Expected to find layer named ''%s' in geoserver",name)

    if 'sld' in files:
        f = open(files['sld'], 'r')
        sld = f.read()
        f.close()
    else:
        sld = get_sld_for(publishing)
        
    if sld is not None:
        try:
            cat.create_style(name, sld)
        except geoserver.catalog.ConflictingDataError, e:
            msg = 'There was already a style named %s in GeoServer, cannot overwrite: "%s"' % (name, str(e))
            style = cat.get_style(name)
            logger.warn(msg)
            e.args = (msg,)

        #FIXME: Should we use the fully qualified typename?
        publishing.default_style = cat.get_style(name)
        cat.save(publishing)
    

    # Step 10. Create the Django record for the layer
    logger.info('>>> Step 10. Creating Django record for [%s]', name)
    resource = import_session.tasks[0].items[0].resource
    typename = "%s:%s" % (target.workspace.name, resource.name)
    layer_uuid = str(uuid.uuid1())
    
    # @todo iws - session objects cleanup
    title = req.session['import_form']['layer_title']
    abstract = req.session['import_form']['abstract']
    user = req.user
    
    # @todo hacking - any cached layers might cause problems (maybe delete hook on layer should fix this?)
    cat._cache.clear()
    saved_layer, created = Layer.objects.get_or_create(name=resource.name, defaults=dict(
                                 store=target.name,
                                 storeType=target.resource_type,
                                 typename=typename,
                                 workspace=target.workspace.name,
                                 title=title or resource.title,
                                 uuid=layer_uuid,
                                 abstract=abstract or '',
                                 owner=user,
                                 )
    )
    
    # @todo if layer was not created, need to ensure upload target is same as existing target
    
    logger.info('layer was created : %s',created)

    if created:
        saved_layer.set_default_permissions()

    # Step 9. Create the points of contact records for the layer
    # A user without a profile might be uploading this
    logger.info('>>> Step 9. Creating points of contact records for [%s]', name)
    poc_contact, __ = Contact.objects.get_or_create(user=user,
                                           defaults={"name": user.username })
    author_contact, __ = Contact.objects.get_or_create(user=user,
                                           defaults={"name": user.username })

    logger.debug('Creating poc and author records for %s', poc_contact)

    saved_layer.poc = poc_contact
    saved_layer.metadata_author = author_contact

    saved_layer.save_to_geonetwork()

    # Step 11. Set default permissions on the newly created layer
    # FIXME: Do this as part of the post_save hook
    
    # @todo iws - session objects cleanup
    permissions = req.session['import_form']['permissions']
    logger.info('>>> Step 11. Setting default permissions for [%s]', name)
    if permissions is not None:
        from geonode.maps.views import set_layer_permissions
        set_layer_permissions(saved_layer, permissions)

    # Step 12. Verify the layer was saved correctly and clean up if needed
    logger.info('>>> Step 12. Verifying the layer [%s] was created correctly' % name)

    # Verify the object was saved to the Django database
    try:
        Layer.objects.get(name=name)
    except Layer.DoesNotExist, e:
        msg = ('There was a problem saving the layer %s to GeoNetwork/Django. Error is: %s' % (layer, str(e)))
        logger.exception(msg)
        logger.debug('Attempting to clean up after failed save for layer [%s]', name)
        # Since the layer creation was not successful, we need to clean up
        cleanup(name, layer_uuid)
        raise GeoNodeException(msg)

    # Verify it is correctly linked to GeoServer and GeoNetwork
    try:
        #FIXME: Implement a verify method that makes sure it was saved in both GeoNetwork and GeoServer
        saved_layer.verify()
    except NotImplementedError, e:
        logger.exception('>>> FIXME: Please, if you can write python code, implement "verify()"'
                         'method in geonode.maps.models.Layer')
    except GeoNodeException, e:
        msg = ('The layer [%s] was not correctly saved to GeoNetwork/GeoServer. Error is: %s' % (layer, str(e)))
        logger.exception(msg)
        e.args = (msg,)
        # Deleting the layer
        saved_layer.delete()
        raise
    
    return saved_layer
