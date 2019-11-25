function isInt(value) {
    var x;
    if (isNaN(value)) {
        return false;
    }
    x = parseFloat(value);
    return (x | 0) === x;
}

exports.isInt = isInt;

exports.formatCurrency = function (amount, separator) {
    return amount.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1' + separator);
}