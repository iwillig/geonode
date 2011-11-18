Ext.namespace("GeoExplorer.plugins");

GeoExplorer.plugins.Notes = Ext.extend(gxp.plugins.Tool, {

    /** api: ptype = app_notes */
    ptype: "app_notes",

    iconCls: "gxp-icon-note",

    notesText: "Notes",

    showNotesText: "Show notes",

    featureEditor: null,

    /** api: method[addActions]
     */
    addActions: function() {
        var editor = this.target.tools[this.featureEditor];
        var featureManager = editor.getFeatureManager();
        featureManager.featureLayer.events.on({
            "visibilitychanged": function(evt) {
                Ext.getCmp(this.outputConfig.id).items.get(0).setChecked(evt.object.getVisibility());
            },
            scope: this
        });
        return GeoExplorer.plugins.Notes.superclass.addActions.apply(this, [{
            text: this.notesText,
            iconCls: this.iconCls,
            menu: new Ext.menu.Menu({
                id: this.outputConfig.id,
                items: [
                    new Ext.menu.CheckItem({
                        checked: featureManager.featureLayer.getVisibility(),
                        text: this.showNotesText,
                        listeners: {
                            checkchange: function(item, checked) {
                                if (checked === true) {
                                    featureManager.showLayer(
                                        editor.id, editor.showSelectedOnly && "selected"
                                    );
                                } else {
                                    featureManager.hideLayer(editor.id);
                                }
                            },
                            scope: this
                        }
                    })
                ]
            })
        }]);
    }

});

Ext.preg(GeoExplorer.plugins.Notes.prototype.ptype, GeoExplorer.plugins.Notes);
