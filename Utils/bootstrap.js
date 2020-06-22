'use strict';

let mongoose = require('mongoose');

// globals initialised for app
global.ObjectId = mongoose.Types.ObjectId;
global.mongoDocStatus = [
  "ACTIVE",
  "BLOCKED",
  "DELETED"
];

// connect to db
mongoose.connect(process.env[process.env.NODE_ENV + 'URI'], {useUnifiedTopology: true}).then(success => {
    console.log("Mongodb connected: SuccessFully");
}).catch(err => {
    console.info({ERROR: err});
    process.exit(1);           // if db not connected exit the process
});
