import * as THREE from 'three';
import { initialiseEditor, calculateColor, renderSpheres  } from "./editor.js";

// Core js code adapted from Dixonary's Deep Space Communication Relay project

// Global variables

let $ = (x) => document.querySelector(x);
let $$ = (x) => Array.from(document.querySelectorAll(x));

let dictOrd = [];
let dict = {};
let lastLoadedDict = "";

let typewriters = [];
let retrying = false;

let sphereData = [[0,0,0,1,1]];

//**************************************************//
// THEME

let theme = 0;

const themeColors = ["#66aa00", "#b6a8e5", "#c49b9b", "#b1d6e9", "#ccc", "#fffb00", "#4f4f85", "#ff9538"];

const changeTheme = () => {
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
}

//**************************************************//
// SIDEBAR

let sidebar_visible = false;

const toggleSidebar = () => {
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
  sidebar_visible = !!os;
  console.log(`Sidebar initialised to ${sidebar_visible ? "visible" : "hidden"}`);
  updateSidebar();
}

//**************************************************//
// DICTIONARY

const updateDict = () => {

  // Update stored dict
  localStorage.setItem("dict", JSON.stringify(dictOrd));
  localStorage.setItem("dict-raw", lastLoadedDict);

  // Update map version
  dict = Object.fromEntries(
    dictOrd.map(({ key, ...value }) => [key, value])
  );

  // Enable editor
  $(".view").removeAttribute("data-disabled");

  $("#dictionary-click-zone p").innerHTML = "DICTIONARY LOADED<br>CLICK HERE TO CHANGE";
  $("#dictionary-click-zone").setAttribute("loaded", "true");

  // Reset all translations
  $$(".do-translate").forEach(el => el.removeAttribute("data-status"));
}

const loadDictionary = (text) => {
  try {
    const data = JSON.parse(text);
    dictOrd = data.wordDict.keys.map((x, i) => {
      return {
        key: x,
        value: data.wordDict.values[i]
      };
    });
    let descs = Object.fromEntries(data.descDict.keys.map((x, i) =>
      [x, data.descDict.values[i]]
    ));
    dictOrd = dictOrd.map(x => ({ ...x, desc: descs[x.key] }));

    // Set the most recently loaded dict contents
    lastLoadedDict = text;

    updateDict();
    return true;
  }

  catch (e) {
    console.error("Could not read dictionary");
    renderErrorMessage("Could not read dictionary: " + e.message);
    return false;
  }
}


const initialiseDict = () => {
  let dict = localStorage.getItem("dict");
  let dictRaw = localStorage.getItem("dict-raw");
  if (!dict) {
    return;
  }
  else {
    console.log("Loading dictionary from storage")
    dictOrd = JSON.parse(dict);
    lastLoadedDict = dictRaw;
    updateDict();
  }
}

//**************************************************//
// TRANSLATION

const getTranslation = (str) => {

  let newText = str
    .map((x, i) => {
      if (x < 0) {
        let entry = dict[x];
        if (entry) {
          let p = "";
          if (i > 0) {
            const prev = dict[str[i - 1]];
            const wasUndef = (str[i - 1] < 0 && !prev);
            if (entry.desc.formatMode > 0 || prev?.desc.formatModeAfter > 0 || wasUndef) {
              p = `<span class="spacer"> </span>`;
            }
          }
          const s = `<span class="signal" title="SIGNAL ${x}">${entry.value}</span>`;
          return `${p}${s}`;
        }
        else {
          // UNDEF is always rendered with a space
          let p = "";
          if (i > 0) {
            p = `<span class="spacer"> </span>`;
          }
          return `${p}<span class="signal undef">@${x}_UNDEF</span>`;
        }
      }
      else {
        const prev = dict[str[i - 1]];
        const wasUndef = (str[i - 1] < 0 && !prev);
        let p = "";
        if (prev?.desc.formatModeAfter > 0 || wasUndef) {
          p = `<span class="spacer"> </span>`;
        }
        return `${p}<span class="signal number">${x}</span>`;
      }
    })
    .join("");

  return newText;
}

const addTypewriter = (el, fullText, fullHTML) => {

  let n = typewriters.length;

  let t =
    new Typewriter(el, {
      delay: 1,
      loop: false,
    })
      .typeString(fullText)
      .callFunction(({ elements: { cursor, wrapper } }) => {
        cursor.remove();
        wrapper.replaceWith(...wrapper.childNodes);
        el.innerHTML = fullHTML;
        typewriters[n] = null;

        // Scroll to bottom (again)
        $(".view").scrollTop = $(".view").scrollHeight;

      })
      .start();

  typewriters[n] = t;

  el.setAttribute("data-typewriter", n);
  return n;
}

const doTranslation = () => {
  const elems = $$(".do-translate");
  elems.forEach((el) => {
    const st = el.getAttribute("data-status");
    if (st == "done") {
      return;
    }

    console.log("Found new element")

    const original = el.getAttribute("data-original");
    let str = JSON.parse(original);

    // Truncate
    if (str.length > 100) {
      str = str.slice(0, 100);
      str.push(-25);
    }

    const newText = getTranslation(str);

    el.innerHTML = newText;
    const rawText = el.textContent;

    el.setAttribute("data-status", "done");

    addTypewriter(el, rawText, newText);

    return el;
  })
}


//**************************************************//
// PARSING

const parseText = (text) => {
  // Text parsing. Tricky.

  // Idea: At each parse point (initially 0), take the longest substring matching any word in the dictionary.
  // If there is none, add the position to an invalid set and move the parse point on 1 to go again.
  // If there is one, move to the end of that longest match and go again.

  // The problem is that this will fail when one thing is a prefix of
  // another, e.g. it will not be able to read "ABC" as "A BC" if there
  // is also a word "AB"

  // But I don't know what the game does in these cases either!
  // So it's good enough for now

  text = text.toUpperCase();

  const signals = [];
  const invalid = [];

  // Put "invalid" into contiguous blocks of characters.
  const addInvalid = (n) => {
    if (invalid.length === 0) {
      invalid.push([n]);
      return;
    }
    // Invariant: "lastArr" is nonempty
    let lastArr = invalid[invalid.length - 1];
    let last = lastArr[lastArr.length - 1];
    console.log(lastArr, last, n);
    if (n === last + 1) {
      lastArr.push(n);
    }
    else {
      invalid.push([n]);
    }
  }

  let ix = 0;
  while (ix < text.length) {
    if (text[ix] === " ") {
      ix++;
      continue;
    }

    // Raw signal in the form |-100 or |5
    if (text[ix] === "|") {
      const numStr = text.slice(ix + 1).match(/^-?\d+/)?.[0];
      if (numStr) {
        const num = parseInt(numStr, 10);
        signals.push(num);
        ix += numStr.length + 1;
        continue;
      }
    }

    // Try matching a nonnegative integer
    // ... in base 10 :(
    const numStr = text.slice(ix).match(/^\d+/)?.[0];
    if (numStr) {
      const num = parseInt(numStr, 10);
      signals.push(num);
      ix += numStr.length;
      continue;
    }

    // Otherwise match signals

    const matches = [];
    Object.entries(dict).forEach(([signal, word]) => {
      if (text.startsWith(word.value, ix)) {
        matches.push({ signal, value: word.value });
      }
    });

    if (matches.length === 0) {
      addInvalid(ix);
      ix++;
      continue;
    }

    matches.sort((a, b) => a.value.length - b.value.length);

    // There cannot be two matches of the same length as they would
    // be the same word.
    let longestMatch = matches[matches.length - 1];
    // Signals are stored as strings in the dict because object
    // keys are always strings
    signals.push(parseInt(longestMatch.signal, 10));
    ix += longestMatch.value.length;
    continue;
  }

  // Must be no invalid signals
  if (invalid.length === 0) {
    // Max length 
    const maxSignals = 2000;
    if (signals.length <= 2000) {
      return signals;
    }
    else {
      renderErrorMessage(`Message too long; maximum number of signals is ${maxSignals} (you have ${signals.length})`);
    }
  }
  else {
    let invalidStr = invalid.map(chars => {
      let str = chars.map(ix => text[ix]).join("");
      return `Unknown token ${str} at position ${chars[0]}`;
    }).join("; ");
    renderErrorMessage(invalidStr);
    return null;
  }
}


// Returns the spheredata in a nicer format for rendering
const parseSphereData = (message) => {
  // CHECK IF RENDER IN DICTIONARY
  if (!dict[-53]) {
    return false;
  }
  try {
    if (!message.includes(-53)) { // If no image signal, doesn't contain an image
      return false;
    }
    if (message.filter(x => x == -53).length > 1) { // If multiple image signals, invalid
      return false;
    }

    // Get position of -53 signal
    const imagePos = message.indexOf(-53);
    if (message[imagePos + 1] != -14) {
      return false;
    }

    const finalIndex = message.indexOf(-15, imagePos + 2);
    if (finalIndex == -1) { // Mismatched brackets around image
      return false;
    }

    // Now we have the start and end of the "image", so we can check everything in between matches the pattern!
    let check = true;
    let current = imagePos + 2;
    let allSpheres = [];
    while (check) {
      let currentSphere = [];
      // If not followed by "sphere" then fail
      if (message[current++] != -52) {
        return false;
      }
      // Check for 5 positive numbers that make a sphere
      for (let i = 0; i < 4; i++) {
        let negated = false;
        let decimal = false;
        let currentNumber;
        let firstHalf = 0;
        let secondHalf = 0;
        if (message[current] == -1) { // Consumes negation if present for first 3
          current++;
          negated = true;
        }
        firstHalf = message[current];
        // Check positive
        if (message[current++] < 0) {
          return false;
        }
        // Check for decimal
        if (message[current] == -10) { // Consumes decimal point
          current++;
          decimal = true;

          secondHalf = message[current];
          // Check next is positive as it is the next number after a decimal
          if (message[current++] < 0) {
            return false;
          }
        }

        // Treat negation and decimals
        if (decimal) {
          currentNumber = parseFloat(`${firstHalf}.${secondHalf}`);
          console.log("floatparsed " + currentNumber);
        } else {
          currentNumber = firstHalf;
        }
        // Put number into the currentSphere array
        if (negated) {
          currentSphere.push(-currentNumber);
        } else {
          currentSphere.push(currentNumber);
        }

        if (message[current++] != -3) {
          return false;
        }
      }
      // Check final pos number and bracket, also enforce less than 64
      if (message[current] < 0 || message[current] > 64) {
        return false;
      }
      currentSphere.push(message[current]);
      current++;
      allSpheres.push(currentSphere);
      if (message[current] === -3) {
        current++;
        check = true;
      } else {
        // If not a closing brace, failure
        if (message[current] != -15) {
          return false;
        }
        check = false;
      }
    }

    return allSpheres; // Returns a nice 2d array of 5-number sphere data

  } catch (error) {
    return false;
  }
}

//**************************************************
// SETUP AND LISTENERS

window.onload = () => {

  $$(".digit-up").forEach(elem => {
    elem.addEventListener("click", () => {
      const val = getDigitValue(elem.parentNode);
      let newVal;
      if (val === 7) newVal = 0;
      else newVal = val + 1;
      setDigitValue(elem.parentNode, newVal);
      play(snd_click);
    })
  });

  $$(".digit-dn").forEach(elem => {
    elem.addEventListener("click", () => {
      const val = getDigitValue(elem.parentNode);
      let newVal;
      if (val === 0) newVal = 7;
      else newVal = val - 1;
      setDigitValue(elem.parentNode, newVal);
      play(snd_click);
    })
  });

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
  const dropZone = $("#dictionary-drop-zone");
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

  // Initialise the 3D editor
  const {camera, renderer, composer, sceneDiv, scene} = initialiseEditor();

  // Initial sphere render
  renderSpheres(sphereData, scene);

  // Set an observer to ensure the editor window is always sized correctly
  const observer = new ResizeObserver(() => {   
    camera.aspect = sceneDiv.clientWidth / sceneDiv.clientHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(sceneDiv.clientWidth, sceneDiv.clientHeight);
    composer.setSize(sceneDiv.clientWidth, sceneDiv.clientHeight);
  })
  observer.observe(sceneDiv);
  
}