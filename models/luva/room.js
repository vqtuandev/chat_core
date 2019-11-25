var _ = require('lodash');
var async = require('async');
var ObjectId = require('mongodb').ObjectId;

var moment = require('moment');

var dataRoom = require('../room');
var roomLog = require('../roomLog');

var resultHelper = require('../../utility/resultHelper.js');
var errorCodes = resultHelper.errorCodes;

var config = require('../../configs');

exports.createLuvaPayBotRoom = function (userId, callback) {
    dataRoom.getPrivateRoom(config.botId.luvaPayBot, userId,  userId, (result) => {
        if (result.errorCode == errorCodes.success) {
            var room = result.data;
            if (!room.lastLog) {
                var content = roomLog.actionTypeMessage(roomLog.actionType.luvapayBotCreate, { userId: userId });
                roomLog.addRoomLogAction(room._id, userId, content, [userId], function (result) {
                    
                });
            }
        }
        callback(result);
    });
}