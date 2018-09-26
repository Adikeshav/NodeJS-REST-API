/*
*
*   Helpers for various tasks
*
*/

//Dependancies
var crypto = require('crypto');
var config = require('./config');
var https = require('https');
var queryString = require('querystring');

//Container for all helpers
var helpers = {};

//SHA256 hasher
helpers.hash = function (str) {
    if (typeof (str) == 'string' && str.length > 0) {
        var hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest("hex")
        return hash
    } else {
        return false
    }
}

//Parse JSON String to Object
helpers.parseJsonObjectToString = function (str) {
    try {
        var obj = JSON.parse(str);
        return obj
    } catch (e) {
        return {}
    }
}

//Generate random alphanumeric string of provided length
helpers.generateRandomString = function (strLength) {
    strLength = typeof (strLength) == 'number' && strLength > 0 ? strLength : false;
    if (strLength) {
        //Define all possible characters in string
        let possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let str = ''
        for (i = 0; i < strLength; i++)
            //Append a random character from 'possibleCharacters' to 'str'
            str += possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
        return str;
    } else return false
}

//Send SMS via Twilio
helpers.sendTwilioSms = function (phone, message, callback) {
    //Validate input
    phone = typeof (phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false
    message = typeof (message) == 'string' && message.trim().length > 0 && message.trim.length <= 1600 ? message.trim() : false
    if (phone && message) {
        let messagePayload = { //Payload to send to Twilio
            'From': config.twilio.fromPhone,
            'To': "+1" + phone,
            'Body': message,
        }
        let stringPayload = queryString.stringify(messagePayload)
        let requestDetails = { //Https request to be send to Twilio
            'protocol': 'https:',
            'hostname': 'api.twilio.com',
            'method': 'post',
            'path': '/2010-04-01/Accounts/' + config.twilio.accountSid + '/Messages.json',
            'auth': config.twilio.accountSid + ':' + config.twilio.authToken,
            'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringPayload),
            },
        }
        let req = https.request(requestDetails, function (res) {
            if (res.statusCode == 200 || res.statusCode == 201)
                callback(false)
            else callback('Status code returned was: ' + res.statusCode);
        })
        //Bind error event to prevent it from being thrown
        req.on('error', function (e) { callback(e); });
        req.write(stringPayload);
        req.end();

    } else callback(400, { 'Error': 'Missing Parameters to send message' });
}

//Export
module.exports = helpers