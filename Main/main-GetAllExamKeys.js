let request = require('request');
const AssessmentConfig = require('../assessment-config.json');
//console.log('jsonConfig.GetAllExamKeys url: ' + AssessmentConfig.GetAllExamKeys);

module.exports = function GetAllExamKeys(CallbackFunc){
    var options = {
        url: AssessmentConfig.GetAllExamKeys,
        method: "GET",
        json: true   // <--Very important!!!
    };
    request(options, function(error, response, body){
        if(error){
            console.log(error);
            CallbackFunc("error");
        }
        else{
        CallbackFunc(body);
        }
    });
}