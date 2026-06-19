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
    var autoCursorAccumulatorMs = 0;

    var elements = {
      root: root,
      headlineText: getElement("headlineText"),
      warnHeadline: getElement("warnHeadline"),
      powerDisplay: getElement("powerDisplay"),
      shardsDisplay: getElement("shardsDisplay"),
      breachesDisplay: getElement("breachesDisplay"),
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
      soundBtn: getElement("soundBtn"),
      motionBtn: getElement("motionBtn"),
      resetBtn: getElement("resetBtn"),
      consoleLog: getElement("consoleLog")
    };

    var consoleLog = DNC.createConsoleLog(elements.consoleLog);
    var sound = DNC.createSoundSystem(state);
    var autoCursor = DNC.createAutoCursorView(elements.btnContainer);
    var tabs = DNC.initTabs(root);
    var breachModal = DNC.createBreachModal({
      overlay: getElement("breachOverlay"),
      shardCount: getElement("shardCount"),
      shardLine: getElement("shardLine"),
      totalShardLine: getElement("totalShardLine"),
      breachCountLine: getElement("breachCountLine"),
      breachClicks: getElement("breachClicks"),
      continueButton: getElement("breachContinueBtn")
    }, closeBreach);

    renderUpgradeCards();
    renderShardUpgradeCards();
    bindEvents();
    consoleLog.reset();
    refresh();

    function bindEvents() {
      elements.mainBtn.addEventListener("click", handleClick);
      elements.soundBtn.addEventListener("click", toggleSound);
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

    function renderShardUpgradeCards() {
      var list = getElement("list-shard");
      var empty = document.createElement("div");
      var summary = document.createElement("div");

      empty.className = "shard-empty";
      empty.id = "shard-empty";
      empty.innerHTML = [
        "<div>" + CONFIG.shardUi.emptyTitle + "</div>",
        "<div>" + CONFIG.shardUi.emptyHint + "</div>"
      ].join("");
      list.appendChild(empty);

      summary.className = "shard-summary";
      summary.id = "shard-summary";
      list.appendChild(summary);

      DNC.SHARD_UPGRADE_DEFS.forEach(function (upgrade) {
        var card = document.createElement("button");

        card.type = "button";
        card.className = "upgrade-card shard-card";
        card.id = "shard-card-" + upgrade.id;
        card.dataset.shardUpgradeId = upgrade.id;
        card.innerHTML = [
          "<span class=\"upgrade-tag tag-shard\">PERM</span>",
          "<div class=\"upgrade-name shard-name\">" + upgrade.name + "</div>",
          "<div class=\"upgrade-cost shard-cost\" id=\"shard-cost-" + upgrade.id + "\"></div>",
          "<div class=\"upgrade-effect shard-effect\">" + getShardEffectText(upgrade) + "</div>"
        ].join("");
        card.addEventListener("click", function () {
          buyShardUpgrade(upgrade.id);
        });

        list.appendChild(card);
      });
    }

    function handleClick() {
      if (awaitingBreach) {
        return;
      }

      sound.unlock();
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
      playClickSound();
      maybeLogRandom();

      if (state.instability >= CONFIG.instability.breachAt) {
        triggerBreach();
      }

      refresh();
    }

    function buyShardUpgrade(id) {
      if (awaitingBreach) {
        return;
      }

      if (!DNC.ShardUpgrades.buy(state, id)) {
        consoleLog.add("Shard purchase denied. Insufficient Shards.", "warning");
        sound.play("error");
        return;
      }

      var upgrade = DNC.ShardUpgrades.get(id);
      consoleLog.add(upgrade.name + " stabilized. Level " + DNC.ShardUpgrades.getLevel(state, id) + ".", "normal");
      sound.play("shardUpgrade");
      save();
      refresh();
    }

    function buyUpgrade(id) {
      if (awaitingBreach) {
        return;
      }

      if (!DNC.Upgrades.buy(state, id)) {
        consoleLog.add("Purchase denied. Insufficient Power.", "warning");
        sound.play("error");
        return;
      }

      var upgrade = DNC.Upgrades.get(id);
      consoleLog.add(upgrade.name + " installed. Level " + DNC.Upgrades.getLevel(state, id) + ".", upgrade.category === "risk" ? "critical" : "normal");
      sound.play("upgrade");
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
        updateAutoCursor(deltaSeconds);
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
      DNC.resetRunAfterBreach(state, shardsEarned);
      consoleLog.add("REALITY BREACH DETECTED. Containment failed.", "critical");
      breachModal.show(shardsEarned, state.anomalyShards, clickCountThisRun || state.totalClicks, state.breachCount);
      sound.play("breach");

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
      addPermanentEffectConsole();
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

    function toggleSound() {
      state.audioEnabled = !state.audioEnabled;
      sound.setEnabled(state.audioEnabled);
      sound.unlock();

      if (state.audioEnabled) {
        sound.play("upgrade");
      }

      consoleLog.add("Sound " + (state.audioEnabled ? "enabled." : "muted."), "normal");
      save();
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
      elements.shardsDisplay.textContent = DNC.formatNumber(state.anomalyShards);
      elements.breachesDisplay.textContent = DNC.formatNumber(state.breachCount);
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
      elements.soundBtn.textContent = "SOUND: " + (state.audioEnabled ? "ON" : "OFF");
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
          sound.play("warning");
        } else if (band === "unstable") {
          consoleLog.add("UNSTABLE state entered. Containment advised.", "corrupt");
          sound.play("warning");
        } else if (band === "critical") {
          consoleLog.add("CRITICAL state entered. Stop pressing.", "critical");
          sound.play("warning");
        }
      }

      refreshCards();
      refreshShardCards();
      autoCursor.setActive(state.powerPerSecond > 0);
    }

    function formatRate(value) {
      if (Math.abs(value) < 10) {
        return (Math.round(value * 10) / 10).toFixed(1);
      }

      return DNC.formatNumber(value);
    }

    function getShardEffectText(upgrade) {
      if (upgrade.effect.type === "instabilityPerClickMultiplier") {
        return "Permanent: Instability per click x" + upgrade.effect.value.toFixed(2) + " per level";
      }

      if (upgrade.effect.type === "startingPowerAdd") {
        return "Permanent: +" + DNC.formatNumber(upgrade.effect.value) + " starting Power per level";
      }

      if (upgrade.effect.type === "powerPerClickMultiplier") {
        return "Permanent: Power per click x" + upgrade.effect.value.toFixed(2) + " per level";
      }

      return upgrade.description;
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

    function refreshShardCards() {
      var empty = getElement("shard-empty");
      var summary = getElement("shard-summary");
      var summaryValues = DNC.ShardUpgrades.getPermanentSummary(state);

      if (empty) {
        empty.hidden = state.anomalyShards > 0;
      }

      if (summary) {
        summary.innerHTML = [
          "<div class=\"panel-label\">" + CONFIG.shardUi.summaryTitle + "</div>",
          "<div>Click Power: x" + summaryValues.powerPerClickMultiplier.toFixed(2) + "</div>",
          "<div>Instability Click: x" + summaryValues.instabilityPerClickMultiplier.toFixed(2) + "</div>",
          "<div>Starting Power: +" + DNC.formatNumber(summaryValues.startingPowerBonus) + "</div>"
        ].join("");
      }

      DNC.SHARD_UPGRADE_DEFS.forEach(function (upgrade) {
        var card = getElement("shard-card-" + upgrade.id);
        var costEl = getElement("shard-cost-" + upgrade.id);
        var level = DNC.ShardUpgrades.getLevel(state, upgrade.id);
        var cost = DNC.ShardUpgrades.getCost(state, upgrade.id);
        var maxed = upgrade.maxLevel !== null && level >= upgrade.maxLevel;
        var affordable = DNC.ShardUpgrades.canBuy(state, upgrade.id);
        var existingOwnedTag = card.querySelector(".tag-owned");

        card.classList.toggle("unaffordable", !affordable && !maxed);
        card.classList.toggle("purchased", maxed);
        card.disabled = maxed || !affordable;
        costEl.innerHTML = maxed ? "MAXED" : "LV " + level + " / " + upgrade.maxLevel + "<br>Cost: \u25c6 " + DNC.formatNumber(cost) + " Shards";

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
      showFloatingFeedback("+" + DNC.formatNumber(state.powerPerClick), "");
    }

    function showAutoFeedback() {
      showFloatingFeedback("+" + DNC.formatNumber(state.powerPerSecond) + " AUTO", "auto");
    }

    function showFloatingFeedback(text, extraClass) {
      var feedback = document.createElement("div");
      var band = DNC.Instability.getBand(state.instability);
      feedback.className = "click-feedback " + band + (extraClass ? " " + extraClass : "");
      feedback.textContent = text;
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

    function updateAutoCursor(deltaSeconds) {
      autoCursorAccumulatorMs += deltaSeconds * 1000;

      if (autoCursorAccumulatorMs < CONFIG.autoCursor.clickIntervalMs) {
        return;
      }

      autoCursorAccumulatorMs %= CONFIG.autoCursor.clickIntervalMs;
      autoCursor.playCycle();
      showAutoFeedback();
      elements.mainBtn.classList.add("pressed");
      window.setTimeout(function () {
        elements.mainBtn.classList.remove("pressed");
      }, CONFIG.autoCursor.pressMs);
      sound.play("autoClick");

      if (autoCursor.canLog(Date.now())) {
        consoleLog.add("Auto-Presser cycle completed.", "normal");
      }
    }

    function playClickSound() {
      var band = DNC.Instability.getBand(state.instability);
      sound.play(band === "critical" ? "clickCritical" : "click");
    }

    function addPermanentEffectConsole() {
      var summary = DNC.ShardUpgrades.getPermanentSummary(state);

      if (summary.startingPowerBonus > 0) {
        consoleLog.add("Residual Charge restored " + DNC.formatNumber(summary.startingPowerBonus) + " starting Power.", "normal");
      }
      if (summary.instabilityPerClickMultiplier < 1) {
        consoleLog.add("Containment Memory reducing click instability.", "normal");
      }
      if (summary.powerPerClickMultiplier > 1) {
        consoleLog.add("Shard Resonance amplifying manual input.", "normal");
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
