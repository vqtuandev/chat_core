var _ = require('lodash');
var async = require('async');
var ObjectId = require('mongodb').ObjectId;

var moment = require('moment');
var db = require('./dbUser');
var cache = require('memory-cache');
var cacheTime = 600000;

var mbn = require('../services/mbn.js');

var errorLog = require('./errorLog.js');

var dateHelper = require('../utility/dateHelper.js');
var resultHelper = require('../utility/resultHelper.js');
var errorCodes = resultHelper.errorCodes;
var azureHelper = require('../services/azure');

var phoneHelper = require('../utility/phoneHelper')

var authServices = {
    MXTV1: 'MXTV1'
};
exports.authServices = authServices;

function getUserCollection() {
    return db.get().collection('users');
}

function getContactCollection() {
    return db.get().collection('contacts');
}

function getUserLoginLogCollection() {
    return db.get().collection('loginLogs');
}

function parseIdToObject(_id) {
    var parsed = _id;
    try {
        parsed = ObjectId(_id);
    }
    catch (ex) {
        parsed = _id;
    }
    return parsed;
}

function parseUserInfo(user) {
    if (user) {
        if (user.avatar) {
            user.avatar = azureHelper.azureStorageUrl + user.avatar;
        }
        user.payAccount = (user.payAccount == null ? false : user.payAccount);
    }
    return user;
}


//////////////////////////////////////////
//đăng nhập / đăng kí

//đăng kí qua mobile hoặc lấy thông tin nếu đã có
function generateUserModelForRegisterFromMobile(mobile) {
    return {
        email: '',
        phone: mobile,
        avatar: '',
        name: mobile,
        createDate: dateHelper.getUTCNow(),
        lastUpdateDate: dateHelper.getUTCNow(),
        lastLoginDate: dateHelper.getUTCNow()
    };
}
function getOrCreateAccountByMobile(mobile, callback) {
    //console.log(mobile);
    var collection = getUserCollection();
    mobile = phoneHelper.patchValidPhoneNumber(mobile);

    collection.findOne(
        {
            phone: mobile
        },
        (err, user) => {
            console.log(err);
            if (err) {
                errorLog.processError(err, callback);
            }
            else {

                if (user) {
                    user = parseUserInfo(user);
                    console.log(user);
                    callback(resultHelper.returnResultSuccess(user));
                }
                else {
                    var user = generateUserModelForRegisterFromMobile(mobile);
                    collection.insert(user, function (errX, result) {
                        if (errX) {
                            errorLog.processError(errX, callback);
                        }
                        else {
                            user._id = result.insertedIds[0];
                            user = parseUserInfo(user);
                            callback(resultHelper.returnResultSuccess(user));
                        }
                    });
                }
            }
        }
    );
}

exports.getOrCreateAccountByMobile = getOrCreateAccountByMobile;

function checkEmailExists(email, userId, callback) {
    var collection = getUserCollection();
    collection.findOne(
        {
            email: email
        },
        (err, user) => {
            if (err) {
                errorLog.processError(err, callback);
            }
            else {
                if (user) {
                    userId = parseIdToObject(userId);
                    if (user._id != userId) {
                        callback(resultHelper.returnResultSuccess(true));
                    }
                    else {
                        callback(resultHelper.returnResultSuccess(false));
                    }
                }
                else {
                    callback(resultHelper.returnResultSuccess(false));
                }
            }
        }
    );
}

exports.checkEmailExists = checkEmailExists;

function checkPhoneExists(phone, userId, callback) {
    var collection = getUserCollection();
    phone = phoneHelper.patchValidPhoneNumber(phone);
    collection.findOne(
        {
            phone: phone
        },
        (err, user) => {
            if (err) {
                errorLog.processError(err, callback);
            }
            else {
                if (user) {
                    userId = parseIdToObject(userId);
                    if (user._id != userId) {
                        callback(resultHelper.returnResultSuccess(true));
                    }
                    else {
                        callback(resultHelper.returnResultSuccess(false));
                    }
                }
                else {
                    callback(resultHelper.returnResultSuccess(false));
                }
            }
        }
    );
}
exports.checkPhoneExists = checkPhoneExists;

function getUserByPhone(phone, callback) {
    var collection = getUserCollection();
    phone = phoneHelper.patchValidPhoneNumber(phone);

    collection.findOne({
        phone: phone
    },
        (err, user) => {
            if (err) {
                errorLog.processError(err, callback);
            }
            else {
                if (user) {
                    user = parseUserInfo(user);
                    callback(resultHelper.returnResultSuccess(user));
                }
                else {
                    callback(resultHelper.returnResultNotExists());
                }
            }
        }
    );
}
exports.getUserByPhone = getUserByPhone;

function updateUserName(_id, name, callback) {
    _id = parseIdToObject(_id);
    var collection = getUserCollection();

    collection.updateOne(
        {
            _id: _id
        },
        {
            $set: {
                name: name
            }
        },
        (err, result) => {
            console.log('updateUserName');
            console.log(err);
            console.log(result);
            if (typeof callback === 'function') {
                if (err) {
                    errorLog.processError(err, callback);
                }
                else {
                    callback(resultHelper.returnResultSuccess());
                }
            }
        }
    );
}

exports.updateUserName = updateUserName;

function completeRegister(_id, mobile, email, name, password, callback) {
    _id = parseIdToObject(_id);
    var collection = getUserCollection();
    mobile = phoneHelper.patchValidPhoneNumber(mobile);
    collection.findOne(
        {
            _id: _id,
            phone: mobile
        },
        (err, user) => {
            console.log(err);
            if (err) {
                errorLog.processError(err, callback);
            }
            else {
                if (user) {
                    //console.log(user);
                    collection.updateOne(
                        {
                            _id: _id
                        },
                        {
                            $set: {
                                email: email,
                                name: name,
                                password: password,
                                lastUpdateDate: dateHelper.getUTCNow(),
                                lastLoginDate: dateHelper.getUTCNow()
                            }
                        },
                        {},
                        function (err, result) {
                            if (err) {
                                errorLog.processError(err, callback);
                            }
                            else {
                                if (typeof callback === 'function') {
                                    user.email = email;
                                    user.password = password;
                                    user.name = name;
                                    user.lastUpdateDate = dateHelper.getUTCNow();
                                    user.lastLoginDate = dateHelper.getUTCNow();
                                    user = parseUserInfo(user);
                                    callback(resultHelper.returnResultSuccess(user));
                                }
                            }
                        }
                    );
                }
                else {
                    callback(resultHelper.returnResultNotExists({ _id: true, phone: true }));
                }
            }
        }
    );
}

exports.completeRegister = completeRegister;

//đăng kí qua MyXteam V1
function generateUserModelForRegisterMXTV1(userId, email, token, phone, name, avatar) {
    return {
        email: email,
        phone: phone,
        avatar: avatar,
        name: name,
        mxtUserId: userId,
        password: password,
        services: [
            {
                name: authServices.MXTV1,
                auth: {
                    email: email,
                    token: token
                },
                updateDate: dateHelper.getUTCNow()
            }
        ],
        createDate: dateHelper.getUTCNow(),
        lastUpdateDate: dateHelper.getUTCNow(),
        lastLoginDate: dateHelper.getUTCNow()
    };
}
function updateUserWithMyXteamInfo(_id, userId, email, token, name, avatar, callback) {
    _id = parseIdToObject(_id);
    var collection = getUserCollection();
    collection.updateOne({
        _id: _id
    },
        {
            $set: {
                mxtUserId: userId,
                name: name,
                avatar: avatar
            },
            $push: {
                services: {
                    name: 'MXTV1',
                    auth: {
                        email: email,
                        token: token
                    },
                    updateDate: dateHelper.getUTCNow()
                }
            }
        },
        {},
        function (err, result) {
            if (err) {
                errorLog.processError(err, callback);
            }
            else {
                if (typeof callback === 'function') {
                    callback(resultHelper.returnResultSuccess());
                }
            }
        }
    );
}
//function registerViaMyXteamV1(userId, email, password, phone, name, avatar) {
//    var collection = getUserCollection();

//    collection.findOne(
//        {
//            $or: [
//                { mxtUserId: userId },
//                { email: email }
//            ]
//        },
//        function (err, user) {
//            if (user) {
//                if (user.mxtUserId == userId) {
//                    callback(resultHelper.returnResultSuccess(user));
//                }
//                else if (user.email == email) {
//                    if (user.mxtUserId) {
//                        callback(resultHelper.returnResultExists({ email: true }));
//                    }
//                    else {
//                        updateUserWithMyXteamInfo(user._id, userId, email, password, name, avatar, callback);
//                    }
//                }
//            }
//            else {
//                user = generateUserModelForRegisterMXTV1(userId, email, password, phone, name, avatar);
//                collection.insert(user, function (err, result) {
//                    if (err) {
//                        errorLog.processError(err, callback);
//                    }
//                    else {
//                        user._id = result.insertedIds[0];
//                        callback(resultHelper.returnResultSuccess(user));
//                    }
//                });
//            }
//        }
//    );
//}
//exports.registerViaMyXteamV1 = registerViaMyXteamV1;

////đăng nhập qua MyXteam V1
//function loginViaMyXteamV1(email, password, callback) {
//    var collection = getUserCollection();
//    collection.findOne(
//        {
//            'services.name': authServices.MXTV1,
//            'services.auth.email': email
//        },
//        (err, user) => {
//            if (err) {
//                errorLog.processError(err, callback);
//            }
//            else {
//                if (user) {
//                    var mxtAuth = _.find(user.services, (service) => { return service.name == authServices.MXTV1 });
//                    if (mxtAuth) {
//                        if (mxtAuth.auth.password == password) {
//                            user.lastLoginDate = updateLastLoginDate(user._id, () => {

//                            });

//                            callback(resultHelper.returnResultSuccess(user));
//                        }
//                        else {
//                            callback(resultHelper.returnResultNotExists("Mật khẩu không đúng"));
//                        }
//                    }
//                    else {
//                        callback(resultHelper.returnResultNotExists("User không tồn tại"));
//                    }
//                }
//                else {
//                    callback(resultHelper.returnResultNotExists("User không tồn tại"));
//                }
//            }
//        }
//    );
//}
//exports.loginViaMyXteamV1 = loginViaMyXteamV1;

function updateLoginFromMyXteam(email, token, userMXT, callback) {
    var mxtUserId = userMXT.UserId;
    var collection = getUserCollection();
    collection.findOne(
        {
            $or: [
                { mxtUserId: mxtUserId },
                { email: email }
            ]
        },
        function (err, user) {
            if (err) {
                errorLog.processError(err, callback);
            }
            else {
                if (user) {
                    user.lastLoginDate = updateLastLoginDate(user._id, () => {

                    });
                    updateUserWithMyXteamInfo(user._id, mxtUserId, email, token, userMXT.UserName, userMXT.Avatar, null);
                    user = parseUserInfo(user);
                    callback(resultHelper.returnResultSuccess(user));
                }
                else {
                    user = generateUserModelForRegisterMXTV1(mxtUserId, email, token, userMXT.Mobile, userMXT.UserName, userMXT.Avatar);
                    collection.insert(user, function (err, result) {
                        if (err) {
                            errorLog.processError(err, callback);
                        }
                        else {
                            user._id = result.insertedIds[0];
                            user = parseUserInfo(user);
                            callback(resultHelper.returnResultSuccess(user));
                        }
                    });
                }
            }
        }
    );
}
exports.updateLoginFromMyXteam = updateLoginFromMyXteam;

//đăng nhập
function loginByEmail(email, password, callback) {
    var collection = getUserCollection();
    collection.findOne(
        {
            email: email
        },
        (err, user) => {
            if (err) {
                errorLog.processError(err, callback);
            }
            else {
                if (user) {
                    if ((!user.password && !password) || user.password == password) {
                        user.lastLoginDate = updateLastLoginDate(user._id, () => {
                            console.log('callback')
                        });
                        console.log(user.lastLoginDate);
                        user = parseUserInfo(user);
                        callback(resultHelper.returnResultSuccess(user));
                    }
                    else {
                        callback(resultHelper.returnResultNotExists("Mật khẩu không đúng"));
                    }
                }
                else {
                    callback(resultHelper.returnResultNotExists("User không tồn tại"));
                }
            }
        }
    );
}
exports.loginByEmail = loginByEmail;

function loginByPhone(phone, password, callback) {
    var collection = getUserCollection();
    phone = phoneHelper.patchValidPhoneNumber(phone);
    collection.findOne(
        {
            phone: phone
        },
        (err, user) => {
            if (err) {
                errorLog.processError(err, callback);
            }
            else {
                if (user) {
                    if ((!user.password && !password) || user.password == password) {

                        updateLastLoginDate(user._id, () => {
                        });
                        user = parseUserInfo(user);
                        callback(resultHelper.returnResultSuccess(user));
                    }
                    else {
                        callback(resultHelper.returnResultNotExists("Mật khẩu không đúng"));
                    }
                }
                else {
                    callback(resultHelper.returnResultNotExists("User không tồn tại"));
                }
            }
        }
    );
}
exports.loginByPhone = loginByPhone;

/////////////////////////////////////////
//cập nhật thông tin
function updateUserInfo(_id, email, mobile, name, callback) {
    var collection = getUserCollection();
    checkEmailExists(email, _id, (result) => {
        if (result.errorCode == 0 && result.data == false) {
            checkPhoneExists(mobile, _id, (res) => {
                if (res.errorCode == 0 && res.data == false) {
                    _id = parseIdToObject(_id);
                    collection.findOneAndUpdate({
                        _id: _id
                    },
                        {
                            $set: {
                                email: email,
                                mobile: mobile,
                                name: name,
                                lastUpdateDate: dateHelper.getUTCNow()
                            }
                        },
                        {
                            returnOriginal: false
                        },
                        (err, result) => {
                            if (err) {
                                errorLog.processError(err, callback);
                            }
                            else {
                                var user = result.value;
                                user = parseUserInfo(user);
                                callback(resultHelper.returnResultSuccess(user));
                            }
                        }
                    );
                }
                else {
                    callback(resultHelper.returnResultExists({ phone: true }));
                }
            });
        }
        else {
            callback(resultHelper.returnResultExists({ email: true }));
        }
    });
}
exports.updateUserInfo = updateUserInfo;

function updateUserPassword(_id, oldPassword, newPassword, callback) {
    _id = parseIdToObject(_id);
    var collection = getUserCollection();
    collection.findOne({
        _id: _id
    },
        (err, user) => {
            if (err) {
                errorLog.processError(err, callback);
            }
            else {
                if (user) {
                    if (user.password == oldPassword) {
                        collection.findOneAndUpdate(
                            {
                                _id: _id
                            },
                            {
                                $set: {
                                    password: newPassword,
                                    lastUpdateDate: dateHelper.getUTCNow()
                                }
                            },
                            {
                                returnOriginal: false
                            },
                            (errX, result) => {
                                if (errX) {
                                    errorLog.processError(errX, callback);
                                }
                                else {
                                    callback(resultHelper.returnResultSuccess());
                                }
                            }
                        );
                    }
                    else {
                        callback(resultHelper.returnResultNotExists({ oldPassword: true }));
                    }
                }
                else {
                    callback(resultHelper.returnResultNotExists({ _id: true }));
                }
            }
        }
    );
}
exports.updateUserPassword = updateUserPassword;

function updateUserAvatar(_id, avatar, callback) {
    _id = parseIdToObject(_id);
    var collection = getUserCollection();
    collection.findOneAndUpdate(
        {
            _id: _id
        },
        {
            $set: {
                avatar: avatar,
                lastUpdateDate: dateHelper.getUTCNow()
            }
        },
        {
            returnOriginal: false
        },
        (err, result) => {
            if (err) {
                errorLog.processError(err, callback);
            }
            else {
                var user = result.value;
                user = parseUserInfo(user);
                console.log(user);
                callback(resultHelper.returnResultSuccess(user));
            }
        }
    );

}
exports.updateUserAvatar = updateUserAvatar;

/////////////////////////////////////////
//Các hàm get thông tin

//Get user info
function getUserInfo(_id, needUpdateLastLoginDate, callback) {
    var collection = getUserCollection();
    _id = parseIdToObject(_id);
    console.log(_id);
    collection.findOne({
        _id: _id
    },
        function (err, user) {
            console.log(err);
            console.log(user);
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                if (user == null) {
                    callback(resultHelper.returnResultNotExists());
                }
                else {
                    if (needUpdateLastLoginDate) {
                        updateLastLoginDate(user._id, () => {
                        });
                    }
                    user = parseUserInfo(user);
                    callback(resultHelper.returnResultSuccess(user));
                }
            }
        }
    );
}
exports.getUserInfo = getUserInfo;

//lấy danh sách user theo mảng Id
exports.getUserInfoList = function (userIds, callback) {
    var collection = getUserCollection();
    var startX = moment().format('x');
    console.log('start', startX);
    userIds = userIds.map((_id) => {
        return parseIdToObject(_id);
    });

    collection.find({
        _id: { $in: userIds }
    })
        .project({
            _id: 1,
            name: 1,
            phone: 1,
            email: 1,
            avatar: 1,
            url: 1,
            payAccount: 1
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
                    var endX = moment().format('x');
                    console.log('end', endX);
                    console.log('duration', parseInt(endX) - parseInt(startX));
                    for (var i = 0; i < docs.length; i++) {
                        docs[i] = parseUserInfo(docs[i]);
                    }
                    callback(resultHelper.returnResultSuccess(docs));
                }
            });
}


/////////////////////////
//các hàm update

//luvapay
function updateHasPayAccount(_id, hasPayAccount, callback) {
    var collection = getUserCollection();
    _id = parseIdToObject(_id);
    collection.updateOne(
        {
            _id: _id
        },
        {
            $set: {
                payAccount: hasPayAccount
            }
        },
        {},
        (err, result) => {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                callback(resultHelper.returnResultSuccess());
            }
        });
}

exports.updateHasPayAccount = updateHasPayAccount;

///Update last login
function updateLastLoginDate(_id, callback) {
    var collection = getUserCollection();
    var now = dateHelper.getUTCNow();
    _id = parseIdToObject(_id);
    collection.updateOne(
        {
            _id: _id
        },
        {
            $set: {
                lastLoginDate: now
            }
        },
        {},
        (err, result) => {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                callback(resultHelper.returnResultSuccess());
            }
        });
    return now;
}
exports.updateLastLoginDate = updateLastLoginDate;


//update setting
//config push notify
function updateIsPushInNotify(userId, enable, callback) {
    userId = parseIdToObject(userId);
    var collection = getUserCollection();
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

////////////////////////////////
//contacts
exports.addContact = function (userId, contacts, callback) {
    userId = parseIdToObject(userId);
    var collection = getUserCollection();

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

                callback(resultHelper.returnResultSuccess(doc));
            }
        });
}

exports.removeContact = function (userId, contacts, callback) {
    userId = parseIdToObject(userId);
    var collection = getUserCollection();
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
                doc = result.value;
                callback(resultHelper.returnResultSuccess(doc));
            }
        }
    );
}
function getUserHasContact(userId, callback) {
    var collection = getUserCollection();
    var startX = moment().format('x');
    console.log('start', startX);
    collection.find({
        contacts: userId
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
                console.log(docs.length);
                var endX = moment().format('x');
                console.log('end', endX);
                console.log('duration', parseInt(endX) - parseInt(startX));
                callback(resultHelper.returnResultSuccess(docs));
            }
        });
}
exports.getUserHasContact = getUserHasContact;

//////////////////////////
//notify
exports.updateOneSignalUserId = function (_id, oneSignalUserId, oneSignalAppId, os, deviceId, callback) {
    _id = parseIdToObject(_id);
    var collection = getUserCollection();

    collection.findOne(
        { _id: _id },
        function (err, doc) {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                if (doc && doc.oneSignalUserIds && doc.oneSignalUserIds.length > 0) {
                    var isFound = false;
                    for (var i = 0; i < doc.oneSignalUserIds.length && !isFound; i++) {
                        var osuId = doc.oneSignalUserIds[i];

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
                    if(!doc) doc = {};
                    doc.oneSignalUserIds = [{
                        oneSignalUserId: oneSignalUserId,
                        oneSignalAppId: oneSignalAppId,
                        os: os,
                        deviceId: deviceId
                    }];
                }
                collection.save(doc);

                deleteOneSignalUserIdFromOtherUser(_id, oneSignalUserId);
                callback(resultHelper.returnResultSuccess(doc));
            }
        });
}
function deleteOneSignalUserIdFromOtherUser(userId, oneSignalUserId) {
    //console.log(oneSignalUserId);
    userId = parseIdToObject(userId);
    var collection = getUserCollection();
    collection.find({
        _id: { $ne: userId },
        'oneSignalUserIds.oneSignalUserId': oneSignalUserId
    })
        .toArray(function (err, docs) {
            console.log('user has id', oneSignalUserId);
            console.log(docs);
            if (docs) {
                docs.forEach(function (doc) {
                    var hasChange = false;
                    for (var i = 0; i < doc.oneSignalUserIds.length; i++) {
                        if (doc.oneSignalUserIds[i].oneSignalUserId == oneSignalUserId) {
                            doc.oneSignalUserIds.splice(i, 1);
                            hasChange = true;
                            break;
                        }
                    }
                    if (hasChange) {

                        collection.save(doc);
                    }
                });
            }
        });
}

exports.deleteOneSignalUserIdFromOtherUser = deleteOneSignalUserIdFromOtherUser;

exports.deleteOneSignalUserId = function (userId, oneSignalUserId, callback) {
    userId = parseIdToObject(userId);
    var collection = getUserCollection();

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
                            if (item.oneSignalUserId == oneSignalUserId) {
                                index = i;
                            }
                        }
                    }
                    //console.log('index', index);
                    if (index >= 0) {

                        oneSignalUserIds.splice(index, 1);
                        doc.oneSignalUserIds = oneSignalUserIds;

                        collection.save(doc, (errX, res) => {
                            ////thêm vào cache
                            //cache.put(userPrefix + userId, doc, cacheTime, function (key, value) {
                            //    console.log('user: ' + key + ' cache expire ');
                            //});

                            callback(resultHelper.returnResultSuccess(doc));
                        });
                    }
                    else {
                        ////thêm vào cache
                        //cache.put(userPrefix + userId, doc, cacheTime, function (key, value) {
                        //    console.log('user: ' + key + ' cache expire ');
                        //});

                        callback(resultHelper.returnResultSuccess(doc));
                    }
                }
                else {
                    callback(resultHelper.returnResultNotExists());
                }
            }
        });
}

exports.checkPhoneAndCreateUserFromContacts = function (userId, contacts, callback) {
    var collection = getUserCollection();
    var users = [];
    async.eachLimit(contacts, 10, (contact, cb) => {
        if (contact.phone) {
            getUserByPhone(contact.phone, (r) => {
                if (r.errorCode == errorCodes.success) {
                    users.push(r.data);
                }
                cb();
            });
        }
        else {
            cb();
        }
    },
        (err) => {
            callback(resultHelper.returnResultSuccess(users));
        });
}


//tạo các index trong bảng user khi start app
//TODO: xem cách check nếu có index rồi thì khỏi tạo lại
function createIndex() {
    var collection = getUserCollection();
    collection.createIndex(
        {
            'mxtUserId': 1
        },
        { background: true },
        (err, result) => {
            console.log(err);
            console.log(result);
        }
    );

    collection.createIndex(
        {
            'email': 1
        },
        { background: true },
        (err, result) => {
            console.log(err);
            console.log(result);
        }
    );

    collection.createIndex(
        {
            'services.name': 1,
            'services.auth': 1
        },
        { background: true },
        (err, result) => {
            console.log(err);
            console.log(result);
        }
    );
}
exports.createIndex = createIndex;
