/**
 * Copyright (c) 2012 OpenGeo
 *
 */

Ext.ns("GeoExplorer");

GeoExplorer.PlaybackToolbar = Ext.extend(gxp.PlaybackToolbar,{
    playbackMode: 'ranged',
    /* i18n */
    prevTooltip: 'Reverse One Frame',
    fullSizeTooltip: 'Fullscreen',
    smallSizeTooltip: 'Back to Smaller Size',
    legendTooltip: 'Show Map Legend',
    editTooltip: 'Edit This Map',
    initComponent: function() {
        if(!this.playbackActions){
            this.playbackActions = [
                "play","slider","loop","fastforward","prev","next",
                {xtype: "tbspacer"},"legend",{xtype:"tbfill"},
                "settings",{xtype: "tbspacer"},"togglesize","edit"]; 
        }
        this.defaults = Ext.applyIf(this.defaults || {},{
            scale: 'large'
        });
        GeoExplorer.PlaybackToolbar.superclass.initComponent.call(this);
    },
    getAvailableTools:function(){
        var tools = GeoExplorer.PlaybackToolbar.superclass.getAvailableTools.call(this);        
        Ext.apply(tools, {
            'modegroup' : {
                xtype : 'buttongroup',
                columns : 3,
                defaults : {
                    handler : this.toggleModes,
                    toggleGroup : 'playback_mode',
                    enableToggle : true
                },
                items : [{
                    text : 'R',
                    pressed : this.playbackMode == 'ranged'
                }, {
                    text : 'C',
                    pressed : this.playbackMode == 'cumulative'
                }, {
                    text : 'S',
                    pressed : this.playbackMode == 'track'
                }]
            },
            'togglesize' : {
                iconCls:'gxp-icon-fullScreen',
                handler: this.toggleMapSize,
                disabled: true
            },
            'legend' : {
                iconCls:'gxp-icon-legend',
                handler: this.toggleLegend,
                tooltip: this.legendTooltip,
                disabled: true
            },
            'prev' : {
                iconCls: 'gxp-icon-prev',
                handler: this.reverseStep,
                scope: this,
                tooltip: this.prevTooltip
            },
            'edit' : {
                iconCls: 'gxp-icon-editMap',
                handler: this.loadComposser,
                scope: this,
                tooltip: this.editTooltip,
                disabled: window.location.href.indexOf('view')>-1
            }
        });

        return tools;
    },
    buildPlaybackItems:function(){
        var items = GeoExplorer.PlaybackToolbar.superclass.buildPlaybackItems.call(this);
        return items;
    },
    toggleMapSize: function(btn,pressed){
        
    },
    toggleLegend:function(btn,pressed){
        
    },
    reverseStep:function(btn,pressed){
        var timeManager = this.control;
        timeManager.stop();
        timeManager.step *= -1;
        timeManager.tick();
        timeManager.step *= -1;
    },
    loadComposser: function(btn){
        window.location.href += '/view';
    }
});

Ext.reg('app_playbacktoolbar',GeoExplorer.PlaybackToolbar);