var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var moment = require('moment');

var async = require('async');

var fs = require('fs');
var https = require('httpolyglot');
var http = require('http');

var myXteamV1 = require('./services/myXteamV1');

var cryptoHelper = require('./utility/cryptoHelper');

var db = require('./models/db.js');
var dbRoom = require('./models/dbRoom.js');
var dbUser = require('./models/dbUser.js');
var dbLuvapay = require('./models/dbLuvapay.js');

var data = require('./models/all');

var defaultConfig = require('./configs');

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));



//connect to mongo
var connectDBTasks = [];
connectDBTasks.push(function (cb) {
    db.connect(function (err) {
        if (err) {
            console.log('Unable to connect to Mongo.')
            console.log(err);
            process.exit(1);
        }
        else {
            cb();
        }
    });
});
connectDBTasks.push(function (cb) {
    dbRoom.connect(function (err) {
        if (err) {
            console.log('Unable to connect to Mongo Room.')
            console.log(err);
            process.exit(1)
        }
        else {
            cb();
        }
    });
});
connectDBTasks.push(function (cb) {
    dbUser.connect(function (err) {
        if (err) {
            console.log('Unable to connect to Mongo User.')
            console.log(err);
            process.exit(1)
        }
        else {
            cb();
        }
    });
});

connectDBTasks.push(function (cb) {
    dbLuvapay.connect(function (err) {
        if (err) {
            console.log('Unable to connect to Mongo Luvapay.')
            console.log(err);
            process.exit(1)
        }
        else {
            cb();
        }
    });
});

async.series(connectDBTasks, (err) => {
    console.log('connected db');
    //data.user.createIndex();
    //data.room.createIndex();
    //data.user.initUserCounter();

    //data.room.getPrivateRoom('5c7f82d7f425ba21909608a3', '5c7f8240f425ba2190960894', '5c7f82d7f425ba21909608a3', function (result) {
    //    console.log(result);
    //});

    //cors and preflight config
    //set lại origin
    app.use(function (req, res, next) {

        let origin = req.headers.origin;
        console.log('origin', origin);
        if (defaultConfig.allowedOrigins.includes(origin)) {
            res.header("Access-Control-Allow-Origin", origin);
        }
        res.header("Access-Control-Allow-Origin", '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        res.header('Access-Control-Allow-Credentials', true);
        if (req.method === "OPTIONS") {
            res.sendStatus(200);
        }
        else {
            next();
        }
    });

    require('./restAPI')(app, defaultConfig.jwtSecret);

    app.use('/', routes);
    app.use('/users', users);

    console.log(moment().utc());


    // catch 404 and forward to error handler
    app.use(function (req, res, next) {
        var err = new Error('Not Found');
        err.status = 404;
        next(err);
    });

    // error handlers

    // development error handler
    // will print stacktrace
    if (app.get('env') === 'development') {
        app.use(function (err, req, res, next) {
            res.status(err.status || 500);
            res.render('error', {
                message: err.message,
                error: err
            });
        });
    }

    // production error handler
    // no stacktraces leaked to user
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: {}
        });
    });


    app.set('port', process.env.PORT || 3002);
    //var privateKey = fs.readFileSync('./muabannhanh.key', 'utf8');
    //var certificate = fs.readFileSync('./muabannhanh.crt', 'utf8');

    //var credentials = { key: privateKey, cert: certificate };

    //var server = https.createServer(credentials, app);
    var server = http.createServer(app);

    app.use(function (req, res, next) {
        console.log('https://' + req.headers.host + req.url + req.path);
        if (req.socket.encrypted) {
            // request was via https, so do no special handling
            next();
        } else {
            // request was via http, so redirect to https
            console.log('https://' + req.headers.host + req.url + req.path);
            res.redirect('https://' + req.headers.host + req.url);
        }
    });

    server.listen(app.get('port'), function () {
        console.log('Express server listening on port ' + app.get('port'))
    });

    //console.log(cryptoHelper.encrypt('lol'));
    //var userId = '5c88786337b2311c701a2771';
    //var publicKey = 'GDI2EDUBUZIWDV346HU7Q4EQUJVUUNZUZ2J3MM2FHINLD74JI74HB7CM';
    //var privateKey = cryptoHelper.encrypt('SCX6XAP623H6MNDUX4LQ7USAH2JCEL3YO4GI34VSJFK3CUSE4QQITBIV');
    //var luvaService = require('./services/luvaService');
    //data.luva.account.updateUserAccountKey(userId, publicKey, privateKey, (result) => {
    //    if (result.errorCode == 0) {
    //        var token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1Yzg4Nzg2MzM3YjIzMTFjNzAxYTI3NzEiLCJlbWFpbCI6InZzb2Z0cGh1b25nQGdtYWlsLmNvbSIsInBob25lIjoiKzg0OTM4OTM2MTI4IiwiYXZhdGFyIjoiaHR0cHM6Ly9sdXZhcGF5LmJsb2IuY29yZS53aW5kb3dzLm5ldC9hdmF0YXIvNWM4ODc4NjMzN2IyMzExYzcwMWEyNzcxL2U2MzM3ZTQzLTk4NGMtNDU2Ni04ZDI0LTcxZGZlM2QzN2NiZi9qcGVnXzIwMTkwMzEzXzEwMzAwNC5qcGciLCJuYW1lIjoiUGjhuqFtIFRydW5nIFBoxrDGoW5nIiwiY3JlYXRlRGF0ZSI6MTU1MjQ0NzU4NywibGFzdFVwZGF0ZURhdGUiOjE1NTI0NDc4MjksImxhc3RMb2dpbkRhdGUiOjE1NTMyMjc5ODcsInBhc3N3b3JkIjoiIiwiaWF0IjoxNTUzMjI5MDY3LCJleHAiOjQ3MDY4MjkwNjd9.3n7lpMx58EFUmJ2iLV43T0ENm4-XyhOGM2dKjzJx8YI';

    //        //bổ sung update vào DB federation Server để lookup id từ stellar address
    //        luvaService.updateAccountToFederationServer(token, (x) => {
    //            console.log('return f
    //            if (x.errorCode == 0) {
    //                console.log(result);
    //                //callback(result);
    //            }
    //            else {
    //                console.log(x);
    //            }
    //        });
    //    }
    //    else {
    //        console.log(result);
    //    }
    //});

    //console.log(cryptoHelper.decrypt('533c4a4745bae6f43438677ecca7493be59c22828054ec9360db25795f95e8d89696af769e4d33aa6c6fe230d8dd3cbf1e8b0d62e6d90c9b'));
    //var phoneHelper = require('./utility/phoneHelper');
    //console.log('84943282606', phoneHelper.patchValidPhoneNumber('84943282606'));
    //console.log('+84943282606', phoneHelper.patchValidPhoneNumber('+84943282606'));
    //console.log('943282606', phoneHelper.patchValidPhoneNumber('943282606'));
    //console.log('0943282606', phoneHelper.patchValidPhoneNumber('0943282606'));
    //console.log('840943282606', phoneHelper.patchValidPhoneNumber('840943282606'));
    //console.log('+840943282606', phoneHelper.patchValidPhoneNumber('+840943282606'));
    //console.log('0362342558', phoneHelper.patchValidPhoneNumber('0362342558'));
    //console.log('362342558', phoneHelper.patchValidPhoneNumber('362342558'));
    //console.log('462342558', phoneHelper.patchValidPhoneNumber('462342558'));

    //myXteamV1.authtoken('tester@gmail.com', '1', (result) => { console.log(result); });
    //myXteamV1.getUserInfo('c7OqxQ1DdgsFWx5uQrpREXBZl1QJGnZtDzL1-ckEzoruNaBFtHXinH0UKPkq7h9GzKF1xMoUUICt4UWgRFMqcILR6x3Nq5w-n-JM1zPa1s0rXVbkEXL0onpXHDIvPXtyiT0bcKxghwZ_SK8j7goijQP4foZYbOMt1P1gzJ-u8tVPZbHw5Fr1dH6CJOPwczVL8F9d7n9ZubCOXnIOHuS5uYyUYGy8Dxg8VCkR4QZu2TtwKIm9bzTdfNg5rzwuFIdZpuQ09jP_yP9UoGr3dhOp5pIEcjP-_ERC_ua6s2JldT4TL68y5tM_LMu4a2BftZ7cusfjddvAtpbJGRBtnFy_rNHaZ4ovbDfwOwR5ADiPwirWQ1O7foND8E4VL8EbeRXAJt2RAWVJHnisM81kZpIJEbk1zqL7VWe4kwNRE77xhYxAXQUVH_4b01uehPaAZpecdbH1Oy_0QeLWJdDG_eujDNwSPM3bOq6Ek1BhtKh5ya00ufSuk35I94_eRYLRBvqYIw-Upka6_7Qbg6W_hxTtjybxNK3DPoEhEVvjmpJglt8UiakSYE-vFb9NuhLSpOdfkGzI8XihFJnt1EK2h9r-WM513MgqjqzmSgFrS6UkysZIbm-Ctic0dgbtkJpqQJGeHQYVh4OQNxJU7Tk_IvxYPhqYr8HjxYNwU8eryR_N43N2wFYn4qqhf3V1LxbOA7YLPTxDvaG2E51um8eJ2lf4N430OBNxR-jH-pGZ8pOSPhu5JX7s7eXxkXe45WvfMlMw-1uptL9wS-W13mQYZOoaFI9wfmonspiCrrzqziVAmVf9YpKleEj_NsxirZrs8MpuEmPaCSxj7nbtYArCIlDdEraQOTO88pzf9snhtbZAwVhBXneHtCcYNECQDEKX6d46gDaXmNgb2gydj_i8NqyH53G9Um8IsLH_9zi4im6LbChNw138tSqUWD3BQPy-RYiMYLMP8iWh2dxiptOGS8cNG7R4w4UkdpdBK51-FXs0k3o5RH3bjHEM1xEZlr4vqWm4kVPnB5Sgb3ZIVVxJXQW3Fv0sifQp3P_dnhRCDdeKFVb27rapogPPqppWtL-DmqumAVVMGRMM82hCTNOO3dHr7WFPtgHeNZc1TvPnYakzXWFnXvUq6-VEtnUgJZx_d-GCKNlKM62jHGyONjdYr_JgsvTHO3_GyMarETfR1bxXtJw',
    //    (result) => {
    //        console.error(result);
    //    });
    // socket.io events
    setTimeout(() => {
        var db = require('./models/all');
        //db.roomLog.getRoomLogs('5d0a6e1bc1313d0ad8b34409', '5d0b302403f45e15485e1b77', null, 20, (result) => {
        //    console.log(result.data);
        //});

    }, 2000);
    require('./socket.js')(server);
});



