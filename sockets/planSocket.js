var _ = require('lodash');
var db = require('../models/all.js');
var resultHelper = require('../utility/resultHelper');
var textHelper = require('../utility/textHelper');
var errorCodes = resultHelper.errorCodes;

var eventPlanService = {
    getUpcomingPlan: 'getUpcomingPlan',
    sendPlanNotifyToRoom: 'sendPlanNotifyToRoom'
};

module.exports = (socket, eventName, common) => {
    socket.on(eventPlanService.getUpcomingPlan, (data, callback) => {
        var timeStamp = data.timeStamp;
        var pastMinute = data.pastMinute;
        db.plan.getUpcomingPlanSchedule(timeStamp, pastMinute, (res) => {
            callback(res);
        });
    });

    socket.on(eventPlanService.sendPlanNotifyToRoom, (data, callback) => {
        var plan = data.plan;
        var roomId = plan.roomId;
        var chatLogId = plan.chatLogId;
        var userId = plan.userId;
        console.log(plan);
        db.room.getRoomByIdNotCheckMember(roomId, userId, (result) => {
            if (result.errorCode == errorCodes.success) {
                console.log('get room ok');
                var roomInfo = result.data;
                if (roomInfo.members) {

                    var type = db.roomLog.messageType.action;

                    var content = db.roomLog.actionTypeMessage(db.roomLog.actionType.planReminder, plan);
                    var itemGUID = textHelper.uuidv4();
                    common.messageEvent.messageSendExecute(roomId, userId, type, content, itemGUID, (r) => {
                        console.log('send message reminder');
                        db.plan.updatePlanScheduleDone(plan.roomId, plan.chatLogId, (resX) => {
                            //console.log(resX);
                            callback(resX);
                            db.roomLog.getRoomLog(userId, roomId, chatLogId, (res) => {
                                if (res.errorCode == errorCodes.success) {
                                    var chatLog = res.data;
                                    var content = chatLog.content;

                                    content.status = db.roomLog.planStatusType.close;

                                    db.roomLog.updateChatRoomLog(roomId, chatLogId, chatLog.userIdAuthor, content, (rx) => {
                                        if (rx.errorCode == errorCodes.success) {
                                            common.messageEvent.emitRoomMemberEvent(eventName.updateMessage, rx, roomInfo.members);
                                        }
                                    });

                                    //thêm vào notify
                                    var userIds = roomInfo.members.map((item) => {
                                        return item.userId;
                                    });

                                    addPlanRemindToNotify(userId, userIds, roomId, roomInfo.roomName, roomInfo.roomAvatar, plan.chatLogId, plan.title, plan.timeStamp);
                                }
                            });
                        });
                    });
                }
                else {
                    callback(result);
                }
            }
            else {
                callback(result);
            }
        });
    });

    function addPlanRemindToNotify(createUserId, userIds, roomId, roomName, roomAvatar, chatLogId, planName, timeStamp) {
        var type = db.notification.notifyType.action;
        var data = {
            actionType: db.notification.notifyActionType.planReminder,
            actionData: {
                roomId: roomId,
                roomName: roomName,
                roomAvatar: roomAvatar,
                chatLogId: chatLogId,
                planName: planName,
                timeStamp: timeStamp
            }
        };

        var title = db.notification.generateActionNotifyTitle(type, data);
        var message = db.notification.generateActionMessage(type, data);
        var image = db.notification.generateActionTypeImage(type, data);

        db.notification.addNotifies(createUserId, userIds, title, message, image, type, data, (result) => {
            if (result.errorCode == errorCodes.success) {
                common.notify.pushNotifyList(result.data, true);
            }
        });
    }
};

