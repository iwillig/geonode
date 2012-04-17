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
        if(this.playbackActions.indexOf('legend')>-1){
            this.layerManager = this.addLayerManager();    
        }
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
                toggleHandler: this.toggleMapSize,
                enableToggle: true,
                allowDepress: true,
                disabled: window.location.href.match(/view|new/)!=null,
                scope: this
            },
            'legend' : {
                iconCls:'gxp-icon-legend',
                toggleHandler: this.toggleLegend,
                tooltip: this.legendTooltip,
                enableToggle: true,
                scope: this
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
                disabled: window.location.href.match(/view|new/)!=null
            }
        });

        return tools;
    },
    buildPlaybackItems:function(){
        var items = GeoExplorer.PlaybackToolbar.superclass.buildPlaybackItems.call(this);
        return items;
    },
    toggleMapSize: function(btn,pressed){
        var main = Ext.get('main');
        if(pressed){
            if (!app.portal.originalSize) {
                app.portal.originalSize = app.portal.getSize();
                app.portal.originalXY = app.portal.getPosition();
                app.portal.on({'resize':function(cmp,w,h){
                    this.el.alignTo(app.mapPanel.el, 'bl-bl', [0,-50]);
                },scope:this, delay:250});
                app.portal.el.setStyle({'z-index':1000});
            }
            var headerHeight = Ext.get('header').getHeight() + Ext.get('top-crossbar').getHeight() + Ext.get('crossbar').getHeight();
            var fullBox = {
                width: screen.availWidth,
                height: (screen.availHeight - headerHeight)
            };
            app.portal.setSize(fullBox.width, fullBox.height);
            app.portal.el.alignTo(main,'tl-tl');
            app.mapPanel.addClass('full-mapview');
            btn.btnEl.removeClass('gxp-icon-fullScreen');
            btn.btnEl.addClass('gxp-icon-smallScreen');
            btn.setTooltip(this.smallSizeTooltip);   
        } else {
            app.portal.setSize(app.portal.originalSize);
            app.portal.setPosition(app.portal.originalXY[0],app.portal.originalXY[1]);
            app.mapPanel.removeClass('full-mapview');
            btn.btnEl.removeClass('gxp-icon-smallScreen');
            btn.btnEl.addClass('gxp-icon-fullScreen');
            btn.setTooltip(this.fullSizeTooltip);
        }
        btn.el.removeClass('x-btn-pressed');
    },
    toggleLegend:function(btn,pressed){
        if(!btn.layerPanel){
            btn.layerPanel = this.buildLayerPanel();
        }
        if(pressed){
            btn.layerPanel.show();
            btn.layerPanel.el.alignTo(app.mapPanel.el,'tr-tr',[-5,30]);
        }else{
            btn.layerPanel.hide();
        }
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
    },
    buildLayerPanel: function(btn, pressed){
        var layerPanel = this.layerManager.output[0];
        layerPanel.el.anchorTo(app.mapPanel.el,'tr-tr',[-5,30]);
        return layerPanel  
    },
    addLayerManager: function(){
        var layerManager = new gxp.plugins.LayerManager({
            id:'layermanager-tool',
            outputTarget:'map',
            outputConfig: {
                hidden:true,
                boxMaxWidth: 300,
                plain: true,
                border: false,
                floating: true,
                padding: 5,
                shadow: false
            }
        });
        layerManager.init(app);
        layerManager.addOutput();
        return layerManager;
    }
});

Ext.reg('app_playbacktoolbar',GeoExplorer.PlaybackToolbar);