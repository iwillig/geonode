define(['jquery'], function(){

/** Create an instance of a FileType object
 *  @constructor
 *  @author Ivan Willig
 *  @this {FileType}
 *  @param {name, main, requires}
 */

var FileType = function(options) {
    this.name = null;
    this.main = null;
    this.requires = null;
    $.extend(this,options||{});
};


FileType.prototype.isType = function(file) {
    return (this.main === get_ext(file).toLowerCase());
};

FileType.prototype.findTypeErrors = function(extensions) {
    var errors = [];

    $.each(this.requires, function(idx, req) {
        idx = $.inArray(req, extensions);
        if (idx === -1) {
            errors.push('Missing a ' + req + ' file, which is required');
        }
    });
    return errors;

};

return FileType;

});




