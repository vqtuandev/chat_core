var async = require('async');

var resultHelper = require('../../utility/resultHelper');
var errorCodes = resultHelper.errorCodes;
var config = require('../../configs');

var eventName = {
    receive: 'bridge/pay/receive',
    error: 'bridge/pay/error',
    paymentResult: 'payment/result',
};
module.exports = (socket, socketMap, db, common) => {
    socket.on(eventName.receive, (data, callback) => {
        //đang tạm gán dạng text là UserId (theo mặc định), sẽ gán thêm thông tin khác rồi hash lại sau
        //tối đa dạng hash là 32bit
        var userId = data.memo;
        //tạo room luvapay bot
        db.luva.room.createLuvaPayBotRoom(userId, (result) => {
            if (result.errorCode == errorCodes.success) {
                var room = result.data;
                var roomId = room._id;
                var type = db.roomLog.actionType.newPaymentReceive;
                var content = db.roomLog.actionTypeMessage(type, data);
                var itemGUID = '';
                common.messageEvent.messageSendExecute(roomId, config.botId.luvaPayBot, type, content, itemGUID, (res) => {
                    data.actionType = type;
                    console.log(data);
                    var title = db.notification.generateActionNotifyTitle(type, data);
                    var message = db.notification.generateActionMessage(type, data);
                    var image = db.notification.generateActionTypeImage(type, data);
                    if (userIds && userIds.length > 0) {

                        db.notification.addNotifies(userId, userIds, title, message, image, type, data, (result) => {
                            console.log('add notify');
                            console.log(result);
                            if (result.errorCode == errorCodes.success) {
                                common.notify.pushNotifyList(result.data);
                            }
                        });
                    }

                    callback(res);
                });
            }
            else {
                callback(result);
            }

        });
    });

    socket.on(eventName.error, (data, callback) => {

    });

    function paymentReceive(logId, destUserId, senderUserId, methodId, transactionType, status, amount, assetCode, userNote, callback) {
        var senderUser, destUser;

        var getSenderUserInfo = function (cb) {
            db.user.getUserInfo(senderUserId, false, (result) => {
                if (result.errorCode == errorCodes.success) {
                    senderUser = result.data;
                    cb();
                }
                else {
                    cb();
                }
            });
        };

        var getDestUserInfo = function (cb) {
            db.user.getUserInfo(destUserId, false, (result) => {
                if (result.errorCode == errorCodes.success) {
                    destUser = result.data;
                    cb();
                }
                else {
                    cb();
                }
            });
        };

        var data = {
            logId: logId,
            senderUserId: senderUserId,
            destUserId: destUserId,
            methodId: methodId,
            transactionType: transactionType,
            status: status,
            amount: amount,
            assetCode: assetCode,
            userNote: userNote
        };

        var sendToSender = function (cb) {
            //db.luva.room.createLuvaPayBotRoom(senderUserId, (result) => {
            //    if (result.errorCode == errorCodes.success) {
            //        var room = result.data;
            //        var roomId = room._id;
            var type = db.roomLog.actionType.paymentStatusChanged;
            //var content = db.roomLog.actionTypeMessage(type, data);
            //var itemGUID = '';
            //common.messageEvent.messageSendExecute(roomId, config.botId.luvaPayBot, type, content, itemGUID, (res) => {
            data.actionType = type;
            console.log(data);
            var title = db.notification.generateActionNotifyTitle(type, data);
            var message = db.notification.generateActionMessage(type, data);
            var image = db.notification.generateActionTypeImage(type, data);

            db.notification.addNotifies(config.botId.luvaPayBot, [senderUserId], title, message, image, type, data, (resultNoti) => {
                if (resultNoti.errorCode == errorCodes.success) {
                    common.notify.pushNotifyList(resultNoti.data);
                }
                cb();
            });

            //});
            //    }
            //    else {
            //        cb(result);
            //    }

            //});
        };

        var sendToReceiver = function (cb) {
            //chỉ khi status = SUCCESS thì mới gửi thông báo tới người nhận
            if (status == db.luva.constant.PAYMENTSTATUS.SUCCESS) {
                //db.luva.room.createLuvaPayBotRoom(destUserId, (result) => {
                //    if (result.errorCode == errorCodes.success) {
                //        var room = result.data;
                //        var roomId = room._id;
                var type = db.roomLog.actionType.newPaymentReceive;
                //var content = db.roomLog.actionTypeMessage(type, data);
                //var itemGUID = '';
                //common.messageEvent.messageSendExecute(roomId, config.botId.luvaPayBot, type, content, itemGUID, (res) => {
                data.actionType = type;
                var title = db.notification.generateActionNotifyTitle(type, data);
                var message = db.notification.generateActionMessage(type, data);
                var image = db.notification.generateActionTypeImage(type, data);

                db.notification.addNotifies(config.botId.luvaPayBot, [destUserId], title, message, image, type, data, (resultNoti) => {
                    if (resultNoti.errorCode == errorCodes.success) {
                        common.notify.pushNotifyList(resultNoti.data);
                    }
                    cb();
                });


                //});
                //    }
                //    else {
                //        cb(result);
                //    }

                //});
            }
            else {
                cb();
            }
        };


        async.parallel([getSenderUserInfo, getDestUserInfo],
            (err) => {
                if (!err) {
                    if (senderUser) {
                        data.senderUserName = senderUser.name;
                        data.senderUserAvatar = senderUser.avatar;
                        data.senderUserPhone = senderUser.phone;
                    }
                    if (destUser) {
                        data.destUserName = destUser.name;
                        data.destUserAvatar = destUser.avatar;
                        data.destUserPhone = destUser.phone;
                    }

                    async.parallel([sendToSender, sendToReceiver], (errX) => {
                        if (errX) {
                            console.log(errX);
                        }
                        callback(errX);
                    });
                }
                else {
                    callback(err);
                }
            }
        );
    }

    socket.on(eventName.paymentResult, (result, callback) => {
        if (result.errorCode == errorCodes.success) {
            var payResult = result.data;
            var logId = payResult._id;
            var senderUserId = payResult.senderUserId;
            var destUserId = payResult.destUserId;
            var methodId = payResult.methodId;
            var transactionType = payResult.transactionType;
            var status = payResult.status;
            var amount = payResult.amount;
            var assetCode = payResult.assetCode;
            var userNote = payResult.userNote;

            paymentReceive(logId, destUserId, senderUserId, methodId, transactionType, status, amount, assetCode, userNote, callback);
        }
        else {
            //chưa xử lý, vì khi error ko trả về thông tin cụ thể của user để notify
        }
    });
}