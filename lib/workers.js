/*
*
* These are worker realted tasks
*
*/

//Dependencies
var _data = require('./data');
var http = require('http');
var https = require('https');
var helpers = require('./helpers');
var url = require('url');
var _logs = require('./logs');
var util = require('util');
var debug = util.debuglog('workers')


var workers = {};

workers.init = function () {
    console.log('\x1b[33m%s\x1b[0m','Background workers are running'); // Send to console, in yellow
    workers.gatherAllChecks(); //Execute all checks
    workers.loop(); //Call a loop
    workers.rotateLogs(); // Compress the logs immediately
    workers.logRotationLoop(); // Compression loop so checks will execute later on
};

workers.loop = function () {
    setInterval(function () {
        workers.gatherAllChecks();
    }, 1000 * 60);
};


workers.gatherAllChecks = function () {
    _data.list('checks', function (err, checksList) {
        if (!err && checksList && checksList.length > 0) {
            checksList.forEach(function (check) {
                _data.read('checks', check, function (err, originalCheckData) {
                    if (!err && originalCheckData) {
                        workers.validateCheckData(originalCheckData)
                    } else console.log("Error reading the file for check : " + check)
                });
            });
        } else console.log("Error: Could not find any checks to process");
    });
};

//Validate contents of 'originalCheckData' and call function to process the check
workers.validateCheckData = function (originalCheckData) {
    //Sanity check for originalCheckData
    originalCheckData = typeof (originalCheckData) == 'object' && originalCheckData != null ? originalCheckData : {};
    originalCheckData.id = typeof (originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20 ? originalCheckData.id : false;
    originalCheckData.userPhone = typeof (originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 10 ? originalCheckData.userPhone : false;
    originalCheckData.protocol = typeof (originalCheckData.protocol) == 'string' && ['http', 'https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false;
    originalCheckData.method = typeof (originalCheckData.method) == 'string' && ['get', 'post', 'put', 'delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false;
    originalCheckData.url = typeof (originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url : false;
    originalCheckData.successCodes = typeof (originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
    originalCheckData.timeoutSeconds = typeof (originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds % 1 == 0 && originalCheckData.timeoutSeconds > 1 && originalCheckData.timeoutSeconds < 5 ? originalCheckData.timeoutSeconds : false;
    //Checks for extra fields to monitor status
    originalCheckData.state = typeof (originalCheckData.state) == 'string' && ['up', 'down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down';
    originalCheckData.lastChecked = typeof (originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;
    if (originalCheckData.id && originalCheckData.userPhone && originalCheckData.protocol && originalCheckData.method
        && originalCheckData.url && originalCheckData.successCodes && originalCheckData.timeoutSeconds)
        workers.peformcheck(originalCheckData);
    else console.log('Error: Skipping check as it is not properly formatted', originalCheckData);
};

//Do the check mentioned and pass the result to function 'processCheckOutcome'
workers.peformcheck = function (originalCheckData) {
    let checkOutcome = {
        'error': false,
        'responseCode': false
    };
    let outcomeSent = false;
    //Get hostname and path from 'originalCheckData'
    let parsedUrl = url.parse(originalCheckData.protocol + "://" + originalCheckData.url, true);
    let hostName = parsedUrl.hostname;
    let path = parsedUrl.path;
    //Creating request
    let requestDetails = {
        'protocol': originalCheckData.protocol + ':',
        'hostname': hostName,
        'method': originalCheckData.method.toUpperCase(),
        'path': path,
        'timeout': 1000 * originalCheckData.timeoutSeconds,
    };
    //Determine if we need to use http ot https module
    let _moduleToUse = originalCheckData.protocol == 'http' ? http : https;
    var req = _moduleToUse.request(requestDetails, function (res) {
        checkOutcome.responseCode = res.statusCode
        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });
    //Bind to Error
    req.on('error', function (e) {
        checkOutcome.error = {
            'error': true,
            'value': e,
        };
        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });
    //Bind to timeout
    req.on('timeout', function (e) {
        checkOutcome.error = {
            'error': true,
            'value': 'timeout',
        };
        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });
    req.end();
};

//Process the result of the check and send alerts as needed
workers.processCheckOutcome = function (originalCheckData, checkOutcome) {
    //determine the status of check
    let state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';
    let alertNeeded = originalCheckData.lastChecked && originalCheckData.state != state ? true : false
    let newCheckData = originalCheckData;
    let checkTime = Date.now();
    workers.log(originalCheckData, checkOutcome, state, alertNeeded, checkTime)
    newCheckData.state = state;
    newCheckData.lastChecked = checkTime;

    _data.update('checks', newCheckData.id, newCheckData, function (err) {
        if (!err)
            if (alertNeeded)
                workers.alertUser(newCheckData)
            else debug("Check outcome has not changed, no alert needed")
        else console.log("Error while updating check data", newCheckData)
    });
};

//Send alert to user
workers.alertUser = function (checkData) {
    var msg = 'Alert: Your check for ' + checkData.method.toUpperCase() + ' ' + checkData.protocol + '://' + checkData.url + ' is currently ' + checkData.state;
    helpers.sendTwilioSms(checkData.userPhone, msg, function (err) {
        if (!err)
            debug("Alert has been send sucessfully")
        else console.log("Failed to send alert to user", checkData)
    });
};

workers.log = function (originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck) {
    // Form the log data
    var logData = {
        'check': originalCheckData,
        'outcome': checkOutcome,
        'state': state,
        'alert': alertWarranted,
        'time': timeOfCheck
    };
    var logString = JSON.stringify(logData);
    var logFileName = originalCheckData.id;
    _logs.append(logFileName, logString, function (err) {
        if (!err)
            debug("Logging to file succeeded");
        else console.log("Logging to file failed");
    });
};

// Rotate (compress) the log files
workers.rotateLogs = function () {
    // List all the (non compressed) log files
    _logs.list(false, function (err, logs) {
        if (!err && logs && logs.length > 0) {
            logs.forEach(function (logName) {
                // Compress the data to a different file
                var logId = logName.replace('.log', '');
                var newFileId = logId + '-' + Date.now();
                _logs.compress(logId, newFileId, function (err) {
                    if (!err) {
                        // Truncate the log
                        _logs.truncate(logId, function (err) {
                            if (!err)
                                debug("Success truncating logfile");
                            else console.log("Error truncating logfile");
                        });
                    } else console.log("Error compressing one of the log files.", err);
                });
            });
        } else console.log('Error: Could not find any logs to rotate');
    });
};

// Timer to execute the log-rotation process once per day
workers.logRotationLoop = function () {
    setInterval(function () {
        workers.rotateLogs();
    }, 1000 * 60 * 60 * 24);
};


module.exports = workers;