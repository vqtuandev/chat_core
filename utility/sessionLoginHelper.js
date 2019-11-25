const jwt = require('jsonwebtoken');
var resultHelper = require('../utility/resultHelper');
var config = require('../configs');

//hàm kiểm tra đăng nhập theo session
exports.ensureLogin = function ensureLogin(req, res, next) {

    const header = req.headers['authorization'];
    console.log(req.headers);
    console.log(header);
    if (typeof header !== 'undefined') {
        const bearer = header.split(' ');
        const token = bearer[1];

        req.token = token;

        jwt.verify(req.token, config.jwtSecret, (err, authorizedData) => {
            if (err) {
                sendErrors(res, 'Không có quyền truy cập! Vui lòng đăng nhập trước!!!');
            }
            else {
                req.user = authorizedData;
                console.log(authorizedData);
                next();
            }
        });
    } else {
        //If header is undefined return Forbidden (403)
        sendErrors(res, 'Không có quyền truy cập! Vui lòng đăng nhập trước!!!');
    }
};

function sendErrors(res, msgs) {
    //console.log(msgs);
    res.status(401).json();
}