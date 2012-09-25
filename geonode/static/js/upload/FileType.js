/*global gn:true, $:true */
/** Create an instance of a FileType object
 *  @constructor
 *  @author Ivan Willig
 *  @this {FileType}
 *  @param {name, main, requires}
 */
'use strict';

gn.uploader.FileType = function (name, main, requires) {
    this.name = name;
    this.main = main;
    this.requires = requires;

};


gn.uploader.FileType.prototype.is_type = function (file) {
    return (this.main === get_ext(file).toLowerCase());
};

gn.uploader.FileType.prototype.find_type_errors = function (extensions) {
    var errors = [];

    $.each(this.requires, function (idx, req) {
        idx = $.inArray(req, extensions);
        if (idx === -1) {
            errors.push('Missing a ' + req + ' file, which is required');
        }
    });
    return errors;

};

gn.uploader.FileType.SHP = new gn.uploader.FileType('ESRI Shapefile', 'shp', ['shp', 'prj', 'dbf', 'shx']);
gn.uploader.FileType.TIF = new gn.uploader.FileType('GeoTiff File', 'tif', ['tif']);
gn.uploader.FileType.CSV = new gn.uploader.FileType('Comma Separated File', 'csv', ['csv']);
gn.uploader.FileType.ZIP = new gn.uploader.FileType('Zip Archives', 'zip', ['zip']);
