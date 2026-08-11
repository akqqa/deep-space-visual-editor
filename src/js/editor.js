import { $ } from './query.js';
import { addToHistory } from './history.js';
import { currentSpheres, sphereData, minX, maxX, minY, maxY, minZ, maxZ, minVol, maxVol, minColor, maxColor, transformControls, setTransformControls, globalSelection, setControlHeld, controlHeld, groupObject } from './state.js';
import { setLocalStorageSphereData, setSignalCounter } from './persistence.js';
import { selectSphere, deselectSphere, addSphere, removeSphere, removeSphereFromGroup, addSphereToGroup, deselectAllSpheres, removeSelectedSpheres } from './spheres.js';
import { undo, redo } from './history.js';
import { toggleOutlines, toggleGlobalSelection } from './ui.js';

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { RenderPixelatedPass } from 'three/addons/postprocessing/RenderPixelatedPass.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { ViewHelper } from 'three/addons/helpers/ViewHelper.js';
import * as holdEvent from "https://unpkg.com/hold-event@1.1.2/dist/hold-event.module.js";

import { setEditorState } from './state.js';

const cameraMovementSpeed = 0.02;
const cameraRotateSpeed = 0.002;

let movementEnabled = true;

let mouseDownPos = new THREE.Vector2;


// Editor / Renderer specific code

export const toggleMovementEnabled = () => {
  movementEnabled = !movementEnabled;
}

// Alien coords to three coords
export const toThree = (ax, ay, az) => {
  return { x: ax, y: az, z: -ay };
}

// Three coords to alien coords
export const toAlien = (tx, ty, tz) => {
  return { x: tx, y: -tz, z: ty };
}

// Helper method for calculating the sphere colors
// Visual Object colors are evaluated on a gradient [0, 64] to get RGB values. The full gradient linearly blends between keys. In the game, the keys are: 
// 0 - #FF5800 0-7
// 1 - #BBFF00 7-14
// 2 - #00CDFF 14-21
// 3 - #0084FF 21-28
// 4 - #4D00FF
// 5 - #FB39FF
// 6 - #FF0FD7
// 7 - #484848
// 8 - #636363
// 9 - #FFFFFF
// Code thanks to @elnico56 in discord!!!!
const COLORS = [
  "FF5800", "BBFF00",
  "00CDFF", "0084FF",
  "4D00FF", "FB39FF",
  "FF0FD7", "484848",
  "636363", "FFFFFF"
];

export const calculateColor = (value) => {
  let n = value / 64 * (COLORS.length - 1);
  let lo = Math.floor(n);
  let hi = Math.ceil(n);
  let c = getGradientColor(COLORS[lo], COLORS[hi], n % 1)
  return new THREE.Color().setRGB(c.r, c.g, c.b);
}

// Source - https://stackoverflow.com/a/27709336
// Posted by rjurado01, modified by community. See post 'Timeline' for change history
// Retrieved 2026-07-15, License - CC BY-SA 4.0
const getGradientColor = function (start_color, end_color, percent) {

  let gammaFactor = 1 / 1; // Some magic happened and this works. i think cause we are omputing it as rbg with 0-1 range?? but idk how thats different to hex

  // get colors
  let start_red = Math.pow(parseInt(start_color.substr(0, 2), 16) / 255, gammaFactor),
    start_green = Math.pow(parseInt(start_color.substr(2, 2), 16) / 255, gammaFactor),
    start_blue = Math.pow(parseInt(start_color.substr(4, 2), 16) / 255, gammaFactor);

  let end_red = Math.pow(parseInt(end_color.substr(0, 2), 16) / 255, gammaFactor),
    end_green = Math.pow(parseInt(end_color.substr(2, 2), 16) / 255, gammaFactor),
    end_blue = Math.pow(parseInt(end_color.substr(4, 2), 16) / 255, gammaFactor);


  // calculate new color
  let diff_red = end_red - start_red;
  let diff_green = end_green - start_green;
  let diff_blue = end_blue - start_blue;

  // Converts each component to 0-1 for rgb
  diff_red = ((diff_red * percent) + start_red);
  diff_green = ((diff_green * percent) + start_green);
  diff_blue = ((diff_blue * percent) + start_blue);

  return { r: diff_red, g: diff_green, b: diff_blue };
};

// Event listeners for sphere parameters changing
$("#posX").addEventListener("change", (event) => {
  addToHistory();
  const num = Math.min(Math.max(Number(Number(event.target.value).toFixed(1)), minX), maxX);
  event.target.value = num;
  currentSpheres[0].position.x = Number(event.target.value);
  setLocalStorageSphereData();
  setSignalCounter();
});
$("#posY").addEventListener("change", (event) => {
  addToHistory();
  const num = Math.min(Math.max(Number(Number(event.target.value).toFixed(1)), minY), maxY);
  event.target.value = num;
  currentSpheres[0].position.z = -Number(event.target.value);
  setLocalStorageSphereData();
  setSignalCounter();
});
$("#posZ").addEventListener("change", (event) => {
  addToHistory();
  const num = Math.min(Math.max(Number(Number(event.target.value).toFixed(1)), minZ), maxZ);
  event.target.value = num;
  currentSpheres[0].position.y = Number(event.target.value);
  setLocalStorageSphereData();
  setSignalCounter();
});
$("#volumeAmount").addEventListener("change", (event) => {
  addToHistory();
  const num = Math.min(Math.max(Number(Number(event.target.value).toFixed(1)), minVol), maxVol);
  event.target.value = num;
  currentSpheres[0].geometry.dispose();
  currentSpheres[0].geometry = new THREE.SphereGeometry(num / 2);
  setLocalStorageSphereData();
  setSignalCounter();
})
$("#volumeSlider").addEventListener("input", (event) => {
  const num = Math.min(Math.max(Number(Number(event.target.value).toFixed(1)), minVol), maxVol);
  event.target.value = num;
  currentSpheres[0].geometry.dispose();
  currentSpheres[0].geometry = new THREE.SphereGeometry(num / 2);
  setLocalStorageSphereData();
  setSignalCounter();
})
$("#volumeSlider").addEventListener("mousedown", () => {
  addToHistory(); // Only add to history on start!
})
$("#colorAmount").addEventListener("change", (event) => {
  addToHistory();
  const num = Math.min(Math.max(Math.round(Number(event.target.value)), minColor), maxColor);
  event.target.value = num;
  const c = calculateColor(num);
  currentSpheres[0].material.uniforms.objectColor.value.set(c);
  // ALSO SET FOR SPHEREDATA COLOR
  sphereData.find(x => x.mesh == currentSpheres[0]).color = num;
  setLocalStorageSphereData();
  setSignalCounter();
})
$("#colorSlider").addEventListener("input", (event) => {
  const num = Math.min(Math.max(Number(Number(event.target.value).toFixed(1)), minColor), maxColor);
  const c = calculateColor(num);
  currentSpheres[0].material.uniforms.objectColor.value.set(c);
  sphereData.find(x => x.mesh == currentSpheres[0]).color = num;
  setLocalStorageSphereData();
  setSignalCounter();
})
$("#colorSlider").addEventListener("mousedown", () => {
  addToHistory(); // Only add to history on start!
})

export const initialiseEditor = () => {
  // Create the scene
  let sceneDiv = document.getElementById("view");

  if (sceneDiv.getAttribute("data-disabled") === "true") {
    return;
  }

  sceneDiv.classList.add("imageScene");

  const scene = new THREE.Scene();
  const overlayScene = new THREE.Scene();
  let camera = new THREE.PerspectiveCamera(50, sceneDiv.clientWidth / sceneDiv.clientHeight, 0.1, 2000);
  camera.position.z = 18.5;
  let renderer = new THREE.WebGLRenderer();
  renderer.logarithmicDepthBuffer = true;
  renderer.setSize(sceneDiv.clientWidth, sceneDiv.clientHeight);
  sceneDiv.appendChild(renderer.domElement);
  let composer = new EffectComposer(renderer);
  const renderPixelatedPass = new RenderPixelatedPass(4, scene, camera);
  composer.addPass(renderPixelatedPass);
  const resolution = new THREE.Vector2(sceneDiv.clientWidth, sceneDiv.clientHeight);
  const outlinePass = new OutlinePass(resolution, scene, camera);
  composer.addPass(outlinePass);
  outlinePass.hiddenEdgeColor.set('0xFFFFFF');
  outlinePass.edgeStrength = 5;

  const bottomGrid = new THREE.GridHelper(30, 4, 0x13831F, 0x246E1A);
  bottomGrid.position.y = -8;
  bottomGrid.color
  const topGrid = new THREE.GridHelper(30, 4, 0x13831F, 0x246E1A);
  topGrid.position.y = 8;
  scene.add(bottomGrid);
  scene.add(topGrid);

  // viewhelper
  const viewHelper = new ViewHelper(camera, renderer.domElement);
  // viewHelper.location = {top: true, right: true, bottom: null, left: null}

  const orbitControls = new OrbitControls(camera, renderer.domElement);

  const tc = new TransformControls(camera, sceneDiv);
  tc.translationSnap = 1;
  tc.maxX = maxX;
  tc.minX = minX;
  tc.maxZ = -minY;
  tc.minZ = -maxY;
  tc.maxY = maxZ;
  tc.minY = minZ;
  setTransformControls(tc);

  // Set an observer to ensure the editor window is always sized correctly
  const observer = new ResizeObserver(() => {
    console.log("observerFired")
    camera.aspect = sceneDiv.clientWidth / sceneDiv.clientHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(sceneDiv.clientWidth, sceneDiv.clientHeight);
    composer.setSize(sceneDiv.clientWidth, sceneDiv.clientHeight);
  })
  observer.observe(sceneDiv);

  // CAMERA AND MOVEMENT

  const direction = new THREE.Vector3();
  function moveForward(distance) {
    camera.getWorldDirection(direction);
    camera.position.addScaledVector(direction, distance);
    orbitControls.target.addScaledVector(direction, distance);
  }

  function moveSideways(distance) {
    const e = camera.matrixWorld.elements;
    let dx = new THREE.Vector3();
    dx.set(e[0], e[1], e[2]);
    dx = dx.normalize();
    camera.position.addScaledVector(dx, distance);
    orbitControls.target.addScaledVector(dx, distance);
  }

  function moveUp(distance) {
    camera.position.addScaledVector(new THREE.Vector3(0, 1, 0), distance);
    orbitControls.target.addScaledVector(new THREE.Vector3(0, 1, 0), distance);
  }

  const wKey = new holdEvent.KeyboardKeyHold('KeyW', 16.666);
  const aKey = new holdEvent.KeyboardKeyHold('KeyA', 16.666);
  const sKey = new holdEvent.KeyboardKeyHold('KeyS', 16.666);
  const dKey = new holdEvent.KeyboardKeyHold('KeyD', 16.666);
  const shiftKey = new holdEvent.KeyboardKeyHold('ShiftLeft', 16.666);
  const spacebar = new holdEvent.KeyboardKeyHold('Space', 16.666);
  const leftArrow = new holdEvent.KeyboardKeyHold('ArrowLeft', 16.666);
  const rightArrow = new holdEvent.KeyboardKeyHold('ArrowRight', 16.666);
  const upArrow = new holdEvent.KeyboardKeyHold('ArrowUp', 16.666);
  const downArrow = new holdEvent.KeyboardKeyHold('ArrowDown', 16.666);

  aKey.addEventListener(holdEvent.HOLD_EVENT_TYPE.HOLDING, (event) => {
    if (movementEnabled) {
      moveSideways(-cameraMovementSpeed * event.deltaTime);
    }
  });
  dKey.addEventListener(holdEvent.HOLD_EVENT_TYPE.HOLDING, (event) => {
    if (movementEnabled) {
      moveSideways(cameraMovementSpeed * event.deltaTime);
    }
  });
  wKey.addEventListener(holdEvent.HOLD_EVENT_TYPE.HOLDING, (event) => {
    if (movementEnabled) {
      moveForward(cameraMovementSpeed * event.deltaTime);
    }
  });
  sKey.addEventListener(holdEvent.HOLD_EVENT_TYPE.HOLDING, (event) => {
    if (movementEnabled) {
      moveForward(-cameraMovementSpeed * event.deltaTime);
    }
  });
  spacebar.addEventListener(holdEvent.HOLD_EVENT_TYPE.HOLDING, (event) => {
    if (movementEnabled) {
      moveUp(cameraMovementSpeed * event.deltaTime);
    }
  });
  shiftKey.addEventListener(holdEvent.HOLD_EVENT_TYPE.HOLDING, (event) => {
    if (movementEnabled) {
      moveUp(-cameraMovementSpeed * event.deltaTime);
    }
  });
  leftArrow.addEventListener(holdEvent.HOLD_EVENT_TYPE.HOLDING, (event) => {
    orbitControls.rotateLeft(cameraRotateSpeed * event.deltaTime);
  });
  rightArrow.addEventListener(holdEvent.HOLD_EVENT_TYPE.HOLDING, (event) => {
    orbitControls.rotateLeft(-cameraRotateSpeed * event.deltaTime);
  });
  upArrow.addEventListener(holdEvent.HOLD_EVENT_TYPE.HOLDING, (event) => {
    orbitControls.rotateUp(cameraRotateSpeed * event.deltaTime);
  });
  downArrow.addEventListener(holdEvent.HOLD_EVENT_TYPE.HOLDING, (event) => {
    orbitControls.rotateUp(-cameraRotateSpeed * event.deltaTime);
  });

  // EDITOR MOUSE + KEYBOARD CONTROLS

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  transformControls.addEventListener("dragging-changed", (event) => { // Disable orbit controls when dragging transformcontrols
    orbitControls.enabled = !event.value;
    if (event.value == true) {
      addToHistory();
    }
    // Updates localstorage
    setLocalStorageSphereData();
    setSignalCounter();
  });
  transformControls.addEventListener("change", () => {
    if (globalSelection || !currentSpheres[0]) {
      return;
    }
    // Update parameters in ui
    let p = toAlien(currentSpheres[0].position.x, currentSpheres[0].position.y, currentSpheres[0].position.z);
    $("#posX").value = p.x.toFixed(1);
    $("#posY").value = p.y.toFixed(1);
    $("#posZ").value = p.z.toFixed(1);
  })

  // Sphere selection
  sceneDiv.addEventListener("mousedown", (event) => {
    mouseDownPos.set(event.clientX, event.clientY);
  });
  sceneDiv.addEventListener("click", (event) => {
    // CHECK IF MOUSE DIDNT MOVE SINCE MOUSEDOWN, ONLY COUNT AS CLICK THEN
    let newMousePos = new THREE.Vector2(event.clientX, event.clientY);
    if (!newMousePos.equals(mouseDownPos)) {
      return;
    }
    if (globalSelection) {
      toggleGlobalSelection();
    }

    // Handle the raycasting
    const rect = sceneDiv.getBoundingClientRect();
    mouse.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(sphereData.map(sphere => sphere.mesh), false);
    if (intersects.length > 0) { // ADD CHECKING FOR CTRLHELD AND ADDING/REMOVING SPHERE FROM GROUP IF SO
      if (controlHeld) { // run addtogroup if control is held and a sphere is clicked
        // If an already selected sphere is clicked, remove from group. if not selected already, add to group
        if (currentSpheres.includes(intersects[0].object)) {
          removeSphereFromGroup(intersects[0].object);
        } else {
          addSphereToGroup(intersects[0].object);
        }
      } else { // If control not held, just run a regular selection
        selectSphere(intersects[0].object);
      }
    } else { // If empty space is clicked, deselect all spheres no matter what
      deselectAllSpheres();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.code == "ControlLeft") {
      // If control held, transform scale goes to 0.1
      transformControls.translationSnap = 0.1;
      setControlHeld(true);
    }
    if (event.code == "Delete") {
      if (globalSelection) {
        addToHistory();
        toggleGlobalSelection();
        sphereData.forEach(element => {
          removeSphere(element.mesh, false);
        });
        setSignalCounter();
      } else if (currentSpheres[0]) {
        removeSelectedSpheres();
      }
    }
    if (event.code == "KeyC") {
      if (globalSelection) return;
      if (currentSpheres.length == 1) {
        currentSpheres[0].geometry.computeBoundingSphere();
        const color = sphereData.find(x => x.mesh == currentSpheres[0]).color;
        let p = toAlien(currentSpheres[0].position.x, currentSpheres[0].position.y, currentSpheres[0].position.z);
        addSphere(p.x, p.y, p.z, currentSpheres[0].geometry.boundingSphere.radius * 2, color, true);
      } else if (currentSpheres.length > 1) { // Copy a group
        addToHistory();
        let newlySelected = [];
        let worldPos = new THREE.Vector3();
        currentSpheres.forEach(sphere => {
          sphere.geometry.computeBoundingSphere();
          const color = sphereData.find(x => x.mesh == sphere).color;
          sphere.getWorldPosition(worldPos);
          let p = toAlien(worldPos.x, worldPos.y, worldPos.z); // need to get world coordinates.
          newlySelected.push(addSphere(p.x, p.y, p.z, sphere.geometry.boundingSphere.radius * 2, color, false, false));
        });
        setSignalCounter();
        deselectAllSpheres();
        newlySelected.forEach(sphere => {
          addSphereToGroup(sphere);
        });
      }
    }
    if (event.code == "KeyZ") {
      undo();
    }
    if (event.code == "KeyX") {
      redo();
    }
    if (event.code == "KeyT") {
      toggleMovementEnabled();
    }

    // Camera based controls
    if (event.code == "KeyF" && currentSpheres[0]) {
      if (currentSpheres.length == 1) {
        orbitControls.target.copy(currentSpheres[0].position);
      } else {
        orbitControls.target.copy(groupObject.position);
      }
      // Could improve by making it also rescale to fit object in
    }
    // Reset to initial camera position
    if (event.code == "KeyR") {
      camera.position.x = 0;
      camera.position.y = 0;
      camera.position.z = 18.5;
      orbitControls.target.copy(new THREE.Vector3(0, 0, 0));
    }
    if (event.code == "KeyQ") {
      const offset = camera.position.clone().sub(orbitControls.target); // Get vector from target to camera

      const radius = Math.sqrt(offset.x * offset.x + offset.z * offset.z); // Calculate the horziontal distance
      const currentAngle = Math.atan2(offset.x, offset.z); // Convert offset vector into angle

      // Snap to 90 degrees rotated left
      let newAngle = (Math.ceil(currentAngle / (Math.PI / 2)) * (Math.PI / 2)) - Math.PI / 2; // Divide the current angle by 90 degrees, and get the ceiling then subtract 90, giving the next increment of 90 degrees left.

      // Normalise angle to prevent wraparound
      if (newAngle <= -Math.PI) {
        newAngle += Math.PI * 2;
      }
      if (newAngle > Math.PI) {
        newAngle -= Math.PI * 2;
      }

      // Set camera to the targets position on the correct side multiplied by the radius to be the correct distance away, keeping y (height) the same
      camera.position.set(orbitControls.target.x + Math.sin(newAngle) * radius, camera.position.y, orbitControls.target.z + Math.cos(newAngle) * radius);
      camera.lookAt(orbitControls.target);
      orbitControls.update();
    }
    if (event.code == "KeyE") {
      const offset = camera.position.clone().sub(orbitControls.target); // Get vector from target to camera

      const radius = Math.sqrt(offset.x * offset.x + offset.z * offset.z); // Calculate the horziontal distance
      const currentAngle = Math.atan2(offset.x, offset.z); // Convert offset vector into angle

      // Snap to 90 degrees rotated left
      let newAngle = (Math.floor(currentAngle / (Math.PI / 2)) * (Math.PI / 2)) + Math.PI / 2; // Divide the current angle by 90 degrees, and get the ceiling then add 90, giving the next increment of 90 degrees left.

      // Normalise angle to prevent wraparound
      if (newAngle <= -Math.PI) {
        newAngle += Math.PI * 2;
      }
      if (newAngle > Math.PI) {
        newAngle -= Math.PI * 2;
      }

      // Set camera to the targets position on the correct side multiplied by the radius to be the correct distance away, keeping y (height) the same
      camera.position.set(orbitControls.target.x + Math.sin(newAngle) * radius, camera.position.y, orbitControls.target.z + Math.cos(newAngle) * radius);
      camera.lookAt(orbitControls.target);
      orbitControls.update();
    }

    if (event.code == "Tab") {
      if (globalSelection) return;
      event.preventDefault();
      if (currentSpheres[0]) {
        const index = sphereData.findIndex(x => x.mesh == currentSpheres[0]);
        console.log("index: " + index)
        if (index >= sphereData.length - 1) {
          deselectSphere();
        } else {
          deselectSphere();
          console.log(sphereData[index + 1].mesh);
          selectSphere(sphereData[index + 1].mesh);
        }
      }
      // If no currrentSphere yet spheres exist
      else if (sphereData.length > 0) {
        //  Select 1st sphere
        selectSphere(sphereData[0].mesh);
      }
    }

    if (event.code == "KeyG") { // Move into global select mode (for global translations)
      toggleGlobalSelection();
    }

    if (event.code == "KeyO") {
      toggleOutlines();
    }
  });

  window.addEventListener("keyup", (event) => {
    if (event.code == "ControlLeft") {
      // If control released, transform scale goes to 1
      transformControls.translationSnap = 1;
      setControlHeld(false);
    }
  })

  function animate() {
    orbitControls.update();
    composer.render(scene, camera); // renders composer
    renderer.autoClear = false; // disables to prevent clearing before next render
    renderer.render(overlayScene, camera);
    if (viewHelper.animating) {
      // eslint-disable-next-line no-undef
      viewHelper.update(delta);
    }
    viewHelper.render(renderer);
    renderer.autoClear = true; // reenables to clear previous frame for next loop
  }
  renderer.setAnimationLoop(animate);

  setEditorState({ camera, renderer, composer, sceneDiv, scene, overlayScene, orbitControls, outlinePass });
}