import { initialiseDict } from './dictionary.js';
import { initialiseTranslation } from './translation.js';
import { initialiseEditor } from "./editor.js";
import { initialisePersistence } from "./persistence.js";
import { initialiseUI } from "./ui.js";

if (!localStorage.getItem("welcomeMessage")) {
  alert("Welcome! This website is based off of the game The Message from Deep Space (https://store.steampowered.com/app/4080030). You need a dictionary from that game to start! You can also join the discord to ask any questions: https://discord.com/invite/mMxWmvczCS");
  localStorage.setItem("welcomeMessage", "true");
}

window.onload = () => {
  initialiseDict();
  initialiseTranslation();
  initialiseEditor();
  initialiseUI();
  initialisePersistence();
}
