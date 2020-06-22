'use strict';

const mongoose = require('mongoose'),
    Schema   = mongoose.Schema
;


let ProfilePicURL = {
    original    : {type:String,required:true,trim:true, default: ""},
    thumbnail   : {type:String,required:true,trim:true, default: ""},
    mediaType   : {type:String,required:true,trim:true, default: ""},
};

let Group = new Schema({
    userId              : {type:Schema.Types.ObjectId,index: true,required:true,ref:'User'},
    groupName           : {type:String,required:true},
    subject             : {type:String,default:''},
    groupImage          : {type:ProfilePicURL},
    groupMembers        : {type:[Schema.Types.ObjectId],index: true,required:true,default:[], ref:'User'},
    requestedMembers    : {type:[Schema.Types.ObjectId],index: true,required:true,default:[], ref:'User'},
    status              : {type:String, enum: mongoDocStatus, default:mongoDocStatus[0]},
    createdAt           : {type:Date, default: Date.now, required: true}
});



module.exports = mongoose.model('Group',Group);