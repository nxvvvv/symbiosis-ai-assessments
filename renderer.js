// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const electron = require('electron');
const { ipcRenderer } = electron;
const { desktopCapturer } = electron;
const { remote } = require('electron');

//const processWebcamVideo = require('./Renderer/renderer-FaceDetectionRecognition');
const WebRTC = require('./Renderer/renderer-WebRtc');
// const RendererExams = require('./Renderer/renderer-Exam');

const AssessmentConfig = require('./assessment-config.json');

var video = document.getElementById('videoFaceDetect');
var FaceRecognitionVideo = document.getElementById('FaceRecognitionVideo');
var videoProctor = document.getElementById('videoProctor');
// var canvas = document.querySelector('canvas'),
var canvas = document.getElementById('canvas'),
    context = canvas.getContext('2d');
var studentFirebaseIdKey;
//var studentWebGuid;
var studentWebId;
var studentAadharCardNo;
var studentRasciId;

var globalDesktopStream;

var mediaRecorderDesktop;
var recordedChunksDesktop = []; //To save desktop recording
var formDataDesktopError = []; //To retry sending failed desktop recordings
//var formDataDesktopErrorFailedOnRetry = [];
var formDataDesktopInProgress = []; //To make sure that same ajax call is not repeated while in progress

var mediaRecorderWebcam;
var recordedChunksWebcam = []; //To save webcam recording


var waitForDesktopStreamToBeReady;

var btnEndExam = document.querySelector('#btnEndExam');
var btnEndExamConfirmed = document.querySelector('#btnEndExamConfirmed');
var isDesktopVideoUploaded = false;
var isWebCamVideoUploaded = false;

var imageBase64GlobalFirebaseDisplay;
var timeLeftInExamFirebaseDisplay = "00:00:00";

//The following are now global in schoolguru-login.html
// var faceDetecetionFailedFlags = 0
// var noOfFacesDetectedMorethan1Flags = 0;
// var faceRecognitionFailedFlags = 0;

var isExamEnded = false;
var isWebCamRecordingToBeStopped = false;

//The following are now global in schoolguru-login.html
// var TakeInitialStudentImageIncrementCounter = 0;
// var TakeInitialStudentVideoIncrementCounter = 0;
// var TakeInitialStudentDesktopIncrementCounter = 0;

var webCamAzureVideoURLs;
var desktopAzureVideoURLs;

var faceRecognitionTimoutIncremetor = 0;

var NewBase64ImageUploadsOf1MinString = '';
var NewBase64ImageUploadsOf1MinCounter = 0;
var NewBase64ImageUploadsIntervalObj;

var NewImageUploadBlobArray = [];


// var btnCloseExamSoftwareConfirmed = document.querySelector('#btnCloseExamSoftwareConfirmed');
// btnCloseExamSoftwareConfirmed.addEventListener("click", function (event) {
//     try {
//         console.log('stop window.streamReference = ' + window.streamReferenceForWebRTC);
//         if (window.streamReferenceForWebRTC) {
//             window.streamReferenceForWebRTC.getAudioTracks().forEach(function (track) {
//                 track.stop();
//             });
//             window.streamReferenceForWebRTC.getVideoTracks().forEach(function (track) {
//                 track.stop();
//             });
//             //window.streamReferenceForWebRTC = null;
//         }

//         let stream = video.srcObject;
//         let tracks = stream.getTracks();
//         tracks.forEach(function (track) {
//             track.stop();
//         });
//         video.srcObject = null;
//     }
//     catch (e) {
//         console.log('Error in stopping stream');
//     }

//     ipcRenderer.send('close:application', true);
// });



var r;
var GetExamKeysIntervalAttemptCounter = 0;

function StartRendererJsRemoteProctoring() {
    try {
        if (DisableForegroundingFromMainForDebugging === false) {
            ipcRenderer.send('SetRemoteProctoringExamStartedTrue:application', true);
        }
    }
    catch (e) {
        console.log(e);
    }
    formDataWebCamError = [];
    formDataDesktopInProgress = [];
    faceRecognitionTimoutIncremetor = 0;
    var GetExamKeysInterval = setInterval(function () {
        GetExamKeysIntervalAttemptCounter++;
        if (GetExamKeysIntervalAttemptCounter >= 5) {
            //$('#internetConnectionError').modal('show');
        }
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                clearInterval(GetExamKeysInterval);
                var config = JSON.parse(this.responseText).FirebaseKeys;
                //firebase.initializeApp(config);
                if (!firebase.apps.length) {
                    firebase.initializeApp(config);
                }
                r = firebase.database().ref('students/ids');
                localStorage.setItem("FirebaseConfig", JSON.stringify(config));

                var id = r.push();
                id.set({

                }, function (error) {
                    if (error) {
                        // The write failed...
                        console.log('Error in push: ' + error)
                    } else {
                        // Data saved successfully!
                        localStorage.setItem("StudentFirebaseIdKey", id.key);
                        studentFirebaseIdKey = localStorage.getItem("StudentFirebaseIdKey"); //used in renderer-Webrtc.js

                        // navigator.mediaDevices
                        //     .getUserMedia({
                        //         audio: true,
                        //         video: { frameRate: { max: 10 }, facingMode: "user" }
                        //     })
                        //     .then(localMediaStream => {
                        var localMediaStream = window.globalVideoStream;
                        video.srcObject = localMediaStream;
                        window.streamReferenceForWebRTC = localMediaStream; //This is on the global window object in order to enable the stop function later to disable camera and microphone access while closing the app
                        let mediaStreamTrack = localMediaStream.getVideoTracks()[0];
                        //imageCapture = new ImageCapture(mediaStreamTrack);

                        StartAndProcessDesktopStreamForrecording();
                        //StartWebRTC(localMediaStream, studentFirebaseIdKey);

                        waitForDesktopStreamToBeReady = setInterval(function () {
                            //Get IceServer Obj from API:
                            $.ajax(
                                {
                                    url: AssessmentConfig.GetIceServers,
                                    type: "POST",
                                    data: {
                                        StudentWebGuid: GlobalstudentWebGuid,
                                        StudentWebId: studentWebId
                                    },
                                    success: function (IceServerObj) {
                                        console.log('IceServers:' + IceServerObj);
                                        if (globalDesktopStream) {
                                            clearInterval(waitForDesktopStreamToBeReady);
                                            //waitForDesktopStreamToBeReady = null;
                                            WebRTC.StartWebRTC(localMediaStream, globalDesktopStream, studentFirebaseIdKey, IceServerObj, videoProctor);
                                        }
                                    },
                                    error: function (data) {
                                        console.log('Oops, something went wrong in establishing Ice Servers.');
                                    }
                                });
                        }, 5000);

                        ProcessWebcamStreamForRecording(localMediaStream);

                        setTimeout(function () {
                            if (GlobalIsRemoteProctoringExamStarted === true) {
                                TakeInitialStudentImage(video);
                            }
                        }, 1500);
                        var TakeInitialStudentImageInterval = setInterval(function () {
                            if (isExamEnded == false) {
                                if (GlobalIsRemoteProctoringExamStarted === true) {
                                    TakeInitialStudentImage(video);
                                }
                            }
                            else {
                                clearInterval(TakeInitialStudentImageInterval);
                            }
                        }, 10000);


                        //New Image uplaod:
                        NewBase64ImageUploadsIntervalObj = setInterval(function () {
                            // if (GlobalIsRemoteProctoringExamStarted === true) {
                            //     // var ImageBlob = GetNewImageBlob(video);
                            //     var canvasTemp = GetNewImageBlob(video);

                            //     canvasTemp.toBlob(function (ImageBlob) {
                            //         NewImageUploadBlobArray.push(ImageBlob);
                            //         console.log('NewImageUploadBlobArray length: ' + NewImageUploadBlobArray.length);

                            //         if (NewImageUploadBlobArray.length >= 12) {
                            //             var formDataImageBlobs = new FormData();
                            //             formDataImageBlobs.append('ImageBlob1', NewImageUploadBlobArray[0]);
                            //             formDataImageBlobs.append('ImageBlob2', NewImageUploadBlobArray[1]);
                            //             formDataImageBlobs.append('ImageBlob3', NewImageUploadBlobArray[2]);
                            //             formDataImageBlobs.append('ImageBlob4', NewImageUploadBlobArray[3]);
                            //             formDataImageBlobs.append('ImageBlob5', NewImageUploadBlobArray[4]);
                            //             formDataImageBlobs.append('ImageBlob6', NewImageUploadBlobArray[5]);
                            //             formDataImageBlobs.append('ImageBlob7', NewImageUploadBlobArray[6]);
                            //             formDataImageBlobs.append('ImageBlob8', NewImageUploadBlobArray[7]);
                            //             formDataImageBlobs.append('ImageBlob9', NewImageUploadBlobArray[8]);
                            //             formDataImageBlobs.append('ImageBlob10', NewImageUploadBlobArray[9]);
                            //             formDataImageBlobs.append('ImageBlob11', NewImageUploadBlobArray[10]);
                            //             formDataImageBlobs.append('ImageBlob12', NewImageUploadBlobArray[11]);

                            //             formDataImageBlobs.append('Id', GlobalId);
                            //             formDataImageBlobs.append('StudentWebGuid', GlobalstudentWebGuid);

                            //             $.ajax(
                            //                 {
                            //                     url: AssessmentConfig.UploadNewStudentWebcamImageBlobs,
                            //                     type: "POST",
                            //                     data: formDataImageBlobs,
                            //                     contentType: false,
                            //                     processData: false,
                            //                     success: function (resp) {
                            //                         console.log('Resp from UploadNewStudentWebcamImageBlobs: ' + resp)

                            //                     },
                            //                     error: function (xhr, textStatus, errorThrown) {
                            //                         console.log('Error in UploadNewStudentWebcamImageBlobs:' + textStatus);
                            //                     }
                            //                 });

                            //             //Clear the image blob array:
                            //             NewImageUploadBlobArray = [];

                            //         }
                            //     }, 'image/jpeg', 0.50); // JPEG at 50% quality
                            // }
                        }, 5000);

                        // }, e => {
                        //     console.log('Error', e);
                        // });
                    }
                });
            }
        };
        xhttp.open("GET", AssessmentConfig.GetAllExamKeys, false);
        try {
            xhttp.send();
        }
        catch (e) {
            console.log('Error in GetAllExamKeys.ashx: ' + e);
        }
    }, 10000);
}

function StopWebRTCRemoteProctoring() {
    $('#loading').fadeIn(400, "linear");
    $('.progressbar').css('display', 'block');
    $('.progressbar-value').css('width', '100%');

    var setIntervalResentDesktopVideos = setInterval(function () {
        console.log('In setIntervalResentDesktopVideos');
        RetrySendingWebCamVideoFailedAjax();
    }, 60000)

    var setTimeoutCheckIfUploadCompleted = setInterval(function () {
        if (formDataDesktopInProgress.length === 0) {
            $('#loading').fadeOut(400, "linear");
            $('.progressbar').css('display', 'none');
            clearInterval(setIntervalResentDesktopVideos);
            clearInterval(setTimeoutCheckIfUploadCompleted);

            GlobalIsSoftwareReadyToClose = true;
        }
    }, 3000);


    WebRTC.StopWebRTC();
    try {
        if (DisableForegroundingFromMainForDebugging === false) {
            ipcRenderer.send('SetRemoteProctoringExamStartedFalse:application', true);
        }

        if (NewBase64ImageUploadsIntervalObj) {
            clearInterval(NewBase64ImageUploadsIntervalObj);
        }
        NewBase64ImageUploadsOf1MinString = '';
        NewBase64ImageUploadsOf1MinCounter = 0;
    }
    catch (e) {
        console.log(e);
    }
}

var startTime2PersonDetected = new Date();
function RateLimiter2PersonDetected() {
    var TimeToWaitInSeconds = 10;
    var endTime = new Date();
    var timeDiff = endTime - startTime2PersonDetected; //in ms
    // strip the ms
    timeDiff /= 1000;
    // get seconds 
    var secondsElapsed = Math.round(timeDiff);
    //var minutesElapsed = Math.round(secondsElapsed / 60);
    if (secondsElapsed >= TimeToWaitInSeconds) {
        console.log("RateLimiter2PersonDetected returning true as secondsElapsed = " + secondsElapsed);
        startTime2PersonDetected = new Date();
        return true;
    }
    else {
        return false;
    }

}

function FlagMoreThan1PersonDetectedTensorflowJs() {
    if (RateLimiter2PersonDetected() === true) {
        noOfMoreThan1PersonFlags++;
        $.ajax(
            {
                url: AssessmentConfig.MoreThan1PersonDetectedAppendBlob,
                type: "POST",
                data: {
                    Id: GlobalId,
                    StudentWebGuid: GlobalstudentWebGuid,
                    StudentVideoIncrementCounter: TakeInitialStudentVideoIncrementCounter,
                    noOfMoreThan1PersonFlags: noOfMoreThan1PersonFlags
                },
                success: function (resp) {
                    console.log('resp from MoreThan1PersonDetectedAppendBlob.ashx: ' + resp);
                },
                error: function (data) {
                    console.log('Oops, something went wrong in MoreThan1PersonDetectedAppendBlob.ashx.');
                }
            });

        let referenceWebrtc = firebase.database().ref('webrtc/students/' + studentFirebaseIdKey);
        referenceWebrtc.update({
            'noOfMoreThan1PersonFlags': noOfMoreThan1PersonFlags,
            'StudentWebGuid': GlobalstudentWebGuid
        });

        // $("#CheatingAlertModal p").text('More than 1 person detected. This will be considered as cheating.');
        // $("#CheatingAlertModal").modal();
    }
}

var startTimeBookCellphoneDetected = new Date();
function RateLimiterBookCellphoneDetected() {
    var TimeToWaitInSeconds = 10;
    var endTime = new Date();
    var timeDiff = endTime - startTimeBookCellphoneDetected; //in ms
    // strip the ms
    timeDiff /= 1000;
    // get seconds 
    var secondsElapsed = Math.round(timeDiff);
    //var minutesElapsed = Math.round(secondsElapsed / 60);
    if (secondsElapsed >= TimeToWaitInSeconds) {
        console.log("RateLimiterBookCellphoneDetected returning true as secondsElapsed = " + secondsElapsed);
        startTimeBookCellphoneDetected = new Date();
        return true;
    }
    else {
        return false;
    }

}
function FlagBookCellPhoneDetectedTensorflowJs() {
    if (RateLimiterBookCellphoneDetected() === true) {
        noOfbookOrCellPhoneFlags++;
        $.ajax(
            {
                url: AssessmentConfig.BookCellPhoneDetectedAppendBlob,
                type: "POST",
                data: {
                    Id: GlobalId,
                    StudentWebGuid: GlobalstudentWebGuid,
                    StudentVideoIncrementCounter: TakeInitialStudentVideoIncrementCounter,
                    noOfbookOrCellPhoneFlags: noOfbookOrCellPhoneFlags
                },
                success: function (resp) {
                    console.log('resp from BookCellPhoneDetectedAppendBlob.ashx: ' + resp);
                },
                error: function (data) {
                    console.log('Oops, something went wrong in BookCellPhoneDetectedAppendBlob.ashx.');
                }
            });

        let referenceWebrtc = firebase.database().ref('webrtc/students/' + studentFirebaseIdKey);
        referenceWebrtc.update({
            'noOfbookOrCellPhoneFlags': noOfbookOrCellPhoneFlags,
            'StudentWebGuid': GlobalstudentWebGuid
        });

        // $("#CheatingAlertModal p").text('More than 1 person detected. This will be considered as cheating.');
        // $("#CheatingAlertModal").modal();
    }
}

module.exports = {
    'StartRendererJsRemoteProctoring': StartRendererJsRemoteProctoring,
    'StopWebRTCRemoteProctoring': StopWebRTCRemoteProctoring,
    'FlagMoreThan1PersonDetectedTensorflowJs': FlagMoreThan1PersonDetectedTensorflowJs,
    'FlagBookCellPhoneDetectedTensorflowJs': FlagBookCellPhoneDetectedTensorflowJs,
    'FlagNotLookingAtScreen': FlagNotLookingAtScreen,
    'FlagMoreThan1FaceDetected': FlagMoreThan1FaceDetected,
    'DoFaceRecoginition': DoFaceRecoginition,
    'FlagVoiceDetected': FlagVoiceDetected,
    'WindowsKeyPressDetected': WindowsKeyPressDetected,
    'WebcamDisconnectedDetected': WebcamDisconnectedDetected,
    'MicrophoneDisconnectedDetected': MicrophoneDisconnectedDetected
}




// processWebcamVideo(video, canvas, function (imageBase64Modified, isNoFaceDetected, noOfFacedDetectedMoreThan1) {
//     if (isExamEnded === false && GlobalIsRemoteProctoringExamStarted === true) { //Do this only if the exam ended button has not been clicked
//         if (imageBase64Modified) {
//             faceRecognitionTimoutIncremetor++;
//             //The following line limits the number of times the Face API is called
//             //if ((faceRecognitionTimoutIncremetor % 25 === 0 || faceRecognitionTimoutIncremetor <= 1)) {
//             if (faceRecognitionTimoutIncremetor <= 2 || RateLimiterDoFaceRecognition() === true) {
//                 faceRecognitionFailedFlags++;
//                 $.ajax(
//                     {
//                         url: AssessmentConfig.DoFaceRecoginition,
//                         type: "POST",
//                         data: {
//                             Id: GlobalId,
//                             StudentWebGuid: GlobalstudentWebGuid,
//                             StudentVideoIncrementCounter: TakeInitialStudentVideoIncrementCounter,
//                             StudentImageBase64: imageBase64Modified,
//                             faceRecognitionFailedFlags: faceRecognitionFailedFlags
//                         },
//                         success: function (resp) {
//                             if (resp.includes('Face not identical')) {

//                                 let referenceWebrtc = firebase.database().ref('webrtc/students/' + studentFirebaseIdKey);
//                                 referenceWebrtc.update({
//                                     'facRecognitionFailedFlags': faceRecognitionFailedFlags,
//                                     'StudentWebGuid': GlobalstudentWebGuid
//                                 });
//                             }
//                             console.log('resp from DoFaceRecoginition.ashx: ' + resp);
//                         },
//                         error: function (data) {
//                             console.log('Oops, something went wrong in DoFaceRecoginition.ashx.');
//                         }
//                     });
//                 //ipcRenderer.send('image:recognition', imageBase64Modified);
//             }
//         }
//         // else if (isNoFaceDetected) {
//         //     faceDetecetionFailedFlags++;
//         //     $.ajax(
//         //         {
//         //             url: AssessmentConfig.NoFaceDetectedAppendBlob,
//         //             type: "POST",
//         //             data: {
//         //                 Id: GlobalId,
//         //                 StudentWebGuid: GlobalstudentWebGuid,
//         //                 StudentVideoIncrementCounter: TakeInitialStudentVideoIncrementCounter,
//         //                 faceDetecetionFailedFlags: faceDetecetionFailedFlags
//         //             },
//         //             success: function (resp) {
//         //                 console.log('resp from NoFaceDetectedAppendBlob.ashx: ' + resp);
//         //             },
//         //             error: function (data) {
//         //                 console.log('Oops, something went wrong in NoFaceDetectedAppendBlob.ashx.');
//         //             }
//         //         });

//         //     let referenceWebrtc = firebase.database().ref('webrtc/students/' + studentFirebaseIdKey);
//         //     referenceWebrtc.update({
//         //         'faceDetecetionFailedFlags': faceDetecetionFailedFlags,
//         //         'StudentWebGuid': GlobalstudentWebGuid
//         //     });
//         //     // let referenceExams = firebase.database().ref('exams/students/' + studentFirebaseIdKey);
//         //     // referenceExams.update({
//         //     //     'faceDetecetionFailedFlags': faceDetecetionFailedFlags,
//         //     //     'StudentWebGuid': GlobalstudentWebGuid
//         //     // });

//         //     //Commented on 16/06/2020:
//         //     // $("#CheatingAlertModal p").text('Please look into the screen.');
//         //     // $("#CheatingAlertModal").modal();
//         // }
//         // else if (noOfFacedDetectedMoreThan1) {
//         //     noOfFacesDetectedMorethan1Flags++;
//         //     $.ajax(
//         //         {
//         //             url: AssessmentConfig.MoreThan1FaceDetectedAppendBlob,
//         //             type: "POST",
//         //             data: {
//         //                 Id: GlobalId,
//         //                 StudentWebGuid: GlobalstudentWebGuid,
//         //                 StudentVideoIncrementCounter: TakeInitialStudentVideoIncrementCounter,
//         //                 noOfFacesDetectedMorethan1Flags: noOfFacesDetectedMorethan1Flags
//         //             },
//         //             success: function (resp) {
//         //                 console.log('resp from MoreThan1FaceDetectedAppendBlob.ashx: ' + resp);
//         //             },
//         //             error: function (data) {
//         //                 console.log('Oops, something went wrong in MoreThan1FaceDetectedAppendBlob.ashx.');
//         //             }
//         //         });

//         //     let referenceWebrtc = firebase.database().ref('webrtc/students/' + studentFirebaseIdKey);
//         //     referenceWebrtc.update({
//         //         'noOfFacesDetectedMorethan1Flags': noOfFacesDetectedMorethan1Flags
//         //     });
//         //     // let referenceExams = firebase.database().ref('exams/students/' + studentFirebaseIdKey);
//         //     // referenceExams.update({
//         //     //     'noOfFacesDetectedMorethan1Flags': noOfFacesDetectedMorethan1Flags
//         //     // });
//         //     $("#CheatingAlertModal p").text(noOfFacedDetectedMoreThan1 + ' faces detected! This will be flagged as cheating.');
//         //     $("#CheatingAlertModal").modal();
//         // }
//     }
// });

function FlagNotLookingAtScreen() {
    faceDetecetionFailedFlags++;
    $.ajax(
        {
            url: AssessmentConfig.NoFaceDetectedAppendBlob,
            type: "POST",
            data: {
                Id: GlobalId,
                StudentWebGuid: GlobalstudentWebGuid,
                StudentVideoIncrementCounter: TakeInitialStudentVideoIncrementCounter,
                faceDetecetionFailedFlags: faceDetecetionFailedFlags
            },
            success: function (resp) {
                console.log('resp from NoFaceDetectedAppendBlob.ashx: ' + resp);
            },
            error: function (data) {
                console.log('Oops, something went wrong in NoFaceDetectedAppendBlob.ashx.');
            }
        });

    let referenceWebrtc = firebase.database().ref('webrtc/students/' + studentFirebaseIdKey);
    referenceWebrtc.update({
        'faceDetecetionFailedFlags': faceDetecetionFailedFlags,
        'StudentWebGuid': GlobalstudentWebGuid
    });
}

function FlagMoreThan1FaceDetected() {
    noOfFacesDetectedMorethan1Flags++;
    $.ajax(
        {
            url: AssessmentConfig.MoreThan1FaceDetectedAppendBlob,
            type: "POST",
            data: {
                Id: GlobalId,
                StudentWebGuid: GlobalstudentWebGuid,
                StudentVideoIncrementCounter: TakeInitialStudentVideoIncrementCounter,
                noOfFacesDetectedMorethan1Flags: noOfFacesDetectedMorethan1Flags
            },
            success: function (resp) {
                console.log('resp from MoreThan1FaceDetectedAppendBlob.ashx: ' + resp);
            },
            error: function (data) {
                console.log('Oops, something went wrong in MoreThan1FaceDetectedAppendBlob.ashx.');
            }
        });

    let referenceWebrtc = firebase.database().ref('webrtc/students/' + studentFirebaseIdKey);
    referenceWebrtc.update({
        'noOfFacesDetectedMorethan1Flags': noOfFacesDetectedMorethan1Flags
    });
}
var startVoiceDetected = new Date();
function RateLimiterVoiceDetected() {
    var TimeToWaitInSeconds = 11;
    var endTime = new Date();
    var timeDiff = endTime - startVoiceDetected; //in ms
    // strip the ms
    timeDiff /= 1000;
    // get seconds 
    var secondsElapsed = Math.round(timeDiff);
    //var minutesElapsed = Math.round(secondsElapsed / 60);
    if (secondsElapsed >= TimeToWaitInSeconds) {
        console.log("RateLimiterVoiceDetected returning true as secondsElapsed = " + secondsElapsed);
        startVoiceDetected = new Date();
        return true;
    }
    else {
        return false;
    }

}
function FlagVoiceDetected() {
    if (RateLimiterVoiceDetected() === true) {
        voiceDetectedFlags++;
        $.ajax(
            {
                url: AssessmentConfig.VoiceDetectedAppendBlob,
                type: "POST",
                data: {
                    Id: GlobalId,
                    StudentWebGuid: GlobalstudentWebGuid,
                    StudentVideoIncrementCounter: TakeInitialStudentVideoIncrementCounter,
                    voiceDetectedFlags: voiceDetectedFlags
                },
                success: function (resp) {
                    console.log('resp from VoiceDetectedAppendBlob.ashx: ' + resp);
                },
                error: function (data) {
                    console.log('Oops, something went wrong in VoiceDetectedAppendBlob.ashx.');
                }
            });

        let referenceWebrtc = firebase.database().ref('webrtc/students/' + studentFirebaseIdKey);
        referenceWebrtc.update({
            'voiceDetectedFlags': voiceDetectedFlags
        });
    }
}

function WindowsKeyPressDetected() {
    noOfWindowsKeyPressedFlags++;
    $.ajax(
        {
            url: AssessmentConfig.WindowsKeyPressDetectedAppendBlob,
            type: "POST",
            data: {
                StudentWebId: GlobalId,
                StudentWebGuid: GlobalstudentWebGuid,
                StudentVideoIncrementCounter: TakeInitialStudentVideoIncrementCounter,
                noOfWindowsKeyPressedFlags: noOfWindowsKeyPressedFlags
            },
            success: function (resp) {
                console.log('resp from WindowsKeyPressDetectedAppendBlob.ashx: ' + resp);
            },
            error: function (data) {
                console.log('Oops, something went wrong in WindowsKeyPressDetectedAppendBlob.ashx.');
            }
        });

    let referenceWebrtc = firebase.database().ref('webrtc/students/' + studentFirebaseIdKey);
    referenceWebrtc.update({
        noOfWindowsKeyPressedFlags: noOfWindowsKeyPressedFlags
    });
}

function WebcamDisconnectedDetected() {
    noOfWebcamDisconnectedFlags++;
    $.ajax(
        {
            url: AssessmentConfig.WebcamDisconnectedDetectedAppendBlob,
            type: "POST",
            data: {
                StudentWebId: GlobalId,
                StudentWebGuid: GlobalstudentWebGuid,
                StudentVideoIncrementCounter: TakeInitialStudentVideoIncrementCounter,
                noOfWebcamDisconnectedFlags: noOfWebcamDisconnectedFlags
            },
            success: function (resp) {
                console.log('resp from WebcamDisconnectedDetectedAppendBlob.ashx: ' + resp);
            },
            error: function (data) {
                console.log('Oops, something went wrong in WebcamDisconnectedDetectedAppendBlob.ashx.');
            }
        });

    let referenceWebrtc = firebase.database().ref('webrtc/students/' + studentFirebaseIdKey);
    referenceWebrtc.update({
        noOfWebcamDisconnectedFlags: noOfWebcamDisconnectedFlags
    });
}

function MicrophoneDisconnectedDetected() {
    noOfMicrophoneDisconnectedFlags++;
    $.ajax(
        {
            url: AssessmentConfig.MicrophoneDisconnectedDetectedAppendBlob,
            type: "POST",
            data: {
                StudentWebId: GlobalId,
                StudentWebGuid: GlobalstudentWebGuid,
                StudentVideoIncrementCounter: TakeInitialStudentVideoIncrementCounter,
                noOfMicrophoneDisconnectedFlags: noOfMicrophoneDisconnectedFlags
            },
            success: function (resp) {
                console.log('resp from MicrophoneDisconnectedDetectedAppendBlob.ashx: ' + resp);
            },
            error: function (data) {
                console.log('Oops, something went wrong in MicrophoneDisconnectedDetectedAppendBlob.ashx.');
            }
        });

    let referenceWebrtc = firebase.database().ref('webrtc/students/' + studentFirebaseIdKey);
    referenceWebrtc.update({
        noOfMicrophoneDisconnectedFlags: noOfMicrophoneDisconnectedFlags
    });
}


function TakeStudentImageBase64ForFaceRecognition(video) {
    let canvasTemp = document.createElement('canvas');
    let contextTemp = canvasTemp.getContext('2d');

    //let ratio = FaceRecognitionVideo.videoWidth / FaceRecognitionVideo.videoHeight;
    let w = FaceRecognitionVideo.videoWidth;
    let h = FaceRecognitionVideo.videoHeight;
    canvasTemp.width = w;
    canvasTemp.height = h;

    //context4.fillRect(0,0, w, h);
    contextTemp.drawImage(FaceRecognitionVideo, 0, 0, w, h);

    var imageBase64 = canvasTemp.toDataURL();
    imageBase64 = imageBase64.replace(/^data:image\/(png|jpg);base64,/, "");
    return imageBase64;
}



var startTime = new Date();
function RateLimiterDoFaceRecognition() {
    var TimeToWaitInMinutes = 60;
    var endTime = new Date();
    var timeDiff = endTime - startTime; //in ms
    // strip the ms
    timeDiff /= 1000;
    // get seconds 
    var secondsElapsed = Math.round(timeDiff);
    var minutesElapsed = Math.round(secondsElapsed / 60);
    if (minutesElapsed >= TimeToWaitInMinutes) {
        console.log("RateLiniterDoFaceRecognition returning true as minutesElapsed = " + minutesElapsed);
        startTime = new Date();
        return true;
    }
    else {
        return false;
    }

}

// navigator.mediaDevices
//     .getUserMedia({
//         audio: true,
//         video: { facingMode: "user" }
//     })
//     .then(localMediaStreamFaceRecognition => {
//         FaceRecognitionVideo.srcObject = localMediaStreamFaceRecognition;
//     })
FaceRecognitionVideo.srcObject = window.globalVideoStream;

function DoFaceRecoginition() {
    faceRecognitionTimoutIncremetor++;
    if (faceRecognitionTimoutIncremetor <= 10 || RateLimiterDoFaceRecognition() === true) {
        faceRecognitionFailedFlags++;
        var imageBase64Modified = TakeStudentImageBase64ForFaceRecognition(video);
        $.ajax(
            {
                url: AssessmentConfig.DoFaceRecoginition,
                type: "POST",
                data: {
                    Id: GlobalId,
                    StudentWebGuid: GlobalstudentWebGuid,
                    StudentVideoIncrementCounter: TakeInitialStudentVideoIncrementCounter,
                    StudentImageBase64: imageBase64Modified,
                    faceRecognitionFailedFlags: faceRecognitionFailedFlags
                },
                success: function (resp) {
                    console.log('resp from DoFaceRecoginition.ashx: ' + resp);
                    if (resp.includes('Face not identical')) {
                        let referenceWebrtc = firebase.database().ref('webrtc/students/' + studentFirebaseIdKey);
                        referenceWebrtc.update({
                            'facRecognitionFailedFlags': faceRecognitionFailedFlags,
                            'StudentWebGuid': GlobalstudentWebGuid
                        });
                        $.NotificationApp.send("Different Person Detected!", "Face recognition detected a different person appearing for the exam.",
                            'top-right', '#3b98b5', 'error', 7000, 1, 'plain');
                    }
                    else if (resp.includes('Error: responseAzureFaceIdClassBodyList count <= 0')) {
                        $.NotificationApp.send("Do not cover your face!", "Do not cover your face with your hand, mask or any other object. This will be considered as cheating.",
                            'top-right', '#3b98b5', 'error', 7000, 1, 'plain');
                    }
                    else if (resp.includes('Face identical')) {
                        //Do nothing, all good
                    }
                },
                error: function (data) {
                    console.log('Oops, something went wrong in DoFaceRecoginition.ashx.');
                    //return 'Error in calling the Face API from backend.'
                }
            });
    }
}



// Prevent Closing when exam is running
window.onbeforeunload = function (e) {
    //Allow minimising GST in TALLY exam:
    // if(ExamName !== "GST IN TALLY"){
    //     if (isExamEnded == false) {
    //         return true;
    //     }
    // }
};
// if(ExamName === "GST IN TALLY"){
//     $('#btnMinimiseExam').css('display', 'block');
// }
$('#btnMinimiseExam').click(function () {
    remote.getCurrentWindow().minimize();
});
//RendererExams.LoadExamStart(studentFirebaseIdKey, studentWebGuid, studentWebId);


// navigator.getUserMedia({ video: { width: 352, height: 240 }, audio: false }, (localMediaStream) => {
// navigator.getUserMedia({ video: true, audio: true }, (localMediaStream) => {


function TakeInitialStudentImage(video) {
    let canvasTemp = document.createElement('canvas');
    let contextTemp = canvasTemp.getContext('2d');

    let ratio = video.videoWidth / video.videoHeight;
    //Commented the following for image quality and size reduction
    // let w = video.videoWidth - 100;
    // let w = video.videoWidth - 400;
    let w = video.videoWidth - ((video.videoWidth * 80) / 100);
    let h = parseInt(w / ratio, 10);
    canvasTemp.width = w;
    canvasTemp.height = h;

    //context4.fillRect(0,0, w, h);
    contextTemp.drawImage(video, 0, 0, w, h);


    ////////////////Commented START to try uploading image as BLOB instead of Base64////////////////////////////////

    //Commented the following for image quality and size reduction
    // //var imageBase64 = canvasTemp.toDataURL();
    // var imageBase64 = canvasTemp.toDataURL('image/png', 0.1);
    // imageBase64 = imageBase64.replace(/^data:image\/(png|jpg);base64,/, "");
    // //The following was commented by Neville on 17/09/2020 to test new base 64 image upload process:
    // $.ajax(
    //     {
    //         url: AssessmentConfig.UploadStudentWebcamImage,
    //         type: "POST",
    //         data: {
    //             StudentWebGuid: GlobalstudentWebGuid,
    //             Id: GlobalId,
    //             StudentImageBase64: imageBase64,
    //             StudentImageCounter: ++TakeInitialStudentImageIncrementCounter
    //         },
    //         success: function (ImageURL) {
    //             //console.log('Student Image URL: ' + ImageURL)
    //             imageBase64GlobalFirebaseDisplay = imageBase64;
    //             let reference = firebase.database().ref('webrtc/students/' + studentFirebaseIdKey);
    //             reference.update({
    //                 //'studentImgBase64': imageBase64,
    //                 'studentImgURL': ImageURL,
    //                 //'timeRemaining': timeLeftInExamFirebaseDisplay
    //             });
    //         },
    //         error: function (data) {
    //             console.log('Oops, something went wrong uploading periodic images.');
    //         }
    //     });

    ////////////////Commented END to try uploading image as BLOB instead of Base64////////////////////////////////

    canvasTemp.toBlob(function (ImageBlob) {
        var formDataImageBlobs = new FormData();
        formDataImageBlobs.append('ImageBlob1', ImageBlob);
        formDataImageBlobs.append('StudentWebGuid', GlobalstudentWebGuid);
        formDataImageBlobs.append('Id', GlobalId);
        formDataImageBlobs.append('StudentImageCounter', ++TakeInitialStudentImageIncrementCounter);

        $.ajax(
            {
                url: AssessmentConfig.UploadNewStudentWebcamImageBlobsSingle,
                type: "POST",
                data: formDataImageBlobs,
                contentType: false,
                processData: false,
                success: function (ImageURL) {
                    let reference = firebase.database().ref('webrtc/students/' + studentFirebaseIdKey);
                    reference.update({
                        //'studentImgBase64': imageBase64,
                        'studentImgURL': ImageURL,
                        //'timeRemaining': timeLeftInExamFirebaseDisplay
                    });

                },
                error: function (xhr, textStatus, errorThrown) {
                    console.log('Error in UploadNewStudentWebcamImageBlobsSingle:' + textStatus);
                }
            });
    }, 'image/jpeg', 0.95); //  quality
}

function ProcessWebcamStreamForRecording(webcamStream) {
    //Record the camera stream with audio:
    mediaRecorderWebcam = new MediaStreamRecorder(webcamStream);
    // mediaRecorder.mimeType = 'video/mp4';
    mediaRecorderWebcam.mimeType = 'video/webm\;codecs=vp9';
    //mediaRecorder.mimeType = 'video/webm';
    mediaRecorderWebcam.ondataavailable = function (blob) {
        //Send to main:
        //GetBufferFromBlobAndSendToMain(blob, 'WebCam');
        var formData = new FormData();
        formData.append('file', blob);
        formData.append('Id', GlobalId);
        formData.append('StudentWebGuid', GlobalstudentWebGuid);
        // formData.append('StudentAadharCardNo', studentAadharCardNo);
        // formData.append('StudentRasciId', studentRasciId);
        formData.append('StudentVideoIncrementCounter', ++TakeInitialStudentVideoIncrementCounter);

        //The following line was commented as there is no need to upload the webcam video
        //UploadStudentWebCamVideoAjax(formData);

        if (isExamEnded == true) {
            isWebCamRecordingToBeStopped = true;
            mediaRecorderWebcam.stop();
        }
    };
    mediaRecorderWebcam.start(10000);

    // var options = { mimeType: 'video/webm; codecs=vp9' };
    // mediaRecorderWebcam = new MediaRecorder(webcamStream, options);
    // mediaRecorderWebcam.ondataavailable = e => {
    //     if (event.data.size > 0) {
    //         recordedChunksWebcam.push(event.data);
    //         var tempChunk = [];
    //         tempChunk.push(event.data);
    //         var blobWebCam = new Blob(tempChunk, {
    //             // type: 'video/mp4'
    //             type: 'video/webm'
    //         });

    //     }
    // };
    // mediaRecorderWebcam.start(5000);
}
function UploadStudentWebCamVideoAjax(formData) {
    $.ajax(
        {
            url: AssessmentConfig.UploadStudentWebCamVideo,
            type: "POST",
            data: formData,
            contentType: false,
            processData: false,
            success: function (VideoURL) {
                console.log('Student Video URL: ' + VideoURL)
                if (webCamAzureVideoURLs) {
                    webCamAzureVideoURLs += "," + VideoURL;
                }
                else {
                    webCamAzureVideoURLs = VideoURL;
                }
                let referenceWebrtc = firebase.database().ref('webrtc/students/' + studentFirebaseIdKey);
                referenceWebrtc.update({
                    'webCamAzureVideoURLs': webCamAzureVideoURLs
                });
                // if (VideoURL.includes("Error")) { //If Error, add formData to array if it does not exist
                //     if (formDataWebCamError.indexOf(formData) === -1) {
                //         formDataWebCamError.push(formData);
                //     }
                // }
                // else if (formDataWebCamError.indexOf(formData) !== -1) { //Success, remove formData from error array if exists
                //     formDataWebCamError.splice(formDataWebCamError.indexOf(formData), 1);
                // }
            },
            error: function (data) {
                console.log('Oops, something went wrong uploading periodic videos. Data: ' + JSON.stringify(data));
                // if (formDataWebCamError.indexOf(formData) === -1) {
                //     formDataWebCamError.push(formData);
                // }
            }
        });
}
function StartAndProcessDesktopStreamForrecording() {
    desktopCapturer.getSources({ types: ['screen'] }).then(async sources => {
        for (const source of sources) {
            if (source.name === 'Entire Screen' || source.name === 'Entire screen') {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        audio: false,
                        video: {
                            mandatory: {
                                chromeMediaSource: 'desktop',
                                chromeMediaSourceId: source.id,
                                maxWidth: window.screen.width / 1.5,
                                maxFrameRate: 2
                            }
                        }
                    })
                    handleStream(stream)
                } catch (e) {
                    handleError(e)
                }
                return
            }
        }
    });
    function handleStream(localMediaStream) {
        globalDesktopStream = localMediaStream;
        //var mediaRecorderDesktop = new MediaStreamRecorder(localMediaStream);

        //Merge the audio and video stream:
        //get mic stream
        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
            audio_stream = stream;

            let master_stream = new MediaStream(localMediaStream);
            master_stream.addTrack(audio_stream.getTracks()[0]);

            mediaRecorderDesktop = new MediaStreamRecorder(master_stream);
            //mediaRecorder.mimeType = 'video/mp4';
            mediaRecorderDesktop.mimeType = 'video/webm\;codecs=vp9';
            mediaRecorderDesktop.ondataavailable = function (blob) {
                //Send to main:
                var formData = new FormData();
                formData.append('file', blob);
                formData.append('Id', GlobalId);
                formData.append('StudentWebGuid', GlobalstudentWebGuid);
                // formData.append('StudentAadharCardNo', studentAadharCardNo);
                // formData.append('StudentRasciId', studentRasciId);
                formData.append('StudentDesktopVideoIncrementCounter', ++TakeInitialStudentDesktopIncrementCounter);

                if (GlobalIsRemoteProctoringExamStarted === true) {
                    UploadStudentDesktopVideoAjax(formData, false);// false bec it is not a retry attempt
                }
            };
            mediaRecorderDesktop.start(10000);
            // var options = { mimeType: 'video/webm; codecs=vp9' };
            // //var options = { mimeType: 'video/webm' };
            // mediaRecorderDesktop = new MediaRecorder(localMediaStream, options);
            // mediaRecorderDesktop.ondataavailable = e => {
            //     if (event.data.size > 0) {
            //         recordedChunksDesktop.push(event.data);
            //     }
            // };
            // mediaRecorderDesktop.start(5000);
        });
    }

    function handleError(e) {
        console.log('Error in desktop capturer: ' + e);
    }



    // desktopCapturer.getSources({ types: ['window', 'screen'] }, (error, sources) => {
    //     if (error) throw error
    //     console.log(sources);
    //     for (let i = 0; i < sources.length; ++i) {
    //         if (sources[i].name === 'Entire Screen' || sources[i].name === 'Entire screen' || sources[i].name.toLowerCase() === 'entire screen') {
    //             navigator.mediaDevices.getUserMedia({
    //                 audio: false,
    //                 video: {
    //                     mandatory: {
    //                         chromeMediaSource: 'desktop',
    //                         chromeMediaSourceId: sources[i].id,
    //                         maxWidth: window.screen.width / 1.5,
    //                         maxFrameRate: 3
    //                     }
    //                 }
    //             })
    //                 .then((localMediaStream) => {
    //                     globalDesktopStream = localMediaStream;
    //                     //var mediaRecorderDesktop = new MediaStreamRecorder(localMediaStream);

    //                     //Merge the audio and video stream:
    //                     //get mic stream
    //                     navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    //                         audio_stream = stream;

    //                         let master_stream = new MediaStream(localMediaStream);
    //                         master_stream.addTrack(audio_stream.getTracks()[0]);

    //                         mediaRecorderDesktop = new MediaStreamRecorder(master_stream);
    //                         //mediaRecorder.mimeType = 'video/mp4';
    //                         mediaRecorderDesktop.mimeType = 'video/webm\;codecs=vp9';
    //                         mediaRecorderDesktop.ondataavailable = function (blob) {
    //                             //Send to main:
    //                             //GetBufferFromBlobAndSendToMain(blob, 'Desktop');
    //                             var formData = new FormData();
    //                             formData.append('file', blob);
    //                             formData.append('Id', GlobalId);
    //                             formData.append('StudentWebGuid', GlobalstudentWebGuid);
    //                             // formData.append('StudentAadharCardNo', studentAadharCardNo);
    //                             // formData.append('StudentRasciId', studentRasciId);
    //                             formData.append('StudentDesktopVideoIncrementCounter', ++TakeInitialStudentDesktopIncrementCounter);

    //                             if (GlobalIsRemoteProctoringExamStarted === true) {
    //                                 UploadStudentDesktopVideoAjax(formData, false);// false bec it is not a retry attempt
    //                             }
    //                         };
    //                         mediaRecorderDesktop.start(10000);
    //                         // var options = { mimeType: 'video/webm; codecs=vp9' };
    //                         // //var options = { mimeType: 'video/webm' };
    //                         // mediaRecorderDesktop = new MediaRecorder(localMediaStream, options);
    //                         // mediaRecorderDesktop.ondataavailable = e => {
    //                         //     if (event.data.size > 0) {
    //                         //         recordedChunksDesktop.push(event.data);
    //                         //     }
    //                         // };
    //                         // mediaRecorderDesktop.start(5000);
    //                     });
    //                 })
    //                 .catch((e) => {
    //                     console.log('Error in StartAndProcessDesktopStreamForrecording: ' + e)
    //                 })
    //             //return
    //         }
    //     }
    // })
}

function UploadStudentDesktopVideoAjax(formData, isPeriodicRetryAttempt) {
    //If the Ajax request is still pending, not yet market as an error, don't resend the .ashx request... wait for it to complete
    // if (isPeriodicRetryAttempt !== undefined && isPeriodicRetryAttempt == true && formDataWebCamError.indexOf(formData) === -1) {
    //     return false;
    // }
    var PercentUploaded = (100 - (Math.ceil(formDataWebCamError.length / TakeInitialStudentDesktopIncrementCounter * 100)));
    $('#spnPercentUploaded').text(PercentUploaded + "% uploaded. Do not close the software.");

    // if (isPeriodicRetryAttempt === true) {
    //     if (formDataDesktopErrorFailedOnRetry.indexOf(formData) !== -1) {
    //         formDataDesktopErrorFailedOnRetry.splice(formDataDesktopErrorFailedOnRetry.indexOf(formData), 1);
    //     }
    // }
    if (formDataDesktopInProgress.indexOf(formData) !== -1) {
        console.log('Request in process');
        return false;
    }
    else {
        formDataDesktopInProgress.push(formData);
    }

    $.ajax(
        {
            url: AssessmentConfig.UploadStudentDesktopVideo,
            type: "POST",
            data: formData,
            contentType: false,
            processData: false,
            success: function (VideoURL) {
                console.log('Student Desktop Video URL: ' + VideoURL)
                if (desktopAzureVideoURLs) {
                    desktopAzureVideoURLs += "," + VideoURL;
                }
                else {
                    desktopAzureVideoURLs = VideoURL;
                }
                // let referenceWebrtc = firebase.database().ref('webrtc/students/' + studentFirebaseIdKey);
                // referenceWebrtc.update({
                //     'desktopAzureVideoURLs': desktopAzureVideoURLs
                // });
                if (VideoURL.includes("Error")) { //If Error, add formData to array if it does not exist
                    if (formDataWebCamError.indexOf(formData) === -1) {
                        formDataWebCamError.push(formData);
                    }
                }
                else if (formDataWebCamError.indexOf(formData) !== -1) { //Success, remove formData from error array if exists
                    formDataWebCamError.splice(formDataWebCamError.indexOf(formData), 1);
                }
                //Remove the xhr request from the in progress array:
                if (formDataDesktopInProgress.indexOf(formData) !== -1) {
                    formDataDesktopInProgress.splice(formDataDesktopInProgress.indexOf(formData), 1);
                }
                var PercentUploaded = (100 - (Math.ceil(formDataWebCamError.length / TakeInitialStudentDesktopIncrementCounter * 100)));
                $('#spnPercentUploaded').text(PercentUploaded + "% uploaded. Do not close the software.");

            },
            error: function (xhr, textStatus, errorThrown) {
                console.log('Error in UploadStudentDesktopVideo:' + textStatus);
                if (formDataWebCamError.indexOf(formData) === -1) {
                    formDataWebCamError.push(formData);
                }
                // if (isPeriodicRetryAttempt === true) {
                //     if (formDataDesktopErrorFailedOnRetry.indexOf(formData) === -1) {
                //         formDataDesktopErrorFailedOnRetry.push(formData);
                //     }
                // }

                //Remove the xhr request from the in progress array:
                if (formDataDesktopInProgress.indexOf(formData) !== -1) {
                    formDataDesktopInProgress.splice(formDataDesktopInProgress.indexOf(formData), 1);
                }

                //Ideally, the following will not come into play:
                var PercentUploaded = (100 - (Math.ceil(formDataWebCamError.length / TakeInitialStudentDesktopIncrementCounter * 100)));
                $('#spnPercentUploaded').text(PercentUploaded + "% uploaded. Do not close the software.");

            }
        });
}

// function GetBufferFromBlobAndSendToMain(blob, device) {
//     let reader = new FileReader()
//     reader.onload = function () {
//         if (reader.readyState == 2) {
//             var buffer = new Buffer(reader.result)
//             if (device === 'WebCam') {
//                 ipcRenderer.send('video:webcam', buffer);
//             }
//             else if (device === "Desktop") {
//                 ipcRenderer.send('video:desktop', buffer);
//             }
//             //return buffer;
//             //console.log(`Saving ${JSON.stringify({ fileName, size: blob.size })}`)
//         }
//     }
//     reader.readAsArrayBuffer(blob);
// }

// ipcRenderer.on('Face:Unmatch', (event, result) => {
//     $.ajax(
//         {
//             url: "https://rasciexamserver.azurewebsites.net/API/CheatDetect/MoreThan1FaceDetectedAppendBlob.ashx",
//             type: "POST",
//             data: {
//                 StudentWebGuid: studentWebGuid,
//                 StudentAadharCardNo: studentAadharCardNo,
//                 StudentRasciId: studentRasciId,
//                 StudentVideoIncrementCounter: TakeInitialStudentVideoIncrementCounter
//             },
//             success: function (resp) {
//                 console.log('resp from MoreThan1FaceDetectedAppendBlob.ashx: ' + resp);
//             },
//             error: function (data) {
//                 console.log('Oops, something went wrong in MoreThan1FaceDetectedAppendBlob.ashx.');
//             }
//         });
//     faceRecognitionFailedFlags++;
//     let referenceWebrtc = firebase.database().ref('webrtc/students/' + studentFirebaseIdKey);
//     referenceWebrtc.update({
//         'faceRecognitionFailedFlags': faceRecognitionFailedFlags
//     });
//     let referenceExams = firebase.database().ref('exams/students/' + studentFirebaseIdKey);
//     referenceExams.update({
//         'faceRecognitionFailedFlags': faceRecognitionFailedFlags
//     });
//     $("#CheatingAlertModal p").text('Your face did not match as the student! Your exam will be suspended on account of cheating.');
//     $("#CheatingAlertModal").modal();
// });



// ipcRenderer.on('VideoSaveURL:desktop', (event, result) => {
//     console.log('In VideoSaveURL:desktop');
//     let reference = firebase.database().ref('exams/students/' + studentFirebaseIdKey);
//     reference.update({
//         'DesktopVideoURL': result
//     }, function () {
//         console.log('Firebase updated desktop with video URL!!!');
//         isDesktopVideoUploaded = true;
//         if (isDesktopVideoUploaded && isWebCamVideoUploaded) {
//             //alert('In VideoSaveURL desktop, both video UPLOADED!!');
//             location.href = "login.html";
//         }
//     });
// });

// ipcRenderer.on('VideoSaveURL:webcam', (event, result) => {
//     console.log('In VideoSaveURL:webcam');
//     let reference = firebase.database().ref('exams/students/' + studentFirebaseIdKey);
//     reference.update({
//         'WebCamVideoURL': result
//     }, function () {
//         console.log('Firebase updated webcam with video URL!!!');
//         isWebCamVideoUploaded = true;
//         if (isDesktopVideoUploaded && isWebCamVideoUploaded) {
//             //alert('In VideoSaveURL webcam, both video UPLOADED!!');
//             location.href = "login.html";
//         }
//     });
// });

function RetrySendingWebCamVideoFailedAjax() {
    //var isRetryAttemptedOnce = false;
    //var retryWebCamVideoAjax = setInterval(function () {
    console.log('In RetrySendingWebCamVideoFailedAjax, formDataWebCamError.length = ' + formDataWebCamError.length);
    //if (isRetryAttemptedOnce === false) {
    if (formDataWebCamError.length > 0) {
        var UploadPercentText = $('#spnPercentUploaded').text();
        $('#spnPercentUploaded').text("RETRYING... " + UploadPercentText);

        formDataWebCamError.forEach(function (formData) {
            //UploadStudentWebCamVideoAjax(formData);
            UploadStudentDesktopVideoAjax(formData, true); //true because it is a retry attempt
        });
    }
    // else {
    //     clearInterval(retryWebCamVideoAjax);
    //     console.log('Cleared interval retryWebCamVideoAjax');
    // }
    //}
    // else {
    //     //Do failed Rety:
    //     if (isPeriodicRetryAttempt.length > 0) {
    //         var UploadPercentText = $('#spnPercentUploaded').text();
    //         $('#spnPercentUploaded').text("RETRYING... " + UploadPercentText);

    //         isPeriodicRetryAttempt.forEach(function (formData) {
    //             //UploadStudentWebCamVideoAjax(formData);
    //             UploadStudentDesktopVideoAjax(formData, true); //true because it is a retry attempt
    //         });
    //     }
    //     else {
    //         clearInterval(retryWebCamVideoAjax);
    //         console.log('Cleared interval retryWebCamVideoAjax');
    //     }
    // }
    //}, 15000);
}

btnEndExamConfirmed.addEventListener("click", function () {
    isExamEnded = true;
    $('#loading').fadeIn(400, "linear");
    $('.progressbar').css('display', 'block');
    $('.progressbar-value').css('width', '100%');

    mediaRecorderDesktop.stop();


    RetrySendingWebCamVideoFailedAjax();

    // var blobDesktop = new Blob(recordedChunksDesktop, {
    //     // type: 'video/mp4'
    //     type: 'video/webm'
    // });
    // GetBufferFromBlobAndSendToMain(blobDesktop, 'Desktop');
    // var blobWebCam = new Blob(recordedChunksWebcam, {
    //     // type: 'video/mp4'
    //     type: 'video/webm'
    // });
    // GetBufferFromBlobAndSendToMain(blobWebCam, 'WebCam');
    // $.ajax(
    //     {
    //         url: "https://rasciexamserver.azurewebsites.net/API/EndExam.ashx",
    //         type: "POST",
    //         data: {
    //             StudentWebGuid: studentWebGuid,
    //             isTimeUp: true
    //         },
    //         success: function (resp) {
    //             location.href = "login.html";
    //             console.log('resp from EndExam.ashx: ' + resp);
    //         },
    //         error: function (data) {
    //             console.log('Oops, something went wrong in EndExam.ashx.');
    //         }
    //     });
});

// btnEndExam.addEventListener("click", function () {
//     $('#EndExamModal').modal('show');
// });
// btnFinishExam.addEventListener("click", function () {
//     $('#EndExamModal').modal('show');
// });

ipcRenderer.on('Main:error', (event, error) => {
    alert(error);
});

// function GetNewFullBase64Image(video) {
//     let canvasTemp = document.createElement('canvas');
//     let contextTemp = canvasTemp.getContext('2d');

//     //let ratio = FaceRecognitionVideo.videoWidth / FaceRecognitionVideo.videoHeight;
//     let w = FaceRecognitionVideo.videoWidth;
//     let h = FaceRecognitionVideo.videoHeight;
//     canvasTemp.width = w;
//     canvasTemp.height = h;

//     //context4.fillRect(0,0, w, h);
//     contextTemp.drawImage(FaceRecognitionVideo, 0, 0, w, h);

//     var imageBase64 = canvasTemp.toDataURL();
//     //imageBase64 = imageBase64.replace(/^data:image\/(png|jpg);base64,/, "");
//     return imageBase64;
// }

function GetNewImageBlob(video) {
    let canvasTemp = document.createElement('canvas');
    let contextTemp = canvasTemp.getContext('2d');

    let ratio = video.videoWidth / video.videoHeight;
    let w = video.videoWidth - 100;
    let h = parseInt(w / ratio, 10);
    canvasTemp.width = w;
    canvasTemp.height = h;

    //context4.fillRect(0,0, w, h);
    contextTemp.drawImage(FaceRecognitionVideo, 0, 0, w, h);

    //var imageBase64 = canvasTemp.toDataURL();
    //imageBase64 = imageBase64.replace(/^data:image\/(png|jpg);base64,/, "");


    return canvasTemp;
}

