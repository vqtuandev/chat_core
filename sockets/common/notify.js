var _ = require('lodash');
var oneSignal = require('../../services/oneSignal');
var textHelper = require('../../utility/textHelper');
var resultHelper = require('../../utility/resultHelper');
var errorCodes = resultHelper.errorCodes;

module.exports = (eventName, db, socketMap, tryGetUserInfo, tryGetRoomInfo) => {
    //notify 

    var notifyToUser = function (userId, roomId, content, roomInfo, isMessage) {
        var oneSignalUserIds = [];
        tryGetUserInfo(userId, function (userInfo) {
            if (userInfo.oneSignalUserIds) {
                userInfo.oneSignalUserIds.forEach(function (z) {
                    oneSignalUserIds.push(z);
                });
                if (oneSignalUserIds.length > 0) {
                    var message;
                    if (isMessage) {
                        message = parseMessageToNotify(content);
                    }
                    else {
                        message = parseActionMessageNotify(content);
                    }

                    var data = {
                        roomId: roomId
                    };

                    tryGetRoomInfo(userId, roomId, roomInfo, function (room) {
                        var roomName = db.room.parseRoomName(room, userId);
                        var roomMembers = [{ userId: userId, userInfo: userInfo }];
                        //console.log('notify to');
                        //console.log(roomMembers);
                        oneSignal.sendNotify(roomName, message, data, oneSignalUserIds, roomId, roomMembers, function (result) {
                        });
                    });
                }
            }
        });
    };

    var notifyToRoomMembers = function (userId, roomMembers, result) {
        var oneSignalUserIds = [];
        //console.log('room members');
        //console.log(roomMembers);
        var log = result.data;
        roomMembers.forEach(function (x) {
            if (x.userId != userId || log.content.actionType == db.roomLog.actionType.planReminder) {
                if (x.isMuted == false) {
                    if (x.userInfo.oneSignalUserIds) {
                        x.userInfo.oneSignalUserIds.forEach(function (z) {
                            oneSignalUserIds.push(z);
                        });
                        if (oneSignalUserIds.length > 0) {

                            var message = parseMessageToNotify(log);

                            var data = {
                                roomId: log.roomId,
                                logId: log._id
                            };

                            var roomName = db.room.parseRoomName(log.roomInfo, x.userId);
                            //console.log(x.userInfo.name, oneSignalUserIds);
                            //vì đang theo kiểu send từng user nên chỉ cần truyền user hiện tại vào roomMembers, thay vì truyền hết
                            oneSignal.sendNotify(roomName, message, data, oneSignalUserIds, log.roomId, [x], function (result) {
                            });
                        }
                        oneSignalUserIds = [];
                    }
                }
            }
        });
    };

    var notifyToSayHi = function (userInfo, isNew) {
        console.log('notify say Hi');
        console.log(userInfo);
        db.user.getUserHasContact(userInfo._id, (result) => {
            //console.log('contact list');
            //console.log(result);
            if (result.errorCode == 0) {
                var users = result.data;
                _.each(users, (user) => {
                    db.room.getPrivateRoom(userInfo._id, user._id, userInfo._id, (res) => {
                        if (res.errorCode == errorCodes.success) {
                            var room = res.data;
                            db.mapContact.getUserContactMapName(user._id, userInfo.phone, (res0) => {
                                var contactName = '';
                                if (res0.errorCode == errorCodes.success) {
                                    contactName = res0.data;
                                }
                                var content = {
                                    actionType: db.roomLog.actionType.newToChat,
                                    data: {
                                        userName: contactName ? contactName : ((user.contact && user.contact.name) ? user.contact.name : userInfo.name)
                                    }
                                };
                                room.roomName = 'Gợi ý';
                                notifyToUser(user._id, room._id, content, room);
                            });
                            //console.log('to ' + user._id, );
                        }
                    });
                });

                //ghi notify logs
                var userIds = _.map(users, (user) => {
                    return user._id;
                });
                notifyLoginChatNhanh(userInfo._id, userInfo, userIds, isNew);
            }
        });
    };

    var pushNotifyList = function (notifies, socketOnly) {
        _.each(notifies, (notify) => {
            var userId = notify.userId;

            //realtime
            if (socketMap[userId] != null) {
                var sockets = socketMap[userId].Sockets;

                if (sockets) {
                    sockets.forEach(function (s) {
                        s.emit(eventName.newNotify, resultHelper.returnResultSuccess(notify));
                    });
                }
            }
            if (!socketOnly) {
                //console.log('push notify');
                tryGetUserInfo(userId, function (userInfo) {
                    //có cấu hình push mới push
                    var oneSignalUserIds = [];
                    //ko lấy đc thông tin thì thôi bỏ qua
                    
                    if (userInfo && (!userInfo.settings || userInfo.settings.isPushInNotify)) {
                        console.log(userInfo.oneSignalUserIds);
                        if (userInfo.oneSignalUserIds) {
                            userInfo.oneSignalUserIds.forEach(function (z) {
                                oneSignalUserIds.push(z);
                            });
                            if (oneSignalUserIds.length > 0) {
                                var message = notify.message;
                                var title = notify.title;

                                var data = notify;

                                var roomMembers = [{ userId: userId, userInfo: userInfo }];
                                oneSignal.sendNotify(title, message, data, oneSignalUserIds, null, roomMembers, function (result) {
                                });
                            }
                        }
                    }
                });
            }
        });
    };

    var notifyAddToContact = function (userId, userInfo, userIds) {
        userIds = removeActionUserFromList(userId, userIds);

        var type = db.notification.notifyType.action;
        var data = {
            actionType: db.notification.notifyActionType.addToContact,
            actionData: {
                userId: userId,
                name: userInfo.name,
                avatar: userInfo.avatar,
                phone: userInfo.phone,
                email: userInfo.email,
                url: userInfo.url
            }
        };

        var title = db.notification.generateActionNotifyTitle(type, data);
        var message = db.notification.generateActionMessage(type, data);
        var image = db.notification.generateActionTypeImage(type, data);
        if (userIds && userIds.length > 0) {
            db.notification.addNotifies(userId, userIds, title, message, image, type, data, (result) => {
                if (result.errorCode == errorCodes.success) {
                    pushNotifyList(result.data);
                }
            });
        }
    };

    var notifyLoginChatNhanh = function (userId, userInfo, userIds, isNew) {
        userIds = removeActionUserFromList(userId, userIds);

        var type = db.notification.notifyType.action;
        var data = {
            actionType: isNew ? db.notification.notifyActionType.newToChatNhanh : db.notification.notifyActionType.loginChatNhanh,
            actionData: {
                userId: userId,
                name: userInfo.name,
                avatar: userInfo.avatar,
                phone: userInfo.phone,
                email: userInfo.email,
                url: userInfo.url
            }
        };
        var title = db.notification.generateActionNotifyTitle(type, data);
        var message = db.notification.generateActionMessage(type, data);
        var image = db.notification.generateActionTypeImage(type, data);
        if (userIds && userIds.length > 0) {
            db.notification.addNotifies(userId, userIds, title, message, image, type, data, (result) => {
                if (result.errorCode == errorCodes.success) {
                    //realtime
                    var notifies = result.data;
                    _.each(notifies, (notify) => {
                        var userId = notify.userId;
                        if (socketMap[userId] != null) {
                            var sockets = socketMap[userId].Sockets;

                            if (sockets) {
                                sockets.forEach(function (s) {
                                    s.emit(eventName.newNotify, resultHelper.returnResultSuccess(notify));
                                });
                            }
                        }
                    });
                    //có notify thẳng vào room nên ko cần notify này
                    //pushNotifyList(result.data);
                }
            });
        }
    };

    var notifyRoomMemberAction = function (userId, userInfo, roomId, userIds, isRemove) {
        userIds = removeActionUserFromList(userId, userIds);
        _.each(userIds, (x) => {
            tryGetRoomInfo(x, roomId, null, (roomInfo) => {
                var type = db.notification.notifyType.action;
                var data = {
                    actionType: isRemove ? db.notification.notifyActionType.removeFromRoom : db.notification.notifyActionType.addToRoom,
                    actionData: {
                        userId: userId,
                        name: userInfo.name,
                        avatar: userInfo.avatar,
                        roomId: roomInfo._id,
                        roomName: roomInfo.roomName,
                        roomAvatar: roomInfo.roomAvatar
                    }
                };
                var title = db.notification.generateActionNotifyTitle(type, data);
                var message = db.notification.generateActionMessage(type, data);
                var image = db.notification.generateActionTypeImage(type, data);

                db.notification.addNotifies(userId, [x], title, message, image, type, data, (result) => {
                    if (result.errorCode == errorCodes.success) {
                        pushNotifyList(result.data);
                    }
                });
            }, true);
        });
    };

    var parseActionMessageNotify = function (content) {
        var message = '';
        switch (content.actionType) {
            case db.roomLog.actionType.deleteMessage: {
                message += 'Tin nhắn đã bị xóa.';
                break;
            }
            case db.roomLog.actionType.createRoom: {
                message += content.data.userName + ' đã tạo group.';
                break;
            }
            case db.roomLog.actionType.renameRoom: {
                message += content.data.userName + ' đã đổi tên group là ' + content.data.roomName + '.';
                break;
            }
            case db.roomLog.actionType.changeAvatarRoom: {
                message += content.data.userName + ' đã thay đổi photo của group.';
                break;
            }
            case db.roomLog.actionType.addMember: {
                message += content.data.userName + ' đã thêm ' + content.data.memberInfo.name + ' vào group.';
                break
            }
            case db.roomLog.actionType.removeMember: {
                message += content.data.userName + ' đã xoá ' + content.data.memberInfo.name + ' khỏi group.';
                break;
            }
            case db.roomLog.actionType.createChannel: {
                message += content.data.userName + ' đã tạo channel.';
                break;
            }
            case db.roomLog.actionType.renameChannel: {
                message += content.data.userName + ' đã đổi tên channel là ' + content.data.roomName + '.';
                break;
            }
            case db.roomLog.actionType.changeChannelAvatar: {
                message += content.data.userName + ' đã thay đổi hình của kênh.';
                break;
            }
            case db.roomLog.actionType.changeChannelDescription: {
                message += content.data.userName + ' đã đổi mô tả channel';
                break;
            }
            case db.roomLog.actionType.changeAdminPermission: {
                message += content.data.actionUserName + ' đã thay đổi quyền admin của bạn';
                break;
            }
            case db.roomLog.actionType.joinRoom: {
                message += content.data.userName + ' đã tham gia vào group thông qua link';
                break;
            }
            case db.roomLog.actionType.joinChannel: {
                message += content.data.userName + ' đã tham gia vào channel thông qua link';
                break;
            }
            case db.roomLog.actionType.leaveRoom: {
                message += content.data.userName + ' đã rời khỏi group';
                break;
            }
            case db.roomLog.actionType.leaveChannel: {
                message += content.data.userName + ' đã rời khỏi channel';
                break;
            }
            case db.roomLog.actionType.newToChat: {
                message += content.data.userName + ' vừa vào ChatNhanh. Hãy gởi lời chào Bạn nhé';
                break;
            }
            case db.roomLog.actionType.planReminder: {
                message = 'Đặt lịch ' + content.data.title + ' đã tới hạn.';
                break;
            }
        }
        return message;
    };
    var parseMessageToNotify = function (log) {
        var message = '';

        var authorInfo = log.authorInfo;
        var roomInfo = log.roomInfo;

        if (authorInfo) {

            var ignoreAuthorName = (roomInfo ? (roomInfo.type == 'private') : false);

            switch (log.type) {
                case db.roomLog.messageType.text: {
                    //console.log(log.content.content);
                    message = (ignoreAuthorName ? '' : (authorInfo.name + ': ')) + textHelper.replaceMentions(log.content.content);
                    break;
                }
                case db.roomLog.messageType.image:
                case db.roomLog.messageType.file: {
                    message = (ignoreAuthorName ? '' : (authorInfo.name + ': ')) + ' đã gửi ' + log.content.name;
                    break;
                }
                case db.roomLog.messageType.link: {
                    message = (ignoreAuthorName ? '' : (authorInfo.name + ': ')) + ': ' + log.content.link;
                    break;
                }
                case db.roomLog.messageType.location: {
                    message = (ignoreAuthorName ? '' : (authorInfo.name + ': ')) + ' đã gửi vị trí';
                    break;
                }
                case db.roomLog.messageType.action: {
                    message = parseActionMessageNotify(log.content);
                    break;
                }
                case db.roomLog.messageType.item: {
                    message = (ignoreAuthorName ? '' : (authorInfo.name + ': ')) + ' đã gửi thông tin sản phẩm';
                    break;
                }
                case db.roomLog.messageType.album: {
                    message = (ignoreAuthorName ? '' : (authorInfo.name + ': ')) + ' đã gửi album';
                    break;
                }
                default: {
                    message = (ignoreAuthorName ? '' : (authorInfo.name + ': ')) + ' đã gửi tin nhắn';
                    break;
                }
            }
        }
        else {
            message = 'Có tin nhắn mới';
        }
        console.log(message);
        return message;
    };

    var removeActionUserFromList = function (userId, userIds) {
        _.remove(userIds, (x) => {
            return x == userId;
        });
        return userIds;
    };
    return {
        notifyToUser: notifyToUser,
        notifyToRoomMembers: notifyToRoomMembers,
        notifyToSayHi: notifyToSayHi,
        notifyRoomMemberAction: notifyRoomMemberAction,
        notifyLoginChatNhanh: notifyLoginChatNhanh,
        notifyAddToContact: notifyAddToContact,
        pushNotifyList: pushNotifyList,
        removeActionUserFromList: removeActionUserFromList,
        parseActionMessageNotify: parseActionMessageNotify,
        parseMessageToNotify: parseMessageToNotify
    };
}