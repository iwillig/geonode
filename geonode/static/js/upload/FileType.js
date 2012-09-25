/** Create an instance of a FileType object
 *  @constructor
 *  @author Ivan Willig
 *  @this {FileType}
 *  @param {name, main, requires}
 */

gn.uploader.FileType = function(name, main, requires) {
    this.name = name;
    this.main = main;
    this.requires = requires;

};


FileType.prototype.is_type = function(file) {
    return (this.main === get_ext(file).toLowerCase());
};

FileType.prototype.find_type_errors = function(extensions) {
    var errors = [];

    $.each(this.requires, function(idx, req) {
        idx = $.inArray(req, extensions);
        if (idx === -1) {
            errors.push('Missing a ' + req + ' file, which is required');
        }
    });
    return errors;

};

gn.uploader.FileType.SHP = new FileType('ESRI Shapefile', 'shp', ['shp', 'prj', 'dbf', 'shx']);
gn.uploader.FileType.TIF = new FileType('GeoTiff File', 'tif', ['tif']);
gn.uploader.FileType.CSV = new FileType('Comma Separated File', 'csv', ['csv']);
gn.uploader.FileType.ZIP = new FileType('Zip Archives', 'zip', ['zip']);
