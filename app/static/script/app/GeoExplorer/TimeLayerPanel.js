/**
 * Copyright (c) 2008-2011 The Open Planning Project
 *
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */


/** api: (define)
 *  module = GeoExplorer
 *  class = TimeLayerPanel
 *  base_link = `Ext.TabPanel <http://extjs.com/deploy/dev/docs/?class=Ext.TabPanel>`_
 */
Ext.namespace("GeoExplorer");

/** api: constructor
 *  .. class:: TimeLayerPanel(config)
 *
 *      Create a dialog for setting WMS layer properties like title, abstract,
 *      opacity, transparency, image format and temporal control options.
 */
GeoExplorer.TimeLayerPanel = Ext.extend(gxp.WMSLayerPanel, {
    /** i18n */
    layerPlaybackFieldText : "Add extra playback options",
    playbackModeFieldText : "Playback Mode",

    initComponent : function() {
        var playbackToolbar = app.portal.findByType('gxp_playbacktoolbar');
        playbackToolbar = playbackToolbar.length ? playbackToolbar[0] : app.tools['playback-tool'].playbackToolbar;
        var timeManager = playbackToolbar.timeManager;
        if(!timeManager) {
            timeManager = app.mapPanel.map.getControlsByClass('OpenLayers.Control.TimeManager')[0];
        }
        this.playbackToolbar = playbackToolbar;
        this.timeManager = timeManager;
        GeoExplorer.TimeLayerPanel.superclass.initComponent.call(this);
    },

    /**
     * private: createDisplayPanel Extends the normal display panel to include
     * an option to set layer specific playback options
     */
    createDisplayPanel : function() {
        var config = GeoExplorer.TimeLayerPanel.superclass.createDisplayPanel.call(this);
        config.items.push({
            xtype : 'checkbox',
            ref : '../playbackCheck',
            boxLabel : this.layerPlaybackFieldText,
            //checked: true,
            listeners : {
                check : this.toggleLayerPlaybackMode,
                scope : this
            }
        }, {
            fieldLabel : this.playbackModeFieldText,
            xtype : 'gxp_playbackmodecombo',
            ref : '../playbackModeCombo',
            anchor : '-5',
            disabled : true,
            listeners : {
                'modechange' : this.setPlaybackMode,
                scope : this
            }
        });
        return config;
    },

    toggleLayerPlaybackMode : function(cmp, checked) {
        var layer = this.layerRecord.getLayer();
        var modeCombo = cmp.refOwner.playbackModeCombo;
        if(checked) {
            if(!modeCombo.timeAgents || !modeCombo.timeAgents.length) {
                modeCombo.timeAgents = [this.splitManagerAgents(layer, this.timeManager)];
            }
        }
        modeCombo.setDisabled(!checked);
    },

    setPlaybackMode : function(cmp, mode, agents) {
        if(!this.playbackToolbar.playbackMode){
            this.playbackToolbar.playbackMode = 'track';
        }
        switch(mode) {
            case 'cumulative':
                if(this.playbackToolbar.playbackMode == 'track') {
                    this.playbackToolbar.setPlaybackMode('cumulative');
                }
                break;
            case 'range':
                if(this.playbackToolbar.playbackMode != 'ranged') {
                    this.playbackToolbar.setPlaybackMode('ranged');
                }
                break;
        }
    },

    splitManagerAgents : function(layer, timeManager) {
        timeManager.removeAgentLayer(layer);
        var newAgent = timeManager.buildTimeAgents([layer])[0];
        timeManager.timeAgents.push(newAgent);
        return newAgent;
    }

});

Ext.reg('app_timelayerpanel', GeoExplorer.TimeLayerPanel);
