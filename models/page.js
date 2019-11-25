var _ = require('lodash');

var cache = require('memory-cache');
var cacheTime = 600000;

var pagePrefix = 'page_';

var errorLog = require('./errorLog.js');
var user = require('./user.js');
var mbn = require('../services/mbn.js');
var resultHelper = require('../utility/resultHelper.js');

exports.getPageInfo = function (page_id, callback) {
    //var doc = cache.get(pagePrefix + page_id);    
    //if (doc) {
    //    callback(resultHelper.returnResultSuccess(doc));
    //}
    //else {
    mbn.pageDetail(page_id, function (result) {
        if (result.errorCode == 0) {
            doc = result.data;
            if (doc) {
                cache.put(pagePrefix + page_id, doc, cacheTime, function (key, value) {
                    console.log('page: ' + key + ' cache expire ');
                });
                if (doc.admins_full) {
                    for (var i = 0; i < doc.admins_full.length; i++) {
                        var userInfo = doc.admins_full[i];
                        user.updateUser(userInfo.id, userInfo.name, userInfo.phone_number, userInfo.email, userInfo.avatar_url, userInfo.url, '', null, function (resX) {

                        });
                    }
                }
            }
        }
        callback(result);
    });
    //}
}