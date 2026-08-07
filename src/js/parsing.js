import { dict } from "./dictionary.js";

//**************************************************//
// PARSING

export const parseText = (text) => {
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
    return signals;
  }
  else {
    invalid.map(chars => {
      let str = chars.map(ix => text[ix]).join("");
      return `Unknown token ${str} at position ${chars[0]}`;
    }).join("; ");
    return null;
  }
}

// Returns the spheredata in a nicer format for rendering
export const parseSphereData = (message) => {
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
      let currSphere = [];
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
        } else {
          currentNumber = firstHalf;
        }
        // Put number into the currSphere array
        if (negated) {
          currSphere.push(-currentNumber);
        } else {
          currSphere.push(currentNumber);
        }

        if (message[current++] != -3) {
          return false;
        }
      }
      // Check final pos number and bracket, also enforce less than 64
      if (message[current] < 0 || message[current] > 64) {
        return false;
      }
      currSphere.push(message[current]);
      current++;
      allSpheres.push(currSphere);
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

  } catch {
    return false;
  }
}