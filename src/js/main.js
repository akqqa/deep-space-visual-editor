import { initialiseDict } from './dictionary.js';
import { initialiseTranslation  } from './translation.js';
import { initialiseEditor } from "./editor.js";
import { initialisePersistence } from "./persistence.js";
import { initialiseUI } from "./ui.js";


window.onload = () => {
  initialiseDict();
  initialiseTranslation();
  initialiseUI();
  initialiseEditor();
  initialisePersistence();
}

// TO CONSIDER:
// the issue of selection and history. toggling global select when in history will alter that part of history. do we want this? how will it affect if multiselect is added instead? should each selection event create a new history?
// wait its not just global select its normal select too. makes things a bit more simple. it will be changed in history without undoing redo. but tbf is that so bad?? its such a rare and unnoticed use case and not even technically wrong?

// TODO:
// MULTISELECT. 
