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
        return GeoExplorer.plugins.Notes.superclass.addActions.apply(this, [{
            text: this.notesText,
            iconCls: this.iconCls,
            menu: new Ext.menu.Menu({
                id: this.outputConfig.id,
                items: [
                    new Ext.menu.CheckItem({
                        text: this.showNotesText,
                        listeners: {
                            checkchange: function(item, checked) {
                                var editor = this.target.tools[this.featureEditor];
                                var featureManager = editor.getFeatureManager();
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
