var _ = require('lodash');
var resultHelper = require('../../utility/resultHelper');
var errorCodes = resultHelper.errorCodes;
module.exports = (eventName, db, socketMap, setRoomMemberStatus, notifyToRoomMembers) => {
    var messageSendExecute = function (roomId, userId, type, content, itemGUID, callback, originMessage, replyOrForward) {
        //console.log('send in room', roomId);
        db.room.getRoomById(roomId, userId, function (res) {
            if (res.errorCode == 0) {
                var roomInfo = res.data;
                var isSignMessage = roomInfo.signMessage ? true : false;
                var roomMembers = roomInfo.members;

                //kiểm tra quyền post message trong channel hoặc user có bị restrict hay ko
                var canPost = true;
                var memberInfo = roomMembers.find(function (val) {
                    return val.userId == userId;
                });

                if (roomInfo.type == db.room.roomType.channel) {
                    if (roomInfo.userIdOwner != userId && !memberInfo.isAdmin && memberInfo.permissions && !memberInfo.permissions.postMessage) {
                        canPost = false;
                    }
                }

                if (memberInfo && memberInfo.isRestricted) {
                    if (memberInfo.restrictActions) {
                        switch (type) {
                            case 'text': {
                                if (!memberInfo.restrictActions.canSendMessage) {
                                    canPost = false;
                                }
                                break;
                            }
                            case 'image':
                            case 'video':
                            case 'file':
                            case 'item':
                            case 'location': {
                                if (!memberInfo.restrictActions.canSendMedia) {
                                    canPost = false;
                                }
                                break;
                            }
                            case 'link': {
                                if (!memberInfo.restrictActions.canEmbedLink) {
                                    canPost = false;
                                }
                                break;
                            }
                        }
                    }
                }

                if (canPost) {
                    roomInfo.members = setRoomMemberStatus(roomInfo.members);
                    var replied = false;
                    if (roomInfo.userIdGuest && roomInfo.userIdGuest != userId) {
                        replied = true;
                    }
                    var roomMemberIds = [];
                    roomMembers.forEach(function (x) {
                        roomMemberIds.push(x.userId);
                    });
                    //console.log(type);
                    //todo: chưa nhúng tên room vào message gửi về
                    if (type != db.roomLog.messageType.action) {

                        db.roomLog.addRoomLogs(roomId, userId, type, content, roomMemberIds, replied, isSignMessage, originMessage, replyOrForward, function (result) {
                            //console.log('add room log');
                            //console.log(result);
                            if (result.errorCode == errorCodes.success) {
                                var roomLog = result.data;
                                if (roomLog.type == db.roomLog.messageType.plan) {

                                    db.plan.addPlanSchedule(userId, roomId, roomLog._id.toString(), content.title, content.timeStamp, content.duration, content.place, (r) => {
                                        console.log('add plan');
                                        console.log(r);
                                    });
                                }

                                result.data.roomInfo = roomInfo;
                                if (socketMap[userId]) {
                                    var authorInfo = socketMap[userId].UserInfo;
                                    result.data.authorInfo = _.pick(authorInfo, ["_id", "name", "avatar", "phone", "url"]);
                                    result.data.itemGUID = itemGUID;

                                    if (typeof callback === 'function') {
                                        callback(result);
                                    }
                                    emitRoomMemberEvent(eventName.newMessage, result, roomMembers);

                                    //notify tới user
                                    notifyToRoomMembers(userId, roomMembers, result);
                                }
                                else {
                                    db.user.getUserInfo(userId, false, function (res) {
                                        result.data.authorInfo = res.data;
                                        result.data.itemGUID = itemGUID;
                                        if (typeof callback === 'function') {
                                            callback(result);
                                        }
                                        emitRoomMemberEvent(eventName.newMessage, result, roomMembers);

                                        //notify tới user
                                        notifyToRoomMembers(userId, roomMembers, result);
                                    });
                                }

                            }
                            else {
                                if (typeof callback === 'function') {
                                    callback(result);
                                }
                            }
                        });
                    }
                    else {
                        //console.log(roomMemberIds);
                        //console.log(content);
                        db.roomLog.addRoomLogAction(roomId, userId, content, roomMemberIds, function (result) {

                            if (result.errorCode == 0) {
                                result.data.roomInfo = roomInfo;
                                if (socketMap[userId]) {
                                    var authorInfo = socketMap[userId].UserInfo;
                                    result.data.authorInfo = _.pick(authorInfo, ["_id", "name", "avatar", "phone", "url"]);
                                    result.data.itemGUID = itemGUID;
                                    if (typeof callback === 'function') {
                                        callback(result);
                                    }
                                    emitRoomMemberEvent(eventName.newMessage, result, roomMembers);

                                    //notify tới user
                                    notifyToRoomMembers(userId, roomMembers, result);
                                }
                                else {
                                    db.user.getUserInfo(userId, false, function (res) {
                                        result.data.authorInfo = res.data;
                                        result.data.itemGUID = itemGUID;
                                        if (typeof callback === 'function') {
                                            callback(result);
                                        }
                                        emitRoomMemberEvent(eventName.newMessage, result, roomMembers);

                                        //notify tới user
                                        notifyToRoomMembers(userId, roomMembers, result);
                                    });
                                }
                            }
                            else {
                                if (typeof callback === 'function') {
                                    callback(result);
                                }
                            }
                        });
                    }
                }
                else {
                    if (typeof callback === 'function') {
                        callback(resultHelper.returnResultPermission("Not have permission!"));
                    }
                }
            }
            else {
                if (typeof callback === 'function') {
                    callback(res);
                }
            }
        });
    };
    var emitRoomMemberEvent = function (eventName, result, roomMembers) {
        roomMembers = _.uniqBy(roomMembers, 'userId');
        roomMembers.forEach(function (x) {
            if (!x.isArchived) {
                var res = result;
                if (eventName == eventName.newMessage || eventName == eventName.updateMessage) {
                    res.data.roomInfo = db.room.parseRoomInfo(res.data.roomInfo, x.userId);
                }
                if (socketMap[x.userId] != null) {
                    var sockets = socketMap[x.userId].Sockets;

                    if (sockets) {
                        sockets.forEach(function (s) {
                            s.emit(eventName, res);
                        });
                    }
                }
            }
        });

    };

   
    return {
        messageSendExecute: messageSendExecute,
        emitRoomMemberEvent: emitRoomMemberEvent
    };
}