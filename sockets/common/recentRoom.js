module.exports = (eventName, db, socketMap)=> {
    var emitRecentGroup = function (socket, userId, lastLogDate, itemCount, keyword, callback) {
        if (keyword) {
            db.room.searchRecentGroup(userId, lastLogDate, itemCount, keyword, function (result) {
                if (typeof callback === 'function') {
                    callback(result);
                }
                //else {
                //    socket.emit(eventName.recentChatRoom, result);
                //}
            });
        }
        else {
            db.room.getRecentGroup(userId, lastLogDate, itemCount, function (result) {

                if (typeof callback === 'function') {
                    callback(result);
                }
                //else {
                //    socket.emit(eventName.recentChatRoom, result);
                //}
            });
        }
    };

    var emitRecentChannel = function (socket, userId, lastLogDate, itemCount, keyword, callback) {
        if (keyword) {
            db.room.searchRecentChannel(userId, lastLogDate, itemCount, keyword, function (result) {
                if (typeof callback === 'function') {
                    callback(result);
                }
                //else {
                //    socket.emit(eventName.recentChatRoom, result);
                //}
            });
        }
        else {
            db.room.getRecentChannel(userId, lastLogDate, itemCount, function (result) {

                if (typeof callback === 'function') {
                    callback(result);
                }
                //else {
                //    socket.emit(eventName.recentChatRoom, result);
                //}
            });
        }
    };

    var emitRecentChatRoom = function (socket, userId, lastLogDate, itemCount, keyword, callback) {
        if (keyword) {
            db.room.searchRecentChatRoom(userId, lastLogDate, itemCount, keyword, function (result) {
                if (result.errorCode == 0) {
                    db.room.searchRecentChatRoomCount(userId, keyword, (resX) => {
                        if (resX.errorCode == 0) {
                            result.totalItem = resX.data;
                        }
                        if (typeof callback === 'function') {
                            callback(result);
                        }
                        else {
                            socket.emit(eventName.recentChatRoom, result);
                        }
                    });
                }
                else {
                    if (typeof callback === 'function') {
                        callback(result);
                    }
                    else {
                        socket.emit(eventName.recentChatRoom, result);
                    }
                }
            });
        }
        else {
            db.room.getRecentChatRoom(userId, lastLogDate, itemCount, function (result) {

                if (typeof callback === 'function') {
                    callback(result);
                }
                else {
                    socket.emit(eventName.recentChatRoom, result);
                }
            });
        }
    };

    var emitRecentPinChatRoom = function (socket, userId, lastLogDate, itemCount, callback) {
        db.room.getFavoriteRecentChatRoom(userId, lastLogDate, itemCount, function (result) {
            if (typeof callback === 'function') {
                callback(result);
            }
            else {
                socket.emit(eventName.recentPinChatRoom, result);
            }
        });
    };
    var setRoomMemberStatus = function (members) {
        //setRoomMemberToEachContactRoom(members);
        for (var i = 0; i < members.length; i++) {
            var userId = members[i].userId;
            if (socketMap[userId]) {
                members[i].userInfo.online = true;
            }
            else {
                members[i].userInfo.online = false;
            }
        }
        return members;
    };

    return {
        emitRecentGroup: emitRecentGroup,
        emitRecentChannel: emitRecentChannel,
        emitRecentChatRoom: emitRecentChatRoom,
        emitRecentPinChatRoom: emitRecentPinChatRoom,
        setRoomMemberStatus: setRoomMemberStatus
    };
}