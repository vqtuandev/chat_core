﻿var TRANSACTIONTYPE = {
    CREATEACCOUNT: 'CREATEACCOUNT',
    TRANSFER: 'TRANSFER',
    CASHIN: 'CASHIN',
    CASHOUT: 'CASHOUT',
    PAYBILL: 'PAYBILL'
};

exports.TRANSACTIONTYPE = TRANSACTIONTYPE;

var PAYMENTSTATUS = {
    PENDING: 'PENDING',
    FAIL: 'FAIL',
    SUCCESS: 'SUCCESS'
}

exports.PAYMENTSTATUS = PAYMENTSTATUS;

exports.PAYMENTMETHOD = {
    STELLAR: 1,
    PAYPALVISAMASTER: 2,
    NGANLUONGATM: 3,
    BANKTRANSFER: 4,
    NGANLUONGMOBILECARD: 5
};