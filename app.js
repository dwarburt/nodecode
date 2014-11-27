// modules
var http         = require('http');
var express      = require('express');
var path         = require('path');
var favicon      = require('serve-favicon');
var logger       = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var session      = require('express-session');
var MongoStore   = require('connect-mongo')(session);
var debug        = require('debug')('nodecode');
var passport     = require('passport');
var passSocket   = require("passport.socketio");
// routes
var routes       = require('./routes/index');
var users        = require('./routes/users');

// models
var User = require('./models/user');

// spin up server
var app = express();
app.set('port', process.env.PORT || 3000);
app.set('secret', 'banana bread');
app.set('cookie_name', 'connect.sid');

var sessionStore = new MongoStore({url: "mongodb://localhost:27017/code/sessions"});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

//configure middleware
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(logger('tiny'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
    secret:            app.get('secret'),
    name:              app.get('cookie_name'),
    store:             sessionStore,
    resave:            false,
    saveUninitialized: false
}));
app.use(function setSessionDuration(req, res, next) {
  req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 7;
  //                           ms     s    m    h   d -> 1 week.
  next();
})

app.use(passport.initialize());
app.use(passport.session());
User.init(passport);

var server = http.createServer(app);
server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});


var io = require('socket.io')
  .listen(server)
  .use(passSocket.authorize({
    cookieParser: cookieParser,
    key:          app.get('cookie_name'),
    secret:       app.get('secret'),
    store:        sessionStore,
    fail:         function (d,m,e,a) { a(null, true); }
  }));

  ;
var sockMan = require('./models/socket_manager.js').manage(io, User);

//setup routes
app.use('/', routes);
app.use('/users', users(passport));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
