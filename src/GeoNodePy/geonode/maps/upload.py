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

    try:
        import_session = uploader.upload(base_file)
        # @todo once the random tmp9723481758915 type of name is not around, need to track the name
        # computed above, for now, the target store name can be used
    except Exception, e:
        msg = 'Could not save the layer %s, there was an upload error: %s' % (name, str(e))
        logger.warn(msg)
        e.args = (msg,)
        raise
    else:
        logger.debug("Finished upload of [%s] to GeoServer without errors.", name)

    return import_session
    
class TimeForm(forms.Form):
    time_attribute = forms.ChoiceField(required=False)
    presentation_strategy = forms.CharField(required=False)
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
        att_names = kwargs.pop('att_names',None)
        super(TimeForm, self).__init__(*args,**kwargs)
        if att_names:
            choices =  [ ("","<None>") ] + [ (a,a) for a in att_names ]
            self.fields['time_attribute'] = forms.ChoiceField(choices=choices)
    # @todo implement clean
    
def _create_time_form(req):
    import_session = req.session['import_session']
    feature_type = import_session.tasks[0].items[0].resource
    
    #@todo iws - backout filtering of date (but remember to filter the_geom)
    att_names = [ att.name for att in feature_type.attributes if att.binding == 'java.util.Date' ]
    if req.method == 'POST':
        return TimeForm(req.POST,att_names=att_names)
    return TimeForm(att_names=att_names)
    
def upload_step2_context(req):
    return {
        'time_form' : _create_time_form(req)
    }
    
def upload_step2(req):
    #
    # handle time dimension form and commit session
    #
    form = _create_time_form(req)
    #@todo validation feedback
    
    
    import_session = req.session['import_session']
    if form.is_valid():
        cleaned = form.cleaned_data
        if cleaned['time_attribute']:
            resource = import_session.tasks[0].items[0].resource
            resource.add_time_dimension_info(
                cleaned['time_attribute'],
                cleaned['presentation_strategy'],
                cleaned['precision_value'],
                cleaned['precision_step']
                )
            logger.info('Setting time dimension info')
            resource.save()
    logger.info('running import session')
    import_session.commit()
    
    # Get a short handle to the gsconfig geoserver catalog
    cat = Layer.objects.gs_catalog
    
    # @todo iws - this needs to be in a separate step prior to finishing
    # Step 6. Make sure our data always has a valid projection
    # FIXME: Put this in gsconfig.py
    #    logger.info('>>> Step 6. Making sure [%s] has a valid projection' % name)
    #    if gs_resource.latlon_bbox is None:
    #        box = gs_resource.native_bbox[:4]
    #        minx, maxx, miny, maxy = [float(a) for a in box]
    #        if -180 <= minx <= 180 and -180 <= maxx <= 180 and \
    #           -90  <= miny <= 90  and -90  <= maxy <= 90:
    #            logger.warn('GeoServer failed to detect the projection for layer [%s]. Guessing EPSG:4326', name)
    #            # If GeoServer couldn't figure out the projection, we just
    #            # assume it's lat/lon to avoid a bad GeoServer configuration

    #            gs_resource.latlon_bbox = gs_resource.native_bbox
    #            gs_resource.projection = "EPSG:4326"
    #            cat.save(gs_resource)
    #        else:
    #            msg = "GeoServer failed to detect the projection for layer [%s]. It doesn't look like EPSG:4326, so backing out the layer."
    #            logger.warn(msg, name)
    #            cascading_delete(cat, gs_resource)
    #            raise GeoNodeException(msg % name)

    # @todo iws - session objects
    base_file = req.session['import_base_file']
    files = get_files(base_file)
    
    # Step 7. Create the style and assign it to the created resource
    # FIXME: Put this in gsconfig.py
    
    # @todo see above in save, regarding computed unique name
    name = import_session.tasks[0].items[0].layer.name
    
    logger.info('>>> Step 7. Creating style for [%s]' % name)
    publishing = cat.get_layer(name)

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
    target = import_session.tasks[0].target
    resource = import_session.tasks[0].items[0].resource
    typename = "%s:%s" % (target.workspace, resource.name)
    layer_uuid = str(uuid.uuid1())
    
    # @todo iws - session objects
    title = req.session['import_form']['layer_title']
    abstract = req.session['import_form']['abstract']
    user = req.user
    
    # @todo hacking
    cat._cache.clear()
    saved_layer, created = Layer.objects.get_or_create(name=resource.name, defaults=dict(
                                 store=target.name,
                                 storeType=target.target_type,
                                 typename=typename,
                                 workspace=target.workspace,
                                 title=title or resource.title,
                                 uuid=layer_uuid,
                                 keywords='',
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
    
    # @todo iws - session objects
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
