import { initialiseDict } from './dictionary.js';
import { initialiseTranslation } from './translation.js';
import { initialiseEditor } from "./editor.js";
import { initialisePersistence } from "./persistence.js";
import { initialiseUI } from "./ui.js";

if (!localStorage.getItem("multiSelect")) {
  alert("New Feature! Multi Selection has been added. Check the CONTROLS for more info");
  localStorage.setItem("multiSelect", "true");
}

window.onload = () => {
  initialiseDict();
  initialiseTranslation();
  initialiseEditor();
  initialiseUI();
  initialisePersistence();
}
