var _ = require('lodash');
var db = require('./db');
var ObjectId = require('mongodb').ObjectId;

var moment = require('moment');
var dateHelper = require('../utility/dateHelper.js');
var resultHelper = require('../utility/resultHelper.js');

var roomData = require('./room.js');
var userData = require('./user.js');
var planData = require('./plan');
var errorLog = require('./errorLog.js');

var azure = require('../services/azure.js');

var messageActionType = {
    reply: 'REPLY',
    forward: 'FORWARD'
}
exports.messageActionType = messageActionType;

var messageType = {
    action: 'action',
    text: 'text',
    image: 'image',
    video: 'video',
    album: 'album',
    file: 'file',
    link: 'link',
    location: 'location',
    item: 'item',
    contact: 'contact',
    voice: 'voice',
    candidate: 'candidate',
    recruitment: 'recruitment',
    plan: 'plan'
};

exports.messageType = messageType;

///////////////////////////////////////
var planResponseType = {
    yes: 'yes',
    no: 'no',
    maybe: 'maybe'
};
exports.planResponseType = planResponseType;
var planStatusType = {
    active: 'active',
    delete: 'delete',
    close: 'close'
};
exports.planStatusType = planStatusType;
///////////////////////////////////////
var actionType = {
    savedMessageRoom: 'savedMessageRoom',
    createRoom: 'createRoom',
    renameRoom: 'renameRoom',
    changeAvatarRoom: 'changeAvatarRoom',
    changeRoomDescription: 'changeRoomDescription',
    addMember: 'addMember',
    removeMember: 'removeMember',
    joinRoom: 'joinRoom',
    leaveRoom: 'leaveRoom',
    deleteMessage: 'deleteMessage',
    createChannel: 'createChannel',
    renameChannel: 'renameChannel',
    joinChannel: 'joinChannel',
    leaveChannel: 'leaveChannel',
    changeChannelAvatar: 'changeChannelAvatar',
    changeChannelDescription: 'changeChannelDescription',
    changeJoinLink: 'changeJoinLink',
    changeAdminPermission: 'changeAdminPermission',
    getBanned: 'getBanned',
    getRestricted: 'getRestricted',
    newToChat: 'newToChat',
    updatePlan: 'updatePlan',
    deletePlan: 'deletePlan',
    planReminder: 'planReminder',

    //luva
    luvapayBotCreate: 'luvapayBotCreate',
    newPaymentReceive: 'newPaymentReceive',
    paymentStatusChanged: 'paymentStatusChanged'
};
exports.actionType = actionType;

////////////////////////////////////
function actionTypeMessage(actionType, data) {
    return {
        actionType: actionType,
        data: data
    };
}
exports.actionTypeMessage = actionTypeMessage;

////////////////////////////////////
function textTypeMessage(contentType, content) {
    return {
        contentType: contentType,
        content: content
    };
}
exports.textTypeMessage = textTypeMessage;

////////////////////////////////////
function imageTypeMessage(name, extension, link, thumbLink, width, height, size, thumbWidth, thumbHeight, thumbSize) {
    return {
        extension: extension,
        name: name,
        link: link,
        thumbLink: thumbLink,
        width: width,
        height: height,
        size: size,
        thumbWidth: thumbWidth,
        thumbHeight: thumbHeight,
        thumbSize: thumbSize
    };
}
exports.imageTypeMessage = imageTypeMessage;

function videoTypeMessage(name, extension, link, thumbLink, width, height, size, thumbWidth, thumbHeight, thumbSize, videoLength) {
    return {
        extension: extension,
        name: name,
        link: link,
        thumbLink: thumbLink,
        width: width,
        height: height,
        size: size,
        thumbWidth: thumbWidth,
        thumbHeight: thumbHeight,
        thumbSize: thumbSize,
        videoLength: videoLength
    };
}

exports.videoTypeMessage = videoTypeMessage;

function albumTypeMessage(count, items) {
    return {
        count: count,
        items: items
    };
}

exports.albumTypeMessage = albumTypeMessage;

////////////////////////////////////
function fileTypeMessage(name, extension, link, size) {
    return {
        extension: extension,
        name: name,
        link: link,
        size: size
    };
}
exports.fileTypeMessage = fileTypeMessage;

////////////////////////////////////
function linkTypeMessage(text, link, title, imageLink, description) {
    isParse = false;
    if (title) {
        isParse = true;
    }
    return {
        text: text,
        link: link,
        isParse: isParse,
        title: title,
        imageLink: imageLink,
        description: description
    };
}
exports.linkTypeMessage = linkTypeMessage;

////////////////////////////////////
function locationTypeMessage(lat, lng, address) {
    return {
        lat: lat,
        lng: lng,
        address: address
    };
}
exports.locationTypeMessage = locationTypeMessage;
////////////////////////////////////
function itemTypeMessage(itemId, itemName, itemImage, itemLink, itemPrice, itemOriginPrice) {
    return {
        itemId: itemId,
        itemName: itemName,
        itemImage: itemImage,
        itemLink: itemLink,
        itemPrice: itemPrice,
        itemOriginPrice: itemOriginPrice
    };
}
exports.itemTypeMessage = itemTypeMessage;
////////////////////////////////////
function contactTypeMessage(contactId, contactName, contactAvatar, contactMobile, contactEmail) {
    return {
        contactId: contactId,
        name: contactName,
        avatar: contactAvatar,
        mobile: contactMobile,
        email: contactEmail
    };
}
exports.contactTypeMessage = contactTypeMessage;
////////////////////////////////////
function voiceTypeMessage(link, voiceLength, size) {
    return {
        link: link,
        voiceLength: voiceLength,
        size: size
    };
}
exports.voiceTypeMessage = voiceTypeMessage;
////////////////////////////////////

function candidateTypeMessage(name, avatar, phone, link, email) {
    return {
        name: name,
        avatar: avatar,
        phone: phone,
        link: link,
        email: email
    };
}
exports.candidateTypeMessage = candidateTypeMessage;

function recruitmentTypeMessage(jobName, contactName, companyName, address, salary, link) {
    return {
        jobName: jobName,
        contactName: contactName,
        companyName: companyName,
        address: address,
        salary: salary,
        link: link
    };
}
exports.recruitmentTypeMessage = recruitmentTypeMessage;

//////////////////////////////
function planTypeMessage(title, timeStamp, duration, place, note, userId) {
    return {
        title: title,
        timeStamp: timeStamp,
        duration: duration,
        place: place,
        note: note,
        result: [
            {
                userId: userId,
                status: planResponseType.yes
            }
        ],
        comments: [],
        status: planStatusType.active,
        likes: []
    };
}
exports.planTypeMessage = planTypeMessage;
/////////////////////////////////

function parseRoomLog(roomLog) {
    if (roomLog) {
        switch (roomLog.type) {
            case messageType.file:
                {
                    roomLog.content.link = azure.azureStorageUrl + roomLog.content.link;
                    break;
                }
            case messageType.image:
                {
                    roomLog.content.link = azure.azureStorageUrl + roomLog.content.link;
                    roomLog.content.thumbLink = azure.azureStorageUrl + roomLog.content.thumbLink;
                    break;
                }
            case messageType.video:
                {
                    roomLog.content.link = azure.azureStorageUrl + roomLog.content.link;
                    roomLog.content.thumbLink = roomLog.content.thumbLink ? azure.azureStorageUrl + roomLog.content.thumbLink : '';
                    break;
                }
            case messageType.album:
                {
                    if (roomLog.content.items && roomLog.content.items.length > 0) {
                        for (var i = 0; i < roomLog.content.items.length; i++) {
                            roomLog.content.items[i].link = azure.azureStorageUrl + roomLog.content.items[i].link;
                            roomLog.content.items[i].thumbLink = azure.azureStorageUrl + roomLog.content.items[i].thumbLink;
                        }
                    }
                    break;
                }
            case messageType.voice:
                {
                    roomLog.content.link = azure.azureStorageUrl + roomLog.content.link;
                    break;
                }
        }

        if (roomLog.authorInfo) {
            if (roomLog.authorInfo.avatar) {
                roomLog.authorInfo.avatar = azure.azureStorageUrl + roomLog.authorInfo.avatar;;
            }
        }
        //cắt bớt view trả về, chỉ trả view cần hiển thị avatar ngay log
        //roomLog.views = _.filter(roomLog.views, function (el) {
        //    return el.showAvatar == true;
        //});
    }
    return roomLog;
}

exports.parseRoomLog = parseRoomLog;
////////////////////////////////////
exports.getRoomLog = function (userId, roomId, chatLogId, callback) {
    var collection = db.get().collection('room_' + roomId);
    try {
        var oid = ObjectId(chatLogId);
        collection.findOne(
            {
                _id: oid
            },
            (err, doc) => {
                if (err) {
                    errorLog.addLog(errorLog.errorType.data, err, function () { });
                    callback(resultHelper.returnResultDBError(err));
                }
                else {
                    if (doc) {
                        doc = parseRoomLog(doc);
                    }
                    callback(resultHelper.returnResultSuccess(doc));
                }
            }
        );
    }
    catch (ex) {

    }
}

exports.getRoomLogs = function (userId, roomId, lastLogId, logCount, callback) {
    //cần lấy log theo user nếu phát triển thêm tính năng xóa riêng, hiện giờ chưa cần nhưng để biến userId tạm trước

    roomData.checkIsRoomMember(userId, roomId, function (resX) {
        if (!resX) {
            callback(resultHelper.returnResultNotInRoom());
        }
        else {

            var collection = db.get().collection('room_' + roomId);
            var oid = ObjectId();
            if (lastLogId) {
                oid = ObjectId(lastLogId);
            }

            collection.aggregate([
                { $match: { _id: { $lt: oid } }, },
                { $sort: { _id: -1 } },
                { $limit: logCount },
                { "$addFields": { "authorId": { "$toObjectId": "$userIdAuthor" } } },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'authorId',
                        foreignField: '_id',
                        as: 'authorInfo'
                    }
                },
                { $unwind: "$authorInfo" },
                {
                    $project: {
                        _id: 1,
                        roomId: 1,
                        type: 1,
                        signMessage: 1,
                        userIdAuthor: 1,
                        isPin: 1,
                        isDeleted: 1,
                        createDate: 1,
                        content: 1,
                        authorInfo: { _id: 1, name: 1, avatar: 1 },
                        views: { userId: 1, showAvatar: 1, isViewed: 1 },
                        replyOrForward: 1,
                        originMessage: 1
                    }
                }
            ])
                //.sort({ _id: -1 }).limit(logCount)
                .toArray(function (err, docs) {
                    if (err) {
                        errorLog.addLog(errorLog.errorType.data, err, function () { });
                        callback(resultHelper.returnResultDBError(err));
                    }
                    else {
                        //console.log(new Date(), 'before parse logs');
                        if (docs) {
                            //roomData.getRoomById(roomId, userId, function (res) {
                            //    console.log(res);
                            //    var roomInfo = res.data;

                            for (var i = 0; i < docs.length; i++) {
                                if (i == 0) {
                                    //console.log(docs[i]);
                                }
                                docs[i] = parseRoomLog(docs[i]);
                            }
                            //console.log(new Date(), 'getlogs callback');
                            callback(resultHelper.returnResultSuccess(docs));
                            //});
                        }
                        else {
                            //console.log(new Date(), 'getlogs callback');
                            callback(resultHelper.returnResultSuccess(docs));
                        }
                    }
                });
        }
    });
}

exports.getPinLogs = function (userId, roomId, lastLogId, logCount, callback) {
    roomData.checkIsRoomMember(userId, roomId, function (resX) {
        if (!resX) {
            callback(resultHelper.returnResultNotInRoom());
        }
        else {
            //cần lấy log theo user nếu phát triển thêm tính năng xóa riêng, hiện giờ chưa cần nhưng để biến userId tạm trước
            var collection = db.get().collection('room_' + roomId);
            var oid = ObjectId();
            if (lastLogId) {
                oid = ObjectId(lastLogId);
            }

            collection.aggregate([
                {
                    $match: {
                        $and: [
                            {
                                _id: { $lt: oid }
                            },
                            {
                                isPin: true
                            }]
                    },
                },
                { "$addFields": { "authorId": { "$toObjectId": "$userIdAuthor" } } },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'authorId',
                        foreignField: '_id',
                        as: 'authorInfo'
                    }
                },
                { $unwind: "$authorInfo" },
                {
                    $project: {
                        _id: 1,
                        roomId: 1,
                        type: 1,
                        signMessage: 1,
                        userIdAuthor: 1,
                        isPin: 1,
                        isDeleted: 1,
                        createDate: 1,
                        content: 1,
                        authorInfo: { _id: 1, name: 1, avatar: 1 },
                        views: { userId: 1, showAvatar: 1, isViewed: 1 }
                    }
                }
            ]).sort({ _id: -1 }).limit(logCount)
                .toArray(function (err, docs) {
                    if (err) {
                        errorLog.addLog(errorLog.errorType.data, err, function () { });
                        callback(resultHelper.returnResultDBError(err));
                    }
                    else {
                        if (docs) {
                            for (var i = 0; i < docs.length; i++) {
                                docs[i] = parseRoomLog(docs[i]);
                            }
                        }
                        callback(resultHelper.returnResultSuccess(docs));
                    }
                });
        }
    });
}

exports.getRoomFiles = function (userId, roomId, lastLogId, logCount, keyword, callback) {
    roomData.checkIsRoomMember(userId, roomId, function (resX) {
        if (!resX) {
            callback(resultHelper.returnResultNotInRoom());
        }
        else {
            var collection = db.get().collection('room_' + roomId);
            var oid = ObjectId();
            if (lastLogId) {
                oid = ObjectId(lastLogId);
            }
            collection.aggregate([
                {
                    $match: {
                        $and: [
                            {
                                _id: { $lt: oid }
                            },
                            {
                                type: { $in: ["file", "image", "video"] }
                            },
                            {
                                'content.name': { $regex: keyword, $options: 'i' }
                            }
                        ]
                    }
                },
                { "$addFields": { "authorId": { "$toObjectId": "$userIdAuthor" } } },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'authorId',
                        foreignField: '_id',
                        as: 'authorInfo'
                    }
                },
                { $unwind: "$authorInfo" },
                {
                    $project: {
                        _id: 1,
                        roomId: 1,
                        type: 1,
                        signMessage: 1,
                        userIdAuthor: 1,
                        isDeleted: 1,
                        createDate: 1,
                        content: 1,
                        authorInfo: { _id: 1, name: 1, avatar: 1 }
                    }
                }
            ]
                //, {explain:true}
            ).sort({ _id: -1 }).limit(logCount)
                .toArray(function (err, docs) {
                    //console.log(docs[0].stages[0].$cursor.queryPlanner);
                    if (err) {
                        errorLog.addLog(errorLog.errorType.data, err, function () { });
                        callback(resultHelper.returnResultDBError(err));
                    }
                    else {
                        if (docs) {
                            for (var i = 0; i < docs.length; i++) {
                                docs[i] = parseRoomLog(docs[i]);
                            }
                        }
                        callback(resultHelper.returnResultSuccess(docs));
                    }
                });
        }
    });
}

exports.getRoomLinks = function (userId, roomId, lastLogId, logCount, keyword, callback) {
    roomData.checkIsRoomMember(userId, roomId, function (resX) {
        if (!resX) {
            callback(resultHelper.returnResultNotInRoom());
        }
        else {
            var collection = db.get().collection('room_' + roomId);
            var oid = ObjectId();
            if (lastLogId) {
                oid = ObjectId(lastLogId);
            }
            collection.aggregate([
                {
                    $match: {
                        $and: [
                            {
                                _id: { $lt: oid }
                            },
                            {
                                type: 'link'
                            },
                            {
                                $or: [
                                    {
                                        'content.text': { $regex: keyword, $options: 'i' }
                                    },
                                    {
                                        'content.title': { $regex: keyword, $options: 'i' }
                                    },
                                    {
                                        'content.description': { $regex: keyword, $options: 'i' }
                                    }
                                ]
                            }
                        ]
                    }
                },
                { "$addFields": { "authorId": { "$toObjectId": "$userIdAuthor" } } },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'authorId',
                        foreignField: '_id',
                        as: 'authorInfo'
                    }
                },
                { $unwind: "$authorInfo" },
                {
                    $project: {
                        _id: 1,
                        roomId: 1,
                        type: 1,
                        signMessage: 1,
                        userIdAuthor: 1,
                        isDeleted: 1,
                        createDate: 1,
                        content: 1,
                        authorInfo: { _id: 1, name: 1, avatar: 1 }
                    }
                }
            ]
                //, { explain: true }
            ).sort({ _id: -1 }).limit(logCount)
                .toArray(function (err, docs) {
                    //console.log(docs[0].stages[0].$cursor.queryPlanner);
                    if (err) {
                        errorLog.addLog(errorLog.errorType.data, err, function () { });
                        callback(resultHelper.returnResultDBError(err));
                    }
                    else {
                        if (docs) {
                            for (var i = 0; i < docs.length; i++) {
                                docs[i] = parseRoomLog(docs[i]);
                            }
                        }
                        callback(resultHelper.returnResultSuccess(docs));
                    }
                });
        }
    });
}

exports.searchRoomLogs = function (userId, roomId, lastLogId, logCount, keyword, callback) {
    var collection = db.get().collection('room_' + roomId);
    var oid = ObjectId();
    if (lastLogId) {
        oid = ObjectId(lastLogId);
    }
    collection.aggregate([
        {
            $match: {
                $and: [
                    {
                        _id: { $lt: oid }
                    },
                    {
                        type: { $in: ["text", "link", "item"] }
                    },
                    {
                        $or: [
                            {
                                'content.text': { $regex: keyword, $options: 'i' }
                            },
                            {
                                'content.title': { $regex: keyword, $options: 'i' }
                            },
                            {
                                'content.content': { $regex: keyword, $options: 'i' }
                            }
                        ]
                    }
                ]
            }
        },
        { "$addFields": { "authorId": { "$toObjectId": "$userIdAuthor" } } },
        {
            $lookup: {
                from: 'users',
                localField: 'authorId',
                foreignField: '_id',
                as: 'authorInfo'
            }
        },
        { $unwind: "$authorInfo" },
        {
            $project: {
                _id: 1,
                roomId: 1,
                type: 1,
                signMessage: 1,
                userIdAuthor: 1,
                isPin: 1,
                isDeleted: 1,
                createDate: 1,
                content: 1,
                authorInfo: { _id: 1, name: 1, avatar: 1 },
                views: { userId: 1, showAvatar: 1, isViewed: 1 },
                replyOrForward: 1,
                originMessage: 1
            }
        }
    ]).sort({ _id: -1 })
        .limit(logCount)
        .toArray(function (err, docs) {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                if (docs) {
                    for (var i = 0; i < docs.length; i++) {
                        docs[i] = parseRoomLog(docs[i]);
                    }
                }
                callback(resultHelper.returnResultSuccess(docs));
            }
        });
}

exports.getRoomPreviousLogs = function (roomId, logId, itemCount, includeLogId, callback) {
    var collection = db.get().collection('room_' + roomId);
    var oid = ObjectId(logId);
    if (includeLogId == true) {
        collection.aggregate([
            { $match: { _id: { $lte: oid } } },
            {
                $sort: { _id: -1 }
            },
            {
                $limit: itemCount + 1
            },
            { "$addFields": { "authorId": { "$toObjectId": "$userIdAuthor" } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'authorId',
                    foreignField: '_id',
                    as: 'authorInfo'
                }
            },
            { $unwind: "$authorInfo" },
            {
                $project: {
                    _id: 1,
                    roomId: 1,
                    type: 1,
                    signMessage: 1,
                    userIdAuthor: 1,
                    isPin: 1,
                    isDeleted: 1,
                    createDate: 1,
                    content: 1,
                    authorInfo: { _id: 1, name: 1, avatar: 1 },
                    views: { userId: 1, showAvatar: 1, isViewed: 1 },
                    replyOrForward: 1,
                    originMessage: 1
                }
            }
        ]).sort({ _id: -1 }).limit(itemCount + 1)
            .toArray(function (err, docs) {
                if (err) {
                    errorLog.addLog(errorLog.errorType.data, err, function () { });
                    callback(resultHelper.returnResultDBError(err));
                }
                else {
                    if (docs) {
                        for (var i = 0; i < docs.length; i++) {
                            docs[i] = parseRoomLog(docs[i]);
                        }
                    }
                    callback(resultHelper.returnResultSuccess(docs));
                }
            });
    }
    else {
        collection.aggregate([
            { $match: { _id: { $lt: oid } }, },
            {
                $sort: { _id: -1 }
            },
            {
                $limit: itemCount
            },
            { "$addFields": { "authorId": { "$toObjectId": "$userIdAuthor" } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'authorId',
                    foreignField: '_id',
                    as: 'authorInfo'
                }
            },
            { $unwind: "$authorInfo" },
            {
                $project: {
                    _id: 1,
                    roomId: 1,
                    type: 1,
                    signMessage: 1,
                    userIdAuthor: 1,
                    isDeleted: 1,
                    createDate: 1,
                    content: 1,
                    authorInfo: { _id: 1, name: 1, avatar: 1 },
                    views: { userId: 1, showAvatar: 1, isViewed: 1 },
                    replyOrForward: 1,
                    originMessage: 1
                }
            }
        ]).sort({ _id: -1 }).limit(itemCount)
            .toArray(function (err, docs) {
                if (err) {
                    errorLog.addLog(errorLog.errorType.data, err, function () { });
                    callback(resultHelper.returnResultDBError(err));
                }
                else {
                    if (docs) {
                        for (var i = 0; i < docs.length; i++) {
                            docs[i] = parseRoomLog(docs[i]);
                        }
                    }
                    callback(resultHelper.returnResultSuccess(docs));
                }
            });
    }
}

exports.getRoomNextLogs = function (roomId, logId, itemCount, callback) {
    var collection = db.get().collection('room_' + roomId);
    var oid = ObjectId(logId);

    collection.aggregate([
        { $match: { _id: { $gt: oid } }, },
        {
            $sort: { _id: 1 }
        },
        {
            $limit: itemCount
        },
        { "$addFields": { "authorId": { "$toObjectId": "$userIdAuthor" } } },
        {
            $lookup: {
                from: 'users',
                localField: 'authorId',
                foreignField: '_id',
                as: 'authorInfo'
            }
        },
        { $unwind: "$authorInfo" },
        {
            $project: {
                _id: 1,
                roomId: 1,
                type: 1,
                signMessage: 1,
                userIdAuthor: 1,
                isPin: 1,
                isDeleted: 1,
                createDate: 1,
                content: 1,
                authorInfo: { _id: 1, name: 1, avatar: 1 },
                views: { userId: 1, showAvatar: 1, isViewed: 1 },
                replyOrForward: 1,
                originMessage: 1
            }
        }
    ]).sort({ _id: 1 }).limit(itemCount)
        .toArray(function (err, docs) {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                if (docs) {
                    for (var i = 0; i < docs.length; i++) {
                        docs[i] = parseRoomLog(docs[i]);
                    }
                }
                callback(resultHelper.returnResultSuccess(docs));
            }
        });
}

exports.addRoomLogs = function (roomId, userIdAuthor, type, content, roomMembers, replied, signMessage, originMessage, replyOrForward, callback) {
    roomData.checkIsRoomMember(userIdAuthor, roomId, function (resX) {
        if (!resX) {
            callback(resultHelper.returnResultNotInRoom());
        }
        else {
            var collection = db.get().collection('room_' + roomId);

            var doc = {
                roomId: roomId,
                userIdAuthor: userIdAuthor,
                type: type,
                content: content,
                createDate: dateHelper.getUTCNow(),
                views: [],
                isDeleted: false,
                signMessage: signMessage,
                originMessage: originMessage,
                replyOrForward: replyOrForward
            };

            roomMembers.forEach(function (x) {
                doc.views.push({
                    userId: x,
                    isViewed: x == userIdAuthor ? true : false,
                    viewDate: x == userIdAuthor ? dateHelper.getUTCNow() : null,
                    showAvatar: x == userIdAuthor ? true : false
                });
            });

            collection.insert(doc, function (err, result) {
                //console.log(err);
                if (err) {
                    errorLog.addLog(errorLog.errorType.data, err, function () { });
                    callback(resultHelper.returnResultDBError(err));
                }
                else {
                    //console.log(result);
                    doc._id = result.insertedIds[0];
                    var lastLog = {
                        type: doc.type,
                        content: doc.content,
                        userIdAuthor: doc.userIdAuthor,
                        chatLogId: doc._id,
                        views: doc.views
                    };

                    roomData.updateChatRoomLastLogDate(roomId, lastLog, dateHelper.getUTCNow(), replied, function (res) {
                    });

                    updateOlderLogIsView(roomId, doc._id, userIdAuthor, function (resx) {
                    });

                    doc = parseRoomLog(doc);
                    callback(resultHelper.returnResultSuccess(doc));
                }
            });
        }
    });
}

exports.addRoomLogAction = function (roomId, userIdAuthor, content, roomMembers, callback) {
    roomData.checkIsRoomMember(userIdAuthor, roomId, function (resX) {
        if (!resX) {
            callback(resultHelper.returnResultNotInRoom());
        }
        else {
            var collection = db.get().collection('room_' + roomId);

            var doc = {
                roomId: roomId,
                userIdAuthor: userIdAuthor,
                type: messageType.action,
                content: content,
                createDate: dateHelper.getUTCNow(),
                views: []
            };

            roomMembers.forEach(function (x) {
                doc.views.push({
                    userId: x,
                    isViewed: x == userIdAuthor ? true : false,
                    viewDate: x == userIdAuthor ? dateHelper.getUTCNow() : null
                });
            });

            collection.insert(doc, function (err, result) {
                //console.log(err);
                if (err) {
                    errorLog.addLog(errorLog.errorType.data, err, function () { });
                    callback(resultHelper.returnResultDBError(err));
                }
                else {
                    //console.log(result);
                    doc._id = result.insertedIds[0];
                    var lastLog = {
                        type: doc.type,
                        content: doc.content,
                        userIdAuthor: doc.userIdAuthor,
                        chatLogId: doc._id,
                        views: doc.views
                    };

                    roomData.updateChatRoomLastLogDate(roomId, lastLog, dateHelper.getUTCNow(), false, function (res) {
                    });
                    doc = parseRoomLog(doc);
                    callback(resultHelper.returnResultSuccess(doc));
                }
            });
        }
    });
}

exports.updateChatRoomLog = function (roomId, chatLogId, userIdAuthor, content, callback) {
    var collection = db.get().collection('room_' + roomId);
    var oid = ObjectId(chatLogId);
    collection.findOne({ _id: oid }, function (err, doc) {
        if (err) {
            errorLog.addLog(errorLog.errorType.data, err, function () { });
            callback(resultHelper.returnResultDBError(err));
        }
        else {
            if (doc) {
                //là người chat thì mới đc xóa
                if (doc.userIdAuthor === userIdAuthor) {
                    if (doc.isDeleted == false) {
                        collection.findOneAndUpdate(
                            { _id: oid },
                            {
                                $set: {
                                    "content": content
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
                                    doc = null;
                                    if (result) {
                                        doc = result.value;
                                        //console.log(doc);
                                        roomData.checkAndUpdateChatRoomLastLogContent(roomId, chatLogId, doc.type, content, false, function (err2, result2) {

                                        });
                                    }
                                    callback(resultHelper.returnResultSuccess(doc));
                                }
                            }
                        );
                    }
                    else {
                        callback(resultHelper.returnResultSuccess(doc));
                    }
                }
                else {
                    callback(resultHelper.returnResult(resultHelper.errorCodes.permission, 'Not permission', null));
                }
            }
            else {
                callback(resultHelper.returnResult(resultHelper.errorCodes.notExist, 'Log not exists', null));
            }
        }
    });
}

exports.deleteChatRoomLog = function (roomId, chatLogId, userIdAuthor, callback) {
    var collection = db.get().collection('room_' + roomId);
    var oid = ObjectId(chatLogId);
    collection.findOne({ _id: oid }, function (err, doc) {
        if (err) {
            errorLog.addLog(errorLog.errorType.data, err, function () { });
            callback(resultHelper.returnResultDBError(err));
        }
        else {
            if (doc) {
                //là người chat thì mới đc xóa
                if (doc.userIdAuthor === userIdAuthor) {

                    var content = actionTypeMessage(actionType.deleteMessage, doc.content);

                    collection.findOneAndUpdate(
                        { _id: oid },
                        {
                            $set: {
                                isDeleted: true,
                                type: messageType.action,
                                content: content
                            }
                        },
                        {
                            returnOriginal: false
                        },
                        function (err1, result) {
                            if (err1) {
                                errorLog.addLog(errorLog.errorType.data, err1, function () { });
                                callback(resultHelper.returnResultDBError(err1));
                            }
                            else {
                                var doc = null;

                                //console.log(result);
                                if (result) {
                                    doc = result.value;

                                    if (doc.type == messageType.plan) {
                                        planData.deletePlanSchedule(userIdAuthor, roomId, chatLogId, (r) => {
                                            console.log('delete plan');
                                            console.log(r);
                                        });
                                    }
                                    roomData.checkAndUpdateChatRoomLastLogContent(roomId, chatLogId, messageType.action, content, true, function (err2, result2) {

                                    });
                                }
                                callback(resultHelper.returnResultSuccess(doc));
                            }
                        });
                }
                else {
                    callback(resultHelper.returnResult(resultHelper.errorCodes.permission, 'Not permission', null));
                }
            }
            else {
                callback(resultHelper.returnResult(resultHelper.errorCodes.notExist, 'Log not exists', null));
            }
        }
    });
}

function updateOlderLogIsView(roomId, chatLogId, userId, callback) {
    var collection = db.get().collection('room_' + roomId);
    collection.updateMany(
        {
            views: {
                $elemMatch: { userId: userId, isViewed: false }
            }
        },
        {
            $set: {
                "views.$.isViewed": true,
                "views.$.viewDate": dateHelper.getUTCNow(),
                'views.$.showAvatar': false
            }
        }
    );

    collection.updateMany(
        {
            _id: { $ne: ObjectId(chatLogId) },
            views: {
                $elemMatch: { userId: userId, showAvatar: true }
            }
        },
        {
            $set: {
                'views.$.showAvatar': false
            }
        }
    );
}

exports.setChatLogIsView = function (roomId, chatLogId, userId, callback) {
    var collection = db.get().collection('room_' + roomId);
    try {
        var oid = ObjectId(chatLogId);
        //console.log(roomId);
        //console.log(ObjectId(chatLogId));
        //console.log(userId);

        collection.findOneAndUpdate(
            {
                _id: ObjectId(chatLogId),
                views: {
                    $elemMatch: { userId: userId }
                }
            },
            {
                $set: {
                    "views.$.isViewed": true,
                    "views.$.viewDate": dateHelper.getUTCNow(),
                    'views.$.showAvatar': true
                }
            },
            {
                returnOriginal: false
            },
            function (err, result) {
                //console.log(err);
                if (err) {
                    errorLog.addLog(errorLog.errorType.data, err, function () { });
                    callback(resultHelper.returnResultDBError(err));
                }
                else {
                    var doc = null;
                    //console.log(result);
                    if (result) {
                        doc = result.value;
                        updateOlderLogIsView(roomId, chatLogId, userId, function () {
                        });
                        var collectionRoom = db.get().collection('rooms');
                        collectionRoom.findOneAndUpdate(
                            {
                                _id: ObjectId(roomId),
                                "lastLog.views": {
                                    $elemMatch: { userId: userId }
                                }
                            },
                            {
                                $set: {
                                    "lastLog.views.$.isViewed": true,
                                    "lastLog.views.$.viewDate": dateHelper.getUTCNow()
                                }
                            },
                            {
                                returnOriginal: false
                            },
                            function (err2, result2) {

                            }
                        );

                    }
                    if (doc) {
                        doc = parseRoomLog(doc);
                        //console.log(doc._id);
                        //console.log(doc.views);
                    }
                    callback(resultHelper.returnResultSuccess(doc));
                }
            });
    }
    catch (ex) {
        //console.log(ex);
        callback(resultHelper.returnResultParameterError({ chatLogId: true }));
    }
}

exports.setChatLogIsPin = function (roomId, chatLogId, userInfo, isPin, callback) {
    var collection = db.get().collection('room_' + roomId);
    try {
        var oid = ObjectId(chatLogId);
        collection.findOneAndUpdate(
            {
                _id: oid
            },
            {
                $set: {
                    "isPin": isPin,
                    "pinDate": dateHelper.getUTCNow(),
                    "pinUserInfo": userInfo
                }
            },
            {
                returnOriginal: false
            },
            function (err, result) {
                //console.log(err);
                if (err) {
                    errorLog.addLog(errorLog.errorType.data, err, function () { });
                    callback(resultHelper.returnResultDBError(err));
                }
                else {
                    var doc = null;
                    if (result) {
                        doc = result.value;
                        if (doc) {
                            doc = parseRoomLog(doc);
                            //console.log(doc._id);
                            //console.log(doc.views);
                        }
                    }
                    callback(resultHelper.returnResultSuccess(doc));
                }
            });
    }
    catch (ex) {
        callback(resultHelper.returnResultParameterError({ chatLogId: true }));
    }
}