import { $ } from "./query.js";
import { scene, transformControls, overlayScene, sphereData, globalSelection,  setGlobalSelection, globalObject, setGlobalObject, outlinesEnabled, outlinePass, currentSphere, setOutlinesEnabled } from "./state.js";
import { selectSphere, deselectSphere } from "./spheres.js";

import * as THREE from 'three';

// Use tippy.js to add tooltips
export const addTooltips = () => {
  const c = (sel, content) => tippy(sel, {
    content,
    duration: 0,
    hideOnClick: false,
    arrow: false,
    placement: "bottom"
  })
  c("#import-button", "Import model");
  c("#export-button", "Export model");
  c("#copy-message-signals", "Copy Signals");
  c("#copy-message-text", "Copy Text");
  c("#download-gltf-file", "Download .GLB");
  c("#dscr", "Open Deep Space Communication Relay");
  c("#retheme", "Change Theme");
  c("#toggle-sidebar", "Toggle sidebar");
  c(".signal-count", "How many signals the model uses. Over 2000 cannot be sent in DSCR.");
  // Credit tooltips not working :(
  c("#importSnowman", "By Dixonary");
  c("#importStarryNight", "By Konstans");
}

// Sphere ui input logic

export const validateSphereNumber = (event) => {
  // Get value entered and select that sphere. if no value / incorrect, set to blank and deselect
  let sphereNumber = event.target.valueAsNumber;

  if (!Number.isInteger(sphereNumber) || sphereNumber < 0 || sphereData.length == 0) {
    event.target.value = "";
    deselectSphere();
    return;
  }

  if (sphereNumber >= sphereData.length) {
    sphereNumber = sphereData.length - 1;
  }

  selectSphere(sphereData[sphereNumber].mesh);
}

$("#sphereNumber").addEventListener("change", validateSphereNumber);
$("#sphereNumber").addEventListener("blur", validateSphereNumber);

$("#sphereNumber").addEventListener("keydown", (event) => {
  if (event.key === "ArrowUp") {
    if (event.target.value === "") {
      event.preventDefault(event);
      event.target.value = 0;
      validateSphereNumber(event);
      return;
    } else if (event.target.value >= sphereData.length - 1) {
      event.preventDefault(event);
      event.target.value = "";
      validateSphereNumber(event);
      return;
    }
  }
  if (event.key === "ArrowDown") {
    if (event.target.value === "") {
      event.preventDefault(event);
      if (sphereData.length > 0) {
        console.log("exists")
        event.target.value = sphereData.length - 1;
      } else {
        event.target.value = "";
      }
      validateSphereNumber(event);
      return;
    } else if (event.target.value === "0") {
      event.preventDefault(event);
      event.target.value = "";
      validateSphereNumber(event);
      return;
    }
  }
});

export const toggleGlobalSelection = () => {
  setGlobalSelection(!globalSelection);

  if (globalSelection) {
    // Start global selection logic. bind an invisible object to the center of the screen, bind the movement logic to moving every sphere if globalselection is toggled, disable clicking anything else or the screen excet the translation controls, disable the spheredata to the side, basically disable everyhting if this is true
    deselectSphere();
    setGlobalObject(new THREE.Object3D());
    const [ax,ay,az] = getAveragePosition();
    globalObject.position.set(ax, ay, az); // Alien coords!
    scene.add(globalObject);
    transformControls.attach(globalObject);
    overlayScene.add(transformControls.getHelper());
    sphereData.forEach((sphere) => {
      globalObject.attach(sphere.mesh);
    });
    if (outlinesEnabled) {
      outlinePass.selectedObjects = sphereData.map(sphere => sphere.mesh);
    }
  } else {
    transformControls.detach();
    overlayScene.remove(transformControls.getHelper());
    scene.remove(globalObject);
    setGlobalObject(null);
    sphereData.forEach((sphere) => {
      scene.attach(sphere.mesh);
    });
    if (outlinesEnabled) {
      outlinePass.selectedObjects = [];
    }
  }
}

export const toggleOutlines =() => {
  setOutlinesEnabled(!outlinesEnabled);

  localStorage.setItem("outlines", outlinesEnabled);

  if (outlinesEnabled) { // If just reenabled, make current selection outlined
    if (!globalSelection) {
      if (currentSphere) {
        outlinePass.selectedObjects = [currentSphere];
      } else {
        outlinePass.selectedObjects = [];
      }
    } else {
      outlinePass.selectedObjects = sphereData.map(sphere => sphere.mesh);
    }
  } else { // Disable all outlines
    outlinePass.selectedObjects = [];
  }
}

export const getAveragePosition = () => {
  let ax = 0;
  let ay = 0;
  let az = 0;
  let weightSum = 0
  sphereData.forEach(sphere => {
    const radius = sphere.mesh.geometry.boundingSphere.radius;
    weightSum += radius;
    ax += sphere.mesh.position.x * radius;
    ay += sphere.mesh.position.y * radius;
    az += sphere.mesh.position.z * radius;
  });

  ax = Math.round((ax / weightSum) * 10) / 10;
  ay = Math.round((ay / weightSum) * 10) / 10;
  az = Math.round((az / weightSum) * 10) / 10;

  return [ax,ay,az];
}

export const initialiseOutlines = () => {
  const outlines = localStorage.getItem("outlines");
  if (outlines === "false") {
    toggleOutlines();
  }
}