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

gn = window.gn || {};

gn.upload = (function () {

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

    types = {shp:gn.uploader.FileType.SHP, tif:gn.uploader.FileType.TIF, csv:gn.uploader.FileType.CSV, zip:gn.uploader.FileType.ZIP};

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
