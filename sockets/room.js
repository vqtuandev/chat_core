var moment = require('moment');
var textHelper = require('../utility/textHelper');
var numberHelper = require('../utility/numberHelper');
var _ = require('lodash');
var azure = require('../services/azure');
var dateHelper = require('../utility/dateHelper');
module.exports = (socket, eventName, socketMap, db, resultHelper, common) => {
    //favorite room
    var errorCodes = resultHelper.errorCodes;
    //thêm vào danh sách favorite
    socket.on(eventName.pinRoom, function (data, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;
        //if (userId) {
        //    userId = parseInt(userId);
        //}

        if (/*numberHelper.isInt(userId) &&*/ roomId) {
            db.room.setRoomFavorite(userId, roomId, true, function (result) {
                if (typeof callback === 'function') {
                    callback(result);
                }
            });
        }
        else {
            var paraError = {
                //userId: !numberHelper.isInt(userId),
                roomId: roomId ? false : true
            };
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
        }
    });

    //xóa khỏi danh sách favorite
    socket.on(eventName.unpinRoom, function (data, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;

        //if (userId) {
        //    userId = parseInt(userId);
        //}

        if (/*numberHelper.isInt(userId) && */roomId) {
            db.room.setRoomFavorite(userId, roomId, false, function (result) {
                if (typeof callback === 'function') {
                    callback(result);
                }
            });
        }
        else {
            var paraError = {
                //userId: !numberHelper.isInt(userId),
                roomId: roomId ? false : true
            };
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
        }
    });

    ////////////////////////////////////////
    socket.on(eventName.getRecentChatRoom, function (data, callback) {
        var userId = socket.userId;
        //if (userId) {
        //    userId = parseInt(userId);
        //}
        //if (numberHelper.isInt(userId)) {
            var lastLogDate = data.lastLogDate;
            var keyword = data.keyword;
            if (keyword) {
                keyword = textHelper.fixingKeyword(keyword);
            }
            common.recentRoom.emitRecentChatRoom(socket, userId, lastLogDate, common.itemCount, keyword, callback);
        //}
        //else {
        //    var paraError = {
        //        userId: !numberHelper.isInt(userId)
        //    };
        //    if (typeof callback === 'function') {
        //        callback(resultHelper.returnResultParameterError(paraError));
        //    }
        //}
    });

    socket.on(eventName.getRecentPinChatRoom, function (data, callback) {
        var userId = socket.userId;
        //if (userId) {
        //    userId = parseInt(userId);
        //}
        //if (numberHelper.isInt(userId)) {
            var lastLogDate = data.lastLogDate;
            common.recentRoom.emitRecentPinChatRoom(socket, userId, lastLogDate, common.itemCount, callback);
        //}
        //else {
        //    var paraError = {
        //        userId: !numberHelper.isInt(userId)
        //    };
        //    if (typeof callback === 'function') {
        //        callback(resultHelper.returnResultParameterError(paraError));
        //    }
        //}
    });

    //lấy số lượng tin chưa đọc
    socket.on(eventName.getUnreadRoomCount, function (data, callback) {

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
            db.room.getUnreadRoomCount(userId, function (result) {
                if (typeof callback === 'function') {
                    callback(result);
                }
            });
        //}
    });

    //lấy danh sách gần đây Channel
    ////////////////////////////////////////
    socket.on(eventName.getRecentChannel, function (data, callback) {
        var userId = socket.userId;
        //if (userId) {
        //    userId = parseInt(userId);
        //}
        //if (numberHelper.isInt(userId)) {
            var lastLogDate = data.lastLogDate;
            var keyword = data.keyword;
            if (keyword) {
                keyword = textHelper.fixingKeyword(keyword);
            }
            common.recentRoom.emitRecentChannel(socket, userId, lastLogDate, common.itemCount, keyword, callback);
        //}
        //else {
        //    var paraError = {
        //        userId: !numberHelper.isInt(userId)
        //    };
        //    if (typeof callback === 'function') {
        //        callback(resultHelper.returnResultParameterError(paraError));
        //    }
        //}
    });

    socket.on(eventName.getRecentGroupRoom, function (data, callback) {
        var userId = socket.userId;
        //if (userId) {
        //    userId = parseInt(userId);
        //}
        //if (numberHelper.isInt(userId)) {
            var lastLogDate = data.lastLogDate;
            var keyword = data.keyword;
            if (keyword) {
                keyword = textHelper.fixingKeyword(keyword);
            }
            common.recentRoom.emitRecentGroup(socket, userId, lastLogDate, common.itemCount, keyword, callback);
        //}
        //else {
        //    var paraError = {
        //        userId: !numberHelper.isInt(userId)
        //    };
        //    if (typeof callback === 'function') {
        //        callback(resultHelper.returnResultParameterError(paraError));
        //    }
        //}
    });

    //--------------------------------------------------------
    //các hàm về room

    //hàm lấy room chat riêng
    socket.on(eventName.getPrivateRoom, function (data, callback) {
        var userId1 = socket.userId;
        var userId2 = data.userId;
        console.log('getPrivateRoom');
        //console.log('getPrivateRoom');
        //parse data type
        //if (userId1) {
        //    userId1 = parseInt(userId1);
        //}

        //if (userId2) {
        //    userId2 = parseInt(userId2);
        //}

        //Kiểm tra parameter
        //if (!numberHelper.isInt(userId1) || !numberHelper.isInt(userId2)) {
        //    var paraError = {
        //        userId1: !numberHelper.isInt(userId1),
        //        userId2: !numberHelper.isInt(userId2)
        //    };
        //    if (typeof callback === 'function') {
        //        callback(resultHelper.returnResultParameterError(paraError));
        //    }
        //}
        //else {
            db.user.getUserInfo(userId2, false, function (res) {
                if (res.errorCode == 0) {
                    db.room.getPrivateRoom(userId1, userId2, userId1, function (result) {

                        if (result.errorCode == resultHelper.errorCodes.successNew) {
                            result.errorCode = resultHelper.errorCodes.success;

                            //chưa cần tạo log action vì chat riêng ko cần
                            //var roomInfo = result.data;
                            //var members = [];
                            //roomInfo.members.forEach(function (x) {
                            //    members.push(x.userId);
                            //});
                            //db.roomLog.addRoomLogAction(roomInfo._id, userId1, db.roomLog.actionType.createRoom, members, function (res) {
                            //    if (res.errorCode == resultHelper.errorCodes.success) {
                            //        emitRoomMemberEvent(eventName.newMessage, res, roomInfo.members);
                            //    }
                            //});

                            //tự động thêm contact vào 
                            db.user.addContact(userId1, [userId2], function (resX) {
                                if (resX.errorCode == 0) {
                                    db.user.getUserInfo(userId1, false, function (res) {
                                        if (res.errorCode == 0) {
                                            var userInfo = res.data;

                                            //notify tới user đc thêm contacts nếu có
                                            //var userIds = contacts;
                                            //notifyAddToContact(userId, userInfo, userIds);

                                            if (socketMap[userId1]) {
                                                socketMap[userId1].UserInfo = res.data;
                                            }
                                        }
                                    });
                                }
                            });
                            db.user.addContact(userId2, [userId1], function (resX) {
                                if (resX.errorCode == 0) {
                                    db.user.getUserInfo(userId2, false, function (res) {
                                        if (res.errorCode == 0) {
                                            var userInfo = res.data;

                                            //notify tới user đc thêm contacts nếu có
                                            //var userIds = contacts;
                                            //notifyAddToContact(userId, userInfo, userIds);

                                            if (socketMap[userId2]) {
                                                socketMap[userId2].UserInfo = res.data;
                                            }
                                        }
                                    });
                                }
                            });

                            result.data.members = common.recentRoom.setRoomMemberStatus(result.data.members);
                        }
                        if (typeof callback === 'function') {
                            callback(result);
                        }
                    });
                }
                else {
                    if (typeof callback === 'function') {
                        callback(res);
                    }
                }
            });
        //}
    });

    //hàm lấy room chat riêng về tin rao
    socket.on(eventName.getItemRoom, function (data, callback) {
        var userId = socket.userId;
        var userIdOwner = data.userIdOwner;
        var userIdGuest = data.userIdGuest;
        var itemId = data.itemId;
        var itemName = data.itemName;
        var itemImage = data.itemImage;
        var itemLink = data.itemLink;
        var itemPrice = data.itemPrice;
        var itemOriginPrice = data.itemOriginPrice;

        //if (userId) {
        //    userId = parseInt(userId);
        //}

        //if (userIdOwner) {
        //    userIdOwner = parseInt(userIdOwner);
        //}

        //if (userIdGuest) {
        //    userIdGuest = parseInt(userIdGuest);
        //}

        if (itemId) {
            itemId = parseInt(itemId);
        }

        if (/*!numberHelper.isInt(userId) || !numberHelper.isInt(userIdOwner) || !numberHelper.isInt(userIdGuest) ||*/ !numberHelper.isInt(itemId)) {
            var paraError = {
                //userId: !numberHelper.isInt(userId),
                //userIdOwner: !numberHelper.isInt(userIdOwner),
                //userIdGuest: !numberHelper.isInt(userIdGuest),
                itemId: !numberHelper.isInt(itemId),
            }
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
        }
        else {

            var chatToUserId = userId == userIdOwner ? userIdGuest : userIdOwner;

            db.user.getUserInfo(chatToUserId, false, function (res) {
                if (res.errorCode == 0) {
                    db.room.getItemRoom(userIdOwner, userIdGuest, itemId, itemName, itemImage, itemLink, itemPrice, userId, function (result) {
                        if (result.errorCode == resultHelper.errorCodes.successNew) {
                            result.errorCode = resultHelper.errorCodes.success;

                            //chưa cần tạo log action vì chat riêng ko cần
                            //var roomInfo = result.data;
                            //var members = [];

                            //roomInfo.members.forEach(function (x) {
                            //    members.push(x.userId);
                            //});

                            //db.roomLog.addRoomLogAction(roomInfo._id, userId, db.roomLog.actionType.createRoom, members, function (res) {
                            //    if (res.errorCode == resultHelper.errorCodes.success) {
                            //        emitRoomMemberEvent(eventName.newMessage, res, roomInfo.members);
                            //    }
                            //});
                            result.data.members = common.recentRoom.setRoomMemberStatus(result.data.members);
                        }
                        if (typeof callback === 'function') {
                            callback(result);
                        }
                    }, itemOriginPrice);
                }
                else {
                    if (typeof callback === 'function') {
                        callback(res);
                    }
                }
            });
        }
    });

    //hàm lấy room chat page
    socket.on(eventName.getPageRoom, function (data, callback) {
        var userId = socket.userId;
        var userIdGuest = data.userIdGuest;
        var pageMembers = data.pageMembers;
        var pageId = data.pageId;
        var pageName = data.pageName;
        var pageImage = data.pageImage;
        var pageLink = data.pageLink;

        //if (userId) {
        //    userId = parseInt(userId);
        //}

        //if (userIdGuest) {
        //    userIdGuest = parseInt(userIdGuest);
        //}

        if (pageId) {
            pageId = parseInt(pageId);
        }

        if (/*!numberHelper.isInt(userId) || !numberHelper.isInt(userIdGuest) || */!numberHelper.isInt(pageId)) {
            var paraError = {
                //userId: !numberHelper.isInt(userId),
                //userIdGuest: !numberHelper.isInt(userIdGuest),
                pageId: !numberHelper.isInt(pageId)
            }
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
        }
        else {

            db.page.getPageInfo(pageId, function (res) {
                if (res.errorCode == 0) {
                    var pageInfo = res.data;
                    //console.log(pageInfo);
                    //try {
                    if (res.data && res.data.admins) {
                        pageMembers = res.data.admins.map(Number);

                    }

                    pageMembers = pageMembers.filter(function (item) {
                        return item !== userIdGuest
                    });

                    //}
                    //catch (ex) {

                    //}
                    //console.log(pageMembers);
                    db.room.getPageRoom(userIdGuest, pageMembers, pageId, pageName, pageLink, pageImage, userId, function (result) {
                        if (result.errorCode == resultHelper.errorCodes.successNew) {
                            result.errorCode = resultHelper.errorCodes.success;

                            //chưa cần tạo log action vì chat riêng page ko cần (khi nào tạo nhóm chat custom mới cần tạo log)
                            //var roomInfo = result.data;
                            //var members = [];
                            //roomInfo.members.forEach(function (x) {
                            //    members.push(x.userId);
                            //});
                            //db.roomLog.addRoomLogAction(roomInfo._id, userId, db.roomLog.actionType.createRoom, members, function (res) {
                            //    if (res.errorCode == resultHelper.errorCodes.success) {
                            //        emitRoomMemberEvent(eventName.newMessage, res, roomInfo.members);
                            //    }
                            //});
                            result.data.members = common.recentRoom.setRoomMemberStatus(result.data.members);
                        }
                        if (typeof callback === 'function') {
                            callback(result);
                        }
                    });
                }
            });
        }
    });



    //lấy room bằng Id
    socket.on(eventName.getChatRoom, function (data, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;
        if (roomId) {

            db.room.getRoomById(roomId, userId, function (result) {
                if (result.errorCode == 0) {
                    result.data.members = common.recentRoom.setRoomMemberStatus(result.data.members);
                }
                if (typeof callback === 'function') {
                    callback(result);
                }
            });
        }
        else {
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError({ roomId: true }));
            }
        }
    });

    //-------------------------------------------------------------
    //room tự tạo (27/11/2017)
    socket.on(eventName.createChatRoom, function (data, callback) {
        var userId = socket.userId;
        var roomName = data.roomName;
        var roomAvatar = data.roomAvatar;
        var members = data.members;
        if (members && members.length == 0) {
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError({
                    members: true
                }));
            }
        }
        else if (members.length == 1) {
            db.user.getUserInfo(members[0].userId, false, function (res) {
                if (res.errorCode == 0) {
                    db.room.getPrivateRoom(userId, members[0].userId, userId, function (result) {

                        if (result.errorCode == resultHelper.errorCodes.successNew) {
                            result.errorCode = resultHelper.errorCodes.success;

                            //chưa cần tạo log action vì chat riêng ko cần
                            //var roomInfo = result.data;
                            //var members = [];
                            //roomInfo.members.forEach(function (x) {
                            //    members.push(x.userId);
                            //});
                            //db.roomLog.addRoomLogAction(roomInfo._id, userId1, db.roomLog.actionType.createRoom, members, function (res) {
                            //    if (res.errorCode == resultHelper.errorCodes.success) {
                            //        emitRoomMemberEvent(eventName.newMessage, res, roomInfo.members);
                            //    }
                            //});
                            result.data.members = common.recentRoom.setRoomMemberStatus(result.data.members);
                        }
                        if (typeof callback === 'function') {
                            callback(result);
                        }
                    });
                }
                else {
                    if (typeof callback === 'function') {
                        callback(res);
                    }
                }
            });
        }
        else {
            if (typeof members !== "string") {
                console.log('create custom chat', members);
                db.room.createCustomChat(userId, members, roomName, roomAvatar, function (result) {
                    if (typeof callback === 'function') {
                        callback(result);
                    }
                    if (result.errorCode == 0) {
                        var roomInfo = result.data;
                        var roomId = roomInfo._id;
                        var content = {
                            userId: userId,
                            userName: _.find(roomInfo.members, { userId: userId }).userInfo.name
                        };
                        var actionContent = db.roomLog.actionTypeMessage(db.roomLog.actionType.createRoom, content);
                        common.messageEvent.messageSendExecute(roomId, userId, db.roomLog.messageType.action, actionContent, "");

                        //add notify
                        common.userEvent.tryGetUserInfo(userId, (userInfo) => {
                            var userIds = _.map(members, (member) => {
                                return member.userId;
                            });

                            common.notify.notifyRoomMemberAction(userId, userInfo, roomId, userIds, false);
                        });
                    }
                });
            }
            else {
                if (typeof callback === 'function') {
                    callback(resultHelper.returnResultParameterError({ members: true }));
                }
            }
        }
    });

    socket.on(eventName.updateGroup, function (data, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;
        var roomName = data.roomName;
        var description = data.description;
        var isPrivate = data.isPrivate;
        var joinLink = data.joinLink;
        var onlyAdminAddUser = data.onlyAdminAddUser;

        db.room.updateGroup(userId, roomId, isPrivate, roomName, description, joinLink, onlyAdminAddUser, function (result) {
            if (typeof callback === 'function') {
                callback(result);
            }
            if (result.errorCode == 0) {
                var oldItem = result.data;
                db.user.getUserInfo(userId, false, function (res) {
                    var userInfo = res.data;
                    if (oldItem.roomName != roomName) {
                        var content = {
                            userId: userId,
                            userName: userInfo.name,
                            roomName: roomName
                        }
                        var actionType = db.roomLog.actionType.renameRoom;
                        var actionContent = db.roomLog.actionTypeMessage(actionType, content);
                        common.messageEvent.messageSendExecute(roomId, userId, db.roomLog.messageType.action, actionContent, "");
                    }

                    var res = result;
                    res.data.roomName = roomName;
                    res.data.description = description;
                    res.data.isPrivate = isPrivate;
                    res.data.joinLink = joinLink;
                    res.data.onlyAdminAddUser = onlyAdminAddUser;
                    var roomInfo = res.data;
                    var roomMembers = roomInfo.members;
                    common.messageEvent.emitRoomMemberEvent(eventName.changeGroupInfo, res, roomMembers);
                });
            }
        });
    });

    socket.on(eventName.updateChannel, function (data, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;
        var roomName = data.roomName;
        var description = data.description;
        var isPrivate = data.isPrivate;
        var joinLink = data.joinLink;
        var signMessage = data.signMessage;

        db.room.updateChannel(userId, roomId, isPrivate, roomName, description, joinLink, signMessage, function (result) {
            if (typeof callback === 'function') {
                callback(result);
            }
            if (result.errorCode == 0) {
                var oldItem = result.data;
                db.user.getUserInfo(userId, false, function (res) {
                    var userInfo = res.data;
                    if (oldItem.roomName != roomName) {
                        var content = {
                            userId: userId,
                            userName: userInfo.name,
                            roomName: roomName
                        }
                        var actionType = db.roomLog.actionType.renameChannel;
                        var actionContent = db.roomLog.actionTypeMessage(actionType, content);
                        common.messageEvent.messageSendExecute(roomId, userId, db.roomLog.messageType.action, actionContent, "");
                    }

                    //if (description && oldItem.description != description) {
                    //    var content = {
                    //        userId: userId,
                    //        userName: userInfo.name,
                    //        roomName: roomName,
                    //        description: description
                    //    }
                    //    var actionType = db.roomLog.actionType.changeChannelDescription;                                
                    //    var actionContent = db.roomLog.actionTypeMessage(actionType, content);
                    //    messageSendExecute(roomId, userId, db.roomLog.messageType.action, actionContent, "");
                    //}

                    //if (oldItem.joinLink != joinLink) {
                    //    var content = {
                    //        userId: userId,
                    //        userName: userInfo.name,
                    //        joinLink: joinLink,
                    //    };
                    //    var actionContent = db.roomLog.actionTypeMessage(db.roomLog.actionType.changeJoinLink, content);
                    //    messageSendExecute(roomId, userId, db.roomLog.messageType.action, actionContent, "");
                    //}

                    var res = result;
                    res.data.roomName = roomName;
                    res.data.description = description;
                    res.data.isPrivate = isPrivate;
                    res.data.joinLink = joinLink;
                    res.data.signMessage = signMessage;
                    var roomInfo = res.data;
                    var roomMembers = roomInfo.members;
                    //console.log(res);
                    common.messageEvent.emitRoomMemberEvent(eventName.changeChannelInfo, res, roomMembers);
                });
            }
        });
    });

    function renameChatRoom(data, roomType, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;
        var roomName = data.roomName;
        if (roomId && roomName) {

            db.room.renameChatRoom(userId, roomId, roomName, function (result) {
                if (typeof callback === 'function') {
                    callback(result);
                }
                if (result.errorCode == 0) {
                    db.user.getUserInfo(userId,false, function (res) {
                        var userInfo = res.data;
                        var content = {
                            userId: userId,
                            userName: userInfo.name,
                            roomName: roomName
                        }
                        var actionType = db.roomLog.actionType.renameRoom;
                        if (roomType == db.room.roomType.channel) {
                            actionType = db.roomLog.actionType.renameChannel;
                        }
                        var actionContent = db.roomLog.actionTypeMessage(actionType, content);
                        common.messageEvent.messageSendExecute(roomId, userId, db.roomLog.messageType.action, actionContent, "");
                    });
                }
            });
        }
        else {
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError({
                    roomId: roomId ? false : true
                }));
            }
        }
    }

    socket.on(eventName.renameChatRoom, function (data, callback) {
        renameChatRoom(data, db.room.roomType.custom, function (result) {
            if (typeof callback === 'function') {
                callback(result);
            }
        });
    });

    function changeAvatarChatRoom(data, roomType, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;
        var roomAvatar = data.roomAvatar;
        if (roomId && roomAvatar) {
            roomAvatar = azure.azureStorageUrl + roomAvatar;
            db.room.changeAvatarChatRoom(userId, roomId, roomAvatar, function (result) {
                if (typeof callback === 'function') {
                    callback(result);
                }
                if (result.errorCode == 0) {
                    db.user.getUserInfo(userId,false, function (res) {
                        var userInfo = res.data;
                        var content = {
                            userId: userId,
                            userName: userInfo.name,
                            roomAvatar: roomAvatar
                        }
                        var actionType = db.roomLog.actionType.changeAvatarRoom;
                        if (roomType == db.room.roomType.channel) {
                            actionType = db.roomLog.actionType.changeChannelAvatar;
                        }
                        var actionContent = db.roomLog.actionTypeMessage(actionType, content);
                        common.messageEvent.messageSendExecute(roomId, userId, db.roomLog.messageType.action, actionContent, "");
                    });
                }
            });
        }
        else {
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError({
                    roomId: roomId ? false : true,
                    roomAvatar: roomAvatar ? false : true
                }));
            }
        }
    }

    socket.on(eventName.changeAvatarChatRoom, function (data, callback) {
        changeAvatarChatRoom(data, db.room.roomType.custom, function (result) {
            if (typeof callback === 'function') {
                callback(result);
            }
        });
    });

    function changeChatRoomDescription(data, roomType, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;
        var description = data.description;
        if (roomId) {

            db.room.changeChatRoomDescription(userId, roomId, roomAvatar, function (result) {
                if (typeof callback === 'function') {
                    callback(result);
                }
                if (result.errorCode == 0) {
                    db.user.getUserInfo(userId,false, function (res) {
                        var userInfo = res.data;
                        var content = {
                            userId: userId,
                            userName: userInfo.name,
                            roomAvatar: roomAvatar
                        }
                        var actionType = db.roomLog.actionType.changeRoomDescription;
                        if (roomType == db.room.roomType.channel) {
                            actionType = db.roomLog.actionType.changeChannelDescription;
                        }
                        var actionContent = db.roomLog.actionTypeMessage(actionType, content);
                        common.messageEvent.messageSendExecute(roomId, userId, db.roomLog.messageType.action, actionContent, "");
                    });
                }
            });
        }
        else {
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError({
                    roomId: roomId ? false : true
                }));
            }
        }
    }

    socket.on(eventName.changeChatRoomDescription, function (data, callback) {
        changeChatRoomDescription(data, db.room.roomType.custom, function (result) {
            if (typeof callback === 'function') {
                callback(result);
            }
        });
    });

    socket.on(eventName.addRoomMember, function (data, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;
        var memberInfo = data.memberInfo;
        if (roomId && memberInfo) {

            db.room.addChatRoomMember(userId, roomId, memberInfo, function (result) {
                if (typeof callback === 'function') {
                    callback(result);
                }
                if (result.errorCode == 0) {
                    db.user.getUserInfo(userId,false, function (res) {
                        var userInfo = res.data;
                        var content = {
                            userId: userId,
                            userName: userInfo.name,
                            memberInfo: memberInfo
                        }
                        var actionContent = db.roomLog.actionTypeMessage(db.roomLog.actionType.addMember, content);
                        common.messageEvent.messageSendExecute(roomId, userId, db.roomLog.messageType.action, actionContent, "");

                        //add notify                                

                        var userIds = [memberInfo.userId];
                        common.notify.notifyRoomMemberAction(userId, userInfo, roomId, userIds, false);

                    });
                }
            });
        }
        else {
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError({
                    roomId: roomId ? false : true
                }));
            }
        }
    });

    function removeRoomMember(data, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;
        var memberInfo = data.memberInfo;
        if (roomId && memberInfo) {

            db.user.getUserInfo(userId,false, function (res) {
                var userInfo = res.data;
                var content = {
                    userId: userId,
                    userName: userInfo.name,
                    memberInfo: memberInfo
                }
                var actionContent = db.roomLog.actionTypeMessage(db.roomLog.actionType.removeMember, content);
                common.messageEvent.messageSendExecute(roomId, userId, db.roomLog.messageType.action, actionContent, "", function (resX) {

                    db.room.removeChatRoomMember(userId, roomId, memberInfo, function (result) {
                        if (typeof callback === 'function') {
                            callback(result);
                        }
                        if (result.errorCode == 0) {

                            if (userId != memberInfo.userId) {
                                //add notify
                                var userIds = [memberInfo.userId];
                                common.notify.notifyRoomMemberAction(userId, userInfo, roomId, userIds, true);
                            }
                        }
                    });
                });
            });
        }
        else {
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError({
                    roomId: roomId ? false : true
                }));
            }
        }
    }

    socket.on(eventName.removeRoomMember, function (data, callback) {
        removeRoomMember(data, function (result) {
            if (typeof callback === 'function') {
                callback(result);
            }
        });
    });

    //--------------------------------------------------------        
    //thao tác trên room
    socket.on(eventName.archiveChatRoom, function (data, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;
        db.room.setRoomArchive(userId, roomId, true, function (result) {
            if (typeof callback === 'function') {
                callback(result);
            }
        });
    });

    socket.on(eventName.unarchiveChatRoom, function (data, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;
        db.room.setRoomArchive(userId, roomId, false, function (result) {
            if (typeof callback === 'function') {
                callback(result);
            }
        });
    });

    //socket.on('leaveChatRoom', function (data, callback) {
    //});

    socket.on(eventName.muteChatRoom, function (data, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;
        db.room.setRoomMute(userId, roomId, true, function (result) {
            if (typeof callback === 'function') {
                callback(result);
            }
        });
    });

    socket.on(eventName.unmuteChatRoom, function (data, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;
        db.room.setRoomMute(userId, roomId, false, function (result) {
            if (typeof callback === 'function') {
                callback(result);
            }
        });
    });
            //--------------------------------------------------------

    //update group
    function removeMemberOnlyId(actionUserId, userId, roomId) {
        db.user.getUserInfo(userId,false, function (result) {
            if (result.errorCode == 0) {
                var memberInfo = result.data;
                memberInfo.userId = memberInfo._id;
                var removeData = {
                    roomId: roomId,
                    memberInfo: memberInfo
                };
                removeRoomMember(removeData, function (res) {
                    //console.log('removeMemberOnlyId');
                    //console.log(res);
                });
            }
        });
    }

    socket.on(eventName.getRoomBannedUser, function (data, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;
        if (typeof callback === 'function') {
            if (roomId) {
                db.room.getRoomBannedUser(roomId, function (result) {
                    callback(result);
                });
            }
            else {
                callback(resultHelper.returnResultParameterError({
                    roomId: !roomId ? false : true
                }));
            }
        }
    });

    socket.on(eventName.setBanUser, function (data, callback) {
        var actionUserId = socket.userId;
        var userId = data.userId;
        var roomId = data.roomId;
        var isBanned = data.isBanned;



        if (userId && roomId) {
            db.room.setBanUser(actionUserId, userId, roomId, isBanned, function (result) {
                if (typeof callback === 'function') {
                    callback(result);
                }
                if (result.errorCode == 0) {
                    if (isBanned) {
                        //gỡ khỏi room
                        //console.log('gỡ khỏi room');
                        removeMemberOnlyId(actionUserId, userId, roomId);

                        var roomMembers = [];
                        roomMembers.push({ userId: userId });

                        common.userEvent.tryGetRoomInfo(userId, roomId, null, function (roomInfo) {

                            var res = {
                                roomId: roomId,
                                actionUserId: actionUserId,
                                isBanned: isBanned,
                                roomInfo: roomInfo
                            };

                            common.messageEvent.emitRoomMemberEvent(eventName.getBanned, resultHelper.returnResultSuccess(res), roomMembers);

                            var content = {
                                userId: userId,
                                userName: _.find(roomInfo.members, { userId: userId }).userInfo.name
                            };
                            var actionContent = db.roomLog.actionTypeMessage(db.roomLog.actionType.getBanned, content);

                            common.notify.notifyToUser(userId, roomId, actionContent, roomInfo);
                        });
                    }
                }
            });
        }
    });

    socket.on(eventName.setRestrictUser, function (data, callback) {
        var actionUserId = socket.userId;
        var userId = data.userId;
        var roomId = data.roomId;
        var isRestricted = data.isRestricted;
        var restrictActions = data.restrictActions;
        var restrictUntil = data.restrictUntil;

        if (userId && roomId) {
            db.room.setRestrictUser(actionUserId, userId, roomId, isRestricted, restrictActions, restrictUntil, function (result) {
                if (typeof callback === 'function') {
                    callback(result);
                }
                if (result.errorCode == 0) {
                    if (isRestricted) {
                        var roomMembers = [];
                        roomMembers.push({ userId: userId });

                        common.userEvent.tryGetRoomInfo(userId, roomId, null, function (roomInfo) {

                            var res = {
                                roomId: roomId,
                                actionUserId: actionUserId,
                                isRestricted: isRestricted,
                                restrictActions: restrictActions,
                                restrictUntil: restrictUntil,
                                roomInfo: roomInfo
                            };

                            common.messageEvent.emitRoomMemberEvent(eventName.getRestricted, resultHelper.returnResultSuccess(res), roomMembers);

                            var content = {
                                userId: userId,
                                userName: _.find(roomInfo.members, { userId: userId }).userInfo.name,
                                isRestricted: isRestricted,
                                restrictActions: restrictActions,
                                restrictUntil: restrictUntil
                            };
                            var actionContent = db.roomLog.actionTypeMessage(db.roomLog.actionType.getRestricted, content);

                            common.notify.notifyToUser(userId, roomId, actionContent, roomInfo);
                        });
                    }
                }
            });
        }
    });

    //channel
    socket.on(eventName.createChannel, function (data, callback) {
        var userId = socket.userId;
        var roomName = data.roomName;
        var roomAvatar = data.roomAvatar;
        var description = data.description;
        var members = data.members;
        var isPrivate = data.isPrivate;
        var joinLink = data.joinLink;
        var signMessage = data.signMessage;

        if (signMessage == undefined || signMessage == null) {
            signMessage = false;
        }

        if (isPrivate == null || isPrivate == undefined) {
            isPrivate = true;
        }
        //console.log('0', joinLink);
        if (!joinLink && isPrivate == true) {
            joinLink = db.room.generateChannelPrivateJoinLink();
        }
        //console.log('1', joinLink);
        if (!roomName) {
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError({
                    roomName: !roomName ? false : true
                }));
            }
        }
        else {
            db.room.createChannel(userId, members, isPrivate, roomName, roomAvatar, description, joinLink, signMessage, function (result) {
                if (typeof callback === 'function') {
                    callback(result);
                }
                if (result.errorCode == 0) {
                    var roomInfo = result.data;
                    var roomId = roomInfo._id;
                    var content = {
                        userId: userId,
                        userName: _.find(roomInfo.members, { userId: userId }).userInfo.name
                    };
                    var actionContent = db.roomLog.actionTypeMessage(db.roomLog.actionType.createChannel, content);
                    common.messageEvent.messageSendExecute(roomId, userId, db.roomLog.messageType.action, actionContent, "");
                }
            });
        }
    });

    socket.on(eventName.renameChannel, function (data, callback) {
        renameChatRoom(data, db.room.roomType.channel, function (result) {
            if (typeof callback === 'function') {
                callback(result);
            }
        });
    });

    socket.on(eventName.changeChannelAvatar, function (data, callback) {
        changeAvatarChatRoom(data, db.room.roomType.channel, function (result) {
            if (typeof callback === 'function') {
                callback(result);
            }
        });
    });

    socket.on(eventName.changeChannelDescription, function (data, callback) {
        changeChatRoomDescription(data, db.room.roomType.channel, function (result) {
            if (typeof callback === 'function') {
                callback(result);
            }
        });

    });

    socket.on(eventName.generatePrivateJoinLink, function (data, callback) {
        if (typeof callback === 'function') {
            callback(resultHelper.returnResultSuccess(db.room.generateChannelPrivateJoinLink()));
        }
    });

    socket.on(eventName.revokePrivateJoinLink, function (data, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;
        if (roomId) {
            var joinLink = db.room.generateChannelPrivateJoinLinkSuffix();
            db.room.changeJoinLink(userId, roomId, joinLink, function (result) {
                if (result.errorCode == 0) {
                    result.data = db.room.generateChannelPrivateJoinLink(result.data);
                }
                if (typeof callback === 'function') {
                    callback(result);
                }
                //sự kiện realtime cho group
                if (result.errorCode == 0) {
                    var roomInfo = result.data;
                    //var roomId = roomInfo._id;
                    //var content = {
                    //    userId: userId,
                    //    userName: _.find(roomInfo.members, { userId: userId }).userInfo.name,
                    //    joinLink: joinLink,
                    //};
                    //var actionContent = db.roomLog.actionTypeMessage(db.roomLog.actionType.changeJoinLink, content);
                    //messageSendExecute(roomId, userId, db.roomLog.messageType.action, actionContent, "");
                }
            });
        }
    });

    socket.on(eventName.changePublicJoinLink, function (data, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;
        var joinLink = data.joinLink;
        db.room.changeJoinLink(userId, roomId, joinLink, function (result) {
            if (typeof callback === 'function') {
                callback(result);
            }
            //sự kiện realtime cho group
            if (result.errorCode == 0) {
                //var roomInfo = result.data;
                //var roomId = roomInfo._id;
                //var content = {
                //    userId: userId,
                //    userName: _.find(roomInfo.members, { userId: userId }).userInfo.name,
                //    joinLink: joinLink,
                //};
                //var actionContent = db.roomLog.actionTypeMessage(db.roomLog.actionType.changeJoinLink, content);
                //messageSendExecute(roomId, userId, db.roomLog.messageType.action, actionContent, "");
            }
        });
    });

    socket.on(eventName.checkJoinLinkAvaiable, function (data, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;
        var joinLink = data.joinLink;
        if (typeof callback === 'function') {
            db.room.checkJoinLinkAvaiable(userId, roomId, joinLink, function (result) {
                callback(result);
            });
        }
    });

    socket.on(eventName.addChannelMember, function (data, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;
        var memberInfo = data.memberInfo;
        if (roomId && memberInfo) {

            db.room.addChannelMember(userId, roomId, memberInfo, function (result) {
                if (typeof callback === 'function') {
                    callback(result);
                }
                if (result.errorCode == 0) {
                    db.user.getUserInfo(userId,false, function (res) {
                        var userInfo = res.data;
                        var content = {
                            userId: userId,
                            userName: userInfo.name,
                            memberInfo: memberInfo
                        }
                        var actionContent = db.roomLog.actionTypeMessage(db.roomLog.actionType.addMember, content);
                        common.messageEvent.messageSendExecute(roomId, userId, db.roomLog.messageType.action, actionContent, "");
                    });
                }
            });
        }
        else {
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError({
                    roomId: roomId ? false : true
                }));
            }
        }
    });

    socket.on(eventName.removeChannelMember, function (data, callback) {
        removeRoomMember(data, function (result) {
            if (typeof callback === 'function') {
                callback(result);
            }
        });
    });
    function joinRoom(data, roomType, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;
        var memberInfo = socketMap[userId].UserInfo;
        if (!memberInfo.userId) {
            memberInfo.userId = memberInfo._id;
        }
        //console.log(memberInfo);
        if (roomId && memberInfo) {
            db.room.addChannelMember(userId, roomId, memberInfo, function (result) {
                if (typeof callback === 'function') {
                    callback(result);
                }
                if (result.errorCode == 0) {
                    db.user.getUserInfo(userId,false, function (res) {
                        var userInfo = res.data;
                        var content = {
                            userId: userId,
                            userName: userInfo.name,
                            memberInfo: memberInfo
                        }
                        var actionType = db.roomLog.actionType.joinRoom;
                        if (roomType == db.room.roomType.channel) {
                            actionType = db.roomLog.actionType.joinChannel;
                        }
                        var actionContent = db.roomLog.actionTypeMessage(actionType, content);
                        common.messageEvent.messageSendExecute(roomId, userId, db.roomLog.messageType.action, actionContent, "");
                    });
                }
            });
        }
        else {
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError({
                    roomId: roomId ? false : true
                }));
            }
        }
    }
    socket.on(eventName.joinChannel, function (data, callback) {
        joinRoom(data, db.room.roomType.channel, function (result) {
            if (typeof callback === 'function') {
                callback(result);
            }
        });
    });

    socket.on(eventName.joinRoom, function (data, callback) {
        joinRoom(data, db.room.roomType.custom, function (result) {
            if (typeof callback === 'function') {
                callback(result);
            }
        });
    });

    function leaveRoom(data, roomType, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;
        var memberInfo = socketMap[userId].UserInfo;
        if (roomId && memberInfo) {

            db.user.getUserInfo(userId,false, function (res) {
                var userInfo = res.data;
                var content = {
                    userId: userId,
                    userName: userInfo.name,
                    memberInfo: memberInfo
                }
                var actionType = db.roomLog.actionType.leaveRoom;
                if (roomType == db.room.roomType.channel) {
                    actionType = db.roomLog.actionType.leaveChannel;
                }
                var actionContent = db.roomLog.actionTypeMessage(actionType, content);
                common.messageEvent.messageSendExecute(roomId, userId, db.roomLog.messageType.action, actionContent, "", function (resX) {

                    db.room.removeChatRoomMember(userId, roomId, memberInfo, function (result) {
                        if (typeof callback === 'function') {
                            callback(result);
                        }
                        if (result.errorCode == 0) {
                        }
                    });
                });
            });
        }
        else {
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError({
                    roomId: roomId ? false : true
                }));
            }
        }
    }

    socket.on(eventName.leaveRoom, function (data, callback) {
        leaveRoom(data, db.room.roomType.custom, function (result) {
            if (typeof callback === 'function') {
                callback(result);
            }
        });
    });

    socket.on(eventName.leaveChannel, function (data, callback) {
        leaveRoom(data, db.room.roomType.channel, function (result) {
            if (typeof callback === 'function') {
                callback(result);
            }
        });
    });

    function setAdmin(data, callback) {
        var actionUserId = socket.userId;
        var roomId = data.roomId;
        var userId = data.userId;
        var permissions = data.permissions;
        db.room.setAdmin(actionUserId, userId, roomId, permissions, function (result) {
            if (typeof callback === 'function') {
                callback(result);
            }
            //chưa có sự kiện realtime cho group
            if (result.errorCode == 0) {
                var roomMembers = [];
                roomMembers.push({ userId: userId });

                common.userEvent.tryGetRoomInfo(userId, roomId, null, function (roomInfo) {

                    var res = {
                        roomId: roomId,
                        actionUserId: actionUserId,
                        isAdmin: true,
                        permissions: permissions,
                        roomInfo: roomInfo
                    };

                    common.messageEvent.emitRoomMemberEvent(eventName.permissionChange, resultHelper.returnResultSuccess(res), roomMembers);

                    var content = {
                        actionUserId: actionUserId,
                        actionUserName: _.find(roomInfo.members, { userId: actionUserId }).userInfo.name,
                        userId: userId,
                        userName: _.find(roomInfo.members, { userId: userId }).userInfo.name,

                    };
                    var actionContent = db.roomLog.actionTypeMessage(db.roomLog.actionType.changeAdminPermission, content);

                    common.notify.notifyToUser(userId, roomId, actionContent, roomInfo);
                });
            }
        });
    }
    //update Group admin
    socket.on(eventName.setGroupAdmin, function (data, callback) {
        setAdmin(data, function (result) {
            if (typeof callback === 'function') {
                callback(result);
            }
        });
    });

    socket.on(eventName.setChannelAdmin, function (data, callback) {
        setAdmin(data, function (result) {
            if (typeof callback === 'function') {
                callback(result);
            }
        });
    });

    function removeAdmin(data, roomType, callback) {
        var actionUserId = socket.userId;
        var roomId = data.roomId;
        var userId = data.userId;

        db.room.removeAdmin(actionUserId, userId, roomId, roomType, function (result) {
            if (typeof callback === 'function') {
                callback(result);
            }
            //chưa có sự kiện realtime cho group
            if (result.errorCode == 0) {
                var roomMembers = [];
                roomMembers.push({ userId: userId });

                common.userEvent.tryGetRoomInfo(userId, roomId, null, function (roomInfo) {

                    var res = {
                        roomId: roomId,
                        actionUserId: actionUserId,
                        isAdmin: false,
                        permissions: [],
                        roomInfo: roomInfo
                    };

                    common.messageEvent.emitRoomMemberEvent(eventName.permissionChange, resultHelper.returnResultSuccess(res), roomMembers);

                    var content = {
                        userId: userId,
                        userName: _.find(roomInfo.members, { userId: userId }).userInfo.name
                    };
                    var actionContent = db.roomLog.actionTypeMessage(db.roomLog.actionType.changeAdminPermission, content);

                    common.notify.notifyToUser(userId, roomId, actionContent, roomInfo);
                });
            }
        });
    }

    socket.on(eventName.removeGroupAdmin, function (data, callback) {
        removeAdmin(data, db.room.roomType.custom, function (result) {
            if (typeof callback === 'function') {
                callback(result);
            }
        });
    });

    socket.on(eventName.removeChannelAdmin, function (data, callback) {
        removeAdmin(data, db.room.roomType.channel, function (result) {
            if (typeof callback === 'function') {
                callback(result);
            }
        });
    });

    socket.on(eventName.getRoomFromJoinLink, function (data, callback) {
        var userId = socket.userId;
        if (!userId) {
            userId = 0;
        }

        var joinLink = data.joinLink;
        db.room.getRoomFromJoinLink(joinLink, userId, function (result) {
            if (typeof callback === 'function') {
                callback(result);
            }
        });
    });

    //channel admin
    socket.on(eventName.getChannelAdminRoom, function (data, callback) {
        var userId = socket.userId;

        var userIdGuest = data.userIdGuest;
        //var channelAdmins = data.channelAdmins;
        var channelId = data.channelId;

        //if (userId) {
        //    userId = parseInt(userId);
        //}

        //if (userIdGuest) {
        //    userIdGuest = parseInt(userIdGuest);
        //}

        if (/*!numberHelper.isInt(userId) || !numberHelper.isInt(userIdGuest) ||*/ !channelId) {
            var paraError = {
                //userId: !numberHelper.isInt(userId),
                //userIdGuest: !numberHelper.isInt(userIdGuest),
                channelId: !channelId
            }
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
        }
        else {
            db.room.getRoomByIdNotCheckMember(channelId, userId, (res) => {
                if (res.errorCode == errorCodes.success) {
                    var channelInfo = res.data;
                    //console.log(channelInfo);
                    var channelAdmins = _.map(_.filter(channelInfo.members, (member) => {
                        return member.isAdmin == true;
                    }), (item) => {
                        return item.userId;
                    });
                    //console.log(channelAdmins);
                    var now = dateHelper.getUTCNow();
                    //console.log('channelInfo');
                    //console.log(channelInfo);
                    db.room.getChannelAdminRoom(userIdGuest, channelAdmins, channelId, channelInfo.roomName, channelInfo.roomAvatar, userId, (result) => {
                        //console.log(result);
                        if (result.errorCode == errorCodes.success) {
                            var roomInfo = result.data;
                            var roomId = roomInfo._id;
                            var createDate = roomInfo.createDate;
                            //mới tạo thì now trước createDate
                            //console.log(now, createDate);
                            if (moment(now).diff(moment(createDate)) <= 0) {

                                //chèn message vào
                                var type = db.roomLog.messageType.text;
                                var text = 'Chat riêng từ kênh ' + channelInfo.roomName;
                                var content = db.roomLog.textTypeMessage('text', text);
                                var itemGUID = 'xxx';
                                //console.log(content);
                                common.messageEvent.messageSendExecute(roomId, userId, type, content, itemGUID, callback);
                            }
                        }
                        if (typeof callback === 'function') {
                            callback(result);
                        }
                    });
                }
                else {
                    if (typeof callback === 'function') {
                        callback(resultHelper.returnResultNotExists("Channel không tồn tại"));
                    }
                }
            });
        }
    });
}