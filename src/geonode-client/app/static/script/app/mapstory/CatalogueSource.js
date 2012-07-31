Ext.ns('mapstory.plugins');

mapstory.plugins.CatalogueSource = Ext.extend(gxp.plugins.GeoNodeCatalogueSource, {

    /** api: ptype = ms_cataloguesource */
    ptype: "ms_cataloguesource",

    hidden: false,

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
            lazy: false,
            id: Ext.id(),
            // TODO: make configurable
            url: "/geoserver/geonode/" + name + "/wms?"
        });
        source.init(this.target);
        this.target.layerSources[source.id] = source;
        this.target.createLayerRecord({
            source: source.id,
            name: name
        }, callback, scope);
    }

});

Ext.preg(mapstory.plugins.CatalogueSource.prototype.ptype, mapstory.plugins.CatalogueSource);
