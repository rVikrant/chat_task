require('dotenv').config({path: './.env'});
require("./Utils/bootstrap");

"use strict";

let Hapi = require("hapi"),
    Plugins = require("./Plugins")
    // Routes = require("./Routes")
;

// Create Server
let server = new Hapi.Server({
    app: {
        name: "Apptunix Task"
    },
    port: process.env.port,
    routes: {
        cors: true
    }
});


(async initServer => {
    try {
        // Register All Plugins
        await server.register(Plugins);


        // API Routes
        // await server.route(Routes);


        server.events.on("response", request => {
            console.log("info", `[${request.method.toUpperCase()} ${request.url.path} ](${request.response.statusCode}) : ${request.info.responded - request.info.received} ms`);
        });

        // Default Routes
        server.route({
            method: "GET",
            path: "/",
            handler: (request, h) => {
                return "WELCOME PEOPLE";
            },
            config: {
                auth: false
            }
        });

        // hapi swagger workaround(but a ugly hack for version 9.0.1)
        server.ext("onRequest", async (request, h) => {
            request.headers["x-forwarded-host"] = (request.headers["x-forwarded-host"] || request.info.host);
            return h.continue;
        });


        server.ext("onPreAuth", (request, h) => {
            console.log("info", "onPreAuth");
            return h.continue;
        });

        server.ext("onCredentials", (request, h) => {
            console.log("info", "onCredentials");
            return h.continue;
        });

        server.ext("onPostAuth", (request, h) => {
            console.log("info", "onPostAuth");
            return h.continue;
        });

        // Start Server

        await server.start();

        console.log("info", `Server running at ${server.info.uri}`);
    } catch (error) {
        console.log("info", error);
    }
})();

