$(function() {
    var socket = io();
    var messages = $('#messages');
    function log(msg) {
        messages.append($('<div>').text(msg));
    }
    function updateCount(msg) {
        $('#user-count').text(msg.count);
    }
    var code_socks = {
        id: null,
        editor: null,
        isNewEditor: function (id) {
            if (this.editor == id)
                return false;
            this.editor = id;
            return true;
        }
    };
    socket.on('id', function (msg) {
        code_socks.id = msg.id;
    });
    socket.on('join', function (msg) {
        updateCount(msg);
        $('#user-list').append($('<div>').attr('id', msg.id).addClass("participant").text(msg.name));
    });
    socket.on('part', function (msg) {
        console.log("Removing: " + msg.id);
        updateCount(msg);

        $('#user-list').find('#' + msg.id).remove();
    });
    socket.on('name', function (msg) {
        $('#user-list').find('#' + msg.id).text(msg.name);
    });
    socket.on('chat', function (msg) {
        log(msg.name + " says: " + msg.msg);
    });

    $('#set-name').click(function () {
        var name = $('#name').val();
        if (window.localStorage) {
            window.localStorage.setItem('userName', name);
        }
        socket.emit('name', name);
    });
    $('#talk').submit(function (e) {
        e.preventDefault();
        var msg = $('#chatmsg').val();
        if (msg != "") {
            socket.emit('chat', msg);
        }
        $('#chatmsg').val("");
    })
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
        value: window.codeprops.code,
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
    function elevate(msg) {

        codeMirror.on('changes', onEdit);
        codeMirror.setOption('readOnly', false);
        $('#compile').attr('disabled', false);
        log("YOU are now the editor");
        $('#user-list').find('.editor').removeClass('editor');
        $('#user-list').find('#' + msg.id).addClass('editor');
    }
    function shame(msg) {
        codeMirror.off('changes', onEdit);
        codeMirror.setOption('readOnly', true);
        $('#compile').attr('disabled', true);
        log(msg.name + " is now the editor");
        $('#user-list').find('.editor').removeClass('editor');
        $('#user-list').find('#' + msg.id).addClass('editor');
    }
    socket.on('elevate', function (msg) {
        if (!code_socks.isNewEditor(msg.id))
            return;
        elevate(msg);
    });
    socket.on('editor', function (msg) {
        if (!code_socks.isNewEditor(msg.id))
            return;
        shame(msg);
    });
    var opts = {};
    if (window.localStorage) {
        opts.name = window.localStorage.getItem('userName');
    }
    opts.room = window.codeprops.codeId;
    socket.emit('join', opts);

});

