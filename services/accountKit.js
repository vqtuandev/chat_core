const Request = require('request');
const Querystring = require('querystring');
//https://developers.facebook.com/apps/318805432318185/account-kit/settings/
const account_kit_api_version = 'v1.0';
const app_id = '318805432318185';
const app_secret = '8cd7f9f407dc7768dad3402b8d510829';
const me_endpoint_base_url = 'https://graph.accountkit.com/' + account_kit_api_version + '/me';
const token_exchange_base_url = 'https://graph.accountkit.com/' + account_kit_api_version + '/access_token';

function queryAccessTokenData(code, callback) {
    var app_access_token = ['AA', app_id, app_secret].join('|');
    var params = {
        grant_type: 'authorization_code',
        code: code,
        access_token: app_access_token
    };
    // exchange tokens
    var token_exchange_url = token_exchange_base_url + '?' + Querystring.stringify(params);
    Request.get({ url: token_exchange_url, json: true }, function (err, resp, respBody) {
        //console.log(respBody);
        var view = {
            user_access_token: respBody.access_token,
            expires_at: respBody.expires_at,
            user_id: respBody.id,
        };

        // get account details at /me endpoint
        var me_endpoint_url = me_endpoint_base_url + '?access_token=' + respBody.access_token;
        Request.get({ url: me_endpoint_url, json: true }, function (err, resp, respBody) {
            //console.log(respBody);
            // send login_success.html
            if (respBody.phone) {
                callback({ errorCode: 0, data: respBody.phone.number });
            }
            else if (respBody.email) {
                callback({ errorCode: 0, data: respBody.email.address });
            }
            else {  
                callback({ errorCode: 109, error: 'Xác thực đã quá hạn. Vui lòng thử lại' });
            }
        });
    });
}
exports.queryAccessTokenData = queryAccessTokenData;

