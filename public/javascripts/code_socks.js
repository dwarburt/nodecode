$(function() {
    var socket = io();
    var messages = $('#messages');
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
    function log(msg) {
        messages.append($('<div>').text(msg));
    }
    function updateCount(msg) {
        $('#user-count').text(msg.count);
    }
    function setMyName(name) {
        if (window.localStorage) {
            window.localStorage.setItem('userName', name);
        }
        $('#user-list').find('#' + code_socks.id).text(name);
        $('#user-menu .user-id .name').text(name);
    }
    function tellName(name) {
        socket.emit('name', name);
    }

    if (window.localStorage) {
        code_socks.name = localStorage.getItem('userName');
        if (code_socks.name) {
            setMyName(code_socks.name);
            tellName(code_socks.name);
        }
    }

    socket.on('id', function (msg) {
        code_socks.id = msg.id;
    });
    socket.on('join', function (msg) {
        updateCount(msg);
        $('#user-list').append($('<div>').attr('id', msg.id).addClass("participant").text(msg.name));
        if (msg.id == code_socks.id) {
            setMyName(msg.name);
        }
    });
    socket.on('part', function (msg) {
        console.log("Removing: " + msg.id);
        $('#user-list').find('#' + msg.id).remove();
    });
    socket.on('name', function (msg) {
        $('#user-list').find('#' + msg.id).text(msg.name);
        if (msg.id == code_socks.id) {
            setMyName(msg.name);
        }
    });
    socket.on('chat', function (msg) {
        log(msg.name + " says: " + msg.msg);
    });

    $('#set-name').click(function () {
        var name = $('#name').val();
        setMyName(name);
        tellName(name);
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
    $('#header .navbutton').click(function () {
        var self = $(this);
        if (self.data('open')) {
            self.removeClass('fa-toggle-up');
            self.addClass('fa-navicon');
            self.data('open', false);
            $('#user-menu').slideUp();
        }
        else {
            self.removeClass('fa-navicon');
            self.addClass('fa-toggle-up');
            self.data('open', true);
            $('#user-menu').slideDown();
        }
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
    if (code_socks.name) {
        opts.name = code_socks.name;
    }
    opts.room = window.codeprops.codeId;
    socket.emit('join', opts);

});

