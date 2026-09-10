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



  function getElement(id) {
    return document.getElementById(id);
  }

  function bindDomUi() {
    var root = getElement("gameRoot");
    var state = DNC.Save.load();
    var lastForecastShards = DNC.Instability.getShardReward(state);
    var forecastFeedbackTimeoutId = null;
    var currentGuide = CONFIG.operatorGuide.firstContact;
    var awaitingBreach = false;
    var lastBand = "";
    var lastConsoleAt = 0;
    var menuActionPending = "";
    var menuConfirmTimeoutId = null;

    var firstClickLogged = state.totalClicks > 0;
    var autoCursorAccumulatorMs = 0;

    var elements = {
      root: root,
      guideTitle: getElement("guideTitle"),
      guideText: getElement("guideText"),
      guideAction: getElement("guideAction"),
      breachForecast: getElement("breachForecast"),
      forecastShards: getElement("forecastShards"),
      forecastNext: getElement("forecastNext"),
      forecastRemaining: getElement("forecastRemaining"),
      forecastFill: getElement("forecastFill"),
      forecastMeter: getElement("forecastMeter"),
      heatClicks: getElement("heatClicks"),
      heatRate: getElement("heatRate"),
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
      menuBtn: getElement("menuBtn"),
      menuPanel: getElement("systemMenu"),
      menuTitle: getElement("systemMenuTitle"),
      soundBtn: getElement("soundBtn"),
      motionBtn: getElement("motionBtn"),
      resetRunBtn: getElement("resetRunBtn"),
      deleteSaveBtn: getElement("deleteSaveBtn"),
      menuConfirm: getElement("menuConfirm"),
      menuConfirmText: getElement("menuConfirmText"),
      menuConfirmBtn: getElement("menuConfirmBtn"),
      menuCancelBtn: getElement("menuCancelBtn"),
      menuCloseBtn: getElement("menuCloseBtn"),
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
      breachPower: getElement("breachPower"),
      continueButton: getElement("breachContinueBtn")
    }, closeBreach);

    var machinePanel = document.createElement("section");
    machinePanel.className = "machine-panel";
    machinePanel.innerHTML = '<p id="machineStatus"></p><div class="machine-risk" id="machineRisk" role="progressbar" aria-label="Production toward next risk Shard" aria-valuemin="0" aria-valuemax="100"><i id="machineRiskFill"></i></div><div class="machine-actions"><button id="stabilizeBtn" type="button">STABILIZE</button><button id="cashOutBtn" type="button">CASH OUT</button><button id="purgeBtn" type="button">EMERGENCY PURGE</button></div><p id="machineBuild"></p><div id="machineOffers"></div>';
    elements.breachForecast.insertAdjacentElement("afterend", machinePanel);
    var machineControls = document.createElement("div"); machineControls.className = "machine-controls";
    machineControls.appendChild(getElement("machineStatus"));
    machineControls.appendChild(getElement("machineRisk"));
    machineControls.appendChild(machinePanel.querySelector(".machine-actions"));
    elements.btnContainer.insertAdjacentElement("afterend", machineControls);
    getElement("stabilizeBtn").onclick = function () { if (!awaitingBreach) { state.machine.stabilizing = !state.machine.stabilizing; save(); refresh(); } };
    getElement("cashOutBtn").onclick = function () { if (DNC.Instability.getShardReward(state) > 0) { triggerBreach(true); } };
    getElement("purgeBtn").onclick = function () {
      if (!awaitingBreach && state.instability >= CONFIG.machine.surgeAt && !state.machine.rescued) {
        state.machine.rescued = true; state.machine.risk = 0; state.machine.surge = 0; state.instability = CONFIG.machine.purgeDanger;
        state.power *= CONFIG.machine.purgePowerRetained; state.machine.stabilizing = true; save(); refresh();
      }
    };
    var offerSignature = "";
    renderUpgradeCards();
    renderShardUpgradeCards();
    applyMenuLabels();
    bindEvents();
    consoleLog.reset();
    refresh();

    function bindEvents() {
      elements.mainBtn.addEventListener("click", handleClick);
      elements.guideAction.addEventListener("click", function () {
        if (currentGuide === CONFIG.operatorGuide.firstUpgrade && DNC.Upgrades.canBuy(state, "powerTap")) {
          sound.unlock();
          buyUpgrade("powerTap");
          return;
        }
        tabs.activate(currentGuide.tab);
        var tabButton = root.querySelector('[data-tab="' + currentGuide.tab + '"]');
        tabButton.focus({ preventScroll: true });
        tabButton.scrollIntoView({ block: "nearest", behavior: "auto" });
      });
      window.addEventListener("pagehide", save);
      elements.menuBtn.addEventListener("click", function (event) {
        event.stopPropagation();
        toggleMenu();
      });
      elements.menuPanel.addEventListener("click", function (event) {
        event.stopPropagation();
      });
      elements.soundBtn.addEventListener("click", toggleSound);
      elements.motionBtn.addEventListener("click", toggleMotion);
      elements.resetRunBtn.addEventListener("click", requestResetCurrentRun);
      elements.deleteSaveBtn.addEventListener("click", requestDeleteSave);
      elements.menuConfirmBtn.addEventListener("click", confirmMenuAction);
      elements.menuCancelBtn.addEventListener("click", clearMenuConfirm);
      elements.menuCloseBtn.addEventListener("click", closeMenu);
      document.addEventListener("click", function () {
        closeMenu();
      });

      window.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !elements.menuPanel.hidden) {
          closeMenu();
          elements.menuBtn.focus();
          return;
        }

        if (event.code === "Space" && shouldSpaceActivateButton()) {
          event.preventDefault();
          handleClick();
        }
      });
    }

    function shouldSpaceActivateButton() {
      var activeElement = document.activeElement;
      return !activeElement || activeElement === document.body || activeElement === elements.root;
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
      DNC.Machine.produce(state, state.powerPerClick, true);
      state.totalClicks += 1;
      state.runClicks += 1;
      state.instability = DNC.clamp(state.instability + state.instabilityPerClick * DNC.Machine.factors(state).heat, CONFIG.statCaps.minimumInstability, CONFIG.statCaps.maximumInstability);

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
        return;
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

      DNC.Machine.tick(state, deltaSeconds);
      if (state.powerPerSecond > 0) { updateAutoCursor(deltaSeconds); }

      if (state.instability >= CONFIG.instability.breachAt) {
        triggerBreach();
        return;
      }

      refresh();
    }

    function save() {
      DNC.Save.save(state);
    }

    function triggerBreach(controlled) {
      if (awaitingBreach) {
        return;
      }

      var lostBonus = DNC.Machine.bonus(state);
      var baseShards = DNC.Instability.getShardReward(state);
      var shardsEarned = baseShards + (controlled === true ? lostBonus : 0);
      var completedRun = { clicks: state.runClicks, power: state.runPowerEarned };
      awaitingBreach = true;
      root.dataset.outcome = controlled === true ? "banked" : "ruptured";
      elements.mainBtn.disabled = true;
      closeMenu();
      DNC.resetRunAfterBreach(state, shardsEarned);
      consoleLog.add(controlled === true ? "CONTROLLED SHUTDOWN. Base and risk bonus secured." : "REALITY BREACH DETECTED. Containment failed.", controlled === true ? "normal" : "critical");
      window.setTimeout(function () {
        breachModal.show(shardsEarned, state.anomalyShards, completedRun.clicks, state.breachCount, completedRun.power);
        refresh();
      }, state.reducedMotion ? 0 : 700);
      getElement("breachBreakdown").textContent = "▣ " + baseShards + " guaranteed  /  " + (controlled === true ? "▣ " + lostBonus + " risk banked" : "◇ " + lostBonus + " risk lost");
      var resultTitle = getElement("breachTitle");
      if (resultTitle) { resultTitle.textContent = controlled === true ? "CONTROLLED SHUTDOWN" : "CATASTROPHIC BREACH"; }
      getElement("breachOverlay").querySelector(".breach-retained").textContent = controlled === true ? "Base and risk bonus banked. Build your next machine." : "Base Shards retained. Lost " + lostBonus + " unbanked bonus Shards.";
      getElement("breachOverlay").classList.toggle("controlled", controlled === true);
      getElement("breachOverlay").querySelector("h3").textContent = controlled === true ? "Rewards secured." : "Containment failed.";
      getElement("breachOverlay").setAttribute("aria-label", controlled === true ? "Controlled shutdown. Rewards secured." : "Catastrophic breach. Base rewards retained.");
      sound.play(controlled === true ? "shardUpgrade" : "breach");

      if (!state.reducedMotion && controlled !== true) {
        root.classList.add("shake");
        window.setTimeout(function () {
          root.classList.remove("shake");
        }, CONFIG.timing.breachShakeMs);
      }

      save();
    }

    function closeBreach() {
      delete root.dataset.outcome;
      elements.mainBtn.disabled = false;
      awaitingBreach = false;
      breachModal.hide();
      consoleLog.add("System reinitialized. Shards retained.", "normal");
      addPermanentEffectConsole();
      tabs.activate("shard");
      elements.mainBtn.focus({ preventScroll: true });
      refresh();
    }

    function resetCurrentRun() {
      DNC.resetCurrentRun(state);
      awaitingBreach = false;
      firstClickLogged = state.totalClicks > 0;
      breachModal.hide();
      consoleLog.add("Current run reset. Shards preserved.", "warning");
      save();
      tabs.activate("power");
      closeMenu();
      refresh();
    }

    function deleteSaveData() {
      state = DNC.Save.reset();
      sound = DNC.createSoundSystem(state);
      awaitingBreach = false;
      firstClickLogged = false;
      breachModal.hide();
      consoleLog.reset();
      consoleLog.add("All save data deleted. Fresh session started.", "critical");
      save();
      tabs.activate("power");
      closeMenu();
      refresh();
    }

    function toggleMenu() {
      if (elements.menuPanel.hidden) {
        openMenu();
      } else {
        closeMenu();
      }
    }

    function openMenu() {
      elements.menuPanel.hidden = false;
      elements.menuBtn.setAttribute("aria-expanded", "true");
    }

    function closeMenu() {
      elements.menuPanel.hidden = true;
      elements.menuBtn.setAttribute("aria-expanded", "false");
      clearMenuConfirm();
    }

    function requestResetCurrentRun() {
      setMenuConfirm("resetRun", CONFIG.menu.resetRunConfirm);
    }

    function requestDeleteSave() {
      setMenuConfirm("deleteSave", CONFIG.menu.deleteSaveConfirm);
    }

    function setMenuConfirm(action, message) {
      clearMenuConfirm();
      menuActionPending = action;
      elements.menuConfirmText.textContent = message;
      elements.menuConfirm.hidden = false;
      elements.menuConfirmBtn.focus();
      menuConfirmTimeoutId = window.setTimeout(clearMenuConfirm, CONFIG.timing.resetConfirmMs);
    }

    function clearMenuConfirm() {
      if (menuConfirmTimeoutId !== null) {
        window.clearTimeout(menuConfirmTimeoutId);
        menuConfirmTimeoutId = null;
      }
      menuActionPending = "";
      elements.menuConfirm.hidden = true;
      elements.menuConfirmText.textContent = "";
    }

    function confirmMenuAction() {
      if (menuActionPending === "resetRun") {
        resetCurrentRun();
        return;
      }

      if (menuActionPending === "deleteSave") {
        deleteSaveData();
      }
    }

    function applyMenuLabels() {
      getElement("forecastLabel").textContent = CONFIG.operatorGuide.forecastLabel;
      getElement("forecastBasis").textContent = CONFIG.operatorGuide.forecastBasis + " Produce above " + CONFIG.machine.redline + "% Danger to earn risk. Stabilize reduces output while cooling. Surges start at " + CONFIG.machine.surgeAt + "% Danger.";
      getElement("breachContinueBtn").textContent = CONFIG.operatorGuide.breachContinueLabel;
      root.style.setProperty("--reward-feedback-ms", CONFIG.timing.rewardFeedbackMs + "ms");
      root.style.setProperty("--meter-transition-ms", CONFIG.timing.meterTransitionMs + "ms");
      root.style.setProperty("--floating-text-ms", CONFIG.timing.floatingTextMs + "ms");
      elements.menuBtn.textContent = CONFIG.menu.buttonLabel;
      elements.menuTitle.textContent = CONFIG.menu.title;
      elements.resetRunBtn.textContent = CONFIG.menu.resetRunLabel;
      elements.deleteSaveBtn.textContent = CONFIG.menu.deleteSaveLabel;
      elements.menuConfirmBtn.textContent = CONFIG.menu.confirmLabel;
      elements.menuCancelBtn.textContent = CONFIG.menu.cancelLabel;
      elements.menuCloseBtn.textContent = CONFIG.menu.closeLabel;
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

      elements.powerDisplay.textContent = DNC.formatNumber(state.power);
      elements.shardsDisplay.textContent = DNC.formatNumber(state.anomalyShards);
      elements.breachesDisplay.textContent = DNC.formatNumber(state.breachCount);
      elements.instabilityDisplay.textContent = Math.floor(state.instability) + "%";
      elements.instabilityFill.style.width = DNC.clamp(state.instability, CONFIG.statCaps.minimumInstability, CONFIG.statCaps.maximumInstability) + "%";
      elements.instabilityFill.style.background = bandData.fill;
      elements.perClickDisplay.textContent = formatRate(state.powerPerClick * DNC.Machine.multiplier(state, true));
      elements.perSecDisplay.textContent = formatRate(state.powerPerSecond * DNC.Machine.multiplier(state, false));
      elements.clickCount.textContent = "TOTAL INTERACTIONS: " + DNC.formatNumber(state.totalClicks);
      elements.stateBadge.className = "state-badge " + band;
      elements.stateBadge.textContent = bandData.badge;
      elements.stateDot.style.background = bandData.color;
      elements.warnHeadline.textContent = bandData.headline;
      elements.warnHeadline.style.color = bandData.headlineColor;
      elements.soundBtn.textContent = CONFIG.menu.soundLabel + ": " + (state.audioEnabled ? "ON" : "OFF");
      elements.motionBtn.textContent = CONFIG.menu.motionLabel + ": " + (state.reducedMotion ? "OFF" : "ON");
      elements.root.classList.toggle("reduced-motion", state.reducedMotion);

      elements.overlayWarning.style.display = "none";
      elements.instabWarn.style.display = "none";
      elements.mainBtn.classList.toggle("critical", band === "critical" && !state.reducedMotion);
      elements.root.dataset.danger = band;
      elements.root.dataset.cooling = String(state.machine.stabilizing);
      elements.root.dataset.redline = String(state.instability >= CONFIG.machine.redline);
      elements.root.dataset.surge = String(state.instability >= CONFIG.machine.surgeAt);
      elements.btnContainer.style.setProperty("--danger-angle", (state.instability * 3.6) + "deg");
      elements.btnContainer.style.setProperty("--heat", state.instability / 100);
      elements.btnContainer.style.setProperty("--output-speed", (2.4 / Math.max(1, DNC.Machine.multiplier(state, true))) + "s");

      elements.mainBtn.innerHTML = "DO NOT<br>CLICK";

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

      getElement("stabilizeBtn").disabled = awaitingBreach;
      machineControls.hidden = state.instability === 0 && state.powerPerSecond === 0 && DNC.Instability.getShardReward(state) === 0 && state.breachCount === 0 && !state.machine.stabilizing;
      machinePanel.hidden = !state.machine.modules.length && !state.machine.offers.length;
      var f = DNC.Machine.factors(state), m = state.machine;
      var bonus = DNC.Machine.bonus(state);
      var riskProgress = Math.max(0, Math.min(100, 100 * (m.risk - bonus * bonus * CONFIG.machine.riskDivisor) / ((2 * bonus + 1) * CONFIG.machine.riskDivisor)));
      getElement("machineRisk").hidden = !m.risk && state.instability < CONFIG.machine.redline;
      getElement("machineRisk").setAttribute("aria-valuenow", Math.floor(riskProgress));
      getElement("machineRiskFill").style.width = riskProgress + "%";
      getElement("machineStatus").textContent = "OUTPUT ×" + DNC.Machine.multiplier(state, true).toFixed(2) + "  /  RISK +" + bonus +
        (state.instability >= CONFIG.machine.surgeAt ? "  /  SURGE +" + (CONFIG.machine.surgeHeat * f.surge).toFixed(1) + "% · " + Math.max(0, f.warning - m.surge).toFixed(1) + "s" : "");
      elements.stateBadge.textContent = m.stabilizing ? "❄ COOLING" : state.instability >= CONFIG.machine.redline ? "▲ REDLINE" : bandData.badge;
      getElement("stabilizeBtn").setAttribute("aria-pressed", String(m.stabilizing));
      getElement("stabilizeBtn").textContent = m.stabilizing ? "RESUME OUTPUT" : "STABILIZE / " + Math.round(f.retained * 100) + "% OUTPUT";
      getElement("cashOutBtn").textContent = "CASH OUT +" + (DNC.Instability.getShardReward(state) + DNC.Machine.bonus(state));
      getElement("cashOutBtn").disabled = awaitingBreach || DNC.Instability.getShardReward(state) < 1;
      getElement("purgeBtn").hidden = state.instability < CONFIG.machine.surgeAt;
      getElement("purgeBtn").disabled = awaitingBreach || m.rescued;
      getElement("purgeBtn").textContent = m.rescued ? "PURGE SPENT THIS RUN" : "PURGE / LOSE BONUS + HALF POWER";
      getElement("machineBuild").textContent = m.modules.length ? "Machine: " + m.modules.map(function (id) { return CONFIG.machine.modules.find(function (v) { return v.id === id; }).name; }).join(" + ") : "";
      var signature = m.offers.join(",") + ":" + m.round;
      if (signature !== offerSignature) {
        offerSignature = signature;
        var offers = getElement("machineOffers"); offers.replaceChildren();
        if (m.offers.length) {
          var note = document.createElement("p");
          note.textContent = "Optional: choose a module for slot " + (m.round % CONFIG.machine.slots + 1) + (m.modules.length >= CONFIG.machine.slots ? " (replaces its current module)." : ". Two slots; choices last this run.");
          offers.appendChild(note);
          if (m.modules.length >= CONFIG.machine.slots) {
            var keep = document.createElement("button"); keep.type = "button"; keep.textContent = "KEEP CURRENT MACHINE";
            keep.onclick = function () { m.offers = []; m.round++; m.nextDraft = state.runPowerEarned + CONFIG.machine.draftStep * m.round; save(); refresh(); }; offers.appendChild(keep);
          }
          m.offers.forEach(function (id) {
            var def = CONFIG.machine.modules.find(function (v) { return v.id === id; });
            var button = document.createElement("button"); button.type = "button"; button.textContent = def.name + " / " + def.text;
            button.onclick = function () { if (!awaitingBreach && DNC.Machine.choose(state, id)) { save(); refresh(); } };
            offers.appendChild(button);
          });
        }
      }
      refreshRunProgress(band);
      refreshCards();
      refreshShardCards();
      autoCursor.setActive(state.powerPerSecond > 0);
    }

    function refreshRunProgress(band) {
      var guide = CONFIG.operatorGuide;
      var forecast = DNC.Instability.getForecast(state);
      var hasAffordableShard = DNC.SHARD_UPGRADE_DEFS.some(function (upgrade) { return DNC.ShardUpgrades.canBuy(state, upgrade.id); });
      if (hasAffordableShard && state.breachCount > 0 && Object.keys(state.upgrades).length === 0) {
        currentGuide = guide.permanent;
      } else if (state.totalClicks === 0) {
        currentGuide = guide.firstContact;
      } else if (band === "critical") {
        currentGuide = guide.critical;
      } else if (band === "unstable" || band === "disturbed") {
        currentGuide = guide.unstable;
      } else if (!state.upgrades.powerTap) {
        currentGuide = guide.firstUpgrade;
      } else if (state.powerPerSecond === 0) {
        currentGuide = guide.automation;
      } else {
        currentGuide = guide.growing;
      }
      elements.guideTitle.textContent = currentGuide.title;
      elements.guideText.textContent = currentGuide.text;
      var firstUpgradeReady = currentGuide === guide.firstUpgrade && DNC.Upgrades.canBuy(state, "powerTap");
      elements.guideAction.textContent = firstUpgradeReady ? "INSTALL POWER TAP / " + DNC.Upgrades.getCost(state, "powerTap") + " POWER" : currentGuide.action;
      elements.guideAction.classList.toggle("upgrade-ready", firstUpgradeReady);
      elements.forecastShards.textContent = "+" + DNC.formatNumber(forecast.shards) + (forecast.shards === 1 ? " SHARD" : " SHARDS");
      elements.forecastNext.textContent = guide.nextShardLabel + ": +" + DNC.formatNumber(forecast.nextShards);
      elements.forecastRemaining.textContent = DNC.formatNumber(Math.ceil(forecast.remainingPower)) + " Power away";
      elements.forecastFill.style.width = (forecast.progress * 100) + "%";
      elements.forecastMeter.setAttribute("aria-valuenow", Math.round(forecast.progress * 100));
      elements.heatClicks.textContent = forecast.clicksToBreach + " " + guide.clicksLabel;
      if (forecast.netInstability === 0) {
        elements.heatRate.textContent = guide.balancedLabel;
      } else {
        elements.heatRate.textContent = Math.abs(forecast.netInstability).toFixed(2) + "% " + (forecast.netInstability < 0 ? guide.coolingLabel : guide.heatingLabel);
      }
      elements.heatRate.classList.toggle("heating", forecast.netInstability > 0);
      if (forecast.shards > lastForecastShards && !awaitingBreach) {
        elements.breachForecast.classList.add("reward-increased");
        window.clearTimeout(forecastFeedbackTimeoutId);
        forecastFeedbackTimeoutId = window.setTimeout(function () { elements.breachForecast.classList.remove("reward-increased"); }, CONFIG.timing.rewardFeedbackMs);
        consoleLog.add(guide.rewardIncreaseLog.replace("{shards}", forecast.shards), "normal");
        sound.play("shardUpgrade");
      }
      lastForecastShards = forecast.shards;
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
          "<div>Starting Power: +" + DNC.formatNumber(summaryValues.startingPowerBonus) + "</div>",
          summaryValues.outputMultiplier > 1 ? "<div>Final manual + auto output: x" + summaryValues.outputMultiplier.toFixed(2) + "</div>" : ""
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
        costEl.innerHTML = maxed ? "MAXED" : "LV " + level + " / " + (upgrade.maxLevel === null ? "ENDLESS" : upgrade.maxLevel) + "<br>Cost: \u25c6 " + DNC.formatNumber(cost) + " Shards";

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
      elements.powerDisplay.classList.remove("producing");
      void elements.powerDisplay.offsetWidth;
      elements.powerDisplay.classList.add("producing");
    }

    function showAutoFeedback() {
      elements.powerDisplay.classList.add("producing");
    }

    function pulseButton() {
      elements.mainBtn.classList.add("pressed");
      window.setTimeout(function () {
        elements.mainBtn.classList.remove("pressed");
      }, CONFIG.timing.clickFeedbackMs);


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
