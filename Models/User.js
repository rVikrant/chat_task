
let mongoose = require('mongoose');
let Schema = mongoose.Schema;
let SchemaTypes = mongoose.Schema.Types;

let gender={
    type: String,
    default: "MALE",
    enum: [
        "MALE",
        "FEMALE",
        "OTHERS"
    ]
};

let User = new Schema({

    // user basic info
    email: {type: String, sparse :true, index: true, required: true}, //
    fullName: {type: String, trim: true, sparse: true, index: true},
    lastName: {type: String, trim: true,sparse:true},
    password: {type: String, sparse:true},
    googleId: {type: String, sparse :true, index: true},
    firstName: {type: String, trim: true,sparse:true},
    facebookId: {type: String,sparse :true, index: true},
    countryCode: {type: String,sparse:true},
    phoneNumber: {type: String,sparse:true}, //
    dateOfBirth: {type:Number},

    // where are you from
    city: {type: String, default: ""},
    country: {type: String, default: ''},
    address: {type: String, default: ""},
    coordinates: { type: [Number], default: [0,0], index: '2dsphere', sparse: true},

    // relationship status
    relationshipStatus: {type: String, default: ''},
    imageUrl:{
        original:{type:String,default:""},
        thumbnail:{type:String,default:""}
    },
    gender: gender,

    lastLogin : {type: Number, default:0},
    OTPcode :{type:String,default:""},
    socketId:{type:String,trim:true,default:''},
    deviceToken:{type:String,trim:true,default:''},
    accessToken:{type:String,trim:true,sparse:true},
    isOnline: {type: Boolean, default:false},
    tokenIssuedAt:{type: Number},

    status: {type:String, enum: mongoDocStatus, default:mongoDocStatus[0]},

    blockedFriends: [{type: Schema.ObjectId, ref: 'User'}],

    isEmailVerified: {type: Boolean, default:false},
    isPhoneNumberVerified: {type: Boolean, default:false},
    isProfileComplete :{type:Boolean,default:false},   //for profile completion

    registrationDate: {type: Number, default:0},
});

module.exports = mongoose.model('User', User);




