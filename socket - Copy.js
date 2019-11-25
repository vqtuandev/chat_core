var _ = require('lodash');
var db = require('./models/all.js');
var mbn = require('./services/mbn.js');
var azure = require('./services/azure.js');
var oneSignal = require('./services/oneSignal.js');

var resultHelper = require('./utility/resultHelper.js');
var imageHelper = require('./utility/imageHelper.js');
var numberHelper = require('./utility/numberHelper.js');
var textHelper = require('./utility/textHelper.js');

var itemCount = 50;
var roomLogCount = 100;
var socketMap = {};
var currentSocketCount = 0;

var eventName = {
    //connection
    connection: 'connection',
    disconnect: 'disconnect',

    //emit
    connectSuccess: 'connectSuccess',
    connectFail: 'connectFail',
    userConnected: 'userConnected',
    userDisconnected: 'userDisconnected',
    onlineUsers: 'onlineUsers',
    ///////////////////
    recentChatRoom: 'recentChatRoom',
    recentPinChatRoom: 'recentPinChatRoom',
    ///////////////////
    contactList: 'contactList',
    ///////////////////
    newMessage: 'newMessage',
    updateMessage: 'updateMessage',
    removeMessage: 'removeMessage',
    //////////////////
    logIsViewed: 'logIsViewed',
    addPinItem: 'addPinItem',
    removePinItem: 'removePinItem',
    //on
    ping: 'ping',
    updateOneSignalUserId: 'updateOneSignalUserId',
    removeOneSignalUserId: 'removeOneSignalUserId',
    ///////////////////
    addContact: 'addContact',
    //////////////////
    getUnreadRoomCount: 'getUnreadRoomCount',
    //////////////////
    pinRoom: 'pinRoom',
    unpinRoom: 'unpinRoom',
    getRecentPinChatRoom: 'getRecentPinChatRoom',
    ///////////////////
    getRecentChatRoom: 'getRecentChatRoom',
    ///////////////////
    getPrivateRoom: 'getPrivateRoom',
    getItemRoom: 'getItemRoom',
    getPageRoom: 'getPageRoom',
    getChatRoom: 'getChatRoom',
    //////////////////
    //group room
    createChatRoom: 'createChatRoom',
    renameChatRoom: 'renameChatRoom',
    changeAvatarChatRoom: 'changeAvatarChatRoom',

    addRoomMember: 'addRoomMember',
    removeRoomMember: 'removeRoomMember',
    //update 2018-02-08
    setGroupAdmin: 'setGroupAdmin',
    removeGroupAdmin: 'removeGroupAdmin',
    changeChatRoomDescription: 'changeChatRoomDescription',
    deleteChatRoom: 'deleteChatRoom',
    joinRoom: 'joinRoom',
    leaveRoom: 'leaveRoom',
    setBanUser: 'setBanUser',
    setRestrictUser: 'setRestrictUser',
    getBanned: 'getBanned',
    getRestricted: 'getRestricted',
    ///////////////////
    archiveChatRoom: 'archiveChatRoom',
    unarchiveChatRoom: 'unarchiveChatRoom',
    ///////////////////
    muteChatRoom: 'muteChatRoom',
    unmuteChatRoom: 'unmuteChatRoom',
    ///////////////////
    getRoomLogs: 'getRoomLogs',
    sendText: 'sendText',
    sendImage: 'sendImage',
    sendVideo: 'sendVideo',
    sendFile: 'sendFile',
    sendLink: 'sendLink',
    updateLink: 'updateLink',
    sendItem: 'sendItem',
    sendLocation: 'sendLocation',
    deleteMessage: 'deleteMessage',
    setLogIsView: 'setLogIsView',
    pinMessage: 'pinMessage',
    unpinMessage: 'unpinMessage',
    getPinLogs: 'getPinLogs',
    ///////////////////////////
    getRoomFiles: 'getRoomFiles',
    getRoomLinks: 'getRoomLinks',
    searchRoomLogs: 'searchRoomLogs',
    getRoomNearbyLogs: 'getRoomNearbyLogs',
    getRoomPreviousLogs: 'getRoomPreviousLogs',
    getRoomNextLogs: 'getRoomNextLogs',
    ///////////////////
    generateUploadSAS: 'generateUploadSAS',

    //channel - update 2018-02-08
    createChannel: 'createChannel',
    renameChannel: 'renameChannel',
    changeChannelAvatar: 'changeChannelAvatar',
    changeChannelDescription: 'changeChannelDescription',
    generatePrivateJoinLink: 'generatePrivateJoinLink',
    revokePrivateJoinLink: 'revokePrivateJoinLink',
    changePublicJoinLink: 'changePublicJoinLink',
    checkJoinLinkAvaiable: 'checkJoinLinkAvaiable',
    addChannelMember: 'addChannelMember',
    removeChannelMember: 'removeChannelMember',
    joinChannel: 'joinChannel',
    leaveChannel: 'leaveChannel',
    deleteChannel: 'deleteChannel',
    setChannelAdmin: 'setChannelAdmin',
    removeChannelAdmin: 'removeChannelAdmin',
    permissionChange: 'permissionChange',
    getRoomFromJoinLink: 'getRoomFromJoinLink',
    /////////////
    //for admin
    getCurrentOnlineUser: 'getCurrentOnlineUser',
    currentOnlineUser: 'currentOnlineUser',
    getOnlineUserByDate: 'getOnlineUserByDate',
    getUserOnlineCountPerDay: 'getUserOnlineCountPerDay',
    getUserOnlineCountPerMonth: 'getUserOnlineCountPerMonth',
    getItemRoomNotReply: 'getItemRoomNotReply',
    getPageRoomNotReply: 'getPageRoomNotReply',
    getUserByCreateDate: 'getUserByCreateDate',
    getUserStartChatByDay: 'getUserStartChatByDay',
    getUserStartChatByMonth: 'getUserStartChatByMonth',
    getTotalSummary: 'getTotalSummary'
};

function emitRecentChatRoom(socket, userId, lastLogDate, itemCount, keyword, callback) {
    if (keyword) {
        db.room.searchRecentChatRoom(userId, lastLogDate, itemCount, keyword, function (result) {
            if (typeof callback === 'function') {
                callback(result);
            }
            else {
                socket.emit(eventName.recentChatRoom, result);
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
}

function emitRecentPinChatRoom(socket, userId, lastLogDate, itemCount, callback) {
    db.room.getFavoriteRecentChatRoom(userId, lastLogDate, itemCount, function (result) {
        if (typeof callback === 'function') {
            callback(result);
        }
        else {
            socket.emit(eventName.recentPinChatRoom, result);
        }
    });
}

function emitContactList(socket, userInfo) {
    db.user.getUserInfoList(userInfo.contacts, function (result) {
        socket.emit(eventName.contactList, result);
    });
}

function emitRoomMemberEvent(eventName, result, roomMembers) {
    roomMembers.forEach(function (x) {
        if (!x.isArchived) {
            var res = result;
            if (eventName == eventName.newMessage || eventName == eventName.updateMessage) {
                res.data.roomInfo = db.room.parseRoomInfo(result.data.roomInfo, x.userId);
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
}

function emitUserEvent(eventName, result, userId) {
    if (socketMap[userId] != null) {
        var sockets = socketMap[userId].Sockets;
        if (sockets) {
            sockets.forEach(function (s) {
                s.emit(eventName, result);
            });
        }
    }
}

function emitOnlineUser(socket, userInfo) {
    var onlineList = [];
    var contacts = userInfo.contacts;
    if (contacts) {
        contacts.forEach(function (x) {
            if (socketMap[x]) {
                onlineList.push(x);
            }
        });
    }

    socket.emit(eventName.onlineUsers, resultHelper.returnResultSuccess({
        userIds: onlineList
    }));

    //tạm chưa có ds contact nên cứ broadcast ra hết vì chưa có giải pháp tối ưu cho việc báo online
    //for (var i = 0; i < onlineList.length; i++) {
    //    emitAContactOnline(onlineList[i], userInfo._id);
    //}

    socket.broadcast.emit(eventName.userConnected,
        resultHelper.returnResultSuccess({ userId: userInfo._id }));
}

function emitAContactOnline(userId, contactId) {
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
}

function emitIfConnectSuccess(socket, userInfo) {
    socket.emit(eventName.connectSuccess, resultHelper.returnResultSuccess(userInfo));
    //trả về danh sách chat gần đây
    emitRecentChatRoom(socket, userInfo._id, null, itemCount, '');
    //trả về danh sách favorite
    emitRecentPinChatRoom(socket, userInfo._id, null, itemCount);
    //trả về danh sách contact
    emitContactList(socket, userInfo);
    //trả về danh sách online
    emitOnlineUser(socket, userInfo);
}

function emitIfConnectFail(socket) {
    socket.emit(eventName.connectFail, resultHelper.returnResult(resultHelper.errorCodes.permission, 'Login info not valid', null));
}

function messageSendExecute(roomId, userId, type, content, itemGUID, callback) {

    db.room.getRoomById(roomId, userId, function (res) {
        if (res.errorCode == 0) {
            var roomInfo = res.data;
            var isSignMessage = roomInfo.signMessage ? true : false;
            var roomMembers = roomInfo.members;

            //kiểm tra quyền post message trong channel hoặc user có bị restrict hay ko
            var canPost = true;
            var memberInfo = roomMembers.find(function (val) {
                return val.userId = userId;
            });

            if (roomInfo.type == db.room.roomType.channel) {
                if (roomInfo.userIdOwner != userId && !memberInfo.isAdmin && !memberInfo.permissions.postMessage) {
                    canPost = false;
                }
            }

            if (memberInfo.isRestricted) {
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
                //todo: chưa nhúng tên room vào message gửi về
                if (type != db.roomLog.messageType.action) {
                    db.roomLog.addRoomLogs(roomId, userId, type, content, roomMemberIds, replied, function (result) {

                        if (result.errorCode == 0) {
                            result.data.roomInfo = roomInfo;
                            if (socketMap[userId]) {
                                result.data.authorInfo = socketMap[userId].UserInfo;
                                result.data.itemGUID = itemGUID;
                                if (callback) {
                                    callback(result);
                                }
                                emitRoomMemberEvent(eventName.newMessage, result, roomMembers);

                                //notify tới user
                                notifyToRoomMembers(userId, roomMembers, result);
                            }
                            else {
                                db.user.getUserInfo(userId, function (res) {
                                    result.data.authorInfo = res.data;
                                    result.data.itemGUID = itemGUID;
                                    if (callback) {
                                        callback(result);
                                    }
                                    emitRoomMemberEvent(eventName.newMessage, result, roomMembers);

                                    //notify tới user
                                    notifyToRoomMembers(userId, roomMembers, result);
                                });
                            }

                        }
                        else {
                            if (callback) {
                                callback(result);
                            }
                        }
                    }, isSignMessage);
                }
                else {
                    db.roomLog.addRoomLogAction(roomId, userId, content, roomMemberIds, function (result) {

                        if (result.errorCode == 0) {
                            result.data.roomInfo = roomInfo;
                            result.data.authorInfo = socketMap[userId].UserInfo;
                            result.data.itemGUID = itemGUID;
                            if (callback) {
                                callback(result);
                            }
                            emitRoomMemberEvent(eventName.newMessage, result, roomMembers);

                            //notify tới user
                            notifyToRoomMembers(userId, roomMembers, result);
                        }
                        else {
                            if (callback) {
                                callback(result);
                            }
                        }
                    });
                }
            }
            else {
                callback(resultHelper.returnResultPermission("Not have permission!"));
            }
        }
        else {
            if (callback) {
                callback(res);
            }
        }
    });
}
function parseActionMessageNotify(content) {
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
            message += content.data.userName + ' đã thay đổi quyền admin của bạn';
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
    }
    return message;
}
function parseMessageToNotify(log) {
    var message = '';

    var authorInfo = log.authorInfo;
    if (authorInfo) {
        switch (log.type) {
            case db.roomLog.messageType.text: {
                message = authorInfo.name + ': ' + log.content.content;
                break;
            }
            case db.roomLog.messageType.image:
            case db.roomLog.messageType.file: {
                message = authorInfo.name + ' đã gửi ' + log.content.name;
                break;
            }
            case db.roomLog.messageType.link: {
                message = authorInfo.name + ': ' + log.content.link;
                break;
            }
            case db.roomLog.messageType.location: {
                message = authorInfo.name + ' đã gửi vị trí';
                break;
            }
            case db.roomLog.messageType.action: {
                message = parseActionMessageNotify(log.content);
                break;
            }
            case db.roomLog.messageType.item: {
                message = authorInfo.name + ' đã gữi thông tin sản phẩm';
                break;
            }
            default: {
                message = authorInfo.name + ' đã gửi tin nhắn';
                break;
            }
        }
    }
    else {
        message = 'Có tin nhắn mới';
    }
    return message;
}

function tryGetUserInfo(userId, callback) {
    if (socketMap[userId]) {
        callback(socketMap[userId].UserInfo);
    }
    else {
        db.user.getUserInfo(userId, function (result) {
            if (result.errorCode == 0) {
                callback(result.data);
            }
            else {
                callback(null);
            }
        });
    }
}
function tryGetRoomInfo(userId, roomId, roomInfo, callback) {
    if (roomInfo) {
        callback(roomInfo);
    }
    else {
        db.room.getRoomById(roomId, userId, function (result) {
            if (result.errorCode == 0) {
                callback(result.data);
            }
            else {
                callback(null);
            }
        });
    }
}
function notifyActionToUser(userId, roomId, content, roomInfo) {
    var oneSignalUserIds = [];
    tryGetUserInfo(userId, function (userInfo) {
        if (userInfo.oneSignalUserIds) {
            userInfo.oneSignalUserIds.forEach(function (z) {
                oneSignalUserIds.push(z);
            });
            if (oneSignalUserIds.length > 0) {
                var message = parseActionMessageNotify(content);

                var data = {
                    roomId: roomId
                };
                tryGetRoomInfo(userId, roomId, roomInfo, function (room) {
                    var roomName = db.room.parseRoomName(room, userId);
                    var roomMembers = [{ userId: userId, userInfo: userInfo }];
                    oneSignal.sendNotify(roomName, message, data, oneSignalUserIds, roomId, roomMembers, function (result) {
                    });
                });
            }
        }
    });
}
function notifyToRoomMembers(userId, roomMembers, result) {
    var oneSignalUserIds = [];
    roomMembers.forEach(function (x) {
        if (x.userId != userId) {
            if (x.isMuted == false) {
                if (x.userInfo.oneSignalUserIds) {
                    x.userInfo.oneSignalUserIds.forEach(function (z) {
                        oneSignalUserIds.push(z);
                    });
                    if (oneSignalUserIds.length > 0) {
                        var log = result.data;

                        var message = parseMessageToNotify(log);

                        var data = {
                            roomId: log.roomId
                        };

                        var roomName = db.room.parseRoomName(log.roomInfo, x.userId);

                        oneSignal.sendNotify(roomName, message, data, oneSignalUserIds, log.roomId, roomMembers, function (result) {
                        });
                    }
                    oneSignalUserIds = [];
                }
            }
        }
    });
}

//thêm các member cùng room với nhau vào 1 list hệ thống của riêng từng user để lưu trữ ds contact ảo
//ko ổn vì ban đầu ko có thông tin gì cả, tạm dùng broadcast
function setRoomMemberToEachContactRoom(members) {
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
}
function setRoomMemberStatus(members) {
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
}

//lấy user đang online
function getCurrentOnlineUser() {
    var res = { total: 0, list: [] };
    for (var i in socketMap) {
        if (socketMap[i] != null) {
            res.total++;
            res.list.push(socketMap[i].UserInfo);
        }
    }
    return res;
}

function broadcastCurrentOnlineUser(io) {
    var data = getCurrentOnlineUser();
    io.emit(eventName.currentOnlineUser, resultHelper.returnResultSuccess(data));
}

//ghi thông tin user online
function updateUserOnline(userInfo, os) {
    db.report.updateOnlineLog(userInfo, os, function (result) {

    });
}

module.exports = function (io) {
    setInterval(function () { console.log('current socket count: ' + currentSocketCount); }, 30000);
    io.on(eventName.connection, function (socket) {
        console.log("A user connected hihi");
        //console.log(socket.handshake.query);
        var userId = socket.handshake.query.userId;
        var phone = socket.handshake.query.phone;
        var token = socket.handshake.query.token;
        var os = socket.handshake.query.os;

        currentSocketCount++;
        if (userId) {
            userId = parseInt(userId);

            //test zone 
            console.log('user ' + userId + ' exists');

            //kiểm tra xác thực user và add vào SocketMap
            var checkUserLoginOk = false;
            if (socketMap[userId]) {
                console.log('user ' + userId + ' reconnect');
                var userInfo = socketMap[userId].UserInfo;
                if (userId == userInfo._id
                    && phone == userInfo.phone) {

                    socket.userId = userId;
                    socket.os = os;
                    socketMap[userId].Sockets.push(socket);

                    checkUserLoginOk = true;
                    //thành công
                    emitIfConnectSuccess(socket, userInfo);
                }
            }

            if (!checkUserLoginOk) {
                console.log('call mbn get user');
                mbn.userDetail(userId, phone, token, function (result) {

                    if (result.errorCode == 0) {
                        console.log('user ' + userId + ' connect');
                        var user = result.data;

                        db.user.updateUser(user.id, user.name, user.phone_number, user.email, user.avatar_url, user.url, token, os, function (res) {
                            if (res.errorCode == 0) {
                                var userInfo = res.data;
                                if (socketMap[userId] == null || socketMap[userId] == undefined) {
                                    socketMap[userId] = { UserInfo: userInfo, Sockets: [] };
                                }
                                else {
                                    socketMap[userId].UserInfo = userInfo;
                                }
                                socket.userId = userId;
                                socket.os = os;
                                socketMap[userId].Sockets.push(socket);

                                //chỉ khi là user kết nối mới mới cần broadcast
                                //broadcast số lượng user online tới admin
                                broadcastCurrentOnlineUser(io);

                                //ghi thông tin user online vào
                                updateUserOnline(userInfo, os);

                                //thành công
                                emitIfConnectSuccess(socket, userInfo);
                            }
                            else {
                                //ko thành công
                                emitIfConnectFail(socket);
                            }
                        });
                    }
                    else {
                        //ko thành công
                        emitIfConnectFail(socket);
                    }
                });
            }

            //disconnect
            socket.on(eventName.disconnect, function (data) {
                currentSocketCount--;
                if (!socket.handshake.query) return;
                var userId = socket.handshake.query.userId;
                var os = socket.handshake.query.os;
                if (socketMap[userId]) {
                    var index = socketMap[userId].Sockets.indexOf(socket);
                    if (index != -1) {
                        socketMap[userId].Sockets.splice(index, 1);
                    }

                    console.log(userId + ' disconnect a socket');

                    setTimeout(function () {
                        if (socketMap[userId] != null && socketMap[userId].Sockets != null && socketMap[userId].Sockets.length == 0) {
                            var userInfo = socketMap[userId].UserInfo;
                            delete socketMap[userId];
                            console.log(userId + ' disconnected');
                            socket.broadcast.emit(eventName.userDisconnected, resultHelper.returnResultSuccess({ userId: userId }));

                            //disconnect hoàn toàn mới broadcast
                            //broadcast số lượng user online tới admin
                            broadcastCurrentOnlineUser(io);
                        }
                    }, 300000);
                }
            });

            //ping 
            socket.on(eventName.ping, function (data, callback) {
                callback(true);
            });

            //các sự kiện khác
            //cập nhật Onesignal UserId
            socket.on(eventName.updateOneSignalUserId, function (data, callback) {
                var userId = socket.userId;
                if (userId) {
                    userId = parseInt(userId);
                }

                if (!numberHelper.isInt(userId)) {
                    var paraError = {
                        userId: !numberHelper.isInt(userId)
                    };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
                else {
                    var oneSignalUserId = data.oneSignalUserId;
                    db.user.updateOneSignalUserId(userId, oneSignalUserId, function (result) {
                        callback(result);
                    });
                }
            });



            socket.on(eventName.removeOneSignalUserId, function (data, callback) {
                var userId = socket.userId;
                if (userId) {
                    userId = parseInt(userId);
                }

                if (!numberHelper.isInt(userId)) {
                    var paraError = {
                        userId: !numberHelper.isInt(userId)
                    };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
                else {
                    var oneSignalUserId = data.oneSignalUserId;
                    db.user.deleteOneSignalUserId(userId, oneSignalUserId, function (result) {
                        callback(result);
                    });
                }
            });

            socket.on(eventName.addContact, function (data, callback) {
                var userId = socket.userId;
                if (userId) {
                    userId = parseInt(userId);
                }

                var contactId = data.contactId;
                if (contactId) {
                    contactId = parseInt(contactId);
                }

                if (!numberHelper.isInt(userId) || !numberHelper.isInt(contactId)) {
                    var paraError = {
                        userId: !numberHelper.isInt(userId),
                        contactId: !numberHelper.isInt(contactId)
                    };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
                else {
                    db.user.addContact(userId, contactId, function (result) {
                        callback(result);
                    });
                }
            });


            //favorite room

            //thêm vào danh sách favorite
            socket.on(eventName.pinRoom, function (data, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;
                if (userId) {
                    userId = parseInt(userId);
                }

                if (numberHelper.isInt(userId) && roomId) {
                    db.room.setRoomFavorite(userId, roomId, true, function (result) {
                        callback(result);
                    });
                }
                else {
                    var paraError = {
                        userId: !numberHelper.isInt(userId),
                        roomId: roomId ? false : true
                    };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
            });

            //xóa khỏi danh sách favorite
            socket.on(eventName.unpinRoom, function (data, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;

                if (userId) {
                    userId = parseInt(userId);
                }

                if (numberHelper.isInt(userId) && roomId) {
                    db.room.setRoomFavorite(userId, roomId, false, function (result) {
                        callback(result);
                    });
                }
                else {
                    var paraError = {
                        userId: !numberHelper.isInt(userId),
                        roomId: roomId ? false : true
                    };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
            });

            ////////////////////////////////////////
            socket.on(eventName.getRecentChatRoom, function (data, callback) {
                var userId = socket.userId;
                if (userId) {
                    userId = parseInt(userId);
                }
                if (numberHelper.isInt(userId)) {
                    var lastLogDate = data.lastLogDate;
                    var keyword = data.keyword;
                    if (keyword) {
                        keyword = textHelper.fixingKeyword(keyword);
                    }
                    emitRecentChatRoom(socket, userId, lastLogDate, itemCount, keyword, callback);
                }
                else {
                    var paraError = {
                        userId: !numberHelper.isInt(userId)
                    };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
            });

            socket.on(eventName.getRecentPinChatRoom, function (data, callback) {
                var userId = socket.userId;
                if (userId) {
                    userId = parseInt(userId);
                }
                if (numberHelper.isInt(userId)) {
                    var lastLogDate = data.lastLogDate;                    
                    emitRecentPinChatRoom(socket, userId, lastLogDate, itemCount, callback);
                }
                else {
                    var paraError = {
                        userId: !numberHelper.isInt(userId)
                    };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
            });

            //lấy số lượng tin chưa đọc
            socket.on(eventName.getUnreadRoomCount, function (data, callback) {

                var userId = socket.userId;
                if (userId) {
                    userId = parseInt(userId);
                }

                if (!numberHelper.isInt(userId)) {
                    var paraError = {
                        userId: !numberHelper.isInt(userId)
                    };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
                else {
                    db.room.getUnreadRoomCount(userId, function (result) {
                        callback(result);
                    });
                }
            });

            //--------------------------------------------------------
            //các hàm về room

            //hàm lấy room chat riêng
            socket.on(eventName.getPrivateRoom, function (data, callback) {
                var userId1 = socket.userId;
                var userId2 = data.userId;

                //parse data type
                if (userId1) {
                    userId1 = parseInt(userId1);
                }

                if (userId2) {
                    userId2 = parseInt(userId2);
                }

                //Kiểm tra parameter
                if (!numberHelper.isInt(userId1) || !numberHelper.isInt(userId2)) {
                    var paraError = {
                        userId1: !numberHelper.isInt(userId1),
                        userId2: !numberHelper.isInt(userId2)
                    };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
                else {
                    db.user.getUserInfo(userId2, function (res) {
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
                                    result.data.members = setRoomMemberStatus(result.data.members);
                                }
                                callback(result);
                            });
                        }
                        else {
                            callback(res);
                        }
                    });
                }
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
                console.log(itemName);
                if (userId) {
                    userId = parseInt(userId);
                }

                if (userIdOwner) {
                    userIdOwner = parseInt(userIdOwner);
                }

                if (userIdGuest) {
                    userIdGuest = parseInt(userIdGuest);
                }

                if (itemId) {
                    itemId = parseInt(itemId);
                }

                if (!numberHelper.isInt(userId) || !numberHelper.isInt(userIdOwner) || !numberHelper.isInt(userIdGuest) || !numberHelper.isInt(itemId)) {
                    var paraError = {
                        userId: !numberHelper.isInt(userId),
                        userIdOwner: !numberHelper.isInt(userIdOwner),
                        userIdGuest: !numberHelper.isInt(userIdGuest),
                        itemId: !numberHelper.isInt(itemId),
                    }
                    callback(resultHelper.returnResultParameterError(paraError));
                }
                else {

                    var chatToUserId = userId == userIdOwner ? userIdGuest : userIdOwner;

                    db.user.getUserInfo(chatToUserId, function (res) {
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
                                    result.data.members = setRoomMemberStatus(result.data.members);
                                }
                                callback(result);
                            });
                        }
                        else {
                            callback(res);
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

                if (userId) {
                    userId = parseInt(userId);
                }

                if (userIdGuest) {
                    userIdGuest = parseInt(userIdGuest);
                }

                if (pageId) {
                    pageId = parseInt(pageId);
                }

                if (!numberHelper.isInt(userId) || !numberHelper.isInt(userIdGuest) || !numberHelper.isInt(pageId)) {
                    var paraError = {
                        userId: !numberHelper.isInt(userId),
                        userIdGuest: !numberHelper.isInt(userIdGuest),
                        pageId: !numberHelper.isInt(pageId)
                    }
                }
                else {

                    db.page.getPageInfo(pageId, function (res) {
                        if (res.errorCode == 0) {
                            var pageInfo = res.data;
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
                                    result.data.members = setRoomMemberStatus(result.data.members);
                                }

                                callback(result);
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
                            result.data.members = setRoomMemberStatus(result.data.members);
                        }
                        callback(result);
                    });
                }
                else {
                    callback(resultHelper.returnResultParameterError({ roomId: true }));
                }
            });

            //-------------------------------------------------------------
            //room tự tạo (27/11/2017)
            socket.on(eventName.createChatRoom, function (data, callback) {
                var userId = socket.userId;
                var roomName = data.roomName;
                var roomAvatar = data.roomAvatar;
                var members = data.members;
                if (members.length == 0) {
                    callback(resultHelper.returnResultParameterError({
                        members: true
                    }));
                }
                else if (members.length == 1) {
                    db.user.getUserInfo(parseInt(members[0].userId), function (res) {
                        if (res.errorCode == 0) {
                            db.room.getPrivateRoom(userId, parseInt(members[0].userId), userId, function (result) {

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
                                    result.data.members = setRoomMemberStatus(result.data.members);
                                }
                                callback(result);
                            });
                        }
                        else {
                            callback(res);
                        }
                    });
                }
                else {

                    if (typeof members !== "string") {
                        db.room.createCustomChat(userId, members, roomName, roomAvatar, function (result) {
                            callback(result);
                            if (result.errorCode == 0) {
                                var roomInfo = result.data;
                                var roomId = roomInfo._id;
                                var content = {
                                    userId: userId,
                                    userName: _.find(roomInfo.members, { userId: userId }).userInfo.name
                                };
                                var actionContent = db.roomLog.actionTypeMessage(db.roomLog.actionType.createRoom, content);
                                messageSendExecute(roomId, userId, db.roomLog.messageType.action, actionContent, "");
                            }
                        });
                    }
                    else {
                        callback(resultHelper.returnResultParameterError({ members: true }));
                    }
                }
            });

            function renameChatRoom(data, roomType, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;
                var roomName = data.roomName;
                if (roomId && roomName) {

                    db.room.renameChatRoom(userId, roomId, roomName, function (result) {
                        callback(result);
                        if (result.errorCode == 0) {
                            db.user.getUserInfo(userId, function (res) {
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
                                messageSendExecute(roomId, userId, db.roomLog.messageType.action, actionContent, "");
                            });
                        }
                    });
                }
                else {
                    callback(resultHelper.returnResultParameterError({
                        roomId: roomId ? false : true
                    }));
                }
            }

            socket.on(eventName.renameChatRoom, function (data, callback) {
                renameChatRoom(data, db.room.roomType.custom, function (result) {
                    callback(result);
                });
            });

            function changeAvatarChatRoom(data, roomType, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;
                var roomAvatar = data.roomAvatar;
                if (roomId && roomAvatar) {
                    roomAvatar = azure.azureStorageUrl + roomAvatar;
                    db.room.changeAvatarChatRoom(userId, roomId, roomAvatar, function (result) {
                        callback(result);
                        if (result.errorCode == 0) {
                            db.user.getUserInfo(userId, function (res) {
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
                                messageSendExecute(roomId, userId, db.roomLog.messageType.action, actionContent, "");
                            });
                        }
                    });
                }
                else {
                    callback(resultHelper.returnResultParameterError({
                        roomId: roomId ? false : true,
                        roomAvatar: roomAvatar ? false : true
                    }));
                }
            }

            socket.on(eventName.changeAvatarChatRoom, function (data, callback) {
                changeAvatarChatRoom(data, db.room.roomType.custom, function (result) {
                    callback(result);
                });
            });

            function changeChatRoomDescription(data, roomType, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;
                var description = data.description;
                if (roomId) {

                    db.room.changeChatRoomDescription(userId, roomId, roomAvatar, function (result) {
                        callback(result);
                        if (result.errorCode == 0) {
                            db.user.getUserInfo(userId, function (res) {
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
                                messageSendExecute(roomId, userId, db.roomLog.messageType.action, actionContent, "");
                            });
                        }
                    });
                }
                else {
                    callback(resultHelper.returnResultParameterError({
                        roomId: roomId ? false : true
                    }));
                }
            }

            socket.on(eventName.changeChatRoomDescription, function (data, callback) {
                changeChatRoomDescription(data, db.room.roomType.custom, function (result) {
                    callback(result);
                });
            });

            socket.on(eventName.addRoomMember, function (data, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;
                var memberInfo = data.memberInfo;
                if (roomId && memberInfo) {

                    db.room.addChatRoomMember(userId, roomId, memberInfo, function (result) {
                        callback(result);
                        if (result.errorCode == 0) {
                            db.user.getUserInfo(userId, function (res) {
                                var userInfo = res.data;
                                var content = {
                                    userId: userId,
                                    userName: userInfo.name,
                                    memberInfo: memberInfo
                                }
                                var actionContent = db.roomLog.actionTypeMessage(db.roomLog.actionType.addMember, content);
                                messageSendExecute(roomId, userId, db.roomLog.messageType.action, actionContent, "");
                            });
                        }
                    });
                }
                else {
                    callback(resultHelper.returnResultParameterError({
                        roomId: roomId ? false : true
                    }));
                }
            });

            function removeRoomMember(data, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;
                var memberInfo = data.memberInfo;
                if (roomId && memberInfo) {

                    db.user.getUserInfo(userId, function (res) {
                        var userInfo = res.data;
                        var content = {
                            userId: userId,
                            userName: userInfo.name,
                            memberInfo: memberInfo
                        }
                        var actionContent = db.roomLog.actionTypeMessage(db.roomLog.actionType.removeMember, content);
                        messageSendExecute(roomId, userId, db.roomLog.messageType.action, actionContent, "", function (resX) {

                            db.room.removeChatRoomMember(userId, roomId, memberInfo, function (result) {
                                callback(result);
                                if (result.errorCode == 0) {
                                }
                            });
                        });
                    });
                }
                else {
                    callback(resultHelper.returnResultParameterError({
                        roomId: roomId ? false : true
                    }));
                }
            }

            socket.on(eventName.removeRoomMember, function (data, callback) {
                removeRoomMember(data, function (result) {
                    callback(result);
                });
            });

            //--------------------------------------------------------        
            //thao tác trên room
            socket.on(eventName.archiveChatRoom, function (data, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;
                db.room.setRoomArchive(userId, roomId, true, function (result) {
                    callback(result);
                });
            });

            socket.on(eventName.unarchiveChatRoom, function (data, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;
                db.room.setRoomArchive(userId, roomId, false, function (result) {
                    callback(result);
                });
            });

            //socket.on('leaveChatRoom', function (data, callback) {
            //});

            socket.on(eventName.muteChatRoom, function (data, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;
                db.room.setRoomMute(userId, roomId, true, function (result) {
                    callback(result);
                });
            });

            socket.on(eventName.unmuteChatRoom, function (data, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;
                db.room.setRoomMute(userId, roomId, false, function (result) {
                    callback(result);
                });
            });
            //--------------------------------------------------------

            //các hàm về message            

            //lấy lịch sử chat
            socket.on(eventName.getRoomLogs, function (data, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;
                var lastLogId = data.lastLogId;
                if (roomId) {
                    //todo: chưa đọc hết thông tin về user
                    db.roomLog.getRoomLogs(userId, roomId, lastLogId, roomLogCount, function (result) {
                        callback(result);
                    });
                }
                else {
                    var paraError = { roomId: true };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
            });

            socket.on(eventName.getPinLogs, function (data, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;
                var lastLogId = data.lastLogId;
                if (roomId) {
                    //todo: chưa đọc hết thông tin về user
                    db.roomLog.getPinLogs(userId, roomId, lastLogId, roomLogCount, function (result) {
                        callback(result);
                    });
                }
                else {
                    var paraError = { roomId: true };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
            });

            //gửi tin
            socket.on(eventName.sendText, function (data, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;
                var text = data.text;
                var itemGUID = data.itemGUID;

                if (roomId && text && itemGUID) {

                    var content = db.roomLog.textTypeMessage('text', text);

                    var type = db.roomLog.messageType.text;

                    messageSendExecute(roomId, userId, type, content, itemGUID, callback);
                }
                else {
                    var paraError = {
                        roomId: roomId ? true : false,
                        text: text ? true : false,
                        itemGUID: itemGUID ? true : false
                    };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
            });

            socket.on(eventName.sendFile, function (data, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;

                var fileName = data.fileName;
                var link = data.link;
                var itemGUID = data.itemGUID;

                if (roomId && fileName && link && itemGUID) {

                    var ext = imageHelper.getFileExtension(link);

                    var size = data.size;

                    var type = db.roomLog.messageType.file;

                    var content = db.roomLog.fileTypeMessage(fileName, ext, link, size);

                    messageSendExecute(roomId, userId, type, content, itemGUID, callback);
                }
                else {
                    var paraError = {
                        roomId: roomId ? true : false,
                        fileName: fileName ? true : false,
                        link: link ? true : false,
                        itemGUID: itemGUID ? true : false
                    };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
            });

            socket.on(eventName.sendImage, function (data, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;

                var fileName = data.fileName;
                var link = data.link;
                var thumbLink = data.thumbLink;

                var height = data.height;
                var width = data.width;
                var size = data.size;

                var thumbHeight = data.thumbHeight;
                var thumbWidth = data.thumbWidth;
                var thumbSize = data.thumbSize;

                var itemGUID = data.itemGUID;

                if (roomId && fileName && link && thumbLink && itemGUID) {

                    var ext = imageHelper.getFileExtension(link);

                    var type = db.roomLog.messageType.image;

                    var content = db.roomLog.imageTypeMessage(fileName, ext, link, thumbLink, width, height, size, thumbWidth, thumbHeight, thumbSize);

                    messageSendExecute(roomId, userId, type, content, itemGUID, callback);
                }
                else {
                    var paraError = {
                        roomId: roomId ? true : false,
                        fileName: fileName ? true : false,
                        link: link ? true : false,
                        thumbLink: thumbLink ? true : false,
                        itemGUID: itemGUID ? true : false
                    };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
            });

            socket.on(eventName.sendVideo, function (data, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;

                var fileName = data.fileName;
                var link = data.link;
                var thumbLink = data.thumbLink;

                var height = data.height;
                var width = data.width;
                var size = data.size;

                var thumbHeight = data.thumbHeight;
                var thumbWidth = data.thumbWidth;
                var thumbSize = data.thumbSize;

                var itemGUID = data.itemGUID;

                if (roomId && fileName && link && thumbLink && itemGUID) {

                    var ext = imageHelper.getFileExtension(link);

                    var type = db.roomLog.messageType.video;

                    var content = db.roomLog.videoTypeMessage(fileName, ext, link, thumbLink, width, height, size, thumbWidth, thumbHeight, thumbSize);

                    messageSendExecute(roomId, userId, type, content, itemGUID, callback);
                }
                else {
                    var paraError = {
                        roomId: roomId ? true : false,
                        fileName: fileName ? true : false,
                        link: link ? true : false,
                        thumbLink: thumbLink ? true : false,
                        itemGUID: itemGUID ? true : false
                    };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
            });

            socket.on(eventName.sendLink, function (data, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;

                var text = data.text;
                var link = data.link;
                var title = data.title;
                var imageLink = data.imageLink;
                var description = data.description;

                var itemGUID = data.itemGUID;

                if (roomId && link && itemGUID) {

                    var type = db.roomLog.messageType.link;

                    var content = db.roomLog.linkTypeMessage(text, link, title, imageLink, description);

                    messageSendExecute(roomId, userId, type, content, itemGUID, callback);
                }
                else {
                    var paraError = {
                        roomId: roomId ? true : false,
                        link: link ? true : false,
                        itemGUID: itemGUID ? true : false
                    };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
            });

            socket.on(eventName.updateLink, function (data, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;
                var chatLogId = data.chatLogId;

                var text = data.text;
                var link = data.link;
                var title = data.title;
                var imageLink = data.imageLink;
                var description = data.description;

                var itemGUID = data.itemGUID;

                if (roomId && chatLogId && link && itemGUID) {

                    var type = db.roomLog.messageType.link;

                    var content = db.roomLog.linkTypeMessage(text, link, title, imageLink, description);

                    db.roomLog.updateChatRoomLog(roomId, chatLogId, userId, content, function (result) {
                        callback(result);
                        db.room.getRoomById(roomId, userId, function (res) {
                            if (res.errorCode == 0) {
                                var roomInfo = res.data;
                                var roomMembers = roomInfo.members;

                                var roomMemberIds = [];
                                roomMembers.forEach(function (x) {
                                    roomMemberIds.push(x.userId);
                                });

                                emitRoomMemberEvent(eventName.updateMessage, result, roomMembers);
                            }
                        });

                    });
                }
                else {
                    var paraError = {
                        roomId: roomId ? true : false,
                        link: link ? true : false,
                        itemGUID: itemGUID ? true : false
                    };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
            });

            socket.on(eventName.sendLocation, function (data, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;

                var lat = data.lat;
                var lng = data.lng;
                var address = data.address;

                var itemGUID = data.itemGUID;

                if (roomId && lat && lng && itemGUID) {
                    var type = db.roomLog.messageType.location;

                    var content = db.roomLog.locationTypeMessage(lat, lng, address);

                    messageSendExecute(roomId, userId, type, content, itemGUID, callback);
                }
                else {
                    var paraError = {
                        roomId: roomId ? true : false,
                        lat: lat ? true : false,
                        lng: lng ? true : false,
                        itemGUID: itemGUID ? true : false
                    };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
            });

            socket.on(eventName.sendItem, function (data, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;

                var itemId = data.itemId;
                var itemName = data.itemName;
                var itemImage = data.itemImage;
                var itemLink = data.itemLink;
                var itemPrice = data.itemPrice;

                var itemGUID = data.itemGUID;

                if (roomId && itemId && itemName && itemImage && itemLink && itemGUID) {
                    var type = db.roomLog.messageType.item;

                    var content = db.roomLog.itemTypeMessage(itemId, itemName, itemImage, itemLink, itemPrice);

                    messageSendExecute(roomId, userId, type, content, itemGUID, callback);
                }
                else {
                    var paraError = {
                        roomId: roomId ? true : false,
                        itemId: itemId ? true : false,
                        itemName: itemName ? true : false,
                        itemImage: itemImage ? true : false,
                        itemLink: itemLink ? true : false,
                        itemGUID: itemGUID ? true : false
                    };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
            });

            //xóa tin
            socket.on(eventName.deleteMessage, function (data, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;
                var chatLogId = data.chatLogId;
                if (roomId && chatLogId) {
                    db.roomLog.deleteChatRoomLog(roomId, chatLogId, userId, function (result) {
                        callback(result);
                        if (result.errorCode == 0) {
                            db.room.getRoomById(roomId, userId, function (res) {
                                if (res.errorCode == 0) {
                                    var roomInfo = res.data;
                                    var roomMembers = roomInfo.members;
                                    emitRoomMemberEvent(eventName.removeMessage, result, roomMembers);
                                }
                            });
                        }
                    });
                }
                else {
                    var paraError = {
                        roomId: roomId ? true : false,
                        chatLogId: chatLogId ? true : false
                    };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
            });

            //set tin nhắn đã đọc
            socket.on(eventName.setLogIsView, function (data, callback) {

                var urerId = socket.userId;
                var roomId = data.roomId;
                var chatLogId = data.chatLogId;

                if (roomId && chatLogId) {
                    db.roomLog.setChatLogIsView(roomId, chatLogId, userId, function (result) {
                        callback(result);
                        if (result.errorCode == 0) {
                            db.room.getRoomById(roomId, userId, function (res) {

                                if (res.errorCode == 0) {
                                    var roomInfo = res.data;
                                    if (roomInfo) {
                                        var roomMembers = roomInfo.members;
                                        emitRoomMemberEvent(eventName.logIsViewed, result, roomMembers);
                                    }
                                }
                            });
                        }
                    });
                }
                else {
                    var paraError = {
                        roomId: roomId ? true : false,
                        chatLogId: chatLogId ? true : false
                    };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
            });

            //lấy SAS để upload file
            socket.on(eventName.generateUploadSAS, function (data, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;
                var itemGUID = data.itemGUID;
                var fileName = data.fileName;
                if (fileName && itemGUID && roomId) {
                    azure.generateUploadSAS(userId, roomId, itemGUID, fileName, function (result) {
                        callback(result);
                    });
                }
                else {

                    var paraError = {
                        roomId: roomId ? true : false,
                        itemGUID: itemGUID ? true : false,
                        fileName: fileName ? true : false
                    };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
            });

            //lấy danh sách file trên room (file, image, video)
            socket.on(eventName.getRoomFiles, function (data, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;
                var lastLogId = data.lastLogId;
                var keyword = data.keyword;
                if (roomId) {
                    //todo: chưa đọc hết thông tin về user
                    if (keyword) {
                        keyword = textHelper.fixingKeyword(keyword);
                    }
                    db.roomLog.getRoomFiles(userId, roomId, lastLogId, itemCount, keyword, function (result) {
                        callback(result);
                    });
                }
                else {
                    var paraError = { roomId: true };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
            });

            socket.on(eventName.getRoomLinks, function (data, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;
                var lastLogId = data.lastLogId;
                var keyword = data.keyword;
                if (roomId) {
                    //todo: chưa đọc hết thông tin về user
                    if (keyword) {
                        keyword = textHelper.fixingKeyword(keyword);
                    }
                    db.roomLog.getRoomLinks(userId, roomId, lastLogId, itemCount, keyword, function (result) {
                        callback(result);
                    });
                }
                else {
                    var paraError = { roomId: true };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
            });

            socket.on(eventName.searchRoomLogs, function (data, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;
                var lastLogId = data.lastLogId;
                var keyword = data.keyword;
                if (roomId) {
                    //todo: chưa đọc hết thông tin về user
                    if (keyword) {
                        keyword = textHelper.fixingKeyword(keyword);
                    }
                    db.roomLog.searchRoomLogs(userId, roomId, lastLogId, itemCount, keyword, function (result) {
                        callback(result);
                    });
                }
                else {
                    var paraError = { roomId: true };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
            });

            socket.on(eventName.getRoomNearbyLogs, function (data, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;
                var logId = data.logId;
                var count = data.itemCount;
                if (roomId) {
                    //todo: chưa đọc hết thông tin về user                    
                    db.roomLog.getRoomPreviousLogs(roomId, logId, count, true, function (resPrev) {
                        if (resPrev.errorCode == 0) {
                            var lst1 = resPrev.data;

                            db.roomLog.getRoomNextLogs(roomId, logId, count, function (resNext) {
                                if (resNext.errorCode == 0) {
                                    var lst2 = resNext.data;

                                    var lst = lst1.reverse().concat(lst2);
                                    callback(resultHelper.returnResultSuccess(lst));
                                }
                                else {
                                    callback(resNext);
                                }
                            });
                        }
                        else {
                            callback(resPrev);
                        }

                    });
                }
                else {
                    var paraError = { roomId: true };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
            });

            socket.on(eventName.getRoomPreviousLogs, function (data, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;
                var logId = data.logId;
                var count = data.itemCount;
                if (roomId) {
                    //todo: chưa đọc hết thông tin về user                    
                    db.roomLog.getRoomPreviousLogs(roomId, logId, count, false, function (result) {
                        if (result.errorCode == 0) {
                            result.data = result.data.reverse();
                        }
                        callback(result);
                    });
                }
                else {
                    var paraError = { roomId: true };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
            });

            socket.on(eventName.getRoomNextLogs, function (data, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;
                var logId = data.logId;
                var count = data.itemCount;
                if (roomId) {
                    //todo: chưa đọc hết thông tin về user                    
                    db.roomLog.getRoomNextLogs(roomId, logId, count, function (result) {
                        callback(result);
                    });
                }
                else {
                    var paraError = { roomId: true };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
            });

            socket.on(eventName.pinMessage, function (data, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;
                var logId = data.logId;
                if (roomId) {
                    //todo: chưa đọc hết thông tin về user           
                    var userInfo = socketMap[userId].UserInfo;
                    db.roomLog.setChatLogIsPin(roomId, logId, userInfo, true, function (result) {
                        callback(result);

                        if (result.errorCode == 0) {
                            db.room.getRoomById(roomId, userId, function (res) {

                                if (res.errorCode == 0) {
                                    var roomInfo = res.data;
                                    if (roomInfo) {
                                        result.data.roomInfo = roomInfo;
                                        db.user.getUserInfo(result.data.userIdAuthor, function (resX) {
                                            result.data.authorInfo = resX.data;
                                            var roomMembers = roomInfo.members;
                                            emitRoomMemberEvent(eventName.addPinItem, result, roomMembers);
                                        });
                                    }
                                }
                            });
                        }
                    });
                }
                else {
                    var paraError = { roomId: true };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
            });

            socket.on(eventName.unpinMessage, function (data, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;
                var logId = data.logId;
                if (roomId) {
                    //todo: chưa đọc hết thông tin về user       
                    var userInfo = socketMap[userId].UserInfo;
                    db.roomLog.setChatLogIsPin(roomId, logId, userInfo, false, function (result) {
                        callback(result);
                        if (result.errorCode == 0) {
                            db.room.getRoomById(roomId, userId, function (res) {

                                if (res.errorCode == 0) {
                                    var roomInfo = res.data;
                                    if (roomInfo) {
                                        var roomMembers = roomInfo.members;
                                        emitRoomMemberEvent(eventName.removePinItem, result, roomMembers);
                                    }
                                }
                            });
                        }
                    });
                }
                else {
                    var paraError = { roomId: true };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
            });

            //update group
            function removeMemberOnlyId(actionUserId, userId, roomId) {
                db.user.getUserInfo(userId, function (result) {
                    if (result.errorCode == 0) {
                        var memberInfo = result.data;
                        memberInfo.userId = memberInfo._id;
                        var removeData = {
                            roomId: roomId,
                            memberInfo: memberInfo
                        };
                        removeRoomMember(removeData, function (res) {
                        });
                    }
                });
            }

            socket.on(eventName.setBanUser, function (data, callback) {
                var actionUserId = socket.userId;
                var userId = data.userId;
                var roomId = data.roomId;
                var isBanned = data.isBanned;

                if (userId && roomId) {
                    db.room.setBanUser(actionUserId, userId, roomId, isBanned, function (result) {
                        callback(result);
                        if (result.errorCode == 0) {
                            if (isBanned) {
                                //gỡ khỏi room
                                removeMemberOnlyId(actionUserId, userid, roomId);

                                var roomMembers = [];
                                roomMembers.push({ userId: userId });

                                tryGetRoomInfo(userId, roomId, null, function (roomInfo) {

                                    var res = {
                                        roomId: roomId,
                                        actionUserId: actionUserId,
                                        isBanned: isBanned
                                    };

                                    emitRoomMemberEvent(eventName.getBanned, resultHelper.returnResultSuccess(res), roomMembers);

                                    var content = {
                                        userId: userId,
                                        userName: _.find(roomInfo.members, { userId: userId }).userInfo.name
                                    };
                                    var actionContent = db.roomLog.actionTypeMessage(db.roomLog.actionType.getBanned, content);

                                    notifyActionToUser(userId, roomId, actionContent, roomInfo);
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
                        callback(result);
                        if (result.errorCode == 0) {
                            if (isRestricted) {
                                var roomMembers = [];
                                roomMembers.push({ userId: userId });

                                tryGetRoomInfo(userId, roomId, null, function (roomInfo) {

                                    var res = {
                                        roomId: roomId,
                                        actionUserId: actionUserId,
                                        isRestricted: isRestricted,
                                        restrictActions: restrictActions,
                                        restrictUntil: restrictUntil
                                    };

                                    emitRoomMemberEvent(eventName.getRestricted, resultHelper.returnResultSuccess(res), roomMembers);

                                    var content = {
                                        userId: userId,
                                        userName: _.find(roomInfo.members, { userId: userId }).userInfo.name,
                                        isRestricted: isRestricted,
                                        restrictActions: restrictActions,
                                        restrictUntil: restrictUntil
                                    };
                                    var actionContent = db.roomLog.actionTypeMessage(db.roomLog.actionType.getRestricted, content);

                                    notifyActionToUser(userId, roomId, actionContent, roomInfo);
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

                if (!joinLink && isPrivate) {
                    joinLink = db.room.generateChannelPrivateJoinLink();
                }

                if (!roomName || !joinLink) {
                    callback(resultHelper.returnResultParameterError({
                        members: members.length == 0 ? false : true,
                        roomName: !roomName ? false : true,
                        joinLink: !joinLink ? false : true
                    }));
                }
                else {
                    db.room.createChannel(userId, members, isPrivate, roomName, roomAvatar, description, joinLink, signMessage, function (result) {
                        callback(result);
                        if (result.errorCode == 0) {
                            var roomInfo = result.data;
                            var roomId = roomInfo._id;
                            var content = {
                                userId: userId,
                                userName: _.find(roomInfo.members, { userId: userId }).userInfo.name
                            };
                            var actionContent = db.roomLog.actionTypeMessage(db.roomLog.actionType.createChannel, content);
                            messageSendExecute(roomId, userId, db.roomLog.messageType.action, actionContent, "");
                        }
                    });
                }
            });

            socket.on(eventName.renameChannel, function (data, callback) {
                renameChatRoom(data, db.room.roomType.channel, function (result) {
                    callback(result);
                });
            });

            socket.on(eventName.changeChannelAvatar, function (data, callback) {
                changeAvatarChatRoom(data, db.room.roomType.channel, function (result) {
                    callback(result);
                });
            });

            socket.on(eventName.changeChannelDescription, function (data, callback) {
                changeChatRoomDescription(data, db.room.roomType.channel, function (result) {
                    callback(result);
                });
            });

            socket.on(eventName.generatePrivateJoinLink, function (data, callback) {
                callback(resultHelper.returnResultSuccess(db.room.generateChannelPrivateJoinLink()));
            });

            socket.on(eventName.revokePrivateJoinLink, function (data, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;
                if (roomId) {
                    var joinLink = db.room.generateChannelPrivateJoinLinkSuffix();
                    db.room.changeJoinLink(userId, roomId, joinLink, function (result) {
                        callback(result);
                        //sự kiện realtime cho group
                        if (result.errorCode == 0) {
                            var roomInfo = result.data;
                            var roomId = roomInfo._id;
                            var content = {
                                userId: userId,
                                userName: _.find(roomInfo.members, { userId: userId }).userInfo.name,
                                joinLink: joinLink,
                            };
                            var actionContent = db.roomLog.actionTypeMessage(db.roomLog.actionType.changeJoinLink, content);
                            messageSendExecute(roomId, userId, db.roomLog.messageType.action, actionContent, "");
                        }
                    });
                }
            });

            socket.on(eventName.changePublicJoinLink, function (data, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;
                var joinLink = data.joinLink;
                db.room.changeJoinLink(userId, roomId, joinLink, function (result) {
                    callback(result);
                    //sự kiện realtime cho group
                    if (result.errorCode == 0) {
                        var roomInfo = result.data;
                        var roomId = roomInfo._id;
                        var content = {
                            userId: userId,
                            userName: _.find(roomInfo.members, { userId: userId }).userInfo.name,
                            joinLink: joinLink,
                        };
                        var actionContent = db.roomLog.actionTypeMessage(db.roomLog.actionType.changeJoinLink, content);
                        messageSendExecute(roomId, userId, db.roomLog.messageType.action, actionContent, "");
                    }
                });
            });

            socket.on(eventName.checkJoinLinkAvaiable, function (data, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;
                var joinLink = data.joinLink;
                db.room.checkJoinLinkAvaiable(userId, roomId, joinLink, function (result) {
                    callback(result);
                });
            });

            socket.on(eventName.addChannelMember, function (data, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;
                var memberInfo = data.memberInfo;
                if (roomId && memberInfo) {

                    db.room.addChannelMember(userId, roomId, memberInfo, function (result) {
                        callback(result);
                        if (result.errorCode == 0) {
                            db.user.getUserInfo(userId, function (res) {
                                var userInfo = res.data;
                                var content = {
                                    userId: userId,
                                    userName: userInfo.name,
                                    memberInfo: memberInfo
                                }
                                var actionContent = db.roomLog.actionTypeMessage(db.roomLog.actionType.addMember, content);
                                messageSendExecute(roomId, userId, db.roomLog.messageType.action, actionContent, "");
                            });
                        }
                    });
                }
                else {
                    callback(resultHelper.returnResultParameterError({
                        roomId: roomId ? false : true
                    }));
                }
            });

            socket.on(eventName.removeChannelMember, function (data, callback) {
                removeRoomMember(data, function (result) {
                    callback(result);
                });
            });
            function joinRoom(data, roomType, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;
                var memberInfo = socketMap[userId].UserInfo;

                if (roomId && memberInfo) {
                    db.room.addChannelMember(userId, roomId, memberInfo, function (result) {
                        callback(result);
                        if (result.errorCode == 0) {
                            db.user.getUserInfo(userId, function (res) {
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
                                messageSendExecute(roomId, userId, db.roomLog.messageType.action, actionContent, "");
                            });
                        }
                    });
                }
                else {
                    callback(resultHelper.returnResultParameterError({
                        roomId: roomId ? false : true
                    }));
                }
            }
            socket.on(eventName.joinChannel, function (data, callback) {
                joinRoom(data, db.room.roomType.channel, function (result) {
                    callback(result);
                });
            });

            socket.on(eventName.joinRoom, function (data, callback) {
                joinRoom(data, db.room.roomType.custom, function (result) {
                    callback(result);
                });
            });

            function leaveRoom(data, roomType, callback) {
                var userId = socket.userId;
                var roomId = data.roomId;
                var memberInfo = socketMap[userId].UserInfo;
                if (roomId && memberInfo) {

                    db.user.getUserInfo(userId, function (res) {
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
                        messageSendExecute(roomId, userId, db.roomLog.messageType.action, actionContent, "", function (resX) {

                            db.room.removeChatRoomMember(userId, roomId, memberInfo, function (result) {
                                callback(result);
                                if (result.errorCode == 0) {
                                }
                            });
                        });
                    });
                }
                else {
                    callback(resultHelper.returnResultParameterError({
                        roomId: roomId ? false : true
                    }));
                }
            }
            socket.on(eventName.leaveRoom, function (data, callback) {
                leaveRoom(data, db.room.roomType.custom, function (result) {
                    callback(result);
                });
            });

            socket.on(eventName.leaveChannel, function (data, callback) {
                leaveRoom(data, db.room.roomType.channel, function (result) {
                    callback(result);
                });
            });

            function setAdmin(data, callback) {
                var actionUserId = socket.userId;
                var roomId = data.roomId;
                var userId = data.userId;
                var permissions = data.permissions;
                db.room.setAdmin(actionUserId, userId, roomId, permissions, function (result) {
                    callback(result);
                    //chưa có sự kiện realtime cho group
                    if (result.errorCode == 0) {
                        var roomMembers = [];
                        roomMembers.push({ userId: userId });

                        tryGetRoomInfo(userId, roomId, null, function (roomInfo) {

                            var res = {
                                roomId: roomId,
                                actionUserId: actionUserId,
                                isAdmin: true,
                                permissions: permissions,
                                roomInfo: roomInfo
                            };

                            emitRoomMemberEvent(eventName.permissionChange, resultHelper.returnResultSuccess(res), roomMembers);

                            var content = {
                                userId: userId,
                                userName: _.find(roomInfo.members, { userId: userId }).userInfo.name
                            };
                            var actionContent = db.roomLog.actionTypeMessage(db.roomLog.actionType.changeAdminPermission, content);

                            notifyActionToUser(userId, roomId, actionContent, roomInfo);
                        });
                    }
                });
            }
            //update Group admin
            socket.on(eventName.setGroupAdmin, function (data, callback) {
                setAdmin(data, function (result) {
                    callback(result);
                });
            });

            socket.on(eventName.setChannelAdmin, function (data, callback) {
                setAdmin(data, function (result) {
                    callback(result);
                });
            });

            function removeAdmin(data, roomType, callback) {
                var actionUserId = socket.userId;
                var roomId = data.roomId;
                var userId = data.userId;

                db.room.removeAdmin(actionUserId, userId, roomId, roomType, function (result) {
                    callback(result);
                    //chưa có sự kiện realtime cho group
                    if (result.errorCode == 0) {
                        var roomMembers = [];
                        roomMembers.push({ userId: userId });

                        tryGetRoomInfo(userId, roomId, null, function (roomInfo) {

                            var res = {
                                roomId: roomId,
                                actionUserId: actionUserId,
                                isAdmin: true,
                                permissions: permissions,
                                roomInfo: roomInfo
                            };

                            emitRoomMemberEvent(eventName.permissionChange, resultHelper.returnResultSuccess(res), roomMembers);

                            var content = {
                                userId: userId,
                                userName: _.find(roomInfo.members, { userId: userId }).userInfo.name
                            };
                            var actionContent = db.roomLog.actionTypeMessage(db.roomLog.actionType.changeAdminPermission, content);

                            notifyActionToUser(userId, roomId, actionContent, roomInfo);
                        });
                    }
                });
            }

            socket.on(eventName.removeGroupAdmin, function (data, callback) {
                removeAdmin(data, db.room.roomType.custom, function (result) {
                    callback(result);
                });
            });

            socket.on(eventName.removeChannelAdmin, function (data, callback) {
                removeAdmin(data, db.room.roomType.channel, function (result) {
                    callback(result);
                });
            });

            socket.on(eventName.getRoomFromJoinLink, function (data, callback) {
                var joinLink = data.joinLink;
                db.room.getRoomFromJoinLink(joinLink, function (result) {
                    callback(result);
                });
            });

            //for admin
            //online
            socket.on(eventName.getCurrentOnlineUser, function (data, callback) {
                var data = getCurrentOnlineUser();
                if (callback) {
                    callback(resultHelper.returnResultSuccess(data));
                }
            });

            socket.on(eventName.getOnlineUserByDate, function (data, callback) {
                var userId = socket.userId;
                var date = data.date;
                var pageIndex = data.pageIndex;
                var itemPerPage = data.itemPerPage;
                var os = data.os;

                if (date && pageIndex && itemPerPage) {
                    db.report.getOnlineLogByDate(date, os, pageIndex, itemPerPage, function (result) {
                        callback(result);
                    });
                }
                else {
                    var paraError = {
                        date: date ? false : true,
                        itemPerPage: itemPerPage ? false : true,
                        pageIndex: pageIndex ? false : true
                    };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
            });

            socket.on(eventName.getUserOnlineCountPerDay, function (data, callback) {
                var userId = socket.userId;
                var fromDate = data.fromDate;
                var toDate = data.toDate;
                var os = data.os;

                if (fromDate && toDate) {
                    db.report.getUserOnlineCountPerDay(fromDate, toDate, os, function (result) {
                        callback(result);
                    });
                }
                else {
                    var paraError = {
                        fromDate: fromDate ? false : true,
                        toDate: toDate ? false : true
                    };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
            });

            socket.on(eventName.getUserOnlineCountPerMonth, function (data, callback) {
                var userId = socket.userId;
                var fromDate = data.fromDate;
                var toDate = data.toDate;
                var os = data.os;

                if (fromDate && toDate) {
                    db.report.getUserOnlineCountPerMonth(fromDate, toDate, os, function (result) {
                        callback(result);
                    });
                }
                else {
                    var paraError = {
                        fromDate: fromDate ? false : true,
                        toDate: toDate ? false : true
                    };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
            });

            //not reply
            socket.on(eventName.getItemRoomNotReply, function (data, callback) {
                var userId = socket.userId;
                var fromDate = data.fromDate;
                var toDate = data.toDate;
                var lastDate = data.lastDate;
                var itemCount = data.itemCount;
                if (fromDate && toDate) {
                    if (!itemCount || itemCount == 0) {
                        itemCount = roomLogCount;
                    }
                    db.report.getItemRoomNotReply(userId, fromDate, toDate, lastDate, itemCount, function (result) {
                        callback(result);
                    });
                }
                else {
                    var paraError = { fromDate: fromDate ? false : true, toDate: toDate ? false : true };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
            });

            socket.on(eventName.getPageRoomNotReply, function (data, callback) {
                var userId = socket.userId;
                var fromDate = data.fromDate;
                var toDate = data.toDate;
                var lastDate = data.lastDate;
                var itemCount = data.itemCount;
                if (fromDate && toDate) {
                    if (!itemCount || itemCount == 0) {
                        itemCount = roomLogCount;
                    }
                    db.report.getPageRoomNotReply(userId, fromDate, toDate, lastDate, itemCount, function (result) {
                        callback(result);
                    });
                }
                else {
                    var paraError = { fromDate: fromDate ? false : true, toDate: toDate ? false : true };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
            });

            //user start chat
            socket.on(eventName.getUserByCreateDate, function (data, callback) {
                var userId = socket.userId;
                var fromDate = data.fromDate;
                var toDate = data.toDate;
                var lastDate = data.lastDate;
                var itemCount = data.itemCount;
                var os = data.os;
                if (fromDate && toDate) {
                    if (!itemCount || itemCount == 0) {
                        itemCount = roomLogCount;
                    }
                    db.report.getUserByCreateDate(fromDate, toDate, os, lastDate, itemCount, function (result) {
                        callback(result);
                    });
                }
                else {
                    var paraError = { fromDate: fromDate ? false : true, toDate: toDate ? false : true };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
            });

            socket.on(eventName.getUserStartChatByDay, function (data, callback) {
                var userId = socket.userId;
                var fromDate = data.fromDate;
                var toDate = data.toDate;
                var os = data.os;

                if (fromDate && toDate) {
                    db.report.getUserStartChatByDay(fromDate, toDate, os, function (result) {
                        callback(result);
                    });
                }
                else {
                    var paraError = {
                        fromDate: fromDate ? false : true,
                        toDate: toDate ? false : true
                    };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
            });

            socket.on(eventName.getUserStartChatByMonth, function (data, callback) {
                var userId = socket.userId;
                var fromDate = data.fromDate;
                var toDate = data.toDate;
                var os = data.os;

                if (fromDate && toDate) {
                    db.report.getUserStartChatByMonth(fromDate, toDate, os, function (result) {
                        callback(result);
                    });
                }
                else {
                    var paraError = {
                        fromDate: fromDate ? false : true,
                        toDate: toDate ? false : true
                    };
                    callback(resultHelper.returnResultParameterError(paraError));
                }
            });

            //dashboard
            socket.on(eventName.getTotalSummary, function (data, callback) {
                db.report.getTotalSummary(function (result) {
                    callback(result);
                });
            });
        }
        else {
            emitIfConnectFail(socket);
            socket.disconnect();
        }
    });
};
