let io,
    miniSocket,
    UniversalFunctions = require('../Utils/UniversalFunctions'),
    DAO = require('../DAOManager').queries,
    Models = require('../Models')
;


exports.connectSocket = (server) => {
    try {
        io = require('socket.io').listen(server.listener);
        io.on('connection', async (socket) => {

            miniSocket = socket;

            console.log("==== socket.handshake.query.id ============", socket.handshake.query.id, socket.id);

            let userId = socket.handshake.query.userId;

            if (socket.id && userId) {

                let updatedUser = await DAO.update(Models.User, {_id: ObjectId(userId)}, {$set: {socketId: socket.id}}, {new: true});

                if (!updatedUser.nModified) io.to(socket.id).emit('error', {
                    event: "connection",
                    status: 400,
                    msg: 'Please provide correct user id to handshake'
                });
                else
                    socket.emit('socketConnected', {
                        statusCode: 200,
                        message: 'Connected to server',
                        data: {socketId: socket.id}
                    });

                let groupPipeline = [{
                    $match: {
                        groupMembers: {$in: [ObjectId(socket.handshake.query.id)]}
                    }
                }, {
                    $group: {
                        _id: null,
                        groupIds: {$addToSet: "$_id"}
                    }
                }];

                let groupId = (await DAO.aggregateData(Models.Group, groupPipeline))[0];

                if (groupId && groupId.groupIds.length > 0) {
                    groupId = groupId.groupIds;
                } else {
                    groupId = [];
                }


                for (let i = 0; i < groupId.length; i++) {
                    console.log("group----", groupId[i]);
                    await socket.join(groupId[i]);
                    console.log("group-66666---", io.sockets.adapter.rooms[groupId[i]]);
                }
            } else {
                io.to(socket.id).emit('error', {event: "connection", status: 400, msg: 'Socket is not connected'});
            }

            socket.on('sendMessage', async (data, ack) => {
                try {

                    let dataToSave = {
                        senderId: data.senderId,
                        conversationId: data.receiverId ? (data.receiverId > data.senderId ? (data.receiverId + data.senderId) : (data.senderId + data.receiverId)) : data.groupId,
                        text: data.text || "",
                        type: data.type
                    };

                    if (data.image) {
                        dataToSave.image = data.image;
                    }

                    if (data.receiverId && data.receiverId !== '') {
                        dataToSave.receiverId = data.receiverId;
                    }

                    if (data.groupId && data.groupId !== '') {
                        dataToSave.groupId = data.groupId;
                        dataToSave.chatType = Config.APP_CONSTANTS.DATABASE_CONSTANT.MESSAGE_TYPE.GROUP_CHAT;
                    }
                    else {
                        dataToSave.chatType = Config.APP_CONSTANTS.DATABASE_CONSTANT.MESSAGE_TYPE.SINGLE_CHAT;
                    }

                    if (data.contact) {
                        dataToSave.contact = data.contact;
                    }

                    if (data.location) {
                        dataToSave.location = data.location;
                    }

                    let replyObject = null;

                    if (data.replyId && data.replyId !== '') {
                        dataToSave.replyId = data.replyId;
                        dataToSave.isReply = true;

                        replyObject = (await DAO.getData(Models.Chat, {_id: data.replyId}, {}, {}))[0];
                    }


                    let step1 = {},
                        step2 = await DAO.saveData(Models.Chat, dataToSave);

                    let userId = (await DAO.getData(Models.User, {_id: step2.senderId}, {
                        firstName: 1,
                        lastName: 1,
                        role: 1,
                        fullName: 1,
                        profilePicURL: 1
                    }, {}))[0];


                    let getSocketId = await redisClient.get((data.receiverId));


                    step1._id = step2._id;
                    step1.receiverId = step2.receiverId;
                    step1.senderId = step2.senderId;
                    step1.conversationId = step2.conversationId;
                    step1.text = step2.text;
                    step1.type = step2.type;
                    step1.isDeleted = step2.isDeleted;
                    step1.isRead = step2.isRead;
                    step1.image = step2.image;
                    step1.createdAt = step2.createdAt;
                    step1.uid = data.uid;
                    step1.loading = false;
                    step1.userId = userId;
                    step1.isLike = '';
                    step1.LIKE = 0;
                    step1.UNLIKE = 0;
                    step1.HAHA = 0;
                    step1.LOVE = 0;
                    step1.WOW = 0;
                    step1.SAD = 0;
                    step1.ANGRY = 0;
                    step1.replyObject = replyObject;
                    step1.chatType = step2.chatType;
                    step1.messageStatus = step2.messageStatus;
                    step1.contact = step2.contact;
                    step1.location = step2.location;
                    // step1.note = step2.note?step2.note:'' ;

                    if (data.groupId) {
                        step1.groupId = data.groupId;
                        socket.to(data.groupId).emit("messageFromServer", step1);
                    }
                    else {
                        io.to(getSocketId).emit("messageFromServer", step1);
                    }

                    ack(step1);
                }
                catch (er) {
                    console.log(er);
                    ack(er);
                }
            });

            socket.on('delivered', async (data, ack) => {
                try {
                    console.log("===deliveredseen=");
                    if (data.chatType === Config.APP_CONSTANTS.DATABASE_CONSTANT.MESSAGE_TYPE.SINGLE_CHAT) {

                        console.log("====1========");
                        let dataToSend = (await DAO.getData(Models.Chat,
                            {
                                _id: data._id,
                                info: {$elemMatch: {userId: data.userId}}
                            },
                            {},
                            {lean: true}))[0];


                        if (!dataToSend) {

                            console.log("====2=======");
                            let data1 = await DAO.findAndUpdate(Models.Chat,
                                {_id: data._id},
                                {
                                    $addToSet: {
                                        info: {
                                            userId: data.userId,
                                            messageStatus: Config.APP_CONSTANTS.DATABASE_CONSTANT.MESSAGE_STATUS.DELIVERED,
                                            createdAt: +new Date()
                                        }
                                    },
                                    messageStatus: Config.APP_CONSTANTS.DATABASE_CONSTANT.MESSAGE_STATUS.DELIVERED
                                },
                                {new: true});

                            let senderId = JSON.stringify(data1.receiverId) === JSON.stringify(data.userId)
                                ? JSON.stringify(data1.senderId) : JSON.stringify(data1.receiverId);

                            data1 = await  UniversalFunctions.messageResponse({
                                messageId: data._id,
                                userId: data.userId
                            });

                            console.log("=============data1===============", data1);

                            let getSocketId = await redis.get(JSON.parse(senderId));

                            if (getSocketId)
                                io.to(getSocketId).emit("delivered", data1[0]);
                        }
                    }
                    else {
                        console.log("==3======");
                        let dataToSend = (await DAO.getData(Models.Chat,
                            {
                                _id: data._id,
                                info: {$elemMatch: {userId: data.userId}}
                            },
                            {},
                            {
                                lean: true
                            }))[0];

                        if (!dataToSend) {
                            console.log("=4=====");
                            await DAO.findAndUpdate(Models.Chat,
                                {_id: data._id},
                                {
                                    $addToSet: {
                                        info: {
                                            userId: data.userId,
                                            createdAt: +new Date(),
                                            messageStatus: Config.APP_CONSTANTS.DATABASE_CONSTANT.MESSAGE_STATUS.DELIVERED
                                        }
                                    }
                                },
                                {});
                        }
                        else {
                            console.log("=5=====");
                            await DAO.findAndUpdate(Models.Chat,
                                {
                                    _id: data._id,
                                    'info.userId': data.userId
                                },
                                {
                                    'info.$.messageStatus': Config.APP_CONSTANTS.DATABASE_CONSTANT.MESSAGE_STATUS.DELIVERED
                                },
                                {}
                            );
                        }
                        let data1 = await  UniversalFunctions.messageResponse({
                            messageId: data._id,
                            userId: data.userId
                        });

                        console.log("==data1 =====================", data1);
                        await  socket.to(data.groupId).emit("delivered", data1[0]);

                    }


                    ack(1);
                }
                catch (er) {
                    console.log(er);
                    ack(0);
                }
            });

            socket.on('seen', async (data, ack) => {
                try {

                    console.log("===seen==seen==seen=seenseenseenseenseenseenseenseenseenseenseenseenseenseenseenseen=");

                    if (data.chatType === Config.APP_CONSTANTS.DATABASE_CONSTANT.MESSAGE_TYPE.SINGLE_CHAT) {
                        let dataToSend = (await DAO.getData(Models.Chat,
                            {
                                _id: data._id,
                                info: {$elemMatch: {userId: data.userId}}
                            },
                            {},
                            {lean: true}))[0];


                        if (!dataToSend) {

                            let data1 = await DAO.findAndUpdate(Models.Chat, {_id: data._id},
                                {
                                    $addToSet: {info: {userId: data.userId, createdAt: +new Date()}},
                                    messageStatus: Config.APP_CONSTANTS.DATABASE_CONSTANT.MESSAGE_STATUS.READ
                                }, {new: true});

                            let senderId =
                                JSON.stringify(data1.receiverId) === JSON.stringify(data.userId)
                                    ? JSON.stringify(data1.senderId)
                                    : JSON.stringify(data1.receiverId);


                            let getSocketId = await redis.get(JSON.parse(senderId));

                            data1 = await  UniversalFunctions.messageResponse({
                                messageId: data._id,
                                userId: data.userId
                            });

                            if (getSocketId && data1[0])
                                io.to(getSocketId).emit("seen", data1[0]);

                        }

                        let data1 = await DAO.findAndUpdate(Models.Chat, {
                                _id: data._id,
                                'info.userId': data.userId
                            },
                            {
                                'info.$.createdAt': +new Date(),
                                'info.$.messageStatus': Config.APP_CONSTANTS.DATABASE_CONSTANT.MESSAGE_STATUS.READ,
                                messageStatus: Config.APP_CONSTANTS.DATABASE_CONSTANT.MESSAGE_STATUS.READ
                            },
                            {new: true});

                        let senderId =
                            JSON.stringify(data1.receiverId) === JSON.stringify(data.userId)
                                ? JSON.stringify(data1.senderId)
                                : JSON.stringify(data1.receiverId);

                        data1 = await  UniversalFunctions.messageResponse({messageId: data._id, userId: data.userId});

                        let getSocketId = await redis.get(JSON.parse(senderId));

                        if (getSocketId)
                            io.to(getSocketId).emit("seen", data1[0]);
                    }
                    else {

                        let dataToSend = (await DAO.getData(Models.Chat,
                            {
                                _id: data._id,
                                info: {$elemMatch: {userId: data.userId}}
                            },
                            {},
                            {lean: true}
                        ))[0];


                        if (!dataToSend) {
                            await DAO.findAndUpdate(Models.Chat,
                                {_id: data._id},
                                {
                                    $addToSet: {
                                        info: {
                                            userId: data.userId,
                                            createdAt: +new Date(),
                                            messageStatus: Config.APP_CONSTANTS.DATABASE_CONSTANT.MESSAGE_STATUS.READ
                                        }
                                    }
                                }, {});
                        }
                        else {
                            await DAO.findAndUpdate(Models.Chat,
                                {
                                    _id: data._id,
                                    'info.userId': data.userId
                                },
                                {
                                    'info.$.messageStatus': Config.APP_CONSTANTS.DATABASE_CONSTANT.MESSAGE_STATUS.READ
                                },
                                {});
                        }


                        let response = await UniversalFunctions.messageResponse({
                            messageId: data._id,
                            userId: data.userId
                        });

                        console.log("===response================", response);

                        await  socket.to(data.groupId).emit("seen", response[0]);

                    }

                    ack(1);
                }
                catch (er) {
                    console.log(er);
                    ack(0);
                }
            });

            socket.on('pickUp', async (data, ack) => {
                try {
                    let data = await  DAO.findAndUpdate(Models.Chat,
                        {_id: data._id, 'info.userId': data.userId},
                        {'info.$.messageStatus': Config.APP_CONSTANTS.DATABASE_CONSTANT.MESSAGE_STATUS.READ},
                        {});


                    if (!data) {
                        await  DAO.findAndUpdate(Models.Chat, {_id: data._id, 'info.userId': data.userId},
                            {
                                'info.$.messageStatus':
                                Config.APP_CONSTANTS.DATABASE_CONSTANT.MESSAGE_STATUS.READ
                            },
                            {});
                    }

                    ack(1);
                }
                catch (er) {
                    console.log(er);
                    ack(0);
                }
            });

            socket.on('postViewed', async (data,ack) => {
               try {
                   if(data.postId && data.userId) {
                       await DAO.findAndUpdate(Models.Post, {_id: data.postId},
                           {
                               $addToSet: {
                                   viewedBy: ObjectId(data.userId)
                               }
                           },
                           {lean: true});

                       ack(1);
                   } else {
                       console.log("params missing");
                       ack(0)
                   }
               } catch (e) {
                   console.log("error in post viewed---",e);
                   ack(0)
               }
            });

            socket.on('disconnect', function () {
            });

        });


    }
    catch (err) {
        console.log(err);
    }
};

exports.emitSocketToUser = async function (data) {

    // console.log("======emitSocketToUser=====data===emitSocketToUser==============",data);
    if (data.chatType === Config.APP_CONSTANTS.DATABASE_CONSTANT.CHAT_TYPE.ONE_TO_ONE_CHAT) {
        let getSocketId = await redis.get(data.receiverId);

        console.log("====getSocketId==================", getSocketId);

        if (getSocketId)
            io.to(getSocketId).emit("listenCall", data);
    }
    else {
        miniSocket.to(data.groupId).emit("listenCall", data);
    }
};

exports.emitCloseSocket = async function (data) {

    let getSocketId = await redis.get(data.receiverId);

    if (getSocketId)
        io.to(getSocketId).emit("exitCall", data);

};

exports.forwardMessage = async function (data) {
    try {
        let getSocketId = '',
            dataToSave = await messagesToAdd(data),
            insertedData = await DAO.insertMany(Models.Chat, dataToSave, {setDefaultsOnInsert: true});

        if (data.receiverId)
            getSocketId = await redis.get((data.receiverId));

        if (data.groupId)
            miniSocket.to(data.groupId).emit("messagesFromServer", insertedData.ops);
        else
            io.to(getSocketId).emit("messagesFromServer", insertedData.ops);

        getSocketId = await redis.get(data.senderId);
        io.to(getSocketId).emit("messagesFromServer", insertedData.ops);
    } catch (error) {
        console.log("error in forward messages in socket manager----", error);
        throw error;
    }
};

// messages to add to db
function messagesToAdd (data) {
    return data.messages.map(message =>  {
        let insertData = {
            info: [],
            isClear: [],
            isReply: false,
            isDeleted: false,
            deletedUserId: [],
            LIKE                : 0,
            UNLIKE              : 0,
            HAHA                : 0,
            LOVE                : 0,
            WOW                 : 0,
            SAD                 : 0,
            ANGRY               : 0,
            senderId: ObjectId(data.senderId),
            conversationId: data.receiverId ?
                (data.receiverId > data.senderId ? (data.receiverId + data.senderId) :
                    (data.senderId + data.receiverId)) : data.groupId,
            text: message.text,
            type: message.type,
            createdAt: Date.now()
        };
        if (message.image)
            insertData.image = message.image;

        if (data.receiverId && data.receiverId !== '')
            insertData.receiverId = ObjectId(data.receiverId);

        if (data.groupId && data.groupId !== '')
            insertData.groupId = ObjectId(data.groupId);

        if (message.contact)
            insertData.contact = message.contact;

        if (message.location)
            insertData.location = message.location;

        return insertData;
    });
}

exports.joinGroup = async function (data) {
    console.log("=====joinGroup============", data.groupMembers.length);
    let socketData = {}, socketID = '';
    for (let i = 0; i < data.groupMembers.length; i++) {
        socketID = await redis.get(data.groupMembers[i]);
        console.log("=====socketData============", socketID);
        socketData = io.sockets.connected[socketID];
        // console.log("===socketData=============",socketData);
        if (socketData)
            socketData.join(data.groupId);
    }

    // let socketData = await   io.sockets.manager.roomClients[socket.id]
};

exports.deleteMessageSocket = async function (payload, chatData) {

    console.log("===deleteMessageSocket=deleteMessageSocket ===", payload, chatData);

    if (payload.scope === Config.APP_CONSTANTS.DATABASE_CONSTANT.SCOPE.ME) {
        miniSocket.emit("messagesFromServer",await dataToSend(chatData));
    }
    else {

        if (chatData[0].groupId) {
            io.to(chatData[0].groupId).emit("messagesFromServer", await dataToSend(chatData));
        }
        else {
            let getSocketId = await redis.get(chatData[0].receiverId);
            let getSocketIdSender = await redis.get(chatData[0].senderId);
            io.to(getSocketId).to(getSocketIdSender).emit("messagesFromServer", await dataToSend(chatData));
        }
    }
};

function dataToSend(chatData) {
    return chatData.map(data => {return {_id: data._id, isDeleted: true, conversationId: data.conversationId}});
}

exports.sendGroupSocket = async function (sendGroupSocket) {

    miniSocket.to(sendGroupSocket.groupId).emit("messageFromServer", sendGroupSocket);
};

exports.sendHelloSocket = async function (payload) {

    // miniSocket.to(sendGroupSocket.groupId).emit("messageFromServer",sendGroupSocket);
};