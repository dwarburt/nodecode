$(function() {
    var socket = io();
    var code_socks = {
        id: null,
        editor: null,
        people: { },
        amEditor: function() {
            return this.id === this.editor;
        },
        isNewEditor: function (id) {
            if (this.editor == id)
                return false;
            this.editor = id;
            return true;
        }
    };
    $(window).resize(function () {
        $('#messages').css('max-height', $(window).height() - $('#messages').offset().top - $('#talk').height() + 10 );
    });
    $('#messages').css('max-height', $(window).height() - $('#messages').offset().top - $('#talk').height() + 10 );
    function log(msg, from) {
        var bubble = $('<div>').addClass('bubble').text(msg);
        var name = $('<div>').addClass('name').text(from || "System");
        $('#messages').append($('<div>').append(name, bubble));
    }
    function updateCount(msg) {
        $('#user-count').text(msg.count);
    }
    function setMyName(name) {
        if (window.localStorage) {
            window.localStorage.setItem('userName', name);
        }
        $('#user-list').find('#' + code_socks.id).text(name)
            .append($('<span>').addClass('fa fa-user'));
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
    var chosenParticipant;
    socket.on('join', function (msg) {
        updateCount(msg);
        var nu = $('<div>').attr('id', msg.id).addClass("participant").text(msg.name);
        $('#user-list').append(nu);
        nu.click(function () {
            if (chosenParticipant === $(this).attr('id')) {
                return;
            }
            chosenParticipant = $(this).attr('id');
            var omen = $('#other-user-menu');
            omen.hide();
            omen.find('.name').text(code_socks.people[chosenParticipant]);
            if (code_socks.amEditor() && chosenParticipant != code_socks.id) {
                omen.find('.elevate').show();
            } else {
                omen.find('.elevate').hide();
            }
            omen.show("slide", {direction: "right"});
        })
        if (msg.id == code_socks.id) {
            setMyName(msg.name);
        }
    });
    $('#other-user-menu').find('close-button').click(function (e) {
        e.preventDefault();
        $('#other-user-menu').hide("slide", {direction: "left"});
        chosenParticipant = null;
        return false;
    });
    $('#other-user-menu').find('.elevate').click( function (e) {
        e.preventDefault();
        socket.emit('promote', {id: chosenParticipant});
        return false;
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
        code_socks.people[msg.id] = msg.name;
    });
    socket.on('chat', function (msg) {
        log(msg.msg, msg.name);
    });

    $('.set-user-name a').click(function (e) {
        e.preventDefault();
        $('#settings').show();
        $(this).hide();
    })
    $('#set-name').click(function () {
        var name = $('#name').val();
        setMyName(name);
        tellName(name);
        $('#settings').hide();
        $('.set-user-name a').show();
    });
    $('#settings').submit(function (e) {
        e.preventDefault();
        return false;
    })
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
    var editorSymbol = $('#editor-symbol');
    function switchEditor(id) {
        $('#user-list').find('.editor').removeClass('editor');
        var newed = $('#user-list').find('#' + id);
        newed.addClass('editor');
        editorSymbol.appendTo(newed);
        editorSymbol.show();
    }
    function elevate(msg) {

        codeMirror.on('changes', onEdit);
        codeMirror.setOption('readOnly', false);
        $('#compile').attr('disabled', false);
        log("YOU are now the editor");
        switchEditor(msg.id);
    }
    function shame(msg) {
        codeMirror.off('changes', onEdit);
        codeMirror.setOption('readOnly', true);
        $('#compile').attr('disabled', true);
        log(msg.name + " is now the editor");
        switchEditor(msg.id);
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

