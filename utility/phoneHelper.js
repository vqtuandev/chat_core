var { parsePhoneNumberFromString } = require('libphonenumber-js');

exports.patchValidPhoneNumber = function (phone) {
    var phoneNumber = parsePhoneNumberFromString(phone, 'VN');
    //console.log(phoneNumber);
    if (phoneNumber && phoneNumber.isValid()) {
        return phoneNumber.number;
    }
    else {
        phoneNumber = parsePhoneNumberFromString('+' + phone, 'VN');
        //console.log(phoneNumber);
        if (phoneNumber && phoneNumber.isValid() && phoneNumber.country == 'VN') {
            return phoneNumber.number;
        }
        else {
            return phone;
        }
    }
};