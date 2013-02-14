/*global Ext, GeoExplorer */
'use strict';
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

        templateLib.abstractText = this.abstractText;
        templateLib.metadataEmptyText = this.metadataEmptyText;
        templateLib.keywordEmptyText = this.keywordEmptyText;
        templateLib.attributionEmptyText = this.attributionEmptyText;
        templateLib.attributionText = this.attributionText;

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
        return new Ext.Template([
            '<div>',
            '{owner:this.renderOwner}',
            '{abstract:this.renderAbstract}',
            '<p>{keywords:this.keywordList}</p>',
            '<span>{thumb:this.renderThumb}<span>',
            '</div>'
            ]
        );
    },

    templateLibrary: {
        // these two methods don't seem to be used anymore, Ask Bart
        // about killing them

        renderAbstract: function (abstract, values) {
            var content = null;
            if (abstract !==  '<p></p>') {
                content = String.format(
                    '<p><strong>{0}</strong>{1}</p>',
                    this.abstractText,
                    abstract
                );
            }
            return content;
        },

        renderThumb: function (thumb, values) {
            return String.format('<img src="{0}">', thumb);
        },

        renderOwner: function (owner, values) {
            return String.format(
                '<p>{0} {1}</p>',
                this.attributionText,
                owner
            );
        },

        keywordList: function (keywords, values) {
            var content = null;
            if (keywords === null || keywords.length === 0) {
                content = String.format('<em>{0}</em>', this.keywordEmptyText);
            } else {
                content = keywords.join(", ");
            }
            return content;
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
