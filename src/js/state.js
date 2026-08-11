export let sphereData = []; // For simplicity, sphereData is stored as an array of {mesh: sphereMesh, color: color}
export let currentSpheres = []; // The currently selected spheres (as a mesh) for transformation and alteration
export let transformControls;

export let camera;
export let renderer;
export let composer;
export let sceneDiv;
export let scene;
export let overlayScene;
export let orbitControls;
export let outlinePass;

export let outlinesEnabled = true;

export let globalSelection = false;
export let groupObject;

export let controlHeld = false;

export let currentSignalCount = 0;

export const maxX = 15;
export const minX = -15;
export const maxY = 15;
export const minY = -15;
export const maxZ = 10;
export const minZ = -10

export const maxVol = 50;
export const minVol = 0.1;
export const maxColor = 64;
export const minColor = 0;

export const setEditorState = (s) => {
  ({ camera, renderer, composer, sceneDiv, scene, overlayScene, orbitControls, outlinePass } = s);
};

export const setTransformControls = (tc) => {
  transformControls = tc;
};

export const setSphereData = (sd) => {
  sphereData = sd;
}

export const setCurrentSignalCount = (sc) => {
  currentSignalCount = sc;
}

export const setCurrentSpheres = (cs) => {
  currentSpheres = cs;
}

export const isMultipleSelected = () => {
  return (currentSpheres.length > 1);
} 

export const setGlobalSelection = (gs) => {
  globalSelection = gs;
}

export const setGroupObject = (go) => {
  groupObject = go;
}

export const setOutlinesEnabled = (oe) => {
  outlinesEnabled = oe;
}

export const setControlHeld = (ch) => {
  controlHeld = ch;
}