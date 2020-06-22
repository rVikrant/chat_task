"use strict";

'use strict';

const mongoose = require('mongoose'),
    Schema   = mongoose.Schema
;


let Conversation = new Schema({
    userId              : {type:Schema.Types.ObjectId,index: true,ref:'User', sparse: true},
    groupId             : {type:Schema.Types.ObjectId,index: true,ref:'Group', sparse: true},
    userName            : {type:String},
    groupName           : {type:String},
    blockedMembers      : {type:Schema.Types.ObjectId,index: true,ref:'User', sparse: true, default: []},

    members             : {type:[Schema.Types.ObjectId],index: true,required:true,default:[], ref:'User'},
    requestedMembers    : {type:[Schema.Types.ObjectId],index: true,required:true,default:[], ref:'User'},

    status              : {type:String, enum: mongoDocStatus, default:mongoDocStatus[0]},
    createdAt           : {type:Date, default: Date.now, required: true}
});

module.exports = mongoose.model('Conversation',Conversation);

