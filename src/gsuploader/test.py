import sys
sys.path.append('src')
import logging
from gsuploader.uploader import Uploader

logging.basicConfig(level = logging.INFO)
# uploader = Uploader("http://localhost:8080/geoserver/rest","admin","geoserver")  
uploader = Uploader("http://localhost:8001/geoserver/rest","admin","geonode")

if len(sys.argv) > 1:
    fname = unicode(sys.argv[1])
    session = uploader.upload(fname)
    ft = session.tasks[0].items[0].resource
    ft.add_meta_data_entry("time","dimensionInfo",enabled=True,attribute="EndDate",presentation="LIST")
    ft.save()
    #session.commit()
