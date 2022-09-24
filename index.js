'use strict';

//
// VARIABLES
//

var canvas, canvas2, ctx, ctx2, zoom;
const maxCanvasHeight = 7000; //px
var downloadCount = 0;

//
// UTILITY FUNCTIONS
//

function ID(id) {
  return document.getElementById(id);
}

function extractTextBetween(input, before, after) {
  const step1 = input.substring(input.indexOf(before) + before.length, input.length);
  const step2 = step1.substring(0, step1.indexOf(after));
  return step2;
}

//
// INITIALIZATION
//

window.addEventListener("load", () => {
  const urlBox = ID("downloadURL");
  canvas = ID("canvas");
  canvas2 = ID("canvas2");
  ctx = canvas.getContext("2d");
  ctx2 = canvas2.getContext("2d");

  ID("loadButton").addEventListener("click", () => {
    zoom = ID("zoom").value;
    console.log("URL : ", urlBox.value);
    parseURL(urlBox.value);
  });
  ID("downloadButton").addEventListener("click", () => {
    downloadCanvas();
  });
});

//
//
//

function downloadCanvas() {
  ID("infoStatus").textContent = "saving image..";
  if (canvas2.height > 0) {
    const link1 = document.createElement('a');
    link1.download = `top${downloadCount}.png`;
    link1.href = canvas.toDataURL();
    link1.click();
    const link2 = document.createElement('a');
    link2.download = `bottom${downloadCount}.png`;
    link2.href = canvas2.toDataURL();
    link2.click();
    downloadCount++;
  } else {
    const link = document.createElement('a');
    link.download = `image${downloadCount}.png`;
    link.href = canvas.toDataURL();
    link.click();
    downloadCount++;
  }
}

function resetInfoDisplay() {
  const normal = "N/A";
  ID("infoStatus").textContent = normal;
  ID("infoType").textContent = normal;
  ID("infoCopyright").textContent = normal;
  ID("infoZooms").textContent = normal;
  ID("infoID").textContent = normal;
}

function parseURL(url) {
  resetInfoDisplay();
  if (url.includes("panoid")) {
    const id = extractTextBetween(url, "panoid%3D", "%");
    console.log("Extracted PanoID using method 1: ", id);

    getPath(id);
  } else if (url.includes("m4!1s") && url.includes("data=")) {
    const id = extractTextBetween(url, "m4!1s", "!2e");
    if (id.length > 22) {
      console.log("Extracted Photosphere ID using method 2: ", id);
      getSphere(id);
    } else {
      console.log("Extracted PanoID using method 2: ", id);
      getPath(id);
    }
  } else if (url.includes("googleusercontent.com")) {
    const id = extractTextBetween(url, "googleusercontent.com%2Fp%2F", "%3");
    console.log("Photosphere ID extracted: ", id);
    getSphere(id);
  } else {
    ID("infoStatus").textContent = "Error: Could not understand link.";
  }
}

//
// PATH OBTAINING LOGIC
//

function getPath(panoid) {
  ID("infoStatus").textContent = "Getting data from server...";
  ID("infoID").textContent = panoid;
  ID("infoType").textContent = `Street View`;
  var request = new XMLHttpRequest();
  request.onload = function () {
    ID("infoStatus").textContent = "Parsing data...";
    // Metadata parsing witchcraft
    const data = JSON.parse(this.responseText.substring(4))[1][0];

    const tileSize = data[2][3][1][0];
    const bestZoom = (data[2][3][0].length - 1);

    if (bestZoom < zoom || zoom < 0) {
      zoom = bestZoom;
      document.getElementById("zoom").value = bestZoom;
    }

    const copyright = data[4][0][0][0][0];

    ID("infoZooms").textContent = ` 0 to ${bestZoom}`;
    ID("infoCopyright").textContent = copyright;

    const widthPX = data[2][3][0][zoom][0][1];
    const heightPX = data[2][3][0][zoom][0][0];
    const width = Math.ceil(widthPX / tileSize);
    const height = Math.ceil(heightPX / tileSize);

    prepCanvas(widthPX, heightPX);

    ID("infoStatus").textContent = "Downloading tiles";
    const totalTiles = width * height;
    var processedTiles = 0;
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        requestImage(`https://streetviewpixels-pa.googleapis.com/v1/tile?cb_client=maps_sv.tactile&panoid=${panoid}&x=${x}&y=${y}&zoom=${zoom}&nbt=1&fover=0`, (image) => {
          paintImage(image, x, y, heightPX, widthPX, tileSize, height);
          processedTiles++;
          if (processedTiles === totalTiles) {
            ID("infoStatus").textContent = "finished";
          }
        });
      }
    }
  };
  request.open("get", `https://www.google.com/maps/photometa/v1?authuser=0&pb=!1m4!1smaps_sv.tactile!11m2!2m1!1b1!2m2!1sen!2sus!3m3!1m2!1e2!2s${panoid}!4m57!1e1!1e2!1e3!1e4!1e5!1e6!1e8!1e12!2m1!1e1!4m1!1i48!5m1!1e1!5m1!1e2!6m1!1e1!6m1!1e2!9m36!1m3!1e2!2b1!3e2!1m3!1e2!2b0!3e3!1m3!1e3!2b1!3e2!1m3!1e3!2b0!3e3!1m3!1e8!2b0!3e3!1m3!1e1!2b0!3e3!1m3!1e4!2b0!3e3!1m3!1e10!2b1!3e2!1m3!1e10!2b0!3e3`, true);
  request.send();

}

//
// PHOTOSHPERE OBTAINING LOGIC
//

function getSphere(sphereID) {
  ID("infoStatus").textContent = "Getting data from server...";
  ID("infoID").textContent = sphereID;
  ID("infoType").textContent = `Photo Sphere`;
  var request = new XMLHttpRequest();
  request.onload = function () {
    ID("infoStatus").textContent = "Parsing data...";
    // Metadata parsing witchcraft
    const data = JSON.parse(this.responseText.substring(4))[1][0];
    const tileSize = data[2][3][1][0];
    const bestZoom = (data[2][3][0].length - 1);

    if (bestZoom < zoom || zoom < 0) {
      zoom = bestZoom;
      document.getElementById("zoom").value = bestZoom;
    }

    const widthPX = data[2][3][0][zoom][0][1];
    const heightPX = data[2][3][0][zoom][0][0];
    const width = Math.ceil(widthPX / tileSize);
    const height = Math.ceil(heightPX / tileSize);

    prepCanvas(widthPX, heightPX);

    const copyright = data[4][1][0][0];
    ID("infoZooms").textContent = bestZoom;
    ID("infoCopyright").textContent = copyright;

    prepCanvas(widthPX, heightPX);

    ID("infoStatus").textContent = "Downloading tiles";
    const totalTiles = width * height;
    var processedTiles = 0;
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        requestImage(`https://lh3.ggpht.com/p/${sphereID}=x${x}-y${y}-z${zoom}`, (image) => {
          paintImage(image, x, y, heightPX, widthPX, tileSize, height);
          processedTiles++;
          if (processedTiles === totalTiles) {
            ID("infoStatus").textContent = "finished";
          }
        });
      }
    }
  };
  request.open("get", `https://www.google.com/maps/photometa/v1?authuser=0&hl=en&gl=us&pb=!1m4!1smaps_sv.tactile!11m2!2m1!1b1!2m2!1sen!2sus!3m3!1m2!1e10!2s${sphereID}!4m57!1e1!1e2!1e3!1e4!1e5!1e6!1e8!1e12!2m1!1e1!4m1!1i48!5m1!1e1!5m1!1e2!6m1!1e1!6m1!1e2!9m36!1m3!1e2!2b1!3e2!1m3!1e2!2b0!3e3!1m3!1e3!2b1!3e2!1m3!1e3!2b0!3e3!1m3!1e8!2b0!3e3!1m3!1e1!2b0!3e3!1m3!1e4!2b0!3e3!1m3!1e10!2b1!3e2!1m3!1e10!2b0!3e3`, true);
  request.send();

}

function requestImage(url, callback) {
  var req = new XMLHttpRequest();
  req.responseType = "arraybuffer";
  req.onload = function () {
    const blob = new Blob([this.response], { type: 'application/octet-binary' });
    var url = window.URL.createObjectURL(blob);
    const image = new Image();
    image.src = url;
    image.onload = () => {
      callback(image);
    };
  };
  req.open("get", url, true);
  req.send();
}

function prepCanvas(widthPX, heightPX) {
  canvas.width = widthPX;
  canvas2.width = widthPX;

  if (heightPX > maxCanvasHeight) {
    canvas2.height = heightPX / 2;
    canvas.height = heightPX / 2;
  } else {
    canvas2.height = 0;
    canvas2.width = 0;
    canvas.height = heightPX;
  }
}

function paintImage(img, x, y, heightPX, widthPX, tileSize, height) {
  if (heightPX > maxCanvasHeight) {
    if ((y > ((height / 2) - 1)) && height !== 1) {
      ctx2.drawImage(img, x * tileSize, y * tileSize - (heightPX / 2));
    } else {
      ctx.drawImage(img, x * tileSize, y * tileSize);
    }
  } else {
    ctx.drawImage(img, x * tileSize, y * tileSize);
  }
}
