var _ = require('lodash');
var azure = require('../services/azure');
var textHelper = require('../utility/textHelper');
var dateHelper = require('../utility/dateHelper');
var imageHelper = require('../utility/imageHelper');
module.exports = (socket, eventName, socketMap, db, resultHelper, common) => {
    //các hàm về message            
    var errorCodes = resultHelper.errorCodes;
    //lấy lịch sử chat
    socket.on(eventName.getRoomLogs, function (data, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;
        var lastLogId = data.lastLogId;
        var itemCount = data.itemCount;
        if (!itemCount) {
            itemCount = common.roomLogCount;
        }
        if (roomId) {
            //todo: chưa đọc hết thông tin về user
            db.roomLog.getRoomLogs(userId, roomId, lastLogId, itemCount, function (result) {
                if (typeof callback === 'function') {
                    callback(result);
                }
            });
        }
        else {
            var paraError = { roomId: true };
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
        }
    });

    socket.on(eventName.getPinLogs, function (data, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;
        var lastLogId = data.lastLogId;
        var itemCount = data.itemCount;
        if (roomId) {
            if (!itemCount) {
                itemCount = common.roomLogCount;
            }
            //todo: chưa đọc hết thông tin về user
            db.roomLog.getPinLogs(userId, roomId, lastLogId, itemCount, function (result) {
                if (typeof callback === 'function') {
                    callback(result);
                }
            });
        }
        else {
            var paraError = { roomId: true };
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
        }
    });

    //reply & forward
    socket.on(eventName.replyMessage, function (data, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;
        var type = data.type;
        var content = data.content;
        var originMessage = data.originMessage;
        var itemGUID = data.itemGUID;
        if (roomId && type && content && originMessage && itemGUID) {
            common.messageEvent.messageSendExecute(roomId, userId, type, content, itemGUID, callback, originMessage, db.roomLog.messageActionType.reply);
        }
        else {
            var paraError = {
                roomId: roomId ? true : false,
                type: type ? true : false,
                content: content ? true : false,
                originMessage: originMessage ? true : false,
                itemGUID: itemGUID ? true : false
            };
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
        }
    });
    function fixLinkInForwardContent(content, type) {
        switch (type) {
            case db.roomLog.messageType.file:
                {
                    content.link = content.link.replace(azure.azureStorageUrl, '');
                    console.log(content.link);
                    break;
                }
            case db.roomLog.messageType.image:
                {
                    content.link = content.link.replace(azure.azureStorageUrl, '');
                    content.thumbLink = content.thumbLink.replace(azure.azureStorageUrl, '');
                    console.log(content.link);
                    break;
                }
            case db.roomLog.messageType.video:
                {
                    content.link = content.link.replace(azure.azureStorageUrl, '');
                    content.thumbLink = content.thumbLink ? content.thumbLink.replace(azure.azureStorageUrl, '') : '';
                    break;
                }
            case db.roomLog.messageType.album:
                {
                    if (content.items && content.items.length > 0) {
                        for (var i = 0; i < content.items.length; i++) {
                            content.items[i].link = content.items[i].link.replace(azure.azureStorageUrl, '');
                            content.items[i].thumbLink = content.items[i].thumbLink ? content.items[i].thumbLink.replace(azure.azureStorageUrl, '') : '';
                        }
                    }
                    break;
                }
            case db.roomLog.messageType.voice:
                {
                    content.link = content.link.replace(azure.azureStorageUrl, '');
                    break;
                }
        }
        return content;
    }
    socket.on(eventName.forwardMessage, function (data, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;
        var originMessage = data.originMessage;
        var itemGUID = data.itemGUID;

        if (roomId && originMessage && itemGUID) {
            var content = originMessage.content;
            var type = originMessage.type;
            content = fixLinkInForwardContent(content, type);
            common.messageEvent.messageSendExecute(roomId, userId, type, content, itemGUID, callback, originMessage, db.roomLog.messageActionType.forward);
        }
        else {
            var paraError = {
                roomId: roomId ? true : false,
                type: type ? true : false,
                content: content ? true : false,
                originMessage: originMessage ? true : false,
                itemGUID: itemGUID ? true : false
            };
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
        }
    });

    //gửi tin
    function checkIsReplyMessageAndSend(data, roomId, userId, type, content, itemGUID, callback) {
        var originMessage = null, replyOrForward = null;
        if (data.originMessage) {
            originMessage = data.originMessage;
            replyOrForward = db.roomLog.messageActionType.reply;
        
        }
        common.messageEvent.messageSendExecute(roomId, userId, type, content, itemGUID, callback, originMessage, replyOrForward);
    }
    socket.on(eventName.sendText, function (data, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;
        var text = data.text;
        var itemGUID = data.itemGUID;

        if (roomId && text && itemGUID) {

            var content = db.roomLog.textTypeMessage('text', text);

            var type = db.roomLog.messageType.text;

            checkIsReplyMessageAndSend(data, roomId, userId, type, content, itemGUID, callback);
        }
        else {
            var paraError = {
                roomId: roomId ? true : false,
                text: text ? true : false,
                itemGUID: itemGUID ? true : false
            };
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
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

            checkIsReplyMessageAndSend(data, roomId, userId, type, content, itemGUID, callback);
        }
        else {
            var paraError = {
                roomId: roomId ? true : false,
                fileName: fileName ? true : false,
                link: link ? true : false,
                itemGUID: itemGUID ? true : false
            };
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
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

            checkIsReplyMessageAndSend(data, roomId, userId, type, content, itemGUID, callback);
        }
        else {
            var paraError = {
                roomId: roomId ? true : false,
                fileName: fileName ? true : false,
                link: link ? true : false,
                thumbLink: thumbLink ? true : false,
                itemGUID: itemGUID ? true : false
            };
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
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

        var videoLength = data.videoLength;

        var itemGUID = data.itemGUID;

        if (roomId && fileName && link && thumbLink && itemGUID) {

            var ext = imageHelper.getFileExtension(link);

            var type = db.roomLog.messageType.video;

            var content = db.roomLog.videoTypeMessage(fileName, ext, link, thumbLink, width, height, size, thumbWidth, thumbHeight, thumbSize, videoLength);

            checkIsReplyMessageAndSend(data, roomId, userId, type, content, itemGUID, callback);
        }
        else {
            var paraError = {
                roomId: roomId ? true : false,
                fileName: fileName ? true : false,
                link: link ? true : false,
                thumbLink: thumbLink ? true : false,
                itemGUID: itemGUID ? true : false
            };
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
        }
    });

    //update 13/08/2018
    socket.on(eventName.sendAlbum, function (data, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;

        var itemGUID = data.itemGUID;

        var count = data.count;
        var items = data.items;

        if (roomId && count && items && itemGUID) {
            var type = db.roomLog.messageType.album;

            var content = db.roomLog.albumTypeMessage(count, items);

            checkIsReplyMessageAndSend(data, roomId, userId, type, content, itemGUID, callback);
        }
        else {
            if (typeof callback === 'function') {
                var paraError = {
                    roomId: roomId ? true : false,
                    count: count ? true : false,
                    items: items ? true : false,
                    itemGUID: itemGUID ? true : false
                };
                callback(resultHelper.returnResultParameterError(paraError));
            }
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

            checkIsReplyMessageAndSend(data, roomId, userId, type, content, itemGUID, callback);
        }
        else {
            var paraError = {
                roomId: roomId ? true : false,
                link: link ? true : false,
                itemGUID: itemGUID ? true : false
            };
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
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
                if (typeof callback === 'function') {
                    callback(result);
                }
                db.room.getRoomById(roomId, userId, function (res) {
                    if (res.errorCode == 0) {
                        var roomInfo = res.data;
                        var roomMembers = roomInfo.members;

                        var roomMemberIds = [];
                        if (roomMembers) {
                            roomMembers.forEach(function (x) {
                                roomMemberIds.push(x.userId);
                            });

                            common.messageEvent.emitRoomMemberEvent(eventName.updateMessage, result, roomMembers);
                        }
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
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
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

            checkIsReplyMessageAndSend(data, roomId, userId, type, content, itemGUID, callback);
        }
        else {
            var paraError = {
                roomId: roomId ? true : false,
                lat: lat ? true : false,
                lng: lng ? true : false,
                itemGUID: itemGUID ? true : false
            };
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
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
        var itemOriginPrice = data.itemOriginPrice;

        var itemGUID = data.itemGUID;

        if (roomId && itemId && itemName && itemImage && itemLink && itemGUID) {
            var type = db.roomLog.messageType.item;

            var content = db.roomLog.itemTypeMessage(itemId, itemName, itemImage, itemLink, itemPrice, itemOriginPrice);

            checkIsReplyMessageAndSend(data, roomId, userId, type, content, itemGUID, callback);
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
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
        }
    });

    socket.on(eventName.sendContact, function (data, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;

        var contactId = data.contactId;
        var contactName = data.contactName;
        var contactAvatar = data.contactAvatar;
        var contactMobile = data.contactMobile;
        var contactEmail = data.contactEmail;

        var itemGUID = data.itemGUID;

        if (roomId && contactId && contactName && contactMobile && itemGUID) {
            var type = db.roomLog.messageType.contact;

            var content = db.roomLog.contactTypeMessage(contactId, contactName, contactAvatar, contactMobile, contactEmail);

            checkIsReplyMessageAndSend(data, roomId, userId, type, content, itemGUID, callback);
        }
        else {
            var paraError = {
                roomId: roomId ? true : false,
                contactId: contactId ? true : false,
                contactName: contactName ? true : false,
                contactMobile: contactMobile ? true : false,
                itemGUID: itemGUID ? true : false
            };
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
        }
    });

    socket.on(eventName.sendVoice, function (data, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;

        var link = data.link;
        var voiceLength = data.voiceLength;
        var size = data.size;

        var itemGUID = data.itemGUID;

        if (roomId && link && itemGUID) {
            var type = db.roomLog.messageType.voice;

            var content = db.roomLog.voiceTypeMessage(link, voiceLength, size);

            checkIsReplyMessageAndSend(data, roomId, userId, type, content, itemGUID, callback);
        }
        else {
            var paraError = {
                roomId: roomId ? true : false,
                link: link ? true : false,
                itemGUID: itemGUID ? true : false
            };
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
        }
    });

    socket.on(eventName.sendCandidate, function (data, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;

        var link = data.link;
        var name = data.name;
        var avatar = data.avatar;
        var phone = data.phone;
        var email = data.email;

        var itemGUID = data.itemGUID;

        if (roomId && link && itemGUID) {
            var type = db.roomLog.messageType.candidate;

            var content = db.roomLog.candidateTypeMessage(name, avatar, phone, link, email);

            checkIsReplyMessageAndSend(data, roomId, userId, type, content, itemGUID, callback);
        }
        else {
            var paraError = {
                roomId: roomId ? true : false,
                link: link ? true : false,
                itemGUID: itemGUID ? true : false
            };
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
        }
    });

    socket.on(eventName.sendRecruitment, function (data, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;

        var link = data.link;
        var jobName = data.jobName;
        var contactName = data.contactName;
        var companyName = data.companyName;
        var address = data.address;
        var salary = data.salary;

        var itemGUID = data.itemGUID;

        if (roomId && link && jobName && itemGUID) {
            var type = db.roomLog.messageType.recruitment;

            var content = db.roomLog.recruitmentTypeMessage(jobName, contactName, companyName, address, salary, link);

            checkIsReplyMessageAndSend(data, roomId, userId, type, content, itemGUID, callback);
        }
        else {
            var paraError = {
                roomId: roomId ? true : false,
                link: link ? true : false,
                jobName: jobName ? true : false,
                itemGUID: itemGUID ? true : false
            };
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
        }
    });

    //gửi plan
    socket.on(eventName.sendPlan, (data, callback) => {
        var userId = socket.userId;
        var roomId = data.roomId;

        var title = data.title;
        var timeStamp = data.timeStamp;
        var duration = data.duration;
        var place = data.place;
        var note = data.note;

        var itemGUID = data.itemGUID;

        if (roomId && title && timeStamp && itemGUID) {
            var type = db.roomLog.messageType.plan;
            var content = db.roomLog.planTypeMessage(title, timeStamp, duration, place, note, userId);

            //có xét & add vào bảng plan trong hàm
            checkIsReplyMessageAndSend(data, roomId, userId, type, content, itemGUID, callback);
        }
        else {
            var paraError = {
                roomId: roomId ? true : false,
                title: title ? true : false,
                timeStamp: timeStamp ? true : false,
                itemGUID: itemGUID ? true : false
            };
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
        }

    });

    socket.on(eventName.updatePlan, (data, callback) => {
        var userId = socket.userId;
        var roomId = data.roomId;
        var chatLogId = data.chatLogId;
        var title = data.title;
        var timeStamp = data.timeStamp;
        var duration = data.duration;
        var place = data.place;
        var note = data.note;

        if (roomId && chatLogId && title && timeStamp) {
            db.roomLog.getRoomLog(userId, roomId, chatLogId, (res) => {
                if (res.errorCode == errorCodes.success) {
                    var chatLog = res.data;
                    var content = chatLog.content;
                    if (content.status != db.roomLog.planStatusType.close) {
                        var oldContent = { title: content.title, timeStamp: content.timeStamp, duration: content.duration, place: content.place };
                        content.title = title;
                        content.timeStamp = timeStamp;
                        content.duration = duration;
                        content.place = place;
                        content.note = note;

                        db.roomLog.updateChatRoomLog(roomId, chatLogId, chatLog.userIdAuthor, content, (result) => {
                            if (typeof callback === 'function') {
                                callback(result);
                            }
                            if (result.errorCode == errorCodes.success) {
                                db.plan.updatePlanSchedule(userId, roomId, chatLogId, title, timeStamp, duration, place, (r) => {
                                    console.log('update plan');
                                    console.log(r);
                                });
                            }
                            db.room.getRoomById(roomId, userId, function (res) {
                                if (res.errorCode == 0) {
                                    var roomInfo = res.data;
                                    var roomMembers = roomInfo.members;

                                    var roomMemberIds = [];
                                    if (roomMembers) {
                                        roomMembers.forEach(function (x) {
                                            roomMemberIds.push(x.userId);
                                        });

                                        var roomId = roomInfo._id;
                                        var c = {
                                            userId: userId,
                                            userName: _.find(roomInfo.members, { userId: userId }).userInfo.name,
                                            oldContent: oldContent,
                                            title: title
                                        };
                                        var actionContent = db.roomLog.actionTypeMessage(db.roomLog.actionType.updatePlan, c);
                                        common.messageEvent.messageSendExecute(roomId, userId, db.roomLog.messageType.action, actionContent, "");


                                        common.messageEvent.emitRoomMemberEvent(eventName.updateMessage, result, roomMembers);
                                    }
                                }
                            });
                        });
                    }
                    else {
                        if (typeof callback === 'function') {
                            callback(resultHelper.returnResultPermission('Không thể cập nhật Lịch hẹn đã kết thúc.'));
                        }
                    }
                }
                else {
                    if (typeof callback === 'function') {
                        callback(res);
                    }
                }
            });
        }
        else {
            var paraError = {
                roomId: roomId ? true : false,
                title: title ? true : false,
                timeStamp: timeStamp ? true : false,
                chatLogId: chatLogId ? true : false
            };
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
        }
    });

    socket.on(eventName.commentToPlan, (data, callback) => {
        var userId = socket.userId;
        var roomId = data.roomId;
        var chatLogId = data.chatLogId;
        var message = data.message;

        if (roomId && chatLogId && message) {
            db.roomLog.getRoomLog(userId, roomId, chatLogId, (res) => {
                if (res.errorCode == errorCodes.success) {
                    var chatLog = res.data;
                    var content = chatLog.content;
                    var comments = content.comments;
                    if (!comments) {
                        comments = [];
                    }

                    comments.push({
                        _id: textHelper.uuidv4(),
                        userId: userId,
                        message: message,
                        createDate: dateHelper.getUTCNow()
                    });

                    content.comments = comments;
                    db.roomLog.updateChatRoomLog(roomId, chatLogId, chatLog.userIdAuthor, content, (result) => {
                        if (typeof callback === 'function') {
                            callback(result);
                        }
                        db.room.getRoomById(roomId, userId, function (res) {
                            if (res.errorCode == 0) {
                                var roomInfo = res.data;
                                var roomMembers = roomInfo.members;

                                var roomMemberIds = [];
                                if (roomMembers) {
                                    roomMembers.forEach(function (x) {
                                        roomMemberIds.push(x.userId);
                                    });

                                    common.messageEvent.emitRoomMemberEvent(eventName.updateMessage, result, roomMembers);
                                }
                            }
                        });
                    });
                }
            });
        }
        else {
            var paraError = {
                roomId: roomId ? true : false,
                message: message ? true : false,
                chatLogId: chatLogId ? true : false
            };
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
        }
    });

    socket.on(eventName.confirmToPlan, (data, callback) => {
        var userId = socket.userId;
        var roomId = data.roomId;
        var chatLogId = data.chatLogId;
        var status = data.status;
        console.log(roomId, chatLogId, status);
        if (roomId && chatLogId && status) {
            db.roomLog.getRoomLog(userId, roomId, chatLogId, (res) => {
                console.log(res);
                if (res.errorCode == errorCodes.success) {
                    var chatLog = res.data;
                    var content = chatLog.content;
                    var responses = content.result;
                    if (!responses) {
                        responses = [];
                    }

                    var index = _.findIndex(responses, (item) => {
                        return item.userId == userId;
                    });
                    var item = { userId: userId, status: status };
                    if (index >= 0) {
                        responses[index] = item;
                    }
                    else {
                        responses.push(item);
                    }

                    content.result = responses;
                    //console.log(content);
                    db.roomLog.updateChatRoomLog(roomId, chatLogId, chatLog.userIdAuthor, content, (result) => {
                        console.log(result);
                        console.log(result.data);
                        if (typeof callback === 'function') {
                            callback(result);
                        }
                        db.room.getRoomById(roomId, userId, function (res) {
                            if (res.errorCode == 0) {
                                var roomInfo = res.data;
                                var roomMembers = roomInfo.members;

                                var roomMemberIds = [];
                                if (roomMembers) {
                                    roomMembers.forEach(function (x) {
                                        roomMemberIds.push(x.userId);
                                    });

                                    common.messageEvent.emitRoomMemberEvent(eventName.updateMessage, result, roomMembers);
                                }
                            }
                        });
                    });
                }
            });
        }
        else {
            var paraError = {
                roomId: roomId ? true : false,
                status: status ? true : false,
                chatLogId: chatLogId ? true : false
            };
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
        }
    });

    socket.on(eventName.likePlan, (data, callback) => {
        var userId = socket.userId;
        var roomId = data.roomId;
        var chatLogId = data.chatLogId;
        var like = data.like;

        if (roomId && chatLogId && like != null) {
            db.roomLog.getRoomLog(userId, roomId, chatLogId, (res) => {
                if (res.errorCode == errorCodes.success) {
                    var chatLog = res.data;
                    var content = chatLog.content;
                    var likes = content.likes;
                    if (!likes) {
                        likes = [];
                    }

                    var index = _.findIndex(likes, (item) => {
                        return item == userId;
                    });

                    if (like === true) {
                        if (index < 0) {
                            likes.push(userId);
                        }
                    }
                    else {
                        if (index >= 0) {
                            likes.splice(index, 1);
                        }
                    }

                    content.likes = likes;
                    db.roomLog.updateChatRoomLog(roomId, chatLogId, chatLog.userIdAuthor, content, (result) => {
                        if (typeof callback === 'function') {
                            callback(result);
                        }
                        db.room.getRoomById(roomId, userId, function (res) {
                            if (res.errorCode == 0) {
                                var roomInfo = res.data;
                                var roomMembers = roomInfo.members;

                                var roomMemberIds = [];
                                if (roomMembers) {
                                    roomMembers.forEach(function (x) {
                                        roomMemberIds.push(x.userId);
                                    });

                                    common.messageEvent.emitRoomMemberEvent(eventName.updateMessage, result, roomMembers);
                                }
                            }
                        });
                    });
                }
            });
        }
        else {
            var paraError = {
                roomId: roomId ? true : false,
                like: like != null ? true : false,
                chatLogId: chatLogId ? true : false
            };
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
        }
    });

    socket.on(eventName.deletePlan, (data, callback) => {
        var userId = socket.userId;
        var roomId = data.roomId;
        var chatLogId = data.chatLogId;

        if (roomId && chatLogId) {
            db.roomLog.getRoomLog(userId, roomId, chatLogId, (res) => {
                if (res.errorCode == errorCodes.success) {
                    var chatLog = res.data;
                    var content = chatLog.content;

                    content.status = db.roomLog.planStatusType.delete;

                    db.roomLog.updateChatRoomLog(roomId, chatLogId, chatLog.userIdAuthor, content, (result) => {
                        if (typeof callback === 'function') {
                            callback(result);
                        }

                        if (result.errorCode == errorCodes.success) {
                            db.plan.deletePlanSchedule(userId, roomId, chatLogId, (r) => {
                                console.log('delete plan');
                                console.log(r);
                            });
                        }

                        db.room.getRoomById(roomId, userId, function (res) {
                            if (res.errorCode == 0) {
                                var roomInfo = res.data;
                                var roomMembers = roomInfo.members;


                                var roomMemberIds = [];
                                if (roomMembers) {
                                    roomMembers.forEach(function (x) {
                                        roomMemberIds.push(x.userId);
                                    });

                                    var roomId = roomInfo._id;
                                    var c = {
                                        userId: userId,
                                        userName: _.find(roomInfo.members, { userId: userId }).userInfo.name,
                                        title: content.title
                                    };
                                    var actionContent = db.roomLog.actionTypeMessage(db.roomLog.actionType.deletePlan, c);
                                    common.messageEvent.messageSendExecute(roomId, userId, db.roomLog.messageType.action, actionContent, "");

                                    common.messageEvent.emitRoomMemberEvent(eventName.updateMessage, result, roomMembers);
                                }
                            }
                        });
                    });
                }
            });
        }
        else {
            var paraError = {
                roomId: roomId ? true : false,
                chatLogId: chatLogId ? true : false
            };
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
        }
    });

    //xóa tin
    socket.on(eventName.deleteMessage, function (data, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;
        var chatLogId = data.chatLogId;
        if (roomId && chatLogId) {
            db.roomLog.deleteChatRoomLog(roomId, chatLogId, userId, function (result) {
                if (typeof callback === 'function') {
                    callback(result);
                }
                if (result.errorCode == 0) {
                    db.room.getRoomById(roomId, userId, function (res) {
                        if (res.errorCode == 0) {
                            var roomInfo = res.data;
                            var roomMembers = roomInfo.members;
                            common.messageEvent.emitRoomMemberEvent(eventName.removeMessage, result, roomMembers);
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
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
        }
    });

    //set tin nhắn đã đọc
    socket.on(eventName.setLogIsView, function (data, callback) {

        var userId = socket.userId;
        var roomId = data.roomId;
        var chatLogId = data.chatLogId;

        if (roomId && chatLogId) {
            db.roomLog.setChatLogIsView(roomId, chatLogId, userId, function (result) {
                if (typeof callback === 'function') {
                    callback(result);
                }
                if (result.errorCode == 0) {
                    db.room.getRoomById(roomId, userId, function (res) {

                        if (res.errorCode == 0) {
                            var roomInfo = res.data;
                            if (roomInfo) {
                                var roomMembers = roomInfo.members;
                                //nếu là channel thì chỉ emit tới chính user đó đã xem để các device của user đó biết 
                                if (roomInfo.type == db.room.roomType.channel) {
                                    var roomMember = roomMembers.find(function (x) {
                                        return x.userId == userId;
                                    });
                                    roomMembers = [roomMember];
                                }
                                if (roomMembers) {
                                    common.messageEvent.emitRoomMemberEvent(eventName.logIsViewed, result, roomMembers);
                                }
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
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
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
                if (typeof callback === 'function') {
                    callback(result);
                }
            });
        }
        else {

            var paraError = {
                roomId: roomId ? true : false,
                itemGUID: itemGUID ? true : false,
                fileName: fileName ? true : false
            };
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
        }
    });

    //lấy danh sách file trên room (file, image, video)
    socket.on(eventName.getRoomFiles, function (data, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;
        var lastLogId = data.lastLogId;
        var keyword = data.keyword;
        var itemCount = data.itemCount;
        if (roomId) {
            //todo: chưa đọc hết thông tin về user
            if (keyword) {
                keyword = textHelper.fixingKeyword(keyword);
            }
            if (typeof callback === 'function') {
                if (!itemCount) {
                    itemCount = common.roomLogCount;
                }
                db.roomLog.getRoomFiles(userId, roomId, lastLogId, itemCount, keyword, function (result) {
                    callback(result);
                });
            }
        }
        else {
            if (typeof callback === 'function') {
                var paraError = { roomId: true };
                callback(resultHelper.returnResultParameterError(paraError));
            }
        }
    });

    socket.on(eventName.getRoomLinks, function (data, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;
        var lastLogId = data.lastLogId;
        var keyword = data.keyword;
        var itemCount = data.itemCount;
        if (typeof callback === 'function') {
            if (roomId) {
                //todo: chưa đọc hết thông tin về user
                if (keyword) {
                    keyword = textHelper.fixingKeyword(keyword);
                }
                if (!itemCount) {
                    itemCount = common.roomLogCount;
                }
                db.roomLog.getRoomLinks(userId, roomId, lastLogId, itemCount, keyword, function (result) {
                    callback(result);
                });
            }
            else {
                var paraError = { roomId: true };
                callback(resultHelper.returnResultParameterError(paraError));
            }
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
        if (typeof callback === 'function') {
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
        }
    });

    socket.on(eventName.getRoomPreviousLogs, function (data, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;
        var logId = data.logId;
        var count = data.itemCount;
        if (typeof callback === 'function') {
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
        }
    });

    socket.on(eventName.getRoomNextLogs, function (data, callback) {
        var userId = socket.userId;
        var roomId = data.roomId;
        var logId = data.logId;
        var count = data.itemCount;
        if (typeof callback === 'function') {
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
                if (typeof callback === 'function') {
                    callback(result);
                }

                if (result.errorCode == 0) {
                    db.room.getRoomById(roomId, userId, function (res) {

                        if (res.errorCode == 0) {
                            var roomInfo = res.data;
                            if (roomInfo) {
                                if (!result.data) {
                                    result.data = {};
                                }
                                result.data.roomInfo = roomInfo;
                                db.user.getUserInfo(result.data.userIdAuthor, false, function (resX) {
                                    result.data.authorInfo = resX.data;
                                    var roomMembers = roomInfo.members;
                                    common.messageEvent.emitRoomMemberEvent(eventName.addPinItem, result, roomMembers);
                                });
                            }
                        }
                    });
                }
            });
        }
        else {
            if (typeof callback === 'function') {
                var paraError = { roomId: true };
                callback(resultHelper.returnResultParameterError(paraError));
            }
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
                if (typeof callback === 'function') {
                    callback(result);
                }
                if (result.errorCode == 0) {
                    db.room.getRoomById(roomId, userId, function (res) {

                        if (res.errorCode == 0) {
                            var roomInfo = res.data;
                            if (roomInfo) {
                                var roomMembers = roomInfo.members;
                                common.messageEvent.emitRoomMemberEvent(eventName.removePinItem, result, roomMembers);
                            }
                        }
                    });
                }
            });
        }
        else {
            if (typeof callback === 'function') {
                var paraError = { roomId: true };
                callback(resultHelper.returnResultParameterError(paraError));
            }
        }
    });

}