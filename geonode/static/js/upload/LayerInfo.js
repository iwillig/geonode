/*global gn:true, $:true, FormData: true */

define(['jquery', '../../libs/underscore', 'FileTypes'], function($, _, FileTypes){
    'use strict';

    /** Creates an instance of a LayerInfo
     *  @constructor
     *  @author Ivan Willig
     *  @this {LayerInfo}
     *  @param {name, files}
     */
    var LayerInfo = function (options) {

        this.name     = null;
        this.files    = null;

        this.type     = null;
        this.main     = null;

        this.selector = '#' + this.name + '-element';
        this.element  = null;
        $.extend(this, options || {});
        if (!this.main || !this.type) {
            this.guessFileType();
        }
        this.errors = this.collectErrors();
    };

    /* Function to iterates through all of the known types and returns the
     * type if it matches, if not return null
     * @params {File}
     * @returns {object}
     */
    LayerInfo.prototype.findFileType = function (file) {
        var i, type;
        $.each(FileTypes, function (name, type) {
            if (type.isType(file)) {
                return {type: type, file: file};
            }
        });
    };


    /** Checks the type of the Layer.
     *
     */
    LayerInfo.prototype.guessFileType = function () {
        var self = this;

        $.each(this.files, function (idx, file) {
            var results = this.findFileType(file);
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
    LayerInfo.prototype.collectErrors = function () {
        if (this.type) {
            var errors = [];
            errors = this.type.find_type_errors(this.getExtensions());
        } else {
            this.errors.push('Unknown type, please try again');
        }
    };

    LayerInfo.prototype.getExtensions = function () {
        var files = this.files,
        extension,
        file,
        res = [],
        i;

        for (i = 0; i < files.length; i += 1) {
            file = files[i];
            extension = this.getExt(file);
            res.push(extension);
        }
        return res;
    };

    /** Build a new FormData object from the current state of the
     *  LayerInfo object.
     *  @returns {FromData}
     */
    LayerInfo.prototype.prepareFormData = function (form_data) {
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
                ext = this.getExt(file);
                form_data.append(ext + '_file', file);
            }
        }

        return form_data;
    };

    LayerInfo.prototype.markSuccess = function (resp) {
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

    LayerInfo.prototype.markStart = function () {
        var msg = info({level: 'alert-info', message: 'Your upload has started.'});
        this.element.find('#status').append(msg);
    };

    LayerInfo.prototype.uploadFiles = function () {
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

    LayerInfo.prototype.removeFile = function (event) {
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

    LayerInfo.prototype.displayFiles = function () {
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

    LayerInfo.prototype.displayErrors = function () {
        var ul = $('#' + this.name + '-element .errors').first();
        ul.empty();

        $.each(this.errors, function (idx, error) {
            $('<li/>', {text: error, 'class': 'alert alert-error'}).appendTo(ul);
        });
    };

    LayerInfo.prototype.displayRefresh = function () {
        this.collect_errors();
        this.display_files();
        this.display_errors();
    };

    LayerInfo.prototype.removeFile = function (name) {
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
    /*
     * @returns {array}
     */

    //TODO use regex to get filename parts

    LayerInfo.getBase = function (file) {
        return file.name.match(/(\w+).(\w+)/)
    };

    LayerInfo.getExt = function (file) {
        var parts = LayerInfo.getBase(file);
        return parts[parts.length - 1];
    };

    LayerInfo.getName = function (file) {
        return LayerInfo.getBase(file)[1];
    };

    return LayerInfo;

});
