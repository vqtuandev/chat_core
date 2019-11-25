var unirest = require('unirest');
var resultHelper = require('../utility/resultHelper.js');
var errorCodes = resultHelper.errorCodes;
var errorLog = require('../models/errorLog.js');

var apiUrl = 'https://public.myxteam.com/api/v1/';

var methods = {
    getUserInfo: 'User/Info'
};

function getResponseAndParse(response, method, callback) {
    console.log(response);
    if (response && response.body) {
        var responseBody = response.body;
        if (response.status == 200) {
            if (responseBody.ErrorCode == 0) {
                callback(resultHelper.returnResultSuccess(responseBody.Data));
            }
            else {
                var errorCode = errorCodes.success;
                switch (method) {
                    case methods.getUserInfo: {
                        if (responseBody.ErrorCode == 101) {
                            errorCode = errorCodes.notExist;
                        }
                        break;
                    }
                }
                callback(resultHelper.returnResult(errorCode, responseBody.ErrorMessage, responseBody.Data));
            }
        }
        else {
            errorLog.addLog(errorLog.errorType.myxteamV1, responseBody, function () { });
            callback(resultHelper.returnResultServiceError(responseBody));
        }
    }
    else {
        errorLog.addLog(errorLog.errorType.mbn, 'Response body null', function () { });
        callback(resultHelper.returnResultServiceError('Response body null'));
    }
}
function authtoken(username, password, callback) {
    unirest.post(apiUrl + 'authtoken')
        .form({
            username: username,
            password: password,
            grant_type: 'password'
        })
        .end(function (response) {
            if (response.status == 200) {
                var result = response.body;
                callback(resultHelper.returnResultSuccess(result));
            }
            else {
                var result = response.body;
                if (result.error == '101') {
                    callback(resultHelper.returnResultPermission(result.error_description));
                }
                else {
                    callback(resultHelper.returnResultServiceError(result.error));
                }
            }
        });
}
exports.authtoken = authtoken;

function addTokenHeaderToRequest(request, header) {
    return request.headers({
        Authorization: 'bearer ' + header.token,
        OS: header.os,
        DeviceId: header.deviceId
    });
}

function getUserInfo(header, callback) {
    var request = unirest.get(apiUrl + methods.getUserInfo);

    addTokenHeaderToRequest(request, header)
        .end(function (response) {
            getResponseAndParse(response, methods.getUserInfo, callback);
        });
}

exports.getUserInfo = getUserInfo;