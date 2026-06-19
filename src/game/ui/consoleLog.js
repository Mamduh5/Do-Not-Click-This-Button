(function () {
  "use strict";

  window.DNC = window.DNC || {};

  var MESSAGE_POOLS = {
    stable: [
      "System online. Containment nominal.",
      "All parameters within expected range.",
      "User compliance: pending verification.",
      "Reality coherence: 100%."
    ],
    disturbed: [
      "WARNING: unauthorized button contact logged.",
      "Button surface showing micro-fractures.",
      "System log integrity: minor corruption detected.",
      "ERR: reality coherence falling."
    ],
    unstable: [
      "ALARM: containment field resonance detected.",
      "Critical: do not interact with the button.",
      "LOG CORRUPTION: coherence drift rising.",
      "WARNING: multiple timeline forks detected."
    ],
    critical: [
      "BREACH THRESHOLD APPROACHING. EVACUATE.",
      "CRITICAL: all containment layers failing.",
      "BUTTON COMPLIANCE: terminal failure.",
      "LAST LOG: containment has failed."
    ]
  };

  function createConsoleLog(logElement) {
    var maxLines = 4;

    function add(message, severity) {
      var cursor = logElement.querySelector(".cursor");

      if (cursor && cursor.parentElement) {
        cursor.parentElement.remove();
      }

      while (logElement.querySelectorAll(".console-line").length >= maxLines) {
        logElement.querySelector(".console-line").remove();
      }

      var line = document.createElement("div");
      line.className = "console-line " + (severity || "normal");
      line.textContent = "> " + message;
      logElement.appendChild(line);

      var cursorLine = document.createElement("div");
      cursorLine.className = "console-line normal";
      cursorLine.innerHTML = "> <span class=\"cursor\">_</span>";
      logElement.appendChild(cursorLine);
    }

    function addRandom(band) {
      var key = MESSAGE_POOLS[band] ? band : "stable";
      var pool = MESSAGE_POOLS[key];
      var message = pool[Math.floor(Math.random() * pool.length)];
      var severity = key === "critical" ? "critical" : key === "unstable" ? "corrupt" : key === "disturbed" ? "warning" : "normal";
      add(message, severity);
    }

    function reset() {
      logElement.innerHTML = "";
      add("System online. Containment nominal.", "normal");
      add("All parameters within expected range.", "normal");
      add("User compliance: pending verification.", "normal");
    }

    return {
      add: add,
      addRandom: addRandom,
      reset: reset
    };
  }

  DNC.createConsoleLog = createConsoleLog;
})();
