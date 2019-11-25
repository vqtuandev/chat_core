var azure = require('azure-storage');
var azureAccountName = 'luvapay';
var azureAccessKey = 'BVyEULlPSs8pFiC2ldtkLAnWfGJT8YZVu7nYk2ZsTfQQG7B9rhBMMC31LPnmcdajtxzsanNkGk3Ff/F12Zyp6w==';
var azureChatContainerName = 'chat';
var azureAvatarContainerName = 'avatar';
var noAvatar = 'avatar/no-avatar.png';
var azureStorageUrl = 'https://luvapay.blob.core.windows.net/';

var resultHelper = require('../utility/resultHelper.js');
var roomLog = require('../models/roomLog.js');
var errorLog = require('../models/errorLog.js');
var imageHelper = require('../utility/imageHelper.js');
var textHelper = require('../utility/textHelper.js');

//function createResizeImageQueue(queueName, itemId, link, callback) {

//    var queueService = azure.createQueueService(azureAccountName, azureAccessKey);

//    queueService.createQueueIfNotExists(queueName, function (error) {
//        if (!error) {
//            queueService.createMessage(queueName, link, function (err, result, response) {
//                if (err) {
//                    errorLog.addLog(errorLog.errorType.azureStorage, err, function () { });
//                }
//            });
//        }
//        else {
//            errorLog.addLog(errorLog.errorType.azureStorage, error, function () { });                        
//        }
//    });
//}

exports.azureStorageUrl = azureStorageUrl;
exports.noAvatar = noAvatar;
exports.generateAvatarUploadSAS = function (userId, itemGUID, fileName, callback) {
    var blobService = azure.createBlobService(azureAccountName, azureAccessKey);

    //chuyển unicode tổ hợp sang unicode dựng sẵn
    fileName = textHelper.compound2Unicode(fileName.toLowerCase());
    var containerName = azureAvatarContainerName.toLowerCase();
    var blobName = userId + '/' + itemGUID + '/' + fileName;

    blobService.createContainerIfNotExists(containerName, {
        publicAccessLevel: 'blob'
    }, function (error, result, response) {
        if (!error) {
            var startDate = new Date();
            var expiryDate = new Date(startDate);
            expiryDate.setDate(startDate.getDate() + 1);
            startDate.setHours(startDate.getHours() - 1);

            var sharedAccessPolicy = {
                AccessPolicy: {
                    Permissions: azure.BlobUtilities.SharedAccessPermissions.READ + azure.BlobUtilities.SharedAccessPermissions.WRITE,
                    Start: startDate,
                    Expiry: expiryDate
                }
            };

            var token = blobService.generateSharedAccessSignature(containerName, blobName, sharedAccessPolicy);
            var sasUrl = blobService.getUrl(containerName, blobName, token);

            var item = {
                sasUrl: sasUrl,
                link: containerName + '/' + blobName
            };
            callback(resultHelper.returnResultSuccess(item));
        }
        else {
            errorLog.addLog(errorLog.errorType.azureStorage, error, function () { });
            callback(resultHelper.returnResultServiceError(error));
        }
    });
}

exports.generateUploadSAS = function (userId, roomId, itemGUID, fileName, callback) {

    var blobService = azure.createBlobService(azureAccountName, azureAccessKey);

    //chuyển unicode tổ hợp sang unicode dựng sẵn
    fileName = textHelper.compound2Unicode(fileName.toLowerCase());

    //kiểm tra image để tạo thêm SAS thumbnail
    var isImage = imageHelper.checkFileIsImage(fileName);
    var isVideo = imageHelper.checkFileIsVideo(fileName);

    var containerName = azureChatContainerName.toLowerCase();
    var blobName = roomId + '/' + userId + '/' + itemGUID + (isImage ? '/o/' : '/') + fileName;
    blobName = blobName.toLowerCase();

    var thumBlobName = null;
    if (isImage) {
        thumBlobName = roomId + '/' + userId + '/' + itemGUID + '/s/' + fileName;
        thumBlobName = thumBlobName.toLowerCase();
    }
    else if (isVideo) {
        thumBlobName = roomId + '/' + userId + '/' + itemGUID + '/s/' + fileName.substr(0, fileName.lastIndexOf('.')) + '.jpg';
        thumBlobName = thumBlobName.toLowerCase();
    }

    blobService.createContainerIfNotExists(containerName, {
        publicAccessLevel: 'blob'
    }, function (error, result, response) {
        if (!error) {
            var startDate = new Date();
            var expiryDate = new Date(startDate);
            expiryDate.setDate(startDate.getDate() + 1);
            startDate.setHours(startDate.getHours() - 1);

            var sharedAccessPolicy = {
                AccessPolicy: {
                    Permissions: azure.BlobUtilities.SharedAccessPermissions.READ + azure.BlobUtilities.SharedAccessPermissions.WRITE,
                    Start: startDate,
                    Expiry: expiryDate
                }
            };
            console.log(sharedAccessPolicy);
            var token = blobService.generateSharedAccessSignature(containerName, blobName, sharedAccessPolicy);
            var sasUrl = blobService.getUrl(containerName, blobName, token);

            var item = {
                sasUrl: sasUrl,
                link: containerName + '/' + blobName
            };

            //nếu có thumbBlobName thì tạo thêm SAS để trả về luôn
            if (thumBlobName != null) {
                var tokenThumb = blobService.generateSharedAccessSignature(containerName, thumBlobName, sharedAccessPolicy);
                var sasThumbUrl = blobService.getUrl(containerName, thumBlobName, tokenThumb);
                item.sasThumbUrl = sasThumbUrl;
                item.thumbLink = containerName + '/' + thumBlobName;
            }

            item.fileType = (isImage == true ? roomLog.messageType.image : (isVideo == true ? roomLog.messageType.video : roomLog.messageType.file));

            console.log(item);
            callback(resultHelper.returnResultSuccess(item));
        }
        else {
            errorLog.addLog(errorLog.errorType.azureStorage, error, function () { });
            callback(resultHelper.returnResultServiceError(error));
        }
    });
}

//exports.createSmallSizeImageQueue = function (chatLogId, link, callback) {
//    var queueName = 'resizetosmall';
//    createResizeImageQueue(queueName, chatLogId, link, callback);
//} 