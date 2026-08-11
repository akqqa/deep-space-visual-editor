import { sphereData, setSphereData, currentSpheres, globalSelection } from "./state.js";
import { toAlien } from "./editor.js";
import { removeSphere, addSphere, addSphereToGroup, removeSphereFromGroup } from "./spheres.js";
import { setLocalStorageSphereData, setSignalCounter } from "./persistence.js";
import { toggleGlobalSelection } from "./ui.js";

import * as THREE from 'three';

let sceneHistory = []
let sceneFuture = []
const MAX_HISTORY = 200;

export const getSnapshot = () => {
  const snapshot = sphereData.map(element => {
    element.mesh.geometry.computeBoundingSphere();
    const worldPos = new THREE.Vector3();
    element.mesh.getWorldPosition(worldPos);
    let p = toAlien(worldPos.x, worldPos.y, worldPos.z);
    return {
      x: p.x,
      y: p.y,
      z: p.z,
      diameter: element.mesh.geometry.boundingSphere.radius * 2,
      color: element.color,
      selected: currentSpheres.includes(element.mesh) ? true : false,
      global: globalSelection
    }
  });

  return snapshot;
}

// Should be called any time a change happens to the scene
export const addToHistory = () => {
  if (sceneHistory.length > MAX_HISTORY) {
    sceneHistory.shift();
  }
  const snapshot = getSnapshot();
  sceneHistory.push(snapshot);
  sceneFuture = [];
}

export const undo = () => {
  if (sceneHistory.length > 0) {
    const snapshot = sceneHistory.pop();

    // add current state redo
    if (sceneFuture.length > MAX_HISTORY) {
      sceneFuture.shift();
    }
    sceneFuture.push(getSnapshot());

    if (globalSelection) {
      toggleGlobalSelection();
    }

    sphereData.forEach(element => {
      removeSphereFromGroup(element.mesh);
      removeSphere(element.mesh, false);
    });
    setSphereData([]);
    // for each sphere, add to sphereData and scene
    let toggleGlobal = false;
    snapshot.forEach(element => {
      const mesh = addSphere(element.x, element.y, element.z, element.diameter, element.color, false, false);
      if (element.selected) {
        addSphereToGroup(mesh);
      }
      if (element.global) {
        toggleGlobal = true;
      }
    });
    if (toggleGlobal) {
      toggleGlobalSelection();
    }
    setLocalStorageSphereData();
    // UPDATE SIGNAL COUNT
    setSignalCounter();
  }
}

export const redo = () => {
  if (sceneFuture.length > 0) {
    const snapshot = sceneFuture.pop();

    // add current state to redo
    if (sceneHistory.length > MAX_HISTORY) {
      sceneHistory.shift();
    }
    sceneHistory.push(getSnapshot());

    if (globalSelection) {
      toggleGlobalSelection();
    }

    sphereData.forEach(element => {
      removeSphereFromGroup(element.mesh);
      removeSphere(element.mesh, false);
    });
    setSphereData([]);
    // for each sphere, add to sphereData and scene
    let toggleGlobal = false;
    snapshot.forEach(element => {
      const mesh = addSphere(element.x, element.y, element.z, element.diameter, element.color, false, false);
      if (element.selected) {
        addSphereToGroup(mesh);
      }
      if (element.global) {
        toggleGlobal = true;
      }
    });
    if (toggleGlobal) {
      toggleGlobalSelection();
    }
    setLocalStorageSphereData();
    // UPDATE SIGNAL COUNT
    setSignalCounter();
  }
}