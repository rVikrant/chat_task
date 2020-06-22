'use strict';

let TokenManager = require('../Libs/tokenManager');

exports.plugin = {
    name    : 'auth',
    register: async (server, options) => {
        await server.register(require('hapi-auth-jwt2'));
        console.log("========decoded=============");

        server.auth.strategy("User", 'jwt',
            { key: process.env.JWT_SECRET_KEY_USER,          // Never Share your secret key
                validate: TokenManager.verifyToken, // validate function defined above
                verifyOptions: { algorithms: [ 'HS256' ] } // pick a strong algorithm
            });
        server.auth.default("User");
    }
};
