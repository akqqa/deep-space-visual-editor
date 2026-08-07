import { $, $$ } from "./query.js"
import { dict } from "./dictionary.js";

//**************************************************//
// TRANSLATION

let typewriters = [];

export const getTranslation = (str) => {

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

// Copy of above, but returns raw string instead of html formatted one
export const getRawTranslation = (str) => {
  let newText = str
    .map((x, i) => {
      if (x < 0) {
        let entry = dict[x];
        if (entry) {
          return entry.value;
        }
        else {
          // If undefined signal, dont work because then the output wont be valid
          return false;
        }
      }
      else {
        return x;
      }
    })
    .join(" ");

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

export const doTranslation = () => {
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