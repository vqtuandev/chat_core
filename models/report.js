var db = require('./db');
var cache = require('memory-cache');
var cacheTime = 600000;
var async = require('async');

var ObjectId = require('mongodb').ObjectId;

var mbn = require('../services/mbn.js');

var errorLog = require('./errorLog.js');

var moment = require('moment');
var dateHelper = require('../utility/dateHelper.js');
var resultHelper = require('../utility/resultHelper.js');
var room = require('./room.js');

var roomCollection = 'rooms';
var userCollection = 'users';
var onlineLogPrefix = "userOnlineLog";

//user online log
function updateOnlineLog(userInfo, os, callback) {
    var collection = db.get().collection(onlineLogPrefix);
    var id = dateHelper.getUTCStartOfDayUnixTimeStamp();
    collection.findOne(
        { _id: id },
        function (err, doc) {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                if (doc == null) {
                    var doc = {
                        _id: id,
                        timeStamp: dateHelper.getUTCStartOfDay(),
                        users: [{ userId: userInfo._id, userInfo: userInfo, lastLogin: dateHelper.getUTCNow(), lastOS: os }]
                    };

                    collection.insert(doc, function (errX, res) {
                        if (errX) {
                            errorLog.addLog(errorLog.errorType.data, errX, function () { });
                            callback(resultHelper.returnResultDBError(errX));
                        }
                        else {
                            callback(resultHelper.returnResultSuccess(doc));
                        }
                    });
                }
                else {
                    collection.findOne(
                        {
                            _id: id,
                            users: {
                                $elemMatch: { userId: userInfo._id }
                            }
                        },
                        function (errF, doc) {
                            if (errF) {
                                errorLog.addLog(errorLog.errorType.data, errF, function () { });
                                callback(resultHelper.returnResultDBError(errF));
                            }
                            else {
                                if (doc) {
                                    collection.findOneAndUpdate(
                                        {
                                            _id: id,
                                            users: {
                                                $elemMatch: { userId: userInfo._id }
                                            }
                                        },
                                        {
                                            $set: {
                                                "users.$.userInfo": userInfo,
                                                "users.$.lastLogin": dateHelper.getUTCNow(),
                                                "users.$.lastOS": os
                                            }
                                        },
                                        {
                                            returnOriginal: false,
                                            new: true
                                        },
                                        function (errU, doc) {
                                            if (errU) {
                                                errorLog.addLog(errorLog.errorType.data, errU, function () { });
                                                callback(resultHelper.returnResultDBError(errU));
                                            }
                                            else {
                                                callback(resultHelper.returnResultSuccess(doc));
                                            }
                                        }
                                    );
                                }
                                else {
                                    collection.findOneAndUpdate(
                                        {
                                            _id: id,
                                        },
                                        {
                                            $addToSet: {
                                                "users": { userId: userInfo._id, userInfo: userInfo, lastLogin: dateHelper.getUTCNow(), lastOS: os }
                                            }
                                        },
                                        {
                                            returnOriginal: false,
                                            new: true
                                        },
                                        function (errU, doc) {
                                            if (errU) {
                                                errorLog.addLog(errorLog.errorType.data, errU, function () { });
                                                callback(resultHelper.returnResultDBError(errU));
                                            }
                                            else {
                                                callback(resultHelper.returnResultSuccess(doc));
                                            }
                                        }
                                    );
                                }
                            }
                        });
                }
            }
        });
}

exports.updateOnlineLog = updateOnlineLog;

function getOnlineLogByDate(date, os, pageIndex, itemPerPage, callback) {
    var collection = db.get().collection(onlineLogPrefix);
    var id = dateHelper.getUTCStartOfDayUnixTimeStamp(date);
    collection.findOne({
        _id: id
    }, function (err, doc) {
        if (err) {
            errorLog.addLog(errorLog.errorType.data, err, function () { });
            callback(resultHelper.returnResultDBError(err));
        }
        else {
            if (!doc) {
                doc = {
                    _id: id,
                    timeStamp: dateHelper.getUTCStartOfDay(),
                    users: [],
                    pageIndex: 0,
                    itemPerPage: itemPerPage,
                    total: 0
                };
            }
            else {
                if (os) {
                    doc.users = doc.users.filter(function (val) {
                        return val.lastOS == os;
                    });
                }
                doc.total = doc.users.length;
                doc.pageIndex = pageIndex;
                doc.itemPerPage = itemPerPage;
                var start = pageIndex * itemPerPage;
                var end = start + itemPerPage;
                doc.users = doc.users.slice(start, end);
            }
            callback(resultHelper.returnResultSuccess(doc));
        }
    });
}

exports.getOnlineLogByDate = getOnlineLogByDate;

exports.getUserOnlineCountPerDay = function (fromDate, toDate, os, callback) {
    var collection = db.get().collection(onlineLogPrefix);
    fromDate = dateHelper.getUTCStartOfDayUnixTimeStamp(fromDate);
    toDate = dateHelper.getUTCStartOfDayUnixTimeStamp(toDate);
    var query = { $ne: ['$users.userId', 0] };
    if (os) {
        query = {
            $eq: ['$users.lastOS', os]
        };
    }

    collection.aggregate([
        {
            $match: {
                $and: [
                    { _id: { $gte: fromDate } },
                    { _id: { $lte: toDate } },
                ]
            }
        },
        {
            "$unwind": "$users"
        },
        {
            $group: {
                _id: '$timeStamp',
                count: {
                    $sum: {
                        $cond: {
                            if: query,
                            then: 1,
                            else: 0
                        }
                    }
                }
            }
        },
        {
            "$sort": {
                _id: 1
            }
        }
    ]).toArray(function (err, docs) {
        if (err) {
            errorLog.addLog(errorLog.errorType.data, err, function () { });
            callback(resultHelper.returnResultDBError(err));
        }
        else {
            callback(resultHelper.returnResultSuccess(docs));
        }
    });
}

exports.getUserOnlineCountPerMonth = function (fromDate, toDate, os, callback) {
    var collection = db.get().collection(onlineLogPrefix);
    fromDate = dateHelper.getUTCStartOfDayUnixTimeStamp(fromDate);
    toDate = dateHelper.getUTCStartOfDayUnixTimeStamp(toDate);
    var query = { $ne: ['$users.userId', 0] };
    if (os) {
        query = {
            $eq: ['$users.lastOS', os]
        };
    }

    collection.aggregate([
        {
            $match: {
                $and: [
                    { _id: { $gte: fromDate } },
                    { _id: { $lte: toDate } },
                ]
            }
        },
        {
            "$unwind": "$users"
        },
        {
            $group: {
                _id: { $substr: ['$timeStamp', 0, 7] },
                count: {
                    $sum: {
                        $cond: {
                            if: query,
                            then: 1,
                            else: 0
                        }
                    }
                }
            }
        },
        {
            "$sort": {
                _id: 1
            }
        }
    ]).toArray(function (err, docs) {
        if (err) {
            errorLog.addLog(errorLog.errorType.data, err, function () { });
            callback(resultHelper.returnResultDBError(err));
        }
        else {
            callback(resultHelper.returnResultSuccess(docs));
        }
    });
}

//not reply room
exports.getItemRoomNotReply = function (userId, fromDate, toDate, lastDate, itemCount, callback) {
    var collection = db.get().collection(roomCollection);

    fromDate = dateHelper.getUTCStartOfDay(fromDate);
    toDate = dateHelper.getUTCEndOfDay(toDate);
    if (!lastDate) {
        lastDate = toDate;
    }
    collection.aggregate(
        [
            {
                $match: {
                    $and: [
                        {
                            type: room.roomType.item
                        },
                        {
                            replied: { $exists: false }
                        },
                        {
                            lastLogDate: { $lte: toDate }
                        },
                        {
                            lastLogDate: { $gte: fromDate }
                        },
                        {
                            lastLogDate: { $lt: lastDate }
                        },
                        {
                            lastLog: { $exists: true }
                        }
                    ]
                }
            },
            { $unwind: '$members' },
            {
                $lookup: {
                    from: 'users',
                    localField: 'members.userId',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: "$userInfo" },
            {
                $group: {
                    _id: '$_id',
                    type: { $first: '$type' },
                    userIdGuest: {
                        $first: '$userIdGuest'
                    },
                    userIdOwner: {
                        $first: '$userIdOwner'
                    },
                    item: {
                        $first: '$item'
                    },
                    members: {
                        $push: {
                            userId: '$members.userId',
                            userInfo: '$userInfo',
                            isArchived: '$members.isArchived',
                            isDelete: '$members.isDelete',
                            isMuted: '$members.isMuted',
                            isGuest: '$members.isGuest',
                            isFavorite: '$members.isFavorite'
                        }
                    },
                    createDate: {
                        $first: '$createDate'
                    },
                    lastLogDate: {
                        $first: '$lastLogDate'
                    },
                    lastLog: {
                        $first: '$lastLog'
                    },
                    roomName: {
                        $first: '$roomName'
                    },
                    roomAvatar: {
                        $first: '$roomAvatar'
                    }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'lastLog.userIdAuthor',
                    foreignField: '_id',
                    as: 'lastLogAuthor'
                }
            },
            { $unwind: '$lastLogAuthor' },
            {
                $project: {
                    _id: '$_id',
                    type: '$type',
                    members: '$members',
                    item: '$item',
                    userIdGuest: '$userIdGuest',
                    userIdOwner: '$userIdOwner',
                    createDate: '$createDate',
                    lastLogDate: '$lastLogDate',
                    lastLog: '$lastLog',
                    lastLogAuthor: '$lastLogAuthor',
                    roomName: '$roomName',
                    roomAvatar: '$roomAvatar'
                }
            }
        ]).sort({ lastLogDate: -1 }).limit(itemCount).toArray(function (err, docs) {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                //console.log(docs[0].members);
                for (var i = 0; i < docs.length; i++) {
                    docs[i] = room.parseRoomInfo(docs[i], userId);
                }

                collection.count({
                    $and: [
                        {
                            type: room.roomType.item
                        },
                        {
                            replied: { $exists: false }
                        },
                        {
                            lastLogDate: { $lte: toDate }
                        },
                        {
                            lastLogDate: { $gte: fromDate }
                        },
                        {
                            lastLogDate: { $lt: lastDate }
                        },
                        {
                            lastLog: { $exists: true }
                        }
                    ]
                }, function (errC, total) {
                    if (errC) {
                        errorLog.addLog(errorLog.errorType.data, errC, function () { });
                        callback(resultHelper.returnResultDBError(errC));
                    }
                    else {
                        var res = {
                            total: total,
                            list: docs
                        };

                        callback(resultHelper.returnResultSuccess(res));
                    }
                });


            }
        });
}

exports.getPageRoomNotReply = function (userId, fromDate, toDate, lastDate, itemCount, callback) {
    var collection = db.get().collection(roomCollection);

    fromDate = dateHelper.getUTCStartOfDay(fromDate);
    toDate = dateHelper.getUTCEndOfDay(toDate);
    if (!lastDate) {
        lastDate = toDate;
    }
    collection.aggregate(
        [
            {
                $match: {
                    $and: [
                        {
                            type: room.roomType.page
                        },
                        {
                            replied: { $exists: false }
                        },
                        {
                            lastLogDate: { $lte: toDate }
                        },
                        {
                            lastLogDate: { $gte: fromDate }
                        },
                        {
                            lastLogDate: { $lt: lastDate }
                        },
                        {
                            lastLog: { $exists: true }
                        }
                    ]
                }
            },
            { $unwind: '$members' },
            {
                $lookup: {
                    from: 'users',
                    localField: 'members.userId',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: "$userInfo" },
            {
                $group: {
                    _id: '$_id',
                    type: { $first: '$type' },
                    userIdGuest: {
                        $first: '$userIdGuest'
                    },
                    page: {
                        $first: '$page'
                    },
                    members: {
                        $push: {
                            userId: '$members.userId',
                            userInfo: '$userInfo',
                            isArchived: '$members.isArchived',
                            isDelete: '$members.isDelete',
                            isMuted: '$members.isMuted',
                            isGuest: '$members.isGuest',
                            isFavorite: '$members.isFavorite'
                        }
                    },
                    createDate: {
                        $first: '$createDate'
                    },
                    lastLogDate: {
                        $first: '$lastLogDate'
                    },
                    lastLog: {
                        $first: '$lastLog'
                    },
                    roomName: {
                        $first: '$roomName'
                    },
                    roomAvatar: {
                        $first: '$roomAvatar'
                    }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'lastLog.userIdAuthor',
                    foreignField: '_id',
                    as: 'lastLogAuthor'
                }
            },
            { $unwind: '$lastLogAuthor' },
            {
                $project: {
                    _id: '$_id',
                    type: '$type',
                    members: '$members',
                    page: '$page',
                    userIdGuest: '$userIdGuest',
                    createDate: '$createDate',
                    lastLogDate: '$lastLogDate',
                    lastLog: '$lastLog',
                    lastLogAuthor: '$lastLogAuthor',
                    roomName: '$roomName',
                    roomAvatar: '$roomAvatar'
                }
            }
        ]).sort({ lastLogDate: -1 }).limit(itemCount).toArray(function (err, docs) {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                //console.log(docs[0].members);
                for (var i = 0; i < docs.length; i++) {
                    docs[i] = room.parseRoomInfo(docs[i], userId);
                }

                collection.count({
                    $and: [
                        {
                            type: room.roomType.page
                        },
                        {
                            replied: { $exists: false }
                        },
                        {
                            lastLogDate: { $lte: toDate }
                        },
                        {
                            lastLogDate: { $gte: fromDate }
                        },
                        {
                            lastLogDate: { $lt: lastDate }
                        },
                        {
                            lastLog: { $exists: true }
                        }
                    ]
                }, function (errC, total) {
                    if (errC) {
                        errorLog.addLog(errorLog.errorType.data, errC, function () { });
                        callback(resultHelper.returnResultDBError(errC));
                    }
                    else {
                        var res = {
                            total: total,
                            list: docs
                        };

                        callback(resultHelper.returnResultSuccess(res));
                    }
                });
            }
        });
}

exports.updateAllRoomReplied = function () {
    var collection = db.get().collection(roomCollection);
    collection.updateMany(
        { type: "page" },
        {
            $set: {
                replied: true
            }
        },
        {
        },
        function (err, res) {
            console.log(err);
        });
}

//user first chat
exports.getUserByCreateDate = function (fromDate, toDate, os, lastDate, itemCount, callback) {
    var collection = db.get().collection(userCollection);
    fromDate = dateHelper.getUTCStartOfDay(fromDate);
    toDate = dateHelper.getUTCEndOfDay(toDate);
    if (!lastDate) {
        lastDate = toDate;
    }

    var query = {
        $and: [
            {
                createDate: { $exists: true }
            },
            {
                createDate: { $lte: toDate }
            },
            {
                createDate: { $gte: fromDate }
            },
            {
                createDate: { $lt: lastDate }
            }
        ]
    };

    if (os) {
        query.$and.push({ createOS: os });
    }

    collection.find(query).sort({ createDate: -1 }).limit(itemCount)
        .toArray(function (err, docs) {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                var queryCount = {
                    $and: [
                        {
                            createDate: { $exists: true }
                        },
                        {
                            createDate: { $lte: toDate }
                        },
                        {
                            createDate: { $gte: fromDate }
                        }
                    ]
                };

                if (os) {
                    queryCount.$and.push({ createOS: os });
                }
                collection.count(query, function (errC, total) {
                    if (errC) {
                        errorLog.addLog(errorLog.errorType.data, errC, function () { });
                        callback(resultHelper.returnResultDBError(errC));
                    }
                    else {
                        var res = {
                            total: total,
                            list: docs
                        };
                        callback(resultHelper.returnResultSuccess(res));
                    }
                });

            }
        });

}

exports.getUserStartChatByDay = function (fromDate, toDate, os, callback) {
    var collection = db.get().collection(userCollection);
    fromDate = dateHelper.getUTCStartOfDay(fromDate);
    toDate = dateHelper.getUTCEndOfDay(toDate);

    var query = {
        $and: [
            {
                createDate: { $exists: true }
            },
            {
                createDate: { $lte: toDate }
            },
            {
                createDate: { $gte: fromDate }
            }
        ]
    };

    if (os) {
        query.$and.push({ createOS: os });
    }

    collection.aggregate([
        {
            $match: query
        },
        {
            $group: {
                _id: { $substr: ['$createDate', 0, 10] },
                count: {
                    $sum: 1
                }
            }
        },
        {
            "$sort": {
                _id: 1
            }
        }
    ]).toArray(function (err, docs) {
        if (err) {
            errorLog.addLog(errorLog.errorType.data, err, function () { });
            callback(resultHelper.returnResultDBError(err));
        }
        else {
            callback(resultHelper.returnResultSuccess(docs));
        }
    });
}

exports.getUserStartChatByMonth = function (fromDate, toDate, os, callback) {
    var collection = db.get().collection(userCollection);
    fromDate = dateHelper.getUTCStartOfDay(fromDate);
    toDate = dateHelper.getUTCEndOfDay(toDate);

    var query = {
        $and: [
            {
                createDate: { $exists: true }
            },
            {
                createDate: { $lte: toDate }
            },
            {
                createDate: { $gte: fromDate }
            }
        ]
    };

    if (os) {
        query.$and.push({ createOS: os });
    }

    collection.aggregate([
        {
            $match: query
        },
        {
            $group: {
                _id: { $substr: ['$createDate', 0, 7] },
                count: {
                    $sum: 1
                }
            }
        },
        {
            "$sort": {
                _id: 1
            }
        }
    ]).toArray(function (err, docs) {
        if (err) {
            errorLog.addLog(errorLog.errorType.data, err, function () { });
            callback(resultHelper.returnResultDBError(err));
        }
        else {
            callback(resultHelper.returnResultSuccess(docs));
        }
    });
}

//dashboard
exports.getTotalSummary = function (callback) {
    db.get().listCollections({
        name: {
            $regex: /^room_/
        }
    }
    ).toArray(function (err, names) {
        var totalRoom = names.length;
        var totalMessage = 0;
        async.forEachOf(names, function (v, i, cb) {
            var count = db.get().collection(v.name).count(function (errC, total) {
                if (!errC && total) {
                    totalMessage += total;
                }
                cb();
            });
        }, function (errX) {
            if (errX) {
            }
            else {                
                db.get().collection(userCollection).count(function (err, total) {
                    var res = {
                        totalRoom: totalRoom,
                        totalMessage: totalMessage,
                        totalUser: total
                    };
                    callback(resultHelper.returnResultSuccess(res));
                });
            }
        });
    });
}

