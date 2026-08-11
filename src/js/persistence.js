import { $ } from "./query.js";
import { sphereData, setSphereData, currentSignalCount, setCurrentSignalCount, globalSelection } from "./state.js";
import { addSphere, removeSphere, selectSphere } from "./spheres.js";
import { toAlien, calculateColor } from "./editor.js";
import { parseText, parseSphereData } from "./parsing.js";
import { addToHistory } from "./history.js";
import { toggleGlobalSelection } from "./ui.js";
import { getRawTranslation } from "./translation.js";

import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

// Loads sphereData (as an array of meshes) into the editor scene
export const loadSphereData = (text) => {
  if (globalSelection) {
    toggleGlobalSelection();
  }
  // import is a plain string
  // first convert to signal array
  // next pase with parseSphereData
  // then for each, add to spheredata and add to scene (then deselect current sphere)
  let signals = parseText(text);
  let importSphereData = parseSphereData(signals);
  if (importSphereData == false || importSphereData.length == 0) {
    return false;
  }

  addToHistory();
  // delete all current spheres
  sphereData.forEach(element => {
    removeSphere(element.mesh, false);
  });
  setSphereData([]);
  // for each sphere, add to sphereData and scene
  importSphereData.forEach(element => {
    addSphere(element[0], element[1], element[2], element[3], element[4], false, false);
  });
  setLocalStorageSphereData();
  // UPDATE SIGNAL COUNT
  setSignalCounter();

  console.log(JSON.stringify(getCurrentSignals()));
  return true;
}

export const setLocalStorageSphereData = () => {
  let data = [];
  sphereData.forEach(element => {
    const worldPos = new THREE.Vector3();
    element.mesh.getWorldPosition(worldPos);
    let p = toAlien(worldPos.x, worldPos.y, worldPos.z);
    let res = [];
    res[0] = p.x;
    res[1] = p.y;
    res[2] = p.z;
    element.mesh.geometry.computeBoundingSphere();
    res[3] = element.mesh.geometry.boundingSphere.radius * 2;
    res[4] = element.color // set to colour backwards compute method when made
    data.push(res);
  });
  localStorage.setItem("sphereData", JSON.stringify(data));
}

export const loadLocalStorageSphereData = () => {
  const data = localStorage.getItem("sphereData");
  const localStorageSphereData = JSON.parse(data);
  if (localStorageSphereData.length == 0) {
    addSphere(0, 0, 0, 2, 64, false, false);
    // UPDATE SIGNAL COUNT
    setSignalCounter();
    selectSphere(sphereData[0].mesh);
    return;
  }
  console.log("HITHERE " + data)
  sphereData.forEach(element => {
    removeSphere(element.mesh);
  });
  setSphereData([]);
  // for each sphere, add to sphereData and scene
  localStorageSphereData.forEach(element => {
    addSphere(element[0], element[1], element[2], element[3], element[4], false, false);
  });
  // UPDATE SIGNAL COUNT
  setSignalCounter();
}

// Takes the mesh spheredata and transforms it into a valid render array
export const getCurrentSignals = () => {
  if (sphereData.length == 0) {
    return false;
  }
  let res = [-53, -14];
  sphereData.forEach((element) => {
    element.mesh.geometry.computeBoundingSphere();
    const geometryRadius = element.mesh.geometry.boundingSphere.radius;
    const worldPos = new THREE.Vector3();
    element.mesh.getWorldPosition(worldPos);
    let p = toAlien(worldPos.x, worldPos.y, worldPos.z);

    const [posX, posY, posZ, diameter] = [
      p.x,
      p.y,
      p.z,
      geometryRadius * 2
    ].map(v => {
      let resArray = []
      // Set negative signal if applicable
      if (v < 0) {
        resArray.push(-1)
      }
      v = Math.abs(v);
      v = Number(v.toFixed(1));  // REQUIRED OR THE EXPORTS TRUNCATE WHEN GLOBAL SELECT AND IT MESSES EVERYTHING UP
      const stringV = v.toString();
      if (stringV.includes(".")) {
        const decimalIndex = stringV.indexOf(".");
        resArray.push(Number(stringV.slice(0, decimalIndex))); // Push the number before the .
        resArray.push(-10);
        resArray.push(Number(stringV[decimalIndex + 1]));
      } else {
        resArray.push(v)
      }
      return resArray; 
    });

    res = res.concat([-52, ...posX, -3, ...posY, -3, ...posZ, -3, ...diameter, -3, element.color, -3])
  });
  res.pop();
  res.push(-15);
  return res;
}

// Takes the mesh spheredata and transforms it into a valid render string
export const sphereDataToExportString = () => {
  const res = getCurrentSignals();
  return getRawTranslation(res);
}

export const sphereDataToExportSignals = () => {
  const res = getCurrentSignals();
  let signals = "";
  res.forEach(element => {
    if (element < 0) {
      signals += "|" + element.toString() + " ";
    } else {
      signals += element.toString() + " ";
    }
  });
  console.log(signals)
  return signals;
}

export const sphereDataToGltf = () => {
  const exportGroup = new THREE.Group();
  sphereData.forEach(({ mesh, color }) => {
    console.log(mesh.material.color);
    const clone = mesh.clone();
    clone.material = new THREE.MeshStandardMaterial({ // Have to add material cause custom shader wont work
      color: calculateColor(color)
    });
    exportGroup.add(clone);
  });

  const exporter = new GLTFExporter();
  exporter.parse(
    exportGroup,
    (result) => {
      const blob = new Blob([result], { type: 'application/octet-stream' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'visual.glb';
      link.click();
      URL.revokeObjectURL(link.href);
    },
    console.error,
    { binary: true }
  );
}

// Called after every operation (excluding adds/removes where history isnt saved, the responsibility is for whatever bulk calls them)
export const setSignalCounter = () => {
  const count = getCurrentSignals();
  const newSignalCount = count ? count.length : 0;
  $("#signalAmount").innerHTML = newSignalCount;
  if (currentSignalCount <= 2000 && newSignalCount > 2000) {
    alert("Warning: You are over the 2000 signal limit. You can still edit the model, but the model cannot be sent in the DSCR unless the signal count is 2000 or below.")
  }
  setCurrentSignalCount(newSignalCount);
}

export const initialisePersistence = () => {
  if (!localStorage.getItem("sphereData")) {
    setLocalStorageSphereData();
  }

  // Import locally stored spheres
  loadLocalStorageSphereData();
}