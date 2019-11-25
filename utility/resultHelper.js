var errorCodeEnum = Object.freeze({
    success: 0,
    successNew: 1,
    permission: 100,
    exist: 101,
    notExist: 102,
    parameter: 103,
    externalService: 109,
    other: 110,
    db: 115
});

exports.errorCodes = errorCodeEnum;

exports.returnResultSuccess = function (data) {
    return {
        errorCode: errorCodeEnum.success,
        error: null,
        data: data
    }
}

exports.returnResultSuccessAddNew = function (data) {
    return {
        errorCode: errorCodeEnum.successNew,
        error: null,
        data: data
    }
}

exports.returnResultParameterError = function (paraError) {
    return {
        errorCode: errorCodeEnum.parameter,
        error: paraError,
        data: null
    };
}

exports.returnResultDBError = function (err) {
    return {
        errorCode: errorCodeEnum.db,
        error: err,
        data: null
    }
}

exports.returnResultServiceError = function (err) {
    return {
        errorCode: errorCodeEnum.externalService,
        error: err,
        data: null
    }
}
exports.returnResultPermission = function (err) {
    return {
        errorCode: errorCodeEnum.permission,
        error: err,
        data: null
    }
}

exports.returnResultNotInRoom = function () {
    return {
        errorCode: errorCodeEnum.permission,
        error: 'Not in room',
        data: null
    }
}

exports.returnResultNotExists = function (err) {
    return {
        errorCode: errorCodeEnum.notExist,
        error: err,
        data: null
    }
}

exports.returnResultExists = function (err) {
    return {
        errorCode: errorCodeEnum.exist,
        error: err,
        data: null
    }
}

exports.returnResult = function (errCode, err, data) {
    return {
        errorCode: errCode,
        error: err,
        data: data
    }
}
