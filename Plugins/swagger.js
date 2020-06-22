'use strict';

const Inert = require('inert'),
    Vision = require('vision');
const HapiSwagger = require('hapi-swagger');

exports.plugin = {
    name: 'swagger-plugin',

    register: async (server) => {
        const swaggerOptions = {
            info: {
                title: 'Apptunix Task Docs'
            }
        };
        await server.register([
            Inert,
            Vision,
            {
                plugin: HapiSwagger,
                options: swaggerOptions
            }
        ]);
        console.info('Swagger Loaded');
    }
};
