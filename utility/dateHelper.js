var moment = require('moment');

/**
* lấy timestamp hiện tại, thay vì lấy date theo UTC như kiểu cũ
 * @return timestamp
**/
exports.getUTCNow = function () {
    return parseInt(moment().utc().format('X'));
}

exports.getUTCStartOfDay = function (date) {
    if (date) {
        return moment(date).utc().startOf("day").format();
    }
    else {
        return moment().utc().startOf("day").format();
    }
}

exports.getUTCEndOfDay = function (date) {
    if (date) {
        return moment(date).utc().endOf("day").format();
    }
    else {
        return moment().utc().endOf("day").format();
    }
}

exports.getUTCStartOfDayUnixTimeStamp = function getUTCStartOfDayUnixTimeStamp(date) {
    if (date) {
        return moment(date).utc().startOf("day").format('X');
    }
    else {
        return moment().utc().startOf("day").format('X');
    }
}
exports.getUTCUnixTimeStamp = function getUTCUnixTimeStamp(date) {
    if (date) {
        return moment(date).utc().format('X');
    }
    else {
        return moment().utc().format('X');
    }
}
