var _ = require('lodash');
var textHelper = require('../utility/textHelper');
var crypoHelper = require('../utility/cryptoHelper');
var azureHelper = require('../services/azure');

module.exports = function (socket, eventName, socketMap, db, resultHelper, common) {
    var errorCodes = resultHelper.errorCodes;

    socket.on(eventName.updateUserInfo, function (data, callback) {
        var userId = socket.userId;
        var os = socket.os;
        var deviceId = socket.deviceId;

        var email = data.email;
        var mobile = data.mobile;
        var name = data.name;

        db.user.updateUserInfo(userId, email, mobile, name, (result) => {
            if (typeof callback == 'function') {
                callback(result);
            }
        });
    });

    socket.on(eventName.updateUserPassword, function (data, callback) {
        var userId = socket.userId;
        var os = socket.os;
        var deviceId = socket.deviceId;

        var oldPassword = data.oldPassword;
        var newPassword = data.newPassword;

        oldPassword = crypoHelper.encrypt(oldPassword);
        newPassword = crypoHelper.encrypt(newPassword);

        db.user.updateUserPassword(userId, oldPassword, newPassword, (result) => {
            if (typeof callback == 'function') {
                callback(result);
            }
        });
    });
    socket.on(eventName.getAvatarUploadSAS, function (data, callback) {
        var userId = socket.userId;
        var itemGUID = data.itemGUID;
        var fileName = data.fileName;

        azureHelper.generateAvatarUploadSAS(userId, itemGUID, fileName, (result) => {
            if (typeof callback == 'function') {
                callback(result);
            }
        });
    });
    socket.on(eventName.updateUserAvatar, function (data, callback) {
        var userId = socket.userId;
        var os = socket.os;
        var deviceId = socket.deviceId;

        var avatar = data.avatar;

        db.user.updateUserAvatar(userId, avatar, (result) => {
            if (typeof callback == 'function') {
                callback(result);
            }
        });
    });

    //các sự kiện khác
    //cập nhật Onesignal UserId
    socket.on(eventName.updateOneSignalUserId, function (data, callback) {
        var userId = socket.userId;
        var os = socket.os;
        var deviceId = socket.deviceId;

        //if (userId) {
        //    userId = parseInt(userId);
        //}

        //if (!numberHelper.isInt(userId)) {
        //    var paraError = {
        //        userId: !numberHelper.isInt(userId)
        //    };
        //    if (typeof callback === 'function') {
        //        callback(resultHelper.returnResultParameterError(paraError));
        //    }
        //}
        //else {
        var oneSignalUserId = data.oneSignalUserId;
        var oneSignalAppId = data.oneSignalAppId;

        db.user.updateOneSignalUserId(userId, oneSignalUserId, oneSignalAppId, os, deviceId, function (result) {
            console.log('updateOneSignalUserId');
            console.log(typeof callback);
            if (typeof callback === 'function') {
                callback(result);
            }
            if (result.errorCode == 0) {
                db.user.getUserInfo(userId, false, function (res) {
                    if (res.errorCode == 0) {
                        if (socketMap[userId]) {
                            socketMap[userId].UserInfo = res.data;
                        }
                    }
                });
            }
        });
        //}
    });

    socket.on(eventName.removeOneSignalUserId, function (data, callback) {
        var userId = socket.userId;
        //if (userId) {
        //    userId = parseInt(userId);
        //}

        //if (!numberHelper.isInt(userId)) {
        //    var paraError = {
        //        userId: !numberHelper.isInt(userId)
        //    };
        //    if (typeof callback === 'function') {
        //        callback(resultHelper.returnResultParameterError(paraError));
        //    }
        //}
        //else {
        var oneSignalUserId = data.oneSignalUserId;
        var oneSignalAppId = data.oneSignalAppId;
        db.user.deleteOneSignalUserId(userId, oneSignalUserId, function (result) {
            //console.log(result);
            if (typeof callback === 'function') {
                callback(result);
            }
            if (result.errorCode == 0) {
                db.user.getUserInfo(userId, false, function (res) {
                    if (res.errorCode == 0) {
                        socketMap[userId].UserInfo = res.data;
                    }
                });
            }
        });
        //}
    });

    socket.on(eventName.getOrCreateAccountByPhone, function (data, callback) {
        var phone = data.phone;

        db.user.getOrCreateAccountByMobile(phone, (result) => {
            callback(result);
        });
    });

    socket.on(eventName.addContact, function (data, callback) {
        var userId = socket.userId;
        //if (userId) {
        //    userId = parseInt(userId);
        //}

        var contacts = data.contacts;

        if (/*!numberHelper.isInt(userId) ||*/ !contacts) {
            var paraError = {
                //userId: !numberHelper.isInt(userId),
                contacts: !contacts
            };
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
        }
        else {

            db.user.addContact(userId, contacts, function (result) {
                if (typeof callback === 'function') {
                    callback(result);
                }
                if (result.errorCode == 0) {
                    db.user.getUserInfo(userId, false, function (res) {
                        if (res.errorCode == 0) {
                            var userInfo = res.data;

                            //notify tới user đc thêm contacts nếu có
                            var userIds = contacts;
                            common.notify.notifyAddToContact(userId, userInfo, userIds);

                            if (socketMap[userId]) {
                                socketMap[userId].UserInfo = res.data;
                            }
                        }
                    });
                }
            });
        }
    });

    socket.on(eventName.removeContact, function (data, callback) {
        var userId = socket.userId;
        //if (userId) {
        //    userId = parseInt(userId);
        //}

        var contacts = data.contacts;

        if (/*!numberHelper.isInt(userId) ||*/ !contacts) {
            var paraError = {
                //userId: !numberHelper.isInt(userId),
                contacts: !contacts
            };
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
        }
        else {
            //console.log(contacts);
            db.user.removeContact(userId, contacts, function (result) {
                if (typeof callback === 'function') {
                    callback(result);
                }
                if (result.errorCode == 0) {
                    db.user.getUserInfo(userId, false, function (res) {
                        if (res.errorCode == 0) {
                            socketMap[userId].UserInfo = res.data;
                        }
                    });
                }
            });
        }
    });

    socket.on(eventName.searchContact, function (data, callback) {
        var userId = socket.userId;
        //if (userId) {
        //    userId = parseInt(userId);
        //}
        var pageIndex = data.pageIndex;
        var itemPerPage = data.itemPerPage;
        if (!pageIndex) {
            pageIndex = 0;
        }
        if (!itemPerPage || itemPerPage == 0) {
            itemPerPage = 100000;
        }

        var keyword = data.keyword;

        if (socketMap[userId]) {
            var userInfo = socketMap[userId].UserInfo;
            var contacts = userInfo.contacts;

            //console.log(contacts);
            if (contacts) {
                //console.log('get contact list');
                //console.log(contacts);
                //chuyển lại thành mảng id

                lst = _.map(contacts, (x) => {
                    return _.isObject(x) ? x._id : x;
                });
                //console.log(lst.length);

                lst = _.uniqBy(lst, (x) => {
                    return x
                });

                //console.log(lst.length);                       

                //console.log(lst);
                db.user.getUserInfoList(lst, function (result) {
                    if (typeof callback === 'function') {
                        if (result.errorCode == errorCodes.success) {

                            var users = result.data;
                            //console.log('keyword');
                            //console.log(keyword);
                            var resLst;
                            if (keyword) {
                                keyword = textHelper.removeAccent(keyword).toLowerCase();
                                resLst = _.filter(users, (x) => {
                                    return textHelper.removeAccent(x.name ? x.name.toLowerCase() : '').indexOf(keyword) >= 0;
                                });
                            }
                            else {
                                resLst = users;
                            }

                            var total = resLst.length;
                            result.total_item = total;

                            var startIndex = pageIndex * itemPerPage;
                            var endIndex = startIndex + itemPerPage;
                            resLst = _.sortBy(resLst, function (x) {
                                return textHelper.removeAccent(x.name ? x.name.toLowerCase() : '').indexOf(keyword)
                            });
                            //console.log(resLst);
                            resLst = resLst.slice(startIndex, endIndex);
                            //console.log(resLst);
                            var notIds = _.filter(lst, (x) => {
                                return !_.some(users, (user) => {
                                    return user._id == x;
                                });
                            });

                            result.data = resLst;

                            //console.log('notIds', notIds);
                            if (notIds.length > 0 && resLst.length < itemPerPage) {
                                db.user.syncUserList(userId, notIds, (resX) => {
                                    //console.log(resX);
                                    if (resX.errorCode == errorCodes.success) {
                                        var syncLst = resX.data;
                                        //console.log('sync');
                                        //console.log(syncLst);
                                        if (keyword) {
                                            syncLst = _.filter(syncLst, (x) => {
                                                return textHelper.removeAccent(x.name).indexOf(keyword) >= 0;
                                            });
                                        }

                                        syncLst = syncLst.splice(0, itemPerPage - resLst.length);

                                        resLst = resLst.concat(syncLst);


                                        //console.log(users);
                                        //console.log(users.length);
                                        result.data = resLst;
                                    }
                                    callback(result);
                                });
                            }
                            else {
                                //console.log(result.data.length);
                                callback(result);
                            }
                        }
                        else {
                            callback(result);
                        }
                    }
                });
            }
            else {
                if (typeof callback === 'function') {
                    callback(resultHelper.returnResultSuccess([]));
                }
            }
        }
    });
    socket.on(eventName.getContactCount, function (data, callback) {
        var userId = socket.userId;
        var total = 0;
        if (socketMap[userId]) {
            var userInfo = socketMap[userId].UserInfo;
            var contacts = userInfo.contacts;
            if (contacts) {
                var lst = _.map(contacts, (x) => {
                    return _.isObject(x) ? x._id : x;
                });
                //console.log(lst.length);

                lst = _.uniqBy(lst, (x) => {
                    return x
                });
                total = lst.length;
            }
        }
        callback(resultHelper.returnResultSuccess({ total: total }));
    });
    socket.on(eventName.getContactList, function (data, callback) {
        var userId = socket.userId;
        //if (userId) {
        //    userId = parseInt(userId);
        //}
        var pageIndex = data.pageIndex;
        var itemPerPage = data.itemPerPage;
        if (!pageIndex) {
            pageIndex = 0;
        }
        if (!itemPerPage || itemPerPage == 0) {
            itemPerPage = 100000;
        }

        if (socketMap[userId]) {
            var userInfo = socketMap[userId].UserInfo;
            var contacts = userInfo.contacts;

            //console.log(contacts);
            if (contacts) {
                //console.log('get contact list');
                //console.log(contacts);
                //chuyển lại thành mảng id

                var lst = _.map(contacts, (x) => {
                    return _.isObject(x) ? x._id : x;
                });
                //console.log(lst.length);

                lst = _.uniqBy(lst, (x) => {
                    return x
                });

                //console.log(lst.length);

                var total = lst.length;

                var startIndex = pageIndex * itemPerPage;
                var endIndex = startIndex + itemPerPage;

                lst = lst.slice(startIndex, endIndex);

                //console.log(lst);
                db.user.getUserInfoList(lst, function (result) {
                    if (typeof callback === 'function') {
                        if (result.errorCode == errorCodes.success) {
                            result.total_item = total;

                            var users = result.data;

                            var notIds = _.filter(lst, (x) => {
                                return !_.some(users, (user) => {
                                    return user._id == x;
                                });
                            });
                            //console.log('notIds', notIds);
                            //if (notIds.length > 0) {
                            //    db.user.syncUserList(userId, notIds, (resX) => {
                            //        //console.log(resX);
                            //        if (resX.errorCode == errorCodes.success) {
                            //            users = users.concat(resX.data);
                            //            //console.log(users);
                            //            //console.log(users.length);
                            //            result.data = users;
                            //        }
                            //        callback(result);
                            //    });
                            //}
                            //else {
                            //console.log(result.data.length);
                            callback(result);
                            //}
                        }
                        else {
                            callback(result);
                        }
                    }
                });
            }
            else {
                if (typeof callback === 'function') {
                    callback(resultHelper.returnResultSuccess([]));
                }
            }
        }
    });

    socket.on(eventName.checkPhoneNumber, function (data, callback) {
        var userId = socket.userId;
        //if (userId) {
        //    userId = parseInt(userId);
        //}
        var token = data.token;
        var contacts = data.contacts; // { number, name }
        //console.log(contacts);
        ////tạm map lại chỉ lấy number để truyền wa MBN vì API bên đó chưa update
        //contacts = contacts.map(function (x) {
        //    var obj = [];
        //    obj['phone'] = x.phone;
        //    obj['name'] = x.name;
        //    return obj;
        //});

        //console.log(contacts);
        //var data = {
        //    userId: userId,
        //    contacts: contacts
        //};
        //var strContacts = JSON.stringify(contacts);
        db.user.checkPhoneAndCreateUserFromContacts(userId, contacts, (result) => {
            //mbn.checkPhoneNumberExists(strContacts, userId, token, function (result) {
            if (typeof callback === 'function') {
                if (result.errorCode == 0) {
                    var data = result.data;
                    //console.log(data);
                    var newData = [];
                    _.forIn(data, function (value, key) {
                        var obj;
                        if (value._id) {
                            obj = {
                                phone: value.phone,
                                userId: value._id,
                                name: value.name,
                                avatar: value.avatar,
                                payAccount: value.payAccount
                            };
                            newData.push(obj);
                        }
                    });
                    result.data = newData;

                    for (var i = 0; i < contacts.length; i++) {
                        var m = contacts[i];
                        var mapItem = _.find(newData, (item) => {
                            return item.phone == m.phone;
                        });
                        if (mapItem) {
                            contacts[i].userId = mapItem.userId;
                            contacts[i].avatar = mapItem.avatar;
                            contacts[i].systemName = mapItem.name;
                            contacts[i].payAccount = mapItem.payAccount;
                        }
                    }

                    db.mapContact.updateUserContacts(userId, contacts, (res) => {
                    });
                }
                //console.log(result);
                callback(result);
            }
        });
    });

    socket.on(eventName.configPushInNotify, (data, callback) => {
        var userId = socket.userId;
        var enable = data.enable;
        if (enable === null || enable === undefined || enable === '') {
            var paraError = {
                enable: !(enable === null || enable === undefined || enable === '')
            }
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
        }
        else {
            db.user.updateIsPushInNotify(userId, enable, (result) => {
                if (result.errorCode == errorCodes.success) {
                    if (socketMap[userId] && socketMap[userId].UserInfo) {
                        if (socketMap[userId].UserInfo.settings) {
                            socketMap[userId].UserInfo.settings.isPushInNotify = enable;
                        }
                        else {
                            socketMap[userId].UserInfo.settings = {
                                isPushInNotify: enable
                            };
                        }
                    }
                }
                if (typeof callback === 'function') {
                    callback(result);
                }
            });
        }
    });

    //user settings
    socket.on(eventName.getUserSettings, (data, callback) => {
        var userId = socket.userId;
        common.userEvent.tryGetUserInfo(userId, (userInfo) => {
            if (userInfo) {
                callback(resultHelper.returnResultSuccess(userInfo.settings));
            }
            else {
                callback(resultHelper.returnResultNotExists());
            }
        });
    });
};