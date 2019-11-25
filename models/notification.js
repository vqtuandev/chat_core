var _ = require('lodash');
var db = require('./db');
var ObjectId = require('mongodb').ObjectId;

var config = require('../configs');

var errorLog = require('./errorLog.js');
var hash = require('object-hash');
var moment = require('moment');
var dateHelper = require('../utility/dateHelper.js');
var resultHelper = require('../utility/resultHelper.js');
var imageHelper = require('../utility/imageHelper.js');
var textHelper = require('../utility/textHelper.js');
var numberHelper = require('../utility/numberHelper');
var user = require('./user.js');

var luvaConstant = require('./luva/constant');


var notifyType = {
    link: 'link',
    text: 'text',
    action: 'action'
};
exports.notifyType = notifyType;

var notifyActionType = {
    addToContact: 'addToContact',
    newToChatNhanh: 'newToChatNhanh',
    loginChatNhanh: 'loginChatNhanh',
    addToRoom: 'addToRoom',
    removeFromRoom: 'removeFromRoom',
    planReminder: 'planReminder',
    newPaymentReceive: 'newPaymentReceive',
    paymentStatusChanged: 'paymentStatusChanged'
};
exports.notifyActionType = notifyActionType;

function getCollection() {
    return db.get().collection("notify");
}

function generateNotifyModel(createUserId, userId, title, message, image, type, data) {
    return {
        userId: userId,
        createUserId: createUserId,
        title: title,
        message: message,
        image: image,
        type: type,
        data: data,
        createDate: dateHelper.getUTCNow(),
        isView: false,
        viewDate: null
    };
}

function parseNotifyInfo(notify) {
    if (notify) {
        notify.title = config.defaultNotifyTitle;
    }
    return notify;
}

function addNotifies(createUserId, userIds, title, message, image, type, data, callback) {
    var collection = getCollection();

    var docs = [];
    _.each(userIds, (userId) => {
        docs.push(generateNotifyModel(createUserId, userId, title, message, image, type, data));
    });

    collection.insertMany(docs, (err, result) => {
        if (err) {
            errorLog.addLog(errorLog.errorType.data, err, function () { });
            callback(resultHelper.returnResultDBError(err));
        }
        else {
            var ids = result.insertedIds;
            for (var i = 0; i < ids.length; i++) {
                docs[i]._id = ids[i];
                docs[i] = parseNotifyInfo(docs[i]);
            }
            callback(resultHelper.returnResultSuccess(docs));
        }
    });
}
exports.addNotifies = addNotifies;

function getNotifies(userId, isView, lastItemId, itemCount, callback) {
    var collection = getCollection();

    var query = { userId: userId };
    if (lastItemId) {
        if (ObjectId.isValid(lastItemId)) {
            var oid = ObjectId(lastItemId);
            query._id = { $lt: oid };
        }
    }

    if (isView !== null && isView !== undefined && isView !== '' && isView !== -1) {
        query.isView = isView;
    }

    collection.find(query)
        .sort({ _id: -1 })
        .limit(itemCount)
        .toArray((err, docs) => {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                for (var i = 0; i < docs.length; i++) {
                    docs[i] = parseNotifyInfo(docs[i]);
                }
                callback(resultHelper.returnResultSuccess(docs));
            }
        });
}
exports.getNotifies = getNotifies;

function getUnreadNotifyCount(userId, callback) {
    var collection = getCollection();
    collection.count({
        userId: userId,
        isView: false
    },
        (err, count) => {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                callback(resultHelper.returnResultSuccess({ count: count }));
            }
        });
}
exports.getUnreadNotifyCount = getUnreadNotifyCount;

function updateAllNotifiesIsView(userId, callback) {
    var collection = getCollection();
    collection.updateMany({
        userId: userId,
        isView: false
    },
        {
            $set: {
                isView: true,
                viewDate: dateHelper.getUTCNow()
            }
        },
        (err, result) => {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                callback(resultHelper.returnResultSuccess());
            }
        });
}
exports.updateAllNotifiesIsView = updateAllNotifiesIsView;

function updateNotifiesIsView(userId, notifyIds, isView, callback) {
    var collection = getCollection();
    _.each(notifyIds, (notifyId, index) => {
        if (ObjectId.isValid(notifyId)) {
            notifyIds[index] = ObjectId(notifyId);
        }
    });

    collection.updateMany({
        userId: userId,
        _id: {
            $in: notifyIds
        }
    },
        {
            $set: {
                isView: isView,
                viewDate: dateHelper.getUTCNow()
            }
        },
        (err, result) => {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                callback(resultHelper.returnResultSuccess());
            }
        });
}
exports.updateNotifiesIsView = updateNotifiesIsView;

function removeNotifies(userId, notifyIds, callback) {
    var collection = getCollection();
    _.each(notifyIds, (notifyId, index) => {
        if (ObjectId.isValid(notifyId)) {
            notifyIds[index] = ObjectId(notifyId);
        }
    });

    collection.deleteMany({
        userId: userId,
        _id: {
            $in: notifyIds
        }
    },
        (err, result) => {
            if (err) {
                errorLog.addLog(errorLog.errorType.data, err, function () { });
                callback(resultHelper.returnResultDBError(err));
            }
            else {
                callback(resultHelper.returnResultSuccess());
            }
        });
}
exports.removeNotifies = removeNotifies;

function createIndex() {
    var collection = getCollection();
    collection.createIndex({ userId: 1 });
}

exports.createIndex = createIndex;

function generateActionNotifyTitle(type, data) {
    var title = '';
    switch (data.actionType) {
        case notifyActionType.addToContact:
        case notifyActionType.newToChatNhanh:
        case notifyActionType.loginChatNhanh:
        case notifyActionType.addToRoom:
        case notifyActionType.removeFromRoom:
        default: {
            title = config.defaultNotifyTitle;
            break;
        }
    }
    return title;
}
exports.generateActionNotifyTitle = generateActionNotifyTitle;

function generateActionMessage(type, data) {
    var message = '';
    switch (data.actionType) {
        case notifyActionType.addToContact: {
            message = data.actionData.name + ' đã thêm bạn vào danh bạ.';
            break;
        }
        case notifyActionType.newToChatNhanh: {
            message = data.actionData.name + ' đã tham gia ChatNhanh.';
        }
        case notifyActionType.loginChatNhanh: {
            message = data.actionData.name + ' vừa đăng nhập vào ChatNhanh.';
            break;
        }
        case notifyActionType.addToRoom: {
            message = data.actionData.name + ' đã thêm bạn vào nhóm Chat "' + data.actionData.roomName + '".';
            break;
        }
        case notifyActionType.removeFromRoom: {
            message = data.actionData.name + ' đã mời bạn ra khỏi nhóm Chat "' + data.actionData.roomName + '".';
            break;
        }
        case notifyActionType.planReminder: {
            message = 'Lịch hẹn ' + data.actionData.planName + ' trong nhóm Chat ' + data.actionData.roomName + ' đã tới.';
            break;
        }
        case notifyActionType.newPaymentReceive: {
            message = 'Nhận ' + numberHelper.formatCurrency(data.amount, '.') + ' ' + textHelper.mapVNDForLuva(data.assetCode) + ' từ ' + data.senderUserName;
            break;
        }
        case notifyActionType.paymentStatusChanged: {
            message = ((data.status == luvaConstant.PAYMENTSTATUS.SUCCESS) ? 'Đã gửi ' : 'Không thể gửi ') + numberHelper.formatCurrency(data.amount, '.') + ' ' + textHelper.mapVNDForLuva(data.assetCode) + ' cho ' + data.destUserName;
            break;
        }
    }
    return message;
}
exports.generateActionMessage = generateActionMessage;

function generateActionTypeImage(type, data) {
    var image = '';
    switch (data.actionType) {
        case notifyActionType.addToContact:
        case notifyActionType.newToChatNhanh:
        case notifyActionType.loginChatNhanh:
            {
                image = data.actionData.avatar;
                break;
            }
        case notifyActionType.addToRoom:
        case notifyActionType.removeFromRoom:
        case notifyActionType.planReminder:
            {
                image = data.actionData.roomAvatar;
                break;
            }
        case notifyActionType.paymentStatusChanged:
            {
                image = data.destUserAvatar;
                break;
            }
        case notifyActionType.newPaymentReceive:
            {
                image = data.senderUserAvatar;
                break;
            }
    }
    return image;
}
exports.generateActionTypeImage = generateActionTypeImage;

