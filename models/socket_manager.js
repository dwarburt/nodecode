function Room(roomId) {
    this.count = 0;
    this.id = roomId;
}
module.exports = {
    sockBucket: { },
    rooms: { },
    io: null,
    addSocket: function(socket) {
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
                }
            });
            if (room.count == 1 || !(room.editor) ) {
                self.elevate(socket);
            }
        });
        socket.on('compile', function (msg) {
            self.broadcast(socket.room, 'compilation', {output: "Compile error\n(not really)" });
        })
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