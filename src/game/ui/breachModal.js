(function () {
  "use strict";

  window.DNC = window.DNC || {};

  function createBreachModal(elements, onContinue) {
    elements.continueButton.addEventListener("click", onContinue);

    function show(shardsEarned, totalClicks, breachCount) {
      elements.shardCount.textContent = "+" + DNC.formatNumber(shardsEarned);
      elements.shardLine.textContent = DNC.formatNumber(shardsEarned);
      elements.breachClicks.textContent = DNC.formatNumber(totalClicks);
      elements.overlay.classList.add("is-open");
      elements.overlay.setAttribute("aria-label", "Reality breach detected. Breach count " + breachCount + ".");
      elements.continueButton.focus();
    }

    function hide() {
      elements.overlay.classList.remove("is-open");
    }

    return {
      show: show,
      hide: hide
    };
  }

  DNC.createBreachModal = createBreachModal;
})();
