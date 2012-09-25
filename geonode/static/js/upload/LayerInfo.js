    /** Creates an instance of a LayerInfo
     *  @constructor
     *  @author Ivan Willig
     *  @this {LayerInfo}
     *  @param {name, files}
     */
    LayerInfo = function (options) {

        this.name     = null;
        this.files    = null;

        this.type     = null;
        this.main     = null;

        this.selector = '#' + this.name + '-element';
        this.element  = null;
        $.extend(this, options || {});
        if(!this.main || !this.type){
            this.guessFileType();
        }
        this.errors = this.collectErrors();
    };

    /** Checks the type of the Layer.
     *
     */
    LayerInfo.prototype.guessFileType = function () {
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
    LayerInfo.prototype.collectErrors = function () {
        if (this.type) {
            var errors = [];
            errors = this.type.find_type_errors(this.get_extensions());
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
        /*
     * @returns {array}
     */

//TODO use regex to get filename parts

    LayerInfo.prototype.get_base = function (file) {
        return file.name.split('.');
    };

    LayerInfo.prototype.get_ext = function (file) {
        var parts = get_base(file);
        return parts[parts.length - 1];
    };

    LayerInfo.prototype.get_name = function (file) { return get_base(file)[0]; };

    LayerInfo.prototype.group_files = function (files) {
        return _.groupBy(files, get_name);
    };
