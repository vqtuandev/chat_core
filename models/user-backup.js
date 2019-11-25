var _ = require('lodash');
var async = require('async');
var moment = require('moment');

var db = require('./dbUser');
var cache = require('memory-cache');
var cacheTime = 600000;

var ObjectId = require('mongodb').ObjectId;

var mbn = require('../services/mbn.js');

var errorLog = require('./errorLog.js');


var dateHelper = require('../utility/dateHelper.js');
var resultHelper = require('../utility/resultHelper.js');
var errorCodes = resultHelper.errorCodes;
var userPrefix = 'user_';

function updateUser(userId, name, phone, email, avatar, url, token, os, callback, admin, updateOnly, callbackIsNew) {
    //xóa cache
    cache.del(userPrefix + userId);

    var collection = db.get().collection('users');
    var doc = {
        _id: userId,
        name: name,
        phone: phone,
        email: email,
        avatar: avatar,
        url: url,
        token: token,
        lastUpdate: dateHelper.getUTCNow()
    };

    if (admin) {
        doc.admin = admin;
    }

    collection.findOne(
        { _id: userId },
        function (errF, docX) {
            if (errF) {
            }
            else {
                if (docX) {
                    if (docX.createDate) {
                        doc.createDate = docX.createDate;
                    }
                    else {
                        doc.createDate = docX.lastUpdate;
                    }
                    if (docX.createOS) {
                        doc.createOS = docX.createOS;
                    }
                    else if (os) {
                        doc.createOS = os;
                    }
                    if (docX.admin && !doc.admin) {
                        doc.admin = docX.admin;
                    }
                    if (typeof callbackIsNew == 'function') {
                        callbackIsNew(docX.lastUpdate);
                    }
                }
                else {
                    if (typeof callbackIsNew == 'function') {
                        callbackIsNew(true);
                    }

                    doc.createDate = doc.lastUpdate;
                    if (os) {
                        doc.createOS = os;
                    }
                }

                if ((updateOnly && docX) || !updateOnly) {
                    collection.findAndModify(
                        { _id: userId },
                        { _id: 1 },
                        {
                            $set: doc
                        },
                        {
                            upsert: true,
                            new: true
                        },
                        function (err, result) {
                            if (err) {
                                errorLog.addLog(errorLog.errorType.data, err, function () { });
                                callback(resultHelper.returnResultDBError(err));
                            }
                            else {
                                doc = result.value;
                                //thêm vào cache
                                cache.put(userPrefix + userId, doc, cacheTime, function (key, value) {
                                    console.log('user: ' + key + ' cache expire ');
                                });
                                callback(resultHelper.returnResultSuccess(doc));
                            }
                        }
                    );
                }
                else {
                    callback(resultHelper.returnResultNotExists('Chưa có user'));
                }
            }
        }
    );
}

exports.updateUser = updateUser;

exports.getUserInfoReturn = function (userId, os) {
    return new Promise((resolve, reject) => {
        getUserInfo(userId, function (result) {
            resolve(result);
        }, os);
    });
}

exports.getUserInfo = getUserInfo;
function getUserInfo(userId, callback, os) {

    var doc = cache.get(userPrefix + userId);
    if (doc == null) {
        var collection = db.get().collection('users');

        collection.findOne({
            _id: userId
        },
            function (err, doc) {
                if (err) {
                    errorLog.addLog(errorLog.errorType.data, err, function () { });
                    callback(resultHelper.returnResultDBError(err));
                }
                else {
                    if (doc == null) {
                        mbn.userDetail(userId, '', '', function (res) {
                            //console.log('get from mbn');
                            //console.log(res);
                            if (res.errorCode == 0) {
                                var user = res.data;
                                updateUser(user.id, user.name, user.phone_number, user.email, user.avatar_url, user.url, '', os, function (res1) {
                                    callback(res1);
                                });
                            }
                            else {
                                callback(res);
                            }
                        });
                    }
                    else {
                        //console.log('get from db');
                        cache.put(userPrefix + userId, doc, cacheTime, function (key, value) {
                            console.log('user: ' + key + ' cache expire ');
                        });
                        callback(resultHelper.returnResultSuccess(doc));
                    }
                }
            });
    }
    else {
        //console.log('get from cache');
        callback(resultHelper.returnResultSuccess(doc));
    }
}

exports.getUserInfoFromCache = function (userId) {
    return cache.get(userPrefix + userId);
}

exports.syncUserList = function (userId, userIds, callback) {
    var collection = db.get().collection('users');
    mbn.getUserListById(userId, userIds, (result) => {
        var userResult = [];
        if (result.errorCode == errorCodes.success) {
            var users = result.data;
            async.eachSeries(users, (user, cb) => {
                updateUser(user.id, user.name, user.phone, user.email, user.avatar_url, user.url, '', 'web', (res) => {
                    if (res.errorCode == errorCodes.success) {
                        var u = {
                            _id: res.data._id,
                            name: res.data.name,
                            phone: res.data.phone,
                            email: res.data.email,
                            avatar: res.data.avatar,
                            url: res.data.url
                        };
                        userResult.push(u);
                    }
                    cb();
                });
            }, (err) => {

                if (err) {
                    errorLog.addLog(errorLog.errorType.data, err, function () { });
                    //callback(resultHelper.returnResultDBError(err));
                }
                //else {
                callback(resultHelper.returnResultSuccess(userResult));
                //}
            });
        }
        else {
            callback(result);
        }
    });
}

exports.getUserInfoList = function (userIds, callback) {
    var collection = db.get().collection('users');

    collection.find({
        _id: { $in: userIds }
    })
        .project({
            _id: 1,
            name: 1,
            phone: 1,
            email: 1,
            avatar: 1,
            url: 1
        })        
        .toArray(
        function (err, docs) {
            //console.log(docs);
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                //thêm vào cache
                callback(resultHelper.returnResultSuccess(docs));
            }
        });
}

function addNewContact(userId, newContacts, callback) {
    //xóa cache
    cache.del(userPrefix + userId);

    var collection = db.get().collection('users');

    collection.findAndModify(
        { _id: userId },
        { _id: 'asc' },
        { $addToSet: { contacts: { $each: newContacts } } },
        { new: true },
        function (err, result) {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                doc = result.value;
                //thêm vào cache
                cache.put(userPrefix + userId, doc, cacheTime, function (key, value) {
                    console.log('user: ' + key + ' cache expire ');
                });

                callback(resultHelper.returnResultSuccess(doc));
            }
        });
}

function fixContactData(userId, callback) {
    var collection = db.get().collection('users');
    collection.findOne(
        { _id: userId },
        function (err, doc) {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                if (doc && doc.contacts && doc.contacts.length > 0) {
                    var needSave = false;
                    for (var i = 0; i < doc.contacts.length; i++) {
                        var contact = doc.contacts[i];
                        if (!_.isObject(contact)) {
                            doc.contacts[i] = { _id: contact };
                            needSave = true;
                        }
                    }
                }

                if (needSave) {
                    collection.save(doc, (err, res) => {
                        callback(resultHelper.returnResultSuccess());
                    });
                }
                else {
                    callback(resultHelper.returnResultSuccess());
                }
            }
        }
    );
}

exports.addContact = function (userId, contacts, callback) {
    cache.del(userPrefix + userId);

    var collection = db.get().collection('users');

    collection.findAndModify(
        { _id: userId },
        { _id: 'asc' },
        { $addToSet: { contacts: { $each: contacts } } },
        { new: true },
        function (err, result) {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                doc = result.value;
                //thêm vào cache
                cache.put(userPrefix + userId, doc, cacheTime, function (key, value) {
                    console.log('user: ' + key + ' cache expire ');
                });

                callback(resultHelper.returnResultSuccess(doc));
            }
        });
}

//exports.addContact = function (userId, contacts, callback) {
//    //xóa cache
//    cache.del(userPrefix + userId);

//    fixContactData(userId, (res) => {
//        var collection = db.get().collection('users');

//        collection.findOne(
//            { _id: userId },
//            function (err, doc) {
//                if (err) {
//                    errorLog.addLog(errorLog.errorType.data, err, function () { });
//                    callback(resultHelper.returnResultDBError(err));
//                }
//                else {
//                    if (doc) {
//                        var hasFound = [];
//                        if (doc.contacts && doc.contacts.length > 0) {
//                            //duyệt và cập nhật tên những liên hệ đã có trước đó

//                            for (var i = 0; i < doc.contacts.length; i++) {
//                                var c = _.isObject(doc.contacts[i]) ? doc.contacts[i]._id : doc.contacts[i];

//                                if (_.some(contacts, (x) => { return _.isObject(x) ? x._id == c : x == c; })) {
//                                    var x = _.find(contacts, (z) => {
//                                        return _.isObject(z) ? z._id == c : z == c;
//                                    });

//                                    if (_.isObject(x)) {
//                                        doc.contacts[i].name = x.name;
//                                    }
//                                    hasFound.push(x._id);
//                                }
//                            }

//                            doc.contacts = _.uniqBy(doc.contacts, (x) => {
//                                return x._id;
//                            });
//                            //console.log(hasFound);
//                            //lưu cập nhật
//                            collection.save(doc, (err, res) => {
//                                //lọc danh sách contact mới
//                                console.log(contacts);
//                                var newContacts = _.filter(contacts, (c) => {
//                                    return !_.some(hasFound, (x) => {
//                                        return _.isObject(c) ? x == c._id : x == c;
//                                    });
//                                });

//                                newContacts = _.map(newContacts, (c) => {
//                                    return {
//                                        _id: _.isObject(c) ? c._id : c,
//                                        name: _.isObject(c) ? c.name : ''
//                                    };
//                                });

//                                //console.log(newContacts);
//                                //thêm contacts mới
//                                addNewContact(userId, newContacts, (result) => {
//                                    callback(result);
//                                });
//                            });
//                        }
//                        else {
//                            newContacts = _.map(contacts, (c) => {
//                                return {
//                                    _id: _.isObject(c) ? c._id : c,
//                                    name: _.isObject(c) ? c.name : ''
//                                };
//                            });

//                            //console.log(newContacts);
//                            //thêm contacts mới
//                            addNewContact(userId, newContacts, (result) => {
//                                callback(result);
//                            });
//                        }
//                    }
//                    else {
//                        callback(resultHelper.returnResultNotExists({ userId: true }));
//                    }
//                }
//            }
//        );
//    });
//}

exports.removeContact = function (userId, contacts, callback) {
    //xóa cache
    cache.del(userPrefix + userId);
    //console.log('contacts');
    //console.log(contacts);
    var collection = db.get().collection('users');
    collection.findAndModify(
        { _id: userId },
        { _id: 'asc' },
        {
            $pull: {
                contacts: { $in: contacts }
            }
        },
        { new: true },
        function (err, result) {
            if (err) {
                console.log(err);
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                collection.findAndModify(
                    { _id: userId },
                    { _id: 'asc' },
                    {
                        $pull: {
                            contacts: {
                                _id: { $in: contacts }
                            }
                        }
                    },
                    { new: true },
                    function (errX, resultX) {
                        if (errX) {
                            console.log(errX);
                            errorLog.addLog(errorLog.errorType.data, errX, function () { });
                            callback(resultHelper.returnResultDBError(errX));
                        }
                        else {
                            doc = resultX.value;
                            //thêm vào cache
                            cache.put(userPrefix + userId, doc, cacheTime, function (key, value) {
                                console.log('user: ' + key + ' cache expire ');
                            });

                            callback(resultHelper.returnResultSuccess(doc));
                        }
                    });
            }
        });
}

//exports.removeContact = function (userId, contacts, callback) {
//    //xóa cache
//    cache.del(userPrefix + userId);

//    var collection = db.get().collection('users');
//    collection.findOne(
//        { _id: userId },
//        function (err, doc) {
//            if (err) {
//                errorLog.addLog(errorLog.errorType.data, err, function () { });
//                callback(resultHelper.returnResultDBError(err));
//            }
//            else {
//                //console.log(doc);
//                if (doc) {
//                    //console.log('length', doc.contacts.length);
//                    if (doc.contacts && doc.contacts.length > 0) {
//                        //console.log('fcukl');
//                        for (var i = doc.contacts.length - 1; i >= 0; i--) {
//                            //console.log(i);
//                            var c = _.isObject(doc.contacts[i]) ? doc.contacts[i]._id : doc.contacts[i];
//                            //console.log('check', c);
//                            if (_.some(contacts, (x) => { return _.isObject(x) ? x._id == c : x == c; })) {
//                                //console.log('remove',i);
//                                doc.contacts.splice(i, 1);
//                            }
//                        }

//                        collection.save(doc, (err, res) => {
//                            //thêm vào cache
//                            cache.put(userPrefix + userId, doc, cacheTime, function (key, value) {
//                                console.log('user: ' + key + ' cache expire ');
//                            });

//                            callback(resultHelper.returnResultSuccess(doc));
//                        });
//                    }
//                }
//                else {
//                    callback(resultHelper.returnResultNotExists({ userId: true }));
//                }
//            }
//        });
//}

function getUserHasContact(userId, callback) {
    var collection = db.get().collection('users');
    collection.find({
        $or: [
            { contacts: userId },
            { contacts: { _id: userId } }
        ]
    })
        .project({
            _id: 1,
            oneSignalUserIds: 1,
            contacts: 1
        })
        .toArray(function (err, docs) {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                //lấy tên liên hệ 
                for (var i = 0; i < docs.length; i++) {

                    //lọc ra contact cần lấy
                    docs[i].contact = _.find(docs[i].contacts, (c) => {
                        return _.isObject(c) ? c._id == userId : c == userId;
                    });

                    //nếu chỉ có id thì parse ra
                    if (!_.isObject(docs[i].contact)) {
                        docs[i].contact = {
                            _id: docs[i].contact,
                            name: ''
                        };
                    }
                    docs[i].contacts = undefined;
                }
                callback(resultHelper.returnResultSuccess(docs));
            }
        });
}
exports.getUserHasContact = getUserHasContact;

exports.updateOneSignalUserId = function (userId, oneSignalUserId, oneSignalAppId, os, deviceId, callback) {
    //xóa cache
    cache.del(userPrefix + userId);

    var collection = db.get().collection('users');

    collection.findOne(
        { _id: userId },
        function (err, doc) {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                //doc = result.value;
                //thêm vào cache
                //console.log(doc.oneSignalUserIds);
                if (doc.oneSignalUserIds && doc.oneSignalUserIds.length > 0) {
                    var isFound = false;
                    for (var i = 0; i < doc.oneSignalUserIds.length && !isFound; i++) {
                        var osuId = doc.oneSignalUserIds[i];
                        if (_.isObject(osuId)) {
                            if (osuId.oneSignalUserId == oneSignalUserId) {
                                osuId = {
                                    oneSignalUserId: oneSignalUserId,
                                    oneSignalAppId: oneSignalAppId,
                                    os: os,
                                    deviceId: deviceId
                                }
                                doc.oneSignalUserIds[i] = osuId;
                                isFound = true;
                                break;
                            }
                        }
                        else {
                            if (osuId == oneSignalUserId) {
                                osuId = {
                                    oneSignalUserId: oneSignalUserId,
                                    oneSignalAppId: oneSignalAppId,
                                    os: os,
                                    deviceId: deviceId
                                }
                                doc.oneSignalUserIds[i] = osuId;
                                isFound = true;
                                break;
                            }
                        }
                    }
                    if (!isFound) {
                        doc.oneSignalUserIds.push({
                            oneSignalUserId: oneSignalUserId,
                            oneSignalAppId: oneSignalAppId,
                            os: os,
                            deviceId: deviceId
                        });
                    }
                }
                else {
                    doc.oneSignalUserIds = [{
                        oneSignalUserId: oneSignalUserId,
                        oneSignalAppId: oneSignalAppId,
                        os: os,
                        deviceId: deviceId
                    }];
                }

                collection.save(doc);

                cache.put(userPrefix + userId, doc, cacheTime, function (key, value) {
                    console.log('user: ' + key + ' cache expire ');
                });
                deleteOneSignalUserIdFromOtherUser(userId, oneSignalUserId);
                callback(resultHelper.returnResultSuccess(doc));
            }
        });
}

function deleteOneSignalUserIdFromOtherUser(userId, oneSignalUserId) {
    //console.log(oneSignalUserId);
    var collection = db.get().collection('users');
    collection.find({
        _id: { $ne: userId },
        $or: [
            {
                'oneSignalUserIds.oneSignalUserId': oneSignalUserId
            },
            {
                oneSignalUserIds: oneSignalUserId
            }
        ]
    })
        .toArray(function (err, docs) {
            console.log('user has id', oneSignalUserId);
            console.log(docs);
            if (docs) {
                docs.forEach(function (doc) {
                    var hasChange = false;
                    for (var i = 0; i < doc.oneSignalUserIds.length; i++) {
                        if (_.isObject(doc.oneSignalUserIds[i])) {
                            if (doc.oneSignalUserIds[i].oneSignalUserId == oneSignalUserId) {
                                doc.oneSignalUserIds.splice(i, 1);
                                hasChange = true;
                                break;
                            }
                        }
                        else {
                            if (doc.oneSignalUserIds[i] == oneSignalUserId) {
                                doc.oneSignalUserIds.splice(i, 1);
                                hasChange = true;
                                break;
                            }
                        }
                    }
                    if (hasChange) {
                        //console.log(doc);
                        cache.del(userPrefix + doc._id);
                        collection.save(doc);
                    }
                });
            }
        });
}


exports.deleteOneSignalUserId = function (userId, oneSignalUserId, callback) {
    //xóa cache
    cache.del(userPrefix + userId);

    var collection = db.get().collection('users');

    collection.findOne(
        { _id: userId },
        {},
        function (err, doc) {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                if (doc) {
                    var oneSignalUserIds = doc.oneSignalUserIds;
                    var index = -1;
                    if (oneSignalUserIds) {
                        for (var i = 0; i < oneSignalUserIds.length && index == -1; i++) {
                            var item = oneSignalUserIds[i];
                            if (_.isObject(item)) {
                                if (item.oneSignalUserId == oneSignalUserId) {
                                    index = i;
                                }
                            }
                            else {
                                if (item == oneSignalUserId) {
                                    index = i;
                                }
                            }
                        }
                    }
                    //console.log('index', index);
                    if (index >= 0) {

                        oneSignalUserIds.splice(index, 1);
                        doc.oneSignalUserIds = oneSignalUserIds;

                        collection.save(doc, (errX, res) => {
                            //thêm vào cache
                            cache.put(userPrefix + userId, doc, cacheTime, function (key, value) {
                                console.log('user: ' + key + ' cache expire ');
                            });

                            callback(resultHelper.returnResultSuccess(doc));
                        });
                    }
                    else {
                        //thêm vào cache
                        cache.put(userPrefix + userId, doc, cacheTime, function (key, value) {
                            console.log('user: ' + key + ' cache expire ');
                        });

                        callback(resultHelper.returnResultSuccess(doc));
                    }
                }
                else {
                    callback(resultHelper.returnResultNotExists());
                }
            }
        });
}

//config push notify
function updateIsPushInNotify(userId, enable, callback) {
    //xóa cache
    cache.del(userPrefix + userId);

    var collection = db.get().collection('users');
    collection.updateOne({
        _id: userId
    },
        {
            $set: {
                'settings.isPushInNotify': enable
            }
        },
        (err, result) => {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                callback(resultHelper.returnResultSuccess());
            }
        }
    );
}
exports.updateIsPushInNotify = updateIsPushInNotify;

function updateMobilePhoneNumber(lastId, count) {
    var collection = db.get().collection('users');
    collection.find({
        _id: { $gt: lastId }
    })
        .sort({ _id: 1 })
        .limit(count)
        .toArray((err, lst) => {
            if (!err) {
                for (var i = 0; i < lst.length; i++) {
                    var m = lst[i];
                    if (m.phone.length == 11) {
                        //console.log('user', m._id, m.name, m.phone);
                        m.phone = parsePhone(m.phone);
                        //console.log('parse', m.phone);
                        collection.save(m);
                    }
                }
                if (lst.length == count) {
                    console.log('last', lst[lst.length - 1]._id);
                    updateMobilePhoneNumber(lst[lst.length - 1]._id, count);
                }
            }
        });
}

exports.updateMobilePhoneNumber = updateMobilePhoneNumber;

function parsePhone(phone) {
    phone = phone + '';
    var res = phone;
    var preNum = phone.substr(0, 4);
    switch (preNum) {
        //viettel
        case '0169': {
            res = '039' + phone.substr(4);
            break;
        }
        case '0168': {
            res = '038' + phone.substr(4);
            break;
        }
        case '0167': {
            res = '037' + phone.substr(4);
            break;
        }
        case '0166': {
            res = '036' + phone.substr(4);
            break;
        }
        case '0165': {
            res = '035' + phone.substr(4);
            break;
        }
        case '0164': {
            res = '034' + phone.substr(4);
            break;
        }
        case '0163': {
            res = '033' + phone.substr(4);
            break;
        }
        case '0162': {
            res = '032' + phone.substr(4);
            break;
        }
        //Vina
        case '0123': {
            res = '083' + phone.substr(4);
            break;
        }
        case '0124': {
            res = '084' + phone.substr(4);
            break;
        }
        case '0125': {
            res = '085' + phone.substr(4);
            break;
        }
        case '0127': {
            res = '081' + phone.substr(4);
            break;
        }
        case '0129': {
            res = '082' + phone.substr(4);
            break;
        }
        //mobi
        case '0120': {
            res = '070' + phone.substr(4);
            break;
        }
        case '0121': {
            res = '079' + phone.substr(4);
            break;
        }
        case '0122': {
            res = '077' + phone.substr(4);
            break;
        }
        case '0126': {
            res = '076' + phone.substr(4);
            break;
        }
        case '0128': {
            res = '078' + phone.substr(4);
            break;
        }
        //vnmobile
        case '0186': {
            res = '056' + phone.substr(4);
            break;
        }
        case '0188': {
            res = '058' + phone.substr(4);
            break;
        }
        //GM
        case '0199': {
            res = '059' + phone.substr(4);
            break;
        }
    }
    return res;
}

exports.parsePhone = parsePhone;