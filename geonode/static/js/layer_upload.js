/*global $:true, FileReader:true, window:true, XMLHttpRequest:true, FormData:true, document:true, alert:true, File:true  */

/*
 * TODO, when removing a .prj from a shape file.. we should give the
 * user an warning, not an error.
 * 1. Add templates
 * 2. Fix csrf_token
 * 3. Move class defs into their own files
 * 4. Put everything into a namespace
 */

'use strict';

var underscore = _.noConflict(); // make jslint less angry about `_`

var UPLOAD = (function () {

    var layers = {},
        FileType,
        LayerInfo,
        find_file_type,
        initialize,
        get_base,
        get_ext,
        get_name,
        group_files,
        layer_template,
        error_template,
        error_element,
        log_error,
        info_template,
        info,
        shp,
        tif,
        csv,
        zip,
        types,
        remove_file,
        host,
        build_file_info,
        display_files,
        do_uploads,
        do_successful_upload,
        attach_events,
        file_queue;

    // error template
    error_template = underscore.template(
        '<li class="alert alert-error">' +
            '<button class="close" data-dismiss="alert">&times;</button>' +
            '<strong><%= title %></strong><p><%= message %></p>' +
         '</li>'
    );

    info_template = underscore.template(
        '<div class="alert <%= level %>"><p><%= message %></p></div>'
    );

    // template for the layer info div
    layer_template = underscore.template(
        '<div class="file-element" id="<%= name %>-element">' +
            '<div>' +
               '<div><h3><%= name %></h3></div>' +
               '<div><p><%= type %></p></div>' +
            '</div>' +
            '<ul class="files"></ul>' +
            '<ul class="errors"></ul>' +
            '<div id="status"></div>' +
            '</div>'
    );

    log_error = function (options) {
        $('#global-errors').append(error_template(options));
    };

    /** Info function takes an object and returns a correctly
     *  formatted bootstrap alert element.
     * 
     *  @returns {string}
     */
    info = function (options) {
        return info_template(options);
    };

    /* 
     * @returns {array}
     */

    get_base = function (file) {
        return file.name.split('.');
    };

    get_ext = function (file) {
        var parts = get_base(file);
        return parts[parts.length - 1];
    };

    get_name = function (file) { return get_base(file)[0]; };

    group_files = function (files) {
        return underscore.groupBy(files, get_name);
    };

    /** Create an instance of a FileType object
     *  @constructor
     *  @author Ivan Willig
     *  @this {FileType}
     *  @param {name, main, requires}
     */
    FileType = function (name, main, requires) {
        this.name     = name;
        this.main     = main;
        this.requires = requires;

    };

    FileType.prototype.is_type = function (file) {
        return (this.main === get_ext(file).toLowerCase());
    };

    FileType.prototype.find_type_errors = function (extensions) {
        var errors = [];

        $.each(this.requires, function (idx, req) {
            idx = $.inArray(req, extensions);
            if (idx === -1) {
                errors.push('Missing a ' + req + ' file, which is required');
            }
        });
        return errors;

    };

    shp = new FileType('ESRI Shapefile', 'shp', ['shp', 'prj', 'dbf', 'shx']);
    tif = new FileType('GeoTiff File', 'tif', ['tif']);
    csv = new FileType('Comma Separated File', 'csv', ['csv']);
    zip = new FileType('Zip Archives', 'zip', ['zip']);

    types = [shp, tif, csv, zip];

    /* Function to iterates through all of the known types and returns the
     * type if it matches, if not return null
     * @params {File}
     * @returns {object}
     */
    find_file_type = function (file) {
        var i, type;
        for (i = 0; i < types.length; i += 1) {
            type = types[i];
            if (type.is_type(file)) {
                return {type: type, file: file};
            }
        }
    };

    /** Creates an instance of a LayerInfo
     *  @constructor
     *  @author Ivan Willig
     *  @this {LayerInfo}
     *  @param {name, files}
     */
    LayerInfo = function (name, files) {

        this.name     = name;
        this.files    = files;

        this.type     = null;
        this.main     = null;
        this.errors   = [];
        this.selector = '#' + this.name + '-element';
        this.element  = null;
        this.check_type();
        this.collect_errors();
    };

    /** Checks the type of the Layer.
     *
     */
    LayerInfo.prototype.check_type = function () {
        var self = this;
        $.each(this.files, function (idx, file) {
            var results = find_file_type(file);
            // if we find the type of the file, we also find the "main"
            // file
            if (results) {
                self.type = results.type;
                self.main = results.file;
            }
        });
    };

    /** Delegates to the Layer Type to find all of the errors
     *  associated with this type.
     */
    LayerInfo.prototype.collect_errors = function () {
        if (this.type) {
            this.errors = [];
            this.errors = this.type.find_type_errors(this.get_extensions());
        } else {
            this.errors.push('Unknown type, please try again');
        }
    };

    LayerInfo.prototype.get_extensions = function () {
        var files = this.files,
            extension,
            file,
            res = [],
            i;

        for (i = 0; i < files.length; i += 1) {
            file = files[i];
            extension = get_ext(file);
            res.push(extension);
        }
        return res;
    };

    /** Build a new FormData object from the current state of the
     *  LayerInfo object.
     *  @returns {FromData}
     */
    LayerInfo.prototype.prepare_form_data = function (form_data) {
        var i, ext, file, perm;

        if (!form_data) {
            form_data = new FormData();
        }
        // this should be generate from the permission widget
        perm = {users: []};

        form_data.append('base_file', this.main);
        form_data.append('permissions', JSON.stringify(perm));


        for (i = 0; i < this.files.length; i += 1) {
            file = this.files[i];
            if (file.name !== this.main.name) {
                ext = get_ext(file);
                form_data.append(ext + '_file', file);
            }
        }

        return form_data;
    };

    LayerInfo.prototype.mark_success = function (resp) {
        var self = this;
        $.ajax({
            url: resp.redirect_to
        }).done(function (resp) {
            var msg, status = self.element.find('#status'), a;
            if (resp.success) {
                a = $('<a/>', {href: host + '/data/geonode:' + resp.name, text: 'Your layer'});
                msg = info({level: 'alert-success', message: 'Your file was successfully uploaded.'});
                status.empty();
                status.append(msg);
                status.append(a);
            } else {
                msg = info({level: 'alert-error', message: 'Error, ' + resp.errors.join(' ,')});
                status.empty(msg);
                status.append(msg);
            }
        });

    };

    LayerInfo.prototype.mark_start = function () {
        var msg = info({level: 'alert-info', message: 'Your upload has started.'});
        this.element.find('#status').append(msg);
    };

    LayerInfo.prototype.upload_files = function () {
        var form_data = this.prepare_form_data(),
            self = this;
        $.ajax({
            url: "",
            type: "POST",
            data: form_data,
            processData: false, // make sure that jquery does not process the form data
            contentType: false,
            beforeSend: function () {
                self.mark_start();
            }
        }).done(function (resp) {
            var status, msg;
            if (resp.success === true) {
                self.mark_success(resp);
            } else {
                status = self.element.find('#status');
                msg = info({level: 'alert-error', message: 'Something went wrong' + resp.errors.join(',')});
                status.append(msg);
            }
        });
    };

    LayerInfo.prototype.display  = function () {
        var li = layer_template({
                name: this.name,
                type: this.type.name,
                files: this.files
            });

        file_queue.append(li);
        this.display_files();
        this.display_errors();
        this.element = $(this.selector);
        return li;
    };

    remove_file = function (event) {
        var target = $(event.target),
            layer_info,
            layer_name = target.data('layer'),
            file_name  = target.data('file');

        layer_info = layers[layer_name];

        if (layer_info) {
            layer_info.remove_file(file_name);
            layer_info.display_refresh();
        }

    };

    LayerInfo.prototype.display_files = function () {
        var self = this,
            ul = $('#' + this.name + '-element .files');
        ul.empty();

        $.each(this.files, function (idx, file) {
            var li = $('<li/>').appendTo(ul),
                p = $('<p/>', {text: file.name}).appendTo(li),
                a  = $('<a/>', {text: ' Remove'});
            a.data('layer', self.name);
            a.data('file',  file.name);
            a.appendTo(p);
            a.on('click', remove_file);
        });

    };

    LayerInfo.prototype.display_errors = function () {
        var ul = $('#' + this.name + '-element .errors').first();
        ul.empty();

        $.each(this.errors, function (idx, error) {
            $('<li/>', {text: error, 'class': 'alert alert-error'}).appendTo(ul);
        });
    };

    LayerInfo.prototype.display_refresh = function () {
        this.collect_errors();
        this.display_files();
        this.display_errors();
    };

    LayerInfo.prototype.remove_file = function (name) {
        var length = this.files.length,
            i,
            file;
        for (i = 0; i < length; i += 1) {
            file = this.files[i];
            if (name === file.name) {
                this.files.splice(i, 1);
                break;
            }
        }

    };

    build_file_info = function (files) {
        var info;

        $.each(files, function (name, assoc_files) {
            if (layers.hasOwnProperty(name)) {
                info = layers[name];
                $.merge(info.files, assoc_files);
                info.display_refresh();
            } else {
                info = new LayerInfo(name, assoc_files);
                layers[name] = info;
                info.collect_errors();
            }
        });

    };

    display_files = function () {
        file_queue.empty();
        $.each(layers, function (name, info) {
            if (!info.type) {
                log_error({
                    title: 'Unsupported type',
                    message: 'File ' + info.name + ' is an unsupported file type, please select another file.'
                });
                delete layers[name];
            } else {
                info.display();
            }
        });
    };

    do_successful_upload = function (response) {
        console.log(response.redirect_to);
    };

    do_uploads = function () {
        if ($.isEmptyObject(layers)) {
            alert('You must select some files first.');
        } else {
            $.each(layers, function (name, layerinfo) {
                layerinfo.upload_files();
            });
        }
    };

    initialize = function (options) {
        var file_input = document.getElementById('file-input');
        host = 'http://localhost:8000';
        file_queue = $(options.file_queue);

        $(options.form).change(function (event) {
            // this is a mess
            var files = group_files(file_input.files);
            build_file_info(files);
            display_files();
        });

        $(options.upload_button).on('click', do_uploads);
    };

    // public api
    return {
        // expose these types for testing
        shp: shp,
        tif: tif,
        csv: csv,
        zip: zip,
        layers: layers,
        LayerInfo: LayerInfo,
        FileType: FileType,
        types: types,
        find_file_type: find_file_type,
        initialize: initialize
    };

}());