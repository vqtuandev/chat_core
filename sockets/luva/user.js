var _ = require('lodash');
var textHelper = require('../../utility/textHelper');
var crypoHelper = require('../../utility/cryptoHelper');
var azureHelper = require('../../services/azure');
var resultHelper = require('../../utility/resultHelper');
var errorCodes = resultHelper.errorCodes;

var luvaService = require('../../services/luvaService');

var eventName = {
    getUserAccountInfo: 'luva/account/getInfo',
    updateUserAccountInfo: 'luva/account/updateInfo',
    createUserAccountKey: 'luva/account/createKey',
    updateUserAccountPin: 'luva/account/updatePin',
    updateUserAccountIsValidate: 'luva/account/updateIsValidate',
    updateUserAccountValidateImages: 'luva/account/updateValidateImages',
    getRegisterPromotion: 'luva/account/getRegisterPromotion'
};

module.exports = function (socket, socketMap, db, common) {
    socket.on(eventName.getUserAccountInfo, (data, callback) => {
        var userId = socket.userId;
        console.log('getUserAccountInfo userId', userId);
        db.luva.account.getUserAccountInfo(userId, (result) => {
            if (result.errorCode = errorCodes.success) {
                var account = result.data;
                if (account.privateKey) {
                    account.privateKey = crypoHelper.decrypt(account.privateKey);
                }
                if (account.pin) {
                    account.pin = crypoHelper.decrypt(account.pin);
                }
                result.data = account;
            }
            if (typeof callback === 'function') {
                callback(result);
            }
        });
    });

    socket.on(eventName.updateUserAccountInfo, (data, callback) => {
        var userId = socket.userId;
        var identityId = data.identityId;
        var realName = data.realName;
        var address = data.address;
        var gender = data.gender;
        var dob = data.dob;
        var referral = data.referral;
        console.log(identityId, realName, address, gender, dob, referral);
        db.luva.account.updateUserAccountInfo(userId, identityId, realName, address, gender, dob, referral, (result) => {
            console.log(result);
            if (result.errorCode == errorCodes.success) {
                db.user.updateUserName(userId, realName, () => {
                });
            }
            if (typeof callback === 'function') {
                callback(result);
            }
        });
    });

    socket.on(eventName.createUserAccountKey, (data, callback) => {
        var userId = socket.userId;
        var userInfo = socket.userInfo;
        var phone = userInfo.phone;

        //var publicKey = data.publicKey;
        //var privateKey = data.privateKey;
        //privateKey = crypoHelper.encrypt(privateKey);

        //db.luva.account.createStellarAccountAndUpdateToFederationServer(userId, publicKey, privateKey, (result) => {
        //    if (result.errorCode == errorCodes.success) {
        var token = socket.handshake.query.token;
        console.log(token);
        //bổ sung update vào DB federation Server để lookup id từ stellar address
        luvaService.createStellarAccountAndUpdateToFederationServer(token, (x) => {
            console.log(x);
            //console.log(callback);
            if (x.errorCode == errorCodes.success) {
                db.user.updateHasPayAccount(userId, true, (r) => {
                });
            }
            //if (x.errorCode == errorCodes.success) {
            if (typeof callback === 'function') {
                callback(x);
            }
            //}
            //else {
            //    callback(x);
            //}
        });
        //    }
        //    else {
        //        callback(result);
        //    }
        //});
    });

    socket.on(eventName.getRegisterPromotion, (data, callback) => {
        var userId = socket.userId;
        //var userInfo = socket.userInfo;

        db.luva.account.getUserAccountInfo(userId, (result) => {
            if (result.errorCode = errorCodes.success) {
                var account = result.data;
                if (account.registerPromoReceived) {
                    callback(resultHelper.returnResultExists('Đã nhận trước đó'));
                }
                else {
                    var token = socket.handshake.query.token;
                    
                    luvaService.getRegisterPromotion(token, (result) => {
                        if (result.errorCode == 0) {
                            db.luva.account.updateUserAccountGetPromo(userId, (resU) => {
                                if (resU.errorCode == 0) {
                                    callback(result);
                                }
                                else {
                                    callback(resultHelper.returnResultDBError('Cập nhật nhận thưởng vào DB ko thành công'));
                                }
                            });
                        }
                        else {
                            callback(result);
                        }
                    });
                }
            }
        });
    });

    socket.on(eventName.updateUserAccountPin, (data, callback) => {
        var userId = socket.userId;
        var pin = data.pin;
        pin = crypoHelper.encrypt(pin);
        db.luva.account.updateUserAccountPin(userId, pin, (result) => {
            if (typeof callback === 'function') {
                callback(result);
            }
        });
    });

    socket.on(eventName.updateUserAccountIsValidate, (data, callback) => {
        var userId = socket.userId;
        var isValidate = data.isValidate;

        db.luva.account.updateUserAccountIsValidate(userId, isValidate, (result) => {
            if (typeof callback === 'function') {
                callback(result);
            }
        });
    });

    socket.on(eventName.updateUserAccountValidateImages, (data, callback) => {
        var userId = socket.userId;
        var validateImages = data.validateImages;

        db.luva.account.updateUserValidateImages(userId, validateImages, (result) => {
            if (typeof callback === 'function') {
                callback(result);
            }
        });
    });
}