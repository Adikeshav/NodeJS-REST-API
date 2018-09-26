/*
*
*   Request Handlers
*
*/

//Dependencies
var _data = require('./data');
var helpers = require('./helpers');
var config = require('./config');
var async = require('async')

//Define Handlers
var handlers = {};

//User Handler
handlers.users = function(data, callback) {
    acceptableMethods = ['post','get','put','delete'];
    if(acceptableMethods.indexOf(data.method) > -1)
        handlers._users[data.method](data,callback);
    else callback(405,{'Error':'Not a acceptable method'});
}
//Container for user submethods
handlers._users = {};

//Create New User - POST method
//Required Data: firstName, lastName, phone, password, tosAgreement
//Optional Data: none
handlers._users.post = function(data,callback){
    //Sanity check for required data fields
    var firstName =  typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName =  typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var phone =  typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    var password =  typeof(data.payload.password) == 'string' && data.payload.password.trim().length >0 ? data.payload.password.trim() : false;
    var tosAgreement =  typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

    if(firstName && lastName && phone && password && tosAgreement){
        //Check if user already exists (Unique Password)
        _data.read('users',phone,function(err,userData){
            if(err){ //User does not exist
                //Hash passwords
                var hashPassword = helpers.hash(password);
                if(hashPassword) {
                    //Creating userObject
                    var userObject = {
                        'firstName' : firstName,
                        'lastName' : lastName,
                        'phone' : phone,
                        'password' : hashPassword,
                        'tosAgreement' : true,
                    }
                    //Store User
                    _data.create('users', phone, userObject, function(err){
                        if(!err)
                            callback(200,{'Message':'User Created Successfully'});
                        else
                            callback(500,{'Error' : 'Could not create new user'});
                    });
                } else
                    callback(500,{'Error' : 'Could not hash the user password'});
            } else //User exists
                callback(400,{'Error' : 'User with phone number already exists!!!'});
        });
    } else
        callback(400,{'Error' : 'Missing Required Fields'});
};

//Fetch User Data - GET method
//Required Data: phone
//Optional Data: none
handlers._users.get = function(data, callback){
    //Sanity check on input data
    var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone : false;
    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
    handlers._tokens.verifyToken(token,phone,function(isValid){
        if(isValid) {
            if(phone) {
                //Lookup for User
                _data.read('users', phone, function(err,userData) {
                    if(!err && userData ) {
                        //Remove hashed password from user object before returning
                        delete userData.password;
                        callback(200, userData)
                    } else
                        callback(404,{'Error':'Requested user could not be found'})
                });
            } else callback(400,{'Error':'Missing Required Field'})
        } else callback(403,{'Error':'Invalid Token'})
    });
};

//Edit User Data - PUT Method
//Required Data: phone
//Optional Data: firstName, lastName, password (atleast 1 must be specified)
handlers._users.put = function(data, callback){
    //Sanity check for required and optional data fields
    var phone =  typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    var firstName =  typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName =  typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var password =  typeof(data.payload.password) == 'string' && data.payload.password.trim().length >0 ? data.payload.password.trim() : false;
    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
    handlers._tokens.verifyToken(token,phone,function(isValid){
        if(isValid) {
            if(phone){
                if(firstName || lastName || password){
                    _data.read('users',phone,function(err,userData){
                        if(!err && userData){
                            //Update information
                            if(firstName)
                                userData.firstName=firstName;
                            if(lastName)
                                userData.lastName=lastName;
                            if(password)
                                userData.password=helpers.hash(password);
                            //Store Updated User Record
                            _data.update("users",phone,userData,function(err){
                                if(!err)
                                    callback(200,userData);
                                else {
                                    console.log(err);
                                    callback(500,{'Error':'Could not update the user'});
                                }
                            });
                        } else callback(400,{'Error':'Specified User Doesn\'t Exist'});
                    });
                } else callback(400,{'Error':'Missing Fields for update'});
            } else callback(400,{'Error':'Missing Required Fields'});
        } else callback(403,{'Error':'Invalid Token'})
    });
};

//Delete User Data - DELETE Method
//Required Data: phone
//@TODO: Delete any other files associated with this user
handlers._users.delete = function(data,callback){
    //Sanity check for required data field
    var phone =  typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
    handlers._tokens.verifyToken(token,phone,function(isValid){
        if(isValid) {
            if(phone) {
                //Lookup for User
                _data.read('users', phone, function(err,userData) {
                    if(!err && userData ) {
                        let userChecks = typeof(userData.checks)=='object' && userData.checks instanceof Array ? userData.checks : [];
                        if(userChecks.length>0) {
                            let deletionErrors = false
                            userChecks.forEach(checkId => {
                                _data.delete('checks',checkId,function(err){
                                    if(err)
                                        deletionErrors = true
                                })
                            });
                            if(!deletionErrors) {
                                _data.delete("users",phone,function(err){
                                    if(!err) 
                                        callback(200, {'Message':'User and associated checks has been deleted'});
                                    else callback(500,{'Error':'Could not delete the specified user'});
                                });
                            } else callback(500,{'Error':'Failed to delete all checks assosiated with user'})
                        }
                    } else callback(404,{'Error':'Requested user could not be found'});
                });
            } else callback(400,{'Error':'Missing Required Field'});
        } else callback(403,{'Error':'Invalid Token'})
    });
};

//Token Handler
handlers.tokens = function(data, callback) {
    acceptableMethods = ['post','get','put','delete'];
    if(acceptableMethods.indexOf(data.method) > -1)
        handlers._tokens[data.method](data,callback);
    else callback(405,{'Error':'Not a acceptable method'});
}
//Container for all tokens methods
handlers._tokens = {};

//Generate Tokens - PUT Method
//Required Fields: phone, password
//Optional Data: none
handlers._tokens.post = function(data,callback){
    var phone =  typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    var password =  typeof(data.payload.password) == 'string' && data.payload.password.trim().length >0 ? data.payload.password.trim() : false;
    if( phone && password ){
        //Lookup for User
        _data.read('users', phone, function(err,userData) {
            if(!err && userData ) {
                if( userData.password == helpers.hash(password)) {
                    //Create token with random string and set expiration date for 1 hour
                    let tokenId = helpers.generateRandomString(20);
                    let expiry = Date.now() + (1000*60*60);
                    let tokenObject = {
                        'phone' : phone,
                        'id' : tokenId,
                        'expires' : expiry
                    };
                    _data.create("tokens",tokenId,tokenObject,function(err){
                        if(!err)
                            callback(200,tokenObject);
                        else
                            callback(500,"{'Error' : 'Could not generate new token'}");
                    })
                } else callback(400,"{'Error':'Incorrect Password'}");
            } else callback(404,"{'Error':'Requested user could not be found'}");
        });
    } else callback(400,"{'Error':'Missing Required Fields'}");
};

//Fetch Token Details - GET Method
//Required Data: id
//Optional Data : none
handlers._tokens.get = function(data,callback){
    let tokenId =  typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if(tokenId){
        _data.read("tokens",tokenId,function(err,tokenData){
            if(!err && tokenData){
                callback(200, tokenData);
            } else callback(404,{'Error':'Specified token does not exist'});
        });
    } else callback(400,{'Error':'Missing Required Fields'});
};

//Extend token expiration by another hour - PUT Method
//Required Data: id, extend(boolean)
//Optional Data: none
handlers._tokens.put = function(data,callback){
    let tokenId =  typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
    let extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;
    if(tokenId && extend){
        _data.read("tokens",tokenId,function(err,tokenData){
            if(!err && tokenData){
                if(tokenData.expires>Date.now()){
                    tokenData.expires = Date.now() + (1000*60*60);
                    _data.update("tokens",tokenId,tokenData,function(err){
                        if(!err)
                            callback(200, tokenData);
                        else callback(500, {'Error':'Could not update token expiration'});
                    })
                } else callback(400, {'Error':'Token has expired. Please generate a new token'});
            } else callback(404,{'Error':'Specified token does not exist'});
        });
    } else callback(400,{'Error':'Missing Required Fields'});
};

//Delete Tokens - DELETE Method
//Required Data: id
//Optional Data:none
handlers._tokens.delete = function(data,callback){
    //Sanity check for required data field
    var tokenId =  typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if(tokenId) {
        //Lookup for Token
        _data.read('tokens', tokenId, function(err,tokenData) {
            if(!err && tokenData ) {
                _data.delete("tokens",tokenId,function(err){
                    if(!err) 
                        callback(200, {'Message':'Token has been deleted'});
                    else callback(500,{'Error':'Could not delete the specified token'});
                });
            } else callback(404,{'Error':'Requested token could not be found'});
        });
    } else callback(400,{'Error':'Missing Required Field'});
};

//Verify if token provided is valid for given user
//Required Fields:
 handlers._tokens.verifyToken =function(tokenId,phone,callback) {
    _data.read('tokens', tokenId, function(err,tokenData) {
        if(!err && tokenData ) {
            //Check if phone number matches and that token has not expired
            if(tokenData.phone == phone && tokenData.expires>Date.now())
                callback(true);
            else callback(false);
        } else callback(false);
    });
 };


//Checks Handler
handlers.checks = function(data, callback) {
    acceptableMethods = ['post','get','put','delete'];
    if(acceptableMethods.indexOf(data.method) > -1)
        handlers._checks[data.method](data,callback);
    else callback(405,{'Error':'Not a acceptable method'});
}
//Container for checks submethods
handlers._checks = {};

//Create new check - POST Method
//Required Data: protocal, url, method, successCodes, timeoutSeconds
//Optional Data: none
handlers._checks.post = function(data,callback) {
    let protocol =  typeof(data.payload.protocol) == 'string' && ['http','https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    let url =  typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    let method =  typeof(data.payload.method) == 'string' && ['get','post','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    let successCodes =  typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length >0 ? data.payload.successCodes : false;
    let timeoutSeconds =  typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds%1==0 && data.payload.timeoutSeconds>=1 && data.payload.timeoutSeconds<=5? data.payload.timeoutSeconds : false;
    if(protocol && url && method && successCodes && timeoutSeconds) {
        let tokenId = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        _data.read('tokens', tokenId, function(err,tokenData) {
            if(!err && tokenData) {
                let userPhone = tokenData.phone;
                _data.read('users',userPhone,function(err,userData){
                    if(!err && userData) {
                        let userChecks = typeof(userData.checks)=='object' && userData.checks instanceof Array ? userData.checks : [];
                        if(userChecks.length<config.maxChecks){
                            let checkId = helpers.generateRandomString(20);
                            let checkObject = {
                                'id' : checkId,
                                'userPhone' : userPhone,
                                'protocol' : protocol,
                                'method' : method,
                                'url' : url,
                                'successCodes' : successCodes,
                                'timeoutSeconds' : timeoutSeconds,
                            }
                            _data.create('checks',checkId,checkObject,function(err){
                                if(!err) {
                                    userData.checks = userChecks;
                                    userData.checks.push(checkId);
                                    _data.update("users",userPhone,userData,function(err,data){
                                        if(!err) {
                                            callback(200,checkObject)
                                        } else callback(500, {'Error':'Could not update the user data with new check'})
                                    })
                                }else callback(500, {'Error':'Could not create the new check'})
                            });
                        } else callback(400,{'Error':'User already has maximum amount of checks('+config.maxChecks+')'})
                    } else callback(403,{'Error':'Invaid Token'}); 
                });
            } else callback(404,{'Error':'Requested token could not be found'}); 
        });
    } else callback(400,{'Error':'Missing Required Field'});
    
};

//Fetch check data- GET Method
//Required Data: protocal, url, method, successCodes, timeoutSeconds
//Optional Data: none
handlers._checks.get = function(data,callback) {
    let checkId =  typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length > 0 ? data.queryStringObject.id.trim() : false;
    if(checkId) {
        _data.read('checks',checkId,function(err,checkData){
            if(!err && checkData) {
                let tokenId = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                handlers._tokens.verifyToken(tokenId, checkData.userPhone, function(tokenIsValid){
                    if(tokenIsValid) {
                        callback(200,checkData);
                    } else callback(403,{'Error':'Invaid Token'}); 
                });
            } else callback(404,{'Error':'Requested check could not be found'}); 
        });
    } else callback(400,{'Error':'Missing Required Field'});
};

//Update check - PUT Method
//Required Data: id
//Optional Data: protocal, url, method, successCodes, timeoutSeconds (Atleast 1)
handlers._checks.put = function(data,callback) {
    let checkId =  typeof(data.payload.id) == 'string' && data.payload.id.trim().length > 0 ? data.payload.id.trim() : false;
    let protocol =  typeof(data.payload.protocol) == 'string' && ['http','https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    let url =  typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    let method =  typeof(data.payload.method) == 'string' && ['get','post','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    let successCodes =  typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length >0 ? data.payload.successCodes : false;
    let timeoutSeconds =  typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds%1==0 && data.payload.timeoutSeconds>=1 && data.payload.timeoutSeconds<=5? data.payload.timeoutSeconds : false;
    if(checkId){
        if(protocol || url || method || successCodes || timeoutSeconds) {
            _data.read('checks',checkId,function(err,checkData){
                if(!err && checkData) {
                    //Read and verify token
                    let tokenId = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                    handlers._tokens.verifyToken(tokenId, checkData.userPhone, function(tokenIsValid){
                        if(tokenIsValid) {
                            //Update checkData object with new information
                            if(protocol)
                                checkData.protocol = protocol;
                            if(url)
                                checkData.url = url;
                            if(method)
                                checkData.method = method;
                            if(successCodes)
                                checkData.successCodes = successCodes;
                            if(timeoutSeconds)
                                checkData.timeoutSeconds = timeoutSeconds;
                            _data.update('checks',checkId, checkData, function(err){
                                if(!err){
                                    callback(200,checkData)
                                } else callback(500,{'Error':'Could not update the check data'});
                            });
                        } else callback(403,{'Error':'Invaid Token'}); 
                    });
                } else callback(404,{'Error':'Requested check could not be found'}); 
            });
        } else callback(400,{'Error':'Missing Fields for update'});
    } else callback(400,{'Error':'Missing Required Field'});
    
};

//Delete  check - Delete Method Method
//Required Data: id
//Optional Data: none
handlers._checks.delete = function(data,callback) {
    let checkId =  typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length > 0 ? data.queryStringObject.id.trim() : false;
    if(checkId){
        _data.read('checks',checkId,function(err,checkData){
            if(!err && checkData) {
                let tokenId = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                handlers._tokens.verifyToken(tokenId, checkData.userPhone, function(tokenIsValid){
                    if(tokenIsValid) {
                        _data.read('users',checkData.userPhone,function(err,userData){
                            if(!err && userData) {
                                let userChecks = typeof(userData.checks)=='object' && userData.checks instanceof Array ? userData.checks : [];
                                let checkPosistion = userChecks.indexOf(checkId);
                                if(checkPosistion>-1){
                                    userChecks.splice(checkPosistion,1);
                                    _data.delete('checks',checkId, function(err){
                                        if(!err) 
                                            _data.update('users',checkData.userPhone,userData,function(err){
                                                if(!err)
                                                    callback(200)
                                                else callback(500,{'Error':'Could not delete the check'})
                                            });
                                        else callback(500,{'Error':'Could not delete the check'})
                                    });
                                } else callback(500,{'Error':'Requested check could not be found in the user list'})
                            } else callback(500,{'Error':'Could not find user who created the check.'})
                        });
                    } else callback(403,{'Error':'Invaid Token'}); 
                });
            } else callback(404,{'Error':'Requested check could not be found'}); 
        });
    } else callback(400,{'Error':'Missing Required Field'});
    
};


//Ping handler
handlers.ping = function(data,callback){
    callback(200)
};

//Not Found handler
handlers.notFound = function(data,callback){
    callback(404)
};

//Export the module
module.exports = handlers