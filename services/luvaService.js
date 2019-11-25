var unirest = require('unirest');
var resultHelper = require('../utility/resultHelper.js');
var errorCodes = resultHelper.errorCodes;
var errorLog = require('../models/errorLog.js');
var config = require('../configs');

var methods = {    
    createAccountKey: '/account/createKey',
    getRegisterPromotion: '/account/getRegisterPromotion'
    
};
function getResponseAndParse(response, callback) {
    
    if (response) {
        if (response.status == 200) {
            callback(response.body);
        }
        else {
            errorLog.addLog(errorLog.errorType.luvaService, response.body, function () { });
            callback(resultHelper.returnResultServiceError(response.body));
        }
    }
    else {
        errorLog.addLog(errorLog.errorType.luvaService, 'Response body null', function () { });
        callback(resultHelper.returnResultServiceError('Response body null'));
    }
}

function addTokenToHeader(request, token) {
    return request.headers({
        Authorization: 'bearer ' + token
    });
}

exports.createStellarAccountAndUpdateToFederationServer = function (token, callback) {
    var request = unirest.post(config.luvaServiceUrl + methods.createAccountKey);
    addTokenToHeader(request, token).end(function (response) {
        getResponseAndParse(response, callback);
    });
}

exports.getRegisterPromotion = function (token, callback) {
    var request = unirest.post(config.luvaServiceUrl + methods.getRegisterPromotion);
    addTokenToHeader(request, token).end(function (response) {
        getResponseAndParse(response, callback);
    });
}