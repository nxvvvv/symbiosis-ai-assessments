importScripts("fetch.js");
importScripts("tfjs.js");
importScripts("blazeface.js");

const returnTensors = false;
const flipHorizontal = false;
const annotateBoxes = true;


var GlobalOffscreenCanvas;
var GlobalModel;

async function InitModel() {
    GlobalModel = await blazeface.load();
    console.log('Set GlobalModel in tfjs face detect');
}
InitModel();

onmessage = function (msg) {
    if (msg.data.canvas) {
        console.log('Received OffscreenCanvas');
        GlobalOffscreenCanvas = msg.data.canvas;
    }

    if (msg.data.imageBase64) {
        //console.log('msg.data.imageBase64 recd')
    }
    if (GlobalOffscreenCanvas && GlobalModel && msg.data.bitmap) {
        var ctx = GlobalOffscreenCanvas.getContext("2d");
        ctx.drawImage(msg.data.bitmap, 0, 0);

        estimeteFacesFromOffscreenCanvas(GlobalOffscreenCanvas, GlobalModel);
    }
}


async function estimeteFacesFromOffscreenCanvas(canvas, model) {
    const predictions = await model.estimateFaces(canvas, returnTensors, flipHorizontal, annotateBoxes);
    var predictionsStringified = JSON.stringify(predictions);
    //console.log('predictions: ' + predictionsStringified);
    postMessage(predictionsStringified);
}

