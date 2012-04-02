/**
 * Copyright (c) 2012 OpenGeo
 */

// http://www.sencha.com/forum/showthread.php?141254-Ext.Slider-not-working-properly-in-IE9
// TODO re-evaluate once we move to Ext 4
Ext.override(Ext.dd.DragTracker, {
    onMouseMove: function (e, target) {
        if (this.active && Ext.isIE && !Ext.isIE9 && !e.browserEvent.button) {
            e.preventDefault();
            this.onMouseUp(e);
            return;
        }
        e.preventDefault();
        var xy = e.getXY(), s = this.startXY;
        this.lastXY = xy;
        if (!this.active) {
            if (Math.abs(s[0] - xy[0]) > this.tolerance || Math.abs(s[1] - xy[1]) > this.tolerance) {
                this.triggerStart(e);
            } else {
                return;
            }
        }
        this.fireEvent('mousemove', this, e);
        this.onDrag(e);
        this.fireEvent('drag', this, e);
    }
});
/**
 * Constructor: GeoNodeViewer
 * Create a new GeonodeViewer application.
 *
 * Parameters:
 * config - {Object} Optional application configuration properties.
 *
 * Valid config properties:
 * map - {Object} Map configuration object.
 * ows - {String} OWS URL
 *
 * Valid map config properties:
 * layers - {Array} A list of layer configuration objects.
 * center - {Array} A two item array with center coordinates.
 * zoom - {Number} An initial zoom level.
 *
 * Valid layer config properties:
 * name - {String} Required WMS layer name.
 * title - {String} Optional title to display for layer.
 */
var GeonodeViewer = Ext.extend(gxp.Viewer, {
        loadConfig: function(config, callback) {
        var hasConfig = !!config;
        config = Ext.apply(config || {}, {
                proxy: "/proxy/?url=",
                rest: "/maps/"
            });
        if(hasConfig){
            callback.call(this,config);
        }
        else{
            
                    Ext.Ajax.request({
                url: window.location.href.split("?")[0].replace(/\/view|\/embed|(\/new)|([0-9])$/, "$1$2/data"),
                success: function(response) {
                    var loadedConfig = Ext.decode(response.responseText, true);
                    Ext.apply(config, loadedConfig);
                    this.mapID = config.id;
                    callback.call(this, config);
                },
                scope: this
            });
        }
        },
        applyConfig: function(config){
            var defaultTools = this.createDefaultTools(config, this.toggleGroup);
            config.tools = config.tools || [];
                    var ptypes = Ext.pluck(config.tools,'ptype');
                    Ext.each(defaultTools,function(cfg){
                        if(ptypes.indexOf(cfg.ptype)==-1){
                            config.tools.push(cfg);
                        }
                    });
                    GeonodeViewer.superclass.applyConfig.call(this, config);
        },
        getDefaultTools: function(config, toggleGroup){
            return config.tools || [];
        },
        /**
     * Method: initPortal
     * Create the various parts that compose the layout.
     */
    initPortal: function() {
        this.on("ready", function() {
            this.mapPanel.layers.on({
                "update": function() {this.modified |= 1;},
                "add": function() {this.modified |= 1;},
                "remove": function(store, rec) {
                    this.modified |= 1;
                },
                scope: this
            });
        });
        GeonodeViewer.superclass.initPortal.call(this);
},
        updateURL: function() {
        /* PUT to this url to update an existing map */
        return this.rest + this.mapID + '/data';
    },

    /** api: method[save]
     *  :arg as: ''Boolean'' True if map should be "Saved as..."
     *
     *  Subclasses that load config asynchronously can override this to load
     *  any configuration before applyConfig is called.
     */
    save: function(as){
        var config = this.getState();
        
        if (!this.mapID || as) {
            /* create a new map */ 
            Ext.Ajax.request({
                url: this.rest,
                method: 'POST',
                jsonData: config,
                success: function(response, options) {
                    var id = response.getResponseHeader("Location");
                    // trim whitespace to avoid Safari issue where the trailing newline is included
                    id = id.replace(/^\s*/,'');
                    id = id.replace(/\s*$/,'');
                    id = id.match(/[\d]*$/)[0];
                    this.mapID = id; //id is url, not mapID
                    this.fireEvent("saved", id);
                }, 
                scope: this
            });
        }
        else {
            /* save an existing map */
            Ext.Ajax.request({
                url: this.updateURL(),
                method: 'PUT',
                jsonData: config,
                success: function(response, options) {
                    /* nothing for now */
                    this.fireEvent("saved", this.mapID);
                }, 
                scope: this
            });         
        }
    }
}):
