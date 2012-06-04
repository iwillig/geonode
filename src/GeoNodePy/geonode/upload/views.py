"""
Provide views for doing an upload.

The upload process may be multi step so views are all handled internally here
by the view function.

The pattern to support separation of view/logic is each step in the upload
process is suffixed with "_step". The view for that step is suffixed with
"_step_view". The goal of seperation of view/logic is to support various
programatic uses of this API. The logic steps should not accept request objects
or return response objects.

State is stored in a UploaderSession object stored in the user's session.
This needs to be made more stateful by adding a model.
"""
from geonode.maps.utils import *
from geonode.maps.models import *
from geonode.maps.forms import NewLayerUploadForm
from geonode.maps.views import json_response
from geonode.upload.upload import *

from django import forms
from django.conf import settings
from django.http import HttpResponse, HttpResponseRedirect
from django.utils.html import escape
from django.core.urlresolvers import reverse
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.contrib.auth.decorators import login_required

import json
import os


_SESSION_KEY = 'geonode_upload_session'
_ALLOW_TIME_STEP = hasattr(settings, "UPLOADER_SHOW_TIME_STEP") and settings.UPLOADER_SHOW_TIME_STEP or False
_ASYNC_UPLOAD = settings.DB_DATASTORE == True

# at the moment, the various time support transformations require the database
if _ALLOW_TIME_STEP and not _ASYNC_UPLOAD:
    raise Exception("To support the time step, you must enable DB_DATASTORE")

def _progress_redirect(step, endpoint):
    return json_response(dict(
        success = True,
        redirect_to= reverse('data_upload', args=[step]),
        progress = endpoint
    ))

def _redirect(step):
    return json_response(redirect_to=reverse('data_upload', args=[step]))


class TimeForm(forms.Form):
    presentation_strategy = forms.CharField(required=False)
    srs = forms.CharField(required=False)
    precision_value = forms.IntegerField(required=False)
    precision_step = forms.ChoiceField(required=False, choices=[
        ('years',)*2,
        ('months',)*2,
        ('days',)*2,
        ('hours',)*2,
        ('minutes',)*2,
        ('seconds',)*2
    ])

    def __init__(self, *args, **kwargs):
        # have to remove these from kwargs or Form gets mad
        time_names = kwargs.pop('time_names', None)
        text_names = kwargs.pop('text_names', None)
        year_names = kwargs.pop('year_names', None)
        super(TimeForm, self).__init__(*args, **kwargs)
        self._build_choice('time_attribute', time_names)
        self._build_choice('end_time_attribute', time_names)
        self._build_choice('text_attribute', text_names)
        self._build_choice('end_text_attribute', text_names)
        if text_names:
            self.fields['text_attribute_format'] = forms.CharField(required=False)
        self._build_choice('year_attribute', year_names)
        self._build_choice('end_year_attribute', year_names)

    def _build_choice(self, att, names):
        if names:
            choices = [('', '<None>')] + [(a, a) for a in names]
            self.fields[att] = forms.ChoiceField(
                choices=choices, required=False)
    # @todo implement clean


def _create_time_form(import_session, form_data):
    feature_type = import_session.tasks[0].items[0].resource
    filter_type = lambda b : [ att.name for att in feature_type.attributes if att.binding == b]

    args = dict(
        time_names=filter_type('java.util.Date'),
        text_names=filter_type('java.lang.String'),
        year_names=filter_type('java.lang.Integer') +
          filter_type('java.lang.Long') +
          filter_type('java.lang.Double')
    )
    if form_data:
        return TimeForm(form_data, **args)
    return TimeForm(**args)


def save_step_view(req, session):
    if req.method == 'GET':
        s = os.statvfs('/')
        mb = s.f_bsize * s.f_bavail / (1024. * 1024)
        return render_to_response('upload/layer_upload.html',
            RequestContext(req, {
            'storage_remaining': "%d MB" % mb,
            'enough_storage': mb > 64,
            'async_upload' : _ASYNC_UPLOAD
        }))
        
    assert session is None

    form = NewLayerUploadForm(req.POST, req.FILES)
    tempdir = None
    if form.is_valid():
        tempdir, base_file = form.write_files()
        base_file = rename_and_prepare(base_file)
        name, __ = os.path.splitext(os.path.basename(base_file))
        import_session = save_step(req.user, name, base_file, overwrite=False)
        upload_session = req.session[_SESSION_KEY] = UploaderSession(
            tempdir=tempdir,
            base_file=base_file,
            name=name,
            import_session=import_session,
            layer_abstract=form.cleaned_data["abstract"],
            layer_title=form.cleaned_data["layer_title"],
            permissions=form.cleaned_data["permissions"]
        )
        if _ALLOW_TIME_STEP:
            return _redirect('time')
        
        return run_response(upload_session, True)
    else:
        errors = []
        for e in form.errors.values():
            errors.extend([escape(v) for v in e])
        return json_response(errors=errors)


def data_upload_progress(req, upload_session):
    """This would not be needed if geoserver REST did not require admin role
    and is an inefficient way of getting this information"""
    import_session = upload_session.import_session
    progress = import_session.tasks[0].items[0].get_progress()
    return HttpResponse(json.dumps(progress), "application/json")


def time_step_context(import_session, form_data):
    """Create the context for the time step view"""

    context = {
        'time_form': _create_time_form(import_session, form_data),
        'layer_name': import_session.tasks[0].items[0].layer.name,
        'async_upload' : _ASYNC_UPLOAD
    }

    # check for various recoverable incomplete states
    if import_session.tasks[0].state == 'INCOMPLETE':
        # CRS missing/unknown
        if import_session.tasks[0].items[0].state == 'NO_CRS':
            context['missing_crs'] = True
            # there should be a native_crs
            context['native_crs'] = import_session.tasks[0].items[0].resource.nativeCRS

    return context


def time_step_view(request, upload_session):
    if request.method == 'GET':
        return render_to_response('upload/layer_upload_time.html',
            RequestContext(
                request,
                time_step_context(
                    upload_session.import_session, form_data=None)
                )
        )
    elif request.method != 'POST':
        raise Exception()

    import_session = upload_session.import_session

    form = _create_time_form(import_session, request.POST)
    #@todo validation feedback
    if not form.is_valid():
        raise Exception("form invalid")

    cleaned = form.cleaned_data

    time_attribute, time_transform_type = None, None
    end_time_attribute, end_time_transform_type = None, None

    field_collectors = [
        ('time_attribute', None),
        ('text_attribute', 'DateFormatTransform'),
        ('year_attribute', 'IntegerFieldToDateTransform')
    ]

    for field, transform_type in field_collectors:
        time_attribute = cleaned.get(field, None)
        if time_attribute:
            time_transform_type = transform_type
            break
    for field, transform_type in field_collectors:
        end_time_attribute = cleaned.get('end_' + field, None)
        if end_time_attribute:
            end_time_transform_type = transform_type
            break

    try:
        time_step(
            upload_session,
            time_attribute=time_attribute,
            time_transform_type=time_transform_type,
            time_format=cleaned.get('text_attribute_format', None),
            end_time_attribute=end_time_attribute,
            end_time_transform_type=end_time_transform_type,
            end_time_format=cleaned.get('end_text_attribute_format', None),
            presentation_strategy=cleaned['presentation_strategy'],
            precision_value=cleaned['precision_value'],
            precision_step=cleaned['precision_step'],
            srs=cleaned.get('srs', None)
        )
    except Exception, ex:
        return json_response(exception=ex)

    return run_response(upload_session, False)


def run_response(upload_session, ext_resp):
    '''run the upload_session and respond
    ext_resp: if True, reply using extjs json
    '''
    try:
        target = run_import(upload_session, _ASYNC_UPLOAD)
    except Exception, ex:
        return json_response(exception=ex)

    upload_session.set_target(target)

    if _ASYNC_UPLOAD:
        return _progress_redirect('final', reverse(
            'data_upload', args=['progress']
        ))
    if ext_resp:
        # in order for ext.js to correctly parse a json response with a
        # file uploader, we must return a content type of text/html
        # for more information please see the ext.js document.
        # http://docs.sencha.com/ext-js/3-4/#!/api/Ext.form.BasicForm-cfg-fileUpload

        return HttpResponse(
            simplejson.dumps(
                {'success': True,
                 'redirect_to': reverse('data_upload', args=['final'])}),
                 content_type='text/html'
            )

    return HttpResponseRedirect(reverse('data_upload', args=['final']))


def final_step_view(req, upload_session):
    saved_layer = final_step(upload_session, req.user)
    return HttpResponseRedirect(saved_layer.get_absolute_url() + "?describe")


_steps = {
    'save': save_step_view,
    'progress': data_upload_progress,
    'time': time_step_view,
    'final': final_step_view
}

@login_required
def view(req, step):
    """Main uploader view"""

    upload_session = None

    if step is None:
        step = 'save'

        # @todo should warn user if session is being abandoned!
        if _SESSION_KEY in req.session:
            del req.session[_SESSION_KEY]

    else:
        # Should we use an exception here?
        assert _SESSION_KEY in req.session, 'Expected uploader session for step %s' % step
        upload_session = req.session[_SESSION_KEY]

    try:
        resp = _steps[step](req, upload_session)
        if upload_session:
            req.session[_SESSION_KEY] = upload_session
            Upload.objects.update_from_session(upload_session.import_session)
        return resp
    except Exception, e:
        if upload_session:
            upload_session.cleanup()
        return json_response('Error in upload step : %s', exception=e)
