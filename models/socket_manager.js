module.exports = {
    sockBucket: {},
    count: 0,
    io: null,
    removeSocket: function(socket) {
        console.log("Socket gone");
        delete this.sockBucket[socket.id];
        this.count--;
    },
    addSocket: function(socket) {
        console.log("Saving the socket");
        this.sockBucket[socket.id] = socket;
        this.count++;
        socket.on('disconnect', this.removeSocket);
        this.broadcast('join', this.count);
    },
    broadcast: function(event, msg) {
        for (id in this.sockBucket) {
            this.sockBucket[id].emit(event, msg);
        }
    },
    manage: function(io) {
        var self = this;
        self.io = io;

        io.on('connection', function(socket){
            self.addSocket(socket);
        });
        return self;
    }
}