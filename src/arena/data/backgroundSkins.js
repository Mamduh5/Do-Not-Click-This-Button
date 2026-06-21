(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  ARENA.BACKGROUND_SKINS = [
    {
      id: "containmentFloor",
      name: "Containment Floor",
      unlockedByDefault: true,
      surface: {
        type: "containment",
        baseColor: 0xf4f7f8,
        tileColor: 0xf9fbfc,
        gridColor: 0xd9e2e6,
        seamColor: 0xbac8ce,
        detailColor: 0x9caeb6,
        subtleNoise: true,
        noiseColor: 0xe5ecef,
        noiseAlpha: 0.18,
        noiseCellSize: 24,
        gridSize: 48,
        borderInset: 18,
        coreRingRadius: 64
      },
      underlayer: {
        color: 0x232a30,
        crackColor: 0x10161b,
        glowColor: 0x8f2a3a,
        voidColor: 0x07090d,
        gridAlpha: 0.2
      },
      repair: {
        mode: "repaint",
        delayMs: 900,
        durationMs: 1200
      },
      damageResponses: {
        groundBreak: {
          type: "localizedCollapse",
          collapseRadius: 28,
          chunkCountMin: 5,
          chunkCountMax: 8,
          chunkSizeMin: 9,
          chunkSizeMax: 18,
          chunkShiftDistance: 14,
          centerGapRadius: 8,
          shortCrackCount: 7,
          shortCrackLengthMin: 8,
          shortCrackLengthMax: 22,
          maxCrackDistanceFromCenter: 30,
          crackJaggedness: 0.35,
          crackEraseWidth: 3,
          crackShadowWidth: 2,
          shadowColor: 0x11171b,
          highlightColor: 0xffffff,
          dustCount: 18,
          repairDelayMs: 1050,
          repairDurationMs: 1500,
          shakeIntensity: 0
        },
        pixelShatter: {
          type: "localGridBreak",
          cellSize: 7,
          gridWidthCells: 9,
          gridHeightCells: 7,
          centerDamageChance: 0.92,
          edgeBreakChance: 0.26,
          edgeDamageFalloff: 0.48,
          chunkCount: 24,
          chunkSize: 6,
          chunkTravelDistance: 54,
          localFlickerCount: 8,
          localFlickerDurationMs: 190,
          repairMode: "cell",
          repairDelayMs: 820,
          repairDurationMs: 1450,
          glitchColors: [0xaa2a2a, 0x19d8ff, 0x2a2a2a],
          glitchAlpha: 0.46
        },
        meteor: {
          type: "scorch",
          radius: 18,
          repairDelayMs: 850,
          repairDurationMs: 1200,
          underlayerColor: 0x351d17,
          detailColor: 0x6a2b18
        },
        laser: {
          type: "burn",
          radius: 10,
          lineLength: 28,
          repairDelayMs: 650,
          repairDurationMs: 900,
          underlayerColor: 0x123843,
          detailColor: 0x19d8ff
        },
        arrowRain: {
          type: "punctures",
          count: 5,
          radius: 24,
          holeRadius: 3,
          repairDelayMs: 720,
          repairDurationMs: 900,
          underlayerColor: 0x2a211a,
          detailColor: 0x6f4a25
        },
        paper: {
          enabled: false,
          type: "none"
        }
      }
    },
    {
      id: "sand",
      name: "Sand",
      unlockedByDefault: true,
      surface: {
        type: "sand",
        baseColor: 0xd9b76f,
        tileColor: 0xe5c883,
        gridColor: 0xd3ae62,
        seamColor: 0xc99f52,
        detailColor: 0xf0d895,
        subtleNoise: true,
        noiseColor: 0xf4dda0,
        noiseAlpha: 0.2,
        noiseCellSize: 14,
        grainDensity: 240,
        grainAlpha: 0.13,
        coarseGrainAlpha: 0.19,
        grainColors: [0xc79c4f, 0xeed894, 0xb88743],
        sandTexture: {
          baseColors: [0xd1aa61, 0xd9b76f, 0xe0c27a, 0xc89b52, 0xe7ce8a],
          patchCount: 30,
          patchRadiusMin: 54,
          patchRadiusMax: 170,
          patchAlpha: 0.1,
          fineGrainCount: 720,
          fineGrainAlpha: 0.14,
          coarseGrainCount: 180,
          coarseGrainAlpha: 0.2,
          pebbleCount: 36,
          grainDensity: 720,
          grainSizeMin: 1,
          grainSizeMax: 3,
          duneLineCount: 0,
          duneLineAlpha: 0.18,
          windStreakCount: 42,
          windStreakLengthMin: 38,
          windStreakLengthMax: 150,
          windStreakAlpha: 0.18,
          windStreakCurve: 0.34,
          depressionCount: 18,
          depressionAlpha: 0.08,
          decorativeRockCount: 18
        },
        duneLineAlpha: 0.22,
        duneLineCount: 15,
        duneLineSpacing: 40,
        duneWaveAmplitude: 10,
        duneLineSegment: 18,
        gridSize: 72,
        borderInset: 0,
        coreRingRadius: 58
      },
      underlayer: {
        color: 0xb18445,
        crackColor: 0x76552a,
        glowColor: 0xf2d086,
        voidColor: 0x8e6533,
        gridAlpha: 0.05
      },
      repair: {
        mode: "settle",
        delayMs: 650,
        durationMs: 1350
      },
      damageResponses: {
        groundBreak: {
          type: "sandCrater",
          craterRadius: 30,
          displacementRadius: 44,
          craterSoftness: 0.62,
          dustCount: 24,
          particleCount: 24,
          particleSize: 4,
          particleDistance: 38,
          granularDebrisCount: 15,
          repairDelayMs: 720,
          repairDurationMs: 1500,
          underlayerColor: 0x9f7138,
          detailColor: 0xf0d38b,
          repairMode: "settle"
        },
        pixelShatter: {
          type: "sandGridDisruption",
          cellSize: 8,
          gridWidthCells: 9,
          gridHeightCells: 7,
          centerDamageChance: 0.84,
          edgeBreakChance: 0.2,
          edgeDamageFalloff: 0.42,
          chunkCount: 22,
          chunkSize: 6,
          chunkTravelDistance: 38,
          localFlickerCount: 7,
          localFlickerDurationMs: 170,
          repairMode: "cell",
          repairDelayMs: 620,
          repairDurationMs: 1300,
          glitchColors: [0xf0d38b, 0xc4934a, 0x8e6533],
          glitchAlpha: 0.34,
          underlayerColor: 0x9b713a,
          detailColor: 0xe5c883
        },
        meteor: {
          type: "sandCrater",
          craterRadius: 25,
          displacementRadius: 48,
          craterSoftness: 0.52,
          dustCount: 30,
          particleCount: 28,
          particleSize: 4,
          particleDistance: 46,
          granularDebrisCount: 10,
          repairDelayMs: 850,
          repairDurationMs: 1400,
          underlayerColor: 0x5a3b22,
          detailColor: 0xc58a3d,
          repairMode: "settle"
        },
        laser: {
          type: "sandCrater",
          craterRadius: 13,
          displacementRadius: 24,
          dustCount: 8,
          particleCount: 8,
          particleSize: 3,
          particleDistance: 22,
          granularDebrisCount: 4,
          repairDelayMs: 500,
          repairDurationMs: 900,
          underlayerColor: 0x6b4928,
          detailColor: 0xf7e1a3,
          repairMode: "settle"
        },
        arrowRain: {
          type: "sandPunctures",
          count: 7,
          radius: 27,
          holeRadius: 3,
          dustCount: 11,
          particleCount: 11,
          particleSize: 3,
          particleDistance: 20,
          repairDelayMs: 520,
          repairDurationMs: 850,
          underlayerColor: 0x8e6533,
          detailColor: 0xefcf83,
          repairMode: "settle"
        },
        paper: {
          enabled: false,
          type: "none"
        }
      }
    },
    {
      id: "water",
      name: "Water",
      unlockedByDefault: true,
      surface: {
        type: "water",
        baseColor: 0x1f8aa6,
        tileColor: 0x35b4c9,
        gridColor: 0x78d8e5,
        seamColor: 0x9cebf0,
        detailColor: 0xcdfcff,
        subtleNoise: true,
        noiseColor: 0x94eff4,
        noiseAlpha: 0.12,
        noiseCellSize: 22,
        waveBandColor: 0x6ed9e8,
        waveBandAlpha: 0.12,
        waveBandHeight: 10,
        waveBandOffsetSpeed: 0.032,
        waveLineColor: 0xcdfcff,
        waveAlpha: 0.22,
        waveLineCount: 12,
        waveSpeed: 0.0015,
        waveAmplitude: 10,
        shimmerIntensity: 0.18,
        shimmerCount: 22,
        shimmerAlpha: 0.26,
        shimmerSpeed: 0.0022,
        shimmerLength: 18,
        causticLineCount: 18,
        causticAlpha: 0.2,
        waterTexture: {
          baseColors: [0x176f8d, 0x1f8aa6, 0x35b4c9],
          causticCount: 28,
          causticAlpha: 0.2,
          shimmerCount: 28,
          shimmerAlpha: 0.18,
          bandCount: 10,
          bandAlpha: 0.12
        },
        gridSize: 96,
        borderInset: 0,
        coreRingRadius: 60
      },
      underlayer: {
        color: 0x126276,
        crackColor: 0x0a4150,
        glowColor: 0xa8fbff,
        voidColor: 0x0a4f64,
        gridAlpha: 0.04
      },
      animation: {
        type: "waveOverlay",
        enabled: true,
        waveSpeed: 0.0015,
        waveAlpha: 0.22,
        waveLineCount: 12,
        waveAmplitude: 10,
        waveBandOffsetSpeed: 0.032,
        rippleDurationMs: 1250,
        rippleCount: 4,
        rippleMaxCount: 34,
        splashParticleCount: 20,
        splashRadius: 36,
        splashDurationMs: 560,
        foamColor: 0xe9ffff,
        foamParticleCount: 14,
        shimmerIntensity: 0.18,
        shimmerCount: 22,
        shimmerSpeed: 0.0022,
        maxRipples: 34,
        updateIntervalMs: 80
      },
      waterSurface: {
        enabled: true,
        visualEnabled: true,
        debugGridVisible: false,
        showEnergyCells: false,
        baseTextureEnabled: true,
        gradientColors: [0x176f8d, 0x1f8aa6, 0x35b4c9],
        gridCols: 48,
        gridRows: 31,
        updateIntervalMs: 70,
        renderUpdateIntervalMs: 70,
        propagation: 0.22,
        damping: 0.88,
        impulseRadius: 2,
        maxRippleObjects: 42,
        rippleRingMax: 42,
        rippleRingDurationMs: 820,
        rippleRingWidth: 2,
        ringAlpha: 0.38,
        highlightColor: 0xe9ffff,
        shadowColor: 0x0b5d70,
        foamColor: 0xe9ffff,
        foamMax: 48,
        foamDurationMs: 760,
        splashParticleCount: 18,
        baseTexture: {
          depthPatchCount: 22,
          depthPatchAlpha: 0.1,
          causticStrokeCount: 34,
          causticStrokeAlpha: 0.18,
          shimmerFleckCount: 34,
          shimmerAlpha: 0.16,
          bandAlpha: 0.07
        },
        splash: {
          arcCountMin: 4,
          arcCountMax: 7,
          arcRadiusMin: 16,
          arcRadiusMax: 42,
          arcWidth: 2,
          arcAlpha: 0.52,
          arcDurationMs: 760,
          arcBrokenSegmentMin: 0.28,
          arcBrokenSegmentMax: 0.82,
          foamCount: 18,
          foamSizeMin: 1.5,
          foamSizeMax: 3.5,
          foamTravelMin: 8,
          foamTravelMax: 42,
          foamDurationMs: 620,
          dropletCount: 14,
          dropletSizeMin: 1,
          dropletSizeMax: 3,
          dropletTravelMin: 18,
          dropletTravelMax: 58,
          dropletDurationMs: 520
        },
        effectSplashScale: {
          groundBreak: 1.15,
          meteor: 1.75,
          pixelShatter: 0.72,
          sciFiLaser: 0.46,
          arrowRain: 0.44,
          paper: 0.28
        },
        causticLineCount: 20,
        causticAlpha: 0.18,
        causticSpeed: 0.002,
        waveLineCount: 10,
        waveLineAlpha: 0.18,
        waveLineSpeed: 0.0018,
        gridInfluenceToAlpha: 0.18,
        gridInfluenceToLineOffset: 6,
        renderThreshold: 0.08,
        maxRenderedCells: 72,
        effectImpulseScale: {
          groundBreak: 1.25,
          meteor: 1.9,
          pixelShatter: 0.72,
          sciFiLaser: 0.52,
          arrowRain: 0.34,
          paper: 0.22
        }
      },
      repair: {
        mode: "settle",
        delayMs: 460,
        durationMs: 1050
      },
      damageResponses: {
        groundBreak: {
          type: "waterRipple",
          rippleRadius: 54,
          rippleCount: 4,
          splashParticleCount: 22,
          splashRadius: 42,
          splashDurationMs: 620,
          foamCount: 14,
          affectsSurface: false,
          repairDelayMs: 320,
          repairDurationMs: 1050,
          underlayerColor: 0x0e6f83,
          detailColor: 0xe9ffff,
          repairMode: "settle"
        },
        pixelShatter: {
          type: "waterPixelRipple",
          cellSize: 8,
          gridWidthCells: 10,
          gridHeightCells: 7,
          centerDamageChance: 0.78,
          edgeBreakChance: 0.18,
          edgeDamageFalloff: 0.52,
          chunkCount: 18,
          chunkSize: 7,
          chunkTravelDistance: 18,
          rippleRadius: 30,
          rippleCount: 3,
          splashParticleCount: 6,
          splashRadius: 20,
          splashDurationMs: 420,
          localFlickerCount: 12,
          localFlickerDurationMs: 210,
          affectsSurface: false,
          repairMode: "cell",
          repairDelayMs: 360,
          repairDurationMs: 960,
          glitchColors: [0xcdfcff, 0x35b4c9, 0x126276],
          glitchAlpha: 0.42,
          underlayerColor: 0x0d697e,
          detailColor: 0xe9ffff
        },
        meteor: {
          type: "waterRipple",
          rippleRadius: 72,
          rippleCount: 5,
          splashParticleCount: 30,
          splashRadius: 58,
          splashDurationMs: 760,
          foamCount: 18,
          steamCount: 9,
          affectsSurface: false,
          repairDelayMs: 380,
          repairDurationMs: 1250,
          underlayerColor: 0x116b7b,
          detailColor: 0xffffff,
          repairMode: "settle"
        },
        laser: {
          type: "waterRipple",
          rippleRadius: 28,
          rippleCount: 3,
          splashParticleCount: 8,
          splashRadius: 22,
          splashDurationMs: 440,
          foamCount: 6,
          steamCount: 8,
          affectsSurface: false,
          repairDelayMs: 260,
          repairDurationMs: 800,
          underlayerColor: 0x2ad8ef,
          detailColor: 0xffffff,
          repairMode: "settle"
        },
        arrowRain: {
          type: "waterPunctures",
          count: 7,
          radius: 28,
          holeRadius: 2,
          rippleRadius: 14,
          splashParticleCount: 10,
          splashRadius: 16,
          splashDurationMs: 360,
          affectsSurface: false,
          repairDelayMs: 260,
          repairDurationMs: 760,
          underlayerColor: 0x0d697e,
          detailColor: 0xe9ffff,
          repairMode: "settle"
        },
        paper: {
          enabled: false,
          type: "none"
        }
      }
    },
    {
      id: "town",
      name: "Town",
      unlockedByDefault: true,
      surface: {
        type: "town",
        baseColor: 0x8b8f86,
        tileColor: 0xa8aca2,
        gridColor: 0xc3c8bb,
        seamColor: 0x69726d,
        detailColor: 0xf1e7b7,
        roadColor: 0x4d5658,
        roadLineColor: 0xe9d98b,
        sidewalkColor: 0xb8beb4,
        plazaColor: 0x9da79a,
        townTexture: {
          roadColor: 0x4d5658,
          roadEdgeColor: 0x737b7c,
          roofColors: [0x8b3f35, 0x645b75, 0x9b7a43, 0x4d6d73],
          treeColors: [0x2f6d3b, 0x3f8b4d, 0x24542d],
          sidewalkColor: 0xb8beb4,
          plazaColor: 0x9da79a,
          shadowAlpha: 0.22,
          textureNoiseDensity: 150,
          grassPatchCount: 18,
          dirtPatchCount: 12
        },
        roadDashSpacing: 54,
        roadDashLength: 24,
        sidewalks: [
          { x: 0, y: 250, width: 960, height: 120 },
          { x: 316, y: 0, width: 118, height: 620 }
        ],
        roads: [
          { x: 0, y: 276, width: 960, height: 68, laneY: 310 },
          { x: 342, y: 0, width: 66, height: 620, laneX: 375 }
        ],
        plazas: [
          { x: 446, y: 230, width: 104, height: 124 }
        ],
        map: {
          roadCount: 2,
          plazaCount: 1,
          buildingCount: 8,
          treeCount: 7,
          movementMode: "freeRoamObstacles",
          spawnSafeAreas: [
            { x: 0, y: 276, width: 960, height: 68 },
            { x: 342, y: 0, width: 66, height: 620 },
            { x: 446, y: 230, width: 104, height: 124 }
          ]
        },
        buildingColor: 0x7e6c62,
        buildingAccentColor: 0xb59678,
        roofColors: [0x8b3f35, 0x645b75, 0x9b7a43, 0x4d6d73],
        gridSize: 48,
        borderInset: 0,
        coreRingRadius: 58,
        buildingRects: [
          { x: 102, y: 96, width: 122, height: 76 },
          { x: 118, y: 190, width: 96, height: 48 },
          { x: 392, y: 86, width: 138, height: 88 },
          { x: 706, y: 112, width: 128, height: 82 },
          { x: 154, y: 360, width: 132, height: 104 },
          { x: 598, y: 348, width: 152, height: 108 },
          { x: 458, y: 428, width: 88, height: 74 },
          { x: 780, y: 424, width: 98, height: 84 }
        ],
        treeCircles: [
          { x: 72, y: 424, radius: 18 },
          { x: 260, y: 528, radius: 20 },
          { x: 296, y: 132, radius: 17 },
          { x: 560, y: 118, radius: 19 },
          { x: 858, y: 244, radius: 18 },
          { x: 862, y: 548, radius: 20 },
          { x: 516, y: 548, radius: 16 }
        ]
      },
      underlayer: {
        color: 0x3b3f3e,
        crackColor: 0x1e2324,
        glowColor: 0xc6d5dc,
        voidColor: 0x242829,
        gridAlpha: 0.12
      },
      obstacleRules: {
        enabled: true,
        movementMode: "freeRoamObstacles",
        debugOverlay: true,
        obstaclePadding: 14,
        avoidanceForce: 1.35,
        obstacleInfluence: 28,
        spawnClearance: 10,
        boundaryClearance: 2,
        stuckDetectionMs: 700,
        stuckDistance: 1.2,
        directionRerollCooldownMs: 520,
        repulsionForce: 1.45,
        slideAlongEdges: true,
        pushOutMargin: 3,
        directionRerollAfterBlockedMs: 520,
        maxObstacles: 24,
        obstacles: [
          { type: "building", shape: "rect", x: 102, y: 96, width: 122, height: 76 },
          { type: "building", shape: "rect", x: 118, y: 190, width: 96, height: 48 },
          { type: "building", shape: "rect", x: 392, y: 86, width: 138, height: 88 },
          { type: "building", shape: "rect", x: 706, y: 112, width: 128, height: 82 },
          { type: "building", shape: "rect", x: 154, y: 360, width: 132, height: 104 },
          { type: "building", shape: "rect", x: 598, y: 348, width: 152, height: 108 },
          { type: "building", shape: "rect", x: 458, y: 428, width: 88, height: 74 },
          { type: "building", shape: "rect", x: 780, y: 424, width: 98, height: 84 },
          { type: "tree", shape: "circle", x: 72, y: 424, radius: 18 },
          { type: "tree", shape: "circle", x: 260, y: 528, radius: 20 },
          { type: "tree", shape: "circle", x: 296, y: 132, radius: 17 },
          { type: "tree", shape: "circle", x: 560, y: 118, radius: 19 },
          { type: "tree", shape: "circle", x: 858, y: 244, radius: 18 },
          { type: "tree", shape: "circle", x: 862, y: 548, radius: 20 },
          { type: "tree", shape: "circle", x: 516, y: 548, radius: 16 }
        ]
      },
      navigation: {
        enabled: false,
        cellSize: 32,
        obstaclePadding: 12,
        pathRecalcMs: 900,
        targetRerollMs: 2400,
        stuckRepathMs: 700,
        waypointReachDistance: 18,
        maxPathLength: 80,
        maxSearchIterations: 900,
        maxPathRequestsPerTick: 6,
        debugOverlay: false,
        roads: [
          { x: 0, y: 276, width: 960, height: 68 },
          { x: 342, y: 0, width: 66, height: 620 }
        ],
        plazas: [
          { x: 446, y: 230, width: 104, height: 124 }
        ],
        buildings: [
          { x: 102, y: 96, width: 122, height: 76 },
          { x: 118, y: 190, width: 96, height: 48 },
          { x: 392, y: 86, width: 138, height: 88 },
          { x: 706, y: 112, width: 128, height: 82 },
          { x: 154, y: 360, width: 132, height: 104 },
          { x: 598, y: 348, width: 152, height: 108 },
          { x: 458, y: 428, width: 88, height: 74 },
          { x: 780, y: 424, width: 98, height: 84 }
        ],
        spawnZones: [
          { x: 0, y: 276, width: 960, height: 68 },
          { x: 342, y: 0, width: 66, height: 620 },
          { x: 446, y: 230, width: 104, height: 124 }
        ]
      },
      repair: {
        mode: "pavementPatch",
        delayMs: 900,
        durationMs: 1300
      },
      damageResponses: {
        groundBreak: {
          type: "townPavementBreak",
          collapseRadius: 24,
          chunkCountMin: 4,
          chunkCountMax: 7,
          chunkSizeMin: 7,
          chunkSizeMax: 15,
          chunkShiftDistance: 10,
          centerGapRadius: 7,
          shortCrackCount: 6,
          shortCrackLengthMin: 7,
          shortCrackLengthMax: 18,
          maxCrackDistanceFromCenter: 25,
          crackJaggedness: 0.32,
          crackEraseWidth: 2,
          crackShadowWidth: 2,
          shadowColor: 0x15191a,
          highlightColor: 0xc8d0ca,
          dustCount: 12,
          repairDelayMs: 900,
          repairDurationMs: 1250,
          underlayerColor: 0x2b2f30,
          detailColor: 0x15191a,
          repairMode: "pavementPatch"
        },
        pixelShatter: {
          type: "townGridDisruption",
          cellSize: 8,
          gridWidthCells: 9,
          gridHeightCells: 7,
          centerDamageChance: 0.86,
          edgeBreakChance: 0.24,
          edgeDamageFalloff: 0.46,
          chunkCount: 20,
          chunkSize: 6,
          chunkTravelDistance: 36,
          localFlickerCount: 8,
          localFlickerDurationMs: 170,
          repairMode: "cell",
          repairDelayMs: 740,
          repairDurationMs: 1200,
          glitchColors: [0xe9d98b, 0x4d5658, 0xb8beb4],
          glitchAlpha: 0.38,
          underlayerColor: 0x2c3031,
          detailColor: 0xe9d98b
        },
        meteor: {
          type: "scorch",
          radius: 20,
          repairDelayMs: 820,
          repairDurationMs: 1200,
          underlayerColor: 0x33201a,
          detailColor: 0x7b3924,
          repairMode: "pavementPatch"
        },
        laser: {
          type: "burn",
          radius: 9,
          lineLength: 26,
          repairDelayMs: 620,
          repairDurationMs: 850,
          underlayerColor: 0x164351,
          detailColor: 0x19d8ff,
          repairMode: "pavementPatch"
        },
        arrowRain: {
          type: "punctures",
          count: 6,
          radius: 24,
          holeRadius: 3,
          repairDelayMs: 700,
          repairDurationMs: 900,
          underlayerColor: 0x252829,
          detailColor: 0x1a1e1f,
          repairMode: "pavementPatch"
        },
        paper: {
          enabled: false,
          type: "none"
        }
      }
    }
  ];

  function get(id) {
    return ARENA.BACKGROUND_SKINS.find(function (skin) {
      return skin.id === id;
    }) || ARENA.BACKGROUND_SKINS[0];
  }

  function getDefaultSkinId() {
    return ARENA.BACKGROUND_SKINS[0].id;
  }

  function getDefaultUnlocked() {
    var unlocked = {};
    ARENA.BACKGROUND_SKINS.forEach(function (skin) {
      if (skin.unlockedByDefault) {
        unlocked[skin.id] = true;
      }
    });
    return unlocked;
  }

  function ensureState(state) {
    if (!state.unlockedBackgroundSkins || typeof state.unlockedBackgroundSkins !== "object") {
      state.unlockedBackgroundSkins = getDefaultUnlocked();
    }

    Object.keys(getDefaultUnlocked()).forEach(function (id) {
      state.unlockedBackgroundSkins[id] = true;
    });

    if (!state.activeBackgroundSkin || !state.unlockedBackgroundSkins[state.activeBackgroundSkin]) {
      state.activeBackgroundSkin = getDefaultSkinId();
    }
  }

  function setActive(state, id) {
    ensureState(state);
    if (!state.unlockedBackgroundSkins[id]) {
      return false;
    }
    state.activeBackgroundSkin = id;
    return true;
  }

  ARENA.BackgroundSkins = {
    get: get,
    getDefaultSkinId: getDefaultSkinId,
    getDefaultUnlocked: getDefaultUnlocked,
    ensureState: ensureState,
    setActive: setActive
  };
})();
