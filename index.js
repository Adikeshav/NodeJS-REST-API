/*
*
*
*
*/

//Dependencies
let server = require('./lib/server');
let workers = require('./lib/workers')

//Declare App
let app = {}

//Initialise app
app.init = function () {
    server.init();
    workers.init();
}

app.init(); //Execute the app

//Export Module
module.exports = app;