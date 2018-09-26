/*
*
* Create and export configuration variables
*
*/

//Container for all enivornments
var environments = {};

//Define staging environment (Default environment)
environments.staging = {
    'httpPort': 3000,
    'httpsPort': 3001,
    'envName': 'Staging',
    'hashingSecret': 'thisIsASecret',
    'maxChecks': 5,
    'twilio': {
        'accountSid': 'ACb32d411ad7fe886aac54c665d25e5c5d',
        'authToken': '9455e3eb3109edc12e3d8c92768f7a67',
        'fromPhone': '+15005550006'
    }


};
//Production environemnt
environments.production = {
    'httpPort': 5000,
    'httpsPort': 5001,
    'envName': 'Production',
    'hashingSecret': 'thisIsAlsoASecret',
    'maxChecks': 10,
    'twilio': {
        'accountSid': '',
        'authToken': '',
        'fromPhone': '',
    }
};

//Determine environment from command-line argument 'NODE_ENV'
var currentEnv = typeof (process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : 'staging';

//Check if currentEnvironment is valid, else deafult to staging environment
var exportEnv = typeof (environments[currentEnv]) == 'object' ? environments[currentEnv] : environments['staging']

module.exports = exportEnv