/*global $:true  */
'use strict';

var log = console.log;

var STATUS = (function () {

    var initialize,
        host,
        app = $('#application'),
        UploadSession,
        format_session_tr,
        format_header,
        get_session,
        wrap_value,
        handle_edit,
        load_sessions;

    get_session = function (element) {
        var tr = $(element).parent().parent();
        return tr.data('session');
    };

    wrap_value = function (value) {
        var td = $('<td/>');

        if (typeof value === 'object') {
            value.appendTo(td);
        } else {
            $('<p/>', {text: value}).appendTo(td);
        }
        return td;
    };


    handle_edit = function (event) {
        var target = $(event.target),
            session = target.data('session');
        log(session);
    };

    /**
     *
     */
    UploadSession = function (options) {
        this.name = options.name;
        this.id = options.id;
        this.layer_name = options.name;
        this.layer_id = options.layer_id;
        this.state = options.state;
        this.url = options.url;
        this.date = options.date;
    };

    UploadSession.prototype.delete = function () {
        var url = '/data/upload/sessions/delete/' + this.id,
            self = this;

        $.ajax({
            type: 'POST',
            url: url
        }).done(function (resp) {
            self.element.remove();
        });
    };

    UploadSession.prototype.format_tr = function () {
        var tr = $('<tr />'),
            input,
            name,
            div,
            a;
        tr.data('session', this);
        input = $('<input/>', {type: 'checkbox'});
        wrap_value(input).appendTo(tr);

        a = $('<a/>', {text: 'Edit'});
        a.on('click', handle_edit);
        if (this.url) {
            wrap_value($('<a/>', {text: this.layer_name, href: this.url}))
                .appendTo(tr);
        } else {
            wrap_value(this.layer_name).appendTo(tr);
        }
        wrap_value(a).appendTo(tr);
        wrap_value(this.date).appendTo(tr);
        wrap_value(this.state).appendTo(tr);
        this.element = tr;
        return tr;
    };


    load_sessions = function (url) {
        var tbody = $('#session-table').find('tbody').first();
        tbody.empty();

        $.ajax({url: url}).done(function (sessions) {
            $.each(sessions, function (idx, s) {
                var session = new UploadSession(s),
                    tr = session.format_tr();
                tr.appendTo(tbody);
            });
        });
    };


    initialize = function (options) {
        var delete_sessions,
            set_permissions,
            find_selected_layers;


        find_selected_layers = function (table) {
            var inputs = table.find('input:checkbox:checked'),
                res = [],
                session,
                i,
                length = inputs.length;

            for (i = 0; i < length; i += 1) {
                session = get_session(inputs[i]);
                res.push(session);
            }
            return res;
        };

        delete_sessions = function (event) {
            var table = $(options.table_selector),
                sessions = find_selected_layers(table);
            $.each(sessions, function (idx, session) {
                session.delete();
            });
        };

        set_permissions = function (event) {
            log(event);
        };


        load_sessions(options.status_url);

        $(options.delete_selector).on('click', delete_sessions);
        $(options.permission_selector).on('click', set_permissions);
    };

    return {
        initialize: initialize
    };

}());