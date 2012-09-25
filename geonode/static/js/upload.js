/*global $:true, document:true, define: true, alert:true, requirejs: true  */

'use strict';

define(['jquery', '../libs/underscore', './upload/LayerInfo', './upload/FileTypes'], function ($, _, LayerInfo, fileTypes) {

    var layers = {},
        templates = {},
        findFileType,
        initialize,
        log_error,
        info,
        types,
        buildFileInfo,
        displayFiles,
        doUploads,
        doSuccessfulUpload,
        attach_events,
        file_queue;

           // error template
    templates.errorTemplate = _.template(
        '<li class="alert alert-error">' +
            '<button class="close" data-dismiss="alert">&times;</button>' +
            '<strong><%= title %></strong><p><%= message %></p>' +
            '</li>'
    );

    templates.infoTemplate = _.template(
        '<div class="alert <%= level %>"><p><%= message %></p></div>'
    );

           // template for the layer info div
    templates.layerTemplate = _.template(
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
        $('#global-errors').append(templates.errorTemplate(options));
    };

    /** Info function takes an object and returns a correctly
     *  formatted bootstrap alert element.
     *
     *  @returns {string}
     */
    info = function (options) {
        return templates.infoTemplate(options);
    };

    /* Function to iterates through all of the known types and returns the
     * type if it matches, if not return null
     * @params {File}
     * @returns {object}
     */
    findFileType = function (file) {
        var i, type;
        for (i = 0; i < types.length; i += 1) {
            type = types[i];
            if (type.isType(file)) {
                return {type: type, file: file};
            }
        }
    };


    buildFileInfo = function (files) {
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

    displayFiles = function () {
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

    doUploads = function () {
        if ($.isEmptyObject(layers)) {
            alert('You must select some files first.');
        } else {
            $.each(layers, function (name, layerinfo) {
                layerinfo.upload_files();
            });
        }
    };

    initialize = function (options) {
        var file_input = document.getElementById('file-input'),
            file_queue = $(options.file_queue);

        $(options.form).change(function (event) {
            // this is a mess
            var files = _.groupBy(file_input.files, LayerInfo.getName);
            buildFileInfo(files);
            displayFiles();
        });

        $(options.upload_button).on('click', doUploads);
    };

    // public api

    return {
        initialize: initialize
    };

});
