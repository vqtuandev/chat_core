var _ = require('lodash');
var moment = require('moment');

var socketioJwt = require('socketio-jwt');
var socketIo = require('socket.io');

var defaultConfig = require('./configs');

var db = require('./models/all.js');

var resultHelper = require('./utility/resultHelper.js');
var errorCodes = resultHelper.errorCodes;

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

    /////////////user avatar
    getAvatarUploadSAS: 'getAvatarUploadSAS',
    updateUserAvatar: 'updateUserAvatar',

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
    getContactList: 'getContactList',
    searchContact: 'searchContact',
    addContact: 'addContact',
    removeContact: 'removeContact',
    checkPhoneNumber: 'checkPhoneNumber',
    getOrCreateAccountByPhone: 'getOrCreateAccountByPhone',
    getContactCount: 'getContactCount',
    //////////////////
    getUnreadRoomCount: 'getUnreadRoomCount',
    //////////////////
    pinRoom: 'pinRoom',
    unpinRoom: 'unpinRoom',
    getRecentPinChatRoom: 'getRecentPinChatRoom',
    ///////////////////
    getRecentChatRoom: 'getRecentChatRoom',
    getRecentChannel: 'getRecentChannel',
    getRecentGroupRoom: 'getRecentGroupRoom',
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
    getRoomBannedUser: 'getRoomBannedUser',
    setBanUser: 'setBanUser',
    setRestrictUser: 'setRestrictUser',
    getBanned: 'getBanned',
    getRestricted: 'getRestricted',
    //update 2018-03-06    
    updateGroup: 'updateGroup',
    changeGroupInfo: 'changeChannelInfo',
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
    sendAlbum: 'sendAlbum',
    sendFile: 'sendFile',
    sendLink: 'sendLink',
    updateLink: 'updateLink',
    sendItem: 'sendItem',
    sendLocation: 'sendLocation',
    sendContact: 'sendContact',
    sendVoice: 'sendVoice',
    sendCandidate: 'sendCandidate',
    sendRecruitment: 'sendRecruitment',
    sendPlan: 'sendPlan',
    ////////////
    replyMessage: 'replyMessage',
    forwardMessage: 'forwardMessage',
    //////////
    updatePlan: 'updatePlan',
    confirmToPlan: 'confirmToPlan',
    commentToPlan: 'commentToPlan',
    likePlan: 'likePlan',
    deletePlan: 'deletePlan',
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
    updateChannel: 'updateChannel',
    changeChannelInfo: 'changeChannelInfo',
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

    //channel admin
    getChannelAdminRoom: 'getChannelAdminRoom',

    //notify
    addNotify: 'addNotify',
    removeNotifyList: 'removeNotifyList',
    updateNotifyListIsView: 'updateNotifyListIsView',
    updateAllNotifyIsView: 'updateAllNotifyIsView',
    getNotifyList: 'getNotifyList',
    getUnreadNotifyCount: 'getUnreadNotifyCount',
    configPushInNotify: 'configPushInNotify',

    newNotify: 'newNotify',
    notifyViewUpdate: 'notifyViewUpdate',
    removeNotify: 'removeNotify',

    //user
    updateUserInfo: 'updateUserInfo',
    updateUserAccount: 'updateUserAccount',
    updateUserAvatar: 'updateUserAvatar',

    //user config settings
    getUserSettings: 'getUserSettings',

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
    getTotalSummary: 'getTotalSummary',
    updateUserProfile: 'updateUserProfile'
};

var common = require('./sockets/common')(eventName, db, socketMap);

function test() {
    //db.user.getUserInfo(165199, (r) => {
    //    var userInfo = r.data;
    //    db.user.getUserInfo(158852, (res) => {
    //        var user = res.data;
    //        db.room.getPrivateRoom(userInfo._id, user._id, userInfo._id, (res) => {
    //            if (res.errorCode == errorCodes.success) {
    //                var room = res.data;
    //                db.mapContact.getUserContactMapName(user._id, userInfo.phone, (res0) => {
    //                    var contactName = '';
    //                    if (res0.errorCode == errorCodes.success) {
    //                        contactName = res0.data;
    //                    }
    //                    var content = {
    //                        actionType: db.roomLog.actionType.newToChat,
    //                        data: {
    //                            userName: contactName ? contactName : ((user.contact && user.contact.name) ? user.contact.name : userInfo.name)
    //                        }
    //                    };
    //                    room.roomName = 'Gợi ý';
    //                    notifyToUser(user._id, room._id, content, room);
    //                });
    //                //console.log('to ' + user._id, );
    //            }
    //        });Sockets
    //    });
    //});
}

function initAndPushToSocketMap(userId, userInfo, socket) {

    if (!socketMap[userId]) {
        //nếu chưa có trong socketMap thì khởi tạo, gán tạm userInfo vào
        socketMap[userId] = { Sockets: [], UserInfo: userInfo };

        //đọc lại userInfo full từ db Mongo để notify SayHi & gán lại vào socketMap
        db.user.getUserInfo(userInfo._id, true, (result) => {
            if (result.errorCode == errorCodes.success) {
                var user = result.data;
                if (moment().diff(user.lastLoginDate, 'day') >= defaultConfig.notifySayHiDays) {
                    common.notify.notifyToSayHi(user, (user.lastLoginDate === true));
                }
                socketMap[userId].UserInfo = user;
            }
        });
    }

    socketMap[userId].Sockets.push(socket);
    //socketMap[userId].userInfo = userInfo;

}

function mapToSocketArray(socket, userInfo) {
    var _id = userInfo._id;
    var mxtUserId = userInfo.mxtUserId;
    socket.userInfo = userInfo;
    socket.userId = _id;
    socket.mxtUserId = mxtUserId;
    socket.os = userInfo.os;
    //socket.ip = userInfo.ip;
    //socket.device = userInfo.device;

    initAndPushToSocketMap(_id, userInfo, socket);

    switch (_id) {
        case defaultConfig.botId.myXBot: {
            console.warn('myXBot connected');
            break;
        }
        case defaultConfig.botId.planNotifyBot: {
            console.warn('planNotifyBot connected');
            break;
        }
        case defaultConfig.botId.serviceCallback: {
            console.warn('serviceCallback connected');
            break;
        }
    }

}
module.exports = (server) => {
    setInterval(function () { console.log('current socket count: ' + currentSocketCount); }, 30000);
    var io = socketIo.listen(server);
    io.use(socketioJwt.authorize({
        secret: defaultConfig.jwtSecret,
        handshake: true
    }));

    io.sockets.on(eventName.connection, function (socket) {
        currentSocketCount++;
        console.log('connected');
        
        userInfo = socket.decoded_token;
        console.log(userInfo);

        //đọc lại userInfo full & sayHi trog này
        mapToSocketArray(socket, userInfo);

        if (!_.includes(defaultConfig.botId, userInfo._id)) {

            db.room.getPrivateRoom(userInfo._id, userInfo._id, userInfo._id, () => {
                common.userEvent.emitIfConnectSuccess(socket, userInfo);

                require('./sockets/user.js')(socket, eventName, socketMap, db, resultHelper, common);

                require('./sockets/room.js')(socket, eventName, socketMap, db, resultHelper, common);

                require('./sockets/message.js')(socket, eventName, socketMap, db, resultHelper, common);

                require('./sockets/notification.js')(socket, eventName, socketMap, db, resultHelper, common);
            });
        }
        else {
            socket.emit(eventName.connectSuccess, {});
            switch (userInfo._id) {
                case defaultConfig.botId.planNotifyBot: {
                    require('./sockets/planSocket.js')(socket, eventName, common);
                    break;
                }

            }
        }
        //các event cho luva, dành cho cả user và hệ thống
        require('./sockets/luva/all')(socket, db, socketMap, common);


        //disconnect
        socket.on(eventName.disconnect, function (data) {
            currentSocketCount--;
            if (!socket.handshake.query) return;
            var userId = socket.userId;
            if (userId && socketMap[userId] && socketMap[userId].Sockets) {
               
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
                        common.userEvent.emitDisconnected(userInfo);
                    }
                }, 300000);
            }
        });

        //ping 
        socket.on(eventName.ping, function (data, callback) {
            if (typeof callback === 'function') {
                callback(true);
            }
        });
    });
};

//function checkServiceLogin(serviceName, accessKey) {
//    return _.some(defaultConfig.services, (item) => {
//        return item.service == serviceName && item.key == accessKey;
//    });
//}