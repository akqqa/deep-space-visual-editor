import { $ } from "./query.js";
import { scene, sphereData, setSphereData, currentSpheres, setCurrentSpheres, transformControls, overlayScene, outlinesEnabled, outlinePass, setGroupObject, groupObject, toggleTransformMode } from "./state.js";
import { calculateColor, toAlien, toThree } from "./editor.js";
import { setLocalStorageSphereData, setSignalCounter } from "./persistence.js";
import { addToHistory } from "./history.js";
import { getAveragePosition } from "./ui.js";

import * as THREE from 'three';

export const createSphere = (x, y, z, radius, color, scene) => {
  const sphere = new THREE.SphereGeometry(radius / 2);
  // map the color - using the key levels apples described to match the game and interpolatee between
  let c = calculateColor(color);
  // https://medium.com/@aurelienagtn/introduction-to-shaders-with-three-js-create-an-animated-sphere-d4920fbab126
  // https://learnopengl.com/code_viewer_gh.php?code=src/2.lighting/2.2.basic_lighting_specular/2.2.basic_lighting.fs
  // https://discourse.threejs.org/t/instance-mesh-and-normals-with-transformations/60958
  const mat = new THREE.ShaderMaterial({
    vertexShader: `
        varying vec3 Normal;
        varying vec3 camDir;
        
        void main() {
        
        mat3 normalMatrix = mat3(modelMatrix);
        Normal = normalize( normalMatrix * normal );

        vec3 sphereCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        camDir = normalize(cameraPosition - sphereCenter);

        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        varying vec3 Normal;  
        varying vec3 camDir;
        
        uniform vec3 lightPos; 
        uniform vec3 lightColor;
        uniform vec3 objectColor;
        
        void main()
        {
            // diffuse 
            float diffuseStrength = 0.93;
            vec3 norm = normalize(Normal);
            vec3 lightDir = camDir;
            float diff = max(dot(norm, lightDir), 0.0);
            vec3 diffuse = diff * lightColor * diffuseStrength;

            // specular
            float specularStrength = 0.2;
            vec3 viewDir = camDir;
            vec3 reflectDir = reflect(-lightDir, norm);  
            float spec = pow(max(dot(viewDir, reflectDir), 0.0), 16.0);
            vec3 specular = specularStrength * spec * lightColor;  
                
            vec3 result = ( specular + diffuse) * objectColor;
            gl_FragColor  = vec4(result, 1.0);
        } 
    `,
    uniforms: {
      lightColor: { value: new THREE.Color(0xffffff) },
      objectColor: { value: c },
    }
  });

  const mesh = new THREE.Mesh(sphere, mat);
  const p = (toThree(x, y, z))
  mesh.position.set(p.x, p.y, p.z); // Alien coords!
  scene.add(mesh);

  return mesh;
}

// Helper methods to add and remove a given sphere, handled the spheredata and selection logic
export const addSphere = (x, z, y, diameter, color, select, saveHistory = true) => {
  if (saveHistory) {
    addToHistory();
  }
  const sphereMesh = createSphere(x, z, y, diameter, color, scene);
  sphereData.push({ mesh: sphereMesh, color: color });
  if (select) {
    deselectSphere();
    selectSphere(sphereMesh);
  }
  setLocalStorageSphereData();
  // UPDATE SIGNAL COUNT only if history is also saved (aka not bulk to reduce lag)
  if (saveHistory) {
    setSignalCounter();
  }

  // Return the mesh
  return sphereMesh;
}

export const removeSphere = (sphereMesh, saveHistory = true) => {
  if (saveHistory) {
    addToHistory();
  }
  let index = undefined;
  if (currentSpheres[0] == sphereMesh && currentSpheres.length == 1) {
    // Select previous sphere if deleting current!
    index = sphereData.findIndex(x => x.mesh == currentSpheres[0]);
    deselectSphere();
  }
  scene.remove(sphereMesh);
  sphereMesh.geometry.dispose();
  sphereMesh.material.dispose();
  setSphereData(sphereData.filter(item => item.mesh !== sphereMesh));
  setLocalStorageSphereData();

  // Select the previous sphere if deleted a selected sphere
  if (index !== undefined) {
    console.log(index);
    if (index == 0) {
      if (sphereData.length != 0) {
        selectSphere(sphereData[sphereData.length - 1].mesh,);
      }
    } else {
      // Even though spheredata was filtered, we can access this fine as the index before hasnt been effected
      selectSphere(sphereData[index - 1].mesh);
    }
  }

  // UPDATE SIGNAL COUNT only if history is also saved (aka not bulk to reduce lag)
  if (saveHistory) {
    setSignalCounter();
  }
}

// For use when deleting selected spheres
export const removeSelectedSpheres = () => {
  if (currentSpheres.length == 1) {
    removeSphere(currentSpheres[0], true);
    return;
  }
  addToHistory();
  let currentClone = [...currentSpheres];
  currentClone.forEach(sphere => {
    removeSphereFromGroup(sphere);
    scene.remove(sphere);
    sphere.geometry.dispose();
    sphere.material.dispose();
    setSphereData(sphereData.filter(item => item.mesh !== sphere));
  });
  setLocalStorageSphereData();
  setSignalCounter();
}

// Logic  for creating the group and the object must be put here! or in other mehtods that are called with the ctrl click / drag

// Add logic for enabling the parameters here
export const selectSphere = (sphere) => {
  // Clear current selection gracefully
  clearAllSelections();

  // Set transform mode to transform as rotation is meaningless
  // Note: since selectSphere is called more than necessary, it will reset even on global toggle off, etc.
  if (transformControls.mode == "rotate") {
    toggleTransformMode();
  }

  setCurrentSpheres([sphere]);
  transformControls.attach(currentSpheres[0]);
  overlayScene.add(transformControls.getHelper());

  if ($("#sphereHeaderText").getAttribute("data-original") != "[-52]") {
    $("#sphereHeaderText").setAttribute("data-original", "[-52]");
    $("#sphereHeaderText").removeAttribute("data-status");
  }
  $("#sphere-parameters").setAttribute("data-disabled", "false");
  $("#group-parameters").setAttribute("data-disabled", "true");
  $("#sphereNumber").removeAttribute("hidden");
  // Set volume and color parameters to the correct values! (xyz are handled already but i cant remember where?? lol oh well)
  sphere.geometry.computeBoundingSphere();
  const geometryDiameter = sphere.geometry.boundingSphere.radius * 2;
  $("#volumeAmount").value = Number(geometryDiameter.toFixed(1));
  $("#volumeSlider").value = Number(geometryDiameter.toFixed(1));
  $("#colorAmount").value = sphereData.find(x => x.mesh == currentSpheres[0]).color;
  $("#colorSlider").value = sphereData.find(x => x.mesh == currentSpheres[0]).color;
  // Update the number of the sphere!
  let index = sphereData.findIndex(x => x.mesh == currentSpheres[0]);
  $("#sphereNumber").value = index;
  //  Add to outline pass
  if (outlinesEnabled) {
    outlinePass.selectedObjects = [sphere];
  }

}

export const deselectSphere = () => {
  transformControls.detach();
  overlayScene.remove(transformControls.getHelper());
  setCurrentSpheres([]);
  $("#sphere-parameters").setAttribute("data-disabled", "true");
  $("#sphereNumber").value = null;
  // Remove from outline pass
  if (outlinesEnabled) {
    outlinePass.selectedObjects = [];
  }
}

// Adding spheres to group - case for no spheres means only one sphere should be added. if this is the case, the handler will call selectSphere instead on a click action
export const addSphereToGroup = (sphere) => {
  if (currentSpheres.length < 1) {
    selectSphere(sphere);
    return;
  }
  setCurrentSpheres([...currentSpheres, sphere]);
  // Create/move group object and bind accordingly
  if (currentSpheres.length == 2) { // If the first addition to a group, instantiate the groupObject with the original sphere attached
    setGroupObject(new THREE.Object3D());
    // Add first sphere to this group
    groupObject.attach(currentSpheres[0]);
    // Setup for new groupObject
    scene.add(groupObject);
    transformControls.attach(groupObject);
    overlayScene.add(transformControls.getHelper());
  }
  // Move groupObject to new position and attach new sphere
  groupObject.attach(sphere);
  repositionGroup(currentSpheres);
  if (outlinesEnabled) {
    outlinePass.selectedObjects = currentSpheres;
  }
  // Change parameters
  if ($("#sphereHeaderText").getAttribute("data-original") != "[-19]") {
    $("#sphereHeaderText").setAttribute("data-original", "[-19]");
    $("#sphereHeaderText").removeAttribute("data-status");
  }
  $("#sphere-parameters").setAttribute("data-disabled", "true");
  $("#group-parameters").setAttribute("data-disabled", "false");
  $("#sphereNumber").setAttribute("hidden", "true");

  let worldPos = new THREE.Vector3();
  groupObject.getWorldPosition(worldPos);
  let p = toAlien(worldPos.x, worldPos.y, worldPos.z);
  $("#groupPosX").value = p.x.toFixed(1);
  $("#groupPosY").value = p.y.toFixed(1);
  $("#groupPosZ").value = p.z.toFixed(1);

  $("#groupColorSlider").value = null;
  $("#groupColorAmount").value = null;
  
}

// Removing spheres from group - case for two spheres means it should no longer be a group and instead a regular selection. should never be called in the case of one sphere
export const removeSphereFromGroup = (sphere) => {
  if (!currentSpheres.includes(sphere)) { 
    return;
  }
  if (currentSpheres.length < 2) {
    deselectSphere(sphere);
    return;
  }
  setCurrentSpheres(currentSpheres.filter((s) => s != sphere)); // Filters out the sphere we want to deselect
  if (currentSpheres.length == 1) { // If removing a sphere to leave only one, we must destroy the groupObject and perform a standard selection on the final sphere
    transformControls.detach();
    overlayScene.remove(transformControls.getHelper());
    scene.attach(sphere);
    scene.attach(currentSpheres[0]);
    selectSphere(currentSpheres[0]); // Is this valid???? check if bugs occur
    scene.remove(groupObject);
    setGroupObject(null);
  } else {  // Otherwise, move groupobject and handle detachment of removed sphere
    scene.attach(sphere);
    repositionGroup(currentSpheres);
  }
  if (outlinesEnabled) {
    outlinePass.selectedObjects = currentSpheres;
  }

}

// 
export const clearAllSelections = () => {
  if (groupObject) {
    transformControls.detach();
    overlayScene.remove(transformControls.getHelper());
    currentSpheres.forEach(sphere => scene.attach(sphere));
    scene.remove(groupObject);
    setGroupObject(null);
  } else if (currentSpheres.length === 1) {
    deselectSphere(currentSpheres[0]);
  }
  setCurrentSpheres([]);
  if (outlinesEnabled) {
    outlinePass.selectedObjects = [];
  }
  if ($("#sphereHeaderText").getAttribute("data-original") != "[-52]") {
    $("#sphereHeaderText").setAttribute("data-original", "[-52]");
    $("#sphereHeaderText").removeAttribute("data-status");
  }
  $("#sphere-parameters").setAttribute("data-disabled", "true");
  $("#group-parameters").setAttribute("data-disabled", "true");
  $("#sphereNumber").removeAttribute("hidden");
  $("#sphereNumber").value = null;
};

// Moves the group object without affecting the positions of the spheres attached to it
const repositionGroup = (spheres) => {
  spheres.forEach(sphere => {
    scene.attach(sphere);
  });

  const [ax, ay, az] = getAveragePosition(currentSpheres);
  groupObject.position.set(ax, ay, az);

  spheres.forEach(sphere => {
    groupObject.attach(sphere);
  });
};

export const duplicateSphere = () => {
  currentSpheres[0].geometry.computeBoundingSphere();
  const color = sphereData.find(x => x.mesh == currentSpheres[0]).color;
  let p = toAlien(currentSpheres[0].position.x, currentSpheres[0].position.y, currentSpheres[0].position.z);
  addSphere(p.x, p.y, p.z, currentSpheres[0].geometry.boundingSphere.radius * 2, color, true);
}

export const duplicateGroup = () => {
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
  clearAllSelections();
  newlySelected.forEach(sphere => {
    addSphereToGroup(sphere);
  });
}