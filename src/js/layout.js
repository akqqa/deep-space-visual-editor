import { $, $$ } from "./query.js"

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

export const initialiseTheme = () => {
  const ot = localStorage.getItem("theme");
  const oldTheme = parseInt(ot);
  if (oldTheme >= 0) {
    console.log("THEME", ot, oldTheme);
    setTheme(oldTheme);
  }
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

export const initialiseSidebar = () => {
  const os = JSON.parse(localStorage.getItem("sidebar-visible"));
  if (os !== null) {
    sidebar_visible = JSON.parse(os);
  }
  console.log(`Sidebar initialised to ${sidebar_visible ? "visible" : "hidden"}`);
  updateSidebar();
}

// give each file an initialise function that does all the stuff we should put in the window onload in main