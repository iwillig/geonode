/*global UPLOAD:true, test:true, ok:true, equal:true, deepEqual:true, FormData:true, QUnit:true, strictEqual:true */
'use strict';
QUnit.config.reorder = false;
var up = UPLOAD;

module('Test the FileType object');
test('Test the FileType object', function () {
    var type = new up.FileType('Test Type', 'test', ['req']);

    ok(type instanceof up.FileType, 'Does new return the correct object');
    strictEqual(type.main, 'test', 'Is the main type correct');
    strictEqual(type.name, 'Test Type', 'Is the name correct');
    ok(type.is_type({name: 'file.test'}), 'Can the type identify its own type');

    deepEqual(type.find_type_errors(['req']), [], 'Can the type check errors correctly');

});

var make_shp_info = function () {
    return new up.LayerInfo(
        'nybb', [{name: 'nybb.shp'}, {name: 'nybb.dbf'}, {name: 'nybb.prj'}, {name: 'nybb.shx'}])
};

module('Test LayerInfo on Shapefile');
test('Test LayerInfo object on a valid free Shapefile', function () {
    var shape_info = new up.LayerInfo(
        'nybb',
        [{name: 'nybb.shp'}, {name: 'nybb.dbf'}, {name: 'nybb.prj'}, {name: 'nybb.shx'}]
    ),
        res = {},
        mock_form_data = {append: function (key, value) { res[key] = value; }};

    shape_info.prepare_form_data(mock_form_data);
    ok(res.hasOwnProperty('base_file'));
    ok(res.hasOwnProperty('permissions'));
    ok(res.hasOwnProperty('prj_file'));
    ok(res.hasOwnProperty('dbf_file'));
    ok(res.hasOwnProperty('shx_file'));

    ok(shape_info instanceof up.LayerInfo, 'Make sure the constructor returns the correct object');
    // our test file is an shapefile
    strictEqual(shape_info.type, up.shp, 'Make sure we identify the correct type');

    deepEqual(shape_info.get_extensions(), ['shp', 'dbf', 'prj', 'shx'], 'Find the correct extensions');

    strictEqual(shape_info.main.name, 'nybb.shp');
    // check the errors array
    strictEqual(shape_info.errors.length, 0);
    // make sure that all of the associated files are correct
    equal(shape_info.files.length, 4);

});

test('Test removing a file from a LayerInfo object', function () {
    var shape_info  = make_shp_info();
    ok(shape_info instanceof up.LayerInfo);
    strictEqual(shape_info.files.length, 4);

    shape_info.remove_file('nybb.dbf');
    strictEqual(shape_info.files.length, 3);

});

test('Test LayerInfo on an invalid shapefile', function () {
    var bad_info = new up.LayerInfo('nybb', [{name: 'nybb.shp'}]);
    strictEqual(bad_info.type, up.shp);
    strictEqual(bad_info.errors.length, 3);

});

module('Test LayerInfo with a unknown type');
test('Test LayerInfo with an unknown type, a pdf', function () {
    var unknown_type = new up.LayerInfo('pdf', [{name: 'test.pdf'}]);
    ok(unknown_type instanceof up.LayerInfo, 'Make sure the constructor still works even if its an unknown type.');
    strictEqual(unknown_type.errors.length, 1, 'There should be one error telling the users that this is an unsupport type.');
});


module('Test LayerInfo on a CSV file');
test('Test LayerInfo object on an valid CSV file', function () {
    var csv_info = new up.LayerInfo('test-csv', [{name: 'test.csv'}]),
        res = {},
        mock_form_data = {append: function (key, value) { res[key] = value; }};

    csv_info.prepare_form_data(mock_form_data);

    ok(csv_info instanceof up.LayerInfo, 'The constructor should return the correct type');
    strictEqual(csv_info.type, up.csv, 'Make sure that a csv is correctly identified');
    deepEqual(csv_info.errors.length, 0, 'There should be no errors');
    strictEqual(csv_info.main.name, 'test.csv', 'This should be the main file');
    ok(csv_info.prepare_form_data(mock_form_data), 'Make that we can generate a form data object');

    ok(res.hasOwnProperty('base_file'));
    ok(res.hasOwnProperty('permissions'));
});

module('Test the LayerInfo object on a tiff file');
test('Test the LayerInfo object on a valid tiff file', function () {
    var tif_info = new up.LayerInfo('test-tif', [{name: 'test.tif'}]),
        res = {},
        mock_form_data = {append: function (key, value) { res[key] = value; }};

    tif_info.prepare_form_data(mock_form_data);
    ok(res.hasOwnProperty('base_file'));
    ok(res.hasOwnProperty('permissions'));

    ok(tif_info instanceof up.LayerInfo, 'Make sure the constructor returns the correct type');
    strictEqual(tif_info.type, up.tif, 'Make sure the type returned is correct');
    deepEqual(tif_info.errors.length, 0);

});


module('Test the LayerInfo object on a zip file');
test('Test the LayerInfo object on a valid zip file', function () {
    var zip_info = new up.LayerInfo('test-zip', [{name: 'test.zip'}]),
        res = {},
        mock_form_data = {append: function (key, value) { res[key] = value; }};

    zip_info.prepare_form_data(mock_form_data);

    ok(res.hasOwnProperty('base_file'));
    ok(res.hasOwnProperty('permissions'));

    ok(zip_info instanceof up.LayerInfo, 'Make sure the constructor returns the correct type');
    strictEqual(zip_info.type, up.zip);
    deepEqual(zip_info.errors.length, 0);

});