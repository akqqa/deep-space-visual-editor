import { $, $$ } from "./query.js"

let dictOrd = [];
export let dict = {};
export let lastLoadedDict = "";

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
  if (dict[-53] != "@-53_UNDEF" || !dict[-53]) {
    $(".view").removeAttribute("data-disabled");
  } else {
    $(".view").setAttribute("data-disabled", "true");
  }

  $("#dictionary-click-zone p").innerHTML = "DICTIONARY LOADED<br>CLICK HERE TO CHANGE";
  $("#dictionary-click-zone").setAttribute("loaded", "true");

  // Reset all translations
  $$(".do-translate").forEach(el => el.removeAttribute("data-status"));
}

export const loadDictionary = (text) => {
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
    location.reload(); // Reloads window to initialise editor properly
    return true;
  }

  catch (e) {
    console.error("Could not read dictionary");
    renderErrorMessage("Could not read dictionary: " + e.message);
    return false;
  }
}

export const initialiseDict = () => {
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