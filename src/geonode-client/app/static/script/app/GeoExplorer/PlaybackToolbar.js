/**
 * Copyright (c) 2012 OpenGeo
 *
 */

Ext.ns("GeoExplorer");

GeoExplorer.PlaybackToolbar = Ext.extend(gxp.PlaybackToolbar,{
    playbackMode: 'ranged',
    initComponent: function() {
        if(!this.playbackActions){
            this.playbackActions = ["play","slider","loop","fastforward","prev","next"," ","legend","->","settings","|","togglesize"]; 
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
                handler: this.toggleMapSize
            },
            'legend' : {
                iconCls:'gxp-icon-legend',
                handler: this.toggleLegend
            },
            'prev' : {
                iconCls: 'gxp-icon-prev'
            }
        });

        return tools;
    },
    buildPlaybackItems:function(){
        var items = GeoExplorer.PlaybackToolbar.superclass.buildPlaybackItems.call(this);
        return items;
    }
});

Ext.reg('app_playbacktoolbar',GeoExplorer.PlaybackToolbar);