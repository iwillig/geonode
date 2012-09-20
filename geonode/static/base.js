/*global $:true, document: true */
'use strict';

var load_main = function (options) {
    var userID = function (user) { return user.username; },
        toggle_buttons;

    $(document).ajaxSend(function (event, xhr, settings) {
        function getCookie(name) {
            var cookieValue = null, cookies, i, cookie;

            if (document.cookie && document.cookie !== '') {
                cookies = document.cookie.split(';');
                for (i = 0; i < cookies.length; i += 1) {
                    cookie = $.trim(cookies[i]);
                    // Does this cookie string begin with the name we want?
                    if (cookie.substring(0, name.length + 1) === (name + '=')) {
                        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                        break;
                    }
                }
            }
            return cookieValue;
        }
        function sameOrigin(url) {
            // url could be relative or scheme relative or absolute
            var host = document.location.host, // host + port
                protocol = document.location.protocol,
                sr_origin = '//' + host,
                origin = protocol + sr_origin;
            // Allow absolute or scheme relative URLs to same origin
            return (url === origin || url.slice(0, origin.length + 1) === origin + '/') ||
                (url === sr_origin || url.slice(0, sr_origin.length + 1) === sr_origin + '/') ||
                // or any other URL that isn't scheme relative or absolute i.e relative.
                !(/^(\/\/|http:|https:).*/.test(url));
        }
        function safeMethod(method) {
            return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
        }

        if (!safeMethod(settings.type) && sameOrigin(settings.url)) {
            xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
        }
    });

    $("input#user-select").select2({
        placeholder: {title: 'Add User...', id: ""},
        minimumInputLength: 1,
        multiple: true,
        ajax: {
            url: options.url,
            dataType: "json",
            type: "POST",
            data: function (term, page) {
                return {
                    query: term,
                };
            },
            results: function (data, page) {
                return {results: data.users};
            }
        },
        id: userID,
        formatResult: userID,
        formatSelection: userID
    });

    toggle_buttons = function () {
        if ($("input.asset-selector:checked").length) {
            $(".asset-modifier").removeClass("disabled");
        } else {
            $(".asset-modifier").addClass("disabled");
        }
    };

    $("input.asset-selector").live("change", toggle_buttons);
    toggle_buttons();

};