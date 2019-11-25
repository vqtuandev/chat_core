exports.groupAvatar = 'https://chat.muabannhanh.com/images/usergroup.png';
exports.channelAvatar = 'https://chat.muabannhanh.com/images/channel.png';
//kiểm tra 1 link có phải là hình không
exports.checkFileIsImage = function (fileName) {
    return (fileName.match(/\.(jpeg|jpg|gif|png)$/i) != null);//kèm luôn parameter trong link image
}

exports.checkFileIsVideo = function (fileName) {
    return (fileName.match(/\.(mp4|avi|3gp|mov|m4v|webm|mkv|ts)$/i) != null);//kèm luôn parameter trong link image
}

exports.getFileExtension = function (fileUrl) {
    return fileUrl.split('.').pop();
}