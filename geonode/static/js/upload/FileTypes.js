define(['./FileType'], function(FileType) {
    return {
        SHP: new FileType('ESRI Shapefile', 'shp', ['shp', 'prj', 'dbf', 'shx']),
        TIF: new FileType('GeoTiff File', 'tif', ['tif']),
        CSV: new FileType('Comma Separated File', 'csv', ['csv']),
        ZIP: new FileType('Zip Archives', 'zip', ['zip'])
    };
});
