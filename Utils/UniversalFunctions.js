const Boom   = require('boom'),
    Models   = require('../InitialSetup/Models'),
    Joi      = require('joi'),
    Config   = require('../Config'),
    ERROR    = Config.responseMessages.ERROR,
    SUCCESS  = Config.responseMessages.SUCCESS,
    ObjectId = require('mongoose').Types.ObjectId,
    notificationManager = require('../Libs/notificationManager'),
    DAO      = require('../DAOManager').queries,
    MD5      = require('md5');




const CryptData   = function (stringToCrypt) {
    console.log("stringToCrypt----", stringToCrypt);
    return MD5(MD5(stringToCrypt));
};

function sendError(language,data,reply) {
    let error;
    if (typeof data === 'object' && data.hasOwnProperty('statusCode') && data.hasOwnProperty('customMessage')) {
        let finalMessage = data.customMessage;
        if(language && language === "ar") finalMessage = data.customMessage;
        error =  Boom.create(data.statusCode, finalMessage);
        if(data.hasOwnProperty('type')) {
            error.output.payload.type = data.type;
            winston.error(error);
            return error;
        }
    }
    else {
        let errorToSend = '',
            type = '';

        if (typeof data === 'object') {
            if (data.name === 'MongoError') {

                if(language && language === "ar") errorToSend += ERROR.DB_ERROR.customMessage.ar;
                else errorToSend += ERROR.DB_ERROR.customMessage.en;

                type = ERROR.DB_ERROR.type;
                if (data.code = 11000) {

                    if(language && language === "ar") errorToSend += ERROR.DUPLICATE.customMessage.ar;
                    else errorToSend += ERROR.DUPLICATE.customMessage.en;

                    type = ERROR.DUPLICATE.type;
                }
            } else if (data.name === 'ApplicationError') {

                if(language && language === "ar") errorToSend += ERROR.APP_ERROR.customMessage.ar;
                else errorToSend += ERROR.APP_ERROR.customMessage.en;

                type = ERROR.APP_ERROR.type;
            } else if (data.name === 'ValidationError') {

                if(language && language === "ar") errorToSend += ERROR.APP_ERROR.customMessage.ar + data.message;
                else errorToSend += ERROR.APP_ERROR.customMessage.en + data.message;

                type = ERROR.APP_ERROR.type;
            } else if (data.name === 'CastError') {

                if(language && language === "ar") errorToSend += ERROR.DB_ERROR.customMessage.ar + ERROR.INVALID_OBJECT_ID.customMessage.ar;
                else errorToSend += ERROR.DB_ERROR.customMessage.en + ERROR.INVALID_OBJECT_ID.customMessage.en;

                type = ERROR.INVALID_OBJECT_ID.type;
            } else if(data.response) {
                errorToSend = data.response.message;
            }
        } else {
            errorToSend = data;
            type = ERROR.DEFAULT.type;
        }
        let customErrorMessage = errorToSend;
        if (typeof errorToSend === 'string'){
            if (errorToSend.indexOf("[") > -1) {
                customErrorMessage = errorToSend.substr(errorToSend.indexOf("["));
            } else {
                customErrorMessage = errorToSend;
            }
            customErrorMessage = customErrorMessage.replace(/"/g, '');
            customErrorMessage = customErrorMessage.replace('[', '');
            customErrorMessage = customErrorMessage.replace(']', '');
        }
        error =  Boom.create(400,customErrorMessage);
        error.output.payload.type = type;
        winston.error(error);
        return error;
    }
};

function sendSuccess( language,successMsg, data, h) {
    successMsg = successMsg || SUCCESS.DEFAULT.customMessage.en;

    if (typeof successMsg === 'object' && successMsg.hasOwnProperty('statusCode') && successMsg.hasOwnProperty('customMessage')){

        let finalMessage = successMsg.customMessage.en;
        if(language && language === "ar") finalMessage = successMsg.customMessage.ar;

        return {statusCode:successMsg.statusCode, message: finalMessage, data: data || {}};
    }
    else return {statusCode:200, message: successMsg, data: data || {}};
};

function failActionFunction(request, reply, error) {

    winston.info("==============request===================",request.payload, error)
    error.output.payload.type = "Joi Error";

    if (error.isBoom) {
        delete error.output.payload.validation;
        if (error.output.payload.message.indexOf("authorization") !== -1) {
            error.output.statusCode = ERROR.UNAUTHORIZED.statusCode;
            return reply(error);
        }
        let details = error.details[0];
        if (details.message.indexOf("pattern") > -1 && details.message.indexOf("required") > -1 && details.message.indexOf("fails") > -1) {
            error.output.payload.message = "Invalid " + details.path;
            return reply(error);
        }
    }
    let customErrorMessage = '';
    if (error.output.payload.message.indexOf("[") > -1) {
        customErrorMessage = error.output.payload.message.substr(error.output.payload.message.indexOf("["));
    } else {
        customErrorMessage = error.output.payload.message;
    }
    customErrorMessage = customErrorMessage.replace(/"/g, '');
    customErrorMessage = customErrorMessage.replace('[', '');
    customErrorMessage = customErrorMessage.replace(']', '');
    error.output.payload.message = customErrorMessage.replace(/\b./g, (a) => a.toUpperCase());
    delete error.output.payload.validation;
    return error;
};

const generateFilenameWithExtension = function(oldFilename, newFilename) {
    let ext = oldFilename.substr(oldFilename.lastIndexOf(".")+ 1);
    return newFilename + new Date().getTime() +  Math.floor(Math.random() * 2920)+1+ '.' + ext;
};

async function getSignUpResponse1(payload)
{
    return DAO.getData(Models.User, {"_id" : ObjectId(payload._id)},{},{lean: true});
}

const authorizationHeaderObj = Joi.object({
    authorization: Joi.string().required()
}).unknown();

const authorizationOptionalHeaderObj = Joi.object({
    authorization: Joi.string()
}).unknown();

const checkUserNameExists = async function(payload,userId)
{
    let criteria= {
        _id      : {$ne : userId },
        userName : payload.userName.toLowerCase(),
    };


    return DAO.getData(Models.User,criteria,   { } , {});


};

async function getUserTokenData(payload)
{

 let deviceToken = [];

 if(payload.chatType === Config.APP_CONSTANTS.DATABASE_CONSTANT.CHAT_TYPE.ONE_TO_ONE_CHAT)
{
      if((await  DAO.getData(Models.User,{_id:payload.receiverId},   { } , {}))[0])
      {
          deviceToken.push((await  DAO.getData(Models.User,{_id:payload.receiverId},   { } , {}))[0].deviceToken);
      }



    console.log("===deviceToken============",deviceToken,payload.receiverId);
    notificationManager.sendPushToUserInBatch({
        deviceToken   :deviceToken,
        message       :payload.fullName + ' is calling you .',
        body:{
            token         :payload.token,
            session       :payload.session,
            fullName      :payload.fullName,
            type          :payload.type,
            profilePicURL :payload.profilePicURL
        },
    });
}
else {

     let pipeLine = [
         {
             $match:{
                 _id:{
                     $in:payload.groupMembers
                 }
             }
         },
         {
             $group : {
                 _id        : null,
                 deviceToken: { $push: "$deviceToken" }
             }
         }
     ];

     deviceToken = (await DAO.aggregateData(Models.User, pipeLine))[0].deviceToken;

     notificationManager.sendPushToUserInBatch({
         deviceToken    :deviceToken,
         message       : payload.fullName + ' is calling you .',
         body:{
              token         :payload.token,
             session       :payload.session,
             fullName      :payload.fullName,
             type          :payload.type,
             profilePicURL :payload.profilePicURL
         },
     });

 }



}

async function messageResponse(payload)
{
    let aggregate = [
        {$match:{_id:ObjectId(payload.messageId)}},
        {
            $lookup:
                {
                    from: "users",
                    localField: "senderId",
                    foreignField: "_id",
                    as: "userId"
                }
        },
        {
            $lookup:
                {
                    from: "chats",
                    localField: "replyId",
                    foreignField: "_id",
                    as: "replyObject"
                }
        },
        { $unwind: { path: "$userId", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$replyObject", preserveNullAndEmptyArrays: true } },
        {
            $lookup:
                {
                    from: "likes",
                    let: { chatId: "$_id"},
                    pipeline: [
                        { $match:
                                { $expr:
                                        { $and:
                                                [
                                                    { $eq: [ "$chatId",  "$$chatId" ] },
                                                    { $eq: [ "$userId", ObjectId(payload.userId)] }
                                                ]
                                        }
                                }
                        }
                    ],
                    as: "isLike"
                }
        },
        { $unwind: { path: "$isLike", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$info", preserveNullAndEmptyArrays: true } },
        {
            $lookup:
                {
                    from        : "users",
                    localField  : "info.userId",
                    foreignField: "_id",
                    as          : "info.userId"
                }
        },
        { $unwind: { path: "$info.userId", preserveNullAndEmptyArrays: true } },
        {
            $group : {
                _id    : "$_id",
                info   :  {$addToSet:{
                        _id           :"$info._id",
                        userId        :"$info.userId._id",
                        lastName      :"$info.userId.lastName",
                        role          :"$info.userId.role",
                        profilePicURL :"$info.userId.profilePicURL",
                        companyPicURL :"$info.userId.companyPicURL" ,
                        firstName     :"$info.userId.firstName",
                        messageStatus :"$info.messageStatus",
                        createdAt :"$info.createdAt",
                    }},
                isLike              : {$first:{$cond:{if:"$isLike",then:"$isLike.subType",else:""}}},
                LIKE                :  {$first:"$LIKE"},
                UNLIKE              :  {$first:"$UNLIKE"},
                replyObject         :  {$first:"$replyObject"},
                replyId             :  {$first:"$replyId"},
                HAHA                :  {$first:"$HAHA"},
                LOVE                :  {$first:"$LOVE"},
                WOW                 :  {$first:"$WOW"},
                note                :  {$first:"$note"},
                SAD                 :  {$first:"$SAD"},
                ANGRY               :  {$first:"$ANGRY"},
                type                :  {$first:"$type"},
                messageStatus       :  {$first:"$messageStatus"},
                isDeleted           :  {$first:"$isDeleted"},
                unread              :  {$first:"$unread"},
                image               :  {$first:"$image"},
                chatType            :  {$first:"$chatType"},
                senderId            :  {$first:"$senderId"},
                groupId             :  {$first:"$groupId"},
                contact             :  {$first:"$contact"},
                location            :  {$first:"$location"},
                conversationId      :  {$first:"$conversationId"},
                text                :  {$first:"$text"},
                createdAt           :  {$first:"$createdAt"},
                userId              :  {$addToSet:{
                        _id             :       {$cond: { if: "$userId._id",then:"$userId._id",else:""}},
                        firstName       :      "$userId.firstName",
                        lastName        :      "$userId.lastName",
                        role            :      "$userId.role",
                        fullName        :      "$userId.fullName",
                        profilePicURL   :      "$userId.profilePicURL"
                    }}

            }},
        { $unwind: { path: "$userId", preserveNullAndEmptyArrays: true } },
    ];

    return (await DAO.aggregateData(Models.Chat,aggregate));
}

// function to escape special letters in search
function escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

// function to convert id strings to objectId
async function convertToObjectId(arrayData, flag) {
    return Promise.resolve(arrayData.map(data => {
        if (flag === 1) return ObjectId(data.id);
        else if (!flag) return ObjectId(data);
        // else return new RegExp('^'+data+'$');
        else return data;
    }));
}


module.exports = {
    failActionFunction            : failActionFunction,
    sendSuccess                   : sendSuccess,
    sendError                     : sendError,
    CryptData                     : CryptData,
    generateFilenameWithExtension : generateFilenameWithExtension,
    getSignUpResponse1            : getSignUpResponse1,
    checkUserNameExists           : checkUserNameExists,
    authorizationHeaderObj        : authorizationHeaderObj,
    getUserTokenData              : getUserTokenData,
    messageResponse               : messageResponse,
    escapeRegExp                  : escapeRegExp,
    convertToObjectId             : convertToObjectId,
    authorizationOptionalHeaderObj: authorizationOptionalHeaderObj
};