var http = require('http');
var shortId = require('shortid');

function Options(id) {
  this.hostname = 'localhost';
  this.port = 5984;
  this.path = '/codes/' + id;
  this.method = 'PUT';
};
var starterCode = "/* code here */\n";


module.exports = {
    create: function (lang, next) {
        var id = shortId.generate();
        next(id);
        // starterCode = "";
        // if (lang == "C") {
        //     starterCode = "#include <stdio.h>\n\nint main(int, char**)\n{\n    printf(\"hello world.\\n\");\n    return 0;\n}";
        // }
        // var body = JSON.stringify({code: starterCode});
        // console.log("Creating new code " + id);
        // stream = http.request(new Options(id), function(stream) {
        //     stream.on('data', function(data) {
        //         var ret = JSON.parse(data);
        //         console.log("Couch created code id: " + ret.id);
        //         next(id);
        //     });
        // });
        // stream.end(body);
    },
    get: function (id, next) {
        next({_id: id, code: starterCode});
        // console.log("Starting my get for " + id);
        // var o = new Options(id);
        // o.method = "GET";
        // http.request(o, function (stream) {
        //    stream.on('data', function (data) {
        //         console.log("Passing up " + data);
        //         next(JSON.parse(data));
        //    });
        // }).end();
    }
}
