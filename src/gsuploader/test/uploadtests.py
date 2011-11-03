import os.path
import unittest
from gsuploader.uploader import Uploader
from contextlib import contextmanager
import tempfile
import shutil
import os

def _data_file(name):
    return "test/data/%s" % name

shp_exts = ('dbf','prj','shp','shx')

@contextmanager
def shp_variants(base_name,omit=[],replace=[]):
    tmpdir = tempfile.mkdtemp()
    replace = dict([(os.path.splitext(f)[1],_data_file(f)) for f in replace])
    files = [_data_file("%s.%s" % (base_name,ext)) for ext in shp_exts if not ext in omit ]
    for f in files:
        shutil.copy(replace.get(os.path.splitext(f)[1],f),os.path.join(tmpdir,os.path.basename(f)))
    print os.listdir(tmpdir)
    yield os.path.join(tmpdir,"%s.%s" % (base_name,'shp'))
    shutil.rmtree(tmpdir)

class UploadTests(unittest.TestCase):
    def setUp(self):
        self._uploader = Uploader("http://localhost:8080/geoserver/rest","admin","geoserver")
        self._next_import = self._get_next_import()

    def _get_next_import(self):
        'Get the next import id'
        sessions = self._uploader.get_sessions()
        return sessions and sessions[-1].id or 0

    def test_import_shapefile(self):
        session = self._uploader.upload(_data_file('ivan.shp'))
        self.assertEqual(1,len(session.tasks))
        # check task state, not session state since session state is not updated yet
        self.assertEqual('READY',session.tasks[0].state)
        
        # run import, will raise exception if fail
        session.commit()
        # @todo check geoserver

    def test_import_shapefile_no_prj(self):
        with shp_variants('ivan',omit=['prj']) as data:
            session = self._uploader.upload(data)

        self.assertEqual(1,len(session.tasks))
        # check task state, not session state since session state is not updated yet
        self.assertEqual('INCOMPLETE',session.tasks[0].state)
        self.assertEqual('NO_CRS',session.tasks[0].items[0].state)

        session.tasks[0].items[0].resource.set_srs('EPSG:4326')

        session = self._uploader.get_session(session.id)
        self.assertEqual('EPSG:4326',session.tasks[0].items[0].resource.srs)

if __name__ == "__main__":
    unittest.main(defaultTest='UploadTests.test_import_shapefile_no_prj')
