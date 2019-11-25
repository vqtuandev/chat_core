module.exports = (socket, db, socketMap, common) => {
    require('./callbackServices')(socket, socketMap, db, common);
    require('./user')(socket, socketMap, db, common);
}