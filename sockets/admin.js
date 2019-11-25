module.exports = (socket, eventName, db) => {
    //for admin
    //online
    socket.on(eventName.getCurrentOnlineUser, function (data, callback) {
        var data = getCurrentOnlineUser();
        if (typeof callback === 'function') {
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
                if (typeof callback === 'function') {
                    callback(result);
                }
            });
        }
        else {
            var paraError = {
                date: date ? false : true,
                itemPerPage: itemPerPage ? false : true,
                pageIndex: pageIndex ? false : true
            };
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
        }
    });

    socket.on(eventName.getUserOnlineCountPerDay, function (data, callback) {
        var userId = socket.userId;
        var fromDate = data.fromDate;
        var toDate = data.toDate;
        var os = data.os;

        if (fromDate && toDate) {
            db.report.getUserOnlineCountPerDay(fromDate, toDate, os, function (result) {
                if (typeof callback === 'function') {
                    callback(result);
                }
            });
        }
        else {
            var paraError = {
                fromDate: fromDate ? false : true,
                toDate: toDate ? false : true
            };
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
        }
    });

    socket.on(eventName.getUserOnlineCountPerMonth, function (data, callback) {
        var userId = socket.userId;
        var fromDate = data.fromDate;
        var toDate = data.toDate;
        var os = data.os;

        if (fromDate && toDate) {
            db.report.getUserOnlineCountPerMonth(fromDate, toDate, os, function (result) {
                if (typeof callback === 'function') {
                    callback(result);
                }
            });
        }
        else {
            var paraError = {
                fromDate: fromDate ? false : true,
                toDate: toDate ? false : true
            };
            if (typeof callback === 'function') {
                callback(resultHelper.returnResultParameterError(paraError));
            }
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
                if (typeof callback === 'function') {
                    callback(result);
                }
            });
        }
        else {
            if (typeof callback === 'function') {
                var paraError = { fromDate: fromDate ? false : true, toDate: toDate ? false : true };
                callback(resultHelper.returnResultParameterError(paraError));
            }
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
                if (typeof callback === 'function') {
                    callback(result);
                }
            });
        }
        else {
            if (typeof callback === 'function') {
                var paraError = { fromDate: fromDate ? false : true, toDate: toDate ? false : true };
                callback(resultHelper.returnResultParameterError(paraError));
            }
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
        if (typeof callback === 'function') {
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
        }
    });

    socket.on(eventName.getUserStartChatByDay, function (data, callback) {
        var userId = socket.userId;
        var fromDate = data.fromDate;
        var toDate = data.toDate;
        var os = data.os;
        if (typeof callback === 'function') {
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
        }
    });

    socket.on(eventName.getUserStartChatByMonth, function (data, callback) {
        var userId = socket.userId;
        var fromDate = data.fromDate;
        var toDate = data.toDate;
        var os = data.os;
        if (typeof callback === 'function') {
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
        }
    });

    //dashboard
    socket.on(eventName.getTotalSummary, function (data, callback) {
        if (typeof callback === 'function') {
            db.report.getTotalSummary(function (result) {
                callback(result);
            });
        }
    });

    //webhook update user profile
    socket.on(eventName.updateUserProfile, function (data, callback) {
        var user = data;
        var os = 'web';
        var token = null;
        console.log('updateUserProfile');
        console.log(user);
        db.user.updateUser(user.id, user.name, user.phone_number, user.email, user.avatar_url, user.url, token, os, function (result) {
            if (typeof callback === 'function') {
                callback(result);
            }
        }, user.admin, true);
    });
}