import { $ } from "./query.js";
import { scene, transformControls, overlayScene, sphereData, globalSelection,  setGlobalSelection, globalObject, setGlobalObject, outlinesEnabled, outlinePass, currentSphere, setOutlinesEnabled } from "./state.js";
import { selectSphere, deselectSphere, addSphere, removeSphere } from "./spheres.js";
import { lastLoadedDict, loadDictionary } from "./dictionary.js";
import { undo, redo, addToHistory } from "./history.js";
import { loadSphereData, sphereDataToExportSignals, sphereDataToExportString, sphereDataToGltf, setSignalCounter } from "./persistence.js";
import { toAlien } from "./editor.js";
import { doTranslation } from "./translation.js";

import * as THREE from 'three';

let theme = 0;
const themeColors = ["#66aa00", "#b6a8e5", "#c49b9b", "#b1d6e9", "#ccc", "#fffb00", "#4f4f85", "#ff9538"];
let sidebar_visible = true;

//**************************************************//
// THEME

export const changeTheme = () => {
  let newTheme;
  if (theme == themeColors.length - 1)
    newTheme = 0;
  else
    newTheme = theme + 1;

  setTheme(newTheme);
}

const setTheme = (t) => {
  console.log(`New theme is theme ${t}`);
  theme = t;
  const root = $(":root");
  root.style.setProperty("--theme-color", themeColors[theme]);
  localStorage.setItem("theme", theme);
}

const initialiseTheme = () => {
  const ot = localStorage.getItem("theme");
  const oldTheme = parseInt(ot);
  if (oldTheme >= 0) {
    console.log("THEME", ot, oldTheme);
    setTheme(oldTheme);
  }
  $("#retheme").addEventListener("click", () => {
    changeTheme();
  });
}

//**************************************************//
// SIDEBAR

export const toggleSidebar = () => {
  sidebar_visible = !sidebar_visible;
  updateSidebar();
}

const updateSidebar = () => {
  const main = $("main");

  if (sidebar_visible) {
    main.classList.remove("hide-sidebar");
  }
  else {
    main.classList.add("hide-sidebar");
  }

  localStorage.setItem("sidebar-visible", sidebar_visible);
}

const initialiseSidebar = () => {
  const os = JSON.parse(localStorage.getItem("sidebar-visible"));
  if (os !== null) {
    sidebar_visible = JSON.parse(os);
  }
  console.log(`Sidebar initialised to ${sidebar_visible ? "visible" : "hidden"}`);
  updateSidebar();

  $("#toggle-sidebar").addEventListener("click", () => {
    toggleSidebar();
  })
}

//**************************************************//
// TOOLTIPS

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

//**************************************************//
// UI LOGIC

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

const initialiseOutlines = () => {
  const outlines = localStorage.getItem("outlines");
  if (outlines === "false") {
    toggleOutlines();
  }
}

export const initialiseUI = () => {
  initialiseTheme();
  initialiseSidebar();
  initialiseOutlines();
  addTooltips();

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


  // UI logic
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

  window.newSphere = () => {
    addSphere(0, 0, 0, 2, 64, true);
  }
}