/*
*
*Server Related lasts
*
*/

//Dependencies
var http = require("http");
var https = require("https");
var url = require("url");
var StringDecoder = require("string_decoder").StringDecoder;
var config = require('./config');
var fs = require('fs');
var handlers = require('./handlers')
var helpers = require('./helpers')
var async = require('async')
var path = require('path')
var util = require('util');
var debug = util.debuglog('server')

//Instatntiate a  server module object
var server = {}

//Instantiate and start the HTTPS Server
server.httpsServerOptions = {
    'key': fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
    'cert': fs.readFileSync(path.join(__dirname, '/../https/cert.pem')),
};
server.httpsServer = https.createServer(server.httpsServerOptions, function (req, res) {
    server.unifiedServer(req, res)
});

//Instantiate and start HTTP Server
server.httpServer = http.createServer(function (req, res) {
    server.unifiedServer(req, res)
});


//Server Logic for HTTP and HTTPS servers
server.unifiedServer = async function (req, res) {
    //Get the URL and parse it
    let parsedUrl = url.parse(req.url, true);
    let path = parsedUrl.pathname;
    let trimmedPath = path.replace(/^\/+|\/+$/g, '');
    let method = req.method.toLowerCase();
    let queryStringObject = parsedUrl.query;
    let headers = req.headers;

    let decoder = new StringDecoder('utf-8');
    let buffer = '';
    await req.on('data', function (data) {
        buffer += decoder.write(data);
    });
    await req.on('end', function () {
        buffer += decoder.end();
    });

    //Chose handler the request needs to go to
    let chosenHandler = typeof (server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound
    //Define data that needs to be passed to the handler
    let data = {
        'trimmedPath': trimmedPath,
        'queryStringObject': queryStringObject,
        'method': method,
        'headers': headers,
        'payload': helpers.parseJsonObjectToString(buffer),
    };

    //Route request to handler specified in the rputer
    chosenHandler(data, function (statusCode, payload) {
        //Use statusCode called back by the handler or use default code
        statusCode = typeof (statusCode) == 'number' ? statusCode : 200;
        //use payload called back by the handler or use default code
        payload = typeof (payload) == 'object' || typeof (payload) == 'string' ? payload : {};
        //Convert payload to string
        let payloadString = JSON.stringify(payload);
        //Return response
        res.setHeader('Content-Type', 'application/json')
        res.writeHead(statusCode);
        res.end(payloadString);
        // debug("Returning response: ", statusCode, payloadString);
        if(statusCode==200)
            debug('\x1b[32m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+' '+statusCode);
        else debug('\x1b[31m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+' '+statusCode);
    });
};

//Define a request router
server.router = {
    'ping': handlers.ping,
    'users': handlers.users,
    'tokens': handlers.tokens,
    'checks': handlers.checks,
};

server.init = function () {
    server.httpsServer.listen(config.httpsPort, function () {
        console.log('\x1b[36m%s\x1b[0m',config.envName + " Server(HTTPS) is listening on port ", config.httpsPort);
    });
    server.httpServer.listen(config.httpPort, function () {
        console.log('\x1b[35m%s\x1b[0m',config.envName + " Server(HTTP) is listening on port ", config.httpPort);
    });
};

module.exports = server;