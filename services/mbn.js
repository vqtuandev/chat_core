var unirest = require('unirest');
var resultHelper = require('../utility/resultHelper.js');
var errorLog = require('../models/errorLog.js');

var apiUrl = 'https://api.muabannhanh.com/';

var application = 'web';
var apiSecret = '88458287415cd6ca24b41bcbe7716e91';

var appToken = 'cb2663ce82a9f4ba448ba435091e27bb'; //thay cho hàm gọi authenticate vì lúc nào cũng trả về nhiêu đó

var allToken = '843e5e9b8177a3807766067cccc6e75c';

function getResponseAndParse(response, callback) {
    
    if (response && response.body) {
        var responseBody = response.body;
        //console.log(responseBody)
        if (responseBody.status == 200) {
            callback(resultHelper.returnResultSuccess(responseBody.result));
        }
        else {
            errorLog.addLog(errorLog.errorType.mbn, responseBody, function () { });
            callback(resultHelper.returnResultServiceError(responseBody));
        }
    }
    else {
        errorLog.addLog(errorLog.errorType.mbn, 'Response body null', function () { });
        callback(resultHelper.returnResultServiceError('Response body null'));
    }
}

exports.publicToken = appToken;

exports.authenticate = function (callback) {
    unirest.post(apiUrl + 'authenticate')
        .send({ secret: apiSecret, application: application })
        .end(function (response) {
            getResponseAndParse(response, callback);
        });
}

exports.userLogin = function (phone, password, user_agent, ip, callback) {
    unirest.post(apiUrl + 'user/login')
        .query({
            session_token: appToken
        })
        .send({
            phone: phone,
            password: password,
            application: application,
            user_agent: user_agent,
            ip: ip
        })
        .end(function (response) {
            //console.log(response.body);
            getResponseAndParse(response, callback);
        });
}

exports.userDetail = function (id, phone, userToken, callback) {
    unirest.get(apiUrl + 'user/detail')
        .query({
            id: id,
            phone: phone,
            token: userToken,
            session_token: appToken
        })
        .end(function (response) {
            //console.log(response.body);
            getResponseAndParse(response, callback);
        });
}

exports.articleDetail = function (id, callback) {
    unirest.get(apiUrl + 'article/detail')
        .query({
            id: id,
            cache: false,            
            session_token: appToken
        })
        .end(function (response) {
            //console.log(response.body);
            getResponseAndParse(response, callback);
        });
}

exports.pageDetail = function(page_id, callback) {
    unirest.get(apiUrl + 'v2/page/detail')
        .query({            
            page_id: page_id,
            session_token: appToken
        })
        .end(function (response) {
            //console.log(response.body);
            getResponseAndParse(response, callback);
        });
}

exports.checkPhoneNumberExists = function (numbers, userId, token, callback) {
    //console.log(numbers);
    //console.log(userId);
    //console.log(token);
    unirest.post(apiUrl + 'v2/user/check-exits')
        .query({            
            session_token: appToken,
            user_id: userId, 
            token: token
        })
        .send(numbers)
        .timeout(30000)
        .end(function (response) {
            //console.log(response.body);
            getResponseAndParse(response, callback);
        });
}

exports.getUserListById = function(userId, userIds, callback) {
    unirest.post(apiUrl + 'v2/user/list-by-id')
        .query({
            session_token: appToken,
            token: allToken,
            user_id: userId
        })
        .send(userIds)
        .end(function(response) {
            //console.log(response.body);
            getResponseAndParse(response, callback);
        });
}