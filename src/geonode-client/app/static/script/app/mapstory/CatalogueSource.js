Ext.ns('mapstory.plugins');

mapstory.plugins.CatalogueSource = Ext.extend(gxp.plugins.GeoNodeCatalogueSource, {

    /** api: ptype = ms_cataloguesource */
    ptype: "ms_cataloguesource",

    hidden: false,

    rootProperty: "rows",

    fields: [
        {name: "name"},
        {name: "title"},
        {name: "abstract"},
        {name: "owsUrl", convert: function(v) {
            if (v.indexOf('/wms') !== -1 || v.indexOf('/ows') !== -1) {
                return v;
            } else {
                return v.charAt(v.length-1) === '/' ? v + 'ows' : v + '/ows';
            }
        }}
    ],

    baseParams: {limit: 0, sort: 'alphaaz'},

    createLayerRecord: function(config, callback, scope) {
        var idx = this.store.findExact('name', config.name);
        if (idx === -1) {
            return;
        }
        var rec = this.store.getAt(idx);
        var url = rec.get('owsUrl');
        var name = config.name.indexOf(":") !== -1 ? config.name.split(":")[1] : config.name;
        var source = new gxp.plugins.WMSSource({
            isLazy: function() { return false; },
            hidden: true,
            version: "1.1.1",
            id: Ext.id(),
            url: url
        });
        source.on({
            "ready": function() {
                this.target.createLayerRecord({
                    source: source.id,
                    name: name
                }, callback, scope);
            },
            scope: this
        });
        source.init(this.target);
        this.target.layerSources[source.id] = source;
    }

});

Ext.preg(mapstory.plugins.CatalogueSource.prototype.ptype, mapstory.plugins.CatalogueSource);
