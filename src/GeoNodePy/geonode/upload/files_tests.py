import files

import contextlib
import os
import shutil
import tempfile
import unittest
import zipfile

@contextlib.contextmanager
def create_test_files(names, zipped=False):
    tmpdir = tempfile.mkdtemp()
    names = [ os.path.join(tmpdir, f) for f in names ]
    for f in names:
        open(f, 'w').close()
    if zipped:
        basefile = os.path.join(tmpdir,'files.zip')
        zf = zipfile.ZipFile(basefile,'w')
        for f in names:
            zf.write(f)
        zf.close()
        for f in names:
            os.unlink(f)
        names = [basefile]
    yield names
    shutil.rmtree(tmpdir)


class FilesTests(unittest.TestCase):
    
    def test_types(self):
        for t in files.types:
            self.assertTrue(t.code is not None)
            self.assertTrue(t.name is not None)
            self.assertTrue(t.layer_type is not None)
            
    def test_rename_files(self):
        with create_test_files(['junk<y>','notjunky']) as tests:
            renamed = files._rename_files(tests)
            self.assertEqual("junk_y_", renamed[0])
        