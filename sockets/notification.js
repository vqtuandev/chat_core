module.exports = (socket, eventName, socketMap, db, resultHelper, common) => {
    ///////////////////////
    //notification
    socket.on(eventName.addNotify, function (data, callback) {
        var createUserId = data.createUserId;
        var userIds = data.userIds;
        var title = data.title;
        var message = data.message;
        var image = data.image;
        var type = data.type;
        var dataX = data.data;
        if (Array.isArray(userIds) == false || userIds.length == 0 || !title || type) {
            var paraError = {
                userIds: !(Array.isArray(userIds) == false || userIds.length == 0),
                title: !title,
                type: !type
            }
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
        }
        else {
            db.notification.addNotifies(createUserId, userIds, title, message, image, type, dataX, (result) => {
                //TODO: xử lý notify

                if (typeof callback === 'function') {
                    callback(result);
                }
            });
        }
    });

    socket.on(eventName.getNotifyList, (data, callback) => {
        var userId = socket.userId;
        if (typeof callback === 'function') {
            var lastItemId = data.lastItemId;
            var itemCount = data.itemCount;

            var isView = data.isView;

            if (!itemCount) {
                itemCount = roomLogCount;
            }
            db.notification.getNotifies(userId, isView, lastItemId, itemCount, (result) => {
                callback(result);
            });
        }
    });

    socket.on(eventName.getUnreadNotifyCount, (data, callback) => {
        var userId = socket.userId;
        if (typeof callback === 'function') {

            db.notification.getUnreadNotifyCount(userId, (result) => {
                callback(result);
            });
        }
    });

    socket.on(eventName.updateAllNotifyIsView, (data, callback) => {
        var userId = socket.userId;
        db.notification.updateAllNotifiesIsView(userId, (result) => {
            //realtime
            if (socketMap[userId] != null) {
                var sockets = socketMap[userId].Sockets;

                if (sockets) {
                    sockets.forEach(function (s) {
                        s.emit(eventName.notifyViewUpdate, resultHelper.returnResultSuccess({ notifyIds: [], isView: true }));
                    });
                }
            }

            if (typeof callback === 'function') {
                callback(result);
            }
        });
    });

    socket.on(eventName.updateNotifyListIsView, (data, callback) => {
        var userId = socket.userId;
        var notifyIds = data.notifyIds;
        var isView = data.isView;
        if (Array.isArray(notifyIds) == false || notifyIds.length == 0 || isView == null || isView == undefined) {
            var paraError = {
                notifyIds: !(Array.isArray(notifyIds) == false || notifyIds.length == 0),
                isView: !(isView == null || isView == undefined)
            }
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
        }
        else {
            db.notification.updateNotifiesIsView(userId, notifyIds, isView, (result) => {

                //realtime
                if (socketMap[userId] != null) {
                    var sockets = socketMap[userId].Sockets;

                    if (sockets) {
                        sockets.forEach(function (s) {
                            s.emit(eventName.notifyViewUpdate, resultHelper.returnResultSuccess({ notifyIds: notifyIds, isView: isView }));
                        });
                    }
                }

                if (typeof callback === 'function') {
                    callback(result);
                }
            });
        }
    });

    socket.on(eventName.removeNotifyList, (data, callback) => {
        var userId = socket.userId;
        var notifyIds = data.notifyIds;
        if (Array.isArray(notifyIds) == false || notifyIds.length == 0) {
            var paraError = {
                notifyIds: !(Array.isArray(notifyIds) == false || notifyIds.length == 0)
            }
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
        }
        else {
            db.notification.removeNotifies(userId, notifyIds, (result) => {
                //realtime
                if (socketMap[userId] != null) {
                    var sockets = socketMap[userId].Sockets;

                    if (sockets) {
                        sockets.forEach(function (s) {
                            s.emit(eventName.removeNotify, resultHelper.returnResultSuccess({ notifyIds: notifyIds }));
                        });
                    }
                }

                if (typeof callback === 'function') {
                    callback(result);
                }
            });
        }
    });
}