var _ = require('lodash');
var async = require('async');
var ObjectId = require('mongodb').ObjectId;

var moment = require('moment');

var db = require('../dbLuvapay');

var errorLog = require('../errorLog.js');

var dateHelper = require('../../utility/dateHelper.js');
var resultHelper = require('../../utility/resultHelper.js');
var errorCodes = resultHelper.errorCodes;
var azureHelper = require('../../services/azure');

var userData = require('../user');


function getAccountCollection() {
    return db.get().collection('accounts');
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

var userAccountModel = function(userId) {
    return {
        _id: userId,
        publicKey: '',
        privateKey: '',
        updateDate: null,
        pin: '',
        isValidate: false,
        validateDate: null,
        validateImages: [],
        identityId: '',
        realName: '',
        address: '',
        gender: '',
        dob: '',
        level: 1,
        registerPromoReceived: false,
        referral: null
    };
}

var createUserAccountInfo = function(userInfo, callback) {
    var collection = getAccountCollection();

    collection.insert(userInfo, (err, result) => {
        if (err) {
            errorLog.processError(err, callback);
        }
        else {
            callback(resultHelper.returnResultSuccess(userInfo));
        }
    });
}

function parseAccountInfo(user) {
    if (user) {
        if (user.registerPromoReceived === null || user.registerPromoReceived === undefined) {
            user.registerPromoReceived = false;
        }
        if (user.signers && user.signers.length > 0) {
            user.hasSigner = true;
        }
        else {
            user.hasSigner = false;
        }
    }
    return user;
}

exports.getUserAccountInfo = function (userId, callback) {
    var collection = getAccountCollection();

    userId = userId.toString();
    console.log('getUserAccountInfo');
    console.log('userId', userId);

    collection.findOne(
        {
            _id: userId
        },
        (err, doc) => {
            if (err) {
                errorLog.processError(err, callback);
            }
            else {
                if (!doc) {
                    doc = userAccountModel(userId);
                    createUserAccountInfo(doc, () => { });
                }
                console.log(doc);
                doc = parseAccountInfo(doc);
                callback(resultHelper.returnResultSuccess(doc));
                
            }
        }
    );
}

exports.updateUserAccountInfo = function (userId, identityId, realName, address, gender, dob, referral, callback) {
    var collection = getAccountCollection();

    userId = userId.toString();

    collection.updateOne(
        {
            _id: userId
        },
        {
            $set: {
                identityId: identityId,
                realName: realName,
                address: address,
                gender: gender,
                dob: dob,
                updateDate: dateHelper.getUTCNow(),
                referral: referral
            }
        },
        {
            upsert: true,
            new: true,
            returnOriginal: false
        },
        (err, result) => {
            console.log(err);
            if (err) {
                errorLog.processError(err, callback);
            }
            else {
                if (result.result.n == 1) {
                    var doc = result.value;
                    doc = parseAccountInfo(doc);
                    callback(resultHelper.returnResultSuccess(doc));
                }
                else {
                    callback(resultHelper.returnResultDBError());
                }
            }
        }
    );
}

exports.updateUserAccountIsValidate = function (userId, isValidate, callback) {
    var collection = getAccountCollection();

    userId = userId.toString();

    collection.updateOne(
        {
            _id: userId
        },
        {
            $set: {
                isValidate: isValidate,
                validateDate: dateHelper.getUTCNow(),
                updateDate: dateHelper.getUTCNow()
            }
        },
        {
            upsert: true,
            new: true,
            returnOriginal: false
        },
        (err, result) => {
            if (err) {
                errorLog.processError(err, callback);
            }
            else {
                if (result.result.n == 1) {
                    var doc = result.value;
                    doc = parseAccountInfo(doc);                    
                    callback(resultHelper.returnResultSuccess(doc));
                }
                else {
                    callback(resultHelper.returnResultDBError());
                }
            }
        }
    );
}

exports.updateUserValidateImages = function (userId, validateImages, callback) {
    var collection = getAccountCollection();
    userId = userId.toString();

    collection.updateOne(
        {
            _id: userId
        },
        {
            $set: {
                validateImages: validateImages,
                updateDate: dateHelper.getUTCNow()
            }
        },
        {
            upsert: true,
            new: true,
            returnOriginal: false
        },
        (err, result) => {
            if (err) {
                errorLog.processError(err, callback);
            }
            else {
                if (result.result.n == 1) {
                    var doc = result.value;
                    doc = parseAccountInfo(doc);
                    callback(resultHelper.returnResultSuccess(doc));
                }
                else {
                    callback(resultHelper.returnResultDBError());
                }
            }
        }
    );
}

exports.updateUserAccountKey = function (userId, publicKey, privateKey, callback) {
    var collection = getAccountCollection();
    userId = userId.toString();

    collection.findOneAndUpdate(
        {
            _id: userId
        },
        {
            $set: {
                publicKey: publicKey,
                privateKey: privateKey,
                updateDate: dateHelper.getUTCNow()
            },
            $setOnInsert: {
                pin: '',
                isValidate: false,
                validateDate: null,
                validateImages: [],
                identityId: '',
                realName: '',
                address: '',
                gender: '',
                dob: '',
                level: 1,
                registerPromoReceived: false,
                referral: null
            }
        },
        {
            upsert: true,
            returnOriginal: false
        },
        (err, result) => {
            if (err) {
                errorLog.processError(err, callback);
            }
            else {
                if (result.ok == 1) {
                    var doc = result.value;
                    doc = parseAccountInfo(doc);
                    callback(resultHelper.returnResultSuccess(doc));
                }
                else {
                    callback(resultHelper.returnResultDBError());
                }
            }
        }
    );
}

exports.updateUserAccountPin = function (userId, pin, callback) {
    var collection = getAccountCollection();
    userId = userId.toString();

    collection.updateOne(
        {
            _id: userId
        },
        {
            $set: {
                pin: pin,
                updateDate: dateHelper.getUTCNow()
            }
        },
        {
            upsert: true,
            returnOriginal: false
        },
        (err, result) => {
            if (err) {
                errorLog.processError(err, callback);
            }
            else {
                if (result.result.n == 1) {
                    var doc = result.value;
                    doc = parseAccountInfo(doc);
                    callback(resultHelper.returnResultSuccess(doc));
                }
                else {
                    callback(resultHelper.returnResultDBError());
                }
            }
        }
    );
}

exports.updateUserAccountGetPromo = function (userId, callback) {
    var collection = getAccountCollection();
    userId = userId.toString();
    collection.updateOne(
        {
            _id: userId
        },
        {
            $set: {
                registerPromoReceived: true,
                updateDate: dateHelper.getUTCNow()
            }
        },
        {
            upsert: true,
            returnOriginal: false
        },
        (err, result) => {
            if (err) {
                errorLog.processError(err, callback);
            }
            else {
                if (result.result.n == 1) {
                    var doc = result.value;
                    doc = parseAccountInfo(doc);
                    callback(resultHelper.returnResultSuccess(doc));
                }
                else {
                    callback(resultHelper.returnResultDBError());
                }
            }
        }
    );
}