/*global define: true, jasmine: true, describe: true, it: true, expect: true */
requirejs.config({
    baseUrl: '../libs'
});


define(['jquery', '../js/upload/FileType', '../js/upload/LayerInfo', '../js/upload/FileTypes'], function ($, FileType, LayerInfo, FileTypes) {

    'use strict';

    describe('FileType constructor', function () {
        var type = new FileType({
            name: 'Test type',
            main: 'test',
            requires: ['test']
        });

        it('Should the correct class', function () {
            expect(type instanceof FileType).toBeTruthy();
        });

        it('Should be able to correctly identify its own type', function () {

            expect(type.isType({name: 'this-is-not.ls'})).toBeFalsy();
            expect(type.isType({name: 'this-is.test'})).toBeTruthy();
        });

        it('Should be able to check the type errors correctly', function () {
            expect(type.findTypeErrors(['test'])).toEqual([]);
            expect(type.findTypeErrors(['false'])).toEqual(['Missing a test file, which is required']);
        });

    });

    describe('LayerInfo should work on a valid shapefile', function () {
        var shpInfo = new LayerInfo({
            name: 'nybb',
            files: [{name: 'nybb.shp'}, {name: 'nybb.dbf'}, {name: 'nybb.prj'}, {name: 'nybb.shx'}]
        }),
            res = {},
            mock_form_data = {append: function (key, value) { res[key] = value; }};

        it('Should return the correct class', function () {

            expect(shpInfo instanceof LayerInfo).toBeTruthy();
        });

        it('Should prepare the FormData object correctly', function () {
            shpInfo.prepareFormData(mock_form_data);
            expect(res.hasOwnProperty('base_file')).toBeTruthy();
            expect(res.hasOwnProperty('permissions')).toBeTruthy();
            expect(res.hasOwnProperty('prj_file')).toBeTruthy();
            expect(res.hasOwnProperty('dbf_file')).toBeTruthy();
            expect(res.hasOwnProperty('shx_file')).toBeTruthy();
        });

        it('Should be the correct file type', function () {
            expect(shpInfo.type).toBe(FileTypes.SHP);
        });

        it('Should return the correct extensions', function () {
            expect(shpInfo.getExtensions()).toEqual(['shp', 'dbf', 'prj', 'shx']);
        });

        it('Should return no errors', function () {
            expect(shpInfo.errors.length).toEqual(0);
        });

        it('Should have the correct amount of associated files', function () {
            expect(shpInfo.files.length).toEqual(4);
        });

        it('Should correctly remove an associated file', function () {
            var errors;
            shpInfo.removeFile('nybb.dbf');
            expect(shpInfo.files.length).toEqual(3);
            errors = shpInfo.collectErrors();
            expect(errors.length).toEqual(1);
        });

    });

    describe('The LayerInfo object on an unknown type', function () {
        var unknownType = new LayerInfo({
            name: 'pdf',
            files: [{name: 'test.pdf'}]
        });

        it('Should return the correct class', function () {
            expect(unknownType instanceof LayerInfo).toBeTruthy();
        });

        it('Should return one error', function () {
            expect(unknownType.errors.length).toEqual(1);
        });

    });


    describe('The LayerInfo type on a CSV file', function () {
        var csvInfo = new LayerInfo({
            name: 'test-csv',
            files: [{name: 'test.csv'}]
        });

        it('Should return the correct class', function () {
            expect(csvInfo instanceof LayerInfo).toBeTruthy();
        });

        it('Should return the correct type', function () {
            expect(csvInfo.type).toEqual(FileTypes.CSV);
        });

        it('Should return no errors', function () {
            expect(csvInfo.errors.length).toEqual(0);
        });

    });

    jasmine.getEnv().addReporter(new jasmine.TrivialReporter());
    jasmine.getEnv().execute();

});