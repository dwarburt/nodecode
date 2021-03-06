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
    var editorSymbol = $('#editor-symbol');
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
        var me = $('#user-list').find('#' + code_socks.id).text(name)
            .append($('<span>').addClass('fa fa-user'));

        $('#user-menu .user-id .name').text(name);
        if (code_socks.amEditor()) {
            editorSymbol.appendTo(me);
        }
    }
    function tellName(name) {
        socket.emit('name', name);
    }

    if (window.codeprops.userName) {
        code_socks.name = window.codeprops.userName;
    } else if (window.localStorage) {
        code_socks.name = localStorage.getItem('userName');
    }
    if (window.codeprops.loggedIn) {
        code_socks.loggedIn = true;
    }
    if (code_socks.name) {
        setMyName(code_socks.name);
        tellName(code_socks.name);
    }

    socket.on('id', function (msg) {
        code_socks.id = msg.id;
    });
    var chosenParticipant;
    socket.on('join', function (msg) {
        updateCount(msg);
        var nu = $('<div>').attr('id', msg.id).addClass("participant").text(msg.name);
        code_socks.people[msg.id] = msg.name;
        $('#user-list').append(nu);
        nu.click(function () {
            if (chosenParticipant === $(this).attr('id')) {
                return;
            }
            chosenParticipant = $(this).attr('id');
            var omen = $('#other-user-menu');
            omen.hide();
            var oname = code_socks.people[chosenParticipant];
            omen.find('.name').text(oname);
            if (code_socks.amEditor() && chosenParticipant != code_socks.id) {
                omen.find('.elevate').show();
            } else {
                omen.find('.elevate').hide();
            }
            $('#other-user-menu')
                .find('.elevate')
                .text("Make " + oname + " the editor.");
            omen.show("slide", {direction: "right"});
        });
        if (msg.id == code_socks.id) {
            setMyName(msg.name);
        }
    });
    $('#other-user-menu').find('.close-button').click(function (e) {
        e.preventDefault();
        $('#other-user-menu').hide("slide", {direction: "right"});
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
    });
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
    });
    $('#talk').submit(function (e) {
        e.preventDefault();
        var msg = $('#chatmsg').val();
        if (msg !== "") {
            socket.emit('chat', msg);
        }
        $('#chatmsg').val("");
    });
    $('#compile').click(function () {
        socket.emit('compile', {code: codeMirror.getValue() });
    });
    function toggleUserMenu() {
        $('#header .navbutton').click();
    }

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
            for (var i = 0; i < msg.changes.length; i++) {
                var change = msg.changes[i];
                codeMirror.replaceRange(change.text, change.from,
                    change.to, change.origin);
            }
        }
    });

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

    if (window.localStorage && !window.localStorage.getItem('seenHelp')) {
        window.localStorage.setItem('seenHelp', true);
        $('#help').dialog();
    }
    $('a.show-help').click(function (e) {
        e.preventDefault();
        toggleUserMenu();
        $('#help').dialog();
        return false;
    });
    function loginSubmit() {
        var login = $('#login-form');
        var msg = {
            email: login.find('input[name=email]').val(),
            password: login.find('input[name=password]').val()
        };
        if (login.data('register')) {
            msg.confirm = login.find('input[name=passwordConfirmation]').val();
            msg.beta = login.find('input[name=betaCode]').val();
            socket.emit('register', msg);
        } else {
            socket.emit('login', msg);
        }
    }
    socket.on('loginSuccess', function (msg) {
        $('#login').dialog('close');
        $('#show-login').text('logout');
        code_socks.loggedIn = true;
    });
    socket.on('loginFailed', function (msg) {
        alert("You did not done logged in.");
    });
    socket.on('registerFailed', function (msg) {
        alert("You did not register: " + msg.reason);
    });
    socket.on('logoutSuccess', function (msg) {
        alert("You are logged out.");
        code_socks.loggedIn = false;
        $('#show-login').text('login');
    })
    socket.on('error', function (msg) {
        console.log("socket error: " + JSON.stringify(msg) );
    });
    $('#show-login').click(function (e) {
        e.preventDefault();
        if (code_socks.loggedIn) {
            socket.emit('logout');
            return;
        }
        toggleUserMenu();
        $('#login').dialog({width:400, modal:true, title:"Login", buttons: [
            { text: "OK", click: loginSubmit },
            { text: "Cancel", click: function () { $(this).dialog("close"); } }
        ]});
        return false;
    });
    $('#register').click(function (e) {
        var login = $('#login-form');
        e.preventDefault();
        if (! login.data('register')) {
            login.data('register', true);
            $('div.registration').show();
            $(this).text('Login');
        } else {
            login.data('register', false);
            $('div.registration').hide();
            $(this).text('Register');
        }
        return false;
    });

});

