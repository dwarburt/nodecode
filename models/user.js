var LocalStrategy   = require('passport-local').Strategy;
var Mongo  = require('mongodb');
var bcrypt = require('bcrypt-nodejs');
var url = 'mongodb://localhost:27017/code';
var users = null;

Mongo.MongoClient.connect(url, function(err, db) {
  users = db.collection('users');
  console.log("Connected correctly to server");
});

function checkPass(password, input) {
  try {
    return bcrypt.compareSync(password, input);
  } catch (ex) {
    return false;
  }
}

var User = {
  findById: function (id, done) {

    User.first('_id', new Mongo.ObjectID(id), done);
  },
  findByEmail: function (email, done) {
    User.first('email', email, done);
  },
  first: function (key, value, done) {
    console.log("users.find... key: " + key + " value: " + value);
    var search = {};
    search[key] = value;
    users.find(search).toArray(function (err, docs) {
      if (err) {
        console.log("err: " + err);
        return done(err);
      }
      if (docs.length > 0) {
        console.log("docs.length: " + docs.length);
        console.log(docs[0]);
        return done(null, docs[0]);
      }
      console.log("done null: " + JSON.stringify(docs));
      return done(null);
    });
  },

  save: function (user) {
    users.save(user);
  },

  init: function (passport) {
    passport.serializeUser(function(user, done) {
      return done(null, user._id);
    });
    passport.deserializeUser(function(id, done) {
      console.log("looking up user: " + id);
      User.findById(id, function(err, user) {
        if (err) {
          return done(null, false);
        }
        return done(null, user);
      });
    });
    passport.use('login', new LocalStrategy({passReqToCallback: true},
      function(req, email, password, done) {
        User.findByEmail(email, function(err, user) { 
          if (err || !user) {
            return done(null, false);
          }

          if (checkPass(password, user.password)) {
            return done(null, user);
          }
          return done(null, false);
        });
      }
    ));
    passport.use('signup', new LocalStrategy({passReqToCallback: true},
      function(req, email, password, done) {
        User.findByEmail(email, function(err, user) {
          if (err) {
            return done(err);
          }
          if (user) {
            return done(null, false);
          }
          var newUser = {
            email: email,
            password: bcrypt.hashSync(password, bcrypt.genSaltSync(10), null)
          }; 
          users.insert(newUser, function (err) {
            if (err) {
              done(err);
              throw(err);
            }
            return done(null, newUser);
          });
        });
      }
    ));
  }
};

module.exports = User;
