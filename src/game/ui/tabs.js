(function () {
  "use strict";

  window.DNC = window.DNC || {};

  function initTabs(root) {
    var buttons = Array.prototype.slice.call(root.querySelectorAll("[data-tab]"));
    var panels = Array.prototype.slice.call(root.querySelectorAll("[data-tab-panel]"));

    function activate(tabName) {
      buttons.forEach(function (button) {
        button.classList.toggle("active", button.dataset.tab === tabName);
      });

      panels.forEach(function (panel) {
        panel.hidden = panel.dataset.tabPanel !== tabName;
      });
    }

    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        activate(button.dataset.tab);
      });
    });

    activate("power");

    return {
      activate: activate
    };
  }

  DNC.initTabs = initTabs;
})();
