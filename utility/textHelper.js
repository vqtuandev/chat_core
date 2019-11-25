var uuid = require('uuid/v4');
function compound2Unicode(str) {
    return str.normalize('NFKC');
}
exports.compound2Unicode = compound2Unicode;

var makeComp = (function () {

    var accents = {
        a: 'àáạảãâầấậẩẫăằắặẳẵ',       
        e: 'èéẹẻẽêềếệểễ',
        i: 'ìíịỉĩ',
        o: 'òóọỏõôồốộổỗơờớợởỡ',
        u: 'ùúụủũưừứựửữ',
        y: 'ỳýỵỷỹ',
        d: 'đ'
    },
        chars = /[aeiouyd]/g;

    return function makeComp(input) {
        input = compound2Unicode(input);
        return input.replace(chars, function (c) {
            return '[' + c + accents[c] + ']';
        });
    };

} ());

function fixingKeyword(key) {
    return makeComp(key);
}

exports.fixingKeyword = fixingKeyword;

function removeAccent(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/Đ/g, "D").replace(/đ/g, "d");
}

exports.removeAccent = removeAccent;

var checkExistInArray = function (haystack, arr) {
    return arr.some(function (v) {
        return haystack.indexOf(v) >= 0;
    });
};
/**
 * @description determine if an array contains one or more items from another array.
 * @param {array} haystack the array to search.
 * @param {array} arr the array providing items to check for in the haystack.
 * @return {boolean} true|false if haystack contains at least one item from arr.
 */
exports.checkExistInArray = checkExistInArray;


exports.uuidv4 = function uuidv4() {
    return uuid();
}

exports.replaceMentions = function replaceMentions(e) {
    var t = e.replace(/@\[([\s\S\d _][^\]]+)\]\(userid:([\d]+)\)/ig, '@$1');
    return t;
} 

exports.isMobile = function (mobile) {
    //var pat = /(^[0-9]{10}$)|(^\+[0-9]{2}\s+[0-9]{2}[0-9]{8}$)|(^[0-9]{3}-[0-9]{3}-[0-9]{4}$)/g;
    //var rg = RegExp(pat);
    //return rg.test(mobile);
    //app truyền lên kiểu format +xxxxxxxx nên ko kiểm tra đc, dưới app kiểm tra luôn
    return true;
}
exports.isEmail = function (email) {
    var pat = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/g;
    var rg = RegExp(pat);
    return rg.test(email);
}

exports.mapVNDForLuva = function(assetCode) {
    if (assetCode == 'LUVA') {
        assetCode = '₫';
    }
    return assetCode;
}