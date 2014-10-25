$(function() {
    var socket = io();
    var messages = $('#messages');
    var codeId = $('#hidden_id').text();
    function log(msg) {
        messages.append($('<div>').text(msg));
    }
    function updateCount(msg) {
        $('#user-count').text(msg.count);
    }
    window.socketId = socket.id;
    socket.on('join', function(msg) {
        updateCount(msg);
        $('#user-list').append($('<div>').attr('id', msg.name).text(msg.name));
    });
    socket.on('part', function(msg) {
        updateCount(msg);
        $('#user-list').find('#' + msg.id).remove();
    });
    socket.on('name', function (msg) {
        $('#user-list').find('#' + msg.id).text(msg.name);
    });
    socket.on('chat', function (msg) {
        log(msg.name + " says: " + msg.msg);
    });

    $('#set-name').click(function() {
        var name = $('#name').val();
        socket.emit('name', name);
    });
    $('#send-message').click(function() {
        var msg = $('#chatmsg').val();
        if (msg != "") {
            socket.emit('chat', msg);
        }
        $('#chatmsg').val("");
    });
    $('#compile').click(function () {
        socket.emit('compile', {code: codeMirror.getValue() });
    });
    socket.on('compilation', function (msg) {
        $('#output').text(msg.output);
    });

    /*
     * Codemirror
     */
    var codeMirror = CodeMirror($('#code')[0], {
        value: $('#hidden_code').text(),
        mode: "clike",
        readOnly: true,
        lineNumbers: true
    });
    function onEdit(instance, changes) {
        socket.emit('edit', {changes: changes});
    }

    socket.on('edit', function (msg) {
        if (msg.code) {
            codeMirror.setValue(msg.code);
        }
        else {
            for (i = 0; i < msg.changes.length; i++) {
                var change = msg.changes[i];
                codeMirror.replaceRange(change.text, change.from,
                    change.to, change.origin);
            }
        }        
    });
    socket.on('elevate', function (msg) {
        codeMirror.on('changes', onEdit);
        codeMirror.setOption('readOnly', false);
        $('#compile').attr('disabled', false);
        log("YOU are now the editor");
        $('#user-list').find('#' + msg.id).addClass('editor');
    });
    socket.on('editor', function (msg) {
        codeMirror.off('changes', onEdit);
        codeMirror.setOption('readOnly', true);
        $('#compile').attr('disabled', true);
        log(msg.name + " is now the editor");
        $('#user-list').find('#' + msg.id).addClass('editor');
    })
    socket.emit('join', codeId);

});

