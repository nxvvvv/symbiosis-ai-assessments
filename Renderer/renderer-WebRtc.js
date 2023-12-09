const AssessmentConfig = require('../assessment-config.json');

var myConnection; //WebRTC PeerConnection object
var streamGlobal; //To store the stream received from the renderer.js file
var streamGlobalDesktop; //To store the stream received from the renderer.js file

var isToBeRetriedPeerOfferForDisconnection = false; //Flag to reestablish connection only on the RTCPeer Ice Candidate 'disconnect event'
var retryPeerOffer; //Peer offer to be retried saved


var uuid; //Unique student guid stored as a global variable
var peerUuids = [];
var peerIceCandidates = [];
var myIceCandidates = [];
var iceCandidateNullNotReceivedTimeout; //For network change scenarios to inituate a null event.candidate

var reference = null; //The firebase reference for webrtc

var isDesktopStreamInUse = false; //By default, the WebCam Stream is displayed
var newStreamAdded = false;
var newStreamAddedGatekeeper = true;



var videoProctorGlobal;
// var configuration = {
//     // "iceServers": [{ "url": "stun:stun.l.google.com:19302" }]
//     "iceServers": [{ "url": "stun:stun4.l.google.com:19302" }]
// };
var configuration = {
    "iceServers": [{ "credential": null, "username": null, "url": "stun:global.stun.twilio.com:3478?transport=udp" }]
}
// var configuration = {
//     "iceServers" : [{"credential":"M/6xuJ0xir/9ENpMA7JEQZH7OyRjJjrF4JSuT3acOjQ=","username":"506d38a8f413c4fd1db59464843815d9d6ea55490b990db8ca986251180618bd","url":"turn:global.turn.twilio.com:3478?transport=udp"},{"credential":"M/6xuJ0xir/9ENpMA7JEQZH7OyRjJjrF4JSuT3acOjQ=","username":"506d38a8f413c4fd1db59464843815d9d6ea55490b990db8ca986251180618bd","url":"turn:global.turn.twilio.com:3478?transport=tcp"},{"credential":"M/6xuJ0xir/9ENpMA7JEQZH7OyRjJjrF4JSuT3acOjQ=","username":"506d38a8f413c4fd1db59464843815d9d6ea55490b990db8ca986251180618bd","url":"turn:global.turn.twilio.com:443?transport=tcp"}]
// }
var constraints = { //Used on the offer and answer
    mandatory: {
        OfferToReceiveAudio: true,
        IceRestart: true
    }
}

var PeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
var SessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;

navigator.getWebcam = (navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia);

function StartWebRTC(stream, desktopStream, studentFirebaseIdKey, IceServerObj, videoProctor) { //This function is called only once from rendere.js
    uuid = studentFirebaseIdKey;
    console.log('Student Uuid : ' + uuid);
    configuration = {
        "iceServers": IceServerObj
    }
    videoProctorGlobal = videoProctor;
    //Firebase Initializations:
    reference = firebase.database().ref('webrtc/students/' + uuid);
    reference.update({
        'ActivationKey': GlobalActivationKey,
        'RegistrationNo': GlobalRegistrationNo,
        'StudentName': GlobalStudentName,
        'EmailId': GlobalEmailId,
        'SubjectName': GlobalSubjectName,
        'ProctorLogin': GlobalProctorLogin,
        'isStudent': true,
        'uuid': uuid,
        'proctorId': false,
        'myOffer': false,
        'peerOffer': false,
        'peerOfferRestart': false,
        'myAnswer': false,
        'peerAnswer': false,
        'myIceCandidate': false,
        'peerIceCandidate': false,
        'isOnline': false,
        'lastSeenOn': firebase.database.ServerValue.TIMESTAMP,
        'isExamEnded': false,
        'webrtcId': GlobalId,
        'webrtcGuid': GlobalstudentWebGuid
    });

    navigator.geolocation.getCurrentPosition(position => {
        console.log('lat: ' + position.coords.latitude + ', lon: ' + position.coords.longitude);
        $.ajax(
            {
                url: AssessmentConfig.SetStudentLocation,
                type: "POST",
                data: {
                    'StudentWebGuid': GlobalstudentWebGuid,
                    'Id': GlobalId,
                    'latitude': position.coords.latitude,
                    'longitude': position.coords.longitude
                },
                success: function (result) {
                    console.log(result);
                },
                error: function (data) {
                    console.log('Oops, something went wrong in setting the students geo location.');
                }
            });
        reference.update({
            'position': {
                'latitude': position.coords.latitude,
                'longitude': position.coords.longitude
            }
        });
    });

    var connectedRef = firebase.database().ref('.info/connected'); //Special ref to detect online / offline state of firebase
    connectedRef.on('value', function (snap) {
        if (snap.val() === true) {
            console.log('connected');
            // some time later when we change our minds
            //onDisconnectRef.cancel();
            reference.update({ 'isOnline': true, 'lastSeenOn': firebase.database.ServerValue.TIMESTAMP });
            // reference.onDisconnect().update({ 'isOnline': false, 'lastSeenOn': firebase.database.ServerValue.TIMESTAMP });
            reference.onDisconnect().remove();
        }
        else {
            console.log('not connected');
        }
    });

    //when we got ice candidate from another user 
    reference.child('peerIceCandidate').on('value', function (snapshot) {
        ProcessPeerIceCandidates(snapshot);
    });
    //when somebody wants to call us 
    reference.child('peerOffer').off(); //This fixes the issue of .on being called twice on the following line:
    reference.child('peerOffer').on('value', function (snapshot) {
        console.log('In reference.child(peerOffer).on');
        ProcessPeerOffer(snapshot);
    });
    reference.child('peerOfferRestart').on('value', function (snapshot) {
        console.log('In reference.child(peerOfferRestart).on');
        ProcessPeerOffer(snapshot);
        reference.update({ 'peerOfferRestart': false }); //To ensure peerOfferRestart is not fired again
    });

    //When an answer is received in response to offer:
    reference.child('peerAnswer').on('value', function (snapshot) {
        ProcessPeerAnswer(snapshot);
    });

    reference.child('isDesktopStreamRequested').on('value', function (snapshot) {
        if (snapshot.val() != null) {

            var isDesktopStreamRequested = snapshot.val();
            if (isDesktopStreamRequested) {
                let videoTrack = streamGlobalDesktop.getVideoTracks()[0];
                //PCs.forEach(function (pc) {
                var sender = myConnection.getSenders().find(function (s) {
                    return s.track.kind == videoTrack.kind;
                });
                console.log('found sender:', sender);
                sender.replaceTrack(videoTrack);
                //});
            }
            else {
                let videoTrack = streamGlobal.getVideoTracks()[0];
                //myConnection.forEach(function (pc) {
                var sender = myConnection.getSenders().find(function (s) {
                    return s.track.kind == videoTrack.kind;
                });
                console.log('found sender:', sender);
                sender.replaceTrack(videoTrack);
                //});
            }

            // var isDesktopStreamRequested = snapshot.val();
            // console.log('isDesktopStreamRequested = ' + isDesktopStreamRequested);
            // if (isDesktopStreamRequested) { //Send Desktop Stream
            //     if (!isDesktopStreamInUse) {

            //         myConnection.removeStream(streamGlobal);
            //         newStreamAdded = true;
            //         myConnection.addStream(streamGlobalDesktop);
            //         console.log('Added Desktop Stream');
            //         isDesktopStreamInUse = true;
            //     }
            // }
            // else {//Send WebCam stream
            //     if (isDesktopStreamInUse) {

            //         myConnection.removeStream(streamGlobalDesktop);
            //         newStreamAdded = true;
            //         myConnection.addStream(streamGlobal);
            //         console.log('Added Webcam Stream');
            //         isDesktopStreamInUse = false;
            //     }
            // }
            // console.log('START Re-NEGOTIATING NOW!');
            // reference.child('proctorId').once('value').then(function (snapshot) {
            //     var proctorId = snapshot.val();
            //     firebase.database().ref('webrtc/proctors/' + proctorId).update({
            //         'isRenegotiationRequestedFromStudent': true
            //     }, function () {
            //         newStreamAddedGatekeeper = true;
            //     });
            // });
        }
    });
    streamGlobal = stream; //Save the stream received from rendere.js globally to use later for reconnection scenarios
    streamGlobalDesktop = desktopStream;
    createPeerConnections(streamGlobal);
}

function StopWebRTC() {
    // reference.update({
    //     'isOnline': false,
    //     'lastSeenOn': firebase.database.ServerValue.TIMESTAMP,
    //     'isExamEnded': true
    // });
    reference.remove();
    if (myConnection) {
        myConnection.close();
        console.log('webrtc myConnection.close()');
    }
    console.log('webrtc closed');
}
//module.exports = StartWebRTC
module.exports = {
    'StartWebRTC': StartWebRTC,
    'StopWebRTC': StopWebRTC
}


function createPeerConnections(stream) {
    //creating our RTCPeerConnection object 	
    myConnection = new PeerConnection(configuration);
    console.log("RTCPeerConnection object was created");
    console.log('RTCPeerConnection ' + myConnection);
    myConnection.oniceconnectionstatechange = function (event) {
        console.log('In oniceconnectionstatechange event state: ' + myConnection.iceConnectionState);
        if (myConnection.iceConnectionState == "failed" || myConnection.iceConnectionState == "disconnected" || myConnection.iceConnectionState == "closed") {
            console.log('myConnection has ' + myConnection.iceConnectionState + '!');
            if (myConnection.iceConnectionState == "disconnected") {
                isToBeRetriedPeerOfferForDisconnection = true; //To retry connect peer offer if disconnected
                videoProctorGlobal.style.display = "none"; //To prevent the black box after the video has been disconnected
            }
            if (myConnection.iceConnectionState !== "closed") {
                console.log('Closing myConnection');
                myConnection.close();
                videoProctorGlobal.style.display = "none"; //To prevent the black box after the video has been disconnected
            }
            console.log('Restarting myConnection');

            createPeerConnections(streamGlobal);
        }
        else if (myConnection.iceConnectionState == "new") {
            if (isToBeRetriedPeerOfferForDisconnection) { //This is s hack to reinitiate the Offer received when connection is disconnected...
                console.log('in isToBeRetriedPeerOfferForDisconnection with my peerOffer: ' + JSON.stringify(retryPeerOffer));
                isToBeRetriedPeerOfferForDisconnection = false;
                reference.update({ 'peerOfferRestart': retryPeerOffer });
            }
        }
    }

    //setup ice handling
    //when the browser finds an ice candidate we send it to another peer 
    myConnection.onicecandidate = function (event) {
        if (event.candidate == null) {
            if (iceCandidateNullNotReceivedTimeout) {
                clearTimeout(iceCandidateNullNotReceivedTimeout);
                iceCandidateNullNotReceivedTimeout = null;
            }
            reference.update({
                'myIceCandidate': myIceCandidates
            });

            var tempMyIceCandidates = JSON.parse(JSON.stringify(myIceCandidates));
            reference.child('proctorId').once('value').then(function (snapshot) {
                var proctorId = snapshot.val();
                if (proctorId !== false) {
                    console.log('Adding peerIceCandidate to: ' + 'webrtc/proctors/' + proctorId);
                    firebase.database().ref('webrtc/proctors/' + proctorId).update({
                        'peerIceCandidate': tempMyIceCandidates
                    });
                    if (peerUuids.indexOf(proctorId) == -1) {
                        peerUuids.push(proctorId);
                    }
                }
            });
            myIceCandidates = [] //Reset the array so that new candidates can be added in case of network change
        }
        else { //Fill all candidates in an array
            myIceCandidates.push(event.candidate);
            if (!iceCandidateNullNotReceivedTimeout) {
                //Start timer to initiate null event.candidate scenario which does not happen during network change:
                iceCandidateNullNotReceivedTimeout = setTimeout(function () {
                    console.log('In TIMEOUT!!!!!');
                    reference.update({
                        'myIceCandidate': myIceCandidates
                    });

                    var tempMyIceCandidates = JSON.parse(JSON.stringify(myIceCandidates));
                    reference.child('proctorId').once('value').then(function (snapshot) {
                        var proctorId = snapshot.val();
                        if (proctorId !== false) {
                            console.log('Adding peerIceCandidate to: ' + 'webrtc/proctors/' + proctorId);
                            firebase.database().ref('webrtc/proctors/' + proctorId).update({
                                'peerIceCandidate': tempMyIceCandidates
                            });
                            if (peerUuids.indexOf(proctorId) == -1) {
                                peerUuids.push(proctorId);
                            }
                        }
                    });
                    myIceCandidates = [] //Reset the array so that new candidates can be added in case of network change

                    clearTimeout(iceCandidateNullNotReceivedTimeout);
                    iceCandidateNullNotReceivedTimeout = null;
                }, 4000);
            }

        }
        console.log('event.candidate ' + JSON.stringify(event.candidate));

    };

    //Handle streams on each peer
    myConnection.onnegotiationneeded = function () {
        console.log('RE-NEGOTIATION NEEDED!');
        // if (newStreamAdded && newStreamAddedGatekeeper) {
        //     newStreamAddedGatekeeper = false;
        //     newStreamAdded = false;
        //     console.log('START Re-NEGOTIATING NOW!');
        //     reference.child('proctorId').once('value').then(function (snapshot) {
        //         var proctorId = snapshot.val();
        //         firebase.database().ref('webrtc/proctors/' + proctorId).update({
        //             'isRenegotiationRequestedFromStudent': true
        //         }, function () {
        //             newStreamAddedGatekeeper = true;
        //         });
        //     });
        // }
    }
    myConnection.addStream(stream);
    console.log("Added local stream to myPeerConnection");
    myConnection.onaddstream = gotRemoteStream;
};

//Success! Show the remote video...
function gotRemoteStream(event) { //Success! Show the remote video...
    // videoProctorGlobal.src = URL.createObjectURL(event.stream);
    // videoProctorGlobal.play();
    // console.log("Got remote stream!");

    let streamOld = videoProctorGlobal.srcObject;
    console.log('Old Stream ' + streamOld);
    if (streamOld) {
        videoProctorGlobal.onpause = function () {
            console.log('In video paused');
            let tracks = streamOld.getTracks();

            tracks.forEach(function (track) {
                track.stop();
            });
            console.log('Stopped old stream tracks');
            videoProctorGlobal.srcObject = null;

            videoProctorGlobal.srcObject = event.stream;
            videoProctorGlobal.play();
            console.log("Got remote stream!");
            videoProctorGlobal.style.display = "block"; //To prevent the black box after the video has been disconnected
        };
        videoProctorGlobal.pause();
    }
    else {
        videoProctorGlobal.srcObject = event.stream;
        videoProctorGlobal.play();
        console.log("Got remote stream!");
        videoProctorGlobal.style.display = "block"; //To prevent the black box after the video has been disconnected
    }

    // videoProctorGlobal.addEventListener("pause", function() { 
    //    console.log('Proctor video pause event fired.');
    // });
    // videoProctorGlobal.addEventListener("ended", function() { 
    //     console.log('Proctor video ended event fired.');
    //  });
}

function ProcessPeerIceCandidates(snapshot) {
    if (snapshot.val() !== false) {
        var iceCandidate = snapshot.val();
        if (!myConnection || !myConnection.remoteDescription || !myConnection.remoteDescription.type) {
            //push candidate onto queue...
            //peerIceCandidates.push(iceCandidate);
            peerIceCandidates = iceCandidate;
            console.log('Added to Array (remoteDescription not set): ' + JSON.stringify(iceCandidate));
        }
        else {
            // var iceCandidate = JSON.parse(txtPeerIceCandidate.value);
            try {
                //peerIceCandidates.push(iceCandidate);
                peerIceCandidates = iceCandidate;
                console.log('Added to Array: ' + JSON.stringify(iceCandidate));
                peerIceCandidates.forEach(function (iceCandidateArrItem) {
                    //var shiftedIceCandidateArrItem = peerIceCandidates.shift();
                    myConnection.addIceCandidate(new RTCIceCandidate(iceCandidateArrItem));
                    console.log('Made Candidate: ' + JSON.stringify(iceCandidateArrItem));
                });
                //myConnection.addIceCandidate(new RTCIceCandidate(iceCandidate));
            }
            catch (e) {
                console.log('Add Ice Candidate error: ' + e);
            }
            console.log('Ice Candidate recd from peer!');
        }
    }
}

function ProcessPeerOffer(snapshot) {
    if (snapshot.val() !== false) {
        console.log('In ProcessPeerOffer');
        var peerOffer = snapshot.val();
        console.log('peerOffer: ' + JSON.stringify(peerOffer));
        if (JSON.stringify(retryPeerOffer) === JSON.stringify(peerOffer)) { //This is a hack for some unknown issue which causes ProcessPeerOffer to fire twice from peerOffer.on
            console.log('Returning!!!!!');
            return;
        }
        if (peerOffer === null) { //While ending the remote proctoring session as the firebase row (JSON) has been deleted
            console.log('Ending the remote proctoring session in.... ProcessPeerOffer(snapshot)');
            return;
        }
        retryPeerOffer = peerOffer;
        myConnection.setRemoteDescription(new RTCSessionDescription(peerOffer), function () {
            console.log('Peer offer received & SetRemoteDescription done!');
            // peerIceCandidates.forEach(function (iceCandidateArrItem) {
            //     myConnection.addIceCandidate(new RTCIceCandidate(iceCandidateArrItem));
            //     console.log('Made Candidate: ' + JSON.stringify(iceCandidateArrItem));
            // });

            myConnection.createAnswer(function (answer) {
                myConnection.setLocalDescription(answer);
                console.log('Answer ' + JSON.stringify(answer));
                reference.update({
                    'myAnswer': answer
                });

                reference.child('proctorId').once('value').then(function (snapshot) {
                    var proctorId = snapshot.val();
                    console.log('Adding peerAnswer to: ' + 'webrtc/proctors/' + proctorId);
                    firebase.database().ref('webrtc/proctors/' + proctorId).update({
                        'peerAnswer': answer
                    });
                    if (peerUuids.indexOf(proctorId) == -1) {
                        peerUuids.push(proctorId);
                    }
                });
            }, function (error) {
                alert("oops...error");
            }, constraints);
        });

    }
}

function ProcessPeerAnswer(snapshot) {
    if (snapshot.val() !== false) {
        console.log('Answer received!');
        var peerAnswer = snapshot.val();
        if (peerAnswer === null) {//While ending the remote proctoring session as the firebase row (JSON) has been deleted
            console.log('Ending the remote proctoring session in.... ProcessPeerAnswer(snapshot)');
            return;
        }
        myConnection.setRemoteDescription(new RTCSessionDescription(peerAnswer));

        peerIceCandidates.forEach(function (iceCandidateArrItem) {
            myConnection.addIceCandidate(new RTCIceCandidate(iceCandidateArrItem));
            console.log('Made Candidate on peerAnswer received: ' + JSON.stringify(iceCandidateArrItem));
        });

    }
}