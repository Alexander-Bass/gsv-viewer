'use strict';

//
// VARIABLES
//

var zoom = 0;
var downloadCount = 0;
var handler;
var infoDisplay;
var statusDisplay;
var previousId;
var loadButton;
var downloadButton;

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
  handler = new CanvasHandler(ID("lowerCanvas"), ID("upperCanvas"));

  {
    infoDisplay = ID("infoOutput");
    infoDisplay.clear = function () {
      this.innerHTML = "";
    };
    infoDisplay.setInfo = function (property, value) {
      let el;
      Array.from(this.childNodes).forEach((e) => {
        if (e.id == property) {
          el = e;
        }
      });
      if (el === undefined) {
        el = document.createElement("div");
        el.id = property;
        this.appendChild(el);
      }
      el.textContent = `${property}: ${value}`;
      // }
    };
  }
  {
    statusDisplay = ID("statusBox");
    statusDisplay.downloadProgress = ID("downloadProgress");
    statusDisplay.setProgress = function (done, of) {
      const percent = 100 * done / of;
      this.downloadProgress.value = percent;
      this.downloadProgress.textContent = `${percent}%`;
    };
    statusDisplay.show = function () {
      this.style.visibility = "inherit";
    };
    statusDisplay.hide = function () {
      this.style.visibility = "hidden";
    };
  }
  loadButton = ID("loadButton");
  downloadButton = ID("downloadButton");
  downloadButton.disabled = true;


  loadButton.addEventListener("click", () => {
    let [func, id] = parseURL(urlBox.value);
    new func(id).load();
  });

  downloadButton.addEventListener("click", () => {
    handler.download();
  });

  urlBox.addEventListener("input", () => {
    checkMetadata();
  });
  checkMetadata();
});

function checkMetadata() {
  const dlUrl = ID("downloadURL");


  const [cls, id] = parseURL(dlUrl.value);

  if (cls === false) {
    loadButton.disabled = true;
    dlUrl.style.border = "2px solid red";
    infoDisplay.clear();
    return;
  }
  if (loadButton === true) {
    return;
  }
  previousId = id;
  if (cls !== false) {
    const handle = new cls(id);
    handle.getMetadata().then((metadata) => {
      if (metadata === false) {
        loadButton.disabled = true;
        dlUrl.style.border = "2px solid red";
        return;
      } else {
        updateQualityRange(metadata.zooms);
      }
    });

    dlUrl.style.border = "2px solid green";
    loadButton.removeAttribute("disabled");
  }
}

function updateQualityRange(zooms) {
  const qualityContainer = ID("qualitySelector");
  qualityContainer.innerHTML = "";
  let qualityElements = [];
  for (let i = 0; i < zooms.length; i++) {
    const span = document.createElement("span");
    const zoomLevel = zooms[i];
    span.order = i;
    span.textContent = `${i + 1}: ${zoomLevel[0]}x${zoomLevel[1]}`;
    span.select = function () {
      deselectAll();
      this.classList.add("selected");
      zoom = this.order;
    };
    span.deselect = function () {
      this.classList.remove("selected");
    };
    span.addEventListener("click", (e) => {
      e.target.select();
    });
    qualityElements.push(span);
    qualityContainer.appendChild(span);
  }
  qualityElements[0].select();

  function deselectAll() {
    for (const e of qualityElements) {
      e.deselect();
    }
  }

}



function parseURL(url) {
  if (url.includes("panoid")) {
    const id = extractTextBetween(url, "panoid%3D", "%");

    return [GSVPath, id];
  } else if (url.includes("m4!1s") && url.includes("data=")) {
    const id = extractTextBetween(url, "m4!1s", "!2e");
    if (id.length > 22) {
      return [GSVSphere, id];
    } else {
      return [GSVPath, id];
    }
  } else if (url.includes("googleusercontent.com")) {
    const id = extractTextBetween(url, "googleusercontent.com%2Fp%2F", "%3");
    return [GSVSphere, id];
  } else {
    return [false];
  }
}


class CanvasHandler {
  maxCanvasHeight = 7000;//pixels
  doubleCanvas = false;
  constructor(upperCanvas, lowerCanvas) {
    this.upper = upperCanvas;
    this.lower = lowerCanvas;
    this.upperContext = upperCanvas.getContext("2d");
    this.lowerContext = lowerCanvas.getContext("2d");
  }

  setSize(widthPX, heightPX, tileSize) {
    this.upper.width = widthPX;
    this.lower.width = widthPX;
    this.tileSize = tileSize;

    if (heightPX > this.maxCanvasHeight) {
      this.lower.height = heightPX / 2;
      this.upper.height = heightPX / 2;
      this.doubleCanvas = true;
      this.lower.style = "";
    } else {
      this.doubleCanvas = false;
      this.lower.style = "display:none;";
      this.upper.height = heightPX;
    }
    this.upperContext = this.upper.getContext("2d");
    this.lowerContext = this.lower.getContext("2d");
  }
  paintImage(img, x, y, heightPX, widthPX, height) {
    if (this.doubleCanvas) {
      if ((y > ((height / 2) - 1)) && height !== 1) {
        this.upperContext.drawImage(img, x * this.tileSize, y * this.tileSize - (heightPX / 2));
      } else {
        this.lowerContext.drawImage(img, x * this.tileSize, y * this.tileSize);
      }
    } else {
      this.upperContext.drawImage(img, x * this.tileSize, y * this.tileSize);
    }
  }
  download() {
    if (this.doubleCanvas) {
      const link2 = document.createElement('a');
      link2.download = `bottom${downloadCount}.png`;
      link2.href = this.lower.toDataURL();
      link2.click();
      downloadCount++;
    }
    const link = document.createElement('a');
    link.download = `image${downloadCount}.png`;
    link.href = this.upper.toDataURL();
    link.click();
    downloadCount++;
  }

}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function angleToCompasPercentage(pos1, pos2) {
  const [lat1, lon1] = pos1;
  const [lat2, lon2] = pos2;
  const [latDif, lonDif] = [lat2 - lat1, lon2 - lon1];
  const angle = Math.atan2(latDif, lonDif);
  const x = (Math.cos(angle) * 48 + 48);
  const y = (-Math.sin(angle) * 48 + 48);
  return [x, y];
}

class PanoDownloader {

  constructor(id) {
    this.id = id;
  }

  async load() {
    this.meta = await this.getMetadata();
    infoDisplay.setInfo("Author", this.meta.copyright);
    // infoDisplay.setInfo("Location", `${this.meta.lat}, ${this.meta.lon}`);
    this.#plot();

    if ("nearme" in this.meta === true && experimental) {
      this.experimentalFeatures();
      ID("experimentalExpand").style.display = "block";
    } else {
      ID("experimentalExpand").style.display = "none";
    }
  }

  experimentalFeatures() {
    const yearSelector = ID("yearSelector");
    const container = ID("pointContainer");
    yearSelector.innerHTML = "";
    container.innerHTML = "";

    {
      let el = document.createElement("span");
      el.textContent = MONTHS[this.meta.date[1]] + " " + this.meta.date[0];
      el.id = "currentYear";
      yearSelector.appendChild(el);
    }

    const locations = this.meta.nearme.map((a) => a[0]);
    for (let i = 1; i < locations.length; i++) {
      if (this.meta.nearme[i][2] === undefined) {
        let [x, y] = angleToCompasPercentage([this.meta.lat, this.meta.lon], this.meta.nearme[i][1]);

        let el = document.createElement("div");
        el.classList.add("point");
        el.style.left = `${x}%`;
        el.style.top = `${y}%`;
        el.addEventListener("click", (e) => {
          new (Object.getPrototypeOf(this).constructor)(locations[i]).load();
        });
        container.appendChild(el);
      } else {
        let el = document.createElement("span");
        el.classList.add("yearButton");
        el.textContent = MONTHS[this.meta.nearme[i][2][1]] + " " + this.meta.nearme[i][2][0];
        if (this.meta.date === this.meta.nearme[i][2]) {
        }
        el.addEventListener("click", (e) => {
          new (Object.getPrototypeOf(this).constructor)(locations[i]).load();
        });
        yearSelector.appendChild(el);

      }
    }



  }

  async getMetadata() {
    infoDisplay.clear();
    infoDisplay.setInfo("Image ID", this.id);

    return fetch(this.formatMetadataURL()).then((response) => response.text())
      .then((responseText) => {
        return this.extractMetadata(responseText);
      }).catch((err) => { console.error(err); return false; });
  }

  async #plot() {
    loadButton.disabled = true;
    downloadButton.disabled = true;
    statusDisplay.show();
    statusDisplay.setProgress(0, 1);
    handler.setSize(this.meta.widthPX, this.meta.heightPX, this.meta.tileSize);

    const totalTiles = this.meta.width * this.meta.height;
    var processedTiles = 0;

    for (let x = 0; x < this.meta.width; x++) {
      for (let y = 0; y < this.meta.height; y++) {
        this.#downloadImage(this.formatImageUrl(x, y, zoom)).then((image) => {
          handler.paintImage(image, x, y, this.meta.heightPX, this.meta.widthPX, this.meta.height);
          processedTiles++;
          statusDisplay.setProgress(processedTiles, totalTiles);
          if (processedTiles === totalTiles) {
            loadButton.disabled = false;
            downloadButton.disabled = false;
            statusDisplay.hide();
          }
        });

      }
    }

  }

  async #downloadImage(url) {
    return fetch(url).then(response => response.blob()).then(imageBlob => {
      return new Promise(resolve => {
        const imageObjectURL = URL.createObjectURL(imageBlob);
        const image = new Image();
        image.src = imageObjectURL;
        image.onload = () => {
          resolve(image);
        };
      });
    });
  }
}

class GSVPath extends PanoDownloader {
  experimental = true;
  formatMetadataURL() {
    return (
      "https://www.google.com/maps/photometa/v1?authuser=0&pb=!1m4!1smaps_sv.tactile" +
      "!11m2!2m1!1b1!2m2!1sen!2sus!3m3!1m2!1e2!2s" +
      this.id +
      "!4m57!1e1!1e2!1e3!1e4!1e5!1e6!1e8!1e12!2m1!1e1!4m1!1i48!5m1!1e1!5m1!1e2!6m1!1e1!6m1!1e2!9m36!1m3!1e2!2b1!3e2!1m3!1e2!2b0!3e3!1m3!1e3!2b1!3e2!1m3!1e3!2b0!3e3!1m3!1e8!2b0!3e3!1m3!1e1!2b0!3e3!1m3!1e4!2b0!3e3!1m3!1e10!2b1!3e2!1m3!1e10!2b0!3e3"
    );
  }
  formatImageUrl(x, y, zoom) {
    return `https://streetviewpixels-pa.googleapis.com/v1/tile?cb_client=maps_sv.tactile&panoid=${this.id}&x=${x}&y=${y}&zoom=${zoom}&nbt=1&fover=0`;
  }
  extractMetadata(responseText) {
    let meta = {};
    const data = JSON.parse(responseText.substring(4))[1][0];
    meta.nearme = data[5]?.[0]?.[3]?.[0].map((a) => [a?.[0]?.[1], [a?.[2]?.[0]?.[2], a?.[2]?.[0]?.[3]], undefined]);
    data?.[5]?.[0]?.[8]?.forEach((a) => meta.nearme[a[0]][2] = a?.[1]);

    meta.tileSize = data[2][3]?.[1]?.[0];
    meta.zooms = data[2][3][0].map((a) => a[0]).map((b) => [b[1], b[0]]);
    meta.widthPX = meta.zooms[zoom][0];
    meta.lat = data[5][0][1][0][2];
    meta.lon = data[5][0][1][0][3];
    meta.heightPX = meta.zooms[zoom][1];
    meta.width = Math.ceil(meta.widthPX / meta.tileSize);
    meta.height = Math.ceil(meta.heightPX / meta.tileSize);
    meta.date = data[6][7];
    // meta.address = `${data[3]?.[2]?.[0]?.[0]} ${data[3]?.[2]?.[1]?.[0]}`;
    meta.copyright = data[4][0][0][0][0];
    return meta;
  }
}

class GSVSphere extends PanoDownloader {
  formatMetadataURL() {
    return (
      "https://www.google.com/maps/photometa/v1?authuser=0&hl=en&gl=us&pb=!1m4!1smaps_sv.tactile" +
      "!11m2!2m1!1b1!2m2!1sen!2sus!3m3!1m2!1e10!2s" +
      this.id +
      "!4m57!1e1!1e2!1e3!1e4!1e5!1e6!1e8!1e12!2m1!1e1!4m1!1i48!5m1!1e1!5m1!1e2!6m1!1e1!6m1!1e2!9m36!1m3!1e2!2b1!3e2!1m3!1e2!2b0!3e3!1m3!1e3!2b1!3e2!1m3!1e3!2b0!3e3!1m3!1e8!2b0!3e3!1m3!1e1!2b0!3e3!1m3!1e4!2b0!3e3!1m3!1e10!2b1!3e2!1m3!1e10!2b0!3e3"
    );
  }
  extractMetadata(responseText) {
    let meta = {};
    const data = JSON.parse(responseText.substring(4))[1][0];
    meta.tileSize = data[2][3][1][0];
    meta.bestZoom = (data[2][3][0].length - 1);
    meta.zooms = data[2][3][0].map((a) => a[0]).map((b) => [b[1], b[0]]);

    meta.widthPX = meta.zooms[zoom][0];
    meta.heightPX = meta.zooms[zoom][1];
    meta.width = Math.ceil(meta.widthPX / meta.tileSize);
    meta.height = Math.ceil(meta.heightPX / meta.tileSize);

    meta.copyright = data[4][1][0][0];
    return meta;
  }
  formatImageUrl(x, y, zoom) {
    return `https://lh3.ggpht.com/p/${this.id}=x${x}-y${y}-z${zoom}`;
  }
}