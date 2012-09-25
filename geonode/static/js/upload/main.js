/*globals define: true, requirejs: true */

requirejs.config({
    shim: {
        '../../libs/underscore': { exports: '_'}
    }

});

define(['jquery', '../upload'], function ($, upload) {
    'use strict';

    $(function () {
        upload.initialize({
            form: '#file-uploader',
            file_queue: '#file-queue',
            upload_button: '#upload-button'
        });
    });

});