const electron = require('electron');
const { ipcRenderer } = electron;
const AssessmentConfig = require('../assessment-config.json');

//https://www.npmjs.com/package/node-process-windows
var processWindows = require("node-process-windows")
console.log(JSON.stringify(processWindows.getProcesses, undefined, 1));


var btnCloseExam = document.querySelector('#btnCloseExam');
//var btnCloseExamSoftwareConfirmed = document.querySelector('#btnCloseExamSoftwareConfirmed');
var btnCloseExamSoftwareNoInternet = document.querySelector('#btnCloseExamSoftwareNoInternet');
var btnCloseExamSoftwareWebcamCaptureError = document.querySelector('#btnCloseExamSoftwareWebcamCaptureError');
var btnCloseExamSoftwareAudioError = document.querySelector('#btnCloseExamSoftwareAudioError');




var loader = '<div id="loader-overlay" class="ui-front loader ui-widget-overlay ' + 'bg-default' + ' opacity-' + '60' + '"><img src="../../assets/images/spinner/loader-' + 'dark' + '.gif" alt="" /></div>';

console.log('In renderer')

var ExamClientGeneratedGuid = guid();

console.log('AssessmentConfig: ' + JSON.stringify(AssessmentConfig));

//navigator.getUserMedia({ video: { width: 352, height: 240 }, audio: false }, (localMediaStream) => {
navigator.mediaDevices
    .getUserMedia({
        audio: false,
        video: { facingMode: "user", }
    })
    .then(localMediaStream => {
        // navigator.getUserMedia({ audio: true }, (st) => {
        navigator.mediaDevices
            .getUserMedia({
                audio: true,
                video: true
            })
            .then(stt => {
                console.log('Audio device detected.');

            }
                , er => {
                    $('#audioCaptureError').modal('show');
                });
    }
        , e => {
            console.log('Error', e);
            $('#webcamCaptureError').modal('show');
        });



// var r;
// var GetExamKeysIntervalAttemptCounter = 0;
// var GetExamKeysInterval = setInterval(function () {
//     GetExamKeysIntervalAttemptCounter++;
//     if (GetExamKeysIntervalAttemptCounter >= 4) {
//         $('#internetConnectionError').modal('show');
//     }
//     var xhttp = new XMLHttpRequest();
//     xhttp.onreadystatechange = function () {
//         if (this.readyState == 4 && this.status == 200) {
//             clearInterval(GetExamKeysInterval);
//             var config = JSON.parse(this.responseText).FirebaseKeys;
//             firebase.initializeApp(config);
//             r = firebase.database().ref('students/ids');
//             localStorage.setItem("FirebaseConfig", JSON.stringify(config));
//         }
//     };
//     xhttp.open("GET", AssessmentConfig.GetAllExamKeys, false);
//     try {
//         xhttp.send();
//     }
//     catch (e) {
//         console.log('Error in GetAllExamKeys.ashx: ' + e);
//     }
// }, 5000);

//To clear the clipboard to prevent copy paste and screenshots:
function copyToClipboard() {
    // Create a "hidden" input
    var aux = document.createElement("input");
    // Assign it the value of the specified element
    aux.setAttribute("value", "");
    // Append it to the body
    document.body.appendChild(aux);
    // Highlight its content
    aux.select();
    // Copy the highlighted text
    document.execCommand("copy");
    // Remove it from the body
    document.body.removeChild(aux);
    // alert("");
}
$(window).keyup(function (e) {
    if (e.keyCode == 44) {
        copyToClipboard();
    }
});

btnCloseExam.addEventListener("click", function (event) {
    $('#QuitExamSoftwareModal').modal('show');
});
// btnCloseExamSoftwareConfirmed.addEventListener("click", function (event) {
//     ipcRenderer.send('close:application', true);
// });
btnCloseExamSoftwareNoInternet.addEventListener("click", function (event) {
    copyToClipboard()
    ipcRenderer.send('close:application', true);
});
btnCloseExamSoftwareWebcamCaptureError.addEventListener("click", function (event) {
    copyToClipboard()
    ipcRenderer.send('close:application', true);
});
btnCloseExamSoftwareAudioError.addEventListener("click", function (event) {
    copyToClipboard()
    ipcRenderer.send('close:application', true);
});

// $(window).blur(function(){
//     if(DisableForegroundingFromMainForDebugging === false){
//         console.log('window Blur event attempted');
//         ipcRenderer.send('blur:application', true);
//     }
// });


window.onblur = function () {
    if (DisableForegroundingFromMainForDebugging === false) {
        console.log('window Blur event attempted');
        ipcRenderer.send('blur:application', true);
    }
}


function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}