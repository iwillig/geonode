Ext.ns('GeoExplorer.slider');

GeoExplorer.slider.FilledSlider = Ext.extend(Ext.slider.MultiSlider,{
    // private override
    onRender : function() {
        this.autoEl = {
            cls: 'x-slider ' + (this.vertical ? 'x-slider-vert' : 'x-slider-horz'),
            cn : {
                cls: 'x-slider-end',
                cn : {
                    cls:'x-slider-inner',
                    cn : [{tag:'a', cls:'x-slider-focus', href:"#", tabIndex: '-1', hidefocus:'on'}]
                }
            }
        };

        Ext.slider.MultiSlider.superclass.onRender.apply(this, arguments);

        this.endEl   = this.el.first();
        this.innerEl = this.endEl.first();
        this.focusEl = this.innerEl.child('.x-slider-focus');

        //render each thumb
        for (var i=0; i < this.thumbs.length; i++) {
            this.thumbs[i].render();
        }

        //calculate the size of half a thumb
        var thumb      = this.innerEl.child('.x-slider-thumb');
        this.halfThumb = (this.vertical ? thumb.getHeight() : thumb.getWidth()) / 2;

        this.initEvents();
    },
    initEvents: function(){
        GeoExplorer.slider.FilledSlider.superclass.initEvents.call();
        this.on({
            'change': this.onThumbChange,
            scope: this
        });
    },
    onThumbChange: function(slider,value,thumb){
        
    }
});

Ext.reg('app_fillslider',GeoExplorer.slider.FilledSlider);
