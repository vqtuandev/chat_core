var MongoClient = require('mongodb').MongoClient;

var config = require('./config');

//var hostUserName = 'usercn';
//var hostPassword = 'P1234cn';
//var hostName = '127.0.0.1';
//var port = '17017';
//var databaseName = 'chatnhanh';

//var url = 'mongodb://' + hostUserName + ':' + hostPassword + '@' + hostName + ':' + port + '/?ssl=true&replicaSet=globaldb';
var url = 'mongodb://' + config.hostUserName + ':' + config.hostPassword + '@' + config.hostName + ':' + config.port + '/' + config.databaseName;
//var url = 'mongodb://chatnhanh:FqM23ZvEuOpczNtkHji6Z2iWo07NbXu9Mf9NsuowfVscdePzkW1037k08kAFrvdBUELHijROarvKydN7UYX45Q==@chatnhanh.documents.azure.com:10255/?ssl=true&replicaSet=globaldb';
console.log('dbUser', url);
var state = {
    db: null,
};

exports.connect = function (done) {
    if (state.db) return done();

    MongoClient.connect(url, {
        reconnectTries: Number.MAX_SAFE_INTEGER,
        reconnectInterval: 1000
    }, function (err, db) {
        if (err) return done(err);
        state.db = db;
        done();
    });
};

exports.get = function () {
    return state.db;
};

exports.close = function (done) {
    if (state.db) {
        state.db.close(function (err, result) {
            state.db = null;
            state.mode = null;
            done(err);
        });
    }
};