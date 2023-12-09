self.importScripts("../../../includes/js/FaceApiJs/face-api.js");

await faceapi.loadSsdMobilenetv1Model('../../../includes/js/FaceApiJs');
await faceapi.loadFaceLandmarkModel('../../../includes/js/FaceApiJs');
await faceapi.loadFaceRecognitionModel('../../../includes/js/FaceApiJs');


async function DoFaceRecognition(input, myImageXerxes, mySample1Img) {
    //window.requestAnimationFrame(DoFaceDetectionInAnimationFrame);

    // const input = document.getElementById('myImage');
    // const myImageXerxes = document.getElementById('myImageXerxes');
    // const mySample1Img = document.getElementById('mySample1Img');



    let fullFaceDescriptions = await faceapi.detectAllFaces(input).withFaceLandmarks().withFaceDescriptors();
    let fullFaceDescriptionsXerxes = await faceapi.detectAllFaces(myImageXerxes).withFaceLandmarks().withFaceDescriptors();

    // const detectionsForSize = faceapi.resizeResults(fullFaceDescriptions, { width: input.width, height: input.height });
    // faceapi.drawDetection(canvas, detectionsForSize[0].detection, { withScore: true });
    //faceapi.drawLandmarks(canvas, detectionsForSize[0].landmarks, { drawLines: true });

    if (!fullFaceDescriptions.length) {
        console.log('fullFaceDescriptions.length is null or undefined!');
        return;
    }

    const labeledDescriptors = [
        new faceapi.LabeledFaceDescriptors(
            'Radhika',
            [fullFaceDescriptions[0].descriptor]
        ),
        new faceapi.LabeledFaceDescriptors(
            'Xerxes',
            [fullFaceDescriptionsXerxes[0].descriptor]
        )
    ]
    // 0.6 is a good distance threshold value to judge
    // whether the descriptors match or not
    const maxDescriptorDistance = 0.45
    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, maxDescriptorDistance);

    // create FaceMatcher with automatically assigned labels
    // from the detection results for the reference image
    //const faceMatcher = new faceapi.FaceMatcher(fullFaceDescriptions);

    const singleResult = await faceapi
        .detectAllFaces(mySample1Img).withFaceLandmarks().withFaceDescriptors();

    //Return result
    self.postMessage(singleResult);
}

self.addEventListener("message", function (e) {
    const input = e.data.input;
    const myImageXerxes = e.data.myImageXerxes;
    const mySample1Img = e.data.mySample1Img;
    DoFaceRecognition(input, myImageXerxes, mySample1Img);
});


