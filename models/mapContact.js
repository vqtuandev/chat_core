var _ = require('lodash');
var async = require('async');
var moment = require('moment');

var db = require('./db');
var cache = require('memory-cache');
var cacheTime = 600000;

var ObjectId = require('mongodb').ObjectId;

var mbn = require('../services/mbn.js');

var errorLog = require('./errorLog.js');


var dateHelper = require('../utility/dateHelper.js');
var resultHelper = require('../utility/resultHelper.js');
var errorCodes = resultHelper.errorCodes;

var contactPrefix = 'contacts';

function updateUserContacts(userId, contacts, callback) {
    var collection = db.get().collection(contactPrefix);
    collection.findOne({
        _id: userId
    },
        (err, doc) => {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                if (!doc) {
                    doc = {
                        _id: userId,
                        contacts: []
                    };
                }
                
                var currentContacts = doc.contacts;
                for (var i = 0; i < contacts.length; i++) {
                    var m = contacts[i];
                    var oldItemIndex = _.findIndex(currentContacts, (item) => {
                        return item.phone == m.phone;
                    });                    

                    if (oldItemIndex > -1) {
                        currentContacts[oldItemIndex] = m;
                    }
                    else {
                        currentContacts.push(m);
                    }
                }

                doc.contacts = currentContacts;
                collection.save(doc).then((errS) => {
                    
                    if (errS) {
                        errorLog.addLog(errorLog.errorType.data, errS, function () { });
                        callback(resultHelper.returnResultDBError(errS));
                    }
                    else {
                        callback(resultHelper.returnResultSuccess());
                    }
                });

            }
        });
}

exports.updateUserContacts = updateUserContacts;

function getUserContacts(userId, callback) {
    var collection = db.get().collection(contactPrefix);
    collection.findOne(
        {
            _id: userId
        },
        (err, doc) => {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                callback(resultHelper.returnResultSuccess(doc));
            }
        });
}

exports.getUserContacts = getUserContacts;

function getUserContactMapName(userId, phone, callback) {
    var collection = db.get().collection(contactPrefix);
    collection.findOne(
        {
            _id: userId
        },
        (err, doc) => {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                var name = '';
                if (doc) {
                    var currentContacts = doc.contacts;
                    var item = _.find(currentContacts, (x) => {
                        return x.phone == phone;
                    });
                    if (item) {
                        name = item.name;
                    }
                }
                callback(resultHelper.returnResultSuccess(name));
            }
        });
}

exports.getUserContactMapName = getUserContactMapName;