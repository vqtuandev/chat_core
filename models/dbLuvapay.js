var MongoClient = require('mongodb').MongoClient;

// var config = {
//     hostUserName: 'luvapay',
//     hostPassword: 'P12345768lvp',
//     hostName: '45.119.214.134',
//     port: 17017,
//     databaseName: 'luvapay'
// };

var config = {
    hostUserName: 'luva',
    hostPassword:'123456798',
    hostName: '149.28.151.248',
    port: '27017',
    databaseName: 'luvapay'
};

var url = 'mongodb://' + config.hostUserName + ':' + config.hostPassword + '@' + config.hostName + ':' + config.port + '/' + config.databaseName;

console.log('dbLuvapay', url);

var state = {
    db: null,
};

exports.connect = function (done) {
    if (state.db) return done();

    MongoClient.connect(url,
        {
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
