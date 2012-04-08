var set_thumbnail = Ext.get("set_thumbnail");
function promptThumbnail() {
    var img = '<img src="' + randURL() + '">';
    Ext.MessageBox.show({
       title:'Generate Thumbnail?',
       msg: 'This will generate a new thumbnail. The existing one is shown below.<div>' + img + '</div>',
       buttons: Ext.MessageBox.OKCANCEL,
       fn: function(buttonId) {
           if (buttonId == 'ok') {
               updateThumbnail(true);
           }
       },
       icon: Ext.MessageBox.QUESTION
    });
}

function randURL() {
   if (thumbURL.indexOf('?') >= 0) {
       return thumbURL + "&_=" + Math.random();
   }
   return thumbURL + "?_=" + Math.random();
}

function updateThumbnail(interactive) {
    var map = Ext.get(Ext.query(".olMapViewport")[0]);
    map = new Ext.Element(map.dom.cloneNode(true));
    // walk through and strip controls
    map.select('*').each(function(e,i) {
        e.getAttribute('class').indexOf('olControl') >= 0 && e.remove();
    });
    var html = Ext.DomHelper.markup({
        style: {
            width: map.getWidth(), height:map.getHeight()
        },
        html: map.dom.innerHTML
    });
    if (interactive) {
        Ext.MessageBox.wait("Generating Thumbnail","Please wait while the thumbnail is generated.");
    }
    Ext.Ajax.request({
      url : thumbURL,
      method : "POST",
      xmlData: html,
      success: function() {
          if (interactive) {
            Ext.MessageBox.show({
                title : "Thumbnail Updated",
                msg : '<img src="' + randURL() + '">',
                buttons: Ext.MessageBox.OK
            });
          }
      }
    });
}
if (set_thumbnail) {
    set_thumbnail.on("click",function(ev) {
       ev.stopEvent();
       promptThumbnail();
    });
    if (!hasThumb) {
        var loadCnt = 0, toLoad = 0;
        function checkload(layer) {
            layer.events.unregister('loadend',null, checkload);
            if (++loadCnt == toLoad) {
                updateThumbnail(false);
            }
        }
        app.mapPanel.map.events.register("addlayer",null,function(ev) {
            if (ev.layer.visibility) {
                toLoad++;
                ev.layer.events.register("loadend",null,function(ev) {
                    checkload(ev.object);
                });
            }
        });
    }
}