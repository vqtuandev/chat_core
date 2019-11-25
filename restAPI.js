var jwt = require('jsonwebtoken');
var myXteamV1 = require('./services/myXteamV1');
var resultHelper = require('./utility/resultHelper');
var errorCodes = resultHelper.errorCodes;
var textHelper = require('./utility/textHelper');
var cryptoHelper = require('./utility/cryptoHelper');
var db = require('./models/all');
var defaultConfig = require('./configs');

var accountKit = require('./services/accountKit');
var firebaseHelper = require('./services/firebaseHelper')();
var ensureLogin = require('./utility/sessionLoginHelper').ensureLogin;

module.exports = function (app, jwtSecret) {
    //tạo token từ thông tin user
    //function fy() {
    //    var token = jwt.sign({ _id: "5c88df67234faf2bccac3915", name: "ServiceCallback" }, jwtSecret, { expiresIn: defaultConfig.tokenExpireTime });
    //    console.log(token);
    //}
    //fy();
    function parseLoginResultToToken(result, os, ip, device) {
        console.log(result);

        if (result.errorCode == resultHelper.errorCodes.success || result.errorCode == resultHelper.errorCodes.successNew) {
            try {
                var user = result.data;
                user.services = undefined;
                user.notifyIds = undefined
                user.contacts = undefined;
                user.oneSignalUserIds = undefined;
                user.signers = undefined;
                // we are sending the profile in the token
                var token = jwt.sign(user, jwtSecret, { expiresIn: defaultConfig.tokenExpireTime });
                console.log(token);
                result.data.token = token;
            }
            catch (ex) {
                console.log(ex);
            }
        }
        return result;
    }

    function checkLoginParameter(data) {
        var username = data.username;
        var password = data.password;

        var error;
        if (!username || (!textHelper.isEmail(data.username) && !textHelper.isMobile(data.username))) {
            error = {};
            error.username = true;
        }
        //if (!password) {
        //    if (!error) {
        //        error = {};
        //    }
        //    error.password = true;
        //}
        return error;
    }

    app.post('/login', function (req, res) {
        var data = req.body;

        //check data parameter
        var error = checkLoginParameter(data);

        if (error) {
            res.json(resultHelper.returnResultParameterError(error));
        }
        //chưa define isEmail với isMobile
        else if (textHelper.isEmail(data.username)) {
            var password = cryptoHelper.encrypt(data.password);
            //console.log(password);
            db.user.loginByEmail(data.username, password, (result) => {
                console.log(result);
                res.json(parseLoginResultToToken(result, data.os, data.ip, data.device));
            });
        }
        else if (textHelper.isMobile(data.username)) {
            var password = cryptoHelper.encrypt(data.password);
            console.log(password);
            db.user.loginByPhone(data.username, password, (result) => {
                res.json(parseLoginResultToToken(result, data.os, data.ip, data.device));
            });
        }
    });

    app.post('/mobileLogin', function (req, res) {

        var data = req.body;
        var mobile = data.mobile;
        mobile = mobile.replace(/\s+|-/g, '');
        if (textHelper.isMobile(mobile)) {
            db.user.getOrCreateAccountByMobile(mobile, (result) => {
                res.json(result);
            });
        }
        else {
            res.json(resultHelper.returnResultParameterError({ mobile: true }));
        }
    });

    app.post('/fbaLogin', function (req, res) {
        var data = req.body;
        console.log(data);
        var mobile = data.mobile;
        var _id = data._id;
        console.log(_id);
        db.user.getUserInfo(_id, true, (result) => {
            if (result.errorCode == errorCodes.success) {
                res.json(parseLoginResultToToken(result, data.os, data.ip, data.device));
            }
            else {
                res.json(resultHelper.returnResultNotExists({ _id: true }));
            }
        });
    });

    app.post('/completeSignup',

        function (req, res) {
            var data = req.body;
            console.log(data);
            var _id = data._id;
            var mobile = data.mobile;
            var email = data.email;
            var fullname = data.fullname;
            var password = data.password;

            //db.user.checkEmailExists(email, _id, (resC) => {
            //    console.log(resC);
            //if (resC.errorCode == errorCodes.success) {
            //var exists = resC.data;
            //if (exists) {
            //    //đã tồn tại email
            //    res.json(resultHelper.returnResultExists({ email: true }));
            //}
            //else {
            password = cryptoHelper.encrypt(password);
            console.log(password);
            db.user.completeRegister(_id, mobile, email, fullname, password, (result) => {
                console.log(result);
                if (result.errorCode == errorCodes.success) {
                    res.json(parseLoginResultToToken(result, data.os, data.ip, data.device));
                }
                else {
                    res.json(result);
                }
            });
            //}
            //}
            //else {
            //    res.json(resC);
            //}
            //});
        });

    function checkLoginParameterMXTV1(data) {
        var email = data.email;
        var password = data.password;

        var error;
        if (!email || (!textHelper.isEmail(email))) {
            error = {};
            error.email = true;
        }
        if (!password) {
            if (!error) {
                error = {};
            }
            error.password = true;
        }
        return error;
    }

    app.post('/loginViaMXTV1', function (req, res) {
        var data = req.body;

        //check data parameter
        var error = checkLoginParameterMXTV1(data);

        if (error) {
            res.json(resultHelper.returnResultParameterError(error));
        }
        //chưa define isEmail với isMobile
        else if (textHelper.isEmail(data.username)) {
            myXteamV1.authtoken(data.username, data.password, (result) => {
                if (result.errorCode == errorCodes.success) {
                    var access_token = result.data.access_token;
                    var header = {
                        token: access_token,
                        os: data.os,
                        deviceId: data.device
                    };
                    myXteamV1.getUserInfo(header, (res) => {
                        if (res.errorCode == errorCodes.success) {
                            var userMXT = res.data;
                            db.user.updateLoginFromMyXteam(data.username, access_token, userMXT, (r) => {
                                if (r.errorCode == errorCodes.success) {
                                    res.json(parseLoginResultToToken(r, data.os, data.ip, data.device));
                                }
                                else {
                                    res.json(r);
                                }
                            });
                        }
                        else {
                            res.json(res);
                        }
                    });
                }
                else {
                    res.json(result);
                }
            });
            //db.user.loginViaMyXteamV1(data.email, data.password, (result) => {
            //    res.json(parseLoginResultToToken(result, data.os, data.ip, data.device));
            //});
        }
    });

    app.post('/loginByAK',
        function (req, res) {
            var data = req.body;
            var code = data.code;
            accountKit.queryAccessTokenData(code, (resultAK) => {
                if (resultAK.errorCode == errorCodes.success) {
                    var phone = resultAK.data;
                    db.user.getOrCreateAccountByMobile(phone, (result) => {
                        res.json(parseLoginResultToToken(result, data.os, data.ip, data.device));
                    });
                    //db.user.loginByPhone(phone, '', (result) => {
                    //    res.json(parseLoginResultToToken(result, data.os, data.ip, data.device));
                    //});
                }
                else {
                    res.json(resultAK);
                }
            });
        });

    app.post('/loginByFirebase',
        function (req, res) {
            var data = req.body;
            var code = data.code;
            if (code) {
                firebaseHelper.verifyTokenAndGetData(code, (resultAK) => {
                    if (resultAK.errorCode == errorCodes.success) {
                        var phone = resultAK.data;
                        db.user.getOrCreateAccountByMobile(phone, (result) => {
                            res.json(parseLoginResultToToken(result, data.os, data.ip, data.device));
                        });
                        //db.user.loginByPhone(phone, '', (result) => {
                        //    res.json(parseLoginResultToToken(result, data.os, data.ip, data.device));
                        //});
                    }
                    else {
                        res.json(resultAK);
                    }
                });
            }
            else {
                res.json(resultHelper.returnResultParameterError({ code: true }));
            }
        });

    app.post('/completeInfo',
        [ensureLogin],
        function (req, res) {
            var user = req.user;
            var userId = user._id;

            var data = req.body;

            var mobile = data.mobile;
            var email = data.email;
            var fullname = data.fullname;
            var password = data.password;

            password = cryptoHelper.encrypt(password);
            console.log(password);
            db.user.completeRegister(_id, mobile, email, fullname, password, (result) => {
                console.log(result);
                if (result.errorCode == errorCodes.success) {
                    res.json(parseLoginResultToToken(result, data.os, data.ip, data.device));
                }
                else {
                    res.json(result);
                }
            });
        }
    );

    app.post('/user/removeOneSignalId',
        (req, res) => {
            var data = req.body;
            db.user.deleteOneSignalUserIdFromOtherUser('', data.oneSignalUserId);
            res.json(resultHelper.returnResultSuccess());
        }
    );

    //function checkRegisterParameterMXTV1(data) {
    //    var email = data.email;
    //    var password = data.password;

    //    var error;
    //    if (!email || !textHelper.isEmail(data.email)) {
    //        error = {};
    //        error.email = true;
    //    }        
    //    if (!password) {
    //        if (!error) {
    //            error = {};
    //        }
    //        error.password = true;
    //    }
    //    return error;
    //}

    //app.post('/registerViaMXTV1', function (req, res) {
    //    var data = req.body;

    //    //check data parameter
    //    var error = checkRegisterParameterMXTV1(data);

    //    if (error) {
    //        res.json(resultHelper.returnResultParameterError(error));
    //    }
    //    //chưa define isEmail với isMobile
    //    else {
    //        db.user.registerViaMyXteamV1(data.userId, data.email, data.password, data.phone, data.name, data.avatar, (result) => {
    //            res.json(result);
    //        });
    //    }
    //});
}