const electron = require('electron');

//let counterDetectNoFace = 0;
let counterDetectMoreeThan1Face = 0;
let counterVerifyFace = 0;//Not used as it is replaced with a boolean
let verifyFaceNow = false;
let isInTimeoutForFaceVerification = false;

let IsFaceRecognitionToBeDone = false;

let hasStartedIntervalForFaceRecognition = false;
function StartIntervalForFaceRecognition() {
    setInterval(function () {
        IsFaceRecognitionToBeDone = true; //To initiate face recognition the moment a face is detected
    }, 10000);
}


module.exports = function processWebcamVideo(video, canvas, base64ImageCallbackFunc) {

    var context = canvas.getContext('2d');

    var startTime = +new Date(),
        changed = false,
        scaleFactor = 1,
        faces;

        //The following line was commented on 20/05/2019 so that only the box is drawn in the canvas and not the entire image frame as the video is more responsive
    //context.drawImage(video, 0, 0, canvas.width, canvas.height);
    faces = detectFaces(canvas);
    context.clearRect(0, 0, canvas.width, canvas.height);
    //highlightFaces(faces, video, context, base64ImageCallbackFunc);

    // if (originalFace && faces.length > 0) {
    //     scaleContent(faces[0]);
    // }

    // if (!originalFace && faces.length === 1) {
    //     originalFace = faces[0];
    // }

    // Log process time
    //console.log(+new Date() - startTime);

    if (hasStartedIntervalForFaceRecognition === false) {

    }

    // And repeat.
    // if (counterVerifyFace > 100) {//For face authentication
    //     counterVerifyFace = 0;
    //     let imageBase64Modified = getPhotoBase64Img(video);
    //     base64ImageCallbackFunc(imageBase64Modified, null, null); //First argument is the base 64 image to be returned to the renderer for face recognition
    // }
    if (verifyFaceNow) {//For face authentication
        //counterVerifyFace = 0;
        let imageBase64Modified = getPhotoBase64Img(video);
        base64ImageCallbackFunc(imageBase64Modified, null, null); //First argument is the base 64 image to be returned to the renderer for face recognition
        verifyFaceNow = false;
    }
    else{
        if(isInTimeoutForFaceVerification === false){
            isInTimeoutForFaceVerification = true;
            setTimeout(function(){
                verifyFaceNow = true;
                isInTimeoutForFaceVerification = false;
            }, 5000);
        }
    }
    setTimeout(processWebcamVideo, 200, video, canvas, base64ImageCallbackFunc); //IMP: Set timeout has variable parameters after the timeout value which are basically paramenters to the function used in the getimout function to be called
}

function detectFaces(canvas) {
    return ccv.detect_objects({ canvas: (ccv.pre(canvas)), cascade: cascade, interval: 2, min_neighbors: 0 });
}

function highlightFaces(faces, video, context, base64ImageCallbackFunc) {
    if (!faces) {
        // $("#CheatingAlertModal p").text('No Faces Detected.');
        // $("#CheatingAlertModal").modal();
        // return false;
        return;
    }
    // if (faces.length == 0) {
    //     //counterDetectNoFace++;
    //     counterDetectMoreeThan1Face = 0;
    //     if (setTimeoutFaceDetection === undefined) {
    //         setTimeoutFaceDetection = setTimeout(function () {
    //             base64ImageCallbackFunc(null, true, null) //2nd argument true indicates that the user is not looking at the screen
    //             setTimeoutFaceDetection = undefined;
    //         }, 5000);
    //     }
    //     // if (counterDetectNoFace >= 25) {
    //     //     //alert('Please look into the screen!');
    //     //     // $("#CheatingAlertModal p").text('Please look into the screen.');
    //     //     // $("#CheatingAlertModal").modal();
    //     //     counterDetectNoFace = 0;
    //     //     base64ImageCallbackFunc(null, true, null) //2nd argument true indicates that the user is not looking at the screen
    //     // }
    //     //alert("No faces detected = " + faces.length);
    // }
    // else if (faces.length == 1) {
    //     //counterDetectNoFace = 0;
    //     clearTimeout(setTimeoutFaceDetection);
    //     setTimeoutFaceDetection = undefined;

    //     if (IsFaceRecognitionToBeDone === true) {
    //         IsFaceRecognitionToBeDone = false;
    //         let imageBase64Modified = getPhotoBase64Img(video);
    //         base64ImageCallbackFunc(imageBase64Modified, null, null); //First argument is the base 64 image to be returned to the renderer for face recognition
    //     }
    // }
    // else { //More than 1 face
    //     clearTimeout(setTimeoutFaceDetection);
    //     setTimeoutFaceDetection = undefined;

    //     counterDetectMoreeThan1Face++;
    //     if (counterDetectMoreeThan1Face > 20) {
    //         // $("#CheatingAlertModal p").text(faces.length + ' faces detected! This could be flagged as cheating.');
    //         // $("#CheatingAlertModal").modal();
    //         counterDetectMoreeThan1Face = 0;
    //         base64ImageCallbackFunc(null, null, faces.length) //3nrd argument no indicates the no of people detected on the screen > 1
    //     }
    // }

    for (var i = 0; i < faces.length; i++) {
        //var face = faces[i];
        //context.fillRect(face.x, face.y, face.width, face.height);
        var rect = faces[i];
        context.strokeStyle = '#8B0000';
        context.strokeRect(rect.x, rect.y, rect.width, rect.height);
        context.font = '11px Helvetica';
        context.fillStyle = "#fff";
        context.fillText('x: ' + rect.x + 'px', rect.x + rect.width + 5, rect.y + 11);
        context.fillText('y: ' + rect.y + 'px', rect.x + rect.width + 5, rect.y + 22);
        //console.log('1');

    }
}

function getPhotoBase64Img(video) {
    let canvasTemp = document.createElement('canvas');
    let contextTemp = canvasTemp.getContext('2d');

    let ratio = video.videoWidth / video.videoHeight;
    let w = video.videoWidth - 100;
    let h = parseInt(w / ratio, 10);
    canvasTemp.width = w;
    canvasTemp.height = h;

    //context4.fillRect(0,0, w, h);
    //The following line was commented on 16/06/2020
    //contextTemp.drawImage(video, 0, 0, w, h);

    var imageBase64 = canvasTemp.toDataURL();
    //console.log(imageBase64);
    var imageBase64Modified = imageBase64.replace(/^data:image\/(png|jpg);base64,/, "");
    //ipcRenderer.send('image:recognition', imageBase64Modified);
    return imageBase64Modified;
}

// function drawCanvas(canvas2, bitmap) {
//     canvas2.width = getComputedStyle(canvas2).width.split('px')[0];
//     canvas2.height = getComputedStyle(canvas2).height.split('px')[0];
//     let ratio = Math.min(canvas2.width / bitmap.width, canvas2.height / bitmap.height);
//     let x = (canvas2.width - bitmap.width * ratio) / 2;
//     let y = (canvas2.height - bitmap.height * ratio) / 2;
//     canvas2.getContext('2d').clearRect(0, 0, canvas2.width, canvas2.height);
//     canvas.getContext('2d').drawImage(bitmap, 0, 0, bitmap.width, bitmap.height,
//         x, y, bitmap.width * ratio, bitmap.height * ratio);
// }