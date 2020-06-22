'use strict';

const mongoose = require('mongoose'),
    Schema   = mongoose.Schema
;

let chatType=[
    "GROUP",
    "INDIVIDUAL"
], contentType=[
    "TEXT",
    "CALL",
    "IMAGE",
    "VIDEO",
    "VIDEO_CALL",
    "DOCUMENT",
    "LOCATION",
    "CONTACT"
],ProfilePicURL = {
    original    : {type:String,required:true,trim:true, default: ""},
    thumbnail   : {type:String,required:true,trim:true, default: ""},
    mediaType   : {type:String,required:true,trim:true, default: ""},
}, messageStatus = new Schema({
    userId              : {type: Schema.Types.ObjectId,index: true,ref:'User'},
    createdAt           : {type: Number, default: Date.now, required: true},
    messageStatus       : {type:String},
});


let Chat = new Schema({
    receiverId          : {type: Schema.Types.ObjectId,index: true,ref:'User'},
    senderId            : {type: Schema.Types.ObjectId,index: true,required:true,ref:'User'},
    groupId             : {type: Schema.Types.ObjectId,index: true,ref:'Group'},
    location            : {type:String},
    conversationId      : {type:String,required:true},
    note                : {type:String},
    LIKE                : {type:Number,default:0},
    UNLIKE              : {type:Number,default:0},
    HAHA                : {type:Number,default:0},
    LOVE                : {type:Number,default:0},
    WOW                 : {type:Number,default:0},
    SAD                 : {type:Number,default:0},
    ANGRY               : {type:Number,default:0},
    text                : {type:String},
    contact             : {type:String},
    isClear             : {type: [Schema.Types.ObjectId],index: true,ref:'User', default: []},
    info                : {type: [messageStatus],default:[]},
    deletedUserId       : {type: [Schema.Types.ObjectId],default:[]},
    isReply             : {type: Boolean, default:false},
    replyId             : {type: Schema.Types.ObjectId,index: true,ref:'Chat'},
    type                : {type: String,enum: contentType,default:contentType[0] },
    chatType            : {type: String,enum: chatType,default: chatType[0] },
    image               : {type:ProfilePicURL},
    messageStatus       : {type:String,default:"SENT", enum: ["SENT", "RECEIVED", "SEEN"]},

    status: {type:String, enum: mongoDocStatus, default:mongoDocStatus[0]},

    createdAt           : {type: Number, default: Date.now, required: true}
});

module.exports = mongoose.model('Chat',Chat);