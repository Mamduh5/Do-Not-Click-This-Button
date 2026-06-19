(function () {
  "use strict";

  window.DNC = window.DNC || {};

  var FONT = "Arial, Helvetica, sans-serif";
  var MONO = "Courier New, monospace";

  DNC.GameScene = class GameScene extends Phaser.Scene {
    constructor() {
      super("GameScene");
      this.state = null;
      this.lastSaveAt = 0;
      this.awaitingBreach = false;
      this.pendingShardReward = 0;
      this.lastBand = "";
      this.lastConsoleAt = 0;
      this.resetConfirmUntil = 0;
      this.buttonLabelIndex = 0;
      this.elapsed = 0;
      this.cards = [];
      this.consoleLines = [];
    }

    create() {
      this.state = DNC.Save.load();
      this.lastSaveAt = Date.now();
      this.events.emit("save:loaded", this.state);

      this.buildWorld();
      this.layout();
      this.bindInput();
      this.addConsole("System online. Containment nominal.", "normal");
      this.addConsole("User compliance: pending verification.", "normal");
      this.refreshAll();

      this.scale.on("resize", this.layout, this);
    }

    update(time, delta) {
      var deltaSeconds = delta / 1000;
      this.elapsed += deltaSeconds;

      if (!this.awaitingBreach) {
        this.runPassiveTick(deltaSeconds);
      }

      this.applyMotion(time);

      if (Date.now() - this.lastSaveAt >= 5000) {
        this.save();
      }

      if (this.resetConfirmUntil && Date.now() > this.resetConfirmUntil) {
        this.resetConfirmUntil = 0;
        this.resetText.setText("Reset Save");
      }
    }

    buildWorld() {
      this.root = this.add.container(0, 0);

      this.background = this.add.graphics();
      this.panels = this.add.graphics();
      this.vignette = this.add.graphics();
      this.vignette.setAlpha(0);
      this.root.add([this.background, this.panels, this.vignette]);

      this.titleText = this.add.text(0, 0, "Do Not Click This Button", {
        fontFamily: FONT,
        fontSize: "28px",
        fontStyle: "bold",
        color: "#f0f4ff"
      }).setOrigin(0.5, 0);

      this.warningText = this.add.text(0, 0, "Seriously. Do not click it.", {
        fontFamily: MONO,
        fontSize: "16px",
        color: "#e44d4d"
      }).setOrigin(0.5, 0);

      this.statsText = this.add.text(0, 0, "", {
        fontFamily: MONO,
        fontSize: "15px",
        color: "#c9d5df",
        lineSpacing: 7
      });

      this.bandText = this.add.text(0, 0, "", {
        fontFamily: MONO,
        fontSize: "15px",
        color: "#53d86a"
      }).setOrigin(0.5, 0);

      this.buttonGroup = this.add.container(0, 0);
      this.buttonHalo = this.add.graphics();
      this.buttonShape = this.add.graphics();
      this.buttonText = this.add.text(0, 0, "DO NOT CLICK", {
        fontFamily: FONT,
        fontSize: "18px",
        fontStyle: "bold",
        color: "#ffffff",
        align: "center",
        wordWrap: { width: 130 }
      }).setOrigin(0.5);

      this.buttonZone = this.add.zone(0, 0, 170, 170).setCircleDropZone(85);
      this.buttonZone.setInteractive({
        useHandCursor: true
      });

      this.buttonGroup.add([this.buttonHalo, this.buttonShape, this.buttonText, this.buttonZone]);

      this.shopTitle = this.add.text(0, 0, "UPGRADE SHOP", {
        fontFamily: MONO,
        fontSize: "15px",
        color: "#7f92a3"
      });

      this.cards = DNC.UPGRADE_DEFS.map(function (upgrade) {
        return this.createUpgradeCard(upgrade);
      }, this);

      this.consoleTitle = this.add.text(0, 0, "CONSOLE / WARNING LOG", {
        fontFamily: MONO,
        fontSize: "13px",
        color: "#7f92a3"
      });

      this.consoleGroup = this.add.container(0, 0);

      this.motionText = this.createSmallButton("Reduced Motion: Off", this.toggleReducedMotion.bind(this));
      this.resetText = this.createSmallButton("Reset Save", this.confirmReset.bind(this));
      this.saveText = this.add.text(0, 0, "", {
        fontFamily: MONO,
        fontSize: "12px",
        color: "#6d7984"
      }).setOrigin(1, 0);

      this.breachOverlay = this.add.container(0, 0).setVisible(false).setDepth(50);
      this.breachBg = this.add.graphics();
      this.breachPanel = this.add.graphics();
      this.breachTitle = this.add.text(0, 0, "REALITY BREACH DETECTED", {
        fontFamily: FONT,
        fontSize: "28px",
        fontStyle: "bold",
        color: "#ffffff",
        align: "center"
      }).setOrigin(0.5);
      this.breachBody = this.add.text(0, 0, "", {
        fontFamily: MONO,
        fontSize: "15px",
        color: "#dfe8ef",
        align: "center",
        lineSpacing: 8
      }).setOrigin(0.5);
      this.breachContinue = this.createSmallButton("Continue", this.closeBreachModal.bind(this));
      this.breachContinue.setOrigin(0.5);
      this.breachOverlay.add([this.breachBg, this.breachPanel, this.breachTitle, this.breachBody, this.breachContinue]);
    }

    bindInput() {
      this.buttonZone.on("pointerover", function () {
        this.buttonGroup.setScale(1.04);
      }, this);

      this.buttonZone.on("pointerout", function () {
        this.buttonGroup.setScale(1);
      }, this);

      this.buttonZone.on("pointerdown", function () {
        this.handleButtonClick();
      }, this);

      this.input.keyboard.on("keydown-SPACE", function () {
        this.handleButtonClick();
      }, this);
    }

    createSmallButton(label, callback) {
      var text = this.add.text(0, 0, label, {
        fontFamily: MONO,
        fontSize: "13px",
        color: "#d7e1ea",
        backgroundColor: "#17202a",
        padding: { x: 10, y: 7 }
      });

      text.setInteractive({ useHandCursor: true });
      text.on("pointerdown", callback);
      text.on("pointerover", function () {
        text.setStyle({ backgroundColor: "#22303f" });
      });
      text.on("pointerout", function () {
        text.setStyle({ backgroundColor: "#17202a" });
      });
      return text;
    }

    createUpgradeCard(upgrade) {
      var container = this.add.container(0, 0);
      var bg = this.add.graphics();
      var title = this.add.text(0, 0, upgrade.name, {
        fontFamily: FONT,
        fontSize: "15px",
        fontStyle: "bold",
        color: "#e7eef6"
      });
      var description = this.add.text(0, 0, upgrade.description, {
        fontFamily: MONO,
        fontSize: "11px",
        color: "#93a4b4",
        wordWrap: { width: 260 }
      });
      var meta = this.add.text(0, 0, "", {
        fontFamily: MONO,
        fontSize: "12px",
        color: "#8fd7ff"
      });
      var zone = this.add.zone(0, 0, 280, 74).setOrigin(0);

      zone.setInteractive({ useHandCursor: true });
      zone.on("pointerdown", function () {
        this.purchaseUpgrade(upgrade.id);
      }, this);

      container.add([bg, title, description, meta, zone]);
      container.upgrade = upgrade;
      container.bg = bg;
      container.title = title;
      container.description = description;
      container.meta = meta;
      container.zone = zone;
      return container;
    }

    layout() {
      var width = this.scale.width;
      var height = this.scale.height;
      var isCompact = width < 760;
      var margin = 18;
      var headerHeight = 118;
      var consoleHeight = isCompact ? 132 : 126;
      var shopWidth = isCompact ? width - margin * 2 : 320;
      var playWidth = isCompact ? width - margin * 2 : width - shopWidth - margin * 3;
      var playX = margin;
      var shopX = isCompact ? margin : playX + playWidth + margin;
      var shopY = isCompact ? height * 0.52 : headerHeight;
      var shopHeight = isCompact ? height - shopY - consoleHeight - margin : height - headerHeight - consoleHeight - margin * 2;
      var centerX = playX + playWidth / 2;
      var centerY = isCompact ? headerHeight + 140 : headerHeight + (height - headerHeight - consoleHeight) / 2;

      this.layoutData = {
        width: width,
        height: height,
        isCompact: isCompact,
        margin: margin,
        headerHeight: headerHeight,
        consoleHeight: consoleHeight,
        shopX: shopX,
        shopY: shopY,
        shopWidth: shopWidth,
        shopHeight: Math.max(190, shopHeight),
        playX: playX,
        playWidth: playWidth,
        centerX: centerX,
        centerY: centerY
      };

      this.background.clear();
      this.background.fillStyle(0x07090d, 1);
      this.background.fillRect(0, 0, width, height);
      this.background.fillStyle(0x0c1118, 1);
      this.background.fillRect(0, 0, width, headerHeight);
      this.background.lineStyle(1, 0x1d2a35, 1);
      this.background.lineBetween(0, headerHeight, width, headerHeight);

      this.drawPanels();

      this.titleText.setPosition(width / 2, 18);
      this.warningText.setPosition(width / 2, 55);
      this.statsText.setPosition(margin, 78);
      this.bandText.setPosition(width / 2, 86);

      this.buttonGroup.setPosition(centerX, centerY);
      this.drawButton();

      this.shopTitle.setPosition(shopX + 14, shopY + 12);
      this.layoutCards();

      this.consoleTitle.setPosition(margin, height - consoleHeight + 12);
      this.consoleGroup.setPosition(margin, height - consoleHeight + 36);
      this.layoutConsoleLines();

      this.motionText.setPosition(width - margin - 168, 80);
      this.resetText.setPosition(width - margin - 168, 44);
      this.saveText.setPosition(width - margin, 18);

      this.layoutBreachModal();
      this.refreshAll();
    }

    drawPanels() {
      var data = this.layoutData;
      var consoleY = data.height - data.consoleHeight;

      this.panels.clear();
      this.panels.fillStyle(0x0b1017, 1);
      this.panels.fillRoundedRect(data.shopX, data.shopY, data.shopWidth, data.shopHeight, 8);
      this.panels.lineStyle(1, 0x223140, 1);
      this.panels.strokeRoundedRect(data.shopX, data.shopY, data.shopWidth, data.shopHeight, 8);
      this.panels.fillStyle(0x080b10, 1);
      this.panels.fillRect(0, consoleY, data.width, data.consoleHeight);
      this.panels.lineStyle(1, 0x1b2732, 1);
      this.panels.lineBetween(0, consoleY, data.width, consoleY);
    }

    drawButton() {
      var band = DNC.Instability.getBandConfig(this.state.instability);
      var critical = band.band === "critical";

      this.buttonHalo.clear();
      this.buttonHalo.lineStyle(2, band.color, critical ? 0.75 : 0.35);
      this.buttonHalo.strokeCircle(0, 0, 92);
      this.buttonHalo.lineStyle(1, 0xffd766, critical ? 0.65 : 0.25);
      this.buttonHalo.strokeCircle(0, 0, 76);

      this.buttonShape.clear();
      this.buttonShape.fillStyle(0x3a0608, 1);
      this.buttonShape.fillCircle(0, 0, 68);
      this.buttonShape.fillStyle(0xb91420, 1);
      this.buttonShape.fillCircle(0, 0, 60);
      this.buttonShape.fillStyle(0xe33b46, 1);
      this.buttonShape.fillCircle(-16, -18, 24);
      this.buttonShape.lineStyle(4, critical ? 0xffffff : 0xff6068, 1);
      this.buttonShape.strokeCircle(0, 0, 68);
    }

    layoutCards() {
      var data = this.layoutData;
      var x = data.shopX + 14;
      var y = data.shopY + 42;
      var cardWidth = data.shopWidth - 28;
      var cardHeight = data.isCompact ? 58 : 74;

      this.cards.forEach(function (card) {
        card.setPosition(x, y);
        card.zone.setSize(cardWidth, cardHeight);
        card.title.setPosition(12, 8);
        card.description.setPosition(12, data.isCompact ? 28 : 31);
        card.description.setWordWrapWidth(cardWidth - 24);
        card.meta.setPosition(12, cardHeight - 20);
        card.cardWidth = cardWidth;
        card.cardHeight = cardHeight;
        y += cardHeight + 8;
      });
    }

    layoutConsoleLines() {
      this.consoleLines.forEach(function (line, index) {
        line.setPosition(0, index * 20);
      });
    }

    layoutBreachModal() {
      var width = this.scale.width;
      var height = this.scale.height;
      var panelWidth = Math.min(520, width - 36);
      var panelHeight = 300;
      var x = width / 2;
      var y = height / 2;

      this.breachBg.clear();
      this.breachBg.fillStyle(0x07090d, 0.92);
      this.breachBg.fillRect(0, 0, width, height);

      this.breachPanel.clear();
      this.breachPanel.fillStyle(0x101722, 1);
      this.breachPanel.fillRoundedRect(x - panelWidth / 2, y - panelHeight / 2, panelWidth, panelHeight, 10);
      this.breachPanel.lineStyle(2, 0xff3030, 1);
      this.breachPanel.strokeRoundedRect(x - panelWidth / 2, y - panelHeight / 2, panelWidth, panelHeight, 10);

      this.breachTitle.setPosition(x, y - 95);
      this.breachBody.setPosition(x, y - 8);
      this.breachBody.setWordWrapWidth(panelWidth - 54);
      this.breachContinue.setPosition(x, y + 102);
    }

    handleButtonClick() {
      if (this.awaitingBreach) {
        return;
      }

      this.state.power += this.state.powerPerClick;
      this.state.totalPowerEarned += this.state.powerPerClick;
      this.state.instability = DNC.clamp(this.state.instability + this.state.instabilityPerClick, 0, 100);
      this.events.emit("button:clicked", this.state);
      this.events.emit("power:changed", this.state.power);
      this.events.emit("instability:changed", this.state.instability);

      this.showFloatingText("+" + DNC.formatNumber(this.state.powerPerClick), this.buttonGroup.x, this.buttonGroup.y - 65);
      this.pulseButton();
      this.maybeClickShake();

      if (this.state.instability >= 100) {
        this.triggerBreach();
      }

      this.refreshAll();
    }

    runPassiveTick(deltaSeconds) {
      var powerGain = this.state.powerPerSecond * deltaSeconds;
      var instabilityGain = (this.state.instabilityPerSecond - this.state.containmentPerSecond) * deltaSeconds;

      if (powerGain > 0) {
        this.state.power += powerGain;
        this.state.totalPowerEarned += powerGain;
        this.events.emit("power:changed", this.state.power);
      }

      if (instabilityGain !== 0) {
        this.state.instability = DNC.clamp(this.state.instability + instabilityGain, 0, 100);
        this.events.emit("instability:changed", this.state.instability);
      }

      if (this.state.instability >= 100) {
        this.triggerBreach();
      }

      this.refreshAll();
    }

    purchaseUpgrade(id) {
      if (this.awaitingBreach) {
        return;
      }

      if (!DNC.Upgrades.buy(this.state, id)) {
        this.addConsole("Purchase denied. Insufficient Power.", "warning");
        return;
      }

      var upgrade = DNC.Upgrades.get(id);
      this.events.emit("upgrade:purchased", id);
      this.addConsole(upgrade.name + " installed.", upgrade.category === "risk" ? "critical" : "normal");
      this.save();
      this.refreshAll();
    }

    triggerBreach() {
      if (this.awaitingBreach) {
        return;
      }

      var shardsEarned = DNC.Instability.getShardReward(this.state);
      this.awaitingBreach = true;
      this.pendingShardReward = shardsEarned;
      this.state.breachCount += 1;
      this.state.anomalyShards += shardsEarned;
      this.state.power = 0;
      this.state.instability = 0;
      DNC.recalculateStats(this.state);
      this.events.emit("breach:triggered", shardsEarned);

      this.breachBody.setText([
        "Containment failed.",
        "Anomaly Shards gained: " + shardsEarned,
        "Breach Count: " + this.state.breachCount,
        "",
        "Power has been reset. Shards persist."
      ]);

      this.breachOverlay.setVisible(true);
      this.addConsole("REALITY BREACH DETECTED. Reset protocols armed.", "critical");

      if (!this.state.reducedMotion) {
        this.cameras.main.flash(280, 255, 48, 48);
        this.cameras.main.shake(300, 0.01);
      }

      this.save();
      this.refreshAll();
    }

    closeBreachModal() {
      this.awaitingBreach = false;
      this.pendingShardReward = 0;
      this.breachOverlay.setVisible(false);
      this.addConsole("Containment restarted. Do not repeat the incident.", "normal");
      this.refreshAll();
    }

    pulseButton() {
      if (this.state.reducedMotion) {
        return;
      }

      this.tweens.add({
        targets: this.buttonGroup,
        scaleX: 0.94,
        scaleY: 0.94,
        yoyo: true,
        duration: 55
      });
    }

    maybeClickShake() {
      var band = DNC.Instability.getBand(this.state.instability);

      if (this.state.reducedMotion || band === "stable") {
        return;
      }

      if (band === "critical") {
        this.cameras.main.shake(90, 0.006);
      } else if (band === "unstable") {
        this.cameras.main.shake(70, 0.003);
      } else if (band === "disturbed") {
        this.tweens.add({
          targets: this.buttonGroup,
          x: this.buttonGroup.x + 4,
          yoyo: true,
          duration: 35,
          repeat: 1
        });
      }
    }

    showFloatingText(text, x, y) {
      var label = this.add.text(x, y, text, {
        fontFamily: FONT,
        fontSize: "18px",
        fontStyle: "bold",
        color: "#8fd7ff"
      }).setOrigin(0.5).setDepth(10);

      if (this.state.reducedMotion) {
        label.setAlpha(0.85);
        this.time.delayedCall(350, function () {
          label.destroy();
        });
        return;
      }

      this.tweens.add({
        targets: label,
        y: y - 48,
        alpha: 0,
        duration: 800,
        ease: "Cubic.easeOut",
        onComplete: function () {
          label.destroy();
        }
      });
    }

    applyMotion(time) {
      if (!this.layoutData) {
        return;
      }

      var band = DNC.Instability.getBand(this.state.instability);

      if (this.state.reducedMotion) {
        this.cards.forEach(function (card) {
          card.setAngle(0);
        });
        this.vignette.setAlpha(band === "critical" ? 0.28 : band === "unstable" ? 0.16 : 0);
        return;
      }

      if (band === "unstable" || band === "critical") {
        this.cards.forEach(function (card, index) {
          card.setAngle(Math.sin(time / 480 + index) * (band === "critical" ? 0.8 : 0.35));
        });
      } else {
        this.cards.forEach(function (card) {
          card.setAngle(0);
        });
      }

      var alpha = 0;
      if (band === "unstable") {
        alpha = 0.08 + Math.sin(time / 200) * 0.03;
      } else if (band === "critical") {
        alpha = 0.24 + Math.sin(time / 100) * 0.08;
      }
      this.vignette.setAlpha(Math.max(0, alpha));
    }

    refreshAll() {
      if (!this.layoutData || !this.state) {
        return;
      }

      var band = DNC.Instability.getBandConfig(this.state.instability);

      this.refreshStats(band);
      this.refreshCards();
      this.refreshGlitch(band);
      this.drawButton();
      this.drawVignette();
      this.motionText.setText("Reduced Motion: " + (this.state.reducedMotion ? "On" : "Off"));
      this.saveText.setText("Saved: " + new Date(this.state.lastSavedAt).toLocaleTimeString());
    }

    refreshStats(band) {
      this.statsText.setText([
        "Power: " + DNC.formatNumber(this.state.power),
        "Anomaly Shards: " + DNC.formatNumber(this.state.anomalyShards) + "    Breaches: " + this.state.breachCount,
        "Power/click: " + DNC.formatNumber(this.state.powerPerClick) + "    Power/sec: " + DNC.formatNumber(this.state.powerPerSecond),
        "Instability/click: " + this.state.instabilityPerClick.toFixed(2) + "    Containment/sec: " + this.state.containmentPerSecond.toFixed(2)
      ]);

      this.bandText.setText("Instability: " + Math.floor(this.state.instability) + "% / " + band.label);
      this.bandText.setColor("#" + band.color.toString(16).padStart(6, "0"));
      this.warningText.setText(band.warning);
      this.warningText.setColor("#" + band.color.toString(16).padStart(6, "0"));
    }

    refreshCards() {
      this.cards.forEach(function (card) {
        var upgrade = card.upgrade;
        var level = DNC.Upgrades.getLevel(this.state, upgrade.id);
        var cost = DNC.Upgrades.getCost(this.state, upgrade.id);
        var maxed = upgrade.maxLevel !== null && level >= upgrade.maxLevel;
        var affordable = DNC.Upgrades.canBuy(this.state, upgrade.id);
        var tint = affordable ? 0x15202a : 0x10151c;
        var border = affordable ? 0x8fd7ff : 0x26323d;

        if (upgrade.category === "risk") {
          border = affordable ? 0xff6060 : 0x54272d;
        } else if (upgrade.category === "containment") {
          border = affordable ? 0x53d86a : 0x274334;
        }

        card.bg.clear();
        card.bg.fillStyle(tint, affordable ? 1 : 0.75);
        card.bg.fillRoundedRect(0, 0, card.cardWidth, card.cardHeight, 7);
        card.bg.lineStyle(1, border, maxed ? 0.45 : 1);
        card.bg.strokeRoundedRect(0, 0, card.cardWidth, card.cardHeight, 7);

        card.title.setAlpha(maxed ? 0.55 : affordable ? 1 : 0.5);
        card.description.setAlpha(maxed ? 0.45 : affordable ? 1 : 0.55);
        card.meta.setAlpha(maxed ? 0.45 : 1);
        card.meta.setText(maxed ? "Level " + level + " / MAX" : "Level " + level + "  Cost " + DNC.formatNumber(cost));
      }, this);
    }

    refreshGlitch(band) {
      if (band.band !== this.lastBand) {
        this.lastBand = band.band;
        this.addBandConsoleMessage(band.band);
      }

      if (band.band === "critical") {
        if (this.elapsed > this.buttonLabelIndex + 1.5) {
          this.buttonLabelIndex = Math.floor(this.elapsed);
        }

        var labels = band.buttonLabels;
        this.buttonText.setText(labels[this.buttonLabelIndex % labels.length]);
      } else {
        this.buttonText.setText(band.buttonLabels[0]);
      }
    }

    drawVignette() {
      var width = this.scale.width;
      var height = this.scale.height;
      var band = DNC.Instability.getBand(this.state.instability);

      this.vignette.clear();
      if (band === "stable" || band === "disturbed") {
        return;
      }

      this.vignette.lineStyle(band === "critical" ? 30 : 18, 0xff2020, 1);
      this.vignette.strokeRect(8, 8, width - 16, height - 16);
    }

    addBandConsoleMessage(band) {
      if (band === "stable") {
        this.addConsole("Containment state: stable.", "normal");
      } else if (band === "disturbed") {
        this.addConsole("Warning: unauthorized button contact logged.", "warning");
      } else if (band === "unstable") {
        this.addConsole("Reality coherence falling. Upgrade cards may drift.", "warning");
      } else if (band === "critical") {
        this.addConsole("Critical alarm. Stop clicking immediately.", "critical");
      }
    }

    addConsole(message, severity) {
      var now = Date.now();
      var color = severity === "critical" ? "#ff6060" : severity === "warning" ? "#f2b84b" : "#7ccf91";
      var text = this.add.text(0, 0, "> " + message, {
        fontFamily: MONO,
        fontSize: "12px",
        color: color,
        wordWrap: { width: Math.max(300, this.scale.width - 40) }
      });

      this.consoleGroup.add(text);
      this.consoleLines.push(text);

      while (this.consoleLines.length > 5) {
        this.consoleLines.shift().destroy();
      }

      this.lastConsoleAt = now;
      this.layoutConsoleLines();
    }

    toggleReducedMotion() {
      this.state.reducedMotion = !this.state.reducedMotion;
      this.addConsole("Reduced motion " + (this.state.reducedMotion ? "enabled." : "disabled."), "normal");
      this.save();
      this.refreshAll();
    }

    confirmReset() {
      if (this.resetConfirmUntil && Date.now() <= this.resetConfirmUntil) {
        this.resetSave();
        return;
      }

      this.resetConfirmUntil = Date.now() + 4000;
      this.resetText.setText("Confirm Reset?");
    }

    resetSave() {
      this.state = DNC.Save.reset();
      this.awaitingBreach = false;
      this.breachOverlay.setVisible(false);
      this.consoleLines.forEach(function (line) {
        line.destroy();
      });
      this.consoleLines = [];
      this.addConsole("Save reset. Fresh containment session started.", "warning");
      this.events.emit("save:reset", this.state);
      this.save();
      this.refreshAll();
    }

    save() {
      DNC.Save.save(this.state);
      this.lastSaveAt = Date.now();
      if (this.saveText) {
        this.saveText.setText("Saved: " + new Date(this.state.lastSavedAt).toLocaleTimeString());
      }
    }
  };
})();
