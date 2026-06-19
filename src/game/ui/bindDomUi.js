(function () {
  "use strict";

  window.DNC = window.DNC || {};
  var CONFIG = DNC.BALANCE_CONFIG;

  var STATE_LABELS = {
    stable: {
      badge: "\u25a0 STABLE",
      headline: "DO NOT CLICK THIS BUTTON",
      color: "#20c060",
      headlineColor: "#e84040",
      fill: "#20d0e0"
    },
    disturbed: {
      badge: "\u25b2 DISTURBED",
      headline: "USER COMPLIANCE: FAILING",
      color: "#f0a020",
      headlineColor: "#f0a020",
      fill: "#f0a020"
    },
    unstable: {
      badge: "\u25c6 UNSTABLE",
      headline: "CONTAINMENT DEGRADING",
      color: "#e06020",
      headlineColor: "#e06020",
      fill: "#e06020"
    },
    critical: {
      badge: "\u26a0 CRITICAL",
      headline: "BREACH IMMINENT \u2014 STOP",
      color: "#e84040",
      headlineColor: "#ff4040",
      fill: "#e84040"
    }
  };

  var CRITICAL_BUTTON_LABELS = ["CLICK AGAIN", "IT WANTS POWER", "JUST ONCE MORE", "DO NOT STOP"];

  function getElement(id) {
    return document.getElementById(id);
  }

  function bindDomUi() {
    var root = getElement("gameRoot");
    var state = DNC.Save.load();
    var clickCountThisRun = 0;
    var awaitingBreach = false;
    var lastBand = "";
    var lastConsoleAt = 0;
    var resetConfirmUntil = 0;
    var criticalLabelIndex = 0;
    var firstClickLogged = state.totalClicks > 0;

    var elements = {
      root: root,
      headlineText: getElement("headlineText"),
      warnHeadline: getElement("warnHeadline"),
      powerDisplay: getElement("powerDisplay"),
      instabilityDisplay: getElement("instabilityDisplay"),
      instabilityFill: getElement("instabilityFill"),
      perClickDisplay: getElement("perClickDisplay"),
      perSecDisplay: getElement("perSecDisplay"),
      clickCount: getElement("clickCount"),
      stateBadge: getElement("stateBadge"),
      stateDot: getElement("stateDot"),
      mainBtn: getElement("mainBtn"),
      btnContainer: getElement("btnContainer"),
      overlayWarning: getElement("overlayWarning"),
      instabWarn: getElement("instabWarn"),
      motionBtn: getElement("motionBtn"),
      resetBtn: getElement("resetBtn"),
      consoleLog: getElement("consoleLog")
    };

    var consoleLog = DNC.createConsoleLog(elements.consoleLog);
    var tabs = DNC.initTabs(root);
    var breachModal = DNC.createBreachModal({
      overlay: getElement("breachOverlay"),
      shardCount: getElement("shardCount"),
      shardLine: getElement("shardLine"),
      breachClicks: getElement("breachClicks"),
      continueButton: getElement("breachContinueBtn")
    }, closeBreach);

    renderUpgradeCards();
    bindEvents();
    consoleLog.reset();
    refresh();

    function bindEvents() {
      elements.mainBtn.addEventListener("click", handleClick);
      elements.motionBtn.addEventListener("click", toggleMotion);
      elements.resetBtn.addEventListener("click", confirmReset);

      window.addEventListener("keydown", function (event) {
        if (event.code === "Space" && document.activeElement !== elements.mainBtn) {
          event.preventDefault();
          handleClick();
        }
      });
    }

    function renderUpgradeCards() {
      DNC.UPGRADE_DEFS.forEach(function (upgrade) {
        var list = getElement("list-" + upgrade.tab);
        var card = document.createElement("button");
        var tag = upgrade.tag ? "<span class=\"upgrade-tag " + (upgrade.category === "risk" ? "tag-danger" : "tag-safe") + "\">" + upgrade.tag + "</span>" : "";

        card.type = "button";
        card.className = "upgrade-card";
        card.id = "card-" + upgrade.id;
        card.dataset.upgradeId = upgrade.id;
        card.innerHTML = [
          tag,
          "<div class=\"upgrade-name\">" + upgrade.name + "</div>",
          "<div class=\"upgrade-cost\" id=\"cost-" + upgrade.id + "\"></div>",
          "<div class=\"upgrade-effect\">" + upgrade.description + "</div>"
        ].join("");
        card.addEventListener("click", function () {
          buyUpgrade(upgrade.id);
        });

        list.appendChild(card);
      });
    }

    function handleClick() {
      if (awaitingBreach) {
        return;
      }

      state.power += state.powerPerClick;
      state.totalPowerEarned += state.powerPerClick;
      state.totalClicks += 1;
      clickCountThisRun += 1;
      state.instability = DNC.clamp(state.instability + state.instabilityPerClick, CONFIG.statCaps.minimumInstability, CONFIG.statCaps.maximumInstability);

      if (!firstClickLogged) {
        firstClickLogged = true;
        consoleLog.add("First contact logged. Please do not repeat.", "warning");
      }

      showClickFeedback();
      pulseButton();
      maybeLogRandom();

      if (state.instability >= CONFIG.instability.breachAt) {
        triggerBreach();
      }

      refresh();
    }

    function buyUpgrade(id) {
      if (awaitingBreach) {
        return;
      }

      if (!DNC.Upgrades.buy(state, id)) {
        consoleLog.add("Purchase denied. Insufficient Power.", "warning");
        return;
      }

      var upgrade = DNC.Upgrades.get(id);
      consoleLog.add(upgrade.name + " installed. Level " + DNC.Upgrades.getLevel(state, id) + ".", upgrade.category === "risk" ? "critical" : "normal");
      save();
      refresh();
    }

    function tick(deltaSeconds) {
      if (awaitingBreach) {
        return;
      }

      var powerGain = state.powerPerSecond * deltaSeconds;
      var instabilityGain = (state.instabilityPerSecond - state.containmentPerSecond) * deltaSeconds;

      if (powerGain > 0) {
        state.power += powerGain;
        state.totalPowerEarned += powerGain;
      }

      if (instabilityGain !== 0) {
        state.instability = DNC.clamp(state.instability + instabilityGain, CONFIG.statCaps.minimumInstability, CONFIG.statCaps.maximumInstability);
      }

      if (state.instability >= CONFIG.instability.breachAt) {
        triggerBreach();
      }

      refresh();
    }

    function save() {
      DNC.Save.save(state);
    }

    function triggerBreach() {
      if (awaitingBreach) {
        return;
      }

      var shardsEarned = DNC.Instability.getShardReward(state);
      awaitingBreach = true;
      state.breachCount += 1;
      state.anomalyShards += shardsEarned;
      state.power = 0;
      state.instability = 0;
      DNC.recalculateStats(state);
      consoleLog.add("REALITY BREACH DETECTED. Containment failed.", "critical");
      breachModal.show(shardsEarned, clickCountThisRun || state.totalClicks, state.breachCount);

      if (!state.reducedMotion) {
        root.classList.add("shake");
        window.setTimeout(function () {
          root.classList.remove("shake");
        }, CONFIG.timing.breachShakeMs);
      }

      save();
      refresh();
    }

    function closeBreach() {
      awaitingBreach = false;
      clickCountThisRun = 0;
      breachModal.hide();
      consoleLog.add("System reinitialized. Shards retained.", "normal");
      refresh();
    }

    function confirmReset() {
      if (resetConfirmUntil && Date.now() <= resetConfirmUntil) {
        resetSave();
        return;
      }

      resetConfirmUntil = Date.now() + CONFIG.timing.resetConfirmMs;
      elements.resetBtn.textContent = "CONFIRM?";
    }

    function resetSave() {
      state = DNC.Save.reset();
      clickCountThisRun = 0;
      awaitingBreach = false;
      firstClickLogged = false;
      resetConfirmUntil = 0;
      elements.resetBtn.textContent = "RESET";
      breachModal.hide();
      consoleLog.reset();
      consoleLog.add("Save reset. Fresh containment session started.", "warning");
      save();
      tabs.activate("power");
      refresh();
    }

    function toggleMotion() {
      state.reducedMotion = !state.reducedMotion;
      consoleLog.add("Reduced motion " + (state.reducedMotion ? "enabled." : "disabled."), "normal");
      save();
      refresh();
    }

    function refresh() {
      var band = DNC.Instability.getBand(state.instability);
      var bandData = STATE_LABELS[band] || STATE_LABELS.critical;

      if (resetConfirmUntil && Date.now() > resetConfirmUntil) {
        resetConfirmUntil = 0;
        elements.resetBtn.textContent = "RESET";
      }

      elements.powerDisplay.textContent = DNC.formatNumber(state.power);
      elements.instabilityDisplay.textContent = Math.floor(state.instability) + "%";
      elements.instabilityFill.style.width = DNC.clamp(state.instability, CONFIG.statCaps.minimumInstability, CONFIG.statCaps.maximumInstability) + "%";
      elements.instabilityFill.style.background = bandData.fill;
      elements.perClickDisplay.textContent = DNC.formatNumber(state.powerPerClick);
      elements.perSecDisplay.textContent = formatRate(state.powerPerSecond);
      elements.clickCount.textContent = "TOTAL INTERACTIONS: " + DNC.formatNumber(state.totalClicks);
      elements.stateBadge.className = "state-badge " + band;
      elements.stateBadge.textContent = bandData.badge;
      elements.stateDot.style.background = bandData.color;
      elements.warnHeadline.textContent = bandData.headline;
      elements.warnHeadline.style.color = bandData.headlineColor;
      elements.motionBtn.textContent = "MOTION: " + (state.reducedMotion ? "OFF" : "ON");
      elements.root.classList.toggle("reduced-motion", state.reducedMotion);

      elements.overlayWarning.style.display = band === "critical" ? "block" : "none";
      elements.instabWarn.style.display = band === "critical" ? "block" : "none";
      elements.mainBtn.classList.toggle("critical", band === "critical" && !state.reducedMotion);
      elements.root.classList.toggle("wiggle", band === "unstable" && !state.reducedMotion);

      if (band === "critical") {
        criticalLabelIndex += 1;
        elements.mainBtn.innerHTML = CRITICAL_BUTTON_LABELS[Math.floor(criticalLabelIndex / CONFIG.feedback.criticalLabelStepFrames) % CRITICAL_BUTTON_LABELS.length];
      } else {
        elements.mainBtn.innerHTML = "DO NOT<br>CLICK";
      }

      if (band !== lastBand) {
        lastBand = band;
        if (band === "disturbed") {
          consoleLog.add("DISTURBED state entered. Watch the meter.", "warning");
        } else if (band === "unstable") {
          consoleLog.add("UNSTABLE state entered. Containment advised.", "corrupt");
        } else if (band === "critical") {
          consoleLog.add("CRITICAL state entered. Stop pressing.", "critical");
        }
      }

      refreshCards();
    }

    function formatRate(value) {
      if (Math.abs(value) < 10) {
        return (Math.round(value * 10) / 10).toFixed(1);
      }

      return DNC.formatNumber(value);
    }

    function refreshCards() {
      DNC.UPGRADE_DEFS.forEach(function (upgrade) {
        var card = getElement("card-" + upgrade.id);
        var costEl = getElement("cost-" + upgrade.id);
        var level = DNC.Upgrades.getLevel(state, upgrade.id);
        var cost = DNC.Upgrades.getCost(state, upgrade.id);
        var maxed = upgrade.maxLevel !== null && level >= upgrade.maxLevel;
        var affordable = DNC.Upgrades.canBuy(state, upgrade.id);
        var existingOwnedTag = card.querySelector(".tag-owned");

        card.classList.toggle("unaffordable", !affordable && !maxed);
        card.classList.toggle("purchased", maxed);
        card.classList.toggle("containment", upgrade.category === "containment");
        card.classList.toggle("dangerous", upgrade.category === "risk");
        card.disabled = maxed || !affordable;
        costEl.textContent = maxed ? "Level " + level + " / OWNED" : "Level " + level + "  Cost " + DNC.formatNumber(cost);

        if (maxed && !existingOwnedTag) {
          var tag = document.createElement("span");
          tag.className = "upgrade-tag tag-owned";
          tag.textContent = "\u2713 OWNED";
          card.appendChild(tag);
        } else if (!maxed && existingOwnedTag) {
          existingOwnedTag.remove();
        }
      });
    }

    function showClickFeedback() {
      var feedback = document.createElement("div");
      var band = DNC.Instability.getBand(state.instability);
      feedback.className = "click-feedback " + band;
      feedback.textContent = "+" + DNC.formatNumber(state.powerPerClick);
      elements.btnContainer.appendChild(feedback);
      window.setTimeout(function () {
        feedback.remove();
      }, state.reducedMotion ? CONFIG.timing.reducedMotionFloatingTextMs : CONFIG.timing.floatingTextMs);
    }

    function pulseButton() {
      elements.mainBtn.classList.add("pressed");
      window.setTimeout(function () {
        elements.mainBtn.classList.remove("pressed");
      }, CONFIG.timing.clickFeedbackMs);

      var band = DNC.Instability.getBand(state.instability);
      if (!state.reducedMotion && CONFIG.feedback[band] && CONFIG.feedback[band].shake) {
        root.classList.add("shake");
        window.setTimeout(function () {
          root.classList.remove("shake");
        }, CONFIG.timing.clickShakeMs);
      }
    }

    function maybeLogRandom() {
      var now = Date.now();

      if (now - lastConsoleAt < CONFIG.timing.consoleCooldownMs) {
        return;
      }

      lastConsoleAt = now;
      consoleLog.addRandom(DNC.Instability.getBand(state.instability));
    }

    return {
      tick: tick,
      save: save,
      state: function () {
        return state;
      }
    };
  }

  DNC.bindDomUi = bindDomUi;
})();
