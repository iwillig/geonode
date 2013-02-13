Ext.namespace("GeoExplorer");

GeoExplorer.CapabilitiesRowExpander = Ext.extend(Ext.grid.RowExpander, {

    abstractText: "UT:Abstract:",
    attributionEmptyText: "UT: No attribution information is provided for this layer.",
    attributionText: "UT:Provided by:",
    downloadText : "UT:Download:",
    keywordEmptyText: "UT: No keywords are listed for this layer.",
    keywordText: "UT:Keywords:",
    metadataEmptyText: 'UT: No metadata URLs are defined for this layer.',
    metadataText: "UT:Metadata Links:",

    /**
     * api: config[ows]
     * ``String`` url of the OWS service providing the layers in the store.
     * Download and preview links will be generated relative to this base URL.
     */
    ows: null,
    
    constructor: function (config) {
        config = config || {};
        config.tpl = config.tpl || this.getDefaultTemplate();

        var expander, templateLib;
        expander = this;
        templateLib = Ext.apply({
            ows: function () {
                return expander.ows;
            }
        }, this.templateLibrary);
        templateLib.metadataEmptyText = this.metadataEmptyText;
        templateLib.keywordEmptyText = this.keywordEmptyText;
        templateLib.attributionEmptyText = this.attributionEmptyText;

        Ext.apply(config.tpl, templateLib);

        GeoExplorer.CapabilitiesRowExpander.superclass.constructor.call(this, config);
        
        this.on("beforeexpand", function(expander, record, body, rowIndex) {
            var store = record.store
            if (store instanceof GeoExt.data.WMSCapabilitiesStore) {
                var request = store.reader.raw.capability.request.describelayer;
                request && Ext.Ajax.request({
                    url: request.href,
                    params: {
                        "REQUEST": "DescribeLayer",
                        "VERSION": store.reader.raw.version,
                        "LAYERS": record.get("layer").params.LAYERS
                    },
                    disableCaching: false,
                    success: function(response) {
                        var describeLayer =
                            new OpenLayers.Format.WMSDescribeLayer().read(
                                response.responseXML &&
                                response.responseXML.documentElement ?
                                    response.responseXML : response.responseText);
                        if (describeLayer.length && describeLayer[0].owsType === "WFS") {
                            Ext.get(
                                Ext.query(".wfs.nodisplay", body)
                            ).removeClass("nodisplay");
                        }
                    },
                    failure: function() {
                        // well, bad luck, but no need to worry
                    },
                    scope: this
                });
                return true;
            };
        }, this);
    },

    /**
     * Get the default template for use when none is provided.  This is a
     * function and not just a variable on the prototype to ensure that 
     *   * changes made to the template instance are localized to one instance
     *       of the expander
     *   * i18n values are applied properly at instantiation time, not 
     *       definition time
     */
    getDefaultTemplate: function() {
        return new Ext.Template(
            '<p><b>' + this.abstractText + '</b> {abstract}</p>' +
            '<p><b>' + this.attributionText + '</b> {attribution:this.attributionLink}</p>'  +
            '<p><b>' + this.metadataText + '</b> {metadataURLs:this.metadataLinks}</p>'  +
            '<p><b>' + this.keywordText + '</b> {keywords:this.keywordList}</p>' + 
            '<img src="{thumb}">'
        );
    },

    templateLibrary: {
        wmsParams: function (name, values, aspect) {
            if (values.llbbox == null) {
                // not a WMS layer
                return;
            }
            // TODO: figure out a good default size and make sure we set the bounds properly.
            aspect = aspect || (8.5 / 11);

            var dx, dy, dataAspect, widthAdjust, heightAdjust;

            dx = values.llbbox[2] - values.llbbox[0];
            dy = values.llbbox[3] - values.llbbox[1];
            dataAspect = dx / dy;

            widthAdjust = 1;
            heightAdjust = 1;

            if (dataAspect > aspect) {
                heightAdjust = dataAspect / aspect;
            } else {
                widthAdjust = aspect / dataAspect;
            }

            return {
                service: "wms",
                request: "GetMap",
                bbox: this.adjustBounds(widthAdjust, heightAdjust, values.llbbox).toString(),
                layers: name,
                srs: "EPSG:4326",
                width: 425, // = 8.5 * 50
                height: 550 // = 11 * 50
            };
        },

        adjustBounds: function (widthAdjust, heightAdjust, bbox) {
            var dx, dy, midx, midy;
            dx = bbox[2] - bbox[0];
            dy = bbox[3] - bbox[1];

            midx = (bbox[2] + bbox[0]) / 2;
            midy = (bbox[3] + bbox[1]) / 2;

            return [midx - (widthAdjust * dx) / 2, midy - (heightAdjust * dy) / 2,
                    midx + (widthAdjust * dx) / 2, midy + (heightAdjust * dy) / 2];
        },

        wfsParams: function (name, values) {
            return {
                service: "wfs",
                request: "GetFeature",
                typeName: name
            };
        },
        
        
        keywordList: function (keywords, values) {
            if (keywords == null ||
                keywords.length === 0) 
            {
                return "<em>" + this.keywordEmptyText + "</em>"; 
            } else {
                return keywords.join(", ");
            }
        },

        attributionLink: function (attribution, values) {
            if (attribution == null || attribution.href == null) {
                return "<em>" + this.attributionEmptyText + "</em>";
            } else {
                return "<a href=\"" + attribution.href + "\"> " + attribution.title + "</a>";
            }
        }
    }
});
