var webChatUrl = 'https://chat.muabannhanh.com/?/'
var onesignal = require('node-opensignal-api');
var onesignal_client = onesignal.createClient();
var cache = require('memory-cache');
var cacheTime = 600000;
var userPrefix = 'user_';

var _ = require('lodash');

var db = require('../models/all.js');

var resultHelper = require('../utility/resultHelper.js');
var errorLog = require('../models/errorLog.js');

//var defaultRestApiKey = 'Mjc4YWZkNzMtZjNiMS00MDYxLWE2Y2YtNWQ4OWQ0YTc0NzAz';
var defaultApp_id = 'd8759e1d-f751-4c9c-a12c-08432e43cccf';
//var chatApp_id = '409239b3-6a9b-46ac-a48e-58b786b52f41';
var restApiKeys = {
    'd8759e1d-f751-4c9c-a12c-08432e43cccf': 'Y2FjMGU1OGMtMWJmNi00OTI3LWJmM2QtOTEzZjc5ZGEyYTBl'
};

exports.sendNotify = function sendNotify(subject, message, data, playerIds, roomId, roomMembers, callback) {
    console.log('send notify', message);
    var appPlayerIds = {};

    _.each(restApiKeys, (value, key) => {
        appPlayerIds[key] = [];
    });
    
    for (var i = 0; i < playerIds.length; i++) {
        var playerId = playerIds[i];
        
        if (_.isObject(playerId)) {

            if (playerId.oneSignalAppId) {
                if (appPlayerIds[playerId.oneSignalAppId]) {
                    appPlayerIds[playerId.oneSignalAppId].push({ userId: playerId.oneSignalUserId, os: playerId.os });
                }
            }
            else {
                appPlayerIds[defaultApp_id].push({ userId: playerId.oneSignalUserId, os: playerId.os });
            }
        }
        else {
            appPlayerIds[defaultApp_id].push({ userId: playerId, os: undefined });
        }
    }

    //nếu có app_id của chat thì ko cần push wa app MBN
    //if (/*appPlayerIds[chatApp_id].length > 0 && */appPlayerIds[defaultApp_id].length > 0) {
    //    appPlayerIds[defaultApp_id] = _.filter(appPlayerIds[defaultApp_id], (x) => {
    //        return !(x.os != undefined && _.some(appPlayerIds[chatApp_id], (y) => { return y.os == x.os; }));
    //    });
    //}

    //console.log(appPlayerIds[chatApp_id]);
    //console.log(appPlayerIds[defaultApp_id]);

    _.each(appPlayerIds, (pIds, app_id) => {
        //console.log('turn');
        //console.log(pIds, app_id);
        if (pIds && pIds.length > 0) {
            var playerIds = _.map(pIds, (x) => {
                return x.userId;
            });
            //console.log('playerids');
            //console.log(playerIds);
            sendNotifyToApp(subject, message, data, playerIds, roomId, roomMembers, app_id, function () {
            });
        }
    });
    callback();
}

function sendNotifyToApp(subject, message, data, playerIds, roomId, roomMembers, app_id, callback) {
    //if (app_id == '9b80d065-51a1-49d9-aba7-99c2cef36734') {
    //    console.log('to MBN app');        
    //}
    //else {
    //    console.log('to chatnhanh app');
    //}
    //console.log(roomMembers);
    //console.log(playerIds);
    console.log('send notify to app', message);
    var targetUrl = (webChatUrl + roomId);

    var restApiKey = restApiKeys[app_id];

    var params = {
        app_id: app_id,
        headings: {
            en: subject,
            vi: subject
        },
        contents: {
            en: message,
            vi: message
        },
        include_player_ids: playerIds,
        //included_segments: ["All"],
        data: data,
        //Android
        //Phương nói ko cần truyền icon
        //small_icon: '',
        ///iOS
        mutable_content: true,
        content_available: true,
        ios_badgeType: 'Increase',
        ios_badgeCount: 1,
        //collapse_id: roomId,
        //url: targetUrl
    };

    onesignal_client.notifications.create(restApiKey, params, function (err, response) {
        //console.log('result of');
        //console.log(roomMembers);
        //console.log(err);
        //console.log(response);
        if (err) {
            errorLog.addLog(errorLog.errorType.oneSignal, err, function () { });
            //callback(resultHelper.returnResultServiceError(err));
            callback();
        } else {
            //callback(resultHelper.returnResultSuccess(response));
            callback();
            if (response) {
                if (response.errors) {
                    if (response.errors.invalid_player_ids) {
                        var oneSignalInvalidIds = response.errors.invalid_player_ids;
                        oneSignalInvalidIds.forEach(function (x) {
                            //console.log(x);
                            var found = false;
                            var userId = null;
                            for (var i = 0; i < roomMembers.length && !found; i++) {
                                //console.log(roomMembers[i]);
                                var result = _.some(roomMembers[i].userInfo.oneSignalUserIds, function (playId) {
                                    if (_.isObject(playId)) {
                                        return playId.oneSignalUserId === x;
                                    }
                                    else {
                                        return playId === x;
                                    }
                                });

                                if (result) {
                                    userId = roomMembers[i].userId;
                                    found = true;
                                }
                            }

                            //console.log('userId invalid player id: ' + userId);
                            cache.del(userPrefix + userId);
                            db.user.deleteOneSignalUserId(userId, x, function (z) {
                            });
                        });
                    }
                }
            }
            else {
                errorLog.addLog(errorLog.errorType.oneSignal, 'Response body is null', function () { });
            }
        }
    });
}