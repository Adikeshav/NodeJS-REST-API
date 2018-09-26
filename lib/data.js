/*
*
*   Library for storing and editing data
*
*/

//Dependencies
var fs = require("fs");
var path = require("path");
var helpers = require("./helpers")

//Container for module to be exported
var lib = {};
lib.baseDir = path.join(__dirname, "../.data/")

//Create file and write data
lib.create = function (dir, file, data, callback) {
    fs.open(lib.baseDir + dir + '/' + file + '.json', 'wx', function (err, fileDescriptor) {
        if (!err && fileDescriptor) {
            var stringData = JSON.stringify(data)
            fs.writeFile(fileDescriptor, stringData, function (err) {
                if (!err) {
                    fs.close(fileDescriptor, function (err) {
                        if (!err) {
                            callback(false)
                        } else {
                            callback("Error closing the file")
                        }
                    });
                } else {
                    callback("Error writing data to file ")
                }
            });
        } else {
            callback("Could not create new file, it may already exist")
        }
    });
}

//Read data from file
lib.read = function (dir, file, callback) {
    fs.readFile(lib.baseDir + dir + '/' + file + '.json', 'UTF-8', function (err, data) {
        if (!err && data) {
            var parsedData = helpers.parseJsonObjectToString(data);
            callback(false, parsedData)
        } else {
            callback(err, data)
        }
    });
};

//Update file
lib.update = function (dir, file, data, callback) {
    fs.open(lib.baseDir + dir + '/' + file + '.json', 'r+', function (err, fileDescriptor) {
        if (!err && fileDescriptor) {
            var stringData = JSON.stringify(data)
            fs.truncate(fileDescriptor, function (err) {
                if (!err) {
                    fs.writeFile(fileDescriptor, stringData, function (err) {
                        if (!err) {
                            fs.close(fileDescriptor, function (err) {
                                if (!err) {
                                    callback(false);
                                } else {
                                    callback("Error closing the file");
                                }
                            });
                        } else {
                            callback("Error writing data to file ");
                        }
                    });
                } else {
                    callback("Error truncating file ");
                }
            });
        } else {
            callback("Could not open file, it may not exist yet");
        }
    });
};

//Delete file
lib.delete = function (dir, file, callback) {
    fs.unlink(lib.baseDir + dir + '/' + file + '.json', function (err) {
        if (!err) {
            callback(false)
        } else {
            callback("Error when deleting file");
        }
    });
};

//List files in directory
lib.list = function (dir, callback) {
    fs.readdir(lib.baseDir + dir + '/', function (err, files) {
        if (!err && files.length > 0) {
            let trimmedFileNames = [];
            files.forEach(function (fileName) {
                trimmedFileNames.push(fileName.replace('.json', ''))
            });
            callback(false, trimmedFileNames)
        } else callback(err, files)
    });
}

//Export the module
module.exports = lib;