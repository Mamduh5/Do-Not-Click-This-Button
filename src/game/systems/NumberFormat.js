(function () {
  "use strict";

  window.DNC = window.DNC || {};

  var SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi"];

  function formatNumber(value) {
    var sign = value < 0 ? "-" : "";
    var amount = Math.abs(Number(value) || 0);
    var suffixIndex = 0;

    while (amount >= 1000 && suffixIndex < SUFFIXES.length - 1) {
      amount /= 1000;
      suffixIndex += 1;
    }

    if (suffixIndex === 0) {
      return sign + Math.floor(amount).toLocaleString("en-US");
    }

    var formatted = amount >= 100 ? amount.toFixed(0) : amount.toFixed(1);
    return sign + formatted.replace(/\.0$/, "") + SUFFIXES[suffixIndex];
  }

  DNC.formatNumber = formatNumber;
})();
