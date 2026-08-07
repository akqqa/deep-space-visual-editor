import { $ } from "./query.js"
import { initialiseSidebar, initialiseTheme, toggleSidebar, changeTheme } from './layout.js';
import { loadDictionary, initialiseDict, lastLoadedDict } from './dictionary.js';
import { doTranslation  } from './translation.js';
import { toAlien, calculateColor, initialiseEditor, toggleMovementEnabled } from "./editor.js";
import { addToHistory, undo, redo } from "./history.js";
import { loadSphereData, loadLocalStorageSphereData, setLocalStorageSphereData, sphereDataToExportSignals, sphereDataToExportString, sphereDataToGltf, setSignalCounter } from "./persistence.js";
import { addSphere, removeSphere, selectSphere, deselectSphere } from "./spheres.js";
import { camera, renderer, composer, sceneDiv, transformControls, setTransformControls, maxX, minX, maxY, minY, maxZ, minZ, maxVol, minVol, maxColor, minColor, globalSelection, sphereData, currentSphere, orbitControls } from "./state.js"
import { addTooltips, initialiseOutlines, toggleGlobalSelection, toggleOutlines } from "./ui.js";

import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

export let mouseDownPos = new THREE.Vector2;

//************ 
// 3D METHODS AND CONTROLS

// Event listeners for sphere parameters changing
$("#posX").addEventListener("change", (event) => {
  addToHistory();
  const num = Math.min(Math.max(Number(Number(event.target.value).toFixed(1)), minX), maxX);
  event.target.value = num;
  currentSphere.position.x = Number(event.target.value);
  setLocalStorageSphereData();
  setSignalCounter();
});
$("#posY").addEventListener("change", (event) => {
  addToHistory();
  const num = Math.min(Math.max(Number(Number(event.target.value).toFixed(1)), minY), maxY);
  event.target.value = num;
  currentSphere.position.z = -Number(event.target.value);
  setLocalStorageSphereData();
  setSignalCounter();
});
$("#posZ").addEventListener("change", (event) => {
  addToHistory();
  const num = Math.min(Math.max(Number(Number(event.target.value).toFixed(1)), minZ), maxZ);
  event.target.value = num;
  currentSphere.position.y = Number(event.target.value);
  setLocalStorageSphereData();
  setSignalCounter();
});
$("#volumeAmount").addEventListener("change", (event) => {
  addToHistory();
  const num = Math.min(Math.max(Number(Number(event.target.value).toFixed(1)), minVol), maxVol);
  event.target.value = num;
  currentSphere.geometry.dispose();
  currentSphere.geometry = new THREE.SphereGeometry(num/2);
  setLocalStorageSphereData();
  setSignalCounter();
})
$("#volumeSlider").addEventListener("input", (event) => {
  const num = Math.min(Math.max(Number(Number(event.target.value).toFixed(1)), minVol), maxVol);
  event.target.value = num;
  currentSphere.geometry.dispose();
  currentSphere.geometry = new THREE.SphereGeometry(num/2);
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
  currentSphere.material.uniforms.objectColor.value.set(c);
  // ALSO SET FOR SPHEREDATA COLOR
  sphereData.find(x => x.mesh == currentSphere).color = num;
  setLocalStorageSphereData();
  setSignalCounter();
})
$("#colorSlider").addEventListener("input", (event) => {
  const num = Math.min(Math.max(Number(Number(event.target.value).toFixed(1)), minColor), maxColor);
  const c = calculateColor(num);
  currentSphere.material.uniforms.objectColor.value.set(c);
  sphereData.find(x => x.mesh == currentSphere).color = num;
  setLocalStorageSphereData();
  setSignalCounter();
})
$("#colorSlider").addEventListener("mousedown", () => {
  addToHistory(); // Only add to history on start!
})

//**************************************************
// SETUP AND LISTENERS

window.onload = () => {

  const consumeDictionary = (file) => {
    console.log("Consuming dictionary")
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      loadDictionary(reader.result);
    });
    reader.readAsText(file);
  }

  $("#dictionary-input").addEventListener("change", (ev) => {
    const file = ev.target.files[0];
    consumeDictionary(file);
  });
  const dropHandler = (ev) => {
    const files = [...ev.dataTransfer.items];
    if (files.length === 0) {
      console.warn("No files");
      return;
    }
    consumeDictionary(files[0].getAsFile());
  }
  window.addEventListener("dragover", (e) => {
    e.preventDefault();
  });
  window.addEventListener("drop", (e) => {
    e.preventDefault();
  });

  window.addEventListener("drop", dropHandler);
  window.addEventListener("dragover", (e) => {
    const fileItems = [...e.dataTransfer.items].filter(
      (item) => item.kind === "file",
    );
    if (fileItems.length > 0) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  });

  initialiseDict();

  // Auto-translate anything with the "do-translate" class
  window.setInterval(() => {
    doTranslation();
  }, 100);

  // Setup theme and changing theme
  initialiseTheme();
  $("#retheme").addEventListener("click", () => {
    changeTheme();
  });

  // Setup sidebar show/hide
  initialiseSidebar();
  $("#toggle-sidebar").addEventListener("click", () => {
    toggleSidebar();
  })

  // Setup clipboard

  $("#clipboard-zone").addEventListener("click", () => {
    const clipboardDialog = $("dialog.clipboard-paste");
    const clipboardTextArea = $("textarea.dict-paste-contents");
    clipboardTextArea.value = lastLoadedDict;
    clipboardDialog.showModal();
  });

  $("button.close-dialog").addEventListener("click", () => {
    const clipboardDialog = $("dialog.clipboard-paste");
    clipboardDialog.close();
  });

  $("button.save-dictionary").addEventListener("click", () => {
    const content = $("textarea.dict-paste-contents").value;
    if (!content) {
      console.warn("Could not retrieve contents from textarea");
      return;
    }

    const res = loadDictionary(content);

    if (res) {
      $("textarea.dict-paste-contents").value = "";
    }


    const clipboardDialog = $("dialog.clipboard-paste");
    clipboardDialog.close();

  });


  // Editor section

  // Set up localstorage for sphereData
  if (!localStorage.getItem("sphereData")) {
    setLocalStorageSphereData();
  }

  // Initialise the 3D editor
  initialiseEditor();
  const tc = new TransformControls(camera, sceneDiv);
  tc.translationSnap = 1;
  tc.maxX = maxX;
  tc.minX = minX;
  tc.maxZ = -minY;
  tc.minZ = -maxY;
  tc.maxY = maxZ;
  tc.minY = minZ;
  setTransformControls(tc);

  // Import locally stored spheres
  loadLocalStorageSphereData();

  // toggle outlines based on localstorage
  initialiseOutlines();


  // Set an observer to ensure the editor window is always sized correctly
  const observer = new ResizeObserver(() => {   
    console.log("observerFired")
    camera.aspect = sceneDiv.clientWidth / sceneDiv.clientHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(sceneDiv.clientWidth, sceneDiv.clientHeight);
    composer.setSize(sceneDiv.clientWidth, sceneDiv.clientHeight);
  })
  observer.observe(sceneDiv);

  // Setup model import and export

  $("#import-button").addEventListener("click", () => {
    const importDialog = $("dialog.import-paste");
    const importTextArea = $("textarea.import-paste-contents");
    importTextArea.value = "";
    importDialog.showModal();
  });

  $("button.close-import-dialog").addEventListener("click", () => {
    const importDialog = $("dialog.import-paste");
    importDialog.close();
  });

  $("#importSolarSystem").addEventListener("click", () => {
    const importTextArea = $("textarea.import-paste-contents");
    fetch("./assets/models/solar-system.model")
      .then(r => r.text())
      .then(r => importTextArea.value = r);
  })

  $("#importSnowman").addEventListener("click", () => {
    const importTextArea = $("textarea.import-paste-contents");
    fetch("./assets/models/snowman.model")
      .then(r => r.text())
      .then(r => importTextArea.value = r);
  })

  $("#importStarryNight").addEventListener("click", () => {
    const importTextArea = $("textarea.import-paste-contents");
    fetch("./assets/models/starry-night.model")
      .then(r => r.text())
      .then(r => importTextArea.value = r);
  })

  $("#importAmogus").addEventListener("click", () => {
    let answer = confirm("Are you certain you want to proceed?");
    if (!answer) {
      return;
    }
    const importTextArea = $("textarea.import-paste-contents");
    fetch("./assets/models/amogus.model")
      .then(r => r.text())
      .then(r => importTextArea.value = r);
  })

  $("textarea.import-paste-contents").addEventListener("input", () => {
    const importTextArea = $("textarea.import-paste-contents");
    importTextArea.value = importTextArea.value.replace(/\n/g, "");
  });

  $("button.save-import").addEventListener("click", () => {
    const content = $("textarea.import-paste-contents").value;
    if (!content) {
      console.warn("Could not retrieve contents from textarea");
      alert("Invalid import data");
      return;
    }

    const res = loadSphereData(content); 

    if (res) {
      $("textarea.dict-paste-contents").value = "";
      const importDialog = $("dialog.import-paste");
      importDialog.close();
    } else {
      alert("Invalid import data");
    }
  });

  // Export logic
  $("#copy-message-signals").addEventListener("click", () => {
    // Transform the sphereData into the correct test
    let res = sphereDataToExportSignals();
    if (!res) {
      $("#copy-message-signals").querySelector("i").className = "fa fa-times";
    } else {
      navigator.clipboard.writeText(res).then(
      () => {
        $("#copy-message-signals").querySelector("i").className = "fa fa-check";
      },
      () => {
        $("#copy-message-signals").querySelector("i").className = "fa fa-times";
      });
    }
    
    setTimeout(() => {
        $("#copy-message-signals").querySelector("i").className = "fa fa-copy";
    }, 1000);
  });
  $("#copy-message-text").addEventListener("click", () => {
    // Transform the sphereData into the correct test
    let res = sphereDataToExportString();
    if (!res) {
      $("#copy-message-text").querySelector("i").className = "fa fa-times";
    } else {
      navigator.clipboard.writeText(res).then(
      () => {
        $("#copy-message-text").querySelector("i").className = "fa fa-check";
      },
      () => {
        $("#copy-message-text").querySelector("i").className = "fa fa-times";
      });
    }
    
    setTimeout(() => {
        $("#copy-message-text").querySelector("i").className = "fa fa-copy";
    }, 1000);
  });
  $("#download-gltf-file").addEventListener("click", () => {
    // Transform the sphereData into the correct test
    sphereDataToGltf();
  
    $("#download-gltf-file").querySelector("i").className = "fa fa-check";
    
    setTimeout(() => {
        $("#download-gltf-file").querySelector("i").className = "fa fa-download";
    }, 1000);
  });


  // Event listeners for undo and redo buttons
  $("#undoButton").addEventListener("click", () => {
    undo();
  })
  $("#redoButton").addEventListener("click", () => {
    redo();
  })


  window.newSphere = () => {
    addSphere(0, 0, 0, 2, 64, true);
  }

  window.duplicateCurrentSphere = () => {
    if (currentSphere) {
      currentSphere.geometry.computeBoundingSphere();
      const color = sphereData.find(x => x.mesh == currentSphere).color;
      // const randX = Number(((Math.random()) * 2 - 1).toFixed(1));
      // const randZ = Number(((Math.random()) * 2 - 1).toFixed(1));
      // const randY = Number(((Math.random()) * 2 - 1).toFixed(1));
      let p = toAlien(currentSphere.position.x, currentSphere.position.y, currentSphere.position.z)
      // HMM. if this is true at the end, its better for deletes, but worse for tab select... Select the new one as logically that makes more sense?
      // maybe change behaviour of both, so tab selects next and delete deletes nearby..
      addSphere(p.x, p.y, p.z, currentSphere.geometry.boundingSphere.radius * 2, color, true);

      $("#duplicate-button").textContent = "COPIED";
    
      setTimeout(() => {
        $("#duplicate-button").setAttribute("data-status", "not");
        doTranslation();
      }, 1000);
    }
  }

  window.deleteCurrentSphere = () => {
    if (currentSphere) {
      removeSphere(currentSphere);
    }
  }

  window.deleteAllSpheres = () => {
    const res = confirm("Are you sure you want to reset the canvas?");
    if (globalSelection) {
      toggleGlobalSelection();
    }
    addToHistory();
    if (res) {
      sphereData.forEach(element => {
        removeSphere(element.mesh,false);
      });
      setSignalCounter();
    }
  }

  window.selectAll = () => {
    toggleGlobalSelection();
  }

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
    if (globalSelection || !currentSphere) {
      return;
    }
    // Update parameters in ui
    let p = toAlien(currentSphere.position.x, currentSphere.position.y, currentSphere.position.z);
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
    if (intersects.length > 0) {
      selectSphere(intersects[0].object);
    } else {
      deselectSphere();
    }
  });

  window.addEventListener("keydown", (event) => { 

    if (event.code == "ControlLeft") {
      // If control held, transform scale goes to 0.1
      transformControls.translationSnap = 0.1;
    } 
    if (event.code == "Delete") {
      if (globalSelection) {
        addToHistory();
        toggleGlobalSelection();
        sphereData.forEach(element => {
          removeSphere(element.mesh,false);
        });
        setSignalCounter();
      } else if (currentSphere) {
        removeSphere(currentSphere);
      }
    }
    if (event.code == "KeyC") {
      if (globalSelection) return;
      if (currentSphere) {
        currentSphere.geometry.computeBoundingSphere();
        const color = sphereData.find(x => x.mesh == currentSphere).color;
        let p = toAlien(currentSphere.position.x, currentSphere.position.y, currentSphere.position.z);
        addSphere(p.x, p.y, p.z, currentSphere.geometry.boundingSphere.radius * 2, color, true);
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
    if (event.code == "KeyF" && currentSphere) {
      orbitControls.target.copy(currentSphere.position);
      // Could improve by making it also rescale to fit object in
    }
    // Reset to initial camera position
    if (event.code == "KeyR") {
      camera.position.x = 0;
      camera.position.y = 0;
      camera.position.z = 18.5;
      orbitControls.target.copy(new THREE.Vector3(0,0,0));
    }
    if (event.code == "KeyQ") {
      const offset = camera.position.clone().sub(orbitControls.target); // Get vector from target to camera

      const radius = Math.sqrt(offset.x * offset.x + offset.z * offset.z); // Calculate the horziontal distance
      const currentAngle = Math.atan2(offset.x, offset.z); // Convert offset vector into angle

      // Snap to 90 degrees rotated left
      let newAngle = (Math.ceil(currentAngle / (Math.PI / 2)) * (Math.PI / 2))  - Math.PI / 2; // Divide the current angle by 90 degrees, and get the ceiling then subtract 90, giving the next increment of 90 degrees left.

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
    if (event.code == "KeyE" ) {
      const offset = camera.position.clone().sub(orbitControls.target); // Get vector from target to camera

      const radius = Math.sqrt(offset.x * offset.x + offset.z * offset.z); // Calculate the horziontal distance
      const currentAngle = Math.atan2(offset.x, offset.z); // Convert offset vector into angle

      // Snap to 90 degrees rotated left
      let newAngle = (Math.floor(currentAngle / (Math.PI / 2)) * (Math.PI / 2))  + Math.PI / 2; // Divide the current angle by 90 degrees, and get the ceiling then add 90, giving the next increment of 90 degrees left.

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
      if (currentSphere) {
        const index = sphereData.findIndex(x => x.mesh == currentSphere);
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
    }
  })

  addTooltips();
}

// TO CONSIDER:
// the issue of selection and history. toggling global select when in history will alter that part of history. do we want this? how will it affect if multiselect is added instead? should each selection event create a new history?
// wait its not just global select its normal select too. makes things a bit more simple. it will be changed in history without undoing redo. but tbf is that so bad?? its such a rare and unnoticed use case and not even technically wrong?

// TODO:
// MULTISELECT. 
// REFACTOR CODE INTO MORE FILES FOR MORE MANAGABLILITY