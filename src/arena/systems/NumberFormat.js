(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  function formatNumber(value) {
    var number = Math.max(0, Number(value) || 0);

    if (number < 1000) {
      return String(Math.floor(number));
    }

    if (number < 1000000) {
      return (number / 1000).toFixed(number < 10000 ? 1 : 0) + "K";
    }

    return (number / 1000000).toFixed(1) + "M";
  }

  ARENA.formatNumber = formatNumber;
})();
