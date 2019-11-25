var db = require('./db');
var ObjectId = require('mongodb').ObjectId;

var dateHelper = require('../utility/dateHelper');
var resultHelper = require('../utility/resultHelper');

var errorType = {
    data: 'data',
    mbn: 'mbn',
    azureStorage: 'azureStorage',
    oneSignal: 'oneSignal',
    myxteamV1: 'myxteamV1',
    luvaService: 'luvaService'
};

exports.errorType = errorType;

function addLog (type, error, callback) {
    var collection = db.get().collection(type + '_errorLogs');
    collection.insert({
        error: error,
        date: dateHelper.getUTCNow()
    }, function (err, doc) {
        callback(err);
    });
}
exports.addLog = addLog;
///ghi log và trả về callback
exports.processError = function (err, callback) {
    addLog(errorType.data, err, function () { });
    if (typeof callback === 'function') {
        callback(resultHelper.returnResultDBError(err));
    }
}