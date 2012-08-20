
// globals vars.... 
var global_files = {},
    file_container = $('#file-container');


var get_or_populate = function(hash, key, callback) {
    if (typeof hash[key] === 'undefined') {
        hash[key] = callback();
    };
    return hash[key];
};


var base = function(name) {
    return name.split('.')[0];
};

var identify = function(file) {

};

var group_by_name = function(data) {

    $.each(data.files, function(idx, file) {
        var name = base(file.name);
        get_or_populate(global_files, name, function() {return []});
        global_files[name].push(file);
    });

};

var draw_file_table = function() {

};

var upload_shapefile = function() {
    var a = $(this),
        name = a.data('name'),
        files = global_files[name];
    $.ajax({
        
    });
};

var redraw = function() {
    var list_template = Hogan.compile(
        '{{#files}}' + 
        ' <li>{{name}}</li>' +
        '{{/files}}'
    );

    file_container.empty();

    for(var name in global_files) {

        var div = $('<div/>', {id: 'div-' + name}),
            title = $('<p/>', {text: 'Uploading shapefile: ' + name}).appendTo(div),
            a = $('<a/>', {text: 'Upload shapefile'}).appendTo(div),
            ul = $('<ul/>').appendTo(div);
        a.data('name', name);
        a.click(upload_shapefile);

        div.appendTo(file_container);
        var out = list_template.render({files: global_files[name]});
        ul.append(out);

    };
};

var setup = function(options) {
    var csrf_token  = options.csrf_token,
        form_target = options.form_target,
        user_lookup = options.user_lookup,
        form        = $('#upload_form'),
        container = $('#upload_form_con');


    form.fileupload({
        dataType: 'json',
        dropZone: $('#dropzone'),
        add: function(e, data) {
            group_by_name(data);
            // Note the add method is called everytime an file is add
            // to the upload process. Which means this method is
            // called a bunch of times. We wipe the ul element before
            // we insert the file to 
            redraw(data);
        },
        formData: function(form) {
            console.log(form);
        },
        submit: function(e, data) {
            e.preventDefault();
            console.log('submit called');
        },
        done: function(e, data) {
            console.log('done calback called');
        }

    });
    
};
