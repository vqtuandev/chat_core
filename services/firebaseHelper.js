var admin = require('firebase-admin');
var serviceAccount = require('../serviceAccountKey.json');
var resultHelper = require('../utility/resultHelper');
var errorCodes = resultHelper.errorCodes;

function initApp() {
    return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://luvapay-dabcd.firebaseio.com"
    });
}

var defaultApp = initApp();

module.exports = () => {
    var verifyTokenAndGetData = (token, callback) => {
        if (!defaultApp) {
            defaultApp = initApp();
        }

        var defaultAuth = defaultApp.auth();

        defaultAuth.verifyIdToken(token)
            .then((decodedToken) => {
                console.log(decodedToken);
                console.log(decodedToken.phone_number);
                var phone = decodedToken.phone_number;
                if (phone) {
                    callback(resultHelper.returnResultSuccess(phone));
                }
                else {
                    callback(resultHelper.returnResultNotExists());
                }
            })
            .catch((error) => {
                console.log(error);
                callback(resultHelper.returnResultServiceError(error));
            });
    };

    return {
        verifyTokenAndGetData: verifyTokenAndGetData
    }
}