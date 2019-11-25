var _ = require('lodash');
var db = require('./db');
var ObjectId = require('mongodb').ObjectId;

var moment = require('moment');
var dateHelper = require('../utility/dateHelper.js');
var resultHelper = require('../utility/resultHelper.js');

var roomData = require('./room.js');
var userData = require('./user.js');
var errorLog = require('./errorLog.js');

var azure = require('../services/azure.js');

function getPlanCollection() {
    return db.get().collection('plans');
}

function generateModel(userId, roomId, chatLogId, title, timeStamp, duration, place) {
    return {
        userId: userId,
        roomId: roomId,
        chatLogId: chatLogId,
        title: title,
        timeStamp: timeStamp,
        duration: duration,
        place: place,
        createDate: dateHelper.getUTCNow(),
        updateDate: dateHelper.getUTCNow(),
        updateUserId: userId,
        isDelete: false,
        isDone: false
    };
}

function addPlanSchedule(userId, roomId, chatLogId, title, timeStamp, duration, place, callback) {
    var collection = getPlanCollection();

    var doc = generateModel(userId, roomId, chatLogId, title, timeStamp, duration, place);
    collection.insert(doc, (err, res) => {
        if (err) {
            errorLog.addLog(errorLog.errorType.data, err, function () { });
            callback(resultHelper.returnResultDBError(err));
        }
        else {
            callback(resultHelper.returnResultSuccess(doc));
        }
    });
}
exports.addPlanSchedule = addPlanSchedule;

function updatePlanSchedule(userId, roomId, chatLogId, title, timeStamp, duration, place, callback) {
    var collection = getPlanCollection();

    collection.findOneAndUpdate(
        {
            roomId: roomId,
            chatLogId: chatLogId
        },
        {
            $set: {
                title: title,
                timeStamp: timeStamp,
                duration: duration,
                place: place,
                updateDate: dateHelper.getUTCNow(),
                updateUserId: userId
            }
        },
        {
            returnOriginal: false
        },
        function (err, result) {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                doc = null;
                if (result) {
                    doc = result.value;
                }
                callback(resultHelper.returnResultSuccess(doc));
            }
        }
    );
}
exports.updatePlanSchedule = updatePlanSchedule;

function deletePlanSchedule(userId, roomId, chatLogId, callback) {
    var collection = getPlanCollection();

    collection.findOneAndUpdate(
        {
            roomId: roomId,
            chatLogId: chatLogId
        },
        {
            $set: {
                isDelete: true,
                deleteUserId: userId,
                deleteDate: dateHelper.getUTCNow()
            }
        },
        {
            returnOriginal: false
        },
        function (err, result) {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                doc = null;
                if (result) {
                    doc = result.value;
                }
                callback(resultHelper.returnResultSuccess(doc));
            }
        }
    );
}
exports.deletePlanSchedule = deletePlanSchedule;

function updatePlanScheduleDone(roomId, chatLogId, callback) {
    var collection = getPlanCollection();
    collection.findOneAndUpdate(
        {
            roomId: roomId,
            chatLogId: chatLogId
        },
        {
            $set: {
                isDone: true,
                doneDate: dateHelper.getUTCNow()
            }
        },
        {
            returnOriginal: false
        },
        function (err, result) {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                doc = null;
                if (result) {
                    doc = result.value;
                }
                callback(resultHelper.returnResultSuccess(doc));
            }
        }
    );
}
exports.updatePlanScheduleDone = updatePlanScheduleDone;

function getUpcomingPlanSchedule(timeStamp, pastMinute, callback) {
    var collection = getPlanCollection();

    var from = timeStamp - (pastMinute * 60);
    var to = timeStamp + 59;

    collection.find(
        {
            timeStamp: {
                $gte: from,
                $lt: to
            },
            isDelete: false,
            isDone: false
        })
        .toArray((err, docs) => {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                callback(resultHelper.returnResultSuccess(docs));
            }
        }
        );
}
exports.getUpcomingPlanSchedule = getUpcomingPlanSchedule;