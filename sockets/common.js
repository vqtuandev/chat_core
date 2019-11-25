module.exports = (eventName, db, socketMap) => {
    return {
        recentRoom: require('./common/recentRoom')(eventName, db, socketMap),
        messageEvent: require('./common/messageEvent')(eventName, db, socketMap, require('./common/recentRoom')(eventName, db, socketMap).setRoomMemberStatus, require('./common/notify')(eventName, db, socketMap).notifyToRoomMembers),
        userEvent: require('./common/userEvent')(eventName, db, socketMap),
        notify: require('./common/notify')(eventName, db, socketMap, require('./common/userEvent')(eventName, db, socketMap).tryGetUserInfo, require('./common/userEvent')(eventName, db, socketMap).tryGetRoomInfo),
        itemCount: 15,
        roomLogCount:30
    };
}