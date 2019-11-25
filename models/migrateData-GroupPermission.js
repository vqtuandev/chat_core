var _ = require('lodash');
var db = require('./db');
var roomData = require('./room.js');
var ObjectId = require('mongodb').ObjectId;

var cache = require('memory-cache');
var cacheTime = 600000;

var roomPrefix = 'room_';
var rooms = 'rooms';

exports.updateGroupPermissionField = function updateGroupPermissionField() {
    var collection = db.get().collection(rooms);
    collection.find({
        type: 'custom'
    }).toArray(function (err, docs) {
        if (!err) {
            if (docs) {
                console.log(docs.length, 'item');
                var permissions = roomData.generateGroupAdminPermissions(true, true, true, true, true);
                docs.forEach(function (doc) {
                    var onlyAdminAddUser = false;
                    if (doc.onlyAdminAddUser != undefined) {
                        onlyAdminAddUser = doc.onlyAdminAddUser;
                    }
                    collection.update(
                        {
                            _id: doc._id,
                            'members.userId': doc.userIdOwner
                        },
                        {
                            $set: {
                                'members.$.permissions': permissions,
                                'members.$.isOwner': true,
                                'members.$.isAdmin': true,
                                onlyAdminAddUser: onlyAdminAddUser
                            }
                        }, {
                        },
                        function (err, result) {
                            console.log(doc.roomName);
                            if (err) {
                                console.log(err);
                            }
                            else {
                                console.log('success');
                            }
                        }
                    );
                });
            }
        }
    });
}