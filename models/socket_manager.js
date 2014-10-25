var fs = require('fs');
var child_process = require('child_process');

function Room(roomId) {
    this.count = 0;
    this.id = roomId;
    this.code = "/* code here */\n";
    this.applyChanges = function (changes) {
        var self = this;
        changes.forEach(function (chng) {
            self.code = change(self.code, chng);
        });
    }
}
//input is a string
//start and end are objects of the form {line: x, ch: y}
//returns {start: x, end: y} where x and y are the positions in
//input that correspond to the start and end inputs.
function getPosition(input, start, end) {
    var ch = 0;
    var line = 0;
    ret = {
        start: -1,
        end: -1
    };
    for (var i = 0; i <= input.length; i++) {

        if (start.line == line && start.ch == ch) {
            ret.start = i;
        }
        if (end.line == line && end.ch == ch) {
            ret.end = i;
        }
        if (ret.end >= 0 && ret.start >= 0) {
            return ret;
        }
        if (input[i] == '\n') {
            line++;
            ch = 0;
        } else {
            ch++;
        }
    }
    return false;
}
function change(input, change) {
    var pos = getPosition(input, change.from, change.to);
    if (!pos) {
        return input;
    }
    var part1 = input.substr(0, pos.start);
    var part2 = input.substr(pos.end);
    var newt  = change.text.join('\n');
    return [part1, newt, part2].join("");
}
module.exports = {
    sockBucket: { },
    rooms: { },
    io: null,
    addSocket: function (socket) {
        var self = this;
        console.log("Saving the socket: " + socket.id);
        self.sockBucket[socket.id] = socket;
        socket.on('disconnect', function(reason) {
            console.log("Socket " + socket.id + " is gone.");
            delete self.sockBucket[socket.id];
            if (socket.room) {
                var room = self.rooms[socket.room];
                room.count--;
                self.broadcast(socket.room, 'part', {count: room.count, name: socket.id, id: socket.id});
                if (room.editor == socket.id && room.count > 0) {
                    //get the next first socket in the list
                    for (var id in self.sockBucket) {
                        var idx = self.sockBucket[id];
                        if (idx === socket || idx.room != socket.room) {
                            continue;
                        }
                        self.elevate(idx);
                        break;
                    }
                }
            }
        });
        socket.on('name', function (name) {
            socket.name = name;
            self.broadcast(socket.room, 'name', {id: socket.id, name: name});
        });
        socket.on('chat', function (chatmsg) {
            self.broadcast(socket.room, 'chat', {name: socket.name, id: socket.id, msg: chatmsg});
        });
        socket.on('edit', function (msg) {
            msg.self = socket.id;
            var room = self.rooms[socket.room];
            room.applyChanges(msg.changes);
            self.eachOther(socket, function (idx) {
                idx.emit('edit', msg);
            });
        });
        socket.on('join', function (roomId) {
            socket.room = roomId;
            socket.join(roomId);
            var room = self.rooms[roomId];
            if (!room) {
                room = new Room(roomId);
                self.rooms[roomId] = room;
            }
            room.count++;
            self.broadcast(socket.room, 'join', {count: room.count, name: socket.id, id: socket.id});
            self.eachOther(socket, function (idx) {
                socket.emit('join', {count: room.count, name: idx.name, id: idx.id});
                if (room.editor == idx.id) {
                    socket.emit('editor', {id: idx.id, name: idx.name});
                    socket.emit('edit', {code: room.code});
                }
            });
            if (room.count == 1 || !(room.editor) ) {
                self.elevate(socket);
            }
        });
        socket.on('compile', function (msg) {
            //1 get a temp dir
            var room = self.rooms[socket.room];

            var tmpdir = "/tmp/" + room.id; 
            var fs = require('fs');
            var output = ""
            if (!fs.existsSync(tmpdir)) {
                fs.mkdirSync(tmpdir);
            }
            fs.writeFile(tmpdir + "/a.cpp", room.code, function(err) {
                if(err) {
                    self.broadcast(room.id, 'compilation', {output: "Failed to save file\nCopy your code to a new room\n" + err});
                }
                else {
                    child_process.exec("g++ a.cpp", {cwd: tmpdir, timeout: 60000}, function (error, stdOut, stdErr) {
                        if (stdOut && stdOut != "") {
                            output += stdOut;
                            output += "\n";
                        }
                        if (stdErr && stdErr != "") {
                            output += stdErr;
                            output += "\n";
                        }
                        if (error) {
                            output += error;
                            self.broadcast(socket.room, 'compilation', {output: output });
                        }
                        else {
                            output += "\n Compilation success!\nRunning command\n\n";
                            child_process.exec("./a.out", {cwd: tmpdir, timeout: 60000}, function (error, stdOut, stdErr) {
                                if (stdOut && stdOut != "") {
                                    output += stdOut;
                                    output += "\n";
                                }
                                if (stdErr && stdErr != "") {
                                    output += stdErr;
                                    output += "\n";
                                }
                               if (error) {
                                    output += "\n";
                                    output += error;
                                    output += "\nERROR";
                                }
                                else {
                                    output += "\nSUCCESS";
                                }
                                self.broadcast(socket.room, 'compilation', {output: output });
                            });
                        }
                    });
                }
            }); 
            //self.broadcast(socket.room, 'compilation', {output: "Compile error\n(not really)" });
        });
    },
    elevate: function(socket) {
        var self = this;
        var room = self.rooms[socket.room];
        socket.emit('elevate', {id: socket.id});
        room.editor = socket.id;
        self.eachOther(socket, function (idx) {
            idx.emit('editor', {id: room.editor});
        });
    },
    broadcast: function(room, event, msg) {
        var self = this;
        if (room) {
            self.io.to(room).emit(event, msg);
        }
    },
    manage: function(io) {
        var self = this;
        self.io = io;

        io.on('connection', function(socket){
            socket.name = socket.id;
            self.addSocket(socket);
        });
        return self;
    },
    eachOther: function(socket, next) {
        //get each other socket in the same room that is not me
        var self = this;
        for (var id in self.sockBucket) {
            var idx = self.sockBucket[id];
            if (idx === socket || idx.room != socket.room) {
                continue;
            }
            next(idx);
        }
        return self;
    }
}