var _ = require('lodash');
var db = require('./dbRoom');
var ObjectId = require('mongodb').ObjectId;

var cache = require('memory-cache');
var cacheTime = 600000;

var roomPrefix = 'room_';
var rooms = 'rooms';

var errorLog = require('./errorLog.js');
var hash = require('object-hash');
var moment = require('moment');
var dateHelper = require('../utility/dateHelper.js');
var resultHelper = require('../utility/resultHelper.js');
var errorCodes = resultHelper.errorCodes;

var imageHelper = require('../utility/imageHelper.js');
var textHelper = require('../utility/textHelper.js');
var azureHelper = require('../services/azure');
var user = require('./user.js');
var roomLog = require('./roomLog');

var webAppUrl = 'https://chat.luvapay.com/';
var mbnUrl = 'https://luvapay.com/';
var joinLinkPrefix = 'join/';
var roomType = {
    private: 'private',
    item: 'item',
    page: 'page',
    custom: 'custom',
    channel: 'channel',
    channelAdmin: 'channelAdmin'
};

exports.roomType = roomType;

var channelPermission = {

}
exports.channelAdminPermmisions = {
    editInfo: 'editInfo',
    postMessage: 'postMessage',
    editMessageOfOthers: 'editMessageOfOthers',
    deleteMessageOfOthers: 'deleteMessageOfOthers',
    addUsers: 'addUsers',
    addNewAdmins: 'addNewAdmins'
};

exports.userRestrictActions = {
    canRead: true,
    canSendMessage: true,
    canSendMedia: true,
    canEmbedLink: true
};

function parseIdToObject(_id) {
    var parsed = _id;
    try {
        parsed = ObjectId(_id);
    }
    catch (ex) {
        if (ObjectId.isValid(_id)) {
            parsed = _id;
        }
        else {
            parsed = null;
        }
    }
    return parsed;
}

function generateRoomCacheKey(roomId, userId) {
    return roomPrefix + roomId + "_" + userId;
}

function generateDefaultRoomMemberModel(userId, isGuest) {
    if (isGuest == null) {
        isGuest = false;
    }
    return {
        userId: userId,
        isArchived: false,
        isDelete: false,
        isMuted: false,
        isGuest: isGuest,
        isFavorite: false,
        isAdmin: !isGuest
    };
}
function generateChannelAdminPermissions(editInfo, postMessage, editMessageOfOthers, deleteMessageOfOthers, addUsers, addNewAdmins) {
    return {
        editInfo: editInfo,
        postMessage: postMessage,
        editMessageOfOthers: editMessageOfOthers,
        deleteMessageOfOthers: deleteMessageOfOthers,
        addUsers: addUsers,
        addNewAdmins: addNewAdmins
    }
}

function generateChannelRoomMemberWithPermission(userId, isAdmin, isOwner) {
    if (!isAdmin) {
        isAdmin = false;
    }

    if (!isOwner) {
        isOwner = false;
    }

    return {
        userId: userId,
        isArchived: false,
        isDelete: false,
        isMuted: false,
        isFavorite: false,
        isGuest: !isOwner,
        isOwner: isOwner,
        isAdmin: isAdmin,
        permissions: generateChannelAdminPermissions(isAdmin, isAdmin, isAdmin, isAdmin, isAdmin, isOwner)
    }
}
function generateGroupAdminPermissions(editInfo, deleteMessageOfOthers, addUsers, pinMessage, addNewAdmins) {
    return {
        editInfo: editInfo,
        deleteMessageOfOthers: deleteMessageOfOthers,
        addUsers: addUsers,
        pinMessage: pinMessage,
        addNewAdmins: addNewAdmins
    }
}

exports.generateGroupAdminPermissions = generateGroupAdminPermissions;

function generateGroupRoomMemberWithPermission(userId, isAdmin, isOwner) {
    if (!isAdmin) {
        isAdmin = false;
    }

    if (!isOwner) {
        isOwner = false;
    }

    return {
        userId: userId,
        isArchived: false,
        isDelete: false,
        isMuted: false,
        isFavorite: false,
        isRestricted: false,
        isGuest: !isOwner,
        isOwner: isOwner,
        isAdmin: isAdmin,
        permissions: generateGroupAdminPermissions(isAdmin, isAdmin, isAdmin, isAdmin, isOwner)
    }
}

function generatePrivateRoomDataModel(userId1, userId2) {
    return {
        type: roomType.private,
        userId1: userId1,
        userId2: userId2,
        members: [
            generateDefaultRoomMemberModel(userId1),
            generateDefaultRoomMemberModel(userId2)
        ],
        createDate: dateHelper.getUTCNow(), //xài moment
        lastLogDate: dateHelper.getUTCNow()
    };
}

function generateItemRoomDataModel(userIdOwner, userIdGuest, itemId, itemName, itemImage, itemLink, itemPrice, itemOriginPrice) {
    return {
        type: roomType.item,
        userIdOwner: userIdOwner,
        userIdGuest: userIdGuest,
        item: {
            itemId: itemId,
            itemName: itemName,
            itemImage: itemImage,
            itemLink: itemLink,
            itemPrice: itemPrice,
            itemOriginPrice: itemOriginPrice
        },
        members: [
            generateDefaultRoomMemberModel(userIdOwner),
            generateDefaultRoomMemberModel(userIdGuest, true)
        ],
        createDate: dateHelper.getUTCNow(), //xài moment
        lastLogDate: dateHelper.getUTCNow()
    };
}

function generatePageRoomDataModel(userIdGuest, pageMembers, pageId, pageName, pageLink, pageImage) {
    var item = {
        type: roomType.page,
        userIdGuest: userIdGuest,
        page: {
            pageId: pageId,
            pageName: pageName,
            pageImage: pageImage,
            pageLink: pageLink
        },
        createDate: dateHelper.getUTCNow(), //xài moment
        lastLogDate: dateHelper.getUTCNow()
    };
    var members = [];
    members.push(generateDefaultRoomMemberModel(userIdGuest, true));
    //console.log('page member in generate');
    //console.log(pageMembers);
    pageMembers.forEach(function (el) {
        members.push(generateDefaultRoomMemberModel(el));
    });
    item.members = members;
    return item;
}

function checkMemberExists(members, userId) {
    return members.some(function (v) {
        return userId == v.userId;
    });
}
function generateCustomRoomDataModel(userIdOwner, memberInfos, roomName, roomAvatar) {

    var item = {
        type: roomType.custom,
        userIdOwner: userIdOwner,
        roomName: roomName,
        roomAvatar: roomAvatar,
        createDate: dateHelper.getUTCNow(),
        lastLogDate: dateHelper.getUTCNow(),
        isPrivate: true,
        onlyAdminAddUser: false
    };

    var members = [];
    members.push(generateGroupRoomMemberWithPermission(userIdOwner, true, true));
    memberInfos.forEach(function (el) {
        var userInfo = el;
        //var url = userInfo.url ? userInfo.url : mbnUrl + userInfo.phone;
        //user.updateUser(parseInt(userInfo.userId), userInfo.name, userInfo.phone, userInfo.email, userInfo.avatar, url, '', null, function (resX) {
        //});

        if (!checkMemberExists(members, userInfo.userId)) {
            members.push(generateGroupRoomMemberWithPermission(el.userId, false, false));
        }
    });
    item.members = members;
    item.banned = [];
    return item;
}

function generateChannelPrivateJoinLinkSuffix() {
    var joinLink = ObjectId();
    //console.log(joinLink);
    return joinLink;
}

exports.generateChannelPrivateJoinLinkSuffix = generateChannelPrivateJoinLinkSuffix;

function getChannelJoinLinkSuffix(joinLink) {
    if (joinLink) {
        joinLink = joinLink.replace(webAppUrl, '');
        joinLink = joinLink.replace(joinLinkPrefix, '');
    }
    return joinLink;
}

exports.getChannelJoinLinkSuffix = getChannelJoinLinkSuffix;

function generateChannelPrivateJoinLink(suffix) {
    if (!suffix) {
        suffix = generateChannelPrivateJoinLinkSuffix();
    }
    return webAppUrl + joinLinkPrefix + suffix;
}
exports.generateChannelPrivateJoinLink = generateChannelPrivateJoinLink;

function generateChannelDataModel(userIdOwner, memberInfos, isPrivate, roomName, roomAvatar, description, joinLink, signMessage) {
    //console.log('2', joinLink);
    if (isPrivate && !joinLink) {
        joinLink = generateChannelPrivateJoinLinkSuffix();
    }
    //console.log('3', joinLink);
    if (!signMessage) {
        signMessage = false;
    }
    var channel = {
        type: roomType.channel,
        userIdOwner: userIdOwner,
        roomName: roomName,
        roomAvatar: roomAvatar,
        description: description,
        createDate: dateHelper.getUTCNow(),
        lastLogDate: dateHelper.getUTCNow(),
        isPrivate: isPrivate,
        joinLink: joinLink,
        signMessage: signMessage
    };

    var members = [];
    members.push(generateChannelRoomMemberWithPermission(userIdOwner, true, true));
    if (memberInfos && memberInfos.length > 0) {
        memberInfos.forEach(function (el) {
            var userInfo = el;
            //var url = userInfo.url ? userInfo.url : mbnUrl + userInfo.phone;
            //user.updateUser(parseInt(userInfo.userId), userInfo.name, userInfo.phone, userInfo.email, userInfo.avatar, url, '', null, function (resX) {

            //});
            if (!checkMemberExists(members, userInfo.userId)) {
                members.push(generateChannelRoomMemberWithPermission(el.userId, false, false));
            }
        });
    }
    channel.members = members;
    return channel;
}

function parseRoomName(roomInfo, userId) {
    var roomName = '';
    try {
        switch (roomInfo.type) {
            case roomType.private:
                {
                    roomName = (roomInfo.members[0].userId == userId ? roomInfo.members[1].userInfo.name : roomInfo.members[0].userInfo.name);
                    break;
                }
            case roomType.item:
                {
                    roomName = (roomInfo.userIdOwner == userId ? (roomInfo.members[0].userId == userId ? roomInfo.members[1].userInfo.name : roomInfo.members[0].userInfo.name) + ' (' + roomInfo.item.itemName + ')' : roomInfo.item.itemName);
                    break;
                }
            case roomType.page:
                {
                    roomName = (roomInfo.userIdGuest != userId ? (_.find(roomInfo.members, { userId: roomInfo.userIdGuest }).userInfo.name) + ' (' + roomInfo.page.pageName + ')' : roomInfo.page.pageName);
                    break;
                }
            case roomType.custom:
                {
                    roomName = roomInfo.roomName;
                    if (!roomName) {
                        var temp = _.filter(roomInfo.members, function (el) {
                            return el.userId != userId;
                        });
                        roomName = temp.map(function (el) { return el.userInfo.name; }).join();
                        if (!roomName) {
                            roomName = roomInfo.members.length > 0 && roomInfo.members[0].userInfo ? roomInfo.members[0].userInfo.name : 'Room ma';
                        }
                    }
                    break;
                }
            case roomType.channelAdmin:
                {
                    var userX = _.find(roomInfo.members, { userId: roomInfo.userIdGuest });
                    roomName = roomInfo.roomName ? roomInfo.roomName : ((roomInfo.userIdGuest != userId ? (userX ? userX.userInfo.name : '') + ' (' + roomInfo.channelName + ')' : "Admins (" + roomInfo.channelName + ")"));
                    break;
                }
            default:
                {
                    roomName = roomInfo.roomName;
                    break;
                }
        }
    }
    catch (ex) {
        console.log('parse room name error');
        console.log(ex);
    }
    return roomName;
}
exports.parseRoomName = parseRoomName;

function parseRoomInfo(roomInfo, userId, ignoreMember) {
    try {
        switch (roomInfo.type) {
            case roomType.private:
                {
                    var roomName = (roomInfo.members[0].userId == userId ? ((roomInfo.members[1] && roomInfo.members[1].userInfo) ? roomInfo.members[1].userInfo.name : '') : ((roomInfo.members[0] && roomInfo.members[0].userInfo) ? roomInfo.members[0].userInfo.name : ''));
                    roomInfo.roomName = roomName;
                    var roomAvatar = (roomInfo.members[0].userId == userId ? ((roomInfo.members[1] && roomInfo.members[1].userInfo) ? roomInfo.members[1].userInfo.avatar : '') : ((roomInfo.members[0] && roomInfo.members[0].userInfo) ? roomInfo.members[0].userInfo.avatar : ''));

                    roomInfo.roomAvatar = roomAvatar ? (azureHelper.azureStorageUrl + roomAvatar) : '';// ? roomAvatar : azureHelper.noAvatar);

                    roomInfo.item = undefined;
                    roomInfo.page = undefined;
                    roomInfo.userIdGuest = undefined;
                    roomInfo.userIdOwner = undefined;
                    roomInfo.isPrivate = undefined;
                    roomInfo.joinLink = undefined;
                    break;
                }
            case roomType.item:
                {
                    roomInfo.roomName = (roomInfo.userIdOwner == userId ? (roomInfo.members[0].userId == userId ? ((roomInfo.members[1] && roomInfo.members[1].userInfo) ? roomInfo.members[1].userInfo.name : '') : ((roomInfo.members[0] && roomInfo.members[0].userInfo) ? roomInfo.members[0].userInfo.name : '')) + (roomInfo.item ? ' (' + roomInfo.item.itemName + ')' : '') : (roomInfo.item ? roomInfo.item.itemName : ''));
                    roomInfo.roomAvatar = (roomInfo.item ? roomInfo.item.itemImage : '');
                    roomInfo.page = undefined;
                    roomInfo.userId1 = undefined;
                    roomInfo.userId2 = undefined;
                    roomInfo.item.itemOriginPrice = roomInfo.item ? (roomInfo.item.itemOriginPrice ? roomInfo.item.itemOriginPrice : 0) : 0;
                    if (ignoreMember) {
                        if (roomInfo.members) {
                            var member = roomInfo.members.find(function (x) {
                                return x.userId == userId;
                            });

                            roomInfo.members = [member];
                        }
                    }
                    break;
                }
            case roomType.page:
                {
                    var userX = _.find(roomInfo.members, { userId: roomInfo.userIdGuest });
                    roomInfo.roomName = (roomInfo.userIdGuest != userId ? (userX ? userX.userInfo.name : '') + ' (' + roomInfo.page.pageName + ')' : roomInfo.page.pageName);
                    roomInfo.roomAvatar = roomInfo.page.pageImage;
                    roomInfo.item = undefined;
                    roomInfo.userId1 = undefined;
                    roomInfo.userId2 = undefined;
                    roomInfo.userIdOwner = undefined;
                    roomInfo.memberCount = roomInfo.members ? roomInfo.members.length : 0;
                    if (ignoreMember) {
                        if (roomInfo.members) {
                            var member = roomInfo.members.find(function (x) {
                                return x.userId == userId;
                            });

                            roomInfo.members = [member];
                        }
                    }
                    break;
                }
            case roomType.custom:
                {
                    if (!roomInfo.roomName) {
                        var temp = _.filter(roomInfo.members, function (el) {
                            return el.userId != userId;
                        });
                        roomInfo.roomName = temp.map(function (el) { return el.userInfo.name; }).join();
                    }
                    if (!roomInfo.roomName) {
                        roomInfo.roomName = roomInfo.members.length > 0 ? roomInfo.members[0].userInfo.name : 'Room ma';
                    }
                    roomInfo.roomAvatar = roomInfo.roomAvatar ? roomInfo.roomAvatar : imageHelper.groupAvatar;
                    roomInfo.item = undefined;
                    roomInfo.page = undefined;
                    roomInfo.userId1 = undefined;
                    roomInfo.userId2 = undefined;
                    roomInfo.joinLink = roomInfo.joinLink ? generateChannelPrivateJoinLink(roomInfo.joinLink) : '';
                    roomInfo.isPrivate = (roomInfo.isPrivate == 1) || (roomInfo.isPrivate == true);
                    roomInfo.isMember = roomInfo.members ? (roomInfo.members.length > 0 ? _.some(roomInfo.members, {
                        userId: userId
                    }) : false) : true;
                    roomInfo.memberCount = roomInfo.members ? roomInfo.members.length : 0;
                    if (ignoreMember) {
                        if (roomInfo.members) {
                            var member = roomInfo.members.find(function (x) {
                                return x.userId == userId;
                            });

                            roomInfo.members = [member];
                        }
                    }
                    break;
                }
            case roomType.channel:
                {
                    roomInfo.roomAvatar = roomInfo.roomAvatar ? roomInfo.roomAvatar : imageHelper.channelAvatar;
                    roomInfo.userIdGuest = undefined;
                    roomInfo.item = undefined;
                    roomInfo.page = undefined;
                    roomInfo.userId1 = undefined;
                    roomInfo.userId2 = undefined;
                    roomInfo.joinLink = roomInfo.joinLink ? generateChannelPrivateJoinLink(roomInfo.joinLink) : '';
                    roomInfo.isPrivate = (roomInfo.isPrivate == 1) || (roomInfo.isPrivate == true);
                    roomInfo.signMessage = roomInfo.signMessage ? ((roomInfo.signMessage == 1) || (roomInfo.signMessage == true)) : false;
                    roomInfo.isMember = roomInfo.members ? (roomInfo.members.length > 0 ? _.some(roomInfo.members, {
                        userId: userId
                    }) : false) : true;
                    roomInfo.memberCount = roomInfo.members ? roomInfo.members.length : 0;
                    if (ignoreMember) {
                        if (roomInfo.members) {
                            var member = roomInfo.members.find(function (x) {
                                return x.userId == userId;
                            });
                            roomInfo.members = [member];
                        }
                    }
                    break;
                }
            case roomType.channelAdmin:
                {
                    var userX = _.find(roomInfo.members, { userId: roomInfo.userIdGuest });
                    roomInfo.roomName = roomInfo.roomName ? roomInfo.roomName : ((roomInfo.userIdGuest != userId ? (userX ? userX.userInfo.name : '') + ' (' + roomInfo.channelName + ')' : "Admins (" + roomInfo.channelName + ")"));
                    roomInfo.roomAvatar = roomInfo.roomAvatar ? roomInfo.roomAvatar : imageHelper.channelAvatar;
                    roomInfo.item = undefined;
                    roomInfo.userId1 = undefined;
                    roomInfo.userId2 = undefined;
                    roomInfo.userIdOwner = undefined;
                    roomInfo.memberCount = roomInfo.members ? roomInfo.members.length : 0;
                    if (ignoreMember) {
                        if (roomInfo.members) {
                            var member = roomInfo.members.find(function (x) {
                                return x.userId == userId;
                            });

                            roomInfo.members = [member];
                        }
                    }
                    break;
                }
        }

        _.each(roomInfo.members, (member, index) => {
            //(user.avatar ? user.avatar : azureHelper.noAvatar);
            //console.log(roomInfo.members[index]);
            //console.log(roomInfo.members[index].userInfo.avatar);
            if (roomInfo.members[index].userInfo.avatar) {
                roomInfo.members[index].userInfo.avatar = azureHelper.azureStorageUrl + roomInfo.members[index].userInfo.avatar;
            }
        });
        //console.log(roomInfo.members);
        //set isViewed cho user
        if (roomInfo.lastLog) {

            var userView = _.find(roomInfo.lastLog.views, { userId: userId });
            //console.log(userView);
            if (userView) {
                roomInfo.isViewed = userView.isViewed;
            }
            else {
                roomInfo.isViewed = false;
            }
        }
        else {
            roomInfo.isViewed = true;
        }
        if (roomInfo.lastLogAuthor && roomInfo.lastLogAuthor.avatar) {
            roomInfo.lastLogAuthor.avatar = azureHelper.azureStorageUrl + roomInfo.lastLogAuthor.avatar;
        }
    }
    catch (ex) {
        console.log('parse room info error');
        console.log(ex);
    }
    //console.log(roomInfo);
    return roomInfo;
}

exports.parseRoomInfo = parseRoomInfo;
exports.createIndex = function () {
    var collection = db.get().collection('rooms');
    collection.createIndex(
        {
            'members.userId': 1,
            'lastLogDate': 1
        },
        { background: true },
        (err, result) => {
            console.log(err);
            console.log(result);
        });
}
exports.getUnreadRoomCount = function (userId, callback) {
    var collection = db.get().collection(rooms);
    collection.aggregate([
        {
            $match: {
                $and: [
                    { 'lastLog.views.userId': userId },
                    { 'lastLog.views.isViewed': false },
                    { 'members.userId': userId }
                ]
            }
        },
        {
            $group: {
                _id: null,
                count: {
                    $sum: {
                        $size: {
                            $filter: {
                                input: "$lastLog.views",
                                as: "el",
                                cond:
                                {
                                    $and: [
                                        { $eq: ["$$el.userId", userId] },
                                        { $eq: ["$$el.isViewed", false] }
                                    ]
                                }
                            }
                        }
                    }
                }
            }
        }
    ],
        function (err, docs) {

            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                var doc = null;
                //console.log('count');

                if (docs.length > 0) {
                    doc = docs[0];
                    doc._id = undefined;
                }
                //console.log(doc);
                var res = { count: 0 };
                if (doc) {
                    res.count = doc.count;
                }

                callback(resultHelper.returnResultSuccess(res));
            }
        });
}
exports.getRoomByIdNotCheckMember = getRoomByIdNotCheckMember;

function getRoomByIdNotCheckMember(roomId, userId, callback) {
    //var doc = cache.get(generateRoomCacheKey(roomId, userId));
    var doc = null;
    //console.log('from cache');
    //console.log(doc);
    if (doc == null) {
        var oid = parseIdToObject(roomId);
        var isOk = true;
        if (oid == null) {
            isOk = false;
        }

        if (isOk) {
            var collection = db.get().collection(rooms);

            collection.aggregate(
                [
                    { $match: { _id: oid } },
                    { $unwind: '$members' },
                    { "$addFields": { "memberId": { "$toObjectId": "$members.userId" } } },
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'memberId',
                            foreignField: '_id',
                            as: 'userInfo'
                        }
                    },
                    { $unwind: "$userInfo" },
                    {
                        $group: {
                            _id: '$_id',
                            type: { $first: '$type' },
                            userId1: {
                                $first: '$userId1'
                            },
                            userId2: {
                                $first: '$userId2'
                            },
                            userIdGuest: {
                                $first: '$userIdGuest'
                            },
                            page: {
                                $first: '$page'
                            },
                            item: {
                                $first: '$item'
                            },
                            channelId: {
                                $first: '$channelId'
                            },
                            channelName: {
                                $first: '$channelName'
                            },
                            channelAvatar: {
                                $first: '$channelAvatar'
                            },
                            members: {
                                $push: {
                                    userId: '$members.userId',
                                    userInfo: "$userInfo",
                                    isArchived: '$members.isArchived',
                                    isDelete: '$members.isDelete',
                                    isMuted: '$members.isMuted',
                                    isGuest: '$members.isGuest',
                                    isFavorite: '$members.isFavorite',
                                    isOwner: '$members.isOwner',
                                    isAdmin: '$members.isAdmin',
                                    permissions: '$members.permissions'
                                }
                            },
                            createDate: {
                                $first: '$createDate'
                            },
                            lastLogDate: {
                                $first: '$lastLogDate'
                            },
                            lastLog: {
                                $first: '$lastLog'
                            },
                            roomName: {
                                $first: '$roomName'
                            },
                            roomAvatar: {
                                $first: '$roomAvatar'
                            },
                            description: {
                                $first: '$description'
                            },
                            isPrivate: {
                                $first: '$isPrivate'
                            },
                            joinLink: {
                                $first: '$joinLink'
                            },
                            signMessage: {
                                $first: '$signMessage'
                            },
                            onlyAdminAddUser: {
                                $first: '$onlyAdminAddUser'
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            type: 1,
                            members: {
                                userId: 1,
                                userInfo: { _id: 1, name: 1, phone: 1, email: 1, avatar: 1, url: 1, oneSignalUserIds: 1 },
                                isArchived: 1,
                                isDelete: 1,
                                isMuted: 1,
                                isGuest: 1,
                                isFavorite: 1,
                                isOwner: 1,
                                isAdmin: 1,
                                permissions: 1
                            },
                            userId1: 1,
                            userId2: 1,
                            item: 1,
                            page: 1,
                            userIdGuest: 1,
                            userIdOwner: 1,
                            createDate: 1,
                            lastLogDate: 1,
                            lastLog: 1,
                            roomName: 1,
                            roomAvatar: 1,
                            description: 1,
                            joinLink: 1,
                            isPrivate: 1,
                            channelId: 1,
                            channelName: 1,
                            channelAvatar: 1,
                            signMessage: 1,
                            onlyAdminAddUser: 1
                        }
                    }
                ],
                function (err, docs) {
                    if (err) {
                        errorLog.addLog(errorLog.errorType.data, err, function () { });
                        callback(resultHelper.returnResultDBError(err));
                    }
                    else {
                        doc = null;

                        if (docs.length > 0) {
                            doc = docs[0];
                            doc = parseRoomInfo(doc, userId);
                        }
                        //console.log('from db');
                        //console.log(doc);
                        //console.log('get room from db');
                        //console.log(doc.members);
                        if (doc) {
                            //console.log('before cache');
                            //console.log(doc);
                            //cache.put(generateRoomCacheKey(doc._id, userId), doc, cacheTime, function (key, value) {
                            //    console.log('room: ' + key + ' cache expire ');
                            //});
                        }
                        callback(resultHelper.returnResultSuccess(doc));
                    }
                });
        }
        else {
            callback(resultHelper.returnResultParameterError({ roomId: false }));
        }
    }
    else {
        //console.log('cache');
        //console.log(doc.members);
        callback(resultHelper.returnResultSuccess(doc));
    }
}

function getRoomById(roomId, userId, callback) {
    checkIsRoomMember(userId, roomId, function (resX) {
        if (!resX) {
            callback(resultHelper.returnResultNotInRoom());
        }
        else {
            getRoomByIdNotCheckMember(roomId, userId, callback);
        }
    });
}
exports.getRoomById = getRoomById;



function getPrivateRoom(userId1, userId2, userId, callback) {

    var collection = db.get().collection(rooms);
    console.log(userId1, userId2);
    //đảo vị trí sắp xếp của User
    if (userId1 > userId2) {
        var temp = userId1;
        userId1 = userId2;
        userId2 = temp;
    }
    console.log(userId1, userId2);

    collection.aggregate(
        [
            {
                $match: {
                    $and: [
                        { type: 'private' },
                        { userId1: userId1 },
                        { userId2: userId2 }
                    ]
                }
            },
            { $unwind: '$members' },
            { "$addFields": { "memberId": { "$toObjectId": "$members.userId" } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'memberId',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: "$userInfo" },
            {
                $group: {
                    _id: '$_id',
                    type: { $first: '$type' },
                    userId1: {
                        $first: '$userId1'
                    },
                    userId2: {
                        $first: '$userId2'
                    },
                    members: {
                        $push: {
                            userId: '$members.userId',
                            userInfo: {
                                name: "$userInfo.name",
                                avatar: "$userInfo.avatar",
                                phone: "$userInfo.phone",
                                _id: "$userInfo._id",
                                url: "$userInfo.url"
                            },
                            isArchived: '$members.isArchived',
                            isDelete: '$members.isDelete',
                            isMuted: '$members.isMuted',
                            isGuest: '$members.isGuest',
                            isFavorite: '$members.isFavorite',
                            isOwner: '$members.isOwner',
                            isAdmin: '$members.isAdmin',
                            permissions: '$members.permissions',
                        }
                    },
                    createDate: {
                        $first: '$createDate'
                    },
                    lastLogDate: {
                        $first: '$lastLogDate'
                    },
                    lastLog: {
                        $first: '$lastLog'
                    }
                }
            }
        ], function (err, docs) {
            console.log(err);
            if (err) {
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                console.log(docs);
                //nếu chưa có thì thêm mới
                if (docs.length == 0) {
                    //console.log('thêm mới private');
                    var doc = generatePrivateRoomDataModel(userId1, userId2);
                    collection.insert(doc, function (err, result) {
                        if (err) {
                            errorLog.addLog(errorLog.errorType.data, err, function () { });
                            callback(resultHelper.returnResultDBError(err));
                        }
                        else {
                            doc._id = result.insertedIds[0];
                            if (userId1 == userId2) {
                                var content = roomLog.actionTypeMessage(roomLog.actionType.savedMessageRoom, { userId: userId });
                                roomLog.addRoomLogAction(doc._id, userId, content, [userId], function (result) {
                                    createRoomLogIndex(doc._id);

                                    getRoomById(doc._id, userId, callback);
                                    //getPrivateRoom(userId1, userId2, userId, callback);
                                });
                            }
                            else {
                                createRoomLogIndex(doc._id);
                                getRoomById(doc._id, userId, callback);
                                //getPrivateRoom(userId1, userId2, userId, callback);
                            }
                            //doc = parseRoomInfo(doc, userId);
                            //callback(resultHelper.returnResultSuccessAddNew(doc));

                        }
                    });
                }
                else {
                    var doc = docs[0];
                    if (!doc.lastLog) {
                        if (userId1 == userId2) {

                            var content = roomLog.actionTypeMessage(roomLog.actionType.savedMessageRoom, { userId: userId });
                            roomLog.addRoomLogAction(doc._id, userId, content, [userId], function (result) {
                                doc = parseRoomInfo(doc, userId);
                                callback(resultHelper.returnResultSuccess(doc));
                            });
                        }
                        else {
                            doc = parseRoomInfo(doc, userId);

                            callback(resultHelper.returnResultSuccess(doc));
                        }
                    }
                    else {
                        doc = parseRoomInfo(doc, userId);
                        //console.log('get room from db');
                        //cache.put(generateRoomCacheKey(doc._id, userId), doc, cacheTime, function (key, value) {
                        //    console.log('room: ' + key + ' cache expire ');
                        //});
                        callback(resultHelper.returnResultSuccess(doc));
                    }
                }
            }
        });
}

//lấy private room, nếu chưa có thì tạo room
exports.getPrivateRoom = getPrivateRoom;


function getItemRoom(userIdOwner, userIdGuest, itemId, itemName, itemImage, itemLink, itemPrice, userId, callback, itemOriginPrice) {
    var collection = db.get().collection(rooms);

    collection.aggregate(
        [
            {
                $match: {
                    $and: [
                        { type: 'item' },
                        { userIdOwner: userIdOwner },
                        { userIdGuest: userIdGuest },
                        { 'item.itemId': itemId }
                    ]
                }
            },
            { $unwind: '$members' },
            { "$addFields": { "memberId": { "$toObjectId": "$members.userId" } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'memberId',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: "$userInfo" },
            {
                $group: {
                    _id: '$_id',
                    type: { $first: '$type' },
                    item: {
                        $first: '$item'
                    },
                    userIdOwner: {
                        $first: '$userIdOwner'
                    },
                    userIdGuest: {
                        $first: '$userIdGuest'
                    },
                    members: {
                        $push: {
                            userId: '$members.userId',
                            userInfo: {
                                name: "$userInfo.name",
                                avatar: "$userInfo.avatar",
                                phone: "$userInfo.phone",
                                _id: "$userInfo._id",
                                url: "$userInfo.url",
                                oneSignalUserIds: "$userInfo.oneSignalUserIds"
                            },
                            isArchived: '$members.isArchived',
                            isDelete: '$members.isDelete',
                            isMuted: '$members.isMuted',
                            isGuest: '$members.isGuest',
                            isFavorite: '$members.isFavorite',
                            isOwner: '$members.isOwner',
                            isAdmin: '$members.isAdmin',
                            permissions: '$members.permissions',
                        }
                    },
                    createDate: {
                        $first: '$createDate'
                    },
                    lastLogDate: {
                        $first: '$lastLogDate'
                    },
                    lastLog: {
                        $first: '$lastLog'
                    }
                }
            }
        ]).toArray(function (err, docs) {
            if (err) {
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                //nếu chưa có thì thêm mới
                if (docs.length == 0) {
                    var doc = generateItemRoomDataModel(userIdOwner, userIdGuest, itemId, itemName, itemImage, itemLink, itemPrice, itemOriginPrice);
                    collection.insert(doc, function (err, result) {
                        if (err) {
                            errorLog.addLog(errorLog.errorType.data, err, function () { });
                            callback(resultHelper.returnResultDBError(err));
                        }
                        else {
                            doc._id = result.insertedIds[0];

                            createRoomLogIndex(doc._id);

                            getItemRoom(userIdOwner, userIdGuest, itemId, itemName, itemImage, itemLink, itemPrice, userId, callback, itemOriginPrice);
                            //doc = parseRoomInfo(doc, userId);
                            //callback(resultHelper.returnResultSuccessAddNew(doc));
                        }
                    });
                }
                else {
                    var doc = docs[0];
                    doc = parseRoomInfo(doc, userId);
                    console.log('get room from db');
                    //cache.put(generateRoomCacheKey(doc._id, userId), doc, cacheTime, function (key, value) {
                    //    console.log('room: ' + key + ' cache expire ');
                    //});
                    callback(resultHelper.returnResultSuccess(doc));
                }
            }
        });
}
exports.getItemRoom = getItemRoom;

function deleteAllPageRoom() {
    var collection = db.get().collection(rooms);
    collection.deleteMany({ type: 'page' });
}

exports.deleteAllPageRoom = deleteAllPageRoom;

//hàm này được kế thừa để update member của dạng room chat với ChannelAdmin
function updatePageRoomMember(roomId, currentMembers, newMembers, userIdGuest, callback) {
    var needUpdate = false;
    newMembers.push(userIdGuest);
    newMembers = _.uniqBy(newMembers);
    if (_.isEqual(currentMembers.map(a => a.userId).sort(), newMembers.sort())) {
        needUpdate = false;
    }
    else {
        needUpdate = true;
    }
    //console.log(needUpdate);
    if (needUpdate) {
        var newMemberInfo = [];

        newMemberInfo = currentMembers.filter(function (item) {
            return newMembers.indexOf(item.userId) != -1 || item.userId == userIdGuest;
        }).map(function (a) { return { userId: a.userId, isArchived: a.isArchived, isDelete: a.isDelete, isMuted: a.isMuted, isGuest: a.isGuest, isFavorite: a.isFavorite } });

        var tempIds = newMembers.filter(function (item) {
            return currentMembers.map(a => a.userId).indexOf(item) == -1;
        })

        for (var i = 0; i < tempIds.length; i++) {
            newMemberInfo.push(generateDefaultRoomMemberModel(tempIds[i]));
        }

        if (!_.some(newMemberInfo, { userId: userIdGuest })) {
            newMemberInfo.push(generateDefaultRoomMemberModel(userIdGuest));
        }
        //console.log(newMemberInfo);

        var collection = db.get().collection(rooms);
        var oid = parseIdToObject(roomId);
        collection.findOneAndUpdate(
            { _id: oid },
            {
                $set: {
                    members: newMemberInfo
                }
            },
            {
                returnOriginal: false
            },
            function (err2, result2) {
                //console.log(err2);
                //console.log(result2);
                if (err2) {
                    callback(false);
                }
                else {
                    callback(true);
                }
            }
        );
    }
    else {
        callback(needUpdate);
    }
}

function getPageRoom(userIdGuest, pageMembers, pageId, pageName, pageLink, pageImage, userId, callback) {
    var collection = db.get().collection(rooms);

    collection.aggregate(
        [
            {
                $match: {
                    $and: [
                        { type: 'page' },
                        { userIdGuest: userIdGuest },
                        { 'page.pageId': pageId }
                    ]
                }
            },
            { $unwind: '$members' },
            { "$addFields": { "memberId": { "$toObjectId": "$members.userId" } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'memberId',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: "$userInfo" },
            {
                $group: {
                    _id: '$_id',
                    type: { $first: '$type' },
                    userIdGuest: {
                        $first: '$userIdGuest'
                    },
                    page: {
                        $first: '$page'
                    },
                    members: {
                        $push: {
                            userId: '$members.userId',
                            userInfo: {
                                name: "$userInfo.name",
                                avatar: "$userInfo.avatar",
                                phone: "$userInfo.phone",
                                _id: "$userInfo._id",
                                url: "$userInfo.url",
                                oneSignalUserIds: "$userInfo.oneSignalUserIds"
                            },
                            isArchived: '$members.isArchived',
                            isDelete: '$members.isDelete',
                            isMuted: '$members.isMuted',
                            isGuest: '$members.isGuest',
                            isFavorite: '$members.isFavorite',
                            isOwner: '$members.isOwner',
                            isAdmin: '$members.isAdmin',
                            permissions: '$members.permissions'
                        }
                    },
                    createDate: {
                        $first: '$createDate'
                    },
                    lastLogDate: {
                        $first: '$lastLogDate'
                    },
                    lastLog: {
                        $first: '$lastLog'
                    }
                }
            }
        ], function (err, docs) {
            if (err) {
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                //console.log(docs);
                //nếu chưa có thì thêm mới
                if (docs.length == 0) {
                    var doc = generatePageRoomDataModel(userIdGuest, pageMembers, pageId, pageName, pageLink, pageImage);
                    collection.insert(doc, function (err, result) {
                        if (err) {
                            errorLog.addLog(errorLog.errorType.data, err, function () { });
                            callback(resultHelper.returnResultDBError(err));
                        }
                        else {
                            doc._id = result.insertedIds[0];

                            createRoomLogIndex(doc._id);
                            //console.log('after insert');
                            //console.log(doc.members);
                            getPageRoom(userIdGuest, pageMembers, pageId, pageName, pageLink, pageImage, userId, callback);
                            //doc = parseRoomInfo(doc, userId);
                            //callback(resultHelper.returnResultSuccessAddNew(doc));
                        }
                    });
                }
                else {
                    var doc = docs[0];
                    doc = parseRoomInfo(doc, userId);

                    if (doc) {
                        updatePageRoomMember(doc._id, doc.members, pageMembers, userIdGuest, function (res) {
                            //res is need update
                            //console.log('get room from db');
                            //console.log(doc.members);
                            if (res === false) { //don't need update
                                //cache.put(generateRoomCacheKey(doc._id, userId), doc, cacheTime, function (key, value) {
                                //    console.log('room: ' + key + ' cache expire ');
                                //});
                                callback(resultHelper.returnResultSuccess(doc));
                            }
                            else {
                                getRoomById(doc._id, userId, callback);
                                //getPageRoom(userIdGuest, pageMembers, pageId, pageName, pageLink, pageImage, userId, callback);
                            }
                        });
                    }
                    else {
                        callback(resultHelper.returnResult(resultHelper.notExist));
                    }
                }
            }
        });
}
exports.getPageRoom = getPageRoom;

exports.updateChatRoomLastLogDate = function (roomId, lastLog, lastLogDate, replied, callback) {
    var collection = db.get().collection(rooms);
    var oid = parseIdToObject(roomId);
    if (replied) {
        collection.updateOne(
            {
                _id: oid
            },
            {
                $set: {
                    lastLogDate: lastLogDate,
                    lastLog: lastLog,
                    replied: replied
                }
            },
            function (err, result) {
                if (err) {
                    errorLog.addLog(errorLog.errorType.data, err, function () { });
                    callback(resultHelper.returnResultDBError(err));
                }
                else {
                    callback(resultHelper.returnResultSuccess(null));
                }
            }
        );
    }
    else {
        collection.updateOne(
            {
                _id: oid
            },
            {
                $set: {
                    lastLogDate: lastLogDate,
                    lastLog: lastLog
                }
            },
            function (err, result) {
                if (err) {
                    errorLog.addLog(errorLog.errorType.data, err, function () { });
                    callback(resultHelper.returnResultDBError(err));
                }
                else {
                    callback(resultHelper.returnResultSuccess(null));
                }
            }
        );
    }
}

exports.checkAndUpdateChatRoomLastLogContent = function (roomId, chatLogId, type, content, isDelete, callback) {
    var collection = db.get().collection(rooms);
    var oid = parseIdToObject(roomId);

    collection.findOne(
        {
            _id: oid
        },
        function (err, doc) {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                if (doc) {
                    if (doc.lastLog.chatLogId == chatLogId) {
                        collection.findOneAndUpdate(
                            { _id: oid },
                            {
                                $set: {
                                    "lastLog.type": type,
                                    "lastLog.content": content,
                                    "lastLog.isDeleted": isDelete
                                }
                            },
                            {
                                returnNewDocument: true,
                                returnOriginal: false
                            },
                            function (err2, result2) {
                                callback(resultHelper.returnResultSuccess(null));
                            }
                        )
                    }
                    else {
                        callback(resultHelper.returnResultSuccess(null));
                    }
                }
                else {
                    callback(resultHelper.returnResult(resultHelper.errorCodes.notExist));
                }
            }
        }
    );
}

function searchPrivateRecentRoom(userId, lastDate, itemCount, keyword, callback) {
    var collection = db.get().collection(rooms);

    if (!lastDate) {
        lastDate = Number.MAX_SAFE_INTEGER;
    }
    //console.log(keyword);
    collection.aggregate(
        [
            {
                $match: {
                    $and: [{
                        members: {
                            $elemMatch: {
                                userId: userId,
                                isArchived: false,
                                isDelete: false
                            }
                        }
                    },
                    { type: 'private' },
                    {
                        lastLogDate: { $lt: lastDate }
                    }, {
                        lastLog: { $exists: true }
                    }
                    ]
                }
            },
            { $unwind: '$members' },
            { "$addFields": { "memberId": { "$toObjectId": "$members.userId" } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'memberId',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: "$userInfo" },
            {
                $group: {
                    _id: '$_id',
                    type: { $first: '$type' },
                    userId1: {
                        $first: '$userId1'
                    },
                    userId2: {
                        $first: '$userId2'
                    },
                    userIdGuest: {
                        $first: '$userIdGuest'
                    },
                    userIdOwner: {
                        $first: '$userIdOwner'
                    },
                    page: {
                        $first: '$page'
                    },
                    item: {
                        $first: '$item'
                    },
                    members: {
                        $push: {
                            userId: '$members.userId',
                            userInfo: { name: "$userInfo.name", avatar: "$userInfo.avatar", phone: "$userInfo.phone", _id: "$userInfo._id", url: "$userInfo.url" },
                            isArchived: '$members.isArchived',
                            isDelete: '$members.isDelete',
                            isMuted: '$members.isMuted',
                            isGuest: '$members.isGuest',
                            isFavorite: '$members.isFavorite',
                            isOwner: '$members.isOwner',
                            isAdmin: '$members.isAdmin',
                            permissions: '$members.permissions'
                        }
                    },
                    createDate: {
                        $first: '$createDate'
                    },
                    lastLogDate: {
                        $first: '$lastLogDate'
                    },
                    lastLog: {
                        $first: '$lastLog'
                    }
                }
            },
            {
                $match: {
                    members: {
                        $elemMatch: {
                            userId: { $ne: userId },
                            'userInfo.name': { $regex: keyword, $options: 'i' }
                        }
                    }
                }
            },
            { "$addFields": { "authorId": { "$toObjectId": "$lastLog.userIdAuthor" } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'authorId',
                    foreignField: '_id',
                    as: 'lastLogAuthor'
                }
            },
            { $unwind: '$lastLogAuthor' },
            {
                $project: {
                    _id: 1,
                    type: 1,
                    members: 1,
                    userId1: 1,
                    userId2: 1,
                    item: 1,
                    page: 1,
                    userIdGuest: 1,
                    userIdOwner: 1,
                    createDate: 1,
                    lastLogDate: 1,
                    lastLog: 1,
                    lastLogAuthor: { _id: 1, name: 1, avatar: 1 },
                    roomName: 1,
                    roomAvatar: 1
                }
            }
        ])
        .toArray(function (err, docs) {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                //console.log(docs.length);
                for (var i = 0; i < docs.length; i++) {
                    docs[i] = parseRoomInfo(docs[i], userId);
                }
                //console.log(docs);
                //console.log(docs.map((item) => { return item.roomName }));
                var fileterDocs = _.filter(docs, function (item) {
                    return (item && item.roomName) ? item.roomName.match(new RegExp(keyword, 'i')) : false;
                });
                //console.log('after filter');
                //console.log(fileterDocs);
                callback(resultHelper.returnResultSuccess(fileterDocs));
            }
        });
}
exports.searchRecentChatRoomCount = function (userId, keyword, callback) {
    var collection = db.get().collection(rooms);

    collection.count({
        $and:
            [{
                members: {
                    $elemMatch: {
                        userId: userId,
                        isArchived: false,
                        isDelete: false
                    }
                }
            },
            {
                $or: [
                    { type: 'item', 'item.itemName': { $regex: keyword, $options: 'i' } },
                    { type: 'page', 'page.pageName': { $regex: keyword, $options: 'i' } },
                    { 'roomName': { $regex: keyword, $options: 'i' } }
                ]
            }
            ]
    }, function (err, count) {
        if (err) {
            errorLog.addLog(errorLog.errorType.data, err, function () { });
            callback(resultHelper.returnResultDBError(err));
        }
        else {
            searchPrivateRecentRoom(userId, null, 10000, keyword, function (resPrivate) {
                if (resPrivate.errorCode == 0) {
                    var docPrivate = resPrivate.data;
                    count += docPrivate.length;
                }

                callback(resultHelper.returnResultSuccess(count));
            });
        }
    });
}

exports.searchRecentChatRoom = function (userId, lastDate, itemCount, keyword, callback) {
    var collection = db.get().collection(rooms);

    if (!lastDate) {
        lastDate = Number.MAX_SAFE_INTEGER;
    }
    //console.log(keyword);
    collection.aggregate(
        [
            {
                $match: {
                    $and: [{
                        members: {
                            $elemMatch: {
                                userId: userId,
                                isArchived: false,
                                isDelete: false
                            }
                        }
                    },
                    {
                        lastLogDate: { $lt: lastDate }
                    },
                    {
                        lastLog: { $exists: true }
                    },
                    {
                        $or: [
                            { type: 'item', 'item.itemName': { $regex: keyword, $options: 'i' } },
                            { type: 'page', 'page.pageName': { $regex: keyword, $options: 'i' } },
                            { 'roomName': { $regex: keyword, $options: 'i' } }
                        ]
                    }
                    ]
                }
            },
            {
                $sort: { lastLogDate: - 1 }
            },
            {
                $limit: itemCount
            },
            { $unwind: '$members' },
            { "$addFields": { "memberId": { "$toObjectId": "$members.userId" } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'memberId',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            {
                $unwind: "$userInfo"
            },
            //{
            //    $match: {
            //        $or: [
            //            { type: 'item', 'item.itemName': { $regex: keyword, $options: 'i' } },
            //            { type: 'page', 'page.pageName': { $regex: keyword, $options: 'i' } },
            //            { 'roomName': { $regex: keyword, $options: 'i' } }
            //        ]
            //    }
            //},
            {
                $group: {
                    _id: '$_id',
                    type: { $first: '$type' },
                    userId1: {
                        $first: '$userId1'
                    },
                    userId2: {
                        $first: '$userId2'
                    },
                    userIdGuest: {
                        $first: '$userIdGuest'
                    },
                    userIdOwner: {
                        $first: '$userIdOwner'
                    },
                    page: {
                        $first: '$page'
                    },
                    item: {
                        $first: '$item'
                    },
                    members: {
                        $push: {
                            userId: '$members.userId',
                            userInfo: { name: "$userInfo.name", avatar: "$userInfo.avatar", phone: "$userInfo.phone", _id: "$userInfo._id", url: "$userInfo.url" },
                            isArchived: '$members.isArchived',
                            isDelete: '$members.isDelete',
                            isMuted: '$members.isMuted',
                            isGuest: '$members.isGuest',
                            isFavorite: '$members.isFavorite',
                            isOwner: '$members.isOwner',
                            isAdmin: '$members.isAdmin',
                            permissions: '$members.permissions'
                        }
                    },
                    createDate: {
                        $first: '$createDate'
                    },
                    lastLogDate: {
                        $first: '$lastLogDate'
                    },
                    lastLog: {
                        $first: '$lastLog'
                    },
                    roomName: {
                        $first: '$roomName'
                    },
                    roomAvatar: {
                        $first: '$roomAvatar'
                    }
                }
            },
            { "$addFields": { "authorId": { "$toObjectId": "$lastLog.userIdAuthor" } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'authorId',
                    foreignField: '_id',
                    as: 'LastLogAuthor'
                }
            },
            { $unwind: '$lastLogAuthor' },
            {
                $project: {
                    _id: 1,
                    type: 1,
                    members: 1,
                    userId1: 1,
                    userId2: 1,
                    item: 1,
                    page: 1,
                    userIdGuest: 1,
                    userIdOwner: 1,
                    createDate: 1,
                    lastLogDate: 1,
                    lastLog: 1,
                    lastLogAuthor: { _id: 1, name: 1, avatar: 1 },
                    roomName: 1,
                    roomAvatar: 1
                }
            }
        ])
        .sort({ lastLogDate: -1 })//.limit(itemCount)
        .toArray(function (err, docs) {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                //console.log(docs[0].members);
                for (var i = 0; i < docs.length; i++) {
                    docs[i] = parseRoomInfo(docs[i], userId);
                }

                searchPrivateRecentRoom(userId, lastDate, itemCount, keyword, function (resPrivate) {
                    if (resPrivate.errorCode == 0) {
                        var docPrivate = resPrivate.data;
                        var finalDocs = _.take(_.orderBy(docPrivate.concat(docs), ['lastLogDate'], ['desc']), itemCount);
                        callback(resultHelper.returnResultSuccess(finalDocs));
                    }
                    else {
                        callback(resultHelper.returnResultSuccess(docs));
                    }
                });
            }
        });
}

exports.getRecentChatRoom = function (userId, lastDate, itemCount, callback) {
    var collection = db.get().collection(rooms);

    if (!lastDate) {
        lastDate = Number.MAX_SAFE_INTEGER;
    }
    //console.log('param');
    //console.log(userId, lastDate, itemCount);
    collection.aggregate(
        [
            {
                $match: {
                    $and: [
                        {
                            members: {
                                $elemMatch: {
                                    userId: userId,
                                    isArchived: false,
                                    isDelete: false,
                                    isFavorite: false
                                }
                            }
                        },
                        {
                            lastLogDate: { $lt: lastDate }
                        },
                        {
                            lastLog: { $exists: true }
                        }
                    ]
                }
            },
            {
                $sort: { lastLogDate: -1 }
            },
            {
                $limit: itemCount
            },
            { $unwind: '$members' },
            { "$addFields": { "memberId": { "$toObjectId": "$members.userId" } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'memberId',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: "$userInfo" },
            {
                $group: {
                    _id: '$_id',
                    type: { $first: '$type' },
                    userId1: {
                        $first: '$userId1'
                    },
                    userId2: {
                        $first: '$userId2'
                    },
                    userIdGuest: {
                        $first: '$userIdGuest'
                    },
                    userIdOwner: {
                        $first: '$userIdOwner'
                    },
                    page: {
                        $first: '$page'
                    },
                    item: {
                        $first: '$item'
                    },
                    channelId: {
                        $first: '$channelId'
                    },
                    channelName: {
                        $first: '$channelName'
                    },
                    channelAvatar: {
                        $first: '$channelAvatar'
                    },
                    members: {
                        $push: {
                            userId: '$members.userId',
                            userInfo: { name: "$userInfo.name", avatar: "$userInfo.avatar", phone: "$userInfo.phone", _id: "$userInfo._id", url: "$userInfo.url" },
                            isArchived: '$members.isArchived',
                            isDelete: '$members.isDelete',
                            isMuted: '$members.isMuted',
                            isGuest: '$members.isGuest',
                            isFavorite: '$members.isFavorite',
                            isOwner: '$members.isOwner',
                            isAdmin: '$members.isAdmin',
                            permissions: '$members.permissions'
                        }
                    },
                    createDate: {
                        $first: '$createDate'
                    },
                    lastLogDate: {
                        $first: '$lastLogDate'
                    },
                    lastLog: {
                        $first: '$lastLog'
                    },
                    roomName: {
                        $first: '$roomName'
                    },
                    roomAvatar: {
                        $first: '$roomAvatar'
                    }
                }
            },
            { "$addFields": { "authorId": { "$toObjectId": "$lastLog.userIdAuthor" } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'authorId',
                    foreignField: '_id',
                    as: 'lastLogAuthor'
                }
            },
            { $unwind: '$lastLogAuthor' },
            {
                $project: {
                    _id: 1,
                    type: 1,
                    members: 1,
                    userId1: 1,
                    userId2: 1,
                    item: 1,
                    page: 1,
                    channelId: 1,
                    channelName: 1,
                    channelAvatar: 1,
                    userIdGuest: 1,
                    userIdOwner: 1,
                    createDate: 1,
                    lastLogDate: 1,
                    lastLog: 1,
                    lastLogAuthor: { _id: 1, name: 1, avatar: 1 },
                    roomName: 1,
                    roomAvatar: 1
                }
            }
        ]
        //, { explain: true }
    )
        .sort({ lastLogDate: -1 })//.limit(itemCount)
        .toArray(function (err, docs) {
            //console.log(docs[0].stages[0].$cursor.queryPlanner.winningPlan.inputStage.filter);
            //console.log(docs[0].stages[0].$cursor.queryPlanner.winningPlan.inputStage.inputStage);

            //console.log(err);
            //console.log(docs);
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                //console.log('members');
                for (var i = 0; i < docs.length; i++) {

                    //console.log(docs[i].members);
                    docs[i] = parseRoomInfo(docs[i], userId, true);
                }

                callback(resultHelper.returnResultSuccess(docs));
            }
        });

}

//channel recent
exports.searchRecentChannel = function (userId, lastDate, itemCount, keyword, callback) {
    var collection = db.get().collection(rooms);

    if (!lastDate) {
        lastDate = Number.MAX_SAFE_INTEGER;
    }
    //console.log(keyword);
    collection.aggregate(
        [
            {
                $match: {
                    $and: [
                        {
                            type: 'channel'
                        },
                        {
                            members: {
                                $elemMatch: {
                                    userId: userId,
                                    isArchived: false,
                                    isDelete: false
                                }
                            }
                        },
                        {
                            lastLogDate: { $lt: lastDate }
                        },
                        {
                            lastLog: { $exists: true }
                        },
                        {
                            $or: [
                                { 'roomName': { $regex: keyword, $options: 'i' } }
                                //{ type: 'item', 'item.itemName': { $regex: keyword, $options: 'i' } },
                                //{ type: 'page', 'page.pageName': { $regex: keyword, $options: 'i' } },
                                //{ type: 'custom', 'roomName': { $regex: keyword, $options: 'i' } }
                            ]
                        }
                    ]
                }
            },
            {
                $sort: { lastLogDate: - 1 }
            },
            {
                $limit: itemCount
            },
            { $unwind: '$members' },
            { "$addFields": { "memberId": { "$toObjectId": "$members.userId" } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'memberId',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            {
                $unwind: "$userInfo"
            },
            //{
            //    $match: {
            //        $or: [
            //            { 'roomName': { $regex: keyword, $options: 'i' } }
            //            //{ type: 'item', 'item.itemName': { $regex: keyword, $options: 'i' } },
            //            //{ type: 'page', 'page.pageName': { $regex: keyword, $options: 'i' } },
            //            //{ type: 'custom', 'roomName': { $regex: keyword, $options: 'i' } }
            //        ]
            //    }
            //},
            {
                $group: {
                    _id: '$_id',
                    type: { $first: '$type' },
                    userId1: {
                        $first: '$userId1'
                    },
                    userId2: {
                        $first: '$userId2'
                    },
                    userIdGuest: {
                        $first: '$userIdGuest'
                    },
                    userIdOwner: {
                        $first: '$userIdOwner'
                    },
                    page: {
                        $first: '$page'
                    },
                    item: {
                        $first: '$item'
                    },
                    members: {
                        $push: {
                            userId: '$members.userId',
                            userInfo: { name: "$userInfo.name", avatar: "$userInfo.avatar", phone: "$userInfo.phone", _id: "$userInfo._id", url: "$userInfo.url" },
                            isArchived: '$members.isArchived',
                            isDelete: '$members.isDelete',
                            isMuted: '$members.isMuted',
                            isGuest: '$members.isGuest',
                            isFavorite: '$members.isFavorite',
                            isOwner: '$members.isOwner',
                            isAdmin: '$members.isAdmin',
                            permissions: '$members.permissions'
                        }
                    },
                    createDate: {
                        $first: '$createDate'
                    },
                    lastLogDate: {
                        $first: '$lastLogDate'
                    },
                    lastLog: {
                        $first: '$lastLog'
                    },
                    roomName: {
                        $first: '$roomName'
                    },
                    roomAvatar: {
                        $first: '$roomAvatar'
                    }
                }
            },
            { "$addFields": { "authorId": { "$toObjectId": "$lastLog.userIdAuthor" } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'authorId',
                    foreignField: '_id',
                    as: 'lastLogAuthor'
                }
            },
            { $unwind: '$lastLogAuthor' },
            {
                $project: {
                    _id: 1,
                    type: 1,
                    members: 1,
                    userId1: 1,
                    userId2: 1,
                    item: 1,
                    page: 1,
                    userIdGuest: 1,
                    userIdOwner: 1,
                    createDate: 1,
                    lastLogDate: 1,
                    lastLog: 1,
                    lastLogAuthor: { _id: 1, name: 1, avatar: 1 },
                    roomName: 1,
                    roomAvatar: 1
                }
            }
        ])
        .sort({ lastLogDate: -1 })//.limit(itemCount)
        .toArray(function (err, docs) {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                //console.log(docs[0].members);
                for (var i = 0; i < docs.length; i++) {
                    docs[i] = parseRoomInfo(docs[i], userId, true);
                }

                searchPrivateRecentRoom(userId, lastDate, itemCount, keyword, function (resPrivate) {
                    if (resPrivate.errorCode == 0) {
                        var docPrivate = resPrivate.data;
                        var finalDocs = _.take(_.orderBy(docPrivate.concat(docs), ['lastLogDate'], ['desc']), itemCount);
                        callback(resultHelper.returnResultSuccess(finalDocs));
                    }
                    else {
                        callback(resultHelper.returnResultSuccess(docs));
                    }
                });
            }
        });
}



exports.getRecentChannel = function (userId, lastDate, itemCount, callback) {
    var collection = db.get().collection(rooms);

    if (!lastDate) {
        lastDate = Number.MAX_SAFE_INTEGER;
    }

    collection.aggregate(
        [
            {
                $match: {
                    $and: [
                        {
                            type: 'channel'
                        },
                        {
                            members: {
                                $elemMatch: {
                                    userId: userId,
                                    isArchived: false,
                                    isDelete: false,
                                    isFavorite: false
                                }
                            }
                        },
                        {
                            lastLogDate: { $lt: lastDate }
                        },
                        {
                            lastLog: { $exists: true }
                        }
                    ]
                }
            },
            {
                $sort: { lastLogDate: - 1 }
            },
            {
                $limit: itemCount
            },
            { $unwind: '$members' },
            { "$addFields": { "memberId": { "$toObjectId": "$members.userId" } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'memberId',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: "$userInfo" },
            {
                $group: {
                    _id: '$_id',
                    type: { $first: '$type' },
                    userId1: {
                        $first: '$userId1'
                    },
                    userId2: {
                        $first: '$userId2'
                    },
                    userIdGuest: {
                        $first: '$userIdGuest'
                    },
                    userIdOwner: {
                        $first: '$userIdOwner'
                    },
                    page: {
                        $first: '$page'
                    },
                    item: {
                        $first: '$item'
                    },
                    channelId: {
                        $first: '$channelId'
                    },
                    channelName: {
                        $first: '$channelName'
                    },
                    channelAvatar: {
                        $first: '$channelAvatar'
                    },
                    members: {
                        $push: {
                            userId: '$members.userId',
                            userInfo: { name: "$userInfo.name", avatar: "$userInfo.avatar", phone: "$userInfo.phone", _id: "$userInfo._id", url: "$userInfo.url" },
                            isArchived: '$members.isArchived',
                            isDelete: '$members.isDelete',
                            isMuted: '$members.isMuted',
                            isGuest: '$members.isGuest',
                            isFavorite: '$members.isFavorite',
                            isOwner: '$members.isOwner',
                            isAdmin: '$members.isAdmin',
                            permissions: '$members.permissions'
                        }
                    },
                    createDate: {
                        $first: '$createDate'
                    },
                    lastLogDate: {
                        $first: '$lastLogDate'
                    },
                    lastLog: {
                        $first: '$lastLog'
                    },
                    roomName: {
                        $first: '$roomName'
                    },
                    roomAvatar: {
                        $first: '$roomAvatar'
                    }
                }
            },
            { "$addFields": { "authorId": { "$toObjectId": "$lastLog.userIdAuthor" } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'authorId',
                    foreignField: '_id',
                    as: 'lastLogAuthor'
                }
            },
            { $unwind: '$lastLogAuthor' },
            {
                $project: {
                    _id: 1,
                    type: 1,
                    members: 1,
                    userId1: 1,
                    userId2: 1,
                    item: 1,
                    page: 1,
                    userIdGuest: 1,
                    userIdOwner: 1,
                    createDate: 1,
                    lastLogDate: 1,
                    lastLog: 1,
                    lastLogAuthor: { _id: 1, name: 1, avatar: 1 },
                    roomName: 1,
                    roomAvatar: 1
                }
            }
        ])
        .sort({ lastLogDate: -1 })//.limit(itemCount)
        .toArray(function (err, docs) {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                //console.log(docs[0].members);
                for (var i = 0; i < docs.length; i++) {
                    docs[i] = parseRoomInfo(docs[i], userId, true);
                }
                callback(resultHelper.returnResultSuccess(docs));
            }
        });
}

//recent group
exports.searchRecentGroup = function (userId, lastDate, itemCount, keyword, callback) {
    var collection = db.get().collection(rooms);

    if (!lastDate) {
        lastDate = Number.MAX_SAFE_INTEGER;
    }
    //console.log(keyword);
    collection.aggregate(
        [
            {
                $match: {
                    $and: [
                        {
                            type: { $in: ['custom', 'item', 'page'] }
                        },
                        {
                            members: {
                                $elemMatch: {
                                    userId: userId,
                                    isArchived: false,
                                    isDelete: false
                                }
                            }
                        },
                        {
                            lastLogDate: { $lt: lastDate }
                        },
                        {
                            lastLog: { $exists: true }
                        },
                        {
                            $or: [
                                { type: 'item', 'item.itemName': { $regex: keyword, $options: 'i' } },
                                { type: 'page', 'page.pageName': { $regex: keyword, $options: 'i' } },
                                { 'roomName': { $regex: keyword, $options: 'i' } }
                            ]
                        }
                    ]
                }
            },
            {
                $sort: { lastLogDate: - 1 }
            },
            {
                $limit: itemCount
            },
            { $unwind: '$members' },
            { "$addFields": { "memberId": { "$toObjectId": "$members.userId" } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'memberId',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            {
                $unwind: "$userInfo"
            },
            //{
            //    $match: {
            //        $or: [
            //            { type: 'item', 'item.itemName': { $regex: keyword, $options: 'i' } },
            //            { type: 'page', 'page.pageName': { $regex: keyword, $options: 'i' } },
            //            { 'roomName': { $regex: keyword, $options: 'i' } }
            //        ]
            //    }
            //},
            {
                $group: {
                    _id: '$_id',
                    type: { $first: '$type' },
                    userId1: {
                        $first: '$userId1'
                    },
                    userId2: {
                        $first: '$userId2'
                    },
                    userIdGuest: {
                        $first: '$userIdGuest'
                    },
                    userIdOwner: {
                        $first: '$userIdOwner'
                    },
                    page: {
                        $first: '$page'
                    },
                    item: {
                        $first: '$item'
                    },
                    members: {
                        $push: {
                            userId: '$members.userId',
                            userInfo: { name: "$userInfo.name", avatar: "$userInfo.avatar", phone: "$userInfo.phone", _id: "$userInfo._id", url: "$userInfo.url" },
                            isArchived: '$members.isArchived',
                            isDelete: '$members.isDelete',
                            isMuted: '$members.isMuted',
                            isGuest: '$members.isGuest',
                            isFavorite: '$members.isFavorite',
                            isOwner: '$members.isOwner',
                            isAdmin: '$members.isAdmin',
                            permissions: '$members.permissions'
                        }
                    },
                    createDate: {
                        $first: '$createDate'
                    },
                    lastLogDate: {
                        $first: '$lastLogDate'
                    },
                    lastLog: {
                        $first: '$lastLog'
                    },
                    roomName: {
                        $first: '$roomName'
                    },
                    roomAvatar: {
                        $first: '$roomAvatar'
                    }
                }
            },
            { "$addFields": { "authorId": { "$toObjectId": "$lastLog.userIdAuthor" } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'authorId',
                    foreignField: '_id',
                    as: 'lastLogAuthor'
                }
            },
            { $unwind: '$lastLogAuthor' },
            {
                $project: {
                    _id: 1,
                    type: 1,
                    members: 1,
                    userId1: 1,
                    userId2: 1,
                    item: 1,
                    page: 1,
                    userIdGuest: 1,
                    userIdOwner: 1,
                    createDate: 1,
                    lastLogDate: 1,
                    lastLog: 1,
                    lastLogAuthor: { _id: 1, name: 1, avatar: 1 },
                    roomName: 1,
                    roomAvatar: 1
                }
            }
        ])
        .sort({ lastLogDate: -1 })//.limit(itemCount)
        .toArray(function (err, docs) {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                //console.log(docs[0].members);
                for (var i = 0; i < docs.length; i++) {
                    docs[i] = parseRoomInfo(docs[i], userId, true);
                }

                searchPrivateRecentRoom(userId, lastDate, itemCount, keyword, function (resPrivate) {
                    if (resPrivate.errorCode == 0) {
                        var docPrivate = resPrivate.data;
                        var finalDocs = _.take(_.orderBy(docPrivate.concat(docs), ['lastLogDate'], ['desc']), itemCount);
                        callback(resultHelper.returnResultSuccess(finalDocs));
                    }
                    else {
                        callback(resultHelper.returnResultSuccess(docs));
                    }
                });
            }
        });
}



exports.getRecentGroup = function (userId, lastDate, itemCount, callback) {
    var collection = db.get().collection(rooms);

    if (!lastDate) {
        lastDate = Number.MAX_SAFE_INTEGER;
    }

    collection.aggregate(
        [
            {
                $match: {
                    $and: [
                        {
                            type: { $in: ['custom', 'item', 'page'] }
                        },
                        {
                            members: {
                                $elemMatch: {
                                    userId: userId,
                                    isArchived: false,
                                    isDelete: false,
                                    isFavorite: false
                                }
                            }
                        },
                        {
                            lastLogDate: { $lt: lastDate }
                        },
                        {
                            lastLog: { $exists: true }
                        }
                    ]
                }
            },
            {
                $sort: { lastLogDate: - 1 }
            },
            {
                $limit: itemCount
            },
            { $unwind: '$members' },
            { "$addFields": { "memberId": { "$toObjectId": "$members.userId" } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'memberId',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: "$userInfo" },
            {
                $group: {
                    _id: '$_id',
                    type: { $first: '$type' },
                    userId1: {
                        $first: '$userId1'
                    },
                    userId2: {
                        $first: '$userId2'
                    },
                    userIdGuest: {
                        $first: '$userIdGuest'
                    },
                    userIdOwner: {
                        $first: '$userIdOwner'
                    },
                    page: {
                        $first: '$page'
                    },
                    item: {
                        $first: '$item'
                    },
                    channelId: {
                        $first: '$channelId'
                    },
                    channelName: {
                        $first: '$channelName'
                    },
                    channelAvatar: {
                        $first: '$channelAvatar'
                    },
                    members: {
                        $push: {
                            userId: '$members.userId',
                            userInfo: { name: "$userInfo.name", avatar: "$userInfo.avatar", phone: "$userInfo.phone", _id: "$userInfo._id", url: "$userInfo.url" },
                            isArchived: '$members.isArchived',
                            isDelete: '$members.isDelete',
                            isMuted: '$members.isMuted',
                            isGuest: '$members.isGuest',
                            isFavorite: '$members.isFavorite',
                            isOwner: '$members.isOwner',
                            isAdmin: '$members.isAdmin',
                            permissions: '$members.permissions'
                        }
                    },
                    createDate: {
                        $first: '$createDate'
                    },
                    lastLogDate: {
                        $first: '$lastLogDate'
                    },
                    lastLog: {
                        $first: '$lastLog'
                    },
                    roomName: {
                        $first: '$roomName'
                    },
                    roomAvatar: {
                        $first: '$roomAvatar'
                    }
                }
            },

            { "$addFields": { "authorId": { "$toObjectId": "$lastLog.userIdAuthor" } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'authorId',
                    foreignField: '_id',
                    as: 'lastLogAuthor'
                }
            },
            { $unwind: '$lastLogAuthor' },
            {
                $project: {
                    _id: 1,
                    type: 1,
                    members: 1,
                    userId1: 1,
                    userId2: 1,
                    item: 1,
                    page: 1,
                    userIdGuest: 1,
                    userIdOwner: 1,
                    createDate: 1,
                    lastLogDate: 1,
                    lastLog: 1,
                    lastLogAuthor: { _id: 1, name: 1, avatar: 1 },
                    roomName: 1,
                    roomAvatar: 1
                }
            }
        ])
        .sort({ lastLogDate: -1 })//.limit(itemCount)
        .toArray(function (err, docs) {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                //console.log(docs[0].members);
                for (var i = 0; i < docs.length; i++) {
                    docs[i] = parseRoomInfo(docs[i], userId, true);
                }
                callback(resultHelper.returnResultSuccess(docs));
            }
        });

}

exports.setRoomFavorite = function (userId, roomId, isFavorite, callback) {
    var collection = db.get().collection(rooms);
    var oid = parseIdToObject(roomId);
    collection.findOne(
        { _id: oid },
        function (err, item) {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                if (item) {
                    for (var i = 0; i < item.members.length; i++) {
                        if (item.members[i].userId == userId) {
                            item.members[i].isFavorite = isFavorite;
                        }
                    }
                    collection.save(item, (errX, res) => {
                        if (errX) {
                            errorLog.addLog(errorLog.errorType.data, errX, function () { });
                            callback(resultHelper.returnResultDBError(errX));
                        }
                        else {
                            callback(resultHelper.returnResultSuccess(null));
                        }
                    });
                }
                else {
                    callback(resultHelper.returnResultNotExists({ roomId: true }));
                }
            }
        });
}

exports.getFavoriteRecentChatRoom = function (userId, lastDate, itemCount, callback) {
    var collection = db.get().collection(rooms);
    if (!lastDate) {
        lastDate = Number.MAX_SAFE_INTEGER;
    }

    collection.aggregate(
        [
            {
                $match: {
                    $and: [{
                        members: {
                            $elemMatch: {
                                userId: userId,
                                isArchived: false,
                                isDelete: false,
                                isFavorite: true
                            }
                        }
                    },
                    {
                        lastLogDate: { $lt: lastDate }
                    }
                    ]
                }
            },
            {
                $sort: { lastLogDate: - 1 }
            },
            {
                $limit: itemCount
            },
            { $unwind: '$members' },
            { "$addFields": { "memberId": { "$toObjectId": "$members.userId" } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'memberId',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: "$userInfo" },
            {
                $group: {
                    _id: '$_id',
                    type: { $first: '$type' },
                    userId1: {
                        $first: '$userId1'
                    },
                    userId2: {
                        $first: '$userId2'
                    },
                    userIdGuest: {
                        $first: '$userIdGuest'
                    },
                    userIdOwner: {
                        $first: '$userIdOwner'
                    },
                    page: {
                        $first: '$page'
                    },
                    item: {
                        $first: '$item'
                    },
                    members: {
                        $push: {
                            userId: '$members.userId',
                            userInfo: { name: "$userInfo.name", avatar: "$userInfo.avatar", phone: "$userInfo.phone", _id: "$userInfo._id", url: "$userInfo.url" },
                            isArchived: '$members.isArchived',
                            isDelete: '$members.isDelete',
                            isMuted: '$members.isMuted',
                            isGuest: '$members.isGuest',
                            isFavorite: '$members.isFavorite',
                            isOwner: '$members.isOwner',
                            isAdmin: '$members.isAdmin',
                            permissions: '$members.permissions'
                        }
                    },
                    createDate: {
                        $first: '$createDate'
                    },
                    lastLogDate: {
                        $first: '$lastLogDate'
                    },
                    lastLog: {
                        $first: '$lastLog'
                    },
                    roomName: {
                        $first: '$roomName'
                    },
                    roomAvatar: {
                        $first: '$roomAvatar'
                    }
                }
            },
            { "$addFields": { "authorId": { "$toObjectId": "$lastLog.userIdAuthor" } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'authorId',
                    foreignField: '_id',
                    as: 'lastLogAuthor'
                }
            },
            { $unwind: '$lastLogAuthor' },
            {
                $project: {
                    _id: 1,
                    type: 1,
                    members: 1,
                    userId1: 1,
                    userId2: 1,
                    item: 1,
                    page: 1,
                    userIdGuest: 1,
                    userIdOwner: 1,
                    createDate: 1,
                    lastLogDate: 1,
                    lastLog: 1,
                    lastLogAuthor: { _id: 1, name: 1, avatar: 1 },
                    roomName: 1,
                    roomAvatar: 1
                }
            }
        ])
        .sort({ lastLogDate: -1 })//.limit(itemCount)
        .toArray(function (err, docs) {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                //console.log(docs[0].members);
                for (var i = 0; i < docs.length; i++) {
                    docs[i] = parseRoomInfo(docs[i], userId, true);
                }
                callback(resultHelper.returnResultSuccess(docs));
            }
        });
}

exports.setRoomArchive = function (userId, roomId, isArchive, callback) {
    var collection = db.get().collection(rooms);
    collection.updateOne(
        { _id: oid, "members.userId": userId },
        {
            $update: {
                "members.$.isArchived": isArchived
            }
        },
        function (err, result) {
            if (err) {
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                callback(resultHelper.returnResultSuccess(null));
            }
        });
}

exports.setRoomMute = function (userId, roomId, isMuted, callback) {
    //cache.del(generateRoomCacheKey(roomId, userId));
    var collection = db.get().collection(rooms);
    var oid = parseIdToObject(roomId);
    collection.updateOne(
        { _id: oid, "members.userId": userId },
        {
            $set: {
                "members.$.isMuted": isMuted
            }
        },
        function (err, result) {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                callback(resultHelper.returnResultSuccess(null));
            }
        });
}

//----------------
//nhóm tự tạo
function createCustomChat(userId, members, roomName, roomAvatar, callback) {
    var collection = db.get().collection(rooms);
    var doc = generateCustomRoomDataModel(userId, members, roomName, roomAvatar);
    console.log('create custom chat in model');
    console.log(doc);
    collection.insert(doc, function (err, result) {
        if (err) {
            errorLog.addLog(errorLog.errorType.data, err, function () { });
            callback(resultHelper.returnResultDBError(err));
        }
        else {
            doc._id = result.insertedIds[0];
            //console.log('after insert');
            //console.log(doc.members);
            getRoomById(doc._id, userId, callback);
            //doc = parseRoomInfo(doc, userId);
            //callback(resultHelper.returnResultSuccessAddNew(doc));
        }
    });
}
exports.createCustomChat = createCustomChat;

function renameChatRoom(userId, roomId, roomName, callback) {
    //cache.del(generateRoomCacheKey(roomId, userId));
    var collection = db.get().collection(rooms);
    var oid = parseIdToObject(roomId);
    collection.findOneAndUpdate(
        { _id: oid },
        {
            $set: {
                "roomName": roomName
            }
        },
        {
            returnOriginal: false
        },
        function (err, result) {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                callback(resultHelper.returnResultSuccess(null));
            }
        }
    )
}

exports.renameChatRoom = renameChatRoom;

function changeAvatarChatRoom(userId, roomId, roomAvatar, callback) {
    cache.del(generateRoomCacheKey(roomId, userId));
    var collection = db.get().collection(rooms);
    var oid = parseIdToObject(roomId);
    collection.findOneAndUpdate(
        { _id: oid },
        {
            $set: {
                "roomAvatar": roomAvatar
            }
        },
        {
            returnOriginal: false
        },
        function (err, result) {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                callback(resultHelper.returnResultSuccess(null));
            }
        }
    )
}

exports.changeAvatarChatRoom = changeAvatarChatRoom;

exports.changeChatRoomDescription = function changeChatRoomDescription(userId, roomId, description, callback) {
    cache.del(generateRoomCacheKey(roomId, userId));
    var collection = db.get().collection(rooms);
    var oid = parseIdToObject(roomId);
    collection.findOneAndUpdate(
        { _id: oid },
        {
            $set: {
                "description": description
            }
        },
        {
            returnOriginal: false
        },
        function (err, result) {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                callback(resultHelper.returnResultSuccess(null));
            }
        }
    )
}

exports.changeJoinLink = function changeJoinLink(userId, roomId, joinLink, callback) {
    cache.del(generateRoomCacheKey(roomId, userId));
    if (!joinLink) {
        joinLink = getChannelJoinLinkSuffix(joinLink);
    }

    var collection = db.get().collection(rooms);
    var oid = parseIdToObject(roomId);
    collection.findOneAndUpdate(
        { _id: oid },
        {
            $set: {
                "joinLink": joinLink
            }
        },
        {
            returnOriginal: false
        },
        function (err, result) {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                callback(resultHelper.returnResultSuccess(generateChannelPrivateJoinLink(joinLink)));
            }
        }
    )
}

exports.checkJoinLinkAvaiable = function checkJoinLinkAvaiable(userId, roomId, joinLink, callback) {
    var collection = db.get().collection(rooms);
    collection.findOne(
        {
            joinLink: joinLink
        },
        function (err, doc) {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                var isAvailabe = true;
                if (doc) {

                    if (doc._id.toString() != roomId) {
                        isAvailabe = false;
                    }
                }
                callback(resultHelper.returnResultSuccess(isAvailabe));
            }
        }
    )
}

//2018-02-07: cập nhật bằng hàm member kèm quyền
function addChatRoomMember(userId, roomId, memberInfo, callback) {
    cache.del(generateRoomCacheKey(roomId, userId));
    var collection = db.get().collection(rooms);
    var oid = parseIdToObject(roomId);

    collection.findOne(
        {
            _id: oid
        },
        function (err, doc) {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else if (doc) {
                var userItem = doc.members.find(function (val) { return val.userId == userId });
                if (!doc.onlyAdminAddUser || (userItem && userItem.isAdmin && userItem.permissions && userItem.permissions.addUsers)) {
                    var inBannedList = _.some(doc.banned, {
                        userId: memberInfo.userId
                    });

                    if (inBannedList) {
                        callback(resultHelper.returnResultPermission("User đang bị Banned"));
                    }
                    else {
                        //user.updateUser(memberInfo.userId, memberInfo.name, memberInfo.phone, memberInfo.email, memberInfo.avatar, memberInfo.url, '', null, function (res) {

                        var member = generateGroupRoomMemberWithPermission(memberInfo.userId, false, false);
                        collection.findOne(
                            {
                                _id: oid,
                                members: {
                                    $elemMatch: { userId: memberInfo.userId }
                                }
                            },
                            function (err, doc) {
                                if (doc) {
                                    callback(resultHelper.returnResult(resultHelper.errorCodes.exist, 'Member đã có trong Group'));
                                }
                                else {
                                    var oid = parseIdToObject(roomId);
                                    collection.findOneAndUpdate(
                                        { _id: oid },
                                        {
                                            $addToSet: {
                                                "members": member
                                            }
                                        },
                                        {
                                            returnOriginal: false
                                        },
                                        function (err, result) {
                                            if (err) {
                                                errorLog.addLog(errorLog.errorType.data, err, function () { });
                                                callback(resultHelper.returnResultDBError(err));
                                            }
                                            else {
                                                callback(resultHelper.returnResultSuccess(null));
                                            }
                                        }
                                    )
                                }
                            }
                        );
                        //});
                    }
                }
                else {
                    callback(resultHelper.returnResultPermission("Not permission"));
                }
            }
            else {
                callback(resultHelper.returnResultNotExists("Room not exists"));
            }
        }
    );
}

exports.addChatRoomMember = addChatRoomMember;

function removeChatRoomMember(userId, roomId, memberInfo, callback) {
    cache.del(generateRoomCacheKey(roomId, userId));
    var collection = db.get().collection(rooms);
    var oid = parseIdToObject(roomId);

    var removedUserId = memberInfo.userId ? memberInfo.userId : memberInfo._id;
    if (removedUserId) {
        removedUserId = removedUserId.toString();
    }

    collection.findOne(
        {
            _id: oid
        },
        function (err, doc) {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else if (doc) {
                var userItem = doc.members.find(function (val) { return val.userId == userId });
                if (userId == removedUserId || (userItem && userItem.isAdmin && userItem.permissions && userItem.permissions.addUsers)) {

                    collection.findOneAndUpdate(
                        { _id: oid },
                        {
                            $pull: {
                                "members": { userId: removedUserId }
                            }
                        },
                        {
                            returnOriginal: false
                        },
                        function (err, result) {

                            if (err) {
                                errorLog.addLog(errorLog.errorType.data, err, function () { });
                                callback(resultHelper.returnResultDBError(err));
                            }
                            else {
                                callback(resultHelper.returnResultSuccess(null));
                            }
                        }
                    );
                }
                else {
                    callback(resultHelper.returnResultPermission("Not permission"));
                }
            }
            else {
                callback(resultHelper.returnResultNotExists("Room not exists"));
            }
        }
    );
}
exports.removeChatRoomMember = removeChatRoomMember;

function addChannelMember(userId, roomId, memberInfo, callback) {
    cache.del(generateRoomCacheKey(roomId, userId));
    var collection = db.get().collection(rooms);

    //user.updateUser(memberInfo.userId, memberInfo.name, memberInfo.phone, memberInfo.email, memberInfo.avatar, memberInfo.url, '', null, function (res) {
    var oid = parseIdToObject(roomId);
    var member = generateChannelRoomMemberWithPermission(memberInfo.userId, false, false);
    collection.findOne(
        {
            _id: oid
        },
        function (err, doc) {
            if (doc) {
                var exists = doc.members.find(function (x) {
                    return x.userId == memberInfo.userId;
                });

                if (exists) {
                    callback(resultHelper.returnResult(resultHelper.errorCodes.exist, 'Member đã có trong Group'));
                }
                else {
                    var isBanned = doc.banned ? doc.banned.find(function (x) {
                        return x.userId == memberInfo.userId
                    }) ? true : false : false;
                    if (isBanned) {
                        callback(resultHelper.returnResultPermission('User đang bị Ban, không thể tham gia được!'));
                    }
                    else {
                        collection.findOneAndUpdate(
                            { _id: oid },
                            {
                                $addToSet: {
                                    "members": member
                                }
                            },
                            {
                                returnOriginal: false
                            },
                            function (err, result) {
                                if (err) {
                                    errorLog.addLog(errorLog.errorType.data, err, function () { });
                                    callback(resultHelper.returnResultDBError(err));
                                }
                                else {
                                    callback(resultHelper.returnResultSuccess(null));
                                }
                            }
                        );
                    }
                }
            }
            else {
                callback(resultHelper.returnResultNotExists('Room ko tồn tại'));
            }
        }
    );
    //});
}
exports.addChannelMember = addChannelMember;

function checkIsRoomMember(userId, roomId, callback) {
    if (userId) {
        userId = userId.toString();
    }
    var collection = db.get().collection(rooms);
    try {
        var oid = parseIdToObject(roomId);
        var doc = collection.findOne(
            {
                _id: oid,
                members: {
                    $elemMatch: { userId: userId }
                }
            },
            function (err, res) {
                if (res) {
                    callback(true);
                }
                else {
                    callback(false);
                }
            });
    }
    catch (ex) {
        callback(false);
    }
}

exports.checkIsRoomMember = checkIsRoomMember;

//-----------------------
//cấu hình room
function configRoomNotify(userId, roomId, enableNotify, callback) {

}

exports.configRoomNotify = configRoomNotify;

//lấy thông tin room từ Link
exports.getRoomFromJoinLink = function getRoomFromJoinLink(joinLink, userId, callback) {
    var collection = db.get().collection(rooms);
    collection.findOne(
        {
            joinLink: joinLink
        },
        function (err, doc) {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                if (doc) {
                    doc = parseRoomInfo(doc, userId, true);
                    callback(resultHelper.returnResultSuccess(doc));
                }
                else {
                    callback(resultHelper.returnResultNotExists('Link invalid or revoked'));
                }
            }
        }
    );
}

function updateGroup(userId, roomId, isPrivate, roomName, description, joinLink, onlyAdminAddUser, callback) {
    if (userId) {
        userId = userId.toString();
    }
    cache.del(generateRoomCacheKey(roomId, userId));
    var collection = db.get().collection(rooms);
    var oid = parseIdToObject(roomId);
    if (joinLink) {
        joinLink = getChannelJoinLinkSuffix(joinLink);
    }
    collection.findOne(
        {
            _id: oid
        },
        function (err, doc) {

            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else if (doc) {
                var userItem = doc.members.find(function (val) { return val.userId == userId });
                if (userItem.isOwner || (userItem.isAdmin && userItem.permissions && userItem.permissions.editInfo)) {
                    collection.findOneAndUpdate(
                        { _id: oid },
                        {
                            $set: {
                                "roomName": roomName,
                                "isPrivate": isPrivate,
                                "description": description,
                                "joinLink": joinLink,
                                "onlyAdminAddUser": onlyAdminAddUser
                            }
                        },
                        {

                        },
                        function (err, result) {
                            if (err) {
                                errorLog.addLog(errorLog.errorType.data, err, function () { });
                                callback(resultHelper.returnResultDBError(err));
                            }
                            else {
                                //console.log(result);
                                getRoomById(doc._id, userId, callback);
                                callback(resultHelper.returnResultSuccess(doc));
                            }
                        }
                    );
                }
                else {
                    callback(resultHelper.returnResultPermission('Không có quyền update'));
                }
            }
            else {
                callback(resultHelper.returnResultPermission('Channel không tồn tại!'));
            }
        });
}

exports.updateGroup = updateGroup;

//channel
function createChannel(userId, members, isPrivate, roomName, roomAvatar, description, joinLink, signMessage, callback) {

    var collection = db.get().collection(rooms);
    joinLink = getChannelJoinLinkSuffix(joinLink);
    var doc = generateChannelDataModel(userId, members, isPrivate, roomName, roomAvatar, description, joinLink, signMessage);
    collection.insert(doc, function (err, result) {
        if (err) {
            errorLog.addLog(errorLog.errorType.data, err, function () { });
            callback(resultHelper.returnResultDBError(err));
        }
        else {
            doc._id = result.insertedIds[0];
            //console.log('after insert');
            //console.log(doc.members);
            //console.log(doc);
            getRoomById(doc._id, userId, callback);
            //doc = parseRoomInfo(doc, userId);
            //callback(resultHelper.returnResultSuccessAddNew(doc));
        }
    });
}

exports.createChannel = createChannel;

function updateChannel(userId, roomId, isPrivate, roomName, description, joinLink, signMessage, callback) {
    cache.del(generateRoomCacheKey(roomId, userId));
    var collection = db.get().collection(rooms);
    var oid = parseIdToObject(roomId);
    if (joinLink) {
        joinLink = getChannelJoinLinkSuffix(joinLink);
    }
    collection.findOne(
        {
            _id: oid
        },
        function (err, doc) {

            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else if (doc) {
                var userItem = doc.members.find(function (val) { return val.userId == userId });
                if (userItem.isOwner || (userItem.isAdmin && userItem.permissions && userItem.permissions.editInfo)) {

                    collection.findOneAndUpdate(
                        { _id: oid },
                        {
                            $set: {
                                "roomName": roomName,
                                "isPrivate": isPrivate,
                                "description": description,
                                "joinLink": joinLink,
                                "signMessage": signMessage
                            }
                        },
                        {

                        },
                        function (err, result) {
                            console.log('error');
                            console.log(err);
                            if (err) {
                                errorLog.addLog(errorLog.errorType.data, err, function () { });
                                callback(resultHelper.returnResultDBError(err));
                            }
                            else {
                                //console.log(result);
                                getRoomById(doc._id, userId, callback);
                                //callback(resultHelper.returnResultSuccess(doc));
                            }
                        }
                    );
                }
                else {
                    callback(resultHelper.returnResultPermission('Không có quyền update'));
                }
            }
            else {
                callback(resultHelper.returnResultPermission('Channel không tồn tại!'));
            }
        });
}

exports.updateChannel = updateChannel;

//set admin
exports.setAdmin = function setAdmin(actionUserId, userId, roomId, permissions, callback) {
    cache.del(generateRoomCacheKey(roomId, userId));
    var collection = db.get().collection(rooms);
    var oid = parseIdToObject(roomId);

    if (oid) {
        collection.findOne(
            {
                _id: oid
            },
            function (errF, doc) {
                if (errF) {
                    errorLog.addLog(errorLog.errorType.data, errF, function () { });
                    callback(resultHelper.returnResultDBError(errF));
                }
                else if (doc) {
                    var canSetAdmin = _.some(doc.members, {
                        userId: actionUserId,
                        isAdmin: true,
                        permissions: {
                            addNewAdmins: true
                        }
                    });

                    if (doc.userIdOwner == actionUserId || canSetAdmin) {
                        collection.update(
                            {
                                _id: oid,
                                members: {
                                    $elemMatch: { userId: userId }
                                }
                            },
                            {
                                $set: {
                                    'members.$.isAdmin': true,
                                    'members.$.permissions': permissions
                                }
                            },
                            function (err, res) {
                                if (err) {
                                    errorLog.addLog(errorLog.errorType.data, err, function () { });
                                    callback(resultHelper.returnResultDBError(err));
                                }
                                else {
                                    callback(resultHelper.returnResultSuccess(true));
                                }
                            }
                        );
                    }
                    else {
                        callback(resultHelper.returnResultPermission('Not have set admin permission'));
                    }
                }
                else {
                    callback(resultHelper.returnResultNotExists('Room not exists'));
                }
            });
    }
    else {
        callback(resultHelper.returnResultParameterError({ roomId: false }));
    }
}

exports.removeAdmin = function removeAdmin(actionUserId, userId, roomId, rType, callback) {
    cache.del(generateRoomCacheKey(roomId, userId));
    var permissions = generateGroupAdminPermissions(false, false, false, false, false);
    if (rType == roomType.channel) {
        permissions = generateChannelAdminPermissions(false, false, false, false, false, false);
    }
    var collection = db.get().collection(rooms);
    var oid = parseIdToObject(roomId);
    if (oid) {
        collection.findOne(
            {
                _id: oid
            },
            function (errF, doc) {
                if (errF) {
                    errorLog.addLog(errorLog.errorType.data, errF, function () { });
                    callback(resultHelper.returnResultDBError(errF));
                }
                else if (doc) {

                    if (doc.userIdOwner != userId) { //khác owner thì mới đc phép bỏ

                        var canSetAdmin = _.some(doc.members, {
                            userId: actionUserId,
                            isAdmin: true,
                            permissions: {
                                addNewAdmins: true
                            }
                        });

                        if (doc.userIdOwner == actionUserId || canSetAdmin) {
                            collection.update(
                                {
                                    _id: oid,
                                    members: {
                                        $elemMatch: { userId: userId }
                                    }
                                },
                                {
                                    $set: {
                                        'members.$.isAdmin': false,
                                        'members.$.permissions': permissions
                                    }
                                },
                                function (err, res) {
                                    if (err) {
                                        errorLog.addLog(errorLog.errorType.data, err, function () { });
                                        callback(resultHelper.returnResultDBError(err));
                                    }
                                    else {
                                        callback(resultHelper.returnResultSuccess(true));
                                    }
                                }
                            );
                        }
                        else {
                            callback(resultHelper.returnResultPermission('Not have set admin permission'));
                        }
                    }
                    else {
                        callback(resultHelper.returnResultPermission('Cannot remove owner!'));
                    }
                }
                else {
                    callback(resultHelper.returnResultNotExists('Room not exists'));
                }
            });
    }
    else {
        callback(resultHelper.returnResultParameterError({ roomId: false }));
    }
}

//banned
exports.getRoomBannedUser = function getRoomBannedUser(roomId, callback) {
    var collection = db.get().collection(rooms);
    var oid = parseIdToObject(roomId);
    if (oid) {
        collection.aggregate([
            { $match: { _id: oid } },
            { $unwind: '$banned' },
            //{ "$addFields": { "banId": { $convert: { input: "$banned.userId", to: "objectId", onError: ""} } } },
            { "$addFields": { "banId": { "$toObjectId": "$banned.userId" } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'banId',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: "$userInfo" },
            {
                $group: {
                    _id: '$_id',
                    banned: {
                        $push: {
                            userId: '$banned.userId',
                            userInfo: '$userInfo',
                        }
                    }
                }
            }],
            function (err, docs) {
                if (err) {
                    errorLog.addLog(errorLog.errorType.data, err, function () { });
                    callback(resultHelper.returnResultDBError(err));
                }
                else {
                    console.log(docs);
                    var doc = null;
                    //console.log('count');

                    if (docs.length > 0) {
                        doc = docs[0].banned;
                    }

                    callback(resultHelper.returnResultSuccess(doc));
                }
            });
    }
}
exports.setBanUser = function setBanUser(actionUserId, userId, roomId, isBanned, callback) {

    cache.del(generateRoomCacheKey(roomId, userId));
    var collection = db.get().collection(rooms);
    var oid = parseIdToObject(roomId);
    if (oid) {
        collection.findOne(
            {
                _id: oid
            },
            function (errF, doc) {

                if (errF) {
                    errorLog.addLog(errorLog.errorType.data, errF, function () { });
                    callback(resultHelper.returnResultDBError(errF));
                }
                else if (doc) {

                    if (doc.userIdOwner != userId) { //khác owner thì mới đc phép bỏ

                        var canBanUser = _.some(doc.members, {
                            userId: actionUserId,
                            isAdmin: true,
                            permissions: {
                                addUsers: true
                            }
                        });

                        if (doc.userIdOwner == actionUserId || canBanUser) {
                            if (isBanned) {
                                collection.findOne({
                                    _id: oid,
                                    banned: {
                                        $elemMatch: { userId: userId }
                                    }
                                },
                                    function (err, doc) {
                                        if (!err && doc) {
                                            //nếu ko lỗi và đã tồn tại thì đã bị banned trước đó, ko cần làm gì
                                        }
                                        else {
                                            collection.update(
                                                {
                                                    _id: oid
                                                },
                                                {
                                                    $addToSet: {
                                                        'banned': {
                                                            userId: userId,
                                                            actionUserId: actionUserId
                                                        }
                                                    }
                                                },
                                                function (err, res) {
                                                    if (err) {
                                                        errorLog.addLog(errorLog.errorType.data, err, function () { });
                                                        callback(resultHelper.returnResultDBError(err));
                                                    }
                                                    else {
                                                        callback(resultHelper.returnResultSuccess(true));
                                                    }
                                                }
                                            );
                                        }
                                    }
                                );
                            }
                            else {
                                collection.update(
                                    {
                                        _id: oid
                                    },
                                    {
                                        $pull: {
                                            'banned': { userId: userId }
                                        }
                                    },
                                    function (err, res) {
                                        if (err) {
                                            errorLog.addLog(errorLog.errorType.data, err, function () { });
                                            callback(resultHelper.returnResultDBError(err));
                                        }
                                        else {
                                            callback(resultHelper.returnResultSuccess(true));
                                        }
                                    }
                                );
                            }
                        }
                        else {
                            callback(resultHelper.returnResultPermission('Not have ban users permission'));
                        }
                    }
                    else {
                        callback(resultHelper.returnResultPermission('Cannot remove owner!'));
                    }
                }
                else {
                    callback(resultHelper.returnResultNotExists('Room not exists'));
                }
            });
    }
    else {
        callback(resultHelper.returnResultParameterError({ roomId: false }));
    }
}

//restricted
exports.setRestrictUser = function setRestrictUser(actionUserId, userId, roomId, isRestricted, restrictActions, restrictUntil, callback) {
    cache.del(generateRoomCacheKey(roomId, userId));
    var collection = db.get().collection(rooms);
    var oid = parseIdToObject(roomId);
    if (oid) {
        collection.findOne(
            {
                _id: oid
            },
            function (errF, doc) {
                if (errF) {
                    errorLog.addLog(errorLog.errorType.data, errF, function () { });
                    callback(resultHelper.returnResultDBError(errF));
                }
                else if (doc) {

                    if (doc.userIdOwner != userId) { //khác owner thì mới đc phép bỏ

                        var canBanUser = _.some(doc.members, {
                            userId: actionUserId,
                            isAdmin: true,
                            permissions: {
                                addUsers: true
                            }
                        });

                        if (doc.userIdOwner == actionUserId || canBanUser) {
                            collection.update(
                                {
                                    _id: oid,
                                    members: {
                                        $elemMatch: { userId: userId }
                                    }
                                },
                                {
                                    $set: {
                                        'members.$.isRestricted': isRestricted,
                                        'members.$.restrictActions': restrictActions,
                                        'members.$.restrictUntil': restrictUntil
                                    }
                                },
                                function (err, res) {
                                    if (err) {
                                        errorLog.addLog(errorLog.errorType.data, err, function () { });
                                        callback(resultHelper.returnResultDBError(err));
                                    }
                                    else {
                                        callback(resultHelper.returnResultSuccess(true));
                                    }
                                }
                            );
                        }
                        else {
                            callback(resultHelper.returnResultPermission('Not have ban users permission'));
                        }
                    }
                    else {
                        callback(resultHelper.returnResultPermission('Cannot remove owner!'));
                    }
                }
                else {
                    callback(resultHelper.returnResultNotExists('Room not exists'));
                }
            });
    }
    else {
        callback(resultHelper.returnResultParameterError({ roomId: false }));
    }
}
//kiểm tra public link có ok ko
exports.checkChannePublicLinkAvailable = function checkChannePublicLinkAvailable(roomId, joinLink, callback) {
    var collection = db.get().collection(rooms);
    var oid = parseIdToObject(roomId);
    if (oid) {
        collection.findOne(
            {
                joinLink: joinLink
            },
            function (errF, doc) {
                if (errF) {
                    errorLog.addLog(errorLog.errorType.data, errF, function () { });
                    callback(resultHelper.returnResultDBError(errF));
                }
                else if (doc) { //đã tồn tại link
                    if (doc.roomId == roomId) { //nếu là room hiện tại thì ok
                        callback(resultHelper.returnResultSuccess(true));
                    }
                    else { //ko là room hiện tại thì báo ko hợp lệ
                        callback(resultHelper.returnResultSuccess(false));
                    }
                }
                else { //chưa tồn tại link thì ok
                    callback(resultHelper.returnResultSuccess(true));
                }
            }
        );
    }
    else {
        callback(resultHelper.returnResultParameterError({ roomId: false }));
    }
}

//xoá room
exports.deleteChatRoom = function deleteChatRoom(actionUserId, roomId, callback) {
    cache.del(generateRoomCacheKey(roomId, userId));
    var collection = db.get().collection(rooms);
    var oid = parseIdToObject(roomId);
    if (oid) {
        collection.findOne(
            {
                _id: oid
            },
            function (errF, doc) {
                if (errF) {
                    errorLog.addLog(errorLog.errorType.data, errF, function () { });
                    callback(resultHelper.returnResultDBError(errF));
                }
                else if (doc) {
                    var canDelete;
                    if (doc.type == roomType.channel || doc.type == roomType.custom) {
                        if (actionUserId == doc.userIdOwner) {
                            collection.deleteOne(
                                {
                                    _id: oid
                                },
                                function (err, res) {
                                    callback(resultHelper.returnResultSuccess(true));
                                }
                            );
                        }
                        else {
                            callback(resultHelper.returnResultPermission('Only owner can delete room!'));
                        }
                    }
                    else {
                        callback(resultHelper.returnResultPermission('Room type cannot delete. You can leave this room!'));
                    }
                }
                else {
                    callback(resultHelper.returnResultNotExists('Room not exists'));
                }
            }
        );
    }
    else {
        callback(resultHelper.returnResultParameterError({ roomId: false }));
    }
}

//channel admin
function getChannelAdminRoom(userIdGuest, channelAdmins, channelId, channelName, channelAvatar, userId, callback) {
    var collection = db.get().collection(rooms);

    collection.aggregate(
        [
            {
                $match: {
                    $and: [
                        { type: roomType.channelAdmin },
                        { userIdGuest: userIdGuest },
                        { channelId: channelId }
                    ]
                }
            },
            { $unwind: '$members' },
            { "$addFields": { "memberId": { "$toObjectId": "$members.userId" } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'memberId',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: "$userInfo" },
            {
                $group: {
                    _id: '$_id',
                    type: { $first: '$type' },
                    userIdGuest: {
                        $first: '$userIdGuest'
                    },
                    channelId: {
                        $first: '$channelId'
                    },
                    channelName: {
                        $first: '$channelName'
                    },
                    channelAvatar: {
                        $first: '$channelAvatar'
                    },
                    roomName: {
                        $first: '$roomName'
                    },
                    roomAvatar: {
                        $first: '$roomAvatar'
                    },
                    members: {
                        $push: {
                            userId: '$members.userId',
                            userInfo: {
                                name: "$userInfo.name",
                                avatar: "$userInfo.avatar",
                                phone: "$userInfo.phone",
                                _id: "$userInfo._id",
                                url: "$userInfo.url",
                                oneSignalUserIds: "$userInfo.oneSignalUserIds"
                            },
                            isArchived: '$members.isArchived',
                            isDelete: '$members.isDelete',
                            isMuted: '$members.isMuted',
                            isGuest: '$members.isGuest',
                            isFavorite: '$members.isFavorite',
                            isOwner: '$members.isOwner',
                            isAdmin: '$members.isAdmin',
                            permissions: '$members.permissions'
                        }
                    },
                    createDate: {
                        $first: '$createDate'
                    },
                    lastLogDate: {
                        $first: '$lastLogDate'
                    },
                    lastLog: {
                        $first: '$lastLog'
                    }
                }
            }
        ], function (err, docs) {
            if (err) {
                callback(resultHelper.returnResultDBError(err));
            }
            else {

                //nếu chưa có thì thêm mới
                if (docs.length == 0) {
                    var doc = generateChannelAdminRoomDataModel(userIdGuest, channelAdmins, channelId, channelName, channelAvatar);
                    collection.insert(doc, function (err, result) {
                        if (err) {
                            errorLog.addLog(errorLog.errorType.data, err, function () { });
                            callback(resultHelper.returnResultDBError(err));
                        }
                        else {
                            doc._id = result.insertedIds[0];
                            //console.log('after insert');
                            //console.log(doc.members);
                            //getChannelAdminRoom(userIdGuest, channelAdmins, channelId, channelName, userId, callback);
                            getRoomById(doc._id, userId, callback);
                            //doc = parseRoomInfo(doc, userId);
                            //callback(resultHelper.returnResultSuccessAddNew(doc));
                        }
                    });
                }
                else {
                    var doc = docs[0];


                    if (doc) {

                        updateChannelAdminRoomMember(doc._id, doc.members, channelAdmins, userIdGuest, function (res) {
                            //res is need update
                            //console.log('get room from db');
                            //console.log(doc.members);
                            if (res === false) { //don't need update

                                doc = parseRoomInfo(doc, userId);

                                //cache.put(generateRoomCacheKey(doc._id, userId), doc, cacheTime, function (key, value) {
                                //    console.log('room: ' + key + ' cache expire ');
                                //});

                                callback(resultHelper.returnResultSuccess(doc));
                            }
                            else {
                                getRoomById(doc._id, userId, callback);
                                //getPageRoom(userIdGuest, pageMembers, pageId, pageName, pageLink, pageImage, userId, callback);
                            }
                        });
                    }
                    else {
                        callback(resultHelper.returnResult(resultHelper.notExist));
                    }
                }
            }
        });
}
exports.getChannelAdminRoom = getChannelAdminRoom;

function generateChannelAdminRoomDataModel(userIdGuest, channelAdmins, channelId, channelName, channelAvatar) {
    var item = {
        type: roomType.channelAdmin,
        userIdGuest: userIdGuest,
        channelId: channelId,
        channelName: channelName,
        channelAvatar: channelAvatar,
        createDate: dateHelper.getUTCNow(), //xài moment
        lastLogDate: dateHelper.getUTCNow(),
        roomName: ''
    };
    var members = [];
    members.push(generateDefaultRoomMemberModel(userIdGuest, true));
    //console.log('page member in generate');
    //console.log(pageMembers);
    channelAdmins.forEach(function (el) {
        members.push(generateDefaultRoomMemberModel(el));
    });
    item.members = members;
    return item;
}

function updateChannelAdminRoomMember(roomId, currentMembers, newMembers, userIdGuest, callback) {
    //cấu trúc tương tự như page nên dùng hàm của page luôn
    updatePageRoomMember(roomId, currentMembers, newMembers, userIdGuest, function (res) {
        callback(res);
    });
}

function createIndexForOldRooms() {
    db.get().collection(rooms).find().toArray((err, docs) => {
        for (var i = 0; i < docs.length; i++) {
            console.log(docs[i]._id);
            createRoomLogIndex(docs[i]._id);
        }
        console.log('done');
    });

}
exports.createIndexForOldRooms = createIndexForOldRooms;

function createRoomLogIndex(roomId) {
    var collection = db.get().collection('room_' + roomId);
    if (!collection) {
        db.get().createCollection('room_' + roomId);
        collection = db.get().collection('room_' + roomId);
    }
    //collection.createIndex(
    //    {
    //        '_id': 1,
    //        'type': 1,
    //        'content.text': 1,
    //        'content.title': 1,
    //        'content.content': 1
    //    },
    //    {
    //        background: true
    //    },
    //    (err, result) => {
    //        if (err) {
    //            console.log('err');
    //            console.log(err);
    //        }
    //        else {
    //            console.log(result);
    //        }
    //    }
    //);
    collection.createIndex(
        {
            '_id': 1,
            'type': 1,
            'content.title': 1

        },
        {
            background: true
        },
        (err, result) => {
            if (err) {
                console.log('err');
                console.log(err);
            } else {
                console.log(result);
            }
        }
    );
    collection.createIndex(
        {
            '_id': 1,
            'type': 1,
            'content.name': 1
        },
        {
            background: true
        },
        (err, result) => {
            if (err) {
                console.log('err');
                console.log(err);
            } else {
                console.log(result);
            }
        }
    );
}
exports.createRoomLogIndex = createRoomLogIndex;
