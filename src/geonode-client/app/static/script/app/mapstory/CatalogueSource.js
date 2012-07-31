Ext.ns('mapstory.plugins');

mapstory.plugins.CatalogueSource = Ext.extend(gxp.plugins.GeoNodeCatalogueSource, {

    /** api: ptype = ms_cataloguesource */
    ptype: "ms_cataloguesource",

    rootProperty: "rows",

    asyncCreateLayerRecord: true,

    fields: [
        {name: "name"},
        {name: "title"},
        {name: "abstract"},
        {name: "bounds", mapping: "bbox", convert: function(v) {
            return {
                left: v.minx,
                right: v.maxx,
                bottom: v.miny,
                top: v.maxy
            };
        }},
        {name: "URI", mapping: "download_links", convert: function(v) {
            var result = [];
            for (var i=0,ii=v.length;i<ii;++i) {
                result.push(v[i][2]);
            }
            return result;
        }}
    ],

    baseParams: {limit: 1000000},

    createLayerRecord: function(config, callback, scope) {
        var name = config.name.indexOf(":") !== -1 ? config.name.split(":")[1] : config.name;
        // TODO filter the local source instead as suggested by @ahocevar
        var source = new gxp.plugins.WMSSource({
            isLazy: function() { return false; },
            // TODO: make configurable
            url: "/geoserver/geonode/" + name + "/wms?"
        });
        var record = null;
        source.init(this.target);
        source.on({
            "ready": function() {
                config.name = name;
                record = source.createLayerRecord(config);
                var raw = source.store.reader.raw;
                if (raw) {
                    var capLayers = raw.capability.layers;
                    for (var i=capLayers.length-1; i>=0; --i) {
                        if (capLayers[i].name === name) {
                            record.json.capability = Ext.apply({}, capLayers[i]);
                            var srs = {};
                            srs[this.target.mapPanel.map.getProjection()] = true;
                            // only store the map srs, because this list can be huge
                            record.json.capability.srs = srs;
                            break;
                        }
                    }
                }
                // TODO, make configurable
                record.set("source", "local");
                callback.call(scope || this, record);
            },
            scope: this
        });
    }

});

Ext.preg(mapstory.plugins.CatalogueSource.prototype.ptype, mapstory.plugins.CatalogueSource);
