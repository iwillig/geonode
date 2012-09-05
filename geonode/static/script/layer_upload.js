'use strict';
// globals vars.... 

var sep = '.';
var layers = {};

var get_base = function(file) { return file.name.split(sep); };

var get_ext = function(file) { 
    var parts = get_base(file);
    return parts[parts.length - 1];
};

var get_name = function(file) { return get_base(file)[0]; };

var group_files = function(files) {
    return _.groupBy(files, get_name);
};

/* LayerInfo is a container where we collect information about each
 * layer an user is attempting to upload.
 * 
 * Each LayerInfo has a
 *   1. type
 *   2. a list of associated files
 *   3. a list of errors that the user should address
 */
function LayerInfo(name, type, errors, files) {
    this.name = name;
    this.type = type;
    this.errors = errors;
    this.files = files;
    this._check_type();
};

LayerInfo.prototype._check_type = function() {
    var self = this;

    $.each(this.files, function(idx, file) {

        var ext = get_ext(file);
        if (ext.toLowerCase() === 'shp') {
            self.type = 'shapefile';
        } else if (ext.toLowerCase() === 'tif') {
            self.type = 'geotiff'
        };
    });

};

LayerInfo.prototype.collect_errors = function() {
    var self = this;
    self.errors = [];
    if (self.type === 'shapefile') {
        self.collect_shape_errors();
    };

};

LayerInfo.prototype.get_extensions = function() {
    var files = this.files,
        res = [];

    for(var i = 0; i < files.length; i++) {
        var file = files[i], 
            extension = get_ext(file);
        res.push(extension);
    }
    return res;
};

LayerInfo.prototype.collect_shape_errors = function() {
    var self = this,
        required = ['shp', 'prj', 'dbf', 'shx'],
        extensions = this.get_extensions();

    $.each(required, function(idx, req) {
        var idx = $.inArray(req, extensions);
        if (idx === -1) {
            self.errors.push('Missing a ' + req + ' file, which is required');
        };
    });

};


LayerInfo.prototype.upload_files = function() {
    var self = this,
        reader = new FileReader(),
        xhr = new XMLHttpRequest(),
        form_data = new FormData();

    xhr.open('POST', '/upload', true);
    form_data.append('main', file);
    xhr.send(form_data);
};

LayerInfo.prototype.display_errors = function(div) {
    var self = this;

    $.each(self.errors, function(idx, e) {
        var alert = $('<div/>', {'class': 'alert alert-error'}).appendTo(div);
        $('<p/>', {text: e}).appendTo(alert);
    
    });

};

LayerInfo.prototype.display  = function(file_con) {

    var self = this,
        div   = $('<div/>').appendTo(file_con),
         table = $('<table/>', {
             'class': 'table table-bordered'}).appendTo(div),
         thead = $('<thead/>').appendTo(table);

    $('<th/>', {text: 'Name'}).appendTo(thead);
    $('<th/>', {text: 'Size'}).appendTo(thead);
    
    self.display_errors(div);

    $.each(self.files, function(idx, file) {
        self.display_file(table, file);
    });
};

LayerInfo.prototype.display_file = function(table, file) {
    var self = this,
         tr = $('<tr/>').appendTo(table);
    $('<td/>', {text: file.name}).appendTo(tr);
    $('<td/>', {text: file.size}).appendTo(tr);

};

/* When an user uploads a file, we need to check to see if there is
 * already an `LayerInfo` in the global layers object. If there is,
 * append that file to that `LayerInfo` object. Other wise create a
 * new `LayerInfo` object and add that to global Layers object.
 */

var build_file_info = function(files) {


    $.each(files, function(name, assoc_files) {
        var info;
        // check if the `LayerInfo` object already exists
        if (name in layers) {
            info = layers[name]
            $.merge(info.files, assoc_files);
            info.collect_errors();
        } else {
            info = new LayerInfo(name, null, [], assoc_files);
            layers[name] = info;
            info.collect_errors();
        };
    });

};


var display_files = function(files) {
    var file_con= $('#file-queue');
    file_con.empty();

    $.each(files, function(name, info) {
        info.display(file_con);
    });
};


var setup = function(options) {

    var file_input = document.getElementById('file-input'),
        attach_events = function() {    
            $('#file-con a').click(function(event) {
                console.log(event);
            });
        },
        form = $('file-uploader');
    
    $('#file-uploader').change(function(event) {
        var grouped_files = group_files(file_input.files);
        build_file_info(grouped_files);
        display_files(layers);
        attach_events();
    });

    $('#upload-button').click(function(event) {
        var temp_file = files['nybb'].files[0];
        upload_files(temp_file);
    });

};