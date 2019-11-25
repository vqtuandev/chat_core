var async = require('async');
var _ = require('lodash');
var resultHelper = require('../../utility/resultHelper');
var errorCodes = resultHelper.errorCodes;
module.exports = (eventName, db, socketMap) => {

    var emitUserEvent = function (eventName, result, userId) {
        if (socketMap[userId] != null) {
            var sockets = socketMap[userId].Sockets;
            if (sockets) {
                sockets.forEach(function (s) {
                    s.emit(eventName, result);
                });
            }
        }
    };

    var emitOnlineUser = function (socket, userInfo) {
        var onlineList = [];
        var contacts = []; 

        var getContact = (cb) => {
            if (userInfo.contacts && userInfo.contacts.length > 0) {
                contacts = userInfo.contacts;
                cb();
            }
            else {
                db.user.getUserInfo(userInfo._id, false, (res) => {
                    if (res.errorCode == errorCodes.success) {
                        contacts = res.data.contacts;
                    }
                    cb();
                });
            }
        };

        var pushContactOnline = (cb) => {
            if (contacts) {
                contacts = _.map(contacts, (x) => {
                    return _.isObject(x) ? x._id : x;
                });
                //console.log(contacts);

                contacts = _.uniqBy(contacts, (x) => {
                    return x
                });
                contacts.forEach(function (c) {
                    //check xem contact là object ({_id, name}) hay chỉ là id và gán cho x;
                    var x = _.isObject(c) ? c._id : c;

                    if (socketMap[x]) {
                        onlineList.push(x);
                        var sockets = socketMap[x].Sockets;
                        if (sockets) {
                            sockets.forEach(function (s) {
                                s.emit(eventName.userConnected, resultHelper.returnResultSuccess({ userId: userInfo._id }));
                            });
                        }
                    }
                });
            }

            socket.emit(eventName.onlineUsers, resultHelper.returnResultSuccess({
                userIds: onlineList
            }));

            cb();
        }
        //tạm chưa có ds contact nên cứ broadcast ra hết vì chưa có giải pháp tối ưu cho việc báo online
        //for (var i = 0; i < onlineList.length; i++) {
        //    emitAContactOnline(onlineList[i], userInfo._id);
        //}

        //socket.broadcast.emit(eventName.userConnected, resultHelper.returnResultSuccess({ userId: userInfo._id }));
        async.series({ getContact, pushContactOnline }, (err, results) => {
            console.log(err);
        });
    };

    var emitDisconnected = function (userInfo) {

        var contacts = [];

        var getContact = (cb) => {
            if (userInfo.contacts && userInfo.contacts.length > 0) {
                contacts = userInfo.contacts;
                cb();
            }
            else {
                db.user.getUserInfo(userInfo._id, false, (res) => {
                    if (res.errorCode == errorCodes.success) {
                        contacts = res.data.contacts;
                    }
                    cb();
                });
            }
        };

        var pushContactOffline = (cb) => {
            if (contacts) {
                contacts = _.map(contacts, (x) => {
                    return _.isObject(x) ? x._id : x;
                });
                console.log(contacts);

                contacts = _.uniqBy(contacts, (x) => {
                    return x
                });
                contacts.forEach(function (c) {
                    //check xem contact là object ({_id, name}) hay chỉ là id và gán cho x;
                    var x = _.isObject(c) ? c._id : c;

                    if (socketMap[x]) {

                        var sockets = socketMap[x].Sockets;
                        if (sockets) {
                            sockets.forEach(function (s) {
                                s.emit(eventName.userDisconnected, resultHelper.returnResultSuccess({ userId: userInfo._id }));
                            });
                        }
                    }
                });
            }
            cb();
        }

        async.series({ getContact, pushContactOffline }, (err, results) => {
            console.log(err);
        });
    };

    var emitAContactOnline = function (userId, contactId) {
        var userInfo = db.user.getUserInfoFromCache(userId);
        if (userInfo) {
            var res = _.some(userInfo.contacts, function (c) {
                return c === contactId;
            });
            if (res) {
                emitUserEvent(eventName.userConnected, resultHelper.returnResultSuccess({
                    userId: contactId
                }), userId);
            }
        }
    };

    var emitIfConnectSuccess = function (socket, userInfo) {
        console.log('connect success');
        console.log(userInfo);
        socket.emit(eventName.connectSuccess, resultHelper.returnResultSuccess(userInfo));
        //trả về danh sách chat gần đây
        //emitRecentChatRoom(socket, userInfo._id, null, itemCount, '');
        //trả về danh sách favorite
        //emitRecentPinChatRoom(socket, userInfo._id, null, itemCount);
        //trả về danh sách online
        emitOnlineUser(socket, userInfo);
    };

    var emitIfConnectFail = function (socket) {
        socket.emit(eventName.connectFail, resultHelper.returnResult(resultHelper.errorCodes.permission, 'Login info not valid', null));
    };

    var tryGetUserInfo = function (userId, callback) {
        if (socketMap[userId]) {
            if (typeof callback === 'function') {
                callback(socketMap[userId].UserInfo);
            }
        }
        else {
            db.user.getUserInfo(userId, false, function (result) {
                if (typeof callback === 'function') {
                    if (result.errorCode == 0) {
                        callback(result.data);
                    }
                    else {
                        callback(null);
                    }
                }
            });
        }
    };

    var tryGetRoomInfo = function (userId, roomId, roomInfo, callback, notAMember) {
        if (roomInfo) {
            if (typeof callback === 'function') {
                callback(roomInfo);
            }
        }
        else if (notAMember == true) {
            db.room.getRoomByIdNotCheckMember(roomId, userId, function (result) {
                if (typeof callback === 'function') {
                    if (result.errorCode == 0) {
                        callback(result.data);
                    }
                    else {
                        callback(null);
                    }
                }
            });
        }
        else {
            db.room.getRoomById(roomId, userId, function (result) {
                if (typeof callback === 'function') {
                    if (result.errorCode == 0) {
                        callback(result.data);
                    }
                    else {
                        callback(null);
                    }
                }
            });
        }
    };

   
    //lấy user đang online
    var getCurrentOnlineUser = function () {
        var res = { total: 0, list: [] };
        for (var i in socketMap) {
            if (socketMap[i] != null) {
                res.total++;
                res.list.push(socketMap[i].UserInfo);
            }
        }
        return res;
    };
    //ghi thông tin user online
    var updateUserOnline = function (userInfo, os) {
        var info = {
            _id: userInfo._id,
            name: userInfo.name,
            phone: userInfo.phone,
            email: userInfo.email,
            avatar: userInfo.avatar
        };
        db.report.updateOnlineLog(info, os, function (result) {

        });
    };

    var broadcastCurrentOnlineUser = function (io) {
        var data = getCurrentOnlineUser();
        io.emit(eventName.currentOnlineUser, resultHelper.returnResultSuccess(data));
    };

    var setRoomMemberToEachContactRoom = function (members) {
        for (var i = 0; i < members.length; i++) {
            var userId = members[i].userId;
            for (var j = 0; j < members.length; j++) {
                if (members[j].userId != userId) {
                    var contactId = members[j].userId;
                    if (socketMap[contactId]) {
                        var sockets = socketMap[contactId].Sockets;
                        if (sockets) {
                            sockets.forEach(function (s) {
                                s.join(userId.tostring);
                            });
                        }
                    }
                }
            }
        }
    };   

    return {
        emitUserEvent: emitUserEvent,
        emitOnlineUser: emitOnlineUser,
        emitDisconnected: emitDisconnected,
        emitAContactOnline: emitAContactOnline,
        emitIfConnectSuccess: emitIfConnectSuccess,
        emitIfConnectFail: emitIfConnectFail,
        tryGetUserInfo: tryGetUserInfo,
        tryGetRoomInfo: tryGetRoomInfo,
        getCurrentOnlineUser: getCurrentOnlineUser,
        updateUserOnline: updateUserOnline,
        broadcastCurrentOnlineUser: broadcastCurrentOnlineUser,
        setRoomMemberToEachContactRoom: setRoomMemberToEachContactRoom
    };
}