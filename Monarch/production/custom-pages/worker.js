importScripts("fetch.js");
// if (typeof OffscreenCanvas !== 'undefined') {
//     self.document = {
//         createElement: () => {
//             return new OffscreenCanvas(320, 240);
//         }
//     };
//     self.window = self;
//     self.screen = {
//         width: 320,
//         height: 240
//     };
//     self.HTMLVideoElement = function() {};
//     self.HTMLImageElement = function() {};
//     self.HTMLCanvasElement = OffscreenCanvas;
// }
importScripts("tfjs.js");
importScripts("coco-ssd.js");
var GlobalModel;
var GlobalOffscreenCanvas;
cocoSsd.load().then(model => {
    GlobalModel = model;
    console.log('Modal loaded on worker.js');
});

onmessage = function (msg) {
    //console.log('Message Received' + JSON.stringify(msg));
    //create ImageData object that can use in tfjs
    //const image = new ImageData(msg.data.data, msg.data.width, msg.data.height);
    //console.log('Created Image in worker.js');
    //console.log('worker message recd: ' + JSON.stringify(msg.data));
    if (msg.data.canvas) {
        console.log('Received OffscreenCanvas');
        GlobalOffscreenCanvas = msg.data.canvas;
    }

    if(msg.data.imageBase64){
        //console.log('msg.data.imageBase64 recd')
    }
    if (GlobalOffscreenCanvas && GlobalModel && msg.data.bitmap) {
        //detectFrame(image, GlobalModel);

        //var canvas = document.getElementById("c");
        var ctx = GlobalOffscreenCanvas.getContext("2d");
        ctx.drawImage(msg.data.bitmap, 0, 0);

        // var image = msg.data.image;
        // // var image = new Image();
        // image.onload = function () {
        //     ctx.drawImage(image, 0, 0);
            
        // };
        // image.src = msg.data.imageBase64;

        detectFrameFromOffscreenCanvas(GlobalOffscreenCanvas, GlobalModel);
    }
    // else{
    //     console.log('model not yet loaded');
    // }
}

// async function detectFrame(img, model) {
//     await model.detect(img).then(predictions => {
//         var predictionsStringified = JSON.stringify(predictions);
//         postMessage(predictionsStringified);
//     });
// }

async function detectFrameFromOffscreenCanvas(canvas, model) {
    await model.detect(canvas).then(predictions => {
       // console.log('Got predictions inside detectFrameFromOffscreenCanvas');
        var predictionsStringified = JSON.stringify(predictions);
        //console.log('predictions: ' + predictionsStringified);
        postMessage(predictionsStringified);
    });
}

