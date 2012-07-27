from bs4 import BeautifulSoup
from django.conf import settings
from geoserver.catalog import Catalog
from gisdata import BAD_DATA
from gisdata import GOOD_DATA
from owslib.wms import WebMapService
from unittest import TestCase
import MultipartPostHandler
import json
import os
import urllib
import urllib2


GEONODE_USER     = 'admin'
GEONODE_PASSWD   = 'admin'
GEONODE_URL      = settings.SITEURL.rstrip('/')
GEOSERVER_URL    = settings.GEOSERVER_BASE_URL
GEOSERVER_USER, GEOSERVER_PASSWD = settings.GEOSERVER_CREDENTIALS


def parse_cookies(cookies):
    res = {}
    for part in cookies.split(';'):
        key, value = part.split('=')
        res[key] = value
    return res


def get_wms(version='1.1.1'):
    """ Function to return an OWSLib WMS object """
    # right now owslib does not support auth for get caps
    # requests. Either we should roll our own or fix owslib
    return WebMapService(
        GEOSERVER_URL + 'wms',
        version=version,
        username=GEOSERVER_USER,
        password=GEOSERVER_PASSWD
    )


class Client(object):
    """client for making http requests"""

    def __init__(self, url, user, passwd):
        self.url = url
        self.user = user
        self.passwd = passwd
        self.opener = self._init_url_opener()

    def _init_url_opener(self):
        auth_handler = urllib2.HTTPBasicAuthHandler()
        auth_handler.add_password(
            realm='GeoNode realm',
            uri='',
            user=self.user,
            passwd=self.passwd
        )

        return urllib2.build_opener(
            auth_handler,
            urllib2.HTTPCookieProcessor,
            MultipartPostHandler.MultipartPostHandler
        )

    def make_request(self, path, data=None):
        req = urllib2.Request(
            url=self.url + path, data=data
        )
        return self.opener.open(req)

    def get(self, path):
        return self.make_request(path)

    def login(self):
        """ Method to login the GeoNode site"""
        params = {'csrfmiddlewaretoken': self.get_crsf_token(),
                  'username': self.user,
                  'next': '/',
                  'password': self.passwd}
        return self.make_request(
            '/accounts/login/',
            data=urllib.urlencode(params)
        )

    def upload_file(self, _file):
        """ function that uploads a file, or a collection of files, to
        the GeoNode"""
        spatial_files = ("dbf_file", "shx_file", "prj_file")

        base, ext = os.path.splitext(_file)
        params = {
            'permissions': '{"anonymous": "layer_readonly", "users": []}',
            'csrfmiddlewaretoken': self.get_crsf_token()
        }

        # deal with shapefiles
        if ext.lower() == '.shp':
            for spatial_file in spatial_files:
                ext, _ = spatial_file.split('_')
                file_path = base + '.' + ext
                # sometimes a shapefile is missing an extra file,
                # allow for that
                if os.path.exists(file_path):
                    params[spatial_file] = open(file_path, 'r')

        params['base_file'] = open(_file, 'r')
        resp = self.make_request('/data/upload/', data=params)
        return (resp, json.loads(resp.read()))

    def get_html(self, path):
        """ Method that make a get request and passes the results to bs4
        Takes a path and returns a tuple
        """
        resp = self.get(path)
        return (resp, BeautifulSoup(resp.read()))

    def get_json(self, path):
        resp = self.get(path)
        return (resp, json.loads(resp.read()))

    def get_crsf_token(self):
        """ Method that makes a request against the home page to get
        the csrf token from the request cookies
        """
        resp = self.get('/')
        cookies = parse_cookies(resp.headers['set-cookie'])
        return cookies.get('csrftoken', None)

    def remove_layer(self, layer_name):
        self.login()
        return self.make_request(
            '/data/geonode:' + layer_name + '/remove',
            data={'csrfmiddlewaretoken': self.get_crsf_token()}
        )


class GeoNodeTest(TestCase):

    def setUp(self):
        self.client = Client(
            GEONODE_URL, GEONODE_USER, GEONODE_PASSWD
        )
        self.catalog = Catalog(
            GEOSERVER_URL + 'rest', GEOSERVER_USER, GEOSERVER_PASSWD
        )
        super(GeoNodeTest, self).setUp()




class TestUpload(GeoNodeTest):

    def check_layer_geonode_page(self, path):
        """ Check that the final layer page render's correctly after
        an layer is uploaded """
        # the final url for uploader process. This does a redirect to
        # the final layer page in geonode
        resp, _ = self.client.get_html(path)
        self.assertTrue('content-type' in resp.headers)
        # if we don't get a content type of html back, thats how we
        # know there was an error.
        self.assertTrue(
            resp.headers['content-type'].startswith('text/html')
        )

    def check_layer_geoserver_caps(self, original_name):
        """ Check that a layer shows up in GeoServer's get
        capabilities document """
        # using owslib
        wms = get_wms()
        name_workspace = 'geonode:{name}'.format(name=original_name)
        self.assertTrue(name_workspace in wms.contents,
                        '%s is not in %s' % (name_workspace, wms.contents))

    def check_layer_geoserver_rest(self, original_name):
        """ Check that a layer shows up in GeoServer rest api after
        the uploader is done"""
        # using gsconfig to test the geoserver rest api.
        layer = self.catalog.get_layer(original_name)
        self.assertIsNotNone(layer is not None)

    def check_and_pass_through_timestep(self, data):
        redirect_to = data['redirect_to']
        self.assertEquals(redirect_to, '/data/upload/time')
        resp = self.client.make_request('/data/upload/time')
        self.assertEquals(resp.code, 200)
        data = {'csrfmiddlewaretoken': self.client.get_crsf_token()}
        resp = self.client.make_request('/data/upload/time', data)
        data = json.loads(resp.read())
        return resp, data

    def check_layer(self, file_path, resp, data):
        """Method to check if a layer was correctly uploaded to the
        GeoNode.

        arguments: file path, the django http response

           Checks to see if a layer is configured in Django
           Checks to see if a layer is configured in GeoServer
               checks the Rest API
               checks the get cap document """

        original_name = os.path.basename(file_path)
        self.assertEquals(resp.code, 200)
        self.assertTrue(isinstance(data, dict))
        # make that the upload returns a success True key
        self.assertTrue(data['success'])
        self.assertTrue('redirect_to' in data)
        redirect_to = data['redirect_to']

        if settings.UPLOADER_SHOW_TIME_STEP:
            resp, data = self.check_and_pass_through_timestep(data)
            self.assertEquals(resp.code, 200)
            self.assertTrue(data['success'])
            self.assertTrue('redirect_to' in data)
            redirect_to = data['redirect_to']

        self.assertEquals(redirect_to, '/data/upload/final')
        self.check_layer_geonode_page(redirect_to)
        # FIXME capabilities doc doesn't show layers if DB_DATASTORE is set
        # don't know why that's the case
        if not settings.DB_DATASTORE:
            self.check_layer_geoserver_caps(original_name)
        self.check_layer_geoserver_rest(original_name)

    def check_invalid_layer(self, _, resp, data):
        """ Makes sure that we got the correct response from an layer
        that can't be uploaded"""
        if settings.UPLOADER_SHOW_TIME_STEP:
            resp, data = self.check_and_pass_through_timestep(data)

        self.assertTrue(resp.code, 200)
        self.assertTrue(not data['success'])
        self.assertEquals(
            data['errors'],
            ['Unexpected exception No projection found']
        )

    def upload_folder_of_files(self, folder, final_check):

        mains = ('.tif', '.shp', '.zip')

        def is_main(_file):
            _, ext = os.path.splitext(_file)
            return (ext.lower() in mains)

        self.client.login()
        main_files = filter(is_main, os.listdir(folder))
        for main in main_files:
            # get the abs path to the file
            _file = os.path.join(folder, main)
            base, _ = os.path.splitext(_file)
            resp, data = self.client.upload_file(_file)
            final_check(base, resp, data)

    def test_successful_layer_upload(self):
        """ Tests if layers can be upload to a running GeoNode GeoServer"""
        vector_path = os.path.join(GOOD_DATA, 'vector')
        raster_path = os.path.join(GOOD_DATA, 'raster')
        self.upload_folder_of_files(vector_path, self.check_layer)
        if not settings.UPLOADER_SHOW_TIME_STEP:
            # skip uploading rasters with time step enabled
            self.upload_folder_of_files(raster_path, self.check_layer)

    def test_invalid_layer_upload(self):
        """ Tests the layers that are invalid and should not be uploaded"""
        # this issue with this test is that the importer supports
        # shapefiles without an .prj
        invalid_path = os.path.join(BAD_DATA)
        self.upload_folder_of_files(invalid_path, self.check_invalid_layer)

    def test_extension_not_implemented(self):
        """Verify a error message is return when an unsupported layer is
        uploaded"""

        # try to upload ourselves
        # a python file is unsupported
        unsupported_path = __file__
        if unsupported_path.endswith('.pyc'):
            unsupported_path = unsupported_path.rstrip('c')

        self.client.login()  # make sure the client is logged in
        resp, data = self.client.upload_file(unsupported_path)
        # currently the upload returns a 200 when there is an error thrown
        self.assertEquals(resp.code, 200)
        self.assertTrue('success' in data)
        self.assertTrue(not data['success'])
        self.assertEquals(
            data['errors'],
            ['Only Shapefiles, GeoTiffs, and CSV files are supported. You '
             'uploaded a .py file']
        )

    def test_repeated_upload(self):
        """Verify that we can upload a shapefile twice """
        shp = os.path.join(GOOD_DATA, 'vector', 'single_point.shp')
        base = 'single_point'
        self.client.login()
        resp, data = self.client.upload_file(shp)
        self.check_layer(base, resp, data)

        # try uploading the same layer twice
        resp, data = self.client.upload_file(shp)
        self.check_layer(base, resp, data)
