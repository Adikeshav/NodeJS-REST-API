/*

*/

//Dependencies
var http = require("http");
var url = require("url")

//Create server to respond to the incoming requests
var server = http.createServer(function(req, res){
    //Get the URL and parse it
    var parsedUrl = url.parse(req.url,true);
    //Get path
    var path = parsedUrl.pathname
    var trimmedPath = path.replace(/^\/+|\/+$/g,'')
    //Send response
    res.end("Hello World\n")
    //Log request path
    console.log("Request recieved for path: "+trimmedPath)
});

//Start server and have it listen on port 3000
server.listen(3000, function(){
    console.log("Server is listening on port 3000")
})