$(function() {
    var socket = io();
    var messages = $('#messages');
    function log(msg) {
        messages.append(msg + "\n");
    }
    socket.on('join', function(count) {
        log("There are now " + count + " users.");
    });
});

