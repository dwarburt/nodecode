var fs = require('fs');
var shortid = require('shortid');
var childProcess = require('child_process');

function Room(roomId) {
    this.count = 0;
    this.id = roomId;
    this.code = "/* code here */\n";
    this.applyChanges = function (changes) {
        var self = this;
        changes.forEach(function (chng) {
            self.code = change(self.code, chng);
        });
    };
}
//input is a string
//start and end are objects of the form {line: x, ch: y}
//returns {start: x, end: y} where x and y are the positions in
//input that correspond to the start and end inputs.
function getPosition(input, start, end) {
    var ch = 0;
    var line = 0;
    var ret = {
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
function change(input, thisChange) {
    var pos = getPosition(input, thisChange.from, thisChange.to);
    if (!pos) {
        return input;
    }
    var part1 = input.substr(0, pos.start);
    var part2 = input.substr(pos.end);
    var newt  = thisChange.text.join('\n');
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
        socket.name = shortid.generate();
        socket.emit('id', { id: socket.id });
        socket.on('disconnect', function(reason) {
            console.log("Socket " + socket.id + " is gone. (" + reason + ")");
            delete self.sockBucket[socket.id];
            if (socket.room) {
                var room = self.rooms[socket.room];
                room.count--;
                self.broadcast(socket.room, 'part', {count: room.count, name: socket.name, id: socket.id});
                if (room.editor == socket.id && room.count > 0) {
                    //get the next first socket in the list
                    for (var id in self.sockBucket) {
                        var idx = self.sockBucket[id];
                        if (idx === socket || idx.room != socket.room) {
                            continue;
                        }
                        self.elevate(idx);
                        break;
        }   }   }   });
        socket.on('name', function (name) {
            socket.name = name;
            if (socket.request.user && socket.request.user.name != name) {
                socket.request.user.name = name;
                self.User.save(socket.request.user);
            }
            self.broadcast(socket.room, 'name', {id: socket.id, name: name});
        });
        socket.login = function (err, user, actionFailed) {
            if (err || !user) {
                socket.emit(actionFailed);
                return;
            }
            socket.request.logIn(user._id);
            socket.request.user = user;
            socket.emit('loginSuccess');
            var room = self.rooms[socket.room];
            if (!room.owner) {
                room.owner = user.email;
                socket.emit('ownership');
            }
        }
        socket.on('logout', function (msg) {
            socket.request.logOut();
            socket.emit('logoutSuccess');
        });
        socket.on('login', function (msg) {
            self.User.login(null, msg.email, msg.password, function (err, user) {
                socket.login(err, user, 'loginFailed');
            });
        });
        socket.on('register', function (msg) {
            if (msg.password != msg.confirm) {
                socket.emit('registerFailed', {reason: "Passwords don't match" } );
                return;
            }
            if (! msg.beta.match(/Blue Penguin/i) ) {
                socket.emit('registerFailed', {reason: "Beta code is not correct" } );
                return;
            }
            var deets = {email: msg.email, password: msg.password, name: socket.name};
            self.User.signup(null, deets, function (err, user) {
                socket.login(err, user, 'registerFailed');
            });
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
        socket.on('join', function (msg) {
            socket.room = msg.room;
            if (msg.name) {
                socket.name = msg.name;
            }
            socket.join(msg.room);
            var room = self.rooms[msg.room];
            if (!room) {
                room = new Room(msg.room);
                self.rooms[msg.room] = room;
            }
            room.count++;
            self.broadcast(socket.room, 'join', {count: room.count, name: socket.name, id: socket.id});
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
        socket.on('promote', function (msg) {
            var newEditor = self.sockBucket[msg.id];
            var room = self.rooms[socket.room];
            if (newEditor && room.editor == socket.id) {
                self.elevate(newEditor);
            }
            // self.eachOther(socket, function (idx) {
            //     if (name != idx.name) {
            //         idx.emit('editor')
            //     }
            // })
        });
        socket.on('compile', function () {
            var room = self.rooms[socket.room];
            var tmphome = process.env.NODECODE_HOME || "/home/coder/rooms/";

            var tmpdir = tmphome + room.id;
            var output = "";
            if (!fs.existsSync(tmpdir)) {
                fs.mkdirSync(tmpdir);
            }
            fs.writeFile(tmpdir + "/a.cpp", room.code, function(err) {
                if(err) {
                    self.broadcast(room.id, 'compilation', {output: "Failed to save file\nCopy your code to a new room\n" + err});
                }
                else {
                    childProcess.exec("g++ -Wall a.cpp", {cwd: tmpdir, timeout: 60000}, function (error, stdOut, stdErr) {
                        if (stdOut && stdOut !== "") {
                            output += stdOut;
                            output += "\n";
                        }
                        if (stdErr && stdErr !== "") {
                            output += stdErr;
                            output += "\n";
                        }
                        if (error) {
                            output += error;
                            self.broadcast(socket.room, 'compilation', {output: output });
                        }
                        else {
                            output += "Compilation success!\nRunning command\n\n";
                            var commandPrefix = process.env.NODECODE_EXEC_PREFIX || "sudo -u coder unshare -n ";
                            childProcess.exec(commandPrefix + "./a.out", {cwd: tmpdir, timeout: 60000}, function (error, stdOut, stdErr) {
                                if (stdOut && stdOut !== "") {
                                    output += stdOut;
                                    output += "\n";
                                }
                                if (stdErr && stdErr !== "") {
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
        socket.emit('elevate', {id: socket.id, name: socket.name});
        room.editor = socket.id;
        self.eachOther(socket, function (idx) {
            idx.emit('editor', {id: socket.id, name: socket.name});
        });
    },
    broadcast: function(room, event, msg) {
        var self = this;
        if (room) {
            self.io.to(room).emit(event, msg);
        }
    },
    manage: function(io, User) {
        var self = this;
        self.io = io;
        self.User = User;

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