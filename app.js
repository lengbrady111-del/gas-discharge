(() => {
  'use strict';

  const GAS = {
    air: { n: 'Air', A: 11.25, B: 273.77, g: 0.01 },
    argon: { n: 'Ar', A: 8.64, B: 180.0, g: 0.01 },
    nitrogen: { n: 'N2', A: 15.0, B: 365.0, g: 0.012 },
    helium: { n: 'He', A: 2.25, B: 34.0, g: 0.02 },
  };
  const FIXED_GAS_TYPE = 'air';

  const state = {
    gasType: FIXED_GAS_TYPE,
    electrodeType: 'parallel',
    gapMm: 13,
    pressurePa: 2400,
    mainVoltageV: 2300,
    probeHeightMm: 0,
    probeHorizontalMm: 0,
    probeVoltageV: 0,
    probeLoopCurrentUa: 0,
    probeCurrentUa: 0,
    mainCurrentMa: 0,
    mainPowerW: 0,
    mainPowerDigitIndex: 0,
    groundConfirmed: false,
    probePowerControlMode: '',
    probePowerError: '',
    running: false,
    mode: '\u5f85\u673a',
    breakdown: false,
    ub: 0,
    paschenRows: [],
    langmuirData: [],
    langmuirFit: null,
    controlInstrumentMode: 'menu',
    controlInstrumentInput: '',
    controlInstrumentZeroed: false,
    controlInstrumentAlarm: '',
    env: {
      temperatureC: 20,
      humidity: 50,
      sourceLabel: '\u9ed8\u8ba4\u5b9e\u9a8c\u5ba4',
      locationLabel: '',
      ipAddress: '--',
      lastUpdated: '',
      fetching: false,
      lastError: '',
    },
  };

  const DISCHARGE_VERTICAL_LIFT = 1.2;
  const DISCHARGE_ANCHOR_UP_OFFSET = 0.16;
  const DISCHARGE_ANCHOR_EXTEND_MM = 1;
  const ARC_ANCHOR_INSET_MM = 1;
  const GAP_ZERO_OFFSET_MM = 0;
  const SPHERE_VISUAL_CLEARANCE_MM = 0;
  const SPHERE_VISUAL_ZERO_OFFSET_CM = 1;
  const SPHERE_ZERO_VISUAL_GAP_MM = 6;
  const SPHERE_COPPER_ASSEMBLY_DROP_MM = 10;
  const LEFT_ELECTRODE_ASSEMBLY_Y_OFFSET_M = 0.2;
  const RIGHT_ELECTRODE_ASSEMBLY_Y_OFFSET_M = 0.2;
  const LEFT_ELECTRODE_ASSEMBLY_Z_OFFSET_M = 0.01;
  const RIGHT_ELECTRODE_COPPER_LIFT_M = 0;
  const SPHERE_ZERO_CONTACT_TRIM_CM = 5.3;
  const SPHERE_RIGHT_CLOCKWISE_TILT = 0;
  const OVERALL_MODEL_SCALE_MULTIPLIER = 1.5;
  const MODEL_GAP_SCALE_COMPENSATION = 1 / OVERALL_MODEL_SCALE_MULTIPLIER;
  const PROBE_POWER_DEVICE_LIFT_M = 0.5;
  const PHYSICS_GAP_MIN_MM = 0.01;
  const PHYSICS_PD_MIN = 0.001;
  const FIELD_GAP_MIN_M = 1e-5;
  const PA_M_TO_TORR_CM = 0.750062;
  const DISCHARGE_BALLAST_OHM = 120000;
  const ENV_REFERENCE = { temperatureC: 20, humidity: 50 };
  const WEATHER_REFRESH_MS = 15 * 60 * 1000;
  const ENV_CACHE_KEY = 'gas-discharge-env-cache-v2';
  const AIR_DEVICE_CURVE = { a: 1.75795, b: 248.6716, c: 0.76735 };
  const DEVICE_BREAKDOWN_ROWS = [
    { gasType: 'air', electrodeType: 'parallel', p: 100, d: 1, ub: 511.3 },
    { gasType: 'air', electrodeType: 'parallel', p: 300, d: 1, ub: 421.8 },
    { gasType: 'air', electrodeType: 'parallel', p: 500, d: 1, ub: 393.4 },
    { gasType: 'air', electrodeType: 'parallel', p: 800, d: 1, ub: 384.6 },
    { gasType: 'air', electrodeType: 'parallel', p: 1000, d: 1, ub: 387.7 },
    { gasType: 'air', electrodeType: 'parallel', p: 2000, d: 1, ub: 435.0 },
    { gasType: 'air', electrodeType: 'parallel', p: 4000, d: 1, ub: 571.9 },
    { gasType: 'air', electrodeType: 'parallel', p: 6000, d: 1, ub: 673.1 },
    { gasType: 'air', electrodeType: 'parallel', p: 900, d: 30, ub: 1776.0 },
    { gasType: 'air', electrodeType: 'parallel', p: 2400, d: 13, ub: 1973.1 },
    { gasType: 'air', electrodeType: 'parallel', p: 3000, d: 30, ub: 4449.8 },
    { gasType: 'air', electrodeType: 'sphere', p: 250, d: 50, ub: 1047.6 },
    { gasType: 'air', electrodeType: 'sphere', p: 400, d: 50, ub: 1435.5 },
    { gasType: 'air', electrodeType: 'sphere', p: 600, d: 50, ub: 1917.3 },
    { gasType: 'air', electrodeType: 'sphere', p: 7000, d: 40, ub: 11258.1 },
  ];
  const DISCHARGE_WINDOWS = {
    corona: { pMin: 200, pMax: 700, gapMinMm: 20, gapMaxMm: 80 },
    glow: { pMin: 600, pMax: 1600, gapMinMm: 18, gapMaxMm: 50 },
    arc: { pMin: 1300, pMax: 7000, gapMinMm: 18, gapMaxMm: 50 },
    spark: { pMin: 7000, pMax: 101325, gapMinMm: 20, gapMaxMm: 75 },
  };
  const LANGMUIR_REF = {
    // Calibrated to the student's measured double-probe fit:
    // I = 17.71 uA * tanh(0.1580 V^-1 * V)
    fitCoeffPerV: 0.1580,
    teEv: 1 / (2 * 0.1580),
    refIsatUa: 17.71,
    probeDiameterMm: 0.7,
    probeAreaCm2: Math.PI * ((0.7 * 0.05) ** 2),
    ionMassKg: 2.4810e-26,
    coreGain: 1.0,
    zeroBiasUa: 0,
    posSlope: 0.0012,
    negSlope: 0.001,
    posSheath: 0.008,
    negSheath: 0.006,
    posTauV: 42,
    negTauV: 46,
  };
  const MODE_IDLE = '\u5f85\u673a';
  const MODE_NO = '\u672a\u51fb\u7a7f';
  const MODE_CORONA = '\u7535\u6655\u653e\u7535';
  const MODE_GLOW = '\u8f89\u5149\u653e\u7535';
  const MODE_SPARK = '\u706b\u82b1\u653e\u7535';
  const MODE_ARC = '\u5f27\u5149\u653e\u7535';
  const MOTOR_CONTROL_MODES = { MENU: 'menu', MANUAL: 'manual', AUTO: 'auto' };
  const PROBE_POWER_CONTROL_MODES = { VOLTAGE: 'voltage', CURRENT: 'current' };
  const PROBE_CONTROL_MIN_MM = -80;
  const PROBE_CONTROL_MAX_MM = 80;

  const refs = {
    canvas: id('sceneCanvas'),
    hoverLabel: id('hoverLabel'),
    engineHint: id('engineHint'),
    gasType: id('gasType'),
    electrodeType: id('electrodeType'),
    liveStats: id('liveStats'),
    dataExplain: id('dataExplain'),
    refreshEnvBtn: id('refreshEnvBtn'),
    envCityInput: id('envCityInput'),
    envTempNumber: id('envTempNumber'),
    envHumidityNumber: id('envHumidityNumber'),
    applyEnvCityBtn: id('applyEnvCityBtn'),
    applyEnvManualBtn: id('applyEnvManualBtn'),
    envStatus: id('envStatus'),
    probeCurrentMeasured: id('probeCurrentMeasured'),
    dischargeViewBtn: id('dischargeViewBtn'),
    learningHome: id('learningHome'),
    learningStartBtn: id('learningStartBtn'),
    experimentEntry: id('experimentEntry'),
    entryHomeBtn: id('entryHomeBtn'),
    dataRecordBtn: id('dataRecordBtn'),
    homeReturnBtn: id('homeReturnBtn'),
    experimentReferenceBtn: id('experimentReferenceBtn'),
    electrodeSwitchBtn: id('electrodeSwitchBtn'),
    dischargeZoomCanvas: id('dischargeZoomCanvas'),
    mainPowerSwitchBtn: id('mainPowerSwitchBtn'),
    startBtn: id('startDischargeBtn'),
    paschenBtn: id('paschenBtn'),
    langmuirBtn: id('langmuirBtn'),
    resetBtn: id('resetSceneBtn'),
    dialogs: {
      motor: id('motorDialog'),
      mainPower: id('mainPowerDialog'),
      vacuum: id('vacuumDialog'),
      probePower: id('probePowerDialog'),
      dischargeView: id('dischargeViewDialog'),
      reference: id('experimentReferenceDialog'),
      paschen: id('paschenDialog'),
      langmuir: id('langmuirDialog'),
    },
  };

  const eng = {
    ok: false,
    T: null,
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    root: null,
    machine: null,
    electrodes: null,
    electrodeVisuals: null,
    plasma: null,
    hotspots: null,
    ray: null,
    mouse: null,
    hits: [],
    loader: null,
    electrodeLibrary: null,
    anchor: {
      motor: null,
      mainPower: null,
      vacuum: null,
      pressureGauge: null,
      ground: null,
      probePower: null,
      probe: null,
      left: null,
      right: null,
    },
    useModelElectrodes: false,
    gapRig: null,
    dischargeFrame: null,
    sparkPulse: {
      active: false,
      nextAt: 0,
      flashStart: 0,
      activeUntil: 0,
      afterglowUntil: 0,
      duration: 0,
      seed: 1,
      pathSeed: 13,
      branchCount: 0,
      amplitude: 0.008,
      steps: 7,
      lastMode: MODE_IDLE,
    },
    fx: {
      glowCol: null,
      glowOuter: null,
      glowCore: null,
      glowCathode: null,
      glowRibbon: null,
      glowShell: null,
      glowMaterials: [],
      glow: [],
      corona: [],
      spark: [],
      arc: null,
      arcCore: null,
      arcHalo: [],
      arcContacts: [],
    },
    instrumentScreens3d: {},
    motorControlPanel3d: null,
    probeMotionRig: null,
    dischargeViewRenderer: null,
    dischargeViewCamera: null,
    hideFallbackElectrodeBlocks: false,
    rawModelRender: false,
    lights: {},
    environmentMap: null,
  };

  const INSTRUMENT_PANEL_CONFIGS = {
    mainPower: {
      key: 'mainVoltageV',
      sliderId: 'mainVoltageSlider',
      numberId: 'mainVoltageNumber',
      outId: 'mainVoltageOut',
      screenId: 'mainPowerLiveDisplay',
      knobId: 'mainPowerKnob',
      minusId: 'mainPowerMinus',
      plusId: 'mainPowerPlus',
      min: 0,
      max: 8000,
      step: 0.1,
      unit: 'V',
      dragScale: 20,
      angleMin: -135,
      angleMax: 135,
      onChange: onMainParamChanged,
      format: () => mainPowerDisplaySignature(),
      sceneReadoutId: 'mainPowerSceneReadout',
      sceneFormat: () => mainPowerDisplaySignature(),
      stepperStep: () => mainPowerDigitStep(),
      clickStepOnly: true,
    },
    motorGap: {
      key: 'gapMm',
      sliderId: 'gapSlider',
      numberId: 'gapNumber',
      outId: 'gapOut',
      screenId: 'motorGapLiveDisplay',
      knobId: 'motorGapKnob',
      minusId: 'motorGapMinus',
      plusId: 'motorGapPlus',
      min: 0,
      max: 80,
      step: 0.5,
      unit: 'cm',
      dragScale: 0.18,
      angleMin: -135,
      angleMax: 135,
      onChange: onMainParamChanged,
      format: (v) => `d ${Number(v.toFixed(1))} cm`,
      sceneReadoutId: 'motorGapSceneReadout',
      sceneFormat: () => motorControlSceneSignature(),
    },
    probeVoltage: {
      key: 'probeVoltageV',
      sliderId: 'probeVoltageSlider',
      numberId: 'probeVoltageNumber',
      outId: 'probeVoltageOut',
      screenId: 'probePowerLiveDisplay',
      knobId: 'probeVoltageKnob',
      minusId: 'probeVoltageMinus',
      plusId: 'probeVoltagePlus',
      min: -250,
      max: 250,
      step: 0.1,
      unit: 'V',
      dragScale: 0.85,
      angleMin: -135,
      angleMax: 135,
      onChange: onProbePowerChanged,
      format: () => probePowerDisplaySignature(),
      sceneFormat: () => probePowerDisplaySignature(),
      probeControlMode: PROBE_POWER_CONTROL_MODES.VOLTAGE,
    },
    probeCurrent: {
      key: 'probeLoopCurrentUa',
      sliderId: 'probeCurrentSlider',
      numberId: 'probeCurrentNumber',
      outId: 'probeCurrentSetOut',
      screenId: 'probePowerLiveDisplay',
      knobId: 'probeCurrentKnob',
      minusId: 'probeCurrentMinus',
      plusId: 'probeCurrentPlus',
      min: -100,
      max: 100,
      step: 0.1,
      unit: 'uA',
      dragScale: 0.35,
      angleMin: -135,
      angleMax: 135,
      onChange: onProbePowerChanged,
      format: () => probePowerDisplaySignature(),
      sceneFormat: () => probePowerDisplaySignature(),
      probeControlMode: PROBE_POWER_CONTROL_MODES.CURRENT,
    },
    pressureGauge: {
      key: 'pressurePa',
      sliderId: 'pressureSlider',
      numberId: 'pressureNumber',
      outId: 'pressureOut',
      min: 100,
      max: 20000,
      step: 10,
      unit: 'Pa',
      onChange: onMainParamChanged,
      format: () => pressureGaugeDisplaySignature(),
      sceneFormat: () => pressureGaugeDisplaySignature(),
    },
  };

  initUI();
  boot();

  async function boot() {
    if (window.location.protocol === 'file:') {
      refs.engineHint.textContent = '\u8bf7\u901a\u8fc7\u672c\u5730 HTTP \u670d\u52a1\u8fd0\u884c\uff08\u4f8b\u5982 python -m http.server 8080\uff09';
      startFallback2D();
      return;
    }

    const loaded = await loadThree();
    if (!loaded) {
      refs.engineHint.textContent = '3D \u5f15\u64ce\u52a0\u8f7d\u5931\u8d25\uff0c\u5df2\u542f\u7528 2D \u540e\u5907\u754c\u9762\uff08\u6309\u94ae\u548c\u5b9e\u9a8c\u529f\u80fd\u53ef\u7528\uff09';
      startFallback2D();
      return;
    }

    try {
      initThree();
      refs.engineHint.textContent = '3D \u5f15\u64ce\u5df2\u5c31\u7eea';
    } catch (e) {
      console.error(e);
      refs.engineHint.textContent = '3D \u521d\u59cb\u5316\u5931\u8d25\uff0c\u5df2\u542f\u7528 2D \u540e\u5907\u754c\u9762';
      startFallback2D();
    }
  }
  function initUI() {
    bindRange('gapSlider', 'gapNumber', 'gapOut', 'gapMm', ' cm', onMainParamChanged);
    bindRange('probeSlider', 'probeNumber', 'probeOut', 'probeHeightMm', ' mm', onProbeHeightChanged);
    bindRange('mainVoltageSlider', 'mainVoltageNumber', 'mainVoltageOut', 'mainVoltageV', ' V', onMainParamChanged);
    bindRange('pressureSlider', 'pressureNumber', 'pressureOut', 'pressurePa', ' Pa', onMainParamChanged);
    bindRange('probeVoltageSlider', 'probeVoltageNumber', 'probeVoltageOut', 'probeVoltageV', ' V', onProbePowerChanged);
    bindRange('probeCurrentSlider', 'probeCurrentNumber', 'probeCurrentSetOut', 'probeLoopCurrentUa', ' uA', onProbePowerChanged);
    bindInstrumentPanels();
    bindMotorControlInstrument();

    const probeRestoreBtn = id('probeRestoreBtn');
    if (probeRestoreBtn) {
      probeRestoreBtn.addEventListener('click', () => {
        setProbeHeightValue(0, '');
        state.probeHorizontalMm = 0;
        state.controlInstrumentAlarm = '\u53cc\u63a2\u9488\u5df2\u8fd8\u539f';
        if (eng.ok) applyProbeHeight();
        renderStats();
      });
    }

    if (refs.gasType) {
      refs.gasType.addEventListener('change', () => {
        state.gasType = refs.gasType.value || FIXED_GAS_TYPE;
        renderStats();
      });
    }

    if (refs.electrodeType) {
      refs.electrodeType.addEventListener('change', () => {
        state.electrodeType = refs.electrodeType.value || 'parallel';
        if (eng.ok) rebuildElectrodes();
        renderStats();
      });
    }

    refs.startBtn.addEventListener('click', toggleDischargePower);
    if (refs.mainPowerSwitchBtn) {
      refs.mainPowerSwitchBtn.addEventListener('click', toggleMainPowerSwitch);
    }

    refs.paschenBtn.addEventListener('click', () => {
      if (!ensureGroundConfirmed()) return;
      openDialog(refs.dialogs.paschen);
    });
    refs.langmuirBtn.addEventListener('click', () => {
      if (!ensureGroundConfirmed()) return;
      openDialog(refs.dialogs.langmuir);
    });
    bindLearningHome();
    document.querySelectorAll('[data-experiment]').forEach((btn) => {
      btn.addEventListener('click', () => enterExperiment(btn.dataset.experiment || 'paschen'));
    });
    const experimentParam = new URLSearchParams(window.location.search).get('experiment');
    if (experimentParam === 'paschen' || experimentParam === 'langmuir') {
      enterExperiment(experimentParam);
    }
    if (refs.dataRecordBtn) {
      refs.dataRecordBtn.addEventListener('click', () => {
        if (!ensureGroundConfirmed()) return;
        openCurrentDataRecord();
      });
    }
    if (refs.homeReturnBtn) {
      refs.homeReturnBtn.addEventListener('click', returnToHome);
    }
    if (refs.entryHomeBtn) {
      refs.entryHomeBtn.addEventListener('click', showLearningHome);
    }
    if (refs.experimentReferenceBtn) {
      refs.experimentReferenceBtn.addEventListener('click', () => {
        refreshAmbientWeather(false);
        renderStats();
        openDialog(refs.dialogs.reference);
      });
    }
    if (refs.electrodeSwitchBtn) {
      refs.electrodeSwitchBtn.addEventListener('click', switchElectrodeType);
    }
    if (refs.dischargeViewBtn) {
      refs.dischargeViewBtn.addEventListener('click', () => {
        if (!ensureGroundConfirmed()) return;
        openFloatingDialog(refs.dialogs.dischargeView);
        updateDischargeZoomView();
      });
    }

    refs.resetBtn.addEventListener('click', () => {
      Object.assign(state, {
        gasType: FIXED_GAS_TYPE, electrodeType: 'parallel', gapMm: 13, pressurePa: 2400, mainVoltageV: 2300,
        probeHeightMm: 0, probeHorizontalMm: 0, probeVoltageV: 0, probeLoopCurrentUa: 0, probeCurrentUa: 0,
        probePowerControlMode: '', probePowerError: '', mainPowerDigitIndex: 0, groundConfirmed: false, running: false,
        controlInstrumentMode: MOTOR_CONTROL_MODES.MENU, controlInstrumentInput: '', controlInstrumentZeroed: false, controlInstrumentAlarm: '',
      });
      if (refs.gasType) refs.gasType.value = state.gasType;
      if (refs.electrodeType) refs.electrodeType.value = state.electrodeType;
      bindAllRanges();
      if (eng.ok) { rebuildElectrodes(); applyGap(); applyProbeHeight(); }
      refs.startBtn.textContent = '1. \u5f00\u59cb\u653e\u7535';
      renderStats();
    });

    document.querySelectorAll('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => btn.closest('dialog')?.close());
    });

    initDraggableDialogs();
    setupPaschen();
    setupLangmuir();
    if (refs.refreshEnvBtn) refs.refreshEnvBtn.addEventListener('click', () => refreshAmbientWeather(true));
    if (refs.applyEnvCityBtn) refs.applyEnvCityBtn.addEventListener('click', applyCityEnvironment);
    if (refs.applyEnvManualBtn) refs.applyEnvManualBtn.addEventListener('click', applyManualEnvironment);
    initEnvironmentFeed();
    updateElectrodeSwitchLabel();
    renderStats();
  }

  function ensureGroundConfirmed() {
    if (state.groundConfirmed) return true;
    showGroundNotice('\u8fd8\u672a\u786e\u8ba4\u63a5\u5730\uff0c\u4e0d\u80fd\u7ee7\u7eed\u5b9e\u9a8c');
    return false;
  }

  function setDischargePower(running) {
    state.running = !!running;
    if (refs.startBtn) refs.startBtn.textContent = state.running ? '1. \u505c\u6b62\u653e\u7535' : '1. \u5f00\u59cb\u653e\u7535';
    renderMainPowerSwitch();
    renderStats();
  }

  function toggleDischargePower() {
    if (!state.running && !ensureGroundConfirmed()) return;
    setDischargePower(!state.running);
  }

  function toggleMainPowerSwitch() {
    toggleDischargePower();
  }

  function renderMainPowerSwitch() {
    const button = refs.mainPowerSwitchBtn;
    if (!button) return;
    button.classList.toggle('is-on', !!state.running);
    button.setAttribute('aria-pressed', state.running ? 'true' : 'false');
    button.setAttribute('aria-label', state.running ? '\u4e3b\u7535\u6e90\u901a\u7535\uff0c\u70b9\u51fb\u65ad\u7535' : '\u4e3b\u7535\u6e90\u65ad\u7535\uff0c\u70b9\u51fb\u901a\u7535');
    const stateLabel = button.querySelector('.main-power-switch__state');
    if (stateLabel) stateLabel.textContent = state.running ? 'ON' : 'OFF';
  }

  function showGroundNotice(message) {
    let dialog = document.getElementById('groundNoticeDialog');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'groundNoticeDialog';
      dialog.className = 'modal ground-notice-modal';
      dialog.innerHTML = `
        <h3>\u63a5\u5730\u63d0\u9192</h3>
        <p id="groundNoticeMessage" class="ground-notice-message"></p>
        <div class="modal-actions"><button type="button" data-close>\u786e\u5b9a</button></div>
      `;
      document.body.appendChild(dialog);
      dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close());
    }
    const messageEl = dialog.querySelector('#groundNoticeMessage');
    if (messageEl) messageEl.textContent = message;
    if (!dialog.open) dialog.showModal();
    bringDialogToFront(dialog);
  }

  function openCurrentDataRecord() {
    const target = state.currentExperiment === 'langmuir'
      ? refs.dialogs.langmuir
      : refs.dialogs.paschen;
    openDialog(target);
  }

  function returnToHome() {
    showExperimentEntry();
  }

  function showLearningHome() {
    document.querySelectorAll('dialog[open]').forEach((dialog) => dialog.close());
    refs.learningHome?.classList.remove('hidden');
    refs.experimentEntry?.classList.add('hidden');
    state.running = false;
    state.groundConfirmed = false;
    if (refs.startBtn) refs.startBtn.textContent = '1. \u5f00\u59cb\u653e\u7535';
    renderStats();
  }

  function showExperimentEntry() {
    document.querySelectorAll('dialog[open]').forEach((dialog) => dialog.close());
    refs.learningHome?.classList.add('hidden');
    refs.experimentEntry?.classList.remove('hidden');
    state.running = false;
    state.groundConfirmed = false;
    if (refs.startBtn) refs.startBtn.textContent = '1. \u5f00\u59cb\u653e\u7535';
    renderStats();
  }

  function enterExperiment(type) {
    const isLangmuir = type === 'langmuir';
    state.currentExperiment = isLangmuir ? 'langmuir' : 'paschen';
    state.electrodeType = isLangmuir ? 'sphere' : 'parallel';
    if (refs.electrodeType) refs.electrodeType.value = state.electrodeType;
    refs.learningHome?.classList.add('hidden');
    refs.experimentEntry?.classList.add('hidden');
    if (eng.ok) rebuildElectrodes();
    updateElectrodeSwitchLabel();
    renderStats();
  }

  function bindLearningHome() {
    const navItems = Array.from(document.querySelectorAll('[data-learning-section]'));
    const panels = Array.from(document.querySelectorAll('[data-learning-panel]'));
    const activate = (section) => {
      navItems.forEach((item) => item.classList.toggle('active', item.dataset.learningSection === section));
      panels.forEach((panel) => panel.classList.toggle('active', panel.dataset.learningPanel === section));
    };

    navItems.forEach((item) => {
      item.addEventListener('click', () => activate(item.dataset.learningSection || 'intro'));
    });

    refs.learningStartBtn?.addEventListener('click', showExperimentEntry);
    document.querySelectorAll('[data-show-experiment-entry]').forEach((btn) => {
      btn.addEventListener('click', showExperimentEntry);
    });
  }

  function switchElectrodeType() {
    state.electrodeType = state.electrodeType === 'sphere' ? 'parallel' : 'sphere';
    if (refs.electrodeType) refs.electrodeType.value = state.electrodeType;
    if (eng.ok) rebuildElectrodes();
    updateElectrodeSwitchLabel();
    renderStats();
  }

  function updateElectrodeSwitchLabel() {
    if (!refs.electrodeSwitchBtn) return;
    refs.electrodeSwitchBtn.textContent = state.electrodeType === 'sphere'
      ? '\u66f4\u6362\u7535\u6781\uff1a\u7403\u5f62'
      : '\u66f4\u6362\u7535\u6781\uff1a\u5e73\u884c\u677f';
  }

  function bindAllRanges() {
    bindRange('gapSlider', 'gapNumber', 'gapOut', 'gapMm', ' cm', onMainParamChanged);
    bindRange('probeSlider', 'probeNumber', 'probeOut', 'probeHeightMm', ' mm', onProbeHeightChanged);
    bindRange('mainVoltageSlider', 'mainVoltageNumber', 'mainVoltageOut', 'mainVoltageV', ' V', onMainParamChanged);
    bindRange('pressureSlider', 'pressureNumber', 'pressureOut', 'pressurePa', ' Pa', onMainParamChanged);
    bindRange('probeVoltageSlider', 'probeVoltageNumber', 'probeVoltageOut', 'probeVoltageV', ' V', onProbePowerChanged);
    bindRange('probeCurrentSlider', 'probeCurrentNumber', 'probeCurrentSetOut', 'probeLoopCurrentUa', ' uA', onProbePowerChanged);
  }

  function openDialog(dialog) {
    if (!dialog) return;
    const wasOpen = dialog.open;
    if (!wasOpen) {
      if (isParallelInstrumentDialog(dialog)) dialog.show();
      else dialog.showModal();
    }
    bringDialogToFront(dialog);
    if (isParallelInstrumentDialog(dialog)) {
      if (!wasOpen) placeParallelInstrumentDialog(dialog);
    } else {
      centerDialog(dialog);
    }
  }

  function openFloatingDialog(dialog) {
    if (!dialog) return;
    if (!dialog.open) dialog.show();
    requestAnimationFrame(() => {
      const rect = dialog.getBoundingClientRect();
      moveDialog(
        dialog,
        Math.max(24, window.innerWidth - rect.width - 280),
        96
      );
    });
  }

  function centerDialog(dialog) {
    requestAnimationFrame(() => {
      const rect = dialog.getBoundingClientRect();
      moveDialog(dialog, (window.innerWidth - rect.width) / 2, Math.max((window.innerHeight - rect.height) / 2, 18));
    });
  }

  function isParallelInstrumentDialog(dialog) {
    return ['motorDialog', 'mainPowerDialog', 'probePowerDialog'].includes(dialog?.id);
  }

  function placeParallelInstrumentDialog(dialog) {
    requestAnimationFrame(() => {
      const rect = dialog.getBoundingClientRect();
      const gap = 18;
      const slots = {
        motorDialog: gap,
        mainPowerDialog: Math.max(gap, (window.innerWidth - rect.width) / 2),
        probePowerDialog: Math.max(gap, window.innerWidth - rect.width - gap),
      };
      moveDialog(dialog, slots[dialog.id] ?? ((window.innerWidth - rect.width) / 2), 58);
    });
  }

  function bringDialogToFront(dialog) {
    if (!dialog) return;
    state.dialogZ = (Number(state.dialogZ) || 70) + 1;
    dialog.style.zIndex = String(state.dialogZ);
  }

  function moveDialog(dialog, left, top) {
    const rect = dialog.getBoundingClientRect();
    const margin = 18;
    const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
    const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);
    dialog.style.position = 'fixed';
    dialog.style.margin = '0';
    dialog.style.left = clamp(left, margin, maxLeft) + 'px';
    dialog.style.top = clamp(top, margin, maxTop) + 'px';
  }

  function initDraggableDialogs() {
    const dialogs = Array.from(document.querySelectorAll('dialog.modal'));
    let drag = null;

    const stopDrag = () => {
      if (!drag) return;
      drag.dialog.classList.remove('dragging');
      document.body.classList.remove('dialog-dragging');
      drag = null;
    };

    window.addEventListener('pointermove', (e) => {
      if (!drag) return;
      moveDialog(drag.dialog, e.clientX - drag.offsetX, e.clientY - drag.offsetY);
    });

    window.addEventListener('pointerup', stopDrag);
    window.addEventListener('pointercancel', stopDrag);
    window.addEventListener('blur', stopDrag);

    dialogs.forEach((dialog) => {
      const handle = dialog.querySelector('h3');
      dialog.addEventListener('pointerdown', () => bringDialogToFront(dialog));
      if (!handle) return;

      handle.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || !dialog.open) return;
        bringDialogToFront(dialog);
        const rect = dialog.getBoundingClientRect();
        drag = {
          dialog,
          offsetX: e.clientX - rect.left,
          offsetY: e.clientY - rect.top,
        };
        dialog.classList.add('dragging');
        document.body.classList.add('dialog-dragging');
        e.preventDefault();
      });

      dialog.addEventListener('close', stopDrag);
    });
  }

  function bindRange(sliderId, numberId, outId, key, unit, cb, options = {}) {
    const s = id(sliderId);
    const n = id(numberId);
    const out = id(outId);
    if (!s || !out) return;

    const sliderMin = Number(s.min);
    const sliderMax = Number(s.max);
    const sliderStep = Number(s.step) || 1;
    const displayScale = Number.isFinite(options.displayScale) ? options.displayScale : 1;
    const displayDigits = Number.isFinite(options.displayDigits) ? options.displayDigits : 6;
    const isPending = (raw) => raw === '' || raw === '-' || raw === '.' || raw === '-.';

    const snapSliderValue = (value) => {
      let v = Number(value);
      if (!Number.isFinite(v)) return null;
      if (Number.isFinite(sliderMin)) v = Math.max(sliderMin, v);
      if (Number.isFinite(sliderMax)) v = Math.min(sliderMax, v);
      v = Math.round(v / sliderStep) * sliderStep;
      return Number(v.toFixed(6));
    };

    const formatDisplayValue = (value) => {
      const scaled = Number(value) * displayScale;
      if (!Number.isFinite(scaled)) return '';
      return String(Number(scaled.toFixed(displayDigits)));
    };

    const commit = (value, preserveNumberText = false) => {
      const raw = Number(value);
      if (!Number.isFinite(raw)) return;
      const v = Number(raw.toFixed(6));
      state[key] = v;
      const sliderValue = snapSliderValue(v);
      if (sliderValue != null) s.value = String(sliderValue);
      if (n && !preserveNumberText) n.value = formatDisplayValue(v);
      out.textContent = `${formatDisplayValue(v)}${unit}`;
      if (cb) cb();
    };

    const commitFromDisplayValue = (value, preserveNumberText = false) => {
      const raw = Number(value);
      if (!Number.isFinite(raw)) return;
      commit(raw / Math.max(displayScale, 1e-9), preserveNumberText);
    };

    commit(state[key]);
    s.oninput = () => commit(s.value);
    if (n) {
      n.oninput = () => {
        const raw = n.value.trim();
        if (isPending(raw)) return;
        commitFromDisplayValue(raw, true);
      };
      n.onchange = () => {
        const raw = n.value.trim();
        if (isPending(raw)) return;
        commitFromDisplayValue(raw);
      };
    }
  }

  function snapInstrumentValue(value, config) {
    let v = Number(value);
    if (!Number.isFinite(v)) return state[config.key] || 0;
    v = clamp(v, config.min, config.max);
    const step = Number(config.step) || 1;
    v = config.min + Math.round((v - config.min) / step) * step;
    return Number(clamp(v, config.min, config.max).toFixed(6));
  }

  function setBoundValue(config, value) {
    if (config.probeControlMode && !claimProbePowerControl(config.probeControlMode)) return;
    const next = snapInstrumentValue(value, config);
    state[config.key] = next;
    syncBoundControl(config, next);

    if (config.onChange) config.onChange();
    else renderStats();
    renderInstrumentDisplays();
  }

  function syncBoundControl(config, value) {
    const slider = id(config.sliderId);
    const number = id(config.numberId);
    const out = id(config.outId);
    const display = String(Number(Number(value).toFixed(6)));

    if (slider) slider.value = display;
    if (number) number.value = display;
    if (out) out.textContent = `${display} ${config.unit}`;
  }

  function instrumentStepperStep(config) {
    const step = typeof config.stepperStep === 'function' ? Number(config.stepperStep()) : Number(config.step);
    return Number.isFinite(step) && step > 0 ? step : 1;
  }

  function mainPowerDigitStep() {
    const steps = [0.1, 1, 10, 100, 1000];
    const index = clamp(Number(state.mainPowerDigitIndex) || 0, 0, steps.length - 1);
    return steps[index];
  }

  function bindMainPowerDigitControls() {
    const prev = id('mainPowerPrevDigit');
    const next = id('mainPowerNextDigit');
    const bind = (button, delta) => {
      if (!button || button.dataset.bound === '1') return;
      button.dataset.bound = '1';
      button.addEventListener('click', () => {
        state.mainPowerDigitIndex = clamp((Number(state.mainPowerDigitIndex) || 0) + delta, 0, 4);
        renderInstrumentDisplays();
      });
    };
    bind(prev, 1);
    bind(next, -1);
  }

  function renderMainPowerDigitControls() {
    const hint = id('mainPowerDigitHint');
    if (hint) hint.textContent = `${mainPowerDigitStep().toFixed(mainPowerDigitStep() < 1 ? 1 : 0)}V/档`;
  }

  function valueToKnobAngle(value, config) {
    const span = Math.max(config.max - config.min, 1e-9);
    const t = clamp((value - config.min) / span, 0, 1);
    return config.angleMin + t * (config.angleMax - config.angleMin);
  }

  function claimProbePowerControl(mode) {
    if (!mode) return true;
    const active = state.probePowerControlMode || '';
    if (active && active !== mode) {
      const activeLabel = active === PROBE_POWER_CONTROL_MODES.VOLTAGE ? '电压档' : '电流档';
      const targetLabel = mode === PROBE_POWER_CONTROL_MODES.VOLTAGE ? '电压档' : '电流档';
      state.probePowerError = `操作错误：已选择${activeLabel}，不能再调${targetLabel}`;
      renderInstrumentDisplays();
      return false;
    }
    state.probePowerControlMode = mode;
    state.probePowerError = '';
    return true;
  }

  function bindKnob(config) {
    const knob = id(config.knobId);
    if (!knob || knob.dataset.bound === '1') return;
    knob.dataset.bound = '1';

    if (config.probeControlMode || config.clickStepOnly) {
      knob.addEventListener('contextmenu', (e) => e.preventDefault());
      knob.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 && e.button !== 2) return;
        e.preventDefault();
        e.stopPropagation();
        if (config.probeControlMode && !claimProbePowerControl(config.probeControlMode)) return;
        const direction = e.button === 2 ? 1 : -1;
        const current = Number(state[config.key]) || 0;
        setBoundValue(config, current + direction * instrumentStepperStep(config));
      });
      return;
    }

    let drag = null;
    const move = (e) => {
      if (!drag) return;
      const delta = (drag.startY - e.clientY) + (e.clientX - drag.startX) * 0.35;
      setBoundValue(config, drag.startValue + delta * config.dragScale);
      e.preventDefault();
    };
    const stop = () => {
      if (!drag) return;
      knob.classList.remove('is-dragging');
      drag = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };

    knob.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      drag = {
        startX: e.clientX,
        startY: e.clientY,
        startValue: Number(state[config.key]) || 0,
      };
      knob.classList.add('is-dragging');
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', stop);
      window.addEventListener('pointercancel', stop);
      e.preventDefault();
      e.stopPropagation();
    });
  }

  function bindStepper(config) {
    const minus = id(config.minusId);
    const plus = id(config.plusId);
    if (minus && minus.dataset.bound !== '1') {
      minus.dataset.bound = '1';
      minus.addEventListener('click', () => setBoundValue(config, (Number(state[config.key]) || 0) - instrumentStepperStep(config)));
    }
    if (plus && plus.dataset.bound !== '1') {
      plus.dataset.bound = '1';
      plus.addEventListener('click', () => setBoundValue(config, (Number(state[config.key]) || 0) + instrumentStepperStep(config)));
    }
  }

  function bindInstrumentPanels() {
    Object.values(INSTRUMENT_PANEL_CONFIGS).forEach((config) => {
      bindKnob(config);
      bindStepper(config);
    });
    bindMainPowerDigitControls();
    renderInstrumentDisplays();
  }

  function renderInstrumentDisplays() {
    Object.values(INSTRUMENT_PANEL_CONFIGS).forEach((config) => {
      const value = Number(state[config.key]) || 0;
      const screen = id(config.screenId);
      const knob = id(config.knobId);
      if (screen && config.key === 'gapMm') renderMotorControlPanel();
      else if (screen && config.key === 'mainVoltageV') renderMainPowerPanel();
      else if (screen && (config.key === 'probeVoltageV' || config.key === 'probeLoopCurrentUa')) renderProbePowerPanel();
      else if (screen) screen.textContent = config.format(value);
      if (knob) knob.style.setProperty('--angle', `${valueToKnobAngle(value, config).toFixed(2)}deg`);
    });
    renderMainPowerDigitControls();
    renderInstrumentSceneScreens();
  }

  function bindMotorControlInstrument() {
    const bindClick = (elementId, handler) => {
      const el = id(elementId);
      if (!el || el.dataset.motorBound === '1') return;
      el.dataset.motorBound = '1';
      el.addEventListener('click', handler);
    };

    bindClick('motorModeAutoBtn', () => setMotorControlMode(MOTOR_CONTROL_MODES.AUTO, '自动执行：右侧数字键输入极板间距，按确认执行'));
    bindClick('motorModeManualBtn', () => setMotorControlMode(MOTOR_CONTROL_MODES.MANUAL, '手动操作：使用下方 ← / → 点动极板'));
    bindClick('motorProgramBtn', () => showMotorAlarm('程序管理暂不改变实验参数'));
    bindClick('motorZeroBtn', zeroMotorAxis);
    bindClick('motorGapLeftBtn', () => nudgeMotorGap(-INSTRUMENT_PANEL_CONFIGS.motorGap.step));
    bindClick('motorGapRightBtn', () => nudgeMotorGap(INSTRUMENT_PANEL_CONFIGS.motorGap.step));
    bindClick('motorConfirmBtn', confirmMotorAutoInput);
    bindClick('motorStartBtn', confirmMotorAutoInput);
    bindClick('motorStopBtn', () => showMotorAlarm('自动执行已暂停'));
    bindClick('probeVerticalUpBtn', () => nudgeProbeHeight(1));
    bindClick('probeVerticalDownBtn', () => nudgeProbeHeight(-1));
    bindClick('probeHorizontalLeftBtn', () => nudgeProbeHorizontal(-1));
    bindClick('probeHorizontalRightBtn', () => nudgeProbeHorizontal(1));

    document.querySelectorAll('[data-motor-key]').forEach((btn) => {
      if (btn.dataset.motorBound === '1') return;
      btn.dataset.motorBound = '1';
      btn.addEventListener('click', () => handleMotorKey(btn.dataset.motorKey || ''));
    });
  }

  function setMotorControlMode(mode, message = '') {
    state.controlInstrumentMode = mode;
    state.controlInstrumentAlarm = message;
    if (mode !== MOTOR_CONTROL_MODES.AUTO) state.controlInstrumentInput = '';
    renderInstrumentDisplays();
  }

  function renderMotorControlPanel() {
    const screen = id('motorGapLiveDisplay');
    if (!screen) return;

    const lcd = getMotorControlLcdRows();
    const menuAlarm = lcd.alarmText
      ? `<div class="control-lcd__alarm">${escapeHtml(lcd.alarmText)}</div>`
      : '';

    if (lcd.mode === MOTOR_CONTROL_MODES.MANUAL) {
      screen.innerHTML = `
        <div class="control-lcd__grid">
          <div class="control-lcd__cell">${escapeHtml(lcd.rows[0][0])}</div>
          <div class="control-lcd__cell control-lcd__cell--wide">X <span class="control-lcd__value">${escapeHtml(lcd.gapText)}</span></div>
          <div class="control-lcd__cell">${escapeHtml(lcd.rows[1][0])}</div>
          <div class="control-lcd__cell">${escapeHtml(lcd.rows[1][1])}</div>
          <div class="control-lcd__cell">${escapeHtml(lcd.rows[1][2])}</div>
          <div class="control-lcd__cell">${escapeHtml(lcd.rows[2][0])}</div>
          <div class="control-lcd__cell control-lcd__cell--wide">探针 Y <span class="control-lcd__value">${escapeHtml(lcd.probeY)}</span></div>
          <div class="control-lcd__cell">${escapeHtml(lcd.rows[3][0])}</div>
          <div class="control-lcd__cell control-lcd__cell--wide">${escapeHtml(lcd.rows[3][1])}</div>
        </div>`;
      return;
    }

    if (lcd.mode === MOTOR_CONTROL_MODES.AUTO) {
      screen.innerHTML = `
        <div class="control-lcd__grid">
          <div class="control-lcd__cell">${escapeHtml(lcd.rows[0][0])}</div>
          <div class="control-lcd__cell control-lcd__cell--wide">X <span class="control-lcd__value">${escapeHtml(lcd.gapText)}</span></div>
          <div class="control-lcd__cell">${escapeHtml(lcd.rows[1][0])}</div>
          <div class="control-lcd__cell control-lcd__cell--wide">d <span class="control-lcd__value">${escapeHtml(lcd.inputText)}</span> cm</div>
          <div class="control-lcd__cell">${escapeHtml(lcd.rows[2][0])}</div>
          <div class="control-lcd__cell control-lcd__cell--wide">${escapeHtml(lcd.rows[2][1])}</div>
          <div class="control-lcd__cell">${escapeHtml(lcd.rows[3][0])}</div>
          <div class="control-lcd__cell control-lcd__cell--wide">${escapeHtml(lcd.rows[3][1])}</div>
        </div>`;
      return;
    }

    screen.innerHTML = `
      <div class="control-lcd__grid control-lcd__menu">
        ${lcd.rows.map((row) => row.map((cell, i) => `<div class="control-lcd__cell${i === 1 && row.length === 2 ? ' control-lcd__cell--wide' : ''}">${escapeHtml(cell)}</div>`).join('')).join('')}
      </div>${menuAlarm}`;
  }

  function getMotorControlLcdRows() {
    const mode = state.controlInstrumentMode || MOTOR_CONTROL_MODES.MENU;
    const gapText = formatMotorAxis(Number(state.gapMm) || 0);
    const probeY = formatMotorAxis(Number(state.probeHeightMm) || 0);
    const probeX = formatMotorAxis(Number(state.probeHorizontalMm) || 0);
    const alarmText = state.controlInstrumentAlarm || '';
    if (mode === MOTOR_CONTROL_MODES.MANUAL) {
      const statusText = alarmText || (state.controlInstrumentZeroed ? 'X 已清零' : '←贴紧  →张开  F4清零');
      return {
        mode, gapText, probeY, probeX, alarmText,
        rows: [
          ['手动高速', `X ${gapText}`, ''],
          ['点动操作', 'F 00000', '100%'],
          ['回程序零', `探针 Y ${probeY}`, ''],
          ['回机械零', statusText, ''],
        ],
      };
    }
    if (mode === MOTOR_CONTROL_MODES.AUTO) {
      const inputText = state.controlInstrumentInput || Number((Number(state.gapMm) || 0).toFixed(1)).toString();
      const statusText = alarmText || `双探针 Y ${probeY}  H ${probeX}`;
      return {
        mode, gapText, probeY, probeX, inputText, alarmText,
        rows: [
          ['自动执行', `X ${gapText}`, ''],
          ['目标间距', `d ${inputText} cm`, ''],
          ['数字输入', '右侧键盘 + 确认', ''],
          ['状态', statusText, ''],
        ],
      };
    }
    return {
      mode, gapText, probeY, probeX, alarmText,
      rows: [
        ['自动执行', `X ${gapText}`, 'P 00000'],
        ['手动操作', 'F 00000', 'T 00000'],
        ['程序管理', '工件 00000'],
        ['参数设置', '文件1234 n000'],
      ],
    };
  }

  function renderMainPowerPanel() {
    const screen = id('mainPowerLiveDisplay');
    if (!screen) return;
    const data = getMainPowerDisplayData();
    const voltage = String(data.voltageText || '0V').replace(/V$/i, '');
    const current = String(data.currentText || '0A').replace(/A$/i, '');
    const power = String(data.powerText || '0W').replace(/W$/i, '');
    screen.innerHTML = `
      <div class="main-power-readout">
        <div class="main-power-meter main-power-meter--current">
          <strong>${escapeHtml(Number(current).toFixed(4))}<em>A</em></strong>
          <span>CURRENT A</span>
        </div>
        <div class="main-power-meter main-power-meter--voltage">
          <strong>${escapeHtml(Number(voltage).toFixed(1))}<em>V</em></strong>
          <span>VOLTAGE V</span>
        </div>
        <div class="main-power-meter main-power-meter--power">
          <strong>${escapeHtml(Number(power).toFixed(2))}<em>W</em></strong>
          <span>POWER W</span>
        </div>
      </div>
    `;
  }

  function renderProbePowerPanel() {
    const screen = id('probePowerLiveDisplay');
    if (!screen) return;
    const data = getProbePowerDisplayData();
    screen.innerHTML = `
      <div class="power-lcd__cell">
        <div class="power-lcd__value power-lcd__current">${escapeHtml(data.currentText)}</div>
        <div class="power-lcd__label">${escapeHtml(data.currentLabel)}</div>
      </div>
      <div class="power-lcd__cell">
        <div class="power-lcd__value power-lcd__voltage">${escapeHtml(data.voltageText)}</div>
        <div class="power-lcd__label">${escapeHtml(data.voltageLabel)}</div>
      </div>
      ${data.errorText ? `<div class="probe-lcd__error">${escapeHtml(data.errorText)}</div>` : ''}`;
  }

  function getMainPowerDisplayData() {
    const voltage = Math.max(Number(state.mainVoltageV) || 0, 0);
    const currentA = Math.max(Number(state.mainCurrentMa) || 0, 0) / 1000;
    const powerW = Math.max(Number(state.mainPowerW) || 0, 0);
    const voltageText = voltage.toFixed(1);
    return {
      voltageText: `${voltageText}V`,
      currentText: `${currentA.toFixed(4)}A`,
      powerText: `${powerW < 100 ? powerW.toFixed(2) : powerW.toFixed(1)}W`,
    };
  }

  function getProbePowerDisplayData() {
    const voltage = Number(state.probeVoltageV) || 0;
    const current = Number(state.probeLoopCurrentUa) || 0;
    const measured = Number(state.probeCurrentUa) || 0;
    const mode = state.probePowerControlMode || PROBE_POWER_CONTROL_MODES.VOLTAGE;
    const voltageLabel = mode === PROBE_POWER_CONTROL_MODES.VOLTAGE ? 'VOLTAGE SET' : 'VOLTAGE AUTO';
    const currentLabel = mode === PROBE_POWER_CONTROL_MODES.CURRENT ? 'CURRENT SET' : 'CURRENT AUTO';
    return {
      voltageText: `${Math.abs(voltage - Math.round(voltage)) < 1e-6 ? voltage.toFixed(0) : voltage.toFixed(1)}V`,
      currentText: `${current.toFixed(Math.abs(current) < 10 ? 1 : 0)}uA`,
      measuredText: `测${measured.toFixed(2)}uA`,
      voltageLabel,
      currentLabel,
      errorText: state.probePowerError || '',
    };
  }

  function mainPowerDisplaySignature() {
    const d = getMainPowerDisplayData();
    return `${d.voltageText}|${d.currentText}|${d.powerText}`;
  }

  function probePowerDisplaySignature() {
    const d = getProbePowerDisplayData();
    return `${d.voltageText}|${d.currentText}|${d.errorText || d.measuredText}`;
  }

  function pressureGaugeDisplaySignature() {
    const pressure = Math.max(Number(state.pressurePa) || 0, 0);
    return `${Math.round(pressure)} Pa`;
  }

  function syncProbePowerLinkedValues(modeInfo) {
    const mode = state.probePowerControlMode || '';
    if (mode === PROBE_POWER_CONTROL_MODES.CURRENT) {
      state.probeVoltageV = estimateProbeVoltageForCurrentUa(modeInfo, state.probeLoopCurrentUa);
      syncBoundControl(INSTRUMENT_PANEL_CONFIGS.probeVoltage, state.probeVoltageV);
      syncBoundControl(INSTRUMENT_PANEL_CONFIGS.probeCurrent, state.probeLoopCurrentUa);
    }
  }

  function syncProbePowerAfterMeasurement() {
    if (state.probePowerControlMode === PROBE_POWER_CONTROL_MODES.VOLTAGE) {
      state.probeLoopCurrentUa = Number(state.probeCurrentUa.toFixed(3));
      syncBoundControl(INSTRUMENT_PANEL_CONFIGS.probeCurrent, state.probeLoopCurrentUa);
      syncBoundControl(INSTRUMENT_PANEL_CONFIGS.probeVoltage, state.probeVoltageV);
    }
  }

  function estimateProbeVoltageForCurrentUa(modeInfo, targetCurrentUa) {
    const target = clamp(Number(targetCurrentUa) || 0, -100, 100);
    if (!state.running || (!modeInfo.breakdown && modeInfo.mode !== MODE_CORONA)) {
      return Number(clamp(target * 2.5, -250, 250).toFixed(3));
    }

    let lo = -250;
    let hi = 250;
    for (let i = 0; i < 34; i += 1) {
      const mid = (lo + hi) / 2;
      const current = estimateProbeCurrentUa(modeInfo, mid);
      if (current < target) lo = mid;
      else hi = mid;
    }
    return Number(((lo + hi) / 2).toFixed(3));
  }

  function motorControlSceneSignature() {
    const modeLabel =
      state.controlInstrumentMode === MOTOR_CONTROL_MODES.MANUAL ? '手动' :
      state.controlInstrumentMode === MOTOR_CONTROL_MODES.AUTO ? '自动' : '菜单';
    return `${modeLabel}|X ${formatMotorAxis(Number(state.gapMm) || 0)}|Y ${formatMotorAxis(Number(state.probeHeightMm) || 0)}`;
  }

  function nudgeMotorGap(delta) {
    if (state.controlInstrumentMode !== MOTOR_CONTROL_MODES.MANUAL) {
      state.controlInstrumentMode = MOTOR_CONTROL_MODES.MANUAL;
    }
    const config = INSTRUMENT_PANEL_CONFIGS.motorGap;
    const current = Number(state.gapMm) || 0;
    const next = snapInstrumentValue(current + delta, config);
    state.controlInstrumentZeroed = false;
    state.controlInstrumentAlarm = next <= 0 && delta < 0
      ? '报警：极板已贴紧，间距到零，请按 F4 清零 X'
      : `点动完成：d = ${Number(next.toFixed(1))} cm`;
    setBoundValue(config, next);
  }

  function zeroMotorAxis() {
    if (state.controlInstrumentMode === MOTOR_CONTROL_MODES.MENU) {
      state.controlInstrumentMode = MOTOR_CONTROL_MODES.MANUAL;
    }
    const config = INSTRUMENT_PANEL_CONFIGS.motorGap;
    const current = Number(state.gapMm) || 0;
    if (current > config.step / 2) {
      showMotorAlarm('请先用 ← 键让极板贴紧到 0，再按 F4 清零');
      return;
    }
    state.controlInstrumentZeroed = true;
    state.controlInstrumentInput = '';
    state.controlInstrumentAlarm = 'X 示数已归零，当前机械零点建立';
    setBoundValue(config, 0);
  }

  function handleMotorKey(key) {
    if (state.controlInstrumentMode !== MOTOR_CONTROL_MODES.AUTO) {
      state.controlInstrumentMode = MOTOR_CONTROL_MODES.AUTO;
      state.controlInstrumentAlarm = '已进入自动执行：请输入目标间距';
    } else {
      state.controlInstrumentAlarm = '';
    }

    if (key === 'back') {
      state.controlInstrumentInput = state.controlInstrumentInput.slice(0, -1);
      renderInstrumentDisplays();
      return;
    }
    if (key === '.') {
      if (!state.controlInstrumentInput.includes('.')) state.controlInstrumentInput += state.controlInstrumentInput ? '.' : '0.';
      renderInstrumentDisplays();
      return;
    }
    if (/^\d$/.test(key) && state.controlInstrumentInput.replace('.', '').length < 5) {
      state.controlInstrumentInput += key;
      renderInstrumentDisplays();
    }
  }

  function confirmMotorAutoInput() {
    if (state.controlInstrumentMode !== MOTOR_CONTROL_MODES.AUTO) {
      setMotorControlMode(MOTOR_CONTROL_MODES.AUTO, '自动执行：请先输入目标间距');
      return;
    }
    const raw = state.controlInstrumentInput.trim();
    if (!raw) {
      showMotorAlarm('请输入目标极板间距');
      return;
    }
    const value = readLooseNumber(raw, NaN);
    if (!Number.isFinite(value)) {
      showMotorAlarm('输入无效，请输入数字');
      return;
    }
    const config = INSTRUMENT_PANEL_CONFIGS.motorGap;
    const next = snapInstrumentValue(value, config);
    state.controlInstrumentInput = '';
    state.controlInstrumentZeroed = next === 0;
    state.controlInstrumentAlarm = `自动执行完成：d = ${Number(next.toFixed(1))} cm`;
    setBoundValue(config, next);
  }

  function nudgeProbeHeight(delta) {
    const next = snapProbeControlValue((Number(state.probeHeightMm) || 0) + delta);
    state.probeHeightMm = next;
    setProbeHeightValue(next, probeControlStatusText());
  }

  function setProbeHeightValue(value, message = '') {
    const next = snapProbeControlValue(value);
    state.probeHeightMm = next;
    const slider = id('probeSlider');
    const number = id('probeNumber');
    const out = id('probeOut');
    if (slider) slider.value = String(next);
    if (number) number.value = String(next);
    if (out) out.textContent = `${next} mm`;
    if (eng.ok) applyProbeHeight();
    if (message) state.controlInstrumentAlarm = message;
    renderStats();
  }

  function nudgeProbeHorizontal(delta) {
    const next = snapProbeControlValue((Number(state.probeHorizontalMm) || 0) + delta);
    state.probeHorizontalMm = next;
    state.controlInstrumentAlarm = probeControlStatusText();
    if (eng.ok) applyProbeHeight();
    renderStats();
  }

  function probeControlStatusText() {
    return `双探针 Y = ${Number(state.probeHeightMm) || 0} mm，H = ${Number(state.probeHorizontalMm) || 0} mm`;
  }

  function snapProbeControlValue(value) {
    const v = Number(value);
    if (!Number.isFinite(v)) return Number(state.probeHeightMm) || 0;
    return clamp(Math.round(v), PROBE_CONTROL_MIN_MM, PROBE_CONTROL_MAX_MM);
  }

  function showMotorAlarm(message) {
    state.controlInstrumentAlarm = message;
    renderInstrumentDisplays();
  }

  function formatMotorAxis(value) {
    const n = Number(value) || 0;
    const sign = n < 0 ? '-' : '';
    return sign + Math.abs(n).toFixed(3).padStart(9, '0');
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function initEnvironmentFeed() {
    restoreEnvCache();
    updateEnvStatus();
    if (!window.fetch) {
      state.env.lastError = state.env.lastUpdated
        ? '\u7f51\u7edc\u63a5\u53e3\u4e0d\u53ef\u7528\uff0c\u5df2\u4f7f\u7528\u6700\u8fd1\u4e00\u6b21\u7f13\u5b58\u6761\u4ef6'
        : '\u73af\u5883\u8bfb\u53d6\u4e0d\u53ef\u7528\uff0c\u5df2\u4f7f\u7528\u9ed8\u8ba4\u5b9e\u9a8c\u5ba4\u6761\u4ef6';
      updateEnvStatus();
      renderStats();
      return;
    }
    refreshAmbientWeather(false);
    window.setInterval(() => refreshAmbientWeather(false), WEATHER_REFRESH_MS);
  }

  function updateEnvStatus() {
    if (!refs.envStatus) return;
    const env = state.env;
    let text = `\u73af\u5883\uff1a${env.temperatureC.toFixed(1)} \u00b0C / ${env.humidity.toFixed(0)} %RH`;
    text += ` \u00b7 ${env.sourceLabel}`;
    if (env.sourceLabel.includes('IP')) text += ' \u00b7 IP定位仅作兜底';
    if (env.locationLabel) text += ` \u00b7 ${env.locationLabel}`;
    if (env.lastUpdated) text += ` \u00b7 ${env.lastUpdated}`;
    if (env.fetching) text += ' \u00b7 \u6b63\u5728\u66f4\u65b0';
    if (env.lastError) text += ` \u00b7 ${env.lastError}`;
    refs.envStatus.textContent = text;
    if (refs.envCityInput && document.activeElement !== refs.envCityInput) {
      refs.envCityInput.value = env.sourceLabel.startsWith('\u624b\u52a8')
        ? (env.locationLabel || '')
        : '';
    }
    if (refs.envTempNumber && document.activeElement !== refs.envTempNumber) refs.envTempNumber.value = Number.isFinite(env.temperatureC) ? String(env.temperatureC) : '';
    if (refs.envHumidityNumber && document.activeElement !== refs.envHumidityNumber) refs.envHumidityNumber.value = Number.isFinite(env.humidity) ? String(env.humidity) : '';
  }

  function applyManualEnvironment() {
    const city = String(refs.envCityInput?.value || '').trim();
    const temperatureC = readLooseNumber(refs.envTempNumber?.value, NaN);
    const humidity = readLooseNumber(refs.envHumidityNumber?.value, NaN);
    if (!Number.isFinite(temperatureC) || !Number.isFinite(humidity)) {
      state.env.lastError = '\u8bf7\u5148\u8f93\u5165\u6709\u6548\u7684\u6e29\u5ea6\u548c\u6e7f\u5ea6';
      updateEnvStatus();
      return;
    }
    state.env.temperatureC = Number(temperatureC.toFixed(1));
    state.env.humidity = clamp(Number(humidity.toFixed(1)), 0, 100);
    state.env.sourceLabel = '\u624b\u52a8\u8f93\u5165';
    state.env.locationLabel = city;
    state.env.lastUpdated = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    state.env.lastError = '';
    saveEnvCache();
    updateEnvStatus();
    renderStats();
  }

  async function geocodeCityName(city) {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.search = new URLSearchParams({
      name: city,
      count: '1',
      language: 'zh',
      format: 'json',
    }).toString();
    const data = await fetchJsonWithTimeout(url.toString(), 8000);
    const hit = Array.isArray(data.results) ? data.results[0] : null;
    if (!hit || !Number.isFinite(Number(hit.latitude)) || !Number.isFinite(Number(hit.longitude))) {
      throw new Error('\u672a\u627e\u5230\u8be5\u57ce\u5e02');
    }
    return {
      latitude: Number(hit.latitude),
      longitude: Number(hit.longitude),
      label: [hit.name, hit.admin1, hit.country].filter(Boolean).join(' / '),
    };
  }

  function buildCityQueryCandidates(city) {
    const base = String(city || '').trim();
    if (!base) return [];
    const queries = [base];
    const suffixes = ['市', '地区', '自治州', '盟'];
    if (!suffixes.some((suffix) => base.endsWith(suffix))) queries.push(`${base}市`);
    return [...new Set(queries)];
  }

  async function fetchAmbientWeatherByCityName(city) {
    let lastErr = null;
    const queries = buildCityQueryCandidates(city);
    for (const query of queries) {
      try {
        const encoded = encodeURIComponent(query);
        const data = await fetchJsonWithTimeout(`https://wttr.in/${encoded}?format=j1`, 10000);
        const current = Array.isArray(data.current_condition) ? data.current_condition[0] : null;
        const nearest = Array.isArray(data.nearest_area) ? data.nearest_area[0] : null;
        const temperatureC = Number(current?.temp_C);
        const humidity = Number(current?.humidity);
        if (!Number.isFinite(temperatureC) || !Number.isFinite(humidity)) {
          throw new Error('\u57ce\u5e02\u5929\u6c14\u6570\u636e\u4e0d\u5b8c\u6574');
        }
        const areaName = nearest?.areaName?.[0]?.value || query;
        const region = nearest?.region?.[0]?.value || '';
        const country = nearest?.country?.[0]?.value || '';
        return {
          temperatureC,
          humidity,
          label: [areaName, region, country].filter(Boolean).join(' / '),
        };
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error('\u672a\u627e\u5230\u8be5\u57ce\u5e02');
  }

  async function applyCityEnvironment() {
    const city = String(refs.envCityInput?.value || '').trim();
    if (!city) {
      state.env.lastError = '\u8bf7\u5148\u8f93\u5165\u57ce\u5e02\u540d\u79f0';
      updateEnvStatus();
      return;
    }
    if (state.env.fetching) return;
    state.env.fetching = true;
    state.env.lastError = '';
    updateEnvStatus();
    try {
      let cityWeather = null;
      try {
        cityWeather = await fetchAmbientWeatherByCityName(city);
      } catch (_err) {
        cityWeather = null;
      }

      if (cityWeather) {
        state.env.temperatureC = Number(cityWeather.temperatureC.toFixed(1));
        state.env.humidity = clamp(Number(cityWeather.humidity.toFixed(1)), 0, 100);
        state.env.sourceLabel = '\u624b\u52a8\u57ce\u5e02\u5929\u6c14';
        // Prefer the exact user-entered city name, because nearest_area from
        // the weather provider can resolve to a nearby district/grid label.
        state.env.locationLabel = city;
      } else {
        const place = await geocodeCityName(city);
        const { temperatureC, humidity } = await fetchAmbientWeatherByCoords(place.latitude, place.longitude);
        state.env.temperatureC = Number(temperatureC.toFixed(1));
        state.env.humidity = clamp(Number(humidity.toFixed(1)), 0, 100);
        state.env.sourceLabel = '\u624b\u52a8\u57ce\u5e02\u5929\u6c14';
        state.env.locationLabel = city;
      }
      state.env.lastUpdated = new Date().toLocaleTimeString('zh-CN', { hour12: false });
      state.env.lastError = '';
      saveEnvCache();
    } catch (err) {
      state.env.lastError = err?.message || '\u57ce\u5e02\u5929\u6c14\u8bfb\u53d6\u5931\u8d25';
    } finally {
      state.env.fetching = false;
      updateEnvStatus();
      renderStats();
    }
  }

  function getGeoPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('\u6d4f\u89c8\u5668\u4e0d\u652f\u6301\u5b9a\u4f4d'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 10 * 60 * 1000,
      });
    });
  }

  function restoreEnvCache() {
    try {
      const raw = window.localStorage?.getItem(ENV_CACHE_KEY);
      if (!raw) return false;
      const cached = JSON.parse(raw);
      if (!Number.isFinite(cached.temperatureC) || !Number.isFinite(cached.humidity)) return false;
      state.env.temperatureC = Number(cached.temperatureC);
      state.env.humidity = clamp(Number(cached.humidity), 0, 100);
      state.env.sourceLabel = cached.sourceLabel || '\u7f13\u5b58\u5b9e\u9a8c\u5ba4\u6761\u4ef6';
      state.env.locationLabel = cached.locationLabel || '';
      state.env.ipAddress = cached.ipAddress || '--';
      state.env.lastUpdated = cached.lastUpdated || '';
      return true;
    } catch (err) {
      console.warn('restore env cache failed', err);
      return false;
    }
  }

  function saveEnvCache() {
    try {
      window.localStorage?.setItem(ENV_CACHE_KEY, JSON.stringify({
        temperatureC: state.env.temperatureC,
        humidity: state.env.humidity,
        sourceLabel: state.env.sourceLabel,
        locationLabel: state.env.locationLabel,
        ipAddress: state.env.ipAddress,
        lastUpdated: state.env.lastUpdated,
      }));
    } catch (err) {
      console.warn('save env cache failed', err);
    }
  }

  async function fetchJsonWithTimeout(url, timeoutMs = 8000) {
    const controller = window.AbortController ? new AbortController() : null;
    const timer = controller ? window.setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const resp = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: controller?.signal,
      });
      if (!resp.ok) throw new Error(`http ${resp.status}`);
      return await resp.json();
    } finally {
      if (timer) window.clearTimeout(timer);
    }
  }

  async function getIpGeoPosition() {
    const providers = [
      async () => {
        const data = await fetchJsonWithTimeout('https://ipwho.is/', 7000);
        if (data.success === false) throw new Error(data.message || 'ipwho lookup failed');
        const latitude = Number(data.latitude);
        const longitude = Number(data.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          throw new Error('ipwho missing coords');
        }
        return {
          coords: { latitude, longitude },
          sourceLabel: 'IP\u5b9a\u4f4d',
          ipAddress: data.ip || '--',
          locationLabel: [data.city, data.region, data.country].filter(Boolean).join(' / '),
        };
      },
      async () => {
        const data = await fetchJsonWithTimeout('https://ipinfo.io/json', 7000);
        const parts = String(data.loc || '').split(',');
        const latitude = Number(parts[0]);
        const longitude = Number(parts[1]);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          throw new Error('ipinfo missing coords');
        }
        return {
          coords: { latitude, longitude },
          sourceLabel: 'IP\u5b9a\u4f4d',
          ipAddress: data.ip || '--',
          locationLabel: [data.city, data.region, data.country].filter(Boolean).join(' / '),
        };
      },
      async () => {
        const data = await fetchJsonWithTimeout('https://ipapi.co/json/', 7000);
        const latitude = Number(data.latitude);
        const longitude = Number(data.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          throw new Error('ipapi missing coords');
        }
        return {
          coords: { latitude, longitude },
          sourceLabel: 'IP\u5b9a\u4f4d',
          ipAddress: data.ip || '--',
          locationLabel: [data.city, data.region, data.country_name].filter(Boolean).join(' / '),
        };
      }
    ];

    let lastErr = null;
    for (const provider of providers) {
      try {
        return await provider();
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error('IP\u5b9a\u4f4d\u5931\u8d25');
  }

  async function resolveAmbientLocation() {
    const ipLocation = await getIpGeoPosition();
    ipLocation.notice = '';
    return ipLocation;
  }

  async function fetchAmbientWeatherByCoords(lat, lon) {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.search = new URLSearchParams({
      latitude: lat.toFixed(4),
      longitude: lon.toFixed(4),
      current: 'temperature_2m,relative_humidity_2m',
      hourly: 'temperature_2m,relative_humidity_2m',
      forecast_hours: '1',
      timezone: 'auto',
    }).toString();
    const data = await fetchJsonWithTimeout(url.toString(), 8000);
    const current = data.current || {};
    const hourly = data.hourly || {};
    const temperatureC = Number.isFinite(current.temperature_2m) ? Number(current.temperature_2m) : Number(hourly.temperature_2m?.[0]);
    const humidity = Number.isFinite(current.relative_humidity_2m) ? Number(current.relative_humidity_2m) : Number(hourly.relative_humidity_2m?.[0]);
    if (!Number.isFinite(temperatureC) || !Number.isFinite(humidity)) {
      throw new Error('\u6e29\u6e7f\u5ea6\u6570\u636e\u4e0d\u5b8c\u6574');
    }
    return { temperatureC, humidity };
  }

  async function refreshAmbientWeather(userInitiated = false) {
    if (state.env.fetching) return;
    state.env.fetching = true;
    state.env.lastError = '';
    updateEnvStatus();
    try {
      const location = await resolveAmbientLocation();
      const lat = location.coords.latitude;
      const lon = location.coords.longitude;
      const { temperatureC, humidity } = await fetchAmbientWeatherByCoords(lat, lon);
      state.env.temperatureC = Number(temperatureC.toFixed(1));
      state.env.humidity = clamp(Number(humidity.toFixed(1)), 0, 100);
      state.env.sourceLabel = `${location.sourceLabel}\u5929\u6c14`;
      state.env.ipAddress = location.ipAddress || state.env.ipAddress || '--';
      state.env.locationLabel = location.locationLabel || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
      state.env.lastUpdated = new Date().toLocaleTimeString('zh-CN', { hour12: false });
      state.env.lastError = location.notice || '';
      saveEnvCache();
    } catch (err) {
      console.warn('ambient weather fallback', err);
      const restored = restoreEnvCache();
      if (restored) {
        state.env.lastError = userInitiated
          ? '\u672a\u80fd\u8bfb\u53d6\u5f53\u5730\u6e29\u6e7f\u5ea6\uff0c\u5df2\u56de\u9000\u5230\u6700\u8fd1\u4e00\u6b21\u7f13\u5b58\u6761\u4ef6'
          : '\u81ea\u52a8\u8bfb\u53d6\u5931\u8d25\uff0c\u5df2\u56de\u9000\u5230\u6700\u8fd1\u4e00\u6b21\u7f13\u5b58\u6761\u4ef6';
      } else {
        state.env.sourceLabel = '\u9ed8\u8ba4\u5b9e\u9a8c\u5ba4';
        state.env.locationLabel = '';
        state.env.lastUpdated = '--';
        state.env.lastError = userInitiated
          ? '\u672a\u80fd\u8bfb\u53d6\u5f53\u5730\u6e29\u6e7f\u5ea6\uff0c\u5df2\u4f7f\u7528\u9ed8\u8ba4\u5b9e\u9a8c\u5ba4\u6761\u4ef6'
          : '\u81ea\u52a8\u8bfb\u53d6\u5931\u8d25\uff0c\u5df2\u4f7f\u7528\u9ed8\u8ba4\u5b9e\u9a8c\u5ba4\u6761\u4ef6';
      }
    } finally {
      state.env.fetching = false;
      updateEnvStatus();
      renderStats();
    }
  }

  function onMainParamChanged() { if (eng.ok) applyGap(); renderStats(); }
  function onProbeHeightChanged() { if (eng.ok) applyProbeHeight(); renderStats(); }
  function onProbePowerChanged() { renderStats(); }

  async function loadThree() {
    try {
      const threeMod = await import('./vendor/three/three.module.js');
      const controlsMod = await import('./vendor/three/addons/controls/OrbitControls.js');
      const loaderMod = await import('./vendor/three/addons/loaders/GLTFLoader.js');
      eng.T = {
        ...threeMod,
        OrbitControls: controlsMod.OrbitControls,
        GLTFLoader: loaderMod.GLTFLoader,
      };
      eng.ok = true;
      return true;
    } catch (moduleError) {
      console.warn('Local vendor three modules unavailable, fallback to CDN.', moduleError);
    }

    const packs = [
      {
        t: 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.min.js',
        o: 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/js/controls/OrbitControls.js',
        g: 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/js/loaders/GLTFLoader.js',
      },
      {
        t: 'https://unpkg.com/three@0.161.0/build/three.min.js',
        o: 'https://unpkg.com/three@0.161.0/examples/js/controls/OrbitControls.js',
        g: 'https://unpkg.com/three@0.161.0/examples/js/loaders/GLTFLoader.js',
      },
      {
        t: 'https://cdn.bootcdn.net/ajax/libs/three.js/r161/three.min.js',
        o: 'https://cdn.bootcdn.net/ajax/libs/three.js/r161/examples/js/controls/OrbitControls.js',
        g: 'https://cdn.bootcdn.net/ajax/libs/three.js/r161/examples/js/loaders/GLTFLoader.js',
      },
    ];

    for (const p of packs) {
      try {
        await loadScript(p.t);
        await loadScript(p.o);
        await loadScript(p.g);
        if (window.THREE && window.THREE.OrbitControls && window.THREE.GLTFLoader) {
          eng.ok = true;
          eng.T = window.THREE;
          return true;
        }
      } catch (_) {
      }
    }
    return false;
  }

  function loadScript(src) {
    return new Promise((res, rej) => {
      if (Array.from(document.scripts).some((s) => s.src === src)) { res(); return; }
      const s = document.createElement('script');
      s.src = src; s.defer = true;
      s.onload = () => res();
      s.onerror = () => rej(new Error(`load fail ${src}`));
      document.head.appendChild(s);
    });
  }

  function initThree() {
    const T = eng.T;
    eng.scene = new T.Scene();
    eng.scene.background = new T.Color(0x315784);
    eng.scene.fog = new T.FogExp2(0x315784, 0.0062);
    eng.camera = new T.PerspectiveCamera(45, 1, 0.02, 300);
    eng.camera.position.set(0, 5.5, 13.5);

    eng.renderer = new T.WebGLRenderer({ canvas: refs.canvas, antialias: true, alpha: true });
    eng.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    eng.renderer.toneMapping = T.ACESFilmicToneMapping;
    eng.renderer.toneMappingExposure = 1.35;
    resizeRenderer();

    eng.controls = new T.OrbitControls(eng.camera, refs.canvas);
    eng.controls.enableDamping = true;
    eng.controls.enableZoom = true;
    eng.controls.zoomSpeed = 1.45;
    eng.controls.target.set(0, 2.2, 0);
    eng.controls.minDistance = 0.45;
    eng.controls.maxDistance = 40;
    eng.controls.maxPolarAngle = Math.PI * 0.495;
    const ambient = new T.AmbientLight(0xe8eef8, 0.72);
    eng.scene.add(ambient);
    const hemi = new T.HemisphereLight(0xe9f1fb, 0x7b8ca8, 0.48); eng.scene.add(hemi);
    const key = new T.DirectionalLight(0xf2f6ff, 1.45); key.position.set(9, 13, 8); eng.scene.add(key);
    const rim = new T.PointLight(0x8daee8, 1.36, 160); rim.position.set(-8, 8, -8); eng.scene.add(rim);
    eng.lights = { ambient, hemi, key, rim };
    if (T.PMREMGenerator) {
      const pmrem = new T.PMREMGenerator(eng.renderer);
      const envScene = new T.Scene();
      envScene.background = new T.Color(0x8fa6b5);
      envScene.add(new T.HemisphereLight(0xffffff, 0x607080, 2.5));
      const envKey = new T.DirectionalLight(0xffffff, 3.2);
      envKey.position.set(3, 5, 4);
      envScene.add(envKey);
      const env = pmrem.fromScene(envScene, 0.04).texture;
      eng.environmentMap = env;
      eng.scene.environment = env;
      pmrem.dispose();
    }

    const floor = new T.Mesh(
      new T.CylinderGeometry(13, 13, 0.8, 80),
      new T.MeshStandardMaterial({ color: 0xc3ccd7, metalness: 0.06, roughness: 0.9 })
    );
    floor.name = 'fallback_scene_floor';
    floor.position.y = -0.6;
    floor.visible = false;
    eng.scene.add(floor);
    buildLabBackdrop();

    eng.root = new T.Group();
    eng.machine = new T.Group();
    eng.electrodes = new T.Group();
    eng.electrodeVisuals = new T.Group();
    eng.plasma = new T.Group();
    eng.hotspots = new T.Group();
    eng.root.add(eng.machine, eng.electrodes, eng.electrodeVisuals, eng.plasma, eng.hotspots);
    eng.scene.add(eng.root);

    eng.ray = new T.Raycaster();
    eng.mouse = new T.Vector2();
    eng.loader = new T.GLTFLoader();

    buildFallbackRig();
    createVisuals();
    setupPicking();
    loadModels();
    applyGap();
    applyProbeHeight();

    window.addEventListener('resize', resizeRenderer);
    animate();
  }

  function buildLabBackdrop() {
    const T = eng.T;
    if (!T || !eng.scene) return;

    const existing = eng.scene.getObjectByName('lab_backdrop');
    if (existing) existing.removeFromParent();

    eng.scene.background = new T.Color(0xe8ecef);
    eng.scene.fog = new T.FogExp2(0xe8ecef, 0.0048);

    const group = new T.Group();
    group.name = 'lab_backdrop';
    group.rotation.y = Math.PI;
    group.renderOrder = -10;

    const wallMat = new T.MeshStandardMaterial({ color: 0xe6e8e8, metalness: 0.02, roughness: 0.82 });
    const wall = new T.Mesh(new T.PlaneGeometry(34, 18), wallMat);
    wall.name = 'lab_backdrop_wall';
    wall.position.set(0, 5.0, -8.2);
    wall.receiveShadow = false;
    group.add(wall);

    const benchTopMat = new T.MeshStandardMaterial({ color: 0xcfd3d5, metalness: 0.08, roughness: 0.42 });
    const benchTrimMat = new T.MeshStandardMaterial({ color: 0xe4e7e6, metalness: 0.08, roughness: 0.36 });
    const cabinetMat = new T.MeshStandardMaterial({ color: 0x405d83, metalness: 0.06, roughness: 0.58 });
    const handleMat = new T.MeshStandardMaterial({ color: 0xd8dedf, metalness: 0.38, roughness: 0.28 });
    const shadowMat = new T.MeshBasicMaterial({ color: 0x6f7a82, transparent: true, opacity: 0.16 });

    const bench = new T.Group();
    bench.name = 'lab_backdrop_bench';
    bench.position.set(0, -0.2, 1.1);
    group.add(bench);

    const top = new T.Mesh(new T.BoxGeometry(17.8, 0.22, 5.8), benchTopMat);
    top.name = 'lab_bench_gray_top';
    top.position.set(0, 0.62, 0);
    bench.add(top);

    const frontLip = new T.Mesh(new T.BoxGeometry(18.0, 0.18, 0.18), benchTrimMat);
    frontLip.name = 'lab_bench_front_lip';
    frontLip.position.set(0, 0.45, 2.98);
    bench.add(frontLip);

    const leftSide = new T.Mesh(new T.BoxGeometry(0.38, 1.75, 0.28), benchTrimMat);
    leftSide.name = 'lab_bench_left_side';
    leftSide.position.set(-7.7, -0.42, 2.7);
    bench.add(leftSide);

    const midPost = new T.Mesh(new T.BoxGeometry(0.34, 1.75, 0.28), benchTrimMat);
    midPost.name = 'lab_bench_center_post';
    midPost.position.set(-1.25, -0.42, 2.7);
    bench.add(midPost);

    const rightSide = new T.Mesh(new T.BoxGeometry(0.38, 1.75, 0.28), benchTrimMat);
    rightSide.name = 'lab_bench_right_side';
    rightSide.position.set(7.7, -0.42, 2.7);
    bench.add(rightSide);

    const addPanel = (name, x, y, w, h) => {
      const panel = new T.Mesh(new T.BoxGeometry(w, h, 0.14), cabinetMat);
      panel.name = name;
      panel.position.set(x, y, 2.82);
      bench.add(panel);
      return panel;
    };
    const addHandle = (name, x, y, h = 0.58) => {
      const handle = new T.Mesh(new T.BoxGeometry(0.08, h, 0.08), handleMat);
      handle.name = name;
      handle.position.set(x, y, 2.93);
      bench.add(handle);
      return handle;
    };

    addPanel('lab_bench_drawer_top', -5.2, 0.05, 3.5, 0.46);
    addPanel('lab_bench_drawer_mid', -5.2, -0.55, 3.5, 0.46);
    addPanel('lab_bench_drawer_bottom', -5.2, -1.15, 3.5, 0.46);
    addPanel('lab_bench_left_door', 1.9, -0.62, 4.55, 1.62);
    addPanel('lab_bench_right_door', 5.65, -0.62, 3.35, 1.62);

    [-5.2, -5.2, -5.2].forEach((x, i) => addHandle(`lab_bench_drawer_handle_${i + 1}`, x, 0.25 - i * 0.6, 0.04).scale.set(22, 1, 1));
    addHandle('lab_bench_left_door_handle', 3.95, -0.62, 1.2);
    addHandle('lab_bench_right_door_handle', 4.55, -0.62, 1.2);

    const softShadow = new T.Mesh(new T.PlaneGeometry(12, 3.6), shadowMat);
    softShadow.name = 'lab_bench_soft_table_shadow';
    softShadow.rotation.x = -Math.PI / 2;
    softShadow.position.set(0, 0.75, 0.0);
    bench.add(softShadow);

    const wallGlowMat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, depthWrite: false });
    const wallGlow = new T.Mesh(new T.PlaneGeometry(3.8, 7.5), wallGlowMat);
    wallGlow.name = 'lab_wall_left_light_patch';
    wallGlow.position.set(-13.2, 3.0, -8.15);
    group.add(wallGlow);

    eng.scene.add(group);
  }

  function buildFallbackRig() {
    const T = eng.T;
    const metal = new T.MeshStandardMaterial({ color: 0x8a9fc6, metalness: 0.9, roughness: 0.22 });
    const glass = new T.MeshPhysicalMaterial({ color: 0x72c3ff, transparent: true, opacity: 0.2, transmission: 0.85, roughness: 0.08, thickness: 1.6 });
    eng.machine.clear();

    const base = new T.Mesh(new T.BoxGeometry(10, 0.8, 6), metal);
    base.position.set(0, 0, 0);
    eng.machine.add(base);

    const vacuum = new T.Mesh(new T.CylinderGeometry(2.6, 2.6, 6.6, 48), glass);
    vacuum.position.set(0, 3.2, 0);
    vacuum.name = 'vacuum_cylinder';
    eng.machine.add(vacuum);

    const motor = new T.Mesh(new T.BoxGeometry(2.4, 1.1, 2), metal);
    motor.position.set(-4.1, 1, 0);
    motor.name = 'motor_box';
    eng.machine.add(motor);

    const mainPower = new T.Mesh(new T.BoxGeometry(2.4, 1.3, 2), metal);
    mainPower.position.set(4.1, 1.1, 0);
    mainPower.name = 'main_power';
    eng.machine.add(mainPower);

    const probePower = new T.Mesh(new T.BoxGeometry(2.1, 1.2, 1.6), metal);
    probePower.position.set(0, 1.0, -3.3);
    probePower.name = 'probe_power';
    eng.machine.add(probePower);

    const probe = new T.Mesh(new T.CylinderGeometry(0.08, 0.08, 4.8, 14), metal);
    probe.position.set(0, 5.8, 0);
    probe.name = 'probe_rod';
    eng.machine.add(probe);

    eng.anchor.motor = motor;
    eng.anchor.mainPower = mainPower;
    eng.anchor.vacuum = vacuum;
    eng.anchor.probePower = probePower;
    eng.anchor.probe = probe;
    eng.probeMotionRig = null;
    eng.useModelElectrodes = false;
    eng.gapRig = null;

    rebuildElectrodes();
      rebuildHotspots(eng.machine);
      rebuildControlKnobs();
  }

  function rebuildElectrodes() {
    if (eng.useModelElectrodes) {
      refreshElectrodeVisuals();
      return;
    }

    const T = eng.T;
    if (!eng.electrodes) return;
    const mat = new T.MeshStandardMaterial({ color: 0x8a9fc6, metalness: 0.9, roughness: 0.22 });
    eng.electrodes.clear();
    let left, right;

    if (state.electrodeType === 'parallel') {
      left = new T.Mesh(new T.BoxGeometry(0.4, 4.2, 2.8), mat);
      right = left.clone();
      left.position.set(-1.6, 3.3, 0);
      right.position.set(1.6, 3.3, 0);
    } else if (state.electrodeType === 'sphere') {
      left = new T.Mesh(new T.SphereGeometry(1.2, 34, 28), mat);
      right = left.clone();
      left.position.set(-2.0, 3.2, 0);
      right.position.set(2.0, 3.2, 0);
    } else {
      left = new T.Mesh(new T.CylinderGeometry(1.12, 1.12, 0.18, 28), mat);
      right = left.clone();
      left.rotation.z = Math.PI / 2;
      right.rotation.z = Math.PI / 2;
      left.position.set(-1.7, 3.2, 0);
      right.position.set(1.7, 3.2, 0);
    }

    left.name = 'left_electrode';
    right.name = 'right_electrode';
    eng.electrodes.add(left, right);
    if (eng.hideFallbackElectrodeBlocks) {
      left.visible = false;
      right.visible = false;
    }
    eng.anchor.left = left;
    eng.anchor.right = right;

    const baseDist = left.position.distanceTo(right.position);
    eng.gapRig = {
      center: left.position.clone().add(right.position).multiplyScalar(0.5),
      axis: right.position.clone().sub(left.position).normalize(),
      defaultDistance: baseDist,
      scale: baseDist / Math.max(modelGapMm(state.gapMm), 1e-6),
    };

    applyGap();
    refreshElectrodeVisuals();
  }

  async function loadModels() {
    // Prefer the latest tuned project-root export first, then fall back to earlier files.
    const overallCandidates = ['./\u6574\u4f53\u51b7_\u7ea2\u7ebf\u5bf9\u9f50.glb', './改5_长方体DC电源平面贴图版_20260512(2).glb', './assets/models/改5_长方体DC电源平面贴图版_20260512(2).glb', './改版建模.glb', './assets/models/改版建模.glb', './\u6574\u4f53111_\u6e32\u67d3\u8d34\u56fe.glb', './\u6574\u4f53111_\u5b8c\u6574.glb', './\u6574\u4f53111.glb', './\u6574\u4f53\u51b7_\u5de6\u4e0a\u56fa\u5b9a\u7f29\u5c0f80.glb', './\u6574\u4f53\u51b7_\u5de6\u79fb\u53cd\u5411\u4fee\u6b63\u7248.glb', './\u6574\u4f53\u51b7.glb', './assets/models/\u6574\u4f53\u51b7.glb', './assets/\u6574\u4f53\u51b7.glb'];

    const overall = await loadFirst(overallCandidates);
    if (overall) {
      eng.machine.clear();
      eng.machine.add(overall.scene);
      normalize(overall.scene, 11.5 * OVERALL_MODEL_SCALE_MULTIPLIER);
      const overallPath = overall.userData?.sourcePath || '';
      const authoredOverall = /111|完整/i.test(overallPath);
      const renderedTextureExport = /渲染贴图/i.test(overallPath);
      const rawModelRender = false;
      const preserveModelMaterials = /改版建模|改5_/i.test(overallPath);
      eng.rawModelRender = rawModelRender;
      applyModelRenderLighting(rawModelRender);
      const fallbackFloor = eng.scene?.getObjectByName('fallback_scene_floor');
      if (fallbackFloor) fallbackFloor.visible = false;
      if (rawModelRender) {
        eng.hideFallbackElectrodeBlocks = true;
        preserveRawOverallModel(overall.scene);
        restoreRawTableAndVacuum(overall.scene);
        restoreRawLeftResistor(overall.scene);
      } else if (authoredOverall && !renderedTextureExport) {
        eng.hideFallbackElectrodeBlocks = false;
        fixAuthoredOverallMaterials(overall.scene);
      } else if (preserveModelMaterials) {
        eng.hideFallbackElectrodeBlocks = true;
        preserveOverallModelMaterials(overall.scene);
        suppressCenterOccluder(overall.scene);
      } else {
        eng.hideFallbackElectrodeBlocks = false;
        tuneDeviceMaterials(overall.scene);
        suppressCenterOccluder(overall.scene);
      }

      resolveOverallAnchors(overall.scene);
      hideMainPowerPhysicalButtons(overall.scene);
      resizeCurrentVacuumCylinder(overall.scene);
      applyCurrentVacuumWallMaterials(overall.scene);
      applyVacuumInteriorReferenceColors(overall.scene);
      removeCircledInteriorFloaters(overall.scene);
      boxifyElectrodeControlBody(overall.scene);
      boxifyProbeControlBody(overall.scene);
      applyRightDeviceVisuals(overall.scene);
      applyRequestedElectrodeColors(overall.scene);
      placeRequestedTopDevicesOnTable(overall.scene);
      resizeFixedProbeBaseRail(overall.scene);
      if (rawModelRender) {
        restoreRawVacuumWhiteModel(overall.scene);
        restoreRawLeftResistor(overall.scene);
        applyRawInstrumentColors(overall.scene);
        enhanceRawFrontTextures(overall.scene);
        addRawMainPowerDetails(overall.scene);
      }
      if (preserveModelMaterials && !rawModelRender) polishVacuumAssemblyMaterials(overall.scene);
      if (!/整体冷_红线对齐/i.test(overallPath)) replaceVacuumChamberSkin(overall.scene);
      if (!eng.useModelElectrodes) rebuildElectrodes();
      applyVacuumValveStainlessMaterials(overall.scene);

      rebuildHotspots(overall.scene);
      rebuildControlKnobs();
      fitCamera(overall.scene, 1.12);
    } else {
      eng.hideFallbackElectrodeBlocks = false;
      eng.rawModelRender = false;
      applyModelRenderLighting(false);
      const fallbackFloor = eng.scene?.getObjectByName('fallback_scene_floor');
      if (fallbackFloor) fallbackFloor.visible = false;
      eng.useModelElectrodes = false;
      rebuildElectrodes();
      rebuildHotspots(eng.machine);
      rebuildControlKnobs();
    }

    await loadElectrodeLibrary();
    applyGap();
    applyProbeHeight();
    refreshElectrodeVisuals();
  }
  function loadFirst(paths) {
    return new Promise((resolve) => {
      const tryI = (i) => {
        if (i >= paths.length) {
          resolve(null);
          return;
        }
        eng.loader.load(paths[i], (gltf) => {
          gltf.userData = { ...(gltf.userData || {}), sourcePath: paths[i] };
          resolve(gltf);
        }, undefined, () => tryI(i + 1));
      };
      tryI(0);
    });
  }

  async function loadElectrodeLibrary() {
    if (!eng.ok || eng.electrodeLibrary) return;
    const sphereCandidates = [
      './球球电极.glb',
      './assets/models/sphere_pair.glb',
      './assets/models/球球电极.glb',
      './assets/models/electrode_round.glb',
    ];

    const sphereAsset = await loadFirst(sphereCandidates);

    const library = {};

    if (sphereAsset?.scene) {
      sphereAsset.scene.updateMatrixWorld(true);
      let spherePair = buildElectrodePairTemplatesFromScene(sphereAsset.scene);
      if (!spherePair?.left || !spherePair?.right) spherePair = pickSpherePair(sphereAsset.scene);
      if (spherePair?.left && spherePair?.right) {
        library.sphere = {
          left: spherePair.left.holder ? spherePair.left : prepareElectrodeTemplate(spherePair.left),
          right: spherePair.right.holder ? spherePair.right : prepareElectrodeTemplate(spherePair.right),
        };
      }
    }

    eng.electrodeLibrary = Object.keys(library).length ? library : null;
  }

  function buildElectrodePairTemplatesFromScene(scene) {
    const T = eng.T;
    const meshes = [];
    scene.traverse((obj) => {
      if (!obj?.isMesh) return;
      const box = new T.Box3().setFromObject(obj);
      if (box.isEmpty()) return;
      const center = box.getCenter(new T.Vector3());
      const size = box.getSize(new T.Vector3());
      if (Math.max(size.x, size.y, size.z) <= 1e-5) return;
      meshes.push({ obj, center, size });
    });
    if (meshes.length < 2) return null;

    const sceneBox = new T.Box3().setFromObject(scene);
    const sceneSize = sceneBox.getSize(new T.Vector3());
    const splitAxis = sceneSize.x >= sceneSize.z ? 'x' : 'z';
    const splitValue = sceneBox.getCenter(new T.Vector3())[splitAxis];
    const leftGroup = new T.Group();
    const rightGroup = new T.Group();
    leftGroup.name = 'sphere_electrode_left_full';
    rightGroup.name = 'sphere_electrode_right_full';

    let leftCount = 0;
    let rightCount = 0;
    meshes.forEach(({ obj, center }) => {
      const clone = obj.clone(true);
      clone.applyMatrix4(obj.matrixWorld);
      if (center[splitAxis] <= splitValue) {
        leftGroup.add(clone);
        leftCount += 1;
      } else {
        rightGroup.add(clone);
        rightCount += 1;
      }
    });

    if (!leftCount || !rightCount) return null;
    const leftTemplate = prepareElectrodeTemplate(leftGroup);
    const rightTemplate = prepareElectrodeTemplate(rightGroup);
    leftTemplate.fullAssembly = true;
    rightTemplate.fullAssembly = true;
    return { left: leftTemplate, right: rightTemplate };
  }

  function createFallbackSphereTemplate() {
    const T = eng.T;
    const holder = new T.Group();
    const radius = 0.5;
    const sphere = new T.Mesh(
      new T.SphereGeometry(radius, 36, 28),
      new T.MeshStandardMaterial({
        color: 0xb87333,
        metalness: 0.9,
        roughness: 0.16,
        emissive: new T.Color(0x020206),
        emissiveIntensity: 0.02,
      })
    );

    holder.add(sphere);
    holder.updateMatrixWorld(true);
    tuneElectrodeHeadMaterials(holder);
    return { holder, size: new T.Vector3(radius * 2, radius * 2, radius * 2) };
  }

  function prepareElectrodeTemplate(source) {
    const T = eng.T;
    const clone = source.clone(true);
    clone.traverse?.((obj) => {
      if (!obj.isMesh) return;
      obj.material = Array.isArray(obj.material)
        ? obj.material.map((material) => material?.clone ? material.clone() : material)
        : (obj.material?.clone ? obj.material.clone() : obj.material);
    });

    const holder = new T.Group();
    holder.add(clone);
    holder.updateMatrixWorld(true);

    const box = new T.Box3().setFromObject(holder);
    const center = box.getCenter(new T.Vector3());
    clone.position.sub(center);
    holder.updateMatrixWorld(true);

    const normalizedBox = new T.Box3().setFromObject(holder);
    const size = normalizedBox.getSize(new T.Vector3());
    tuneElectrodeHeadMaterials(holder);
    return { holder, size };
  }

  function tuneElectrodeHeadMaterials(root) {
    const metalTone = new eng.T.Color(0xb87333);
    root.traverse?.((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((material) => {
        if (!material) return;
        if (material.color) material.color.copy(metalTone);
        if ('metalness' in material) material.metalness = 0.9;
        if ('roughness' in material) material.roughness = 0.16;
        if ('transparent' in material) material.transparent = false;
        if ('opacity' in material) material.opacity = 1;
        if (material.emissive) {
          material.emissive.setRGB(0.01, 0.006, 0.002);
          material.emissiveIntensity = 0.02;
        }
      });
    });
  }

    function normalize(obj, target) {
    const T = eng.T;
    const box = new T.Box3().setFromObject(obj);
    const size = box.getSize(new T.Vector3());
    const max = Math.max(size.x, size.y, size.z);
    if (max <= 0) return;
    obj.scale.multiplyScalar(target / max);
    const box2 = new T.Box3().setFromObject(obj);
    const c = box2.getCenter(new T.Vector3());
    obj.position.sub(c);
    obj.position.y += box2.getSize(new T.Vector3()).y / 2;
  }

  function fixAuthoredOverallMaterials(root) {
    const T = eng.T;
    const rootBox = new T.Box3().setFromObject(root);
    const rootSize = rootBox.getSize(new T.Vector3());
    const tableTone = new T.Color(0xc1c8cf);
    const defaultPartTone = new T.Color(0xb8c1cc);
    const chamberTone = new T.Color(0xb9b8ad);
    const chamberRimTone = new T.Color(0xaeb4b7);

    const matsFor = (obj) => Array.isArray(obj.material) ? obj.material : [obj.material];
    const isVeryDark = (mat) => mat?.color && (mat.color.r + mat.color.g + mat.color.b) < 0.22;
    const isDefaultLike = (mat) => !mat || /^default/i.test(mat.name || '');
    const hasDefaultOrDarkMaterial = (obj) => matsFor(obj).some((mat) => isDefaultLike(mat) || isVeryDark(mat));
    const patchMaterial = (mat, color, options = {}) => {
      const source = mat?.clone ? mat.clone() : new T.MeshStandardMaterial();
      const m = source;
      if ('map' in m && options.dropMaps) m.map = null;
      if ('normalMap' in m && options.dropMaps) m.normalMap = null;
      if ('roughnessMap' in m && options.dropMaps) m.roughnessMap = null;
      if ('metalnessMap' in m && options.dropMaps) m.metalnessMap = null;
      if ('color' in m && m.color) m.color.copy(color);
      if ('metalness' in m) m.metalness = options.metalness ?? 0.08;
      if ('roughness' in m) m.roughness = options.roughness ?? 0.78;
      if ('transparent' in m) m.transparent = false;
      if ('opacity' in m) m.opacity = 1;
      if ('depthWrite' in m) m.depthWrite = true;
      if ('side' in m) m.side = T.DoubleSide;
      if ('envMapIntensity' in m) m.envMapIntensity = 0.35;
      if ('emissive' in m && m.emissive) {
        if (options.emissiveLift) {
          m.emissive.copy(color).multiplyScalar(options.emissiveLift);
          m.emissiveIntensity = 1;
        } else {
          m.emissive.setRGB(0.015, 0.018, 0.02);
          m.emissiveIntensity = 0.04;
        }
      }
      m.needsUpdate = true;
      return m;
    };

    root.traverse((obj) => {
      if (!obj.isMesh) return;

      const box = new T.Box3().setFromObject(obj);
      if (box.isEmpty()) return;
      const size = box.getSize(new T.Vector3());
      const dims = [size.x, size.y, size.z].sort((a, b) => a - b);
      const roundLarge =
        Math.max(size.x, size.z) > Math.max(rootSize.x, rootSize.z) * 0.12 &&
        Math.abs(size.x - size.z) < Math.max(size.x, size.z) * 0.22;
      const namedTable = nameHasAny(obj, ['\u5e73\u9762', 'table', 'desk', 'floor']);
      const broadNoMaterialPlate =
        dims[2] > Math.max(rootSize.x, rootSize.z) * 0.38 &&
        dims[1] > Math.max(rootSize.x, rootSize.z) * 0.18 &&
        hasDefaultOrDarkMaterial(obj);
      const chamberPart =
        nameHasAny(obj, ['\u6c14\u4f53\u653e\u7535\u4e0e\u7b49\u79bb\u5b50\u5b9e\u9a8c\u4eea', 'vacuum', 'chamber']) &&
        roundLarge;

      if (namedTable || broadNoMaterialPlate) {
        obj.material = Array.isArray(obj.material)
          ? obj.material.map((mat) => patchMaterial(mat, tableTone, { metalness: 0.04, roughness: 0.86, dropMaps: true }))
          : patchMaterial(obj.material, tableTone, { metalness: 0.04, roughness: 0.86, dropMaps: true });
        return;
      }

      if (chamberPart) {
        const rimLike = size.y < rootSize.y * 0.06 || matsFor(obj).some(isVeryDark);
        obj.material = Array.isArray(obj.material)
          ? obj.material.map((mat) => patchMaterial(mat, rimLike ? chamberRimTone : chamberTone, {
            metalness: 0.02,
            roughness: rimLike ? 0.86 : 0.9,
            dropMaps: true,
            emissiveLift: rimLike ? 0.12 : 0.16,
          }))
          : patchMaterial(obj.material, rimLike ? chamberRimTone : chamberTone, {
            metalness: 0.02,
            roughness: rimLike ? 0.86 : 0.9,
            dropMaps: true,
            emissiveLift: rimLike ? 0.12 : 0.16,
          });
        return;
      }

      if (matsFor(obj).some(isDefaultLike)) {
        obj.material = Array.isArray(obj.material)
          ? obj.material.map((mat) => patchMaterial(mat, defaultPartTone, { metalness: 0.08, roughness: 0.74, dropMaps: true }))
          : patchMaterial(obj.material, defaultPartTone, { metalness: 0.08, roughness: 0.74, dropMaps: true });
      }
    });
  }

  function preserveOverallModelMaterials(root) {
    const T = eng.T;
    const rootBox = new T.Box3().setFromObject(root);
    const rootSize = rootBox.getSize(new T.Vector3());
    root.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const objName = normNodeName(`${obj.name || ''} ${obj.geometry?.name || ''}`);
      const isBlankReferencePanel =
        objName.includes('参考图正面贴图') ||
        objName.includes('dc5visiblesidepanel');
      if (isBlankReferencePanel) {
        obj.visible = false;
        return;
      }
      const box = new T.Box3().setFromObject(obj);
      const size = box.isEmpty() ? new T.Vector3() : box.getSize(new T.Vector3());
      const center = box.isEmpty() ? new T.Vector3() : box.getCenter(new T.Vector3());
      const isChamberPart =
        (objName.includes('气体放电与等离子实验仪') || objName.includes('stp')) &&
        Math.max(size.x, size.y, size.z) > 0.035;
      const isTopChamberClamp =
        isChamberPart &&
        center.y > rootBox.min.y + rootSize.y * 0.62 &&
        size.y < rootSize.y * 0.16 &&
        Math.max(size.x, size.z) > Math.max(rootSize.x, rootSize.z) * 0.08;

      const patch = (mat) => {
        if (!mat?.clone) return mat;
        const m = mat.clone();
        const matName = normNodeName(m.name || '');
        const colorSum = m.color ? (m.color.r + m.color.g + m.color.b) : 3;

        if ('transparent' in m) m.transparent = false;
        if ('opacity' in m) m.opacity = 1;
        if ('alphaTest' in m) m.alphaTest = 0;
        if ('depthWrite' in m) m.depthWrite = true;
        if ('depthTest' in m) m.depthTest = true;
        if ('side' in m) m.side = T.DoubleSide;
        if (matName.includes('箱体蓝')) {
          if ('color' in m && m.color) m.color.set(0x1f72e8);
          if ('metalness' in m) m.metalness = 0.08;
          if ('roughness' in m) m.roughness = 0.48;
        } else if (matName.includes('前面板浅灰')) {
          if ('color' in m && m.color) m.color.set(0xf1f3ec);
          if ('metalness' in m) m.metalness = 0.04;
          if ('roughness' in m) m.roughness = 0.56;
        } else if (matName.includes('屏幕蓝')) {
          if ('color' in m && m.color) m.color.set(0x153a80);
          if ('metalness' in m) m.metalness = 0.02;
          if ('roughness' in m) m.roughness = 0.35;
          if ('emissive' in m && m.emissive) {
            m.emissive.set(0x09265e);
            m.emissiveIntensity = 0.35;
          }
        } else if (matName.includes('按键浅白')) {
          if ('color' in m && m.color) m.color.set(0xf4f6f1);
          if ('metalness' in m) m.metalness = 0.02;
          if ('roughness' in m) m.roughness = 0.42;
        } else if (matName.includes('金属') || matName.includes('铜电极') || matName.includes('metal')) {
          if ('metalness' in m) m.metalness = Math.max(m.metalness ?? 0, 0.78);
          if ('roughness' in m) m.roughness = Math.min(m.roughness ?? 0.3, 0.22);
          if ('envMapIntensity' in m) m.envMapIntensity = 1.25;
        } else if (isChamberPart && (colorSum < 0.75 || matName.includes('材质'))) {
          if ('color' in m && m.color) m.color.set(0xc8d2d5);
          if ('metalness' in m) m.metalness = 0.68;
          if ('roughness' in m) m.roughness = 0.2;
          if ('envMapIntensity' in m) m.envMapIntensity = 1.4;
        } else if (isChamberPart) {
          if ('metalness' in m) m.metalness = Math.max(m.metalness ?? 0, 0.58);
          if ('roughness' in m) m.roughness = Math.min(m.roughness ?? 0.45, 0.26);
          if ('envMapIntensity' in m) m.envMapIntensity = 1.28;
        } else {
          if ('toneMapped' in m && m.map) m.toneMapped = false;
          if ('metalness' in m) m.metalness = clamp(m.metalness ?? 0.12, 0, 0.7);
          if ('roughness' in m) m.roughness = clamp(m.roughness ?? 0.72, 0.22, 0.95);
        }
        if ('envMapIntensity' in m) m.envMapIntensity = Math.max(m.envMapIntensity || 0, 0.45);
        if ('emissive' in m && m.emissive && !matName.includes('屏幕蓝')) {
          m.emissive.setRGB(0, 0, 0);
          m.emissiveIntensity = 0;
        }

        m.needsUpdate = true;
        return m;
      };

      obj.material = Array.isArray(obj.material)
        ? obj.material.map(patch)
        : patch(obj.material);
      obj.visible = true;
      obj.renderOrder = 0;
    });
  }

  function preserveRawOverallModel(root) {
    const T = eng.T;
    root.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const patch = (mat) => {
        if (!mat?.clone) return mat;
        const m = mat.clone();
        const emissiveBrightness = m.emissive ? Math.max(m.emissive.r, m.emissive.g, m.emissive.b) : 0;
        const baseIsBlack = m.color ? Math.max(m.color.r, m.color.g, m.color.b) < 0.02 : false;
        if (m.emissiveMap && !m.map) {
          m.map = m.emissiveMap;
          m.emissiveMap = null;
          if (m.color) m.color.setRGB(1, 1, 1);
          if (m.emissive) m.emissive.setRGB(0, 0, 0);
          if ('emissiveIntensity' in m) m.emissiveIntensity = 0;
        } else if (emissiveBrightness > 0 && baseIsBlack) {
          if (m.color && m.emissive) m.color.copy(m.emissive);
          if (m.emissive) m.emissive.setRGB(0, 0, 0);
          if ('emissiveIntensity' in m) m.emissiveIntensity = 0;
        } else if (emissiveBrightness > 0 && 'emissiveIntensity' in m) {
          m.emissiveIntensity = 0.15;
        }
        if ('transparent' in m && (m.opacity ?? 1) >= 0.999) m.transparent = false;
        if ('depthWrite' in m) m.depthWrite = true;
        if ('depthTest' in m) m.depthTest = true;
        if ('side' in m) m.side = T.DoubleSide;
        if ('envMapIntensity' in m) m.envMapIntensity = Math.min(m.envMapIntensity || 0.25, 0.35);
        m.needsUpdate = true;
        return m;
      };
      obj.material = Array.isArray(obj.material) ? obj.material.map(patch) : patch(obj.material);
      obj.visible = true;
      obj.renderOrder = 0;
    });
  }

  function restoreRawLeftResistor(root) {
    const T = eng.T;
    const black = new T.MeshBasicMaterial({
      color: 0x050505,
    });

    root.traverse((obj) => {
      if (!obj.isMesh || !obj.geometry || !obj.material) return;
      const box = new T.Box3().setFromObject(obj);
      const size = box.getSize(new T.Vector3());
      const center = box.getCenter(new T.Vector3());
      const materialName = Array.isArray(obj.material)
        ? obj.material.map((m) => m?.name || '').join(' ')
        : (obj.material?.name || '');
      const nodeName = `${obj.name || ''} ${materialName}`.toLowerCase();
      const explicitlyResistor = nodeName.includes('resistor') || nodeName.includes('电阻') || nodeName.includes('立方体.032');
      if (!explicitlyResistor) return;
      obj.material = black.clone();
      obj.castShadow = true;
      obj.receiveShadow = true;
    });
  }

  function restoreRawTableAndVacuum(root) {
    const T = eng.T;
    const tableMat = new T.MeshBasicMaterial({ color: 0x39b986 });
    root.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      const materialName = mats.map((m) => m?.name || '').join(' ');
      if (obj.name === '平面' || materialName === '材质') {
        obj.material = tableMat.clone();
      }
    });
  }

  function restoreRawVacuumWhiteModel(root) {
    const T = eng.T;
    const vacuumWhite = new T.MeshStandardMaterial({
      color: 0xf4f4ef,
      metalness: 0.02,
      roughness: 0.52,
      transparent: false,
      opacity: 1,
      side: T.DoubleSide,
    });
    const chamberBox = eng.anchor?.vacuum
      ? new T.Box3().setFromObject(eng.anchor.vacuum).expandByScalar(0.28)
      : null;

    root.updateMatrixWorld(true);
    root.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      const materialName = mats.map((m) => m?.name || '').join(' ');
      const nodeName = `${obj.name || ''} ${materialName}`.toLowerCase();
      if (obj.name === '平面' || materialName === '材质') return;
      if (nodeName.includes('resistor') || nodeName.includes('电阻') || nodeName.includes('立方体.032')) return;
      if (materialName.includes('参考图') || materialName.includes('DC5') || materialName.includes('按钮')) return;
      const box = new T.Box3().setFromObject(obj);
      const center = box.getCenter(new T.Vector3());
      const inChamber = chamberBox ? chamberBox.containsPoint(center) || chamberBox.intersectsBox(box) : false;
      const darkMaterial = mats.some((m) => m?.color && Math.max(m.color.r, m.color.g, m.color.b) < 0.12);
      const namedVacuum =
        nodeName.includes('真空') ||
        nodeName.includes('vacuum') ||
        nodeName.includes('chamber') ||
        nodeName.includes('材质.015') ||
        nodeName.includes('材质.042') ||
        nodeName.includes('材质.043') ||
        nodeName.includes('材质.038') ||
        nodeName.includes('材质.039') ||
        nodeName.includes('材质.040');
      if (!inChamber && !namedVacuum) return;
      obj.material = Array.isArray(obj.material)
        ? obj.material.map(() => vacuumWhite.clone())
        : vacuumWhite.clone();
    });
  }

  function replaceVacuumChamberSkin(root) {
    const T = eng.T;
    if (!T || !root) return;

    const oldSkin = root.parent?.getObjectByName('codex_forced_vacuum_chamber_skin');
    if (oldSkin) oldSkin.parent.remove(oldSkin);

    root.updateMatrixWorld(true);
    const rootBox = new T.Box3().setFromObject(root);
    const rootSize = rootBox.getSize(new T.Vector3());
    const rootCenter = rootBox.getCenter(new T.Vector3());
    const chamberBox = eng.anchor?.vacuum
      ? new T.Box3().setFromObject(eng.anchor.vacuum).expandByScalar(rootSize.length() * 0.015)
      : new T.Box3();

    if (chamberBox.isEmpty()) {
      root.traverse((obj) => {
        if (!obj.isMesh || !obj.geometry) return;
        const box = new T.Box3().setFromObject(obj);
        if (box.isEmpty()) return;
        const size = box.getSize(new T.Vector3());
        const center = box.getCenter(new T.Vector3());
        const nearCenter =
          Math.abs(center.x - rootCenter.x) < rootSize.x * 0.28 &&
          Math.abs(center.z - rootCenter.z) < rootSize.z * 0.28;
        const cylinderLike =
          Math.max(size.x, size.z) > Math.max(rootSize.x, rootSize.z) * 0.34 &&
          size.y > rootSize.y * 0.22;
        if (nearCenter && cylinderLike) chamberBox.union(box);
      });
    }
    if (chamberBox.isEmpty()) return;

    const chamberSize = chamberBox.getSize(new T.Vector3());
    const chamberCenter = chamberBox.getCenter(new T.Vector3());
    const radius = Math.max(chamberSize.x, chamberSize.z) * 0.5;
    const height = chamberSize.y;
    if (!Number.isFinite(radius) || !Number.isFinite(height) || radius <= 0 || height <= 0) return;

    root.traverse((obj) => {
      if (!obj.isMesh || !obj.geometry) return;
      const box = new T.Box3().setFromObject(obj);
      if (box.isEmpty()) return;
      const size = box.getSize(new T.Vector3());
      const center = box.getCenter(new T.Vector3());
      const inChamberXz =
        Math.abs(center.x - chamberCenter.x) < radius * 1.08 &&
        Math.abs(center.z - chamberCenter.z) < radius * 1.08;
      const bigBody =
        inChamberXz &&
        size.y > height * 0.16 &&
        Math.max(size.x, size.z) > radius * 0.72;
      const topPlate =
        inChamberXz &&
        center.y > chamberBox.max.y - height * 0.22 &&
        size.y < height * 0.18 &&
        Math.max(size.x, size.z) > radius * 0.58;
      if (bigBody || topPlate) {
        obj.visible = false;
        obj.userData.codexHiddenVacuumSkin = true;
      }
    });

    const parent = root.parent || root;
    const localCenter = parent.worldToLocal(chamberCenter.clone());
    const group = new T.Group();
    group.name = 'codex_forced_vacuum_chamber_skin';
    group.position.copy(localCenter);

    const shellMat = new T.MeshBasicMaterial({
      color: 0x85847b,
      side: T.DoubleSide,
    });
    shellMat.toneMapped = false;
    const innerMat = new T.MeshStandardMaterial({
      color: 0xf1f2ea,
      metalness: 0.02,
      roughness: 0.5,
      side: T.DoubleSide,
    });
    const ringMat = new T.MeshBasicMaterial({
      color: 0x0b0f10,
      side: T.DoubleSide,
    });
    ringMat.toneMapped = false;
    const screwMat = new T.MeshStandardMaterial({
      color: 0xd6dee2,
      metalness: 0.88,
      roughness: 0.16,
      side: T.DoubleSide,
    });
    const copperMat = new T.MeshStandardMaterial({
      color: 0xd88a2d,
      metalness: 0.86,
      roughness: 0.18,
      side: T.DoubleSide,
    });
    const purplePlasticMat = new T.MeshStandardMaterial({
      color: 0x77728e,
      metalness: 0.02,
      roughness: 0.66,
      side: T.DoubleSide,
    });
    const lightPlasticMat = new T.MeshStandardMaterial({
      color: 0xb7bdc9,
      metalness: 0.02,
      roughness: 0.62,
      side: T.DoubleSide,
    });
    const blackPlasticMat = new T.MeshStandardMaterial({
      color: 0x111214,
      metalness: 0.02,
      roughness: 0.58,
      side: T.DoubleSide,
    });

    root.traverse((obj) => {
      if (!obj.isMesh || !obj.geometry || obj.userData.codexHiddenVacuumSkin) return;
      const box = new T.Box3().setFromObject(obj);
      if (box.isEmpty()) return;
      const center = box.getCenter(new T.Vector3());
      const size = box.getSize(new T.Vector3());
      const inChamber =
        Math.abs(center.x - chamberCenter.x) < radius * 0.92 &&
        Math.abs(center.z - chamberCenter.z) < radius * 0.92 &&
        center.y > chamberBox.min.y - height * 0.04 &&
        center.y < chamberBox.max.y + height * 0.1;
      if (!inChamber) return;

      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      const nodeName = normNodeName(`${obj.name || ''} ${obj.geometry?.name || ''} ${mats.map((m) => m?.name || '').join(' ')}`);
      const colorLooksCopper = mats.some((m) => m?.color && m.color.r > 0.55 && m.color.g > 0.25 && m.color.g < 0.75 && m.color.b < 0.35);
      const colorLooksBlack = mats.some((m) => m?.color && (m.color.r + m.color.g + m.color.b) < 0.16);
      const namedScrew = nodeName.includes('gb70') || nodeName.includes('gb834') || nodeName.includes('gb836') || nodeName.includes('螺');
      const namedCopper = nodeName.includes('铜') || nodeName.includes('电极') || colorLooksCopper;
      const material = namedCopper
        ? copperMat.clone()
        : namedScrew
          ? screwMat.clone()
          : colorLooksBlack
            ? blackPlasticMat.clone()
            : (size.y > Math.max(size.x, size.z) * 1.8 ? lightPlasticMat.clone() : purplePlasticMat.clone());
      obj.material = Array.isArray(obj.material) ? obj.material.map(() => material.clone()) : material;
      obj.castShadow = false;
      obj.receiveShadow = true;
    });

    const shell = new T.Mesh(new T.CylinderGeometry(radius, radius, height, 160, 1, true), shellMat);
    shell.name = 'forced_grey_vacuum_outer_wall';
    shell.castShadow = false;
    shell.receiveShadow = true;
    group.add(shell);

    const innerLip = new T.Mesh(new T.CylinderGeometry(radius * 0.91, radius * 0.91, height * 0.012, 160, 1, false), innerMat);
    innerLip.name = 'forced_light_inner_lip';
    innerLip.position.y = height * 0.5 - height * 0.018;
    group.add(innerLip);

    const topRing = new T.Mesh(new T.TorusGeometry(radius * 0.93, Math.max(radius * 0.055, 0.035), 18, 160), ringMat);
    topRing.name = 'forced_black_top_press_ring';
    topRing.rotation.x = Math.PI / 2;
    topRing.position.y = height * 0.5 + height * 0.01;
    topRing.castShadow = false;
    topRing.receiveShadow = true;
    group.add(topRing);

    const screwGeo = new T.CylinderGeometry(radius * 0.035, radius * 0.035, height * 0.07, 36);
    const screwHeadGeo = new T.CylinderGeometry(radius * 0.055, radius * 0.055, height * 0.018, 36);
    [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5].forEach((angle, i) => {
      const x = Math.cos(angle) * radius * 0.86;
      const z = Math.sin(angle) * radius * 0.86;
      const stem = new T.Mesh(screwGeo, screwMat);
      stem.name = `forced_metal_ring_screw_${i + 1}`;
      stem.position.set(x, height * 0.5 + height * 0.045, z);
      group.add(stem);

      const head = new T.Mesh(screwHeadGeo, screwMat);
      head.name = `forced_metal_screw_head_${i + 1}`;
      head.position.set(x, height * 0.5 + height * 0.09, z);
      group.add(head);
    });

    parent.add(group);
    eng.anchor.vacuum = group;
  }

  function resizeCurrentVacuumCylinder(root) {
    const T = eng.T;
    if (!T || !root) return;

    root.updateMatrixWorld(true);
    const rootBox = new T.Box3().setFromObject(root);
    if (rootBox.isEmpty()) return;
    const rootSize = rootBox.getSize(new T.Vector3());
    const rootCenter = rootBox.getCenter(new T.Vector3());
    const shrinkXZ = 0.74;

    root.traverse((obj) => {
      if (!obj.isMesh || !obj.geometry) return;
      const name = obj.name || '';
      const box = new T.Box3().setFromObject(obj);
      if (box.isEmpty()) return;
      const size = box.getSize(new T.Vector3());
      const center = box.getCenter(new T.Vector3());
      const roundChamberShell =
        name.includes('气体放电与等离子实验仪.stp') &&
        Math.abs(center.x - rootCenter.x) < rootSize.x * 0.18 &&
        Math.abs(center.z - rootCenter.z) < rootSize.z * 0.22 &&
        Math.abs(size.x - size.z) < Math.max(size.x, size.z) * 0.08 &&
        size.x > rootSize.x * 0.14 &&
        size.z > rootSize.z * 0.14 &&
        size.y > rootSize.y * 0.012 &&
        size.y < rootSize.y * 0.5;
      if (!roundChamberShell) return;
      obj.scale.x *= shrinkXZ;
      obj.scale.z *= shrinkXZ;
      obj.updateMatrixWorld(true);
    });

    if (eng.anchor?.vacuum) {
      const oldBox = new T.Box3().setFromObject(eng.anchor.vacuum);
      if (!oldBox.isEmpty()) {
        const oldCenter = oldBox.getCenter(new T.Vector3());
        eng.anchor.vacuum.userData.codexVacuumResized = true;
        eng.anchor.vacuum.userData.codexVacuumCenter = oldCenter;
      }
    }
  }

  function applyCurrentVacuumWallMaterials(root) {
    const T = eng.T;
    if (!T || !root || !eng.anchor?.vacuum) return;

    root.updateMatrixWorld(true);
    const chamberBox = new T.Box3().setFromObject(eng.anchor.vacuum);
    if (chamberBox.isEmpty()) return;
    const chamberCenter = chamberBox.getCenter(new T.Vector3());
    const chamberSize = chamberBox.getSize(new T.Vector3());
    const radius = Math.max(chamberSize.x, chamberSize.z) * 0.5;
    const height = chamberSize.y;
    if (!Number.isFinite(radius) || !Number.isFinite(height) || radius <= 0 || height <= 0) return;

    const wallMat = new T.MeshStandardMaterial({
      color: 0x8b897d,
      metalness: 0.38,
      roughness: 0.34,
      side: T.DoubleSide,
    });
    const pressStripMat = new T.MeshStandardMaterial({
      color: 0x090909,
      metalness: 0.12,
      roughness: 0.42,
      side: T.DoubleSide,
    });
    const ironMat = new T.MeshStandardMaterial({
      color: 0xc6c9c5,
      metalness: 0.88,
      roughness: 0.18,
      side: T.DoubleSide,
    });

    root.traverse((obj) => {
      if (!obj.isMesh || !obj.geometry || obj.userData.codexHiddenVacuumSkin) return;
      const box = new T.Box3().setFromObject(obj);
      if (box.isEmpty()) return;
      const size = box.getSize(new T.Vector3());
      const center = box.getCenter(new T.Vector3());
      const deviceName = normNodeName(`${obj.name || ''} ${obj.geometry?.name || ''}`);
      if (
        deviceName.includes('探针控制装置') ||
        deviceName.includes('电极控制装置') ||
        deviceName.includes('柱体033') ||
        deviceName.includes('柱体042')
      ) return;
      const dx = Math.abs(center.x - chamberCenter.x);
      const dz = Math.abs(center.z - chamberCenter.z);
      const inCylinderColumn = dx < radius * 1.08 && dz < radius * 1.08;
      const tallRoundWall =
        inCylinderColumn &&
        size.y > height * 0.38 &&
        Math.abs(size.x - size.z) < Math.max(size.x, size.z) * 0.12 &&
        Math.max(size.x, size.z) > radius * 1.1;
      const topPressStrip =
        inCylinderColumn &&
        center.y > chamberBox.max.y - height * 0.18 &&
        size.y < height * 0.2 &&
        Math.max(size.x, size.z) > radius * 1.05;
      const nearRightHardware =
        center.y > chamberBox.min.y - height * 0.12 &&
        center.y < chamberBox.max.y + height * 0.18 &&
        Math.hypot(center.x - chamberCenter.x, center.z - chamberCenter.z) > radius * 0.98 &&
        Math.hypot(center.x - chamberCenter.x, center.z - chamberCenter.z) < radius * 2.05 &&
        !tallRoundWall &&
        Math.max(size.x, size.y, size.z) < radius * 1.2;

      let material = null;
      if (topPressStrip) material = pressStripMat;
      else if (tallRoundWall) material = wallMat;
      else if (nearRightHardware) material = ironMat;
      if (!material) return;

      obj.material = Array.isArray(obj.material)
        ? obj.material.map(() => material.clone())
        : material.clone();
      obj.castShadow = false;
      obj.receiveShadow = true;
    });
  }

  function applyVacuumInteriorReferenceColors(root) {
    const T = eng.T;
    if (!T || !root || !eng.anchor?.vacuum) return;

    root.updateMatrixWorld(true);
    const chamberBox = new T.Box3().setFromObject(eng.anchor.vacuum);
    if (chamberBox.isEmpty()) return;
    const chamberCenter = chamberBox.getCenter(new T.Vector3());
    const chamberSize = chamberBox.getSize(new T.Vector3());
    const radius = Math.max(chamberSize.x, chamberSize.z) * 0.5;
    const height = chamberSize.y;

    const baseWhite = new T.MeshStandardMaterial({
      color: 0xf2f1e8,
      metalness: 0.02,
      roughness: 0.42,
      side: T.DoubleSide,
    });
    const lavender = new T.MeshStandardMaterial({
      color: 0x7b7899,
      metalness: 0.08,
      roughness: 0.44,
      side: T.DoubleSide,
    });
    const lightInsulator = new T.MeshStandardMaterial({
      color: 0xc2c8d8,
      metalness: 0.02,
      roughness: 0.38,
      side: T.DoubleSide,
    });
    const gold = new T.MeshStandardMaterial({
      color: 0xca8c2f,
      metalness: 0.86,
      roughness: 0.18,
      side: T.DoubleSide,
    });
    const iron = new T.MeshStandardMaterial({
      color: 0xc5cbc9,
      metalness: 0.9,
      roughness: 0.16,
      side: T.DoubleSide,
    });
    const black = new T.MeshStandardMaterial({
      color: 0x111316,
      metalness: 0.18,
      roughness: 0.35,
      side: T.DoubleSide,
    });
    root.traverse((obj) => {
      if (!obj.isMesh || !obj.geometry || obj.userData.codexHiddenVacuumSkin) return;
      const rawName = `${obj.name || ''} ${obj.geometry?.name || ''}`;
      const normalized = normNodeName(rawName);
      if (
        normalized.includes('探针控制装置') ||
        normalized.includes('电极控制装置') ||
        normalized.includes('柱体033') ||
        normalized.includes('柱体042')
      ) return;
      const box = new T.Box3().setFromObject(obj);
      if (box.isEmpty()) return;
      const center = box.getCenter(new T.Vector3());
      const size = box.getSize(new T.Vector3());
      const inChamber =
        Math.abs(center.x - chamberCenter.x) < radius * 0.95 &&
        Math.abs(center.z - chamberCenter.z) < radius * 0.95 &&
        center.y > chamberBox.min.y - height * 0.08 &&
        center.y < chamberBox.max.y + height * 0.08;
      if (!inChamber) return;
      const chamberWallLike =
        size.y > height * 0.38 &&
        Math.abs(size.x - size.z) < Math.max(size.x, size.z) * 0.12 &&
        Math.max(size.x, size.z) > radius * 1.1;
      const topPressStripLike =
        center.y > chamberBox.max.y - height * 0.18 &&
        size.y < height * 0.2 &&
        Math.max(size.x, size.z) > radius * 1.05;
      if (chamberWallLike || topPressStripLike) return;

      let material = null;
      if (rawName.includes('_________2.stp')) material = gold;
      else if (rawName.includes('KF16') || normalized.includes('gb70') || normalized.includes('gb834') || normalized.includes('gb836')) material = iron;
      else if (rawName.includes('MNTL') || rawName.includes('X_________') || rawName.includes('Z_________') || rawName.includes('_____________1')) material = lavender;
      else if (rawName.includes('_____1-3') || rawName.includes('2mm') || rawName.includes('__0.5')) material = gold;
      else if (size.y > Math.max(size.x, size.z) * 1.8) material = lightInsulator;
      else if (Math.max(size.x, size.y, size.z) > radius * 0.55 && size.y < height * 0.18) material = baseWhite;
      else if (Math.min(size.x, size.y, size.z) < radius * 0.025) material = iron;

      if (normalized.includes('point') || normalized.includes('球体')) material = iron;
      if (!material) return;

      obj.material = Array.isArray(obj.material)
        ? obj.material.map(() => material.clone())
        : material.clone();
      obj.castShadow = false;
      obj.receiveShadow = true;
    });
  }

  function applyVacuumValveStainlessMaterials(root) {
    const T = eng.T;
    if (!T || !root || !eng.anchor?.vacuum) return;

    root.updateMatrixWorld(true);
    const chamberBox = new T.Box3().setFromObject(eng.anchor.vacuum);
    if (chamberBox.isEmpty()) return;
    const chamberCenter = chamberBox.getCenter(new T.Vector3());
    const chamberSize = chamberBox.getSize(new T.Vector3());
    const radius = Math.max(chamberSize.x, chamberSize.z) * 0.5;
    const height = chamberSize.y;

    const makeStainless = (color, roughness, intensity) => new T.MeshPhysicalMaterial({
      color,
      metalness: 0.96,
      roughness,
      clearcoat: 0.35,
      clearcoatRoughness: 0.12,
      envMapIntensity: intensity,
      side: T.DoubleSide,
      transparent: false,
      opacity: 1,
      depthWrite: true,
      depthTest: true,
    });
    const brightSteel = makeStainless(0xe9f0ef, 0.08, 2.35);
    const screwSteel = makeStainless(0xf7fbf9, 0.07, 2.55);
    const brushedSteel = makeStainless(0xd2d8d4, 0.14, 2.1);

    root.traverse((obj) => {
      if (!obj.isMesh || !obj.geometry || obj.userData.codexHiddenVacuumSkin) return;
      if (nameHasAny(obj, ['探针控制装置', '电极控制装置', '柱体033', '柱体042', '屏幕', '参考图'])) return;

      const isScrew = nameHasAny(obj, ['GB70', 'GB834', 'GB836', '螺']);
      const isValveOrFlange = nameHasAny(obj, [
        'KF16',
        'KF25',
        'KF40',
        'GW-J200',
        'GX28',
        'ZKY8',
        'PCM300',
        '33-27-33',
      ]);

      const box = new T.Box3().setFromObject(obj);
      if (box.isEmpty()) return;
      const center = box.getCenter(new T.Vector3());
      const size = box.getSize(new T.Vector3());
      const radialDistance = Math.hypot(center.x - chamberCenter.x, center.z - chamberCenter.z);
      const isBigChamberWall =
        size.y > height * 0.38 &&
        Math.abs(size.x - size.z) < Math.max(size.x, size.z) * 0.16 &&
        Math.max(size.x, size.z) > radius * 1.05;
      const isTopChamberStrip =
        center.y > chamberBox.max.y - height * 0.18 &&
        size.y < height * 0.2 &&
        Math.max(size.x, size.z) > radius * 1.05;
      const isCircledVacuumHardware =
        nameHasAny(obj, ['气体放电与等离子实验仪.stp']) &&
        center.y > chamberBox.min.y - height * 0.18 &&
        center.y < chamberBox.max.y + height * 0.32 &&
        radialDistance > radius * 0.62 &&
        radialDistance < radius * 2.55 &&
        Math.max(size.x, size.y, size.z) < radius * 1.65 &&
        !isBigChamberWall &&
        !isTopChamberStrip;
      if (!isScrew && !isValveOrFlange && !isCircledVacuumHardware) return;

      const material = isScrew
        ? screwSteel
        : (Math.min(size.x, size.y, size.z) < Math.max(size.x, size.y, size.z) * 0.08 ? brightSteel : brushedSteel);
      obj.material = Array.isArray(obj.material)
        ? obj.material.map(() => material.clone())
        : material.clone();
      obj.castShadow = false;
      obj.receiveShadow = true;
    });
  }

  function removeCircledInteriorFloaters(root) {
    const T = eng.T;
    if (!T || !root || !eng.anchor?.vacuum) return;

    root.updateMatrixWorld(true);
    const chamberBox = new T.Box3().setFromObject(eng.anchor.vacuum);
    if (chamberBox.isEmpty()) return;
    const chamberCenter = chamberBox.getCenter(new T.Vector3());
    const chamberSize = chamberBox.getSize(new T.Vector3());
    const radius = Math.max(chamberSize.x, chamberSize.z) * 0.5;

    const nodesToRemove = [];
    root.traverse((obj) => {
      if (!obj.isMesh) return;
      const label = normNodeName(`${obj.name || ''} ${obj.geometry?.name || ''}`);
      const isTargetExtra =
        nameEquals(obj, '立方体010') ||
        nameEquals(obj, '圆环') ||
        nameEquals(obj, '柱体006') ||
        nameEquals(obj, '柱体007') ||
        nameEquals(obj, '柱体008') ||
        nameEquals(obj, '柱体009') ||
        nameEquals(obj, '柱体010');
      const isTargetScrew =
        label.includes('gb8341988') ||
        label.includes('gb8361988') ||
        label.includes('gb834') ||
        label.includes('gb836');
      if (!isTargetScrew && !isTargetExtra) return;
      if (isTargetExtra) {
        nodesToRemove.push(obj);
        return;
      }

      const box = new T.Box3().setFromObject(obj);
      if (box.isEmpty()) return;
      const center = box.getCenter(new T.Vector3());
      const size = box.getSize(new T.Vector3());
      const insideVacuum =
        Math.abs(center.x - chamberCenter.x) < radius * 0.95 &&
        Math.abs(center.z - chamberCenter.z) < radius * 0.95 &&
        center.y > chamberBox.min.y - chamberSize.y * 0.05 &&
        center.y < chamberBox.max.y + chamberSize.y * 0.05;
      const screwSized = Math.max(size.x, size.y, size.z) < Math.max(chamberSize.y * 0.12, 0.32);
      const extraSized = Math.max(size.x, size.y, size.z) < Math.max(chamberSize.y * 0.08, 0.24);
      if (!insideVacuum || (isTargetScrew ? !screwSized : !extraSized)) return;

      nodesToRemove.push(obj);
    });

    nodesToRemove.forEach((obj) => obj.removeFromParent());
  }

  function boxifyElectrodeControlBody(root) {
    const T = eng.T;
    if (!T || !root) return;

    const body = findAnyExact(root, ['柱体042']);
    if (!body?.isMesh || !body.geometry || body.userData.codexBoxifiedElectrodeControl) return;

    body.geometry.computeBoundingBox();
    const box = body.geometry.boundingBox;
    if (!box || box.isEmpty()) return;

    const size = box.getSize(new T.Vector3());
    const center = box.getCenter(new T.Vector3());
    if (size.x <= 0 || size.y <= 0 || size.z <= 0) return;

    const replacement = new T.BoxGeometry(size.x, size.y, size.z);
    replacement.translate(center.x, center.y, center.z);
    replacement.name = body.geometry.name || 'boxified_electrode_control_body';
    body.geometry.dispose?.();
    body.geometry = replacement;
    body.userData.codexBoxifiedElectrodeControl = true;
    body.castShadow = false;
    body.receiveShadow = true;
    body.updateMatrixWorld(true);
  }

  function boxifyProbeControlBody(root) {
    const T = eng.T;
    if (!T || !root) return;

    const body = findAnyExact(root, ['柱体033', '探针控制装置']);
    if (!body?.isMesh || !body.geometry || body.userData.codexBoxifiedProbeControl) return;

    body.geometry.computeBoundingBox();
    const box = body.geometry.boundingBox;
    if (!box || box.isEmpty()) return;

    const size = box.getSize(new T.Vector3());
    const center = box.getCenter(new T.Vector3());
    if (size.x <= 0 || size.y <= 0 || size.z <= 0) return;

    const replacement = new T.BoxGeometry(size.x, size.y, size.z);
    replacement.translate(center.x, center.y, center.z);
    replacement.name = body.geometry.name || 'boxified_probe_control_body';
    body.geometry.dispose?.();
    body.geometry = replacement;
    body.userData.codexBoxifiedProbeControl = true;
    body.castShadow = false;
    body.receiveShadow = true;
    body.updateMatrixWorld(true);
  }

  function applyRightDeviceVisuals(root) {
    const T = eng.T;
    if (!T || !root) return;
    const lowerControl = findAnyExact(root, ['电极控制装置.001', '电极控制装置', '柱体042']);
    const upperSupply = findAnyExact(root, ['探针控制装置', '柱体033']);
    const blueBody = new T.MeshStandardMaterial({
      color: 0x138bd8,
      metalness: 0.02,
      roughness: 0.58,
      side: T.DoubleSide,
      transparent: false,
      opacity: 1,
      depthWrite: true,
      depthTest: true,
    });
    const supplyBody = new T.MeshStandardMaterial({
      color: 0xf0eee1,
      metalness: 0.02,
      roughness: 0.62,
      side: T.DoubleSide,
      transparent: false,
      opacity: 1,
      depthWrite: true,
      depthTest: true,
    });

    if (lowerControl?.isMesh) {
      lowerControl.material = Array.isArray(lowerControl.material)
        ? lowerControl.material.map(() => blueBody.clone())
        : blueBody.clone();
    }
    if (upperSupply?.isMesh) {
      upperSupply.material = Array.isArray(upperSupply.material)
        ? upperSupply.material.map(() => supplyBody.clone())
        : supplyBody.clone();
    }
    const removableExactParts = ['柱体041', '柱体.041', '柱体043', '柱体.043', '柱体012', '柱体.012', '立方体019', '立方体.019', '立方体030', '立方体.030'];
    const partsToRemove = [];
    root.traverse((obj) => {
      if (nameHasAny(obj, removableExactParts)) partsToRemove.push(obj);
    });
    partsToRemove.forEach((obj) => obj.removeFromParent());

    [lowerControl, upperSupply].filter(Boolean).forEach((device) => {
      const deviceBox = new T.Box3().setFromObject(device);
      if (deviceBox.isEmpty()) return;
      const deviceSize = deviceBox.getSize(new T.Vector3());
      const maxSmallPart = Math.max(deviceSize.x, deviceSize.y, deviceSize.z) * 0.34;
      const padded = deviceBox.clone().expandByScalar(Math.max(maxSmallPart * 0.28, 0.015));
      root.traverse((obj) => {
        if (!obj.isMesh || obj === device || obj.visible === false) return;
        const box = new T.Box3().setFromObject(obj);
        if (box.isEmpty() || !padded.intersectsBox(box)) return;
        const size = box.getSize(new T.Vector3());
        if (Math.max(size.x, size.y, size.z) > maxSmallPart) return;
        if (!nameHasAny(obj, ['柱体', '立方体', 'button', 'knob'])) return;
        obj.visible = false;
      });
    });
  }

  function applyRequestedElectrodeColors(root) {
    const T = eng.T;
    if (!T || !root) return;

    const copper = new T.MeshStandardMaterial({
      color: 0xb87333,
      metalness: 0.9,
      roughness: 0.16,
      side: T.DoubleSide,
    });
    const purple = new T.MeshStandardMaterial({
      color: 0x77728e,
      metalness: 0.04,
      roughness: 0.58,
      side: T.DoubleSide,
    });

    const purpleSleeves = [
      '__________2stp-1__________1stp-1',
      '__________2stp-2__________1stp-1',
    ];
    const copperElectrodes = [
      '__________2stp-1______1stp-1',
      '__________2stp-2______1stp-1',
      '__________2stp-1________________1stp-1',
      '__________2stp-2________________1stp-1',
    ];

    root.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const rawName = `${obj.name || ''} ${obj.geometry?.name || ''}`;
      const material = purpleSleeves.some((token) => rawName.includes(token))
        ? copper
        : copperElectrodes.some((token) => rawName.includes(token))
          ? purple
          : null;
      if (!material) return;

      obj.material = Array.isArray(obj.material)
        ? obj.material.map(() => material.clone())
        : material.clone();
      obj.castShadow = false;
      obj.receiveShadow = true;
    });
  }

  function placeRequestedTopDevicesOnTable(root) {
    const T = eng.T;
    if (!T || !root) return;

    const table = findAnyExact(root, ['平面']);
    const tableBox = table ? new T.Box3().setFromObject(table) : null;
    if (!tableBox || tableBox.isEmpty()) return;

    const lowerControl = findAnyExact(root, ['柱体042']);
    const lowerControlBox = lowerControl ? new T.Box3().setFromObject(lowerControl) : null;
    const targetBottomY = lowerControlBox && !lowerControlBox.isEmpty()
      ? lowerControlBox.min.y
      : tableBox.max.y + 0.003;
    const requestedMoves = {
      柱体033: { x: -0.45, y: 0.6 + PROBE_POWER_DEVICE_LIFT_M, z: 0, alignBottom: true },
      柱体042: { x: 0, y: -0.05, z: 0 },
      立方体032: { x: 0.5, y: -0.3, z: 0 },
    };
    Object.entries(requestedMoves).forEach(([name, offset]) => {
      const device = findAnyExact(root, [name]);
      if (!device) return;
      const box = new T.Box3().setFromObject(device);
      if (box.isEmpty()) return;
      device.position.x += offset.x;
      device.position.z += offset.z;
      if (offset.alignBottom) device.position.y += targetBottomY - box.min.y;
      if (offset.y) device.position.y += offset.y;
      device.updateMatrixWorld(true);
    });

    ['柱体041', '柱体043', '柱体012', '立方体019', '立方体030'].forEach((name) => {
      const part = findAnyExact(root, [name]);
      if (!part) return;
      part.position.y += PROBE_POWER_DEVICE_LIFT_M;
      part.updateMatrixWorld(true);
    });

    const visibleProbePower = findAnyExact(root, ['DC5_plain_rectangular_body', 'dc5plainrectangularbody']);
    if (visibleProbePower) {
      visibleProbePower.position.y += PROBE_POWER_DEVICE_LIFT_M;
      visibleProbePower.updateMatrixWorld(true);
      eng.anchor.probePower = visibleProbePower;
    }
    const rightmostProbePower = findAnyExact(root, ['柱体033']);
    if (rightmostProbePower) eng.anchor.probePower = rightmostProbePower;

    const wire = findAnyExact(root, ['Point003']);
    if (wire) wire.visible = false;
  }

  function resizeFixedProbeBaseRail(root) {
    const T = eng.T;
    if (!T || !root) return;

    const probeRail = findAnyExact(root, ['气体放电与等离子实验仪stp_-_MNTL______75__stp-1']);
    const electrodeRail = findAnyExact(root, ['气体放电与等离子实验仪stp_-_GX28-____250mm-2840(1)stp_1stp-1']);
    if (!probeRail || !electrodeRail) return;

    probeRail.updateMatrixWorld(true);
    electrodeRail.updateMatrixWorld(true);
    const probeBox = new T.Box3().setFromObject(probeRail);
    const electrodeBox = new T.Box3().setFromObject(electrodeRail);
    if (probeBox.isEmpty() || electrodeBox.isEmpty()) return;

    const probeSize = probeBox.getSize(new T.Vector3());
    const electrodeSize = electrodeBox.getSize(new T.Vector3());
    const currentLength = Math.max(probeSize.x, probeSize.z, 1e-6);
    const targetLength = Math.max(electrodeSize.x, electrodeSize.z);
    if (!Number.isFinite(targetLength) || targetLength <= currentLength) return;

    const axis = worldLocalScaleAxis(probeRail, new T.Vector3(probeSize.x >= probeSize.z ? 1 : 0, 0, probeSize.x >= probeSize.z ? 0 : 1));
    probeRail.scale[axis] *= targetLength / currentLength;
    probeRail.position.x += 0.2;
    probeRail.visible = true;
    probeRail.userData.codexFixedProbeBaseRail = true;
    probeRail.updateMatrixWorld(true);
  }

  function applyRawInstrumentColors(root) {
    const T = eng.T;
    root.updateMatrixWorld(true);
    const rootBox = new T.Box3().setFromObject(root);
    const rootCenter = rootBox.getCenter(new T.Vector3());
    const rootSize = rootBox.getSize(new T.Vector3());
    const resistorBlack = new T.MeshBasicMaterial({ color: 0x050505 });
    const mainPowerCase = new T.MeshBasicMaterial({
      color: 0xd8d4bd,
      side: T.DoubleSide,
      transparent: false,
      opacity: 1,
      depthWrite: true,
      depthTest: true,
    });
    const sideBlue = new T.MeshBasicMaterial({ color: 0x168fe8, side: T.DoubleSide });

    root.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      const materialName = mats.map((m) => m?.name || '').join(' ');
      const nodeName = obj.name || '';
      const box = new T.Box3().setFromObject(obj);
      const center = box.getCenter(new T.Vector3());
      const size = box.getSize(new T.Vector3());
      const farVisualLeft = center.x > rootBox.max.x - rootSize.x * 0.07 && size.y > rootSize.y * 0.02;
      const yellowPower = center.x > rootCenter.x + rootSize.x * 0.18 && center.x < rootBox.max.x - rootSize.x * 0.12 && size.x > rootSize.x * 0.12;
      const rightSideDevice = center.x < rootCenter.x - rootSize.x * 0.22 && size.y > rootSize.y * 0.04;
      const isFrontTexture = materialName.includes('参考图') || materialName.includes('front_image') || nodeName.includes('visible_side_panel_texture_plane');

      if (farVisualLeft || nodeName.includes('032') || materialName.includes('black_resistor_restored')) {
        obj.material = resistorBlack.clone();
        return;
      }

      if (yellowPower || nodeName === '立方体.016' || nodeName === '立方体016') {
        obj.material = Array.isArray(obj.material)
          ? obj.material.map(() => mainPowerCase.clone())
          : mainPowerCase.clone();
        return;
      }

      if (nodeName.includes('DC5_plain_rectangular_body')) {
        obj.material = sideBlue.clone();
        return;
      }

      if (nodeName.includes('柱体.042')) {
        obj.material = Array.isArray(obj.material)
          ? obj.material.map((mat) => {
              const name = mat?.name || '';
              if (name.includes('箱体蓝')) return sideBlue.clone();
              return mat;
            })
          : obj.material;
        return;
      }

      if (rightSideDevice && !isFrontTexture && !materialName.includes('按键') && !materialName.includes('屏幕') && !materialName.includes('前面板')) {
        obj.material = sideBlue.clone();
      }
    });
  }

  function addRawMainPowerDetails(root) {
    const T = eng.T;
    const worldExisting = eng.machine?.getObjectByName('raw_main_power_visible_details');
    if (worldExisting) worldExisting.removeFromParent();
    const sceneExisting = eng.scene?.getObjectByName('raw_main_power_visible_details_scene');
    if (sceneExisting) sceneExisting.removeFromParent();
    root.updateMatrixWorld(true);
    const rootBox = new T.Box3().setFromObject(root);
    const rootCenter = rootBox.getCenter(new T.Vector3());
    const rootSize = rootBox.getSize(new T.Vector3());
    let target = null;
    let bestVolume = -Infinity;
    root.traverse((obj) => {
      if (!obj.isMesh) return;
      if (obj.name === '立方体.016') {
        target = obj;
        bestVolume = Infinity;
        return;
      }
      const box = new T.Box3().setFromObject(obj);
      const center = box.getCenter(new T.Vector3());
      const size = box.getSize(new T.Vector3());
      const materialName = (Array.isArray(obj.material) ? obj.material : [obj.material]).map((m) => m?.name || '').join(' ');
      const isFrontTexture = materialName.includes('参考图') || materialName.includes('front_image') || obj.name.includes('visible_side_panel_texture_plane');
      const inMainPowerArea = center.x > rootCenter.x + rootSize.x * 0.18 &&
        center.x < rootBox.max.x - rootSize.x * 0.12 &&
        size.x > rootSize.x * 0.12 &&
        size.y > rootSize.y * 0.04 &&
        !isFrontTexture;
      if (!inMainPowerArea) return;
      const volume = Math.max(size.x, 0.001) * Math.max(size.y, 0.001) * Math.max(size.z, 0.001);
      if (volume > bestVolume) {
        bestVolume = volume;
        target = obj;
      }
    });
    if (!target) return;
    const existing = target.getObjectByName('raw_main_power_details');
    if (existing) existing.removeFromParent();
    if (!target.geometry.boundingBox) target.geometry.computeBoundingBox();
    const localBox = target.geometry.boundingBox;
    if (!localBox) return;

    const size = localBox.getSize(new T.Vector3());
    const center = localBox.getCenter(new T.Vector3());
    const group = new T.Group();
    group.name = 'raw_main_power_details';
    target.add(group);
    group.visible = true;

    const casePanelMat = new T.MeshBasicMaterial({ color: 0xc4c0aa, side: T.DoubleSide, depthWrite: false, depthTest: false });
    const ventMat = new T.MeshBasicMaterial({ color: 0xf9f6e8, side: T.DoubleSide, depthWrite: false, depthTest: false });
    const handleMat = new T.MeshBasicMaterial({ color: 0xdce6ec, depthWrite: false, depthTest: false });

    const addPlane = (name, x, y, z, w, h, mat) => {
      const mesh = new T.Mesh(new T.PlaneGeometry(w, h), mat.clone ? mat.clone() : mat);
      mesh.name = name;
      mesh.position.set(x, y, z);
      mesh.renderOrder = 4;
      group.add(mesh);
      return mesh;
    };
    const addXPlane = (name, x, y, z, w, h, mat, outward) => {
      const mesh = new T.Mesh(new T.PlaneGeometry(w, h), mat.clone ? mat.clone() : mat);
      mesh.name = name;
      mesh.rotation.y = Math.PI / 2;
      mesh.position.set(x + outward * size.x * 0.002, y, z);
      mesh.renderOrder = 4;
      group.add(mesh);
      return mesh;
    };

    const handleGeo = new T.CylinderGeometry(size.x * 0.018, size.x * 0.018, size.y * 0.42, 16);
    const addHandle = (x, z) => {
      const h = new T.Mesh(handleGeo, handleMat.clone());
      h.name = 'main_power_side_handle';
      h.position.set(x, center.y + size.y * 0.1, z);
      h.renderOrder = 5;
      group.add(h);
    };

    const addPowerFace = (z, outward) => {
      addPlane(
        'main_power_front_panel_tint',
        center.x,
        center.y - size.y * 0.02,
        z,
        size.x * 0.94,
        size.y * 0.78,
        casePanelMat
      );

      const slotW = size.x * 0.075;
      const slotH = size.y * 0.04;
      const startX = center.x - size.x * 0.29;
      const startY = center.y - size.y * 0.25;
      const rowGap = size.y * 0.065;
      const colGap = size.x * 0.075;
      const rows = [
        { count: 4, offset: 0 },
        { count: 10, offset: 4 },
        { count: 10, offset: 4 },
        { count: 9, offset: 4 },
        { count: 8, offset: 4 },
        { count: 7, offset: 4 },
      ];
      rows.forEach((row, r) => {
        for (let c = 0; c < row.count; c += 1) {
          const x = startX + (c + row.offset) * colGap;
          const y = startY + r * rowGap;
          addPlane('main_power_vent_slot', x, y, z + outward * size.z * 0.002, slotW, slotH, ventMat);
        }
      });
      addHandle(localBox.min.x + size.x * 0.06, z + outward * size.z * 0.025);
      addHandle(localBox.max.x - size.x * 0.06, z + outward * size.z * 0.025);
    };

    const addPowerSideFace = (x, outward) => {
      const slotW = size.z * 0.07;
      const slotH = size.y * 0.04;
      const startZ = center.z - size.z * 0.28;
      const startY = center.y - size.y * 0.25;
      const rowGap = size.y * 0.065;
      const colGap = size.z * 0.075;
      const rows = [
        { count: 4, offset: 0 },
        { count: 10, offset: 4 },
        { count: 10, offset: 4 },
        { count: 9, offset: 4 },
        { count: 8, offset: 4 },
        { count: 7, offset: 4 },
      ];
      rows.forEach((row, r) => {
        for (let c = 0; c < row.count; c += 1) {
          addXPlane(
            'main_power_vent_slot_side',
            x,
            startY + r * rowGap,
            startZ + (c + row.offset) * colGap,
            slotW,
            slotH,
            ventMat,
            outward
          );
        }
      });

      const makeSideHandle = (z) => {
        const h = new T.Mesh(handleGeo, handleMat.clone());
        h.name = 'main_power_side_handle';
        h.position.set(x + outward * size.x * 0.025, center.y + size.y * 0.1, z);
        h.renderOrder = 5;
        group.add(h);
      };
      makeSideHandle(localBox.min.z + size.z * 0.08);
      makeSideHandle(localBox.max.z - size.z * 0.08);
    };

    addPowerSideFace(localBox.min.x - size.x * 0.012, -1);
    return;
  }

  function hideMainPowerPhysicalButtons(root) {
    const T = eng.T;
    const body = findAnyExact(root, ['\u7acb\u65b9\u4f53016']) || eng.anchor.mainPower;
    if (!body) return;
    const bodyBox = new T.Box3().setFromObject(body);
    if (bodyBox.isEmpty()) return;
    const bodySize = bodyBox.getSize(new T.Vector3());
    const frontZ = bodyBox.min.z;
    const isLightNeutral = (material) => {
      const mats = Array.isArray(material) ? material : [material];
      return mats.some((mat) => {
        const color = mat?.color;
        if (!color) return false;
        const max = Math.max(color.r, color.g, color.b);
        const min = Math.min(color.r, color.g, color.b);
        const luminance = color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;
        return luminance > 0.45 && max - min < 0.18;
      });
    };

    root.traverse((obj) => {
      if (!obj.isMesh || obj === body) return;
      if (obj.name.includes('detail_main_rack_power_dynamic_panel')) return;
      const box = new T.Box3().setFromObject(obj);
      if (box.isEmpty()) return;
      const center = box.getCenter(new T.Vector3());
      const size = box.getSize(new T.Vector3());
      const rx = (center.x - bodyBox.min.x) / Math.max(bodySize.x, 1e-6);
      const ry = (center.y - bodyBox.min.y) / Math.max(bodySize.y, 1e-6);
      const nearFront = Math.abs(center.z - frontZ) < Math.max(bodySize.z * 0.18, 0.12);
      const inButtonCluster = rx > 0.44 && rx < 0.78 && ry > 0.37 && ry < 0.68;
      const smallRaisedPart =
        size.x < bodySize.x * 0.16 &&
        size.y < bodySize.y * 0.18 &&
        size.z < bodySize.z * 0.22;
      const nameLooksLikeButton = nameHasAny(obj, ['button', 'btn', '\u6309\u94ae', '\u952e']);
      if (nearFront && inButtonCluster && smallRaisedPart && (nameLooksLikeButton || isLightNeutral(obj.material))) {
        obj.visible = false;
        obj.userData.hiddenByMainPowerPanel = true;
      }
    });
  }

  function enhanceRawFrontTextures(root) {
    const T = eng.T;
    const makeFrontMaterial = (mat) => {
      const texture = mat?.map || mat?.emissiveMap;
      if (!texture) return mat;
      if (T.SRGBColorSpace && 'colorSpace' in texture) {
        texture.colorSpace = T.SRGBColorSpace;
        texture.needsUpdate = true;
      }
      const front = new T.MeshBasicMaterial({
        map: texture,
        color: 0xffffff,
        transparent: mat.transparent || (mat.opacity ?? 1) < 1,
        opacity: mat.opacity ?? 1,
        side: T.DoubleSide,
      });
      front.toneMapped = false;
      return front;
    };

    root.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      const materialName = mats.map((m) => m?.name || '').join(' ');
      const nodeName = obj.name || '';
      const isFrontTexture =
        nodeName.includes('参考图正面贴图') ||
        nodeName.includes('DC5_visible_side_panel_texture_plane') ||
        materialName.includes('参考图正面贴图材质') ||
        materialName.includes('DC5_flat_front_image_material');
      if (!isFrontTexture) return;
      obj.material = Array.isArray(obj.material)
        ? obj.material.map(makeFrontMaterial)
        : makeFrontMaterial(obj.material);
      obj.renderOrder = Math.max(obj.renderOrder || 0, 3);
    });
  }

  function applyModelRenderLighting(rawMode) {
    if (!eng.renderer || !eng.scene) return;
    if (rawMode) {
      if (eng.T?.ACESFilmicToneMapping !== undefined) eng.renderer.toneMapping = eng.T.ACESFilmicToneMapping;
      eng.renderer.toneMappingExposure = 0.62;
      if (eng.lights?.ambient) eng.lights.ambient.intensity = 0.62;
      if (eng.lights?.hemi) eng.lights.hemi.intensity = 0.28;
      if (eng.lights?.key) eng.lights.key.intensity = 0.08;
      if (eng.lights?.rim) eng.lights.rim.intensity = 0.02;
      eng.scene.environment = null;
      return;
    }

    if (eng.T?.ACESFilmicToneMapping !== undefined) eng.renderer.toneMapping = eng.T.ACESFilmicToneMapping;
    eng.renderer.toneMappingExposure = 1.35;
    if (eng.lights?.ambient) eng.lights.ambient.intensity = 0.72;
    if (eng.lights?.hemi) eng.lights.hemi.intensity = 0.48;
    if (eng.lights?.key) eng.lights.key.intensity = 1.45;
    if (eng.lights?.rim) eng.lights.rim.intensity = 1.36;
    if (eng.environmentMap) eng.scene.environment = eng.environmentMap;
    if (eng.scene.environment) eng.scene.environmentIntensity = 1;
  }

  function polishVacuumAssemblyMaterials(root) {
    const T = eng.T;
    const metalSilver = new T.Color(0xc9d4d7);
    const chamberBox = eng.anchor?.vacuum ? new T.Box3().setFromObject(eng.anchor.vacuum) : new T.Box3().setFromObject(root);
    const chamberSize = chamberBox.getSize(new T.Vector3());
    root.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const objName = normNodeName(`${obj.name || ''} ${obj.geometry?.name || ''}`);
      const box = new T.Box3().setFromObject(obj);
      if (box.isEmpty()) return;
      const center = box.getCenter(new T.Vector3());
      const isVacuumAssembly =
        objName.includes('气体放电与等离子实验仪') ||
        objName.includes('pcm300kf') ||
        objName.includes('kf16') ||
        objName.includes('kf25') ||
        objName.includes('kf40') ||
        objName.includes('gwj200') ||
        objName.includes('zky8230009');
      const nearVacuum =
        center.x > chamberBox.min.x - chamberSize.x * 0.55 &&
        center.x < chamberBox.max.x + chamberSize.x * 0.9 &&
        center.y > chamberBox.min.y - chamberSize.y * 0.42 &&
        center.y < chamberBox.max.y + chamberSize.y * 0.35 &&
        center.z > chamberBox.min.z - chamberSize.z * 0.35 &&
        center.z < chamberBox.max.z + chamberSize.z * 0.35;
      if (!isVacuumAssembly && !nearVacuum) return;

      const patch = (mat) => {
        if (!mat?.clone) return mat;
        const m = mat.clone();
        const matName = normNodeName(m.name || '');
        if (matName.includes('铜电极')) return m;
        const isDark = m.color ? (m.color.r + m.color.g + m.color.b) < 1.85 : true;
        if (isDark || matName.includes('材质') || isVacuumAssembly) {
          if ('color' in m && m.color) m.color.copy(metalSilver);
        }
        if ('transparent' in m) m.transparent = false;
        if ('opacity' in m) m.opacity = 1;
        if ('metalness' in m) m.metalness = Math.max(m.metalness ?? 0, 0.7);
        if ('roughness' in m) m.roughness = Math.min(m.roughness ?? 0.4, 0.2);
        if ('envMapIntensity' in m) m.envMapIntensity = 1.45;
        if ('side' in m) m.side = T.DoubleSide;
        if ('emissive' in m && m.emissive) {
          m.emissive.setRGB(0, 0, 0);
          m.emissiveIntensity = 0;
        }
        m.needsUpdate = true;
        return m;
      };

      obj.material = Array.isArray(obj.material) ? obj.material.map(patch) : patch(obj.material);
    });
  }

    function tuneDeviceMaterials(root) {
    const glassTokens = ['glass', 'vacuum', '\u7f69', 'tube', 'cylinder', 'chamber'];
    const coolGray = new eng.T.Color(0xb8c1cc);
    const glassTint = new eng.T.Color(0xa3b0c1);

    const soften = (color, mixTarget, amount) => {
      if (!color || !color.getHSL) return;
      const hsl = { h: 0, s: 0, l: 0 };
      color.getHSL(hsl);
      hsl.s *= 0.1;
      hsl.l = clamp(hsl.l * 0.82 + 0.06, 0.5, 0.78);
      color.setHSL(hsl.h, hsl.s, hsl.l);
      color.lerp(mixTarget, amount);
    };

    root.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const name = (obj.name || '').toLowerCase();
      const normalizedName = normNodeName(obj.name || '');
      const forceOpaqueDevice =
        normalizedName.includes('立方体016') ||
        normalizedName.includes('立方体032') ||
        normalizedName.includes('柱体033') ||
        normalizedName.includes('柱体042');
      const box = new eng.T.Box3().setFromObject(obj);
      const size = box.isEmpty() ? new eng.T.Vector3() : box.getSize(new eng.T.Vector3());
      const rootBox = new eng.T.Box3().setFromObject(root);
      const rootSize = rootBox.getSize(new eng.T.Vector3());
      const roundLargeChamberPart =
        size.x > rootSize.x * 0.12 &&
        size.z > rootSize.z * 0.12 &&
        Math.abs(size.x - size.z) < Math.max(size.x, size.z) * 0.18 &&
        size.y < rootSize.y * 0.42;

      const patch = (mat) => {
        if (!mat || !mat.clone) return mat;
        const m = mat.clone();
        const isGlass = !forceOpaqueDevice && (glassTokens.some((token) => name.includes(token)) || roundLargeChamberPart);
        const keepPanelTexture =
          nameHasAny(obj, ['参考贴图']) ||
          /^panelkeepmap_/i.test(mat.name || '');

        if (keepPanelTexture) {
          if ('color' in m && m.color) m.color.setRGB(1, 1, 1);
          if ('metalness' in m) m.metalness = 0;
          if ('roughness' in m) m.roughness = 0.94;
          if ('toneMapped' in m) m.toneMapped = false;
          if ('transparent' in m) m.transparent = false;
          if ('opacity' in m) m.opacity = 1;
          if ('side' in m) m.side = eng.T.DoubleSide;
          if ('emissive' in m && m.emissive && m.map) {
            m.emissive.setRGB(1, 1, 1);
            if ('emissiveMap' in m) m.emissiveMap = m.map;
            m.emissiveIntensity = Math.max(m.emissiveIntensity || 0, 0.28);
          }
          return m;
        }

        if ('map' in m) m.map = null;
        if ('normalMap' in m) m.normalMap = null;
        if ('roughnessMap' in m) m.roughnessMap = null;
        if ('metalnessMap' in m) m.metalnessMap = null;

        if ('color' in m && m.color) soften(m.color, isGlass ? glassTint : coolGray, isGlass ? 0.58 : 0.52);

        if (isGlass) {
          if ('color' in m && m.color) m.color.lerp(glassTint, 0.72);
          m.transparent = true;
          m.opacity = 0.18;
          m.depthWrite = false;
          if ('transmission' in m) m.transmission = Math.max(m.transmission || 0, 0.74);
          if ('roughness' in m) m.roughness = 0.18;
          if ('metalness' in m) m.metalness = 0.02;
          if ('ior' in m) m.ior = Math.max(m.ior || 1.3, 1.42);
        } else {
          if (forceOpaqueDevice && 'color' in m && m.color && normalizedName.includes('立方体016')) {
            m.color.set(0xd8d4bd);
          }
          if (forceOpaqueDevice && 'color' in m && m.color && normalizedName.includes('立方体032')) {
            m.color.set(0x050505);
          }
          if (forceOpaqueDevice && 'transparent' in m) m.transparent = false;
          if (forceOpaqueDevice && 'opacity' in m) m.opacity = 1;
          if (forceOpaqueDevice && 'depthWrite' in m) m.depthWrite = true;
          if ('metalness' in m) m.metalness = clamp(m.metalness ?? 0.18, 0.08, 0.28);
          if ('roughness' in m) m.roughness = clamp(m.roughness ?? 0.58, 0.42, 0.78);
          if ('emissive' in m && m.emissive) {
            m.emissive.setRGB(0.03, 0.05, 0.07);
            m.emissiveIntensity = Math.max(m.emissiveIntensity || 0, 0.08);
          }
        }

        return m;
      };

      obj.material = Array.isArray(obj.material) ? obj.material.map(patch) : patch(obj.material);
    });
  }
  function suppressCenterOccluder(root) {
    const T = eng.T;
    const globalBox = new T.Box3().setFromObject(root);
    const globalSize = globalBox.getSize(new T.Vector3());
    const globalCenter = globalBox.getCenter(new T.Vector3());

    const targets = [];

    root.traverse((obj) => {
      if (!obj.isMesh) return;

      const box = new T.Box3().setFromObject(obj);
      if (box.isEmpty()) return;
      const s = box.getSize(new T.Vector3());
      const c = box.getCenter(new T.Vector3());

      const nearCenter =
        Math.abs(c.x - globalCenter.x) < globalSize.x * 0.18 &&
        Math.abs(c.z - globalCenter.z) < globalSize.z * 0.18;

      const tallEnough = s.y > globalSize.y * 0.62;
      const slimEnough = s.x < globalSize.x * 0.25 && s.z < globalSize.z * 0.25;
      const elongated = s.y > s.x * 2.8 && s.y > s.z * 2.8;
      const centralDarkSlab =
        nearCenter &&
        s.y > globalSize.y * 0.08 &&
        (
          (s.z > globalSize.z * 0.34 && s.x < globalSize.x * 0.22) ||
          (s.x > globalSize.x * 0.34 && s.z < globalSize.z * 0.22)
        );

      const veryDark = (() => {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        return mats.some((m) => m?.color && (m.color.r + m.color.g + m.color.b) < 0.12);
      })();

      if ((nearCenter && tallEnough && slimEnough && elongated && veryDark) || (centralDarkSlab && veryDark)) {
        targets.push(obj);
      }
    });

    targets.forEach((mesh) => {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        if (!m) return;
        m.transparent = true;
        m.opacity = 0.0;
        m.depthWrite = false;
        m.depthTest = false;
      });
      mesh.visible = false;
      mesh.renderOrder = -10;
    });
  }
  function fitCamera(obj, k) {
    const T = eng.T;
    const box = new T.Box3().setFromObject(obj);
    const size = box.getSize(new T.Vector3());
    const c = box.getCenter(new T.Vector3());
    const max = Math.max(size.x, size.y, size.z);
    if (!Number.isFinite(max) || max <= 0) return;

    const fov = eng.camera.fov * Math.PI / 180;
    const d = (max / (2 * Math.tan(fov / 2))) * k;
    eng.camera.position.set(c.x, c.y + max * 0.24, c.z - d);
    eng.controls.target.set(c.x, c.y + max * 0.12, c.z + max * 0.02);
    eng.controls.update();
  }

  function normNodeName(name) {
    return (name || '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, '');
  }

  function nameEquals(objOrName, value) {
    if (typeof objOrName === 'string') return normNodeName(objOrName) === normNodeName(value);
    const key = normNodeName(value);
    return [objOrName?.name, objOrName?.geometry?.name, objOrName?.userData?.name]
      .some((name) => normNodeName(name) === key);
  }

  function nameHasAny(objOrName, tokens) {
    const names = typeof objOrName === 'string'
      ? [objOrName]
      : [objOrName?.name, objOrName?.geometry?.name, objOrName?.userData?.name];
    const normalized = names.map(normNodeName).filter(Boolean);
    if (!normalized.length) return false;
    return tokens.some((t) => {
      const token = normNodeName(t);
      return token && normalized.some((name) => name.includes(token));
    });
  }

  function findExact(root, name) {
    const key = normNodeName(name);
    let out = null;
    root.traverse((o) => {
      if (out || !o.name) return;
      if (normNodeName(o.name) === key) out = o;
    });
    return out;
  }

  function findAnyExact(root, names) {
    for (const name of names) {
      const hit = findExact(root, name);
      if (hit) return hit;
    }
    return null;
  }

  function findAllExact(root, names) {
    const out = [];
    const keys = new Set(names.map((n) => normNodeName(n)));
    root.traverse((o) => {
      if (!o.name) return;
      if (keys.has(normNodeName(o.name))) out.push(o);
    });
    return out;
  }

  function findAllByTokens(root, tokens) {
    const out = [];
    root.traverse((o) => {
      if (!o.name) return;
      if (nameHasAny(o, tokens)) out.push(o);
    });
    return out;
  }

  function objectVolume(obj) {
    const b = new eng.T.Box3().setFromObject(obj);
    if (b.isEmpty()) return 0;
    const s = b.getSize(new eng.T.Vector3());
    return s.x * s.y * s.z;
  }

  function pickLargestByObjects(arr) {
    if (!arr?.length) return null;
    let best = arr[0];
    let bestV = objectVolume(best);
    for (let i = 1; i < arr.length; i++) {
      const v = objectVolume(arr[i]);
      if (v > bestV) {
        best = arr[i];
        bestV = v;
      }
    }
    return best;
  }

  function pickLargestByNames(root, names) {
    return pickLargestByObjects(findAllExact(root, names));
  }
  function boxCenter(obj) {
    return new eng.T.Box3().setFromObject(obj).getCenter(new eng.T.Vector3());
  }

  function dominantFaceArea(box, axis) {
    const size = box.getSize(new eng.T.Vector3());
    if (axis === 'x') return size.y * size.z;
    if (axis === 'y') return size.x * size.z;
    return size.x * size.y;
  }

  function plateScoreFromBox(box) {
    const size = box.getSize(new eng.T.Vector3());
    const dims = [size.x, size.y, size.z].sort((left, right) => left - right);
    const thickness = Math.max(dims[0], 1e-4);
    const span = Math.max(dims[2], 1e-4);
    const faceArea = dims[1] * dims[2];
    return (faceArea / thickness) / span;
  }

  function majorAxisFromVector(vector) {
    const absX = Math.abs(vector.x);
    const absY = Math.abs(vector.y);
    const absZ = Math.abs(vector.z);
    if (absX >= absY && absX >= absZ) return 'x';
    if (absY >= absX && absY >= absZ) return 'y';
    return 'z';
  }

  function axisVector(axis) {
    if (axis === 'y') return new eng.T.Vector3(0, 1, 0);
    if (axis === 'z') return new eng.T.Vector3(0, 0, 1);
    return new eng.T.Vector3(1, 0, 0);
  }

  function pickRegionMesh(root, accept, scoreFn = (_obj, _box, _center, size) => size.x * size.y * size.z) {
    let best = null;
    let bestScore = -Infinity;
    root.traverse((obj) => {
      if (!obj.isMesh) return;
      const box = new eng.T.Box3().setFromObject(obj);
      if (box.isEmpty()) return;
      const center = box.getCenter(new eng.T.Vector3());
      const size = box.getSize(new eng.T.Vector3());
      if (!accept(obj, box, center, size)) return;
      const score = scoreFn(obj, box, center, size);
      if (score > bestScore) {
        bestScore = score;
        best = obj;
      }
    });
    return best;
  }

  function pickPlateMesh(node, chamberCenter = null) {
    const T = eng.T;
    if (!node) return null;

    const meshes = [];
    node.traverse?.((obj) => {
      if (obj?.isMesh) meshes.push(obj);
    });
    if (!meshes.length) return null;

    let best = null;
    let bestScore = -Infinity;
    for (const mesh of meshes) {
      const box = new T.Box3().setFromObject(mesh);
      if (box.isEmpty()) continue;
      const scoreBase = plateScoreFromBox(box);
      const center = box.getCenter(new T.Vector3());
      let score = scoreBase;
      if (nameHasAny(mesh, ['鐢垫瀬', '鏋佹澘', 'electrode', 'plate'])) score *= 1.4;
      if (chamberCenter) score -= center.distanceTo(chamberCenter) * 0.08;
      if (score > bestScore) {
        bestScore = score;
        best = mesh;
      }
    }
    return best;
  }

  function sphereScoreFromSize(size) {
    const dims = [Math.max(size.x, 1e-4), Math.max(size.y, 1e-4), Math.max(size.z, 1e-4)].sort((a, b) => a - b);
    const roundness = dims[0] / dims[2];
    const balance = dims[1] / dims[2];
    const avgSpan = (dims[0] + dims[1] + dims[2]) / 3;
    return roundness * 1.9 + balance * 1.35 + avgSpan * 0.45;
  }

  function isSphereLikeObject(obj) {
    if (!obj) return false;
    const size = new eng.T.Box3().setFromObject(obj).getSize(new eng.T.Vector3());
    const dims = [Math.max(size.x, 1e-4), Math.max(size.y, 1e-4), Math.max(size.z, 1e-4)].sort((a, b) => a - b);
    return dims[0] / dims[2] >= 0.52 && dims[1] / dims[2] >= 0.7;
  }

  function pickSpherePair(root) {
    const T = eng.T;
    if (!root) return null;

    const rootBox = new T.Box3().setFromObject(root);
    if (rootBox.isEmpty()) return null;
    const rootCenter = rootBox.getCenter(new T.Vector3());
    const candidates = [];

    root.traverse?.((obj) => {
      if (!obj?.isMesh) return;
      const box = new T.Box3().setFromObject(obj);
      if (box.isEmpty()) return;
      const size = box.getSize(new T.Vector3());
      const dims = [size.x, size.y, size.z].sort((a, b) => a - b);
      const roundness = dims[0] / Math.max(dims[2], 1e-4);
      const balance = dims[1] / Math.max(dims[2], 1e-4);
      const volume = dims[0] * dims[1] * dims[2];
      if (roundness < 0.56 || balance < 0.72 || volume < 2.5e-4) return;

      let score = sphereScoreFromSize(size);
      if (nameHasAny(obj, ['球', 'sphere', 'ball'])) score *= 1.35;

      candidates.push({
        obj,
        center: box.getCenter(new T.Vector3()),
        size,
        score,
      });
    });

    if (candidates.length < 2) return null;

    const ranges = {
      x: Math.max(...candidates.map((c) => c.center.x)) - Math.min(...candidates.map((c) => c.center.x)),
      y: Math.max(...candidates.map((c) => c.center.y)) - Math.min(...candidates.map((c) => c.center.y)),
      z: Math.max(...candidates.map((c) => c.center.z)) - Math.min(...candidates.map((c) => c.center.z)),
    };
    const axis =
      ranges.x >= ranges.y && ranges.x >= ranges.z ? 'x' :
      ranges.y >= ranges.x && ranges.y >= ranges.z ? 'y' :
      'z';
    const axisCenter = rootCenter[axis];

    let bestPair = null;
    let bestPairScore = -Infinity;
    for (let i = 0; i < candidates.length - 1; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        let left = candidates[i];
        let right = candidates[j];
        if (left.center[axis] > right.center[axis]) [left, right] = [right, left];

        const separation = Math.abs(right.center[axis] - left.center[axis]);
        if (separation < Math.max(ranges[axis] * 0.12, 0.02)) continue;

        const sizeMismatch = left.size.distanceTo(right.size);
        const sideBias =
          (left.center[axis] <= axisCenter ? 0.22 : 0) +
          (right.center[axis] >= axisCenter ? 0.22 : 0);
        const pairScore = separation * 3.2 + Math.min(left.score, right.score) * 1.8 - sizeMismatch * 2.4 + sideBias;

        if (pairScore > bestPairScore) {
          bestPairScore = pairScore;
          bestPair = { left: left.obj, right: right.obj };
        }
      }
    }

    return bestPair;
  }

  function buildFacingPlateAnchors(leftNode, rightNode, chamberBox = null) {
    const T = eng.T;
    const chamberCenter = chamberBox ? chamberBox.getCenter(new T.Vector3()) : null;
    const leftMesh = pickPlateMesh(leftNode, chamberCenter) || leftNode;
    const rightMesh = pickPlateMesh(rightNode, chamberCenter) || rightNode;

    const leftBox = new T.Box3().setFromObject(leftMesh);
    const rightBox = new T.Box3().setFromObject(rightMesh);
    if (leftBox.isEmpty() || rightBox.isEmpty()) return null;

    const leftCenter = leftBox.getCenter(new T.Vector3());
    const rightCenter = rightBox.getCenter(new T.Vector3());
    const delta = new T.Vector3().subVectors(rightCenter, leftCenter);
    const axis = majorAxisFromVector(delta);
    const sign = delta[axis] >= 0 ? 1 : -1;

    const a = new T.Vector3();
    const b = new T.Vector3();
    const otherAxes = ['x', 'y', 'z'].filter((key) => key !== axis);
    const overlaps = {};

    otherAxes.forEach((key) => {
      const overlapMin = Math.max(leftBox.min[key], rightBox.min[key]);
      const overlapMax = Math.min(leftBox.max[key], rightBox.max[key]);
      overlaps[key] = Math.max(0, overlapMax - overlapMin);
    });

    const leftTip = electrodeTipToward(leftMesh, rightCenter);
    const rightTip = electrodeTipToward(rightMesh, leftCenter);
    const tipAdjusted = !!(leftTip && rightTip && Number.isFinite(leftTip[axis]) && Number.isFinite(rightTip[axis]));

    if (tipAdjusted) {
      const tipMid = new T.Vector3().addVectors(leftTip, rightTip).multiplyScalar(0.5);
      const upperBandY = Math.min(leftBox.max.y, rightBox.max.y) - Math.max((overlaps.y || 0.26) * 0.025, 0.002);
      const chamberLimit = chamberBox
        ? chamberBox.max.y - Math.max((chamberBox.max.y - chamberBox.min.y) * 0.06, 0.12)
        : upperBandY + DISCHARGE_VERTICAL_LIFT;
      const liftedBandY = Math.max(upperBandY, Math.min(upperBandY + DISCHARGE_VERTICAL_LIFT, chamberLimit));
      a.copy(leftTip);
      b.copy(rightTip);
      otherAxes.forEach((key) => {
        const anchoredValue = key === 'y' ? liftedBandY : tipMid[key];
        a[key] = anchoredValue;
        b[key] = anchoredValue;
      });
    } else {
      if (sign >= 0) {
        a[axis] = leftBox.max[axis];
        b[axis] = rightBox.min[axis];
      } else {
        a[axis] = leftBox.min[axis];
        b[axis] = rightBox.max[axis];
      }

      otherAxes.forEach((key) => {
        const overlapMin = Math.max(leftBox.min[key], rightBox.min[key]);
        const overlapMax = Math.min(leftBox.max[key], rightBox.max[key]);
        const centerValue = overlaps[key] > 0
          ? (overlapMin + overlapMax) / 2
          : (leftCenter[key] + rightCenter[key]) / 2;
        a[key] = centerValue;
        b[key] = centerValue;
      });
    }

    let heightAxis = otherAxes[0];
    let depthAxis = otherAxes[1] || otherAxes[0];
    if (otherAxes.includes('y')) {
      heightAxis = 'y';
      depthAxis = otherAxes.find((key) => key !== 'y') || otherAxes[0];
    } else if ((overlaps[otherAxes[1]] || 0) > (overlaps[otherAxes[0]] || 0)) {
      heightAxis = otherAxes[1];
      depthAxis = otherAxes[0];
    }

    if (tipAdjusted && chamberBox && chamberCenter && depthAxis) {
      const chamberSpan = Math.max(chamberBox.max[depthAxis] - chamberBox.min[depthAxis], 1e-4);
      const currentMid = (a[depthAxis] + b[depthAxis]) / 2;
      const centerPull = (chamberCenter[depthAxis] - currentMid) * 0.68;
      const minShift = chamberSpan * 0.045;
      const maxShift = chamberSpan * 0.22;
      const lateralShift = Math.abs(centerPull) > 1e-4
        ? Math.sign(centerPull) * clamp(Math.abs(centerPull), minShift, maxShift)
        : -minShift;
      a[depthAxis] += lateralShift;
      b[depthAxis] += lateralShift;
    }

    const frontA = a.clone();
    const frontB = b.clone();
    if (sign >= 0) {
      frontA[axis] = leftBox.max[axis];
      frontB[axis] = rightBox.min[axis];
    } else {
      frontA[axis] = leftBox.min[axis];
      frontB[axis] = rightBox.max[axis];
    }

    let leftInset = 0;
    let rightInset = 0;
    const anchorA = a.clone();
    const anchorB = b.clone();
    const span = new T.Vector3().subVectors(anchorB, anchorA);
    const spanLength = span.length();
    if (spanLength > 1e-5) {
      const endInset = clamp(spanLength * (tipAdjusted ? 0.028 : 0.016), 0.002, tipAdjusted ? 0.012 : 0.008);
      const insetDir = span.multiplyScalar(1 / spanLength);
      const faceExtend = tipAdjusted ? clamp(spanLength * 0.022, 0.004, 0.012) : clamp(spanLength * 0.008, 0.001, 0.004);
      const rightRelax = tipAdjusted ? Math.min(faceExtend * 0.16, 0.004) : 0;
      anchorA.addScaledVector(insetDir, endInset - faceExtend);
      anchorB.addScaledVector(insetDir, -(endInset - faceExtend + rightRelax));

      let faceDir = frontB.clone().sub(frontA);
      if (faceDir.lengthSq() < 1e-8) faceDir = anchorB.clone().sub(anchorA);
      if (faceDir.lengthSq() < 1e-8) faceDir = axisVector(axis);
      faceDir.normalize();

      leftInset = anchorA.clone().sub(frontA).dot(faceDir);
      rightInset = frontB.clone().sub(anchorB).dot(faceDir);
    }

    a.copy(anchorA);
    b.copy(anchorB);

    return {
      a,
      b,
      axis,
      leftMesh,
      rightMesh,
      leftSize: leftBox.getSize(new T.Vector3()),
      rightSize: rightBox.getSize(new T.Vector3()),
      frontA,
      frontB,
      leftInset,
      rightInset,
      height: tipAdjusted ? Math.max((overlaps[heightAxis] || 0.26) * 0.14, 0.08) : Math.max(overlaps[heightAxis] || 0.26, 0.26),
      width: tipAdjusted ? Math.max((overlaps[depthAxis] || 0.08) * 0.12, 0.022) : Math.max((overlaps[depthAxis] || 0.08) * 0.26, 0.04),
      up: axisVector(heightAxis),
      depth: axisVector(depthAxis),
    };
  }

  function buildCenteredPlateFrame(leftNode, rightNode, chamberBox = null) {
    const T = eng.T;
    const chamberCenter = chamberBox ? chamberBox.getCenter(new T.Vector3()) : null;
    const leftMesh = pickPlateMesh(leftNode, chamberCenter) || leftNode;
    const rightMesh = pickPlateMesh(rightNode, chamberCenter) || rightNode;

    const leftBox = new T.Box3().setFromObject(leftMesh);
    const rightBox = new T.Box3().setFromObject(rightMesh);
    if (leftBox.isEmpty() || rightBox.isEmpty()) return null;

    const leftCenter = leftBox.getCenter(new T.Vector3());
    const rightCenter = rightBox.getCenter(new T.Vector3());
    const delta = new T.Vector3().subVectors(rightCenter, leftCenter);
    const axis = majorAxisFromVector(delta);
    const sign = delta[axis] >= 0 ? 1 : -1;
    const otherAxes = ['x', 'y', 'z'].filter((key) => key !== axis);
    const overlaps = {};

    const a = leftCenter.clone();
    const b = rightCenter.clone();
    a[axis] = sign >= 0 ? leftBox.max[axis] : leftBox.min[axis];
    b[axis] = sign >= 0 ? rightBox.min[axis] : rightBox.max[axis];

    otherAxes.forEach((key) => {
      const overlapMin = Math.max(leftBox.min[key], rightBox.min[key]);
      const overlapMax = Math.min(leftBox.max[key], rightBox.max[key]);
      const overlap = Math.max(0, overlapMax - overlapMin);
      overlaps[key] = overlap;
      const centerValue = overlap > 0
        ? (overlapMin + overlapMax) / 2
        : (leftCenter[key] + rightCenter[key]) / 2;
      a[key] = centerValue;
      b[key] = centerValue;
    });

    let heightAxis = otherAxes.includes('y') ? 'y' : otherAxes[0];
    let depthAxis = otherAxes.find((key) => key !== heightAxis) || otherAxes[0];
    if (!otherAxes.includes('y') && (overlaps[otherAxes[1]] || 0) > (overlaps[otherAxes[0]] || 0)) {
      heightAxis = otherAxes[1];
      depthAxis = otherAxes[0];
    }

    const frontA = a.clone();
    const frontB = b.clone();
    const axisDir = axisVector(axis).multiplyScalar(sign);
    const span = Math.max(frontA.distanceTo(frontB), 1e-5);
    const inset = clamp(span * 0.006, 0.001, 0.003);
    a.addScaledVector(axisDir, inset);
    b.addScaledVector(axisDir, -inset);

    return {
      a,
      b,
      axis,
      leftMesh,
      rightMesh,
      leftSize: leftBox.getSize(new T.Vector3()),
      rightSize: rightBox.getSize(new T.Vector3()),
      frontA,
      frontB,
      leftInset: a.clone().sub(frontA).dot(axisDir),
      rightInset: frontB.clone().sub(b).dot(axisDir),
      height: clamp(overlaps[heightAxis] || 0.16, 0.08, 0.28),
      width: clamp((overlaps[depthAxis] || 0.08) * 0.42, 0.04, 0.14),
      up: axisVector(heightAxis),
      depth: axisVector(depthAxis),
    };
  }

  function findCenteredPlatePairFrame(root, chamberBox) {
    if (!root || !chamberBox) return null;
    const T = eng.T;
    const vacCenter = chamberBox.getCenter(new T.Vector3());
    const vacSize = chamberBox.getSize(new T.Vector3());
    const candidates = [];

    root.traverse((o) => {
      if (!o?.isMesh) return;
      if (nameHasAny(o, [
        '\u4e3b\u7535\u6e90', '\u7535\u673a\u63a7\u5236', '\u771f\u7a7a\u7f69', '\u63a2\u9488',
        'mainpower', 'motor', 'vacuum', 'probe'
      ])) return;

      const box = new T.Box3().setFromObject(o);
      if (box.isEmpty()) return;
      const s = box.getSize(new T.Vector3());
      const p = box.getCenter(new T.Vector3());
      const inCore =
        p.x > chamberBox.min.x + vacSize.x * 0.16 &&
        p.x < chamberBox.max.x - vacSize.x * 0.16 &&
        p.y > chamberBox.min.y + vacSize.y * 0.42 &&
        p.y < chamberBox.max.y - vacSize.y * 0.08 &&
        p.z > chamberBox.min.z + vacSize.z * 0.14 &&
        p.z < chamberBox.max.z - vacSize.z * 0.14;
      const centeredPlate =
        s.x > vacSize.x * 0.045 &&
        s.x < vacSize.x * 0.18 &&
        s.y > vacSize.y * 0.18 &&
        s.y < vacSize.y * 0.42 &&
        s.z > vacSize.z * 0.045 &&
        s.z < vacSize.z * 0.18 &&
        plateScoreFromBox(box) > 0.85;

      if (inCore && centeredPlate) candidates.push({ o, p });
    });

    let bestPair = null;
    let bestScore = -Infinity;
    for (let i = 0; i < candidates.length; i += 1) {
      for (let j = i + 1; j < candidates.length; j += 1) {
        const a = candidates[i];
        const b = candidates[j];
        const dx = Math.abs(a.p.x - b.p.x);
        const dy = Math.abs(a.p.y - b.p.y);
        const dz = Math.abs(a.p.z - b.p.z);
        if (dx < vacSize.x * 0.18 || dx > vacSize.x * 0.62) continue;
        if (dy > vacSize.y * 0.08 || dz > vacSize.z * 0.16) continue;

        const mid = a.p.clone().add(b.p).multiplyScalar(0.5);
        const centerPenalty = mid.distanceTo(vacCenter);
        const yNorm = clamp((mid.y - chamberBox.min.y) / Math.max(vacSize.y, 1e-6), 0, 1);
        const score = dx * 3.4 - dy * 2.0 - dz * 1.5 - centerPenalty * 1.1 + yNorm * 0.65;
        if (score > bestScore) {
          bestScore = score;
          bestPair = [a, b];
        }
      }
    }

    if (!bestPair) return null;
    const [a, b] = bestPair;
    const left = a.p.x <= b.p.x ? a : b;
    const right = left === a ? b : a;
    const frame = buildCenteredPlateFrame(left.o, right.o, chamberBox);
    if (!frame) return null;
    return { frame, left: left.o, right: right.o };
  }

  function electrodeTipToward(mesh, towardWorld) {
    const T = eng.T;
    if (!mesh?.isMesh || !mesh.geometry?.attributes?.position) {
      return boxCenter(mesh);
    }

    const bb = new T.Box3().setFromObject(mesh);
    const s = bb.getSize(new T.Vector3());
    const minY = bb.min.y + s.y * 0.58;

    const pos = mesh.geometry.attributes.position;
    const v = new T.Vector3();
    let best = null;
    let bestScore = Infinity;

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      if (v.y < minY) continue;
      const d = v.distanceTo(towardWorld);
      const score = d + (bb.max.y - v.y) * 0.22;
      if (score < bestScore) {
        bestScore = score;
        best = v.clone();
      }
    }

    return best || boxCenter(mesh);
  }

  function electrodeDischargeCenter(node, chamberCenter = null, chamberBox = null) {
    const T = eng.T;
    if (!node) return new T.Vector3();

    const meshes = [];
    node.traverse?.((o) => {
      if (o?.isMesh) meshes.push(o);
    });

    if (!meshes.length) return boxCenter(node);

    const chamberSize = chamberBox ? chamberBox.getSize(new T.Vector3()) : null;
    const toward = chamberCenter || boxCenter(node);

    let bestCenter = null;
    let bestScore = -Infinity;
    for (const mesh of meshes) {
      const box = new T.Box3().setFromObject(mesh);
      if (box.isEmpty()) continue;

      const center = box.getCenter(new T.Vector3());
      const candidate = electrodeTipToward(mesh, toward);
      const size = box.getSize(new T.Vector3());
      const dims = [size.x, size.y, size.z].sort((a, b) => a - b);

      const thickness = Math.max(dims[0], 1e-4);
      const wideA = Math.max(dims[1], 1e-4);
      const wideB = Math.max(dims[2], 1e-4);
      const area = wideA * wideB;
      const thinness = wideA / thickness;
      const isotropy = 1 - Math.min(Math.abs(wideB - wideA) / Math.max(wideB, 1e-4), 1);
      const rodPenalty = clamp(wideB / Math.max(wideA, 1e-4), 1, 6);

      let score = area * (0.4 + 0.95 * thinness) * (0.45 + isotropy * 1.85) / (0.9 + rodPenalty * 0.55);
      if (nameHasAny(mesh, ['\u7535\u6781', '\u6781\u677f', 'electrode', 'plate'])) score *= 1.45;

      if (chamberCenter) score -= candidate.distanceTo(chamberCenter) * 0.08;
      if (chamberBox && chamberSize) {
        const yNorm = (candidate.y - chamberBox.min.y) / Math.max(chamberSize.y, 1e-6);
        score *= 0.84 + 0.72 * clamp(yNorm, 0, 1);
        if (yNorm < 0.52) score *= 0.38;
      }

      if (score > bestScore) {
        bestScore = score;
        bestCenter = candidate.clone();
      }
    }

    const out = bestCenter || boxCenter(node);
    if (chamberBox && chamberSize) {
      const topBias = Math.min(
        chamberBox.min.y + chamberSize.y * 0.9 + DISCHARGE_VERTICAL_LIFT,
        chamberBox.max.y - Math.max(chamberSize.y * 0.06, 0.12)
      );
      out.y = Math.max(out.y, topBias);
      const lift = Math.max(chamberSize.y * 0.012, 0.02);
      out.y = Math.min(out.y + lift, chamberBox.max.y - chamberSize.y * 0.09);
    }
    return out;
  }

  function rootLevelMovableNode(node, root) {
    let current = node;
    while (current?.parent && current.parent !== root) current = current.parent;
    return current && current !== root ? current : node;
  }

  function collectGapMotionNodes(root, chamberBox, frontA, frontB, leftNode = null, rightNode = null) {
    const T = eng.T;
    if (!root || !chamberBox || !frontA || !frontB) return { left: [], right: [] };

    const axis = frontB.clone().sub(frontA);
    const span = Math.max(axis.length(), 1e-5);
    axis.normalize();

    const center = frontA.clone().add(frontB).multiplyScalar(0.5);
    const chamberSize = chamberBox.getSize(new T.Vector3());
    const chamberCenter = chamberBox.getCenter(new T.Vector3());
    const chamberRadius = Math.max(chamberSize.x, chamberSize.z) * 0.5;
    const minProj = Math.max(span * 0.15, 0.014);
    const maxOffAxis = Math.max(chamberSize.y * 0.38, chamberSize.z * 0.18, span * 0.7);
    const maxNear = Math.max(span * 1.45, chamberSize.y * 0.55, chamberSize.z * 0.28);
    const skipTokens = ['point', '\u6587\u672c', '\u5e73\u9762', 'vacuum', '\u771f\u7a7a', 'mainpower', '\u4e3b\u7535\u6e90', 'motor', '\u7535\u673a\u63a7\u5236', 'probe', '\u63a2\u9488', '\u67f1\u4f53042'];
    const left = [];
    const right = [];
    const seen = new Set();
    const centerProj = center.dot(axis);

    const axisRangeForBox = (box) => {
      const pts = [];
      for (const x of [box.min.x, box.max.x]) {
        for (const y of [box.min.y, box.max.y]) {
          for (const z of [box.min.z, box.max.z]) {
            pts.push(new T.Vector3(x, y, z).dot(axis));
          }
        }
      }
      return { min: Math.min(...pts), max: Math.max(...pts) };
    };

    const isFixedMotorBase = (box, size, itemCenter) => {
      const axisRange = axisRangeForBox(box);
      const axisSpan = axisRange.max - axisRange.min;
      const crossesCenter = axisRange.min < centerProj && axisRange.max > centerProj;
      const lowRail =
        itemCenter.y < chamberBox.min.y + chamberSize.y * 0.18 &&
        size.y <= chamberSize.y * 0.24;
      const longAcrossGap = axisSpan > Math.max(span * 0.85, chamberSize.x * 0.2);
      const central =
        Math.abs(itemCenter.clone().sub(center).dot(axis)) < Math.max(span * 0.55, chamberSize.x * 0.08);
      return lowRail && crossesCenter && longAcrossGap && central;
    };

    const isFixedProbePart = (box, size, itemCenter, name = '') => {
      if (nameHasAny({ name }, ['probe', '\u63a2\u9488', '\u67f1\u4f53.022', '\u67f1\u4f53.023', '\u67f1\u4f53.024', '\u7acb\u65b9\u4f53.010'])) {
        return true;
      }
      const relAxis = Math.abs(itemCenter.clone().sub(center).dot(axis));
      const centralBand = relAxis < Math.max(span * 0.36, chamberSize.x * 0.1, 0.2);
      const nearProbeHeight =
        itemCenter.y > chamberBox.min.y - chamberSize.y * 0.24 &&
        itemCenter.y < chamberBox.max.y + chamberSize.y * 0.1;
      const maxDim = Math.max(size.x, size.y, size.z);
      const minDim = Math.max(Math.min(size.x, size.y, size.z), 1e-4);
      const radial = Math.max(size.x, size.z, 1e-4);
      const needleLike =
        maxDim < Math.max(chamberSize.y * 0.46, 0.38) &&
        (
          minDim < Math.max(chamberSize.y * 0.018, 0.018) ||
          size.y > radial * 1.45 ||
          (size.x < Math.max(chamberSize.x * 0.045, 0.08) && size.z < Math.max(chamberSize.z * 0.045, 0.08)) ||
          (size.y < chamberSize.y * 0.05 && maxDim < Math.max(chamberSize.y * 0.18, 0.16))
        );
      const smallProbeBracket =
        maxDim < Math.max(chamberSize.y * 0.32, 0.3) &&
        size.y < Math.max(chamberSize.y * 0.18, 0.18) &&
        centralBand;
      const centralProbeColumn =
        centralBand &&
        size.y < Math.max(chamberSize.y * 0.42, 0.42) &&
        radial < Math.max(chamberSize.y * 0.16, 0.18) &&
        itemCenter.y < center.y + chamberSize.y * 0.12;
      return nearProbeHeight && centralBand && (needleLike || smallProbeBracket || centralProbeColumn);
    };

    const isFixedChamberWallHardware = (box, size, itemCenter, name = '') => {
      const namedWallPart = nameHasAny({ name }, [
        'flange', 'port', 'viewport', 'window', 'valve', 'knob', 'control', 'instrument', 'sensor',
        '\u6cd5\u5170', '\u63a5\u53e3', '\u89c6\u7a97', '\u89c2\u5bdf\u7a97', '\u9600', '\u6c14\u5634', '\u63a5\u5934',
        '\u65cb\u94ae', '\u63a7\u5236', '\u4eea\u5668', '\u4f20\u611f\u5668'
      ]);
      const radialFromChamber = Math.hypot(itemCenter.x - chamberCenter.x, itemCenter.z - chamberCenter.z);
      const nearWall = radialFromChamber > chamberRadius * 0.62;
      const peripheralCandidate = radialFromChamber > chamberRadius * 0.54;
      if (!nearWall && !peripheralCandidate && !namedWallPart) return false;

      const rel = itemCenter.clone().sub(center);
      const proj = rel.dot(axis);
      const axisPoint = center.clone().addScaledVector(axis, proj);
      const offAxis = itemCenter.distanceTo(axisPoint);
      const axisRange = axisRangeForBox(box);
      const axisSpan = axisRange.max - axisRange.min;
      const maxDim = Math.max(size.x, size.y, size.z);
      const horizontalSpan = Math.max(size.x, size.z);
      const verticalBand =
        itemCenter.y > chamberBox.min.y + chamberSize.y * 0.08 &&
        itemCenter.y < chamberBox.max.y + chamberSize.y * 0.02;
      const awayFromMotionLane =
        offAxis > Math.max(maxOffAxis * 0.86, chamberRadius * 0.24) ||
        Math.abs(proj) > Math.max(span * 1.2, chamberRadius * 0.46);
      const peripheralControl =
        radialFromChamber > chamberRadius * 0.54 &&
        offAxis > Math.max(maxOffAxis * 0.58, chamberRadius * 0.16) &&
        Math.abs(proj) > Math.max(span * 0.46, chamberRadius * 0.2);
      const compactWallPart =
        maxDim < Math.max(chamberRadius * 0.72, chamberSize.y * 0.8, 0.9) &&
        horizontalSpan < Math.max(chamberRadius * 0.58, span * 1.8, 0.9) &&
        axisSpan < Math.max(chamberRadius * 0.62, span * 1.7, 0.9);

      return verticalBand && compactWallPart && (namedWallPart || awayFromMotionLane || peripheralControl);
    };

    const addNode = (bucket, node) => {
      const movable = node;
      if (!movable || movable === root || seen.has(movable)) return;
      seen.add(movable);
      bucket.push({ node: movable, baseWorld: movable.getWorldPosition(new T.Vector3()) });
    };

    addNode(left, leftNode);
    addNode(right, rightNode);

    root.traverse((child) => {
      if (!child?.isObject3D || child === root || seen.has(child)) return;
      if (!child.isMesh && child.children?.length) return;

      const lowerName = (child.name || '').toLowerCase();
      if (skipTokens.some((token) => lowerName.includes(token.toLowerCase()))) return;

      const box = new T.Box3().setFromObject(child);
      if (box.isEmpty()) return;

      const childCenter = box.getCenter(new T.Vector3());
      const childSize = box.getSize(new T.Vector3());
      if (isFixedMotorBase(box, childSize, childCenter)) return;
      if (isFixedProbePart(box, childSize, childCenter, child.name || '')) return;
      if (isFixedChamberWallHardware(box, childSize, childCenter, child.name || '')) return;
      const inside =
        childCenter.x > chamberBox.min.x - chamberSize.x * 0.02 &&
        childCenter.x < chamberBox.max.x + chamberSize.x * 0.02 &&
        childCenter.y > chamberBox.min.y - chamberSize.y * 0.04 &&
        childCenter.y < chamberBox.max.y - chamberSize.y * 0.02 &&
        childCenter.z > chamberBox.min.z - chamberSize.z * 0.02 &&
        childCenter.z < chamberBox.max.z + chamberSize.z * 0.02;

      const rel = childCenter.clone().sub(center);
      const proj = rel.dot(axis);
      if (Math.abs(proj) < minProj) return;

      const axisPoint = center.clone().addScaledVector(axis, proj);
      const offAxis = childCenter.distanceTo(axisPoint);
      const leftNear = childCenter.distanceTo(frontA);
      const rightNear = childCenter.distanceTo(frontB);
      const near = Math.min(leftNear, rightNear);
      const supportBelowChamber =
        childCenter.y > chamberBox.min.y - chamberSize.y * 0.28 &&
        childCenter.y < chamberBox.min.y + chamberSize.y * 0.42 &&
        offAxis <= maxOffAxis * 1.1 &&
        near <= Math.max(maxNear * 1.28, chamberSize.y * 0.78);
      if (!inside && !supportBelowChamber) return;
      if (offAxis > maxOffAxis && !supportBelowChamber) return;
      if (near > maxNear && !supportBelowChamber) return;

      const maxDim = Math.max(childSize.x, childSize.y, childSize.z);
      const rectangularSliderBase =
        supportBelowChamber &&
        childSize.y <= chamberSize.y * 0.16 &&
        childSize.x <= Math.max(chamberSize.x * 0.38, span * 1.7, 1.0) &&
        childSize.z <= Math.max(chamberSize.z * 0.42, maxOffAxis * 1.35, 0.68);
      const sideSupportAssembly =
        maxDim <= Math.max(span * 1.65, chamberSize.x * 0.34, 0.9) &&
        childSize.y <= chamberSize.y * 0.55 &&
        childSize.x <= Math.max(chamberSize.x * 0.38, span * 1.55, 0.9) &&
        childSize.z <= Math.max(chamberSize.z * 0.36, maxOffAxis * 1.25, 0.55) &&
        offAxis <= maxOffAxis * 0.98 &&
        near <= Math.max(maxNear * 1.15, chamberSize.y * 0.72);
      const movableHeadOrBase =
        maxDim <= 0.18 ||
        (
          maxDim <= Math.max(span * 0.72, chamberSize.x * 0.18, 0.48) &&
          childSize.y <= chamberSize.y * 0.34 &&
          offAxis <= maxOffAxis * 0.72 &&
          near <= maxNear * 0.78
        ) ||
        sideSupportAssembly ||
        rectangularSliderBase;
      if (!movableHeadOrBase) return;

      addNode(leftNear <= rightNear ? left : right, child);
    });

    const collectUnderCarriage = (bucket, sidePoint, otherPoint) => {
      let best = null;
      let bestScore = -Infinity;
      root.traverse((child) => {
        if (!child?.isObject3D || child === root || seen.has(child)) return;
        if (!child.isMesh && child.children?.length) return;

        const lowerName = (child.name || '').toLowerCase();
        if (skipTokens.some((token) => lowerName.includes(token.toLowerCase()))) return;

        const box = new T.Box3().setFromObject(child);
        if (box.isEmpty()) return;
        const childCenter = box.getCenter(new T.Vector3());
        const childSize = box.getSize(new T.Vector3());
        if (isFixedMotorBase(box, childSize, childCenter)) return;
        if (isFixedProbePart(box, childSize, childCenter, child.name || '')) return;
        if (isFixedChamberWallHardware(box, childSize, childCenter, child.name || '')) return;
        const sideNear = childCenter.distanceTo(sidePoint);
        const otherNear = childCenter.distanceTo(otherPoint);
        if (sideNear > otherNear) return;

        const axisPoint = sidePoint.clone().addScaledVector(axis, childCenter.clone().sub(sidePoint).dot(axis));
        const offSideAxis = childCenter.distanceTo(axisPoint);
        const sideSign = Math.sign(sidePoint.clone().sub(center).dot(axis)) || 1;
        const sideProj = childCenter.clone().sub(center).dot(axis) * sideSign;
        if (sideProj < Math.max(span * 0.26, chamberSize.x * 0.08, 0.12)) return;
        const belowElectrode =
          childCenter.y < sidePoint.y - chamberSize.y * 0.04 &&
          childCenter.y > chamberBox.min.y - chamberSize.y * 0.34;
        if (!belowElectrode) return;

        const flatSpan = Math.max(childSize.x, childSize.z);
        const flatNarrow = Math.max(Math.min(childSize.x, childSize.z), 1e-4);
        const sliderLike =
          childSize.y <= chamberSize.y * 0.18 &&
          flatSpan <= Math.max(chamberSize.x * 0.32, span * 1.35, 0.78) &&
          flatSpan >= Math.max(flatNarrow * 1.18, 0.045);
        if (!sliderLike) return;
        if (offSideAxis > Math.max(maxOffAxis * 0.92, chamberSize.z * 0.28, 0.42)) return;
        if (sideNear > Math.max(maxNear * 0.95, chamberSize.y * 0.65, 0.72)) return;

        const score =
          -sideNear * 1.4 -
          offSideAxis * 0.9 +
          childCenter.y * 0.18 +
          Math.min(flatSpan, 0.55) * 0.12;
        if (score > bestScore) {
          bestScore = score;
          best = child;
        }
      });
      if (best) addNode(bucket, best);
    };

    const collectSideElectrodeSupports = (bucket, sidePoint, otherPoint) => {
      root.traverse((child) => {
        if (!child?.isObject3D || child === root || seen.has(child)) return;
        if (!child.isMesh && child.children?.length) return;

        const lowerName = (child.name || '').toLowerCase();
        if (skipTokens.some((token) => lowerName.includes(token.toLowerCase()))) return;

        const box = new T.Box3().setFromObject(child);
        if (box.isEmpty()) return;
        const childCenter = box.getCenter(new T.Vector3());
        const childSize = box.getSize(new T.Vector3());
        if (isFixedMotorBase(box, childSize, childCenter)) return;
        if (isFixedProbePart(box, childSize, childCenter, child.name || '')) return;
        const sideNear = childCenter.distanceTo(sidePoint);
        const otherNear = childCenter.distanceTo(otherPoint);
        if (sideNear > otherNear) return;
        const axisPoint = sidePoint.clone().addScaledVector(axis, childCenter.clone().sub(sidePoint).dot(axis));
        const offSideAxis = childCenter.distanceTo(axisPoint);
        const isElectrodeBaseScrew =
          nameHasAny(child, ['gb70', 'gb834', 'gb836', 'screw', 'bolt', '\u87ba\u4e1d', '\u87ba\u6813']) &&
          childCenter.y > chamberBox.min.y - chamberSize.y * 0.36 &&
          childCenter.y < sidePoint.y + chamberSize.y * 0.06 &&
          sideNear <= Math.max(maxNear * 1.05, chamberSize.y * 0.68, 0.78) &&
          offSideAxis <= Math.max(maxOffAxis * 1.12, chamberSize.z * 0.34, 0.5);
        if (isElectrodeBaseScrew) {
          addNode(bucket, child);
          return;
        }
        if (nameHasAny(child, [
          'kf', 'gb70', 'gb834', 'gb836', 'pcm300kf', 'zky', 'gwj', 'gx28', 'mntl',
          'flange', 'port', 'valve', 'screw', 'bolt',
          '\u6cd5\u5170', '\u63a5\u53e3', '\u9600', '\u87ba\u4e1d', '\u87ba\u6813'
        ])) return;
        const wallRadius = Math.hypot(childCenter.x - chamberCenter.x, childCenter.z - chamberCenter.z);
        const likelyVacuumWallPart =
          wallRadius > chamberRadius * 0.58 &&
          childCenter.y > chamberBox.min.y + chamberSize.y * 0.02 &&
          childCenter.y < chamberBox.max.y + chamberSize.y * 0.08;
        if (likelyVacuumWallPart && isFixedChamberWallHardware(box, childSize, childCenter, child.name || '')) return;

        const sideSign = Math.sign(sidePoint.clone().sub(center).dot(axis)) || 1;
        const sideProj = childCenter.clone().sub(center).dot(axis) * sideSign;
        if (sideProj < Math.max(span * 0.22, chamberSize.x * 0.07, 0.1)) return;

        if (offSideAxis > Math.max(maxOffAxis * 1.45, chamberSize.z * 0.48, 0.72)) return;
        if (sideNear > Math.max(maxNear * 1.45, chamberSize.y * 0.95, 1.05)) return;

        const nearElectrodeHeight =
          childCenter.y > chamberBox.min.y - chamberSize.y * 0.32 &&
          childCenter.y < sidePoint.y + chamberSize.y * 0.34;
        if (!nearElectrodeHeight) return;

        const axisRange = axisRangeForBox(box);
        const axisSpan = axisRange.max - axisRange.min;
        const horizontalSpan = Math.max(childSize.x, childSize.z);
        const supportBlockLike =
          childSize.y <= Math.max(chamberSize.y * 0.88, 0.95) &&
          horizontalSpan <= Math.max(chamberSize.z * 0.92, span * 1.45, 0.95) &&
          axisSpan <= Math.max(span * 1.18, chamberSize.x * 0.34, 0.82);
        if (!supportBlockLike) return;

        addNode(bucket, child);
      });
    };

    collectUnderCarriage(left, frontA, frontB);
    collectUnderCarriage(right, frontB, frontA);
    collectSideElectrodeSupports(left, frontA, frontB);
    collectSideElectrodeSupports(right, frontB, frontA);

    return { left, right };
  }

  function configureGapRigFromAnchors() {
    const T = eng.T;
    const left = eng.anchor.left;
    const right = eng.anchor.right;
    if (!left || !right) return false;

    const frame = eng.dischargeFrame;
    const lp = left.position.clone();
    const rp = right.position.clone();
    const frontA = frame?.frontA?.clone() || lp.clone();
    const frontB = frame?.frontB?.clone() || rp.clone();
    let axis = frontB.clone().sub(frontA);
    if (axis.lengthSq() < 1e-9) axis = rp.clone().sub(lp);
    if (axis.lengthSq() < 1e-9) axis = new T.Vector3(1, 0, 0);
    axis.normalize();

    const modelLeft = frame?.modelLeft || null;
    const modelRight = frame?.modelRight || null;
    const modelLeftBaseWorld = modelLeft ? modelLeft.getWorldPosition(new T.Vector3()) : null;
    const modelRightBaseWorld = modelRight ? modelRight.getWorldPosition(new T.Vector3()) : null;
    const motionLeft = Array.isArray(frame?.motionLeft) ? frame.motionLeft : [];
    const motionRight = Array.isArray(frame?.motionRight) ? frame.motionRight : [];

    const frontDistance = frontA.distanceTo(frontB);
    eng.gapRig = {
      center: frontA.clone().add(frontB).multiplyScalar(0.5),
      axis,
      defaultDistance: frontDistance,
      scale: (frontDistance / Math.max(modelGapMm(state.gapMm), 1e-6)) * MODEL_GAP_SCALE_COMPENSATION,
      leftInset: frame?.leftInset || 0,
      rightInset: frame?.rightInset || 0,
      frontA,
      frontB,
      modelLeft,
      modelRight,
      modelLeftBaseWorld,
      modelRightBaseWorld,
      motionLeft,
      motionRight,
    };
    return true;
  }

  function setNodeTreeVisibility(node, visible) {
    if (!node) return;
    node.traverse?.((child) => {
      child.visible = visible;
    });
    node.visible = visible;
  }

  function setPlateMeshScale(active) {
    const frame = eng.dischargeFrame;
    [frame?.leftMesh, frame?.rightMesh].filter(Boolean).forEach((mesh) => {
      if (!mesh.userData.originalScale) {
        mesh.userData.originalScale = mesh.scale.clone();
      }
      const original = mesh.userData.originalScale;
      if (!active) {
        mesh.scale.copy(original);
        mesh.visible = true;
        return;
      }
      mesh.scale.set(
        original.x * 0.3,
        original.y * 0.3,
        original.z * 0.3
      );
      mesh.visible = true;
    });
  }

  function alignPlateMeshFace(mesh, desiredWorldNormal) {
    const T = eng.T;
    if (!mesh?.isMesh || !desiredWorldNormal) return;
    const desired = desiredWorldNormal.clone();
    if (desired.lengthSq() < 1e-8) return;
    desired.normalize();

    if (!mesh.userData.originalQuaternion) {
      mesh.userData.originalQuaternion = mesh.quaternion.clone();
    }
    mesh.quaternion.copy(mesh.userData.originalQuaternion);
    mesh.updateMatrixWorld(true);

    const geo = mesh.geometry;
    if (!geo) return;
    if (!geo.boundingBox) geo.computeBoundingBox?.();
    const box = geo.boundingBox;
    if (!box) return;
    const size = box.getSize(new T.Vector3());
    const normalAxis =
      size.x <= size.y && size.x <= size.z ? 'x' :
      size.y <= size.x && size.y <= size.z ? 'y' :
      'z';
    const localNormal =
      normalAxis === 'x' ? new T.Vector3(1, 0, 0) :
      normalAxis === 'y' ? new T.Vector3(0, 1, 0) :
      new T.Vector3(0, 0, 1);

    const worldQuat = mesh.getWorldQuaternion(new T.Quaternion());
    let currentNormal = localNormal.clone().applyQuaternion(worldQuat).normalize();
    if (currentNormal.dot(desired) < 0) currentNormal.multiplyScalar(-1);

    const delta = new T.Quaternion().setFromUnitVectors(currentNormal, desired);
    const targetWorld = delta.multiply(worldQuat);
    const parentWorld = mesh.parent
      ? mesh.parent.getWorldQuaternion(new T.Quaternion())
      : new T.Quaternion();
    mesh.quaternion.copy(parentWorld.invert().multiply(targetWorld));
    mesh.updateMatrixWorld(true);
  }

  function alignParallelPlateFaces() {
    const frame = eng.dischargeFrame;
    if (!frame || state.electrodeType !== 'parallel') return;
    const direction = (eng.gapRig?.axis || frame.frontB?.clone?.().sub(frame.frontA));
    if (!direction || direction.lengthSq() < 1e-8) return;
    direction.normalize();
    alignPlateMeshFace(frame.leftMesh, direction);
    alignPlateMeshFace(frame.rightMesh, direction.clone().multiplyScalar(-1));
  }

  function collectSphereReplacementHideNodes(frame) {
    const T = eng.T;
    if (!frame) return [];

    const addNode = (bucket, seen, node) => {
      if (!node || seen.has(node)) return;
      seen.add(node);
      bucket.push(node);
    };

    const thresholdFrom = (frontPoint, sizeHint) =>
      Math.max(
        Math.max(sizeHint?.x || 0, sizeHint?.y || 0, sizeHint?.z || 0) * 0.7,
        0.12
      );

    const nodes = [];
    const seen = new Set();

    const pickNearby = (items, frontPoint, sizeHint) => {
      if (!Array.isArray(items) || !frontPoint) return;
      const nearLimit = thresholdFrom(frontPoint, sizeHint);
      const residueNearLimit = Math.max(nearLimit * 2.4, 0.42);
      const heightFloor = frontPoint.y - Math.max((sizeHint?.y || 0.18) * 1.7, 0.32);
      const heightCeil = frontPoint.y + Math.max((sizeHint?.y || 0.18) * 0.65, 0.14);
      items.forEach((item) => {
        const node = item?.node;
        if (!node || seen.has(node)) return;
        if (node === frame.modelLeft || node === frame.modelRight) return;
        const box = new T.Box3().setFromObject(node);
        if (box.isEmpty()) return;
        const center = box.getCenter(new T.Vector3());
        const size = box.getSize(new T.Vector3());
        const dims = [size.x, size.y, size.z].sort((a, b) => a - b);
        const near = center.distanceTo(frontPoint);
        const thinDisk = dims[0] <= Math.max(nearLimit * 0.26, 0.04) && dims[2] <= Math.max(nearLimit * 3.2, 0.42);
        const topBand = center.y >= heightFloor && center.y <= heightCeil;
        const smallResidue =
          Math.max(size.x, size.y, size.z) <= Math.max(nearLimit * 1.35, 0.28) &&
          dims[0] <= Math.max(nearLimit * 0.42, 0.06);
        const namedResidue = nameHasAny(node, ['gb70', 'gb834', 'gb836', 'screw', 'bolt', '\u87ba\u4e1d', '\u87ba\u6813']);
        if ((near <= nearLimit && thinDisk && topBand) || (near <= residueNearLimit && topBand && (smallResidue || namedResidue))) {
          addNode(nodes, seen, node);
        }
      });
    };

    pickNearby(frame.motionLeft, frame.frontA, frame.leftSize);
    pickNearby(frame.motionRight, frame.frontB, frame.rightSize);

    const leftFront = frame.frontA;
    const rightFront = frame.frontB;
    if (leftFront && rightFront && eng.machine) {
      const axis = rightFront.clone().sub(leftFront);
      const span = axis.length();
      if (span > 1e-6) {
        axis.normalize();
        const mid = leftFront.clone().add(rightFront).multiplyScalar(0.5);
        const sideLimit = Math.max(span * 2.15, 0.95);
        const axisLimit = Math.max(span * 1.55, 0.72);
        const maxResidueSize = Math.max(span * 0.82, 0.38);
        const minResidueSize = Math.max(span * 0.24, 0.09);
        const floorY = Math.min(leftFront.y, rightFront.y) - Math.max(span * 0.78, 0.34);
        const ceilY = Math.max(leftFront.y, rightFront.y) + Math.max(span * 0.82, 0.38);
        const skipTokens = [
          'vacuum', '真空', 'kf', 'pcm300kf', 'zky', 'gwj', 'gx28', 'mntl',
          'flange', 'port', 'valve', '法兰', '接口', '阀', 'mainpower', '主电源',
          'motor', '电机控制', 'probe', '探针', 'point', 'text', '文本',
        ];
        const screwTokens = ['gb70', 'gb834', 'gb836', 'screw', 'bolt', '螺丝', '螺栓'];

        eng.machine.traverse((node) => {
          if (!node || seen.has(node)) return;
          if (node === frame.modelLeft || node === frame.modelRight) return;
          if (!node.isMesh) return;
          if (nameHasAny(node, skipTokens)) return;

          const box = new T.Box3().setFromObject(node);
          if (box.isEmpty()) return;
          const center = box.getCenter(new T.Vector3());
          if (center.y < floorY || center.y > ceilY) return;

          const rel = center.clone().sub(mid);
          const along = rel.dot(axis);
          const axisPoint = mid.clone().addScaledVector(axis, along);
          const offAxis = center.distanceTo(axisPoint);
          const sideNear = Math.min(center.distanceTo(leftFront), center.distanceTo(rightFront));
          if (Math.abs(along) > sideLimit || offAxis > axisLimit || sideNear > sideLimit) return;

          const size = box.getSize(new T.Vector3());
          const dims = [size.x, size.y, size.z].sort((a, b) => a - b);
          const maxDim = dims[2];
          const minDim = dims[0];
          const namedScrew = nameHasAny(node, screwTokens);
          const compactResidue = maxDim <= maxResidueSize && minDim <= minResidueSize;
          if (namedScrew || compactResidue) {
            addNode(nodes, seen, node);
          }
        });
      }
    }

    return nodes;
  }

  function setOriginalPlateVisibility(visible) {
    const frame = eng.dischargeFrame;
    const targets = visible
      ? [
          frame?.leftMesh,
          frame?.rightMesh,
          frame?.modelLeft,
          frame?.modelRight,
          ...(frame?.hideNodes || []),
        ].filter(Boolean)
      : (frame?.hideNodes || []);
    targets.forEach((node) => setNodeTreeVisibility(node, visible));
  }

  function electrodeVisualScale(template, averagePlateSpan) {
    const baseSpan = Math.max(template?.size?.y || 0, template?.size?.z || 0, 1e-4);
    const targetSpan = template?.fullAssembly
      ? clamp(averagePlateSpan * 1.16, 0.28, 0.62)
      : clamp(averagePlateSpan * 0.46, 0.1, 0.24);
    return targetSpan / baseSpan;
  }

  function refreshElectrodeVisuals() {
    if (!eng.electrodeVisuals) return;

    eng.electrodeVisuals.clear();
    eng.sphereDischargePoints = null;
    setPlateMeshScale(false);
    setOriginalPlateVisibility(true);

    if (!eng.useModelElectrodes || state.electrodeType !== 'sphere') return;
    if (!eng.anchor.left || !eng.anchor.right || !eng.dischargeFrame) return;

    const pair = eng.electrodeLibrary?.sphere || {
      left: createFallbackSphereTemplate(),
      right: createFallbackSphereTemplate(),
    };

    const T = eng.T;
    const frame = eng.dischargeFrame;
    const direction = frame.frontB.clone().sub(frame.frontA);
    if (direction.lengthSq() < 1e-8) return;
    direction.normalize();

    const basis = new T.Matrix4().makeBasis(direction, frame.up || new T.Vector3(0, 1, 0), frame.depth || new T.Vector3(0, 0, 1));
    const averagePlateSpan =
      ((Math.max(frame.leftSize?.y || 0, frame.leftSize?.z || 0) || 0.26) +
       (Math.max(frame.rightSize?.y || 0, frame.rightSize?.z || 0) || 0.26)) / 2;

    const currentFrontLeft = eng.gapRig
      ? eng.gapRig.center.clone().addScaledVector(eng.gapRig.axis, -(visualGapMm(state.gapMm) * eng.gapRig.scale) / 2)
      : frame.frontA.clone();
    const currentFrontRight = eng.gapRig
      ? eng.gapRig.center.clone().addScaledVector(eng.gapRig.axis, (visualGapMm(state.gapMm) * eng.gapRig.scale) / 2)
      : frame.frontB.clone();
    const attachVisual = (side, template, frontPoint) => {
      const visual = template.holder.clone(true);
      const uniformScale = electrodeVisualScale(template, averagePlateSpan);
      visual.scale.setScalar(uniformScale);
      visual.quaternion.setFromRotationMatrix(basis);
      if (!template.fullAssembly && side === 'right') visual.rotateY(Math.PI);
      if (side === 'right' && SPHERE_RIGHT_CLOCKWISE_TILT) visual.rotateZ(-SPHERE_RIGHT_CLOCKWISE_TILT);

      const sphereDiameter = Math.max(Math.min(template.size.y, template.size.z) * uniformScale, 1e-4);
      const sphereRadius = sphereDiameter * 0.5;
      const backwardMm = 1;
      const backwardOffset = (eng.gapRig?.scale || 0.01) * backwardMm;
      const sign = side === 'left' ? -1 : 1;
      const outwardOffset = -Math.max(sphereRadius - backwardOffset, sphereRadius * 0.2);
      visual.position.copy(frontPoint).addScaledVector(direction, sign * outwardOffset);
      if (template.fullAssembly) {
        anchorSphereAssemblyToSupport(visual, side, frontPoint, direction);
        orientSphereAssemblyTowardGap(visual, side, frontPoint, direction, frame.up || new T.Vector3(0, 1, 0));
        anchorSphereAssemblyToSupport(visual, side, frontPoint, direction);
      }
      eng.electrodeVisuals.add(visual);
      return visual;
    };

    setPlateMeshScale(true);
    const leftVisual = attachVisual('left', pair.left, currentFrontLeft);
    const rightVisual = attachVisual('right', pair.right, currentFrontRight);
    alignSphereVisualCenters(leftVisual, rightVisual, direction);
    ensureSphereVisualContactClearance(leftVisual, rightVisual, direction);
    alignSphereVisualCenters(leftVisual, rightVisual, direction);
    ensureSphereVisualContactClearance(leftVisual, rightVisual, direction);
    dropSphereCopperAssemblies(leftVisual, rightVisual);
    applySphereVisualYOffset(leftVisual, rightVisual);
    updateSphereDischargePoints(leftVisual, rightVisual, direction);
  }

  function anchorSphereAssemblyToSupport(visual, side, frontPoint, direction) {
    const T = eng.T;
    const support = findSideSupportTop(side, frontPoint, direction);
    if (!support) return;
    visual.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(visual);
    if (box.isEmpty()) return;
    const currentBottom = estimateAssemblyBottomCenter(visual, box) || new T.Vector3(
      (box.min.x + box.max.x) / 2,
      box.min.y,
      (box.min.z + box.max.z) / 2
    );
    const lift = Math.max((eng.gapRig?.scale || 0.01) * 0.5, 0.003);
    const target = support.clone();
    target.y += lift;
    visual.position.add(target.sub(currentBottom));
    visual.updateMatrixWorld(true);
  }

  function estimateAssemblyBottomCenter(root, box) {
    const T = eng.T;
    const size = box.getSize(new T.Vector3());
    const ceiling = box.min.y + Math.max(size.y * 0.18, 0.008);
    const sum = new T.Vector3();
    let count = 0;
    root.traverse?.((obj) => {
      const pos = obj?.geometry?.attributes?.position;
      if (!obj?.isMesh || !pos) return;
      const v = new T.Vector3();
      const stride = Math.max(1, Math.floor(pos.count / 900));
      for (let i = 0; i < pos.count; i += stride) {
        v.fromBufferAttribute(pos, i).applyMatrix4(obj.matrixWorld);
        if (v.y > ceiling) continue;
        sum.add(v);
        count += 1;
      }
    });
    if (count < 3) return null;
    return sum.multiplyScalar(1 / count);
  }

  function findSideSupportTop(side, frontPoint, direction) {
    const T = eng.T;
    const items = side === 'left' ? eng.gapRig?.motionLeft : eng.gapRig?.motionRight;
    if (!Array.isArray(items) || !items.length) return null;
    let best = null;
    let bestScore = -Infinity;
    items.forEach((item) => {
      const node = item?.node;
      if (!node?.visible) return;
      const box = new T.Box3().setFromObject(node);
      if (box.isEmpty()) return;
      const size = box.getSize(new T.Vector3());
      const center = box.getCenter(new T.Vector3());
      const radial = Math.max(size.x, size.z, 1e-4);
      const flatSpan = Math.max(size.x, size.z);
      const flatNarrow = Math.max(Math.min(size.x, size.z), 1e-4);
      const tallSupport = size.y > radial * 1.18 && size.y > 0.035 && radial < 0.22;
      const flatSlider = size.y < 0.06 && flatSpan > 0.08 && flatSpan > flatNarrow * 1.45;
      if (!tallSupport && !flatSlider) return;
      const along = Math.abs(center.clone().sub(frontPoint).dot(direction));
      const verticalPenalty = Math.max(center.y - frontPoint.y, 0) * 1.8;
      const topBonus = box.max.y * 0.8;
      const score = topBonus - along * 0.75 - verticalPenalty - (flatSlider ? 0.12 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = new T.Vector3(center.x, box.max.y, center.z);
      }
    });
    return best;
  }

  function findSphereHeadCenter(root) {
    const T = eng.T;
    let best = null;
    let bestScore = -Infinity;
    const rootBox = new T.Box3().setFromObject(root);
    const rootSize = rootBox.isEmpty() ? new T.Vector3(1, 1, 1) : rootBox.getSize(new T.Vector3());
    root.updateMatrixWorld(true);
    root.traverse?.((obj) => {
      if (!obj?.isMesh) return;
      const box = new T.Box3().setFromObject(obj);
      if (box.isEmpty()) return;
      const size = box.getSize(new T.Vector3());
      const dims = [Math.max(size.x, 1e-4), Math.max(size.y, 1e-4), Math.max(size.z, 1e-4)].sort((a, b) => a - b);
      const roundness = dims[0] / dims[2];
      const balance = dims[1] / dims[2];
      if (roundness < 0.55 || balance < 0.72) return;
      const volume = dims[0] * dims[1] * dims[2];
      const score = volume * (roundness + balance);
      if (score > bestScore) {
        bestScore = score;
        best = box.getCenter(new T.Vector3());
      }
    });
    return best;
  }

  function findSphereHeadProfile(root, direction) {
    const T = eng.T;
    if (!root || !direction) return null;

    const dir = direction.clone();
    if (dir.lengthSq() < 1e-8) return null;
    dir.normalize();

    let best = null;
    let bestScore = -Infinity;
    root.updateMatrixWorld(true);
    root.traverse?.((obj) => {
      if (!obj?.isMesh) return;
      const box = new T.Box3().setFromObject(obj);
      if (box.isEmpty()) return;
      const size = box.getSize(new T.Vector3());
      const dims = [Math.max(size.x, 1e-4), Math.max(size.y, 1e-4), Math.max(size.z, 1e-4)].sort((a, b) => a - b);
      const roundness = dims[0] / dims[2];
      const balance = dims[1] / dims[2];
      if (roundness < 0.55 || balance < 0.72) return;

      const center = box.getCenter(new T.Vector3());
      let alongRadius = 0;
      const pos = obj.geometry?.attributes?.position;
      if (pos) {
        const v = new T.Vector3();
        const stride = Math.max(1, Math.floor(pos.count / 1400));
        for (let i = 0; i < pos.count; i += stride) {
          v.fromBufferAttribute(pos, i).applyMatrix4(obj.matrixWorld);
          alongRadius = Math.max(alongRadius, Math.abs(v.clone().sub(center).dot(dir)));
        }
      }
      if (alongRadius <= 1e-5) {
        for (const x of [box.min.x, box.max.x]) {
          for (const y of [box.min.y, box.max.y]) {
            for (const z of [box.min.z, box.max.z]) {
              alongRadius = Math.max(alongRadius, Math.abs(new T.Vector3(x, y, z).sub(center).dot(dir)));
            }
          }
        }
      }

      const radius = Math.max(alongRadius, dims[0] * 0.5);
      const volume = dims[0] * dims[1] * dims[2];
      const topBias = rootBox.isEmpty()
        ? 1
        : 1 + clamp((center.y - rootBox.min.y) / Math.max(rootSize.y, 1e-4), 0, 1) * 2.4;
      const sphereBias = Math.pow(roundness * balance, 2.2);
      const score = volume * (1 + radius) * topBias * sphereBias;
      if (score > bestScore) {
        bestScore = score;
        best = { center, radius, size };
      }
    });
    return best;
  }

  function ensureSphereVisualContactClearance(leftVisual, rightVisual, direction) {
    if (!leftVisual || !rightVisual || !direction) return;
    const dir = sphereAlignmentAxis(direction);
    if (dir.lengthSq() < 1e-8) return;

    const left = findSphereHeadProfile(leftVisual, dir);
    const right = findSphereHeadProfile(rightVisual, dir);
    if (!left || !right) return;

    const worldPerMm = Math.max(eng.gapRig?.scale || 0.01, 1e-4);
    const requestedGap = (modelGapMm(state.gapMm) + SPHERE_ZERO_VISUAL_GAP_MM) * worldPerMm;
    const clearance = state.electrodeType === 'sphere'
      ? requestedGap
      : worldPerMm * SPHERE_VISUAL_CLEARANCE_MM;
    const leftContact = left.center.dot(dir) + left.radius;
    const rightContact = right.center.dot(dir) - right.radius;
    const error = (leftContact + clearance) - rightContact;
    if (Math.abs(error) <= worldPerMm * 0.02) return;

    const correction = error * 0.5;
    leftVisual.position.addScaledVector(dir, -correction);
    rightVisual.position.addScaledVector(dir, correction);
    leftVisual.updateMatrixWorld(true);
    rightVisual.updateMatrixWorld(true);
  }

  function alignSphereVisualCenters(leftVisual, rightVisual, direction) {
    if (!leftVisual || !rightVisual || !direction) return;
    const dir = sphereAlignmentAxis(direction);
    if (dir.lengthSq() < 1e-8) return;

    const left = findSphereHeadProfile(leftVisual, dir);
    const right = findSphereHeadProfile(rightVisual, dir);
    if (!left || !right) return;

    const offset = left.center.clone().sub(right.center);
    offset.addScaledVector(dir, -offset.dot(dir));
    if (offset.lengthSq() < 1e-8) return;

    leftVisual.position.sub(offset);
    leftVisual.updateMatrixWorld(true);
  }

  function dropSphereCopperAssemblies(leftVisual, rightVisual) {
    const worldPerMm = Math.max(eng.gapRig?.scale || 0.01, 1e-4);
    const drop = SPHERE_COPPER_ASSEMBLY_DROP_MM * worldPerMm;
    [leftVisual, rightVisual].filter(Boolean).forEach((visual) => {
      visual.position.y -= drop;
      visual.updateMatrixWorld(true);
    });
  }

  function applySphereVisualYOffset(leftVisual, rightVisual) {
    if (state.electrodeType !== 'sphere') return;
    if (leftVisual) {
      leftVisual.position.y += LEFT_ELECTRODE_ASSEMBLY_Y_OFFSET_M;
      leftVisual.position.z += LEFT_ELECTRODE_ASSEMBLY_Z_OFFSET_M;
      leftVisual.updateMatrixWorld(true);
    }
    if (rightVisual) {
      rightVisual.position.y += RIGHT_ELECTRODE_ASSEMBLY_Y_OFFSET_M;
      rightVisual.updateMatrixWorld(true);
    }
  }

  function liftRightSphereCopperAssembly(rightVisual) {
    if (!rightVisual || state.electrodeType !== 'sphere') return;
    rightVisual.position.y += RIGHT_ELECTRODE_COPPER_LIFT_M;
    rightVisual.updateMatrixWorld(true);
  }

  function trimLeftSphereVerticalCopperPost(leftVisual, direction) {
    if (!leftVisual || !direction || state.electrodeType !== 'sphere') return;
    const T = eng.T;
    const dir = sphereAlignmentAxis(direction);
    const head = findSphereHeadProfile(leftVisual, dir);
    if (!head) return;
    const cutoffY = head.center.y - head.radius * 0.35;
    leftVisual.traverse?.((obj) => {
      if (!obj?.isMesh || obj.userData.leftCopperPostTrimmed) return;
      const box = new T.Box3().setFromObject(obj);
      if (box.isEmpty()) return;
      const size = box.getSize(new T.Vector3());
      const center = box.getCenter(new T.Vector3());
      if (!objectLooksCopper(obj)) return;
      const tallPost =
        size.y > Math.max(size.x, size.z) * 1.05 &&
        box.min.y < cutoffY &&
        center.distanceTo(head.center) < Math.max(head.radius * 4.2, 0.9);
      if (!tallPost) return;
      const localCutoff = obj.worldToLocal(new T.Vector3(center.x, cutoffY, center.z)).y;
      const pos = obj.geometry?.attributes?.position;
      if (!pos) return;
      for (let i = 0; i < pos.count; i += 1) {
        if (pos.getY(i) < localCutoff) pos.setY(i, localCutoff - Math.max(size.y * 2.4, 0.7));
      }
      pos.needsUpdate = true;
      obj.geometry.computeBoundingBox?.();
      obj.geometry.computeBoundingSphere?.();
      obj.userData.leftCopperPostTrimmed = true;
    });
    leftVisual.updateMatrixWorld(true);
  }

  function objectLooksCopper(obj) {
    const mats = Array.isArray(obj?.material) ? obj.material : [obj?.material];
    return mats.some((mat) => {
      const color = mat?.color;
      if (!color) return false;
      return color.r > color.g * 1.15 && color.g > color.b * 1.25 && color.r > 0.35;
    });
  }

  function alignRightSphereHeightToLeft(leftVisual, rightVisual, direction) {
    if (!leftVisual || !rightVisual || !direction || state.electrodeType !== 'sphere') return;
    const dir = sphereAlignmentAxis(direction);
    const leftHead = findSphereHeadProfile(leftVisual, dir);
    const rightHead = findSphereHeadProfile(rightVisual, dir);
    if (!leftHead || !rightHead) return;
    const deltaY = (leftHead.center.y + leftHead.radius) - (rightHead.center.y + rightHead.radius);
    if (Math.abs(deltaY) < 1e-5) return;
    rightVisual.position.y += deltaY;
    rightVisual.updateMatrixWorld(true);
  }

  function sphereAlignmentAxis(direction) {
    const dir = direction.clone();
    dir.y = 0;
    if (dir.lengthSq() < 1e-8) return direction.clone().normalize();
    return dir.normalize();
  }

  function updateSphereDischargePoints(leftVisual, rightVisual, direction) {
    eng.sphereDischargePoints = null;
    if (!leftVisual || !rightVisual || !direction) return;
    const dir = sphereAlignmentAxis(direction);
    if (dir.lengthSq() < 1e-8) return;

    const left = findSphereHeadProfile(leftVisual, dir);
    const right = findSphereHeadProfile(rightVisual, dir);
    if (!left || !right) return;

    eng.sphereDischargePoints = {
      left: left.center.clone().addScaledVector(dir, left.radius),
      right: right.center.clone().addScaledVector(dir, -right.radius),
      leftCenter: left.center.clone(),
      rightCenter: right.center.clone(),
    };
  }

  function orientSphereAssemblyTowardGap(visual, side, frontPoint, direction, up = new eng.T.Vector3(0, 1, 0)) {
    const head = findSphereHeadProfile(visual, direction)?.center || estimateSphereHeadCenterFromGeometry(visual, direction, up) || findSphereHeadCenter(visual);
    if (!head) return;
    const reference = findSideSupportTop(side, frontPoint, direction) || frontPoint;
    const towardGap = side === 'left' ? 1 : -1;
    const headDot = head.clone().sub(reference).dot(direction);
    if (headDot * towardGap >= 0) return;
    visual.rotateY(Math.PI);
    visual.updateMatrixWorld(true);
  }

  function estimateSphereHeadCenterFromGeometry(root, direction, up = new eng.T.Vector3(0, 1, 0)) {
    const T = eng.T;
    const box = new T.Box3().setFromObject(root);
    if (box.isEmpty()) return null;
    const size = box.getSize(new T.Vector3());
    const floorY = box.min.y + size.y * 0.34;
    const depth = new T.Vector3().crossVectors(direction, up).normalize();
    const safeDepth = depth.lengthSq() > 1e-8 ? depth : new T.Vector3(0, 0, 1);
    const safeUp = up.clone().normalize();
    const points = [];
    root.updateMatrixWorld(true);
    root.traverse?.((obj) => {
      const pos = obj?.geometry?.attributes?.position;
      if (!obj?.isMesh || !pos) return;
      const v = new T.Vector3();
      const stride = Math.max(1, Math.floor(pos.count / 1200));
      for (let i = 0; i < pos.count; i += stride) {
        v.fromBufferAttribute(pos, i).applyMatrix4(obj.matrixWorld);
        if (v.y < floorY) continue;
        points.push(v.clone());
      }
    });
    if (points.length < 8) return null;

    let minProj = Infinity;
    let maxProj = -Infinity;
    points.forEach((p) => {
      const proj = p.dot(direction);
      minProj = Math.min(minProj, proj);
      maxProj = Math.max(maxProj, proj);
    });
    const span = Math.max(maxProj - minProj, 1e-6);
    const bins = Array.from({ length: 10 }, () => ({
      count: 0,
      sum: new T.Vector3(),
      minUp: Infinity,
      maxUp: -Infinity,
      minDepth: Infinity,
      maxDepth: -Infinity,
      maxY: -Infinity,
    }));
    points.forEach((p) => {
      const idx = clamp(Math.floor(((p.dot(direction) - minProj) / span) * bins.length), 0, bins.length - 1);
      const b = bins[idx];
      b.count += 1;
      b.sum.add(p);
      const upValue = p.dot(safeUp);
      const depthValue = p.dot(safeDepth);
      b.minUp = Math.min(b.minUp, upValue);
      b.maxUp = Math.max(b.maxUp, upValue);
      b.minDepth = Math.min(b.minDepth, depthValue);
      b.maxDepth = Math.max(b.maxDepth, depthValue);
      b.maxY = Math.max(b.maxY, p.y);
    });

    let best = null;
    let bestScore = -Infinity;
    bins.forEach((b) => {
      if (b.count < 4) return;
      const upSpan = Math.max(b.maxUp - b.minUp, 1e-4);
      const depthSpan = Math.max(b.maxDepth - b.minDepth, 1e-4);
      const roundness = Math.min(upSpan, depthSpan) / Math.max(upSpan, depthSpan);
      const sectionArea = upSpan * depthSpan;
      const heightBonus = clamp((b.maxY - floorY) / Math.max(size.y, 1e-4), 0, 1);
      const score = sectionArea * (0.55 + roundness) * (1 + heightBonus * 0.45) * Math.sqrt(b.count);
      if (score > bestScore) {
        bestScore = score;
        best = b.sum.clone().multiplyScalar(1 / b.count);
      }
    });
    return best;
  }

  function alignAssemblyBottomToPoint(visual, point) {
    const T = eng.T;
    visual.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(visual);
    if (box.isEmpty()) return false;
    const bottom = estimateAssemblyBottomCenter(visual, box) || new T.Vector3(
      (box.min.x + box.max.x) / 2,
      box.min.y,
      (box.min.z + box.max.z) / 2
    );
    visual.position.add(point.clone().sub(bottom));
    visual.updateMatrixWorld(true);
    return true;
  }

  function estimateSphereContactMetric(side, template, frame, direction, averagePlateSpan) {
    const T = eng.T;
    if (!template?.holder || !frame || !direction) return null;

    const up = frame.up || new T.Vector3(0, 1, 0);
    const depth = frame.depth || new T.Vector3(0, 0, 1);
    const basis = new T.Matrix4().makeBasis(direction, up, depth);
    const visual = template.holder.clone(true);
    const scale = electrodeVisualScale(template, averagePlateSpan);
    const worldPerMm = Math.max(eng.gapRig?.scale || 0.01, 1e-4);
    const origin = new T.Vector3();

    visual.scale.setScalar(scale);
    visual.quaternion.setFromRotationMatrix(basis);
    if (!template.fullAssembly && side === 'right') visual.rotateY(Math.PI);
    visual.updateMatrixWorld(true);

    if (template.fullAssembly) {
      alignAssemblyBottomToPoint(visual, origin);
      orientSphereAssemblyTowardGap(visual, side, origin, direction, up);
      alignAssemblyBottomToPoint(visual, origin);
    }

    const profile = findSphereHeadProfile(visual, direction);
    if (!profile) return null;

    const towardGap = side === 'left' ? 1 : -1;
    const protrusion = template.fullAssembly
      ? Math.abs(profile.center.dot(direction))
      : Math.max(profile.radius - worldPerMm, profile.radius * 0.2);
    return {
      radius: Math.max(profile.radius, 1e-5),
      protrusion,
    };
  }

  function resolveOverallAnchors(root) {
    root.updateMatrixWorld(true);

    // Clear fallback anchors so stale objects never leak into loaded-model mapping.
    eng.anchor.motor = null;
    eng.anchor.mainPower = null;
    eng.anchor.vacuum = null;
    eng.anchor.pressureGauge = null;
    eng.anchor.probePower = null;
    eng.anchor.probe = null;
    eng.probeMotionRig = null;
    eng.dischargeFrame = null;

    const pickNamed = (preferredNames, fallbackNames = [], fallbackTokens = []) => {
      const preferredExact = pickLargestByNames(root, preferredNames) || findAnyExact(root, preferredNames);
      if (preferredExact) return { obj: preferredExact, fromPreferred: true, fromExact: true };

      const preferredToken = pickLargestByObjects(findAllByTokens(root, preferredNames));
      if (preferredToken) return { obj: preferredToken, fromPreferred: true, fromExact: false };

      const fallbackExact = pickLargestByNames(root, fallbackNames) || findAnyExact(root, fallbackNames);
      if (fallbackExact) return { obj: fallbackExact, fromPreferred: false, fromExact: true };

      const fallbackToken = pickLargestByObjects(findAllByTokens(root, fallbackTokens.length ? fallbackTokens : fallbackNames));
      return { obj: fallbackToken || null, fromPreferred: false, fromExact: false };
    };

    // Strong priority: user-renamed part names first.
    const mainPick = pickNamed(
      ['\u4e3b\u7535\u6e90', 'mainpower', 'main_power'],
      ['\u7acb\u65b9\u4f53016', '\u4e3b\u7535\u6e90', 'point004', '\u7acb\u65b9\u4f53031', '\u67f1\u4f53042'],
      ['\u4e3b\u7535\u6e90', 'mainpower', 'main_power']
    );
    const motorPick = pickNamed(
      ['\u7535\u6781\u63a7\u5236\u88c5\u7f6e', '\u7535\u673a\u63a7\u5236\u88c5\u7f6e', 'motorcontroller', 'motor_controller', 'motorcontrol'],
      ['\u67f1\u4f53042', '\u7535\u6781\u63a7\u5236\u88c5\u7f6e001', '\u7535\u6781\u63a7\u5236\u88c5\u7f6e', '\u7acb\u65b9\u4f53016', '\u7acb\u65b9\u4f53'],
      ['\u7535\u6781\u63a7\u5236\u88c5\u7f6e', '\u7535\u673a\u63a7\u5236\u88c5\u7f6e', 'motorcontroller', 'motorcontrol']
    );
    const vacuumPick = pickNamed(
      ['\u771f\u7a7a\u7f69', 'vacuum', 'chamber'],
      ['\u67f1\u4f53'],
      ['vacuum', 'chamber', '\u771f\u7a7a', '\u7f69']
    );
    const pressureGaugePick = pickNamed(
      ['\u6c14\u538b\u8ba1', '\u538b\u529b\u8ba1', '\u538b\u529b\u8868', '\u538b\u5f3a\u8ba1', 'pressuregauge', 'pressure_gauge', 'pcm300kf', '20kpa'],
      ['\u6c14\u4f53\u653e\u7535\u4e0e\u7b49\u79bb\u5b50\u5b9e\u9a8c\u4eeastp_-_______________PCM300KF-16(0__20kPa)stp-1'],
      ['\u6c14\u538b', '\u538b\u529b', '\u538b\u5f3a', 'pressure', 'gauge', 'pcm300kf', '20kpa']
    );
    const probePowerPick = pickNamed(
      ['\u63a2\u9488\u63a7\u5236\u88c5\u7f6e', '\u63a2\u9488\u7535\u6e90', 'probepower', 'probe_power'],
      ['\u67f1\u4f53033', '\u63a2\u9488\u63a7\u5236\u88c5\u7f6e', 'point001'],
      ['\u63a2\u9488\u63a7\u5236\u88c5\u7f6e', '\u63a2\u9488\u7535\u6e90', 'probepower', 'probe_power']
    );
    const probePick = pickNamed(
      ['\u63a2\u9488', 'probe'],
      ['\u7acb\u65b9\u4f53009', '\u7acb\u65b9\u4f53008', '\u67f1\u4f53024', '\u67f1\u4f53022', '\u67f1\u4f53023'],
      ['probe', '\u63a2\u9488']
    );

    eng.anchor.mainPower = mainPick.obj;
    eng.anchor.motor = motorPick.obj;
    eng.anchor.vacuum = vacuumPick.obj;
    eng.anchor.pressureGauge = pressureGaugePick.obj;
    eng.anchor.probePower = probePowerPick.obj;
    eng.anchor.probe = probePick.obj;

    const T = eng.T;
    if (!eng.anchor.vacuum) {
      const rootBox = new T.Box3().setFromObject(root);
      const rootCenter = rootBox.getCenter(new T.Vector3());
      const rootSize = rootBox.getSize(new T.Vector3());
      eng.anchor.vacuum = pickRegionMesh(
        root,
        (obj, _box, center, size) =>
          Math.abs(center.x - rootCenter.x) < rootSize.x * 0.16 &&
          center.y > rootBox.min.y + rootSize.y * 0.34 &&
          size.x > rootSize.x * 0.14 &&
          size.z > rootSize.z * 0.22 &&
          size.y > rootSize.y * 0.35 &&
          size.y < rootSize.y * 0.75 &&
          !nameHasAny(obj, ['\u4e3b\u7535\u6e90', '\u7535\u673a\u63a7\u5236', '\u63a2\u9488', 'mainpower', 'motor', 'probe']),
        (_obj, _box, center, size) =>
          size.x * size.y * size.z - Math.abs(center.x - rootCenter.x) * 1.4
      );
    }
    const chamberBox = new T.Box3().setFromObject(eng.anchor.vacuum || root);
    const chamberCenter = chamberBox.getCenter(new T.Vector3());
    const chamberSize = chamberBox.getSize(new T.Vector3());
    const deviceExcludes = ['鐪熺┖', 'vacuum', 'chamber', '鐢垫瀬', '鏋佹澘', 'electrode', 'probe', '鎺㈤拡'];

    if (!eng.anchor.pressureGauge) {
      eng.anchor.pressureGauge = pickRegionMesh(
        root,
        (obj, _box, center, size) =>
          center.x < chamberCenter.x - chamberSize.x * 0.18 &&
          center.x > chamberCenter.x - chamberSize.x * 0.82 &&
          center.y > chamberCenter.y + chamberSize.y * 0.2 &&
          center.y < chamberCenter.y + chamberSize.y * 0.78 &&
          size.y > chamberSize.y * 0.18 &&
          size.y < chamberSize.y * 0.7 &&
          size.x < chamberSize.x * 0.18 &&
          size.z < chamberSize.z * 0.28 &&
          !nameHasAny(obj, ['\u4e3b\u7535\u6e90', '\u7535\u6781\u63a7\u5236', '\u63a2\u9488', 'mainpower', 'motor', 'probe']),
        (_obj, _box, center, size) =>
          size.y * 2.8 - size.x * 0.8 - size.z * 0.7 - Math.abs(center.x - (chamberCenter.x - chamberSize.x * 0.55))
      );
    }

    if (!mainPick.fromPreferred && !mainPick.fromExact) {
      eng.anchor.mainPower = pickRegionMesh(
        root,
        (obj, _box, center, size) =>
          center.x < chamberCenter.x - chamberSize.x * 0.18 &&
          center.y < chamberCenter.y + chamberSize.y * 0.12 &&
          size.x > chamberSize.x * 0.08 &&
          size.z > chamberSize.z * 0.06 &&
          !nameHasAny(obj, deviceExcludes),
        (_obj, _box, center, size) =>
          size.x * size.y * size.z + size.x * 2.6 + size.z * 1.9 + Math.max(0, chamberCenter.x - center.x) * 2.4
      ) || eng.anchor.mainPower;
    }

    if (!probePowerPick.fromPreferred && !probePowerPick.fromExact) {
      eng.anchor.probePower = pickRegionMesh(
        root,
        (obj, _box, center, size) =>
          center.x > chamberCenter.x + chamberSize.x * 0.14 &&
          center.y > chamberCenter.y &&
          size.y > chamberSize.y * 0.05 &&
          !nameHasAny(obj, deviceExcludes),
        (_obj, _box, center, size) =>
          size.x * size.y * size.z + center.y * 1.4 + Math.max(0, center.x - chamberCenter.x) * 0.8
      ) || eng.anchor.probePower;
    }

    if (!motorPick.fromPreferred && !motorPick.fromExact) {
      eng.anchor.motor = pickRegionMesh(
        root,
        (obj, _box, center, size) =>
          center.x > chamberCenter.x + chamberSize.x * 0.12 &&
          center.y < chamberCenter.y + chamberSize.y * 0.1 &&
          size.y > chamberSize.y * 0.06 &&
          !nameHasAny(obj, deviceExcludes) &&
          obj !== eng.anchor.probePower,
        (_obj, _box, center, size) =>
          size.x * size.y * size.z + Math.max(0, center.x - chamberCenter.x) * 1.7 + Math.max(0, chamberCenter.y - center.y) * 1.2
      ) || eng.anchor.motor;
    }

    const alignedMainPower = findAnyExact(root, ['\u7acb\u65b9\u4f53016']);
    const alignedMotor = findAnyExact(root, ['\u67f1\u4f53042']);
    const alignedProbePower = findAnyExact(root, ['\u67f1\u4f53033']);
    if (alignedMainPower && alignedMotor) {
      eng.anchor.mainPower = alignedMainPower;
      eng.anchor.motor = alignedMotor;
      if (alignedProbePower) eng.anchor.probePower = alignedProbePower;
    }

    // Fallback ordering rule only when both were guessed by fallback names.
    if (eng.anchor.mainPower && eng.anchor.motor && !(mainPick.fromExact && motorPick.fromExact) && !(mainPick.fromPreferred && motorPick.fromPreferred)) {
      const pm = new T.Vector3();
      const po = new T.Vector3();
      eng.anchor.mainPower.getWorldPosition(pm);
      eng.anchor.motor.getWorldPosition(po);
      if (pm.x > po.x) {
        const tmp = eng.anchor.mainPower;
        eng.anchor.mainPower = eng.anchor.motor;
        eng.anchor.motor = tmp;
      }
    }

    const makeHelpers = (leftPos, rightPos, frame = null, leftNode = null, rightNode = null) => {
      eng.electrodes.clear();
      const leftHelper = new T.Object3D();
      const rightHelper = new T.Object3D();
      leftHelper.name = 'left_anchor_helper';
      rightHelper.name = 'right_anchor_helper';
      leftHelper.position.copy(leftPos);
      rightHelper.position.copy(rightPos);
      eng.electrodes.add(leftHelper, rightHelper);
      eng.anchor.left = leftHelper;
      eng.anchor.right = rightHelper;
      const resolvedFrame = frame ? { ...frame } : (leftNode && rightNode ? {
        frontA: leftPos.clone(),
        frontB: rightPos.clone(),
        leftInset: 0,
        rightInset: 0,
      } : null);
      const motion = resolvedFrame ? collectGapMotionNodes(root, chamberBox, resolvedFrame.frontA || leftPos, resolvedFrame.frontB || rightPos, leftNode, rightNode) : null;
      if (resolvedFrame) {
        const frameState = {
          ...resolvedFrame,
          modelLeft: leftNode || null,
          modelRight: rightNode || null,
          motionLeft: motion?.left || [],
          motionRight: motion?.right || [],
        };
        frameState.hideNodes = collectSphereReplacementHideNodes(frameState);
        eng.dischargeFrame = frameState;
      } else {
        eng.dischargeFrame = null;
      }
      eng.useModelElectrodes = configureGapRigFromAnchors();
    };

    // Strictly prefer renamed discharge endpoints: ??1 -> ??2.
    const leftPick = pickNamed(
      ['\u7535\u67811', '\u7535\u6781\u4e00', 'electrode1', 'e1'],
      ['\u7acb\u65b9\u4f53.021', '\u7acb\u65b9\u4f53021', '\u7acb\u65b9\u4f53006'],
      ['\u7535\u67811', 'electrode1']
    );
    const rightPick = pickNamed(
      ['\u7535\u67812', '\u7535\u6781\u4e8c', 'electrode2', 'e2'],
      ['\u7acb\u65b9\u4f53.023', '\u7acb\u65b9\u4f53023', '\u7acb\u65b9\u4f53004'],
      ['\u7535\u67812', 'electrode2']
    );

    const leftPreferred = leftPick.obj;
    const rightPreferred = rightPick.obj;

    const hasUserNamedElectrodePair =
      (leftPick.fromPreferred || leftPick.fromExact) &&
      (rightPick.fromPreferred || rightPick.fromExact) &&
      leftPreferred && rightPreferred && leftPreferred !== rightPreferred;

    if (hasUserNamedElectrodePair) {
      const frame = buildFacingPlateAnchors(leftPreferred, rightPreferred, chamberBox);
      if (frame) {
        makeHelpers(frame.a, frame.b, frame, leftPreferred, rightPreferred);
        return;
      }
      const leftPos = electrodeDischargeCenter(leftPreferred, chamberCenter, chamberBox);
      const rightPos = electrodeDischargeCenter(rightPreferred, chamberCenter, chamberBox);
      makeHelpers(leftPos, rightPos, null, leftPreferred, rightPreferred);
      return;
    }

    const centeredPlatePair = findCenteredPlatePairFrame(root, chamberBox);
    if (centeredPlatePair) {
      makeHelpers(
        centeredPlatePair.frame.a,
        centeredPlatePair.frame.b,
        centeredPlatePair.frame,
        centeredPlatePair.left,
        centeredPlatePair.right
      );
      return;
    }

    if (leftPreferred && rightPreferred && leftPreferred !== rightPreferred) {
      const frame = buildFacingPlateAnchors(leftPreferred, rightPreferred, chamberBox);
      if (frame) {
        makeHelpers(frame.a, frame.b, frame, leftPreferred, rightPreferred);
        return;
      }
      const leftPos = electrodeDischargeCenter(leftPreferred, chamberCenter, chamberBox);
      const rightPos = electrodeDischargeCenter(rightPreferred, chamberCenter, chamberBox);
      makeHelpers(leftPos, rightPos, null, leftPreferred, rightPreferred);
      return;
    }

    // Fallback pair: choose inner chamber electrodes, avoid wall feedthrough points.
    const vacBox = chamberBox;
    const vacCenter = chamberCenter.clone();
    const vacSize = vacBox.getSize(new T.Vector3());

    const candidates = [];
    root.traverse((o) => {
      if (!o.isMesh || !o.name) return;
      if (nameHasAny(o, ['\u4e3b\u7535\u6e90', '\u7535\u673a\u63a7\u5236', '\u771f\u7a7a\u7f69', '\u63a2\u9488', 'mainpower', 'motor', 'vacuum', 'probe'])) return;

      const box = new T.Box3().setFromObject(o);
      if (box.isEmpty()) return;
      const s = box.getSize(new T.Vector3());
      const p = box.getCenter(new T.Vector3());
      const plateLike = plateScoreFromBox(box) > 6.2;
      const compact = Math.max(s.x, s.y, s.z) < Math.max(vacSize.x, vacSize.z) * 0.42;

      const inVacCore =
        p.x > vacBox.min.x + vacSize.x * 0.18 &&
        p.x < vacBox.max.x - vacSize.x * 0.18 &&
        p.y > vacBox.min.y + vacSize.y * 0.08 &&
        p.y < vacBox.max.y - vacSize.y * 0.08 &&
        p.z > vacBox.min.z + vacSize.z * 0.18 &&
        p.z < vacBox.max.z - vacSize.z * 0.18;

      if (plateLike && compact && inVacCore) candidates.push({ o, p });
    });

    let bestPair = null;
    let bestScore = -Infinity;
    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        const a = candidates[i];
        const b = candidates[j];
        const d = a.p.distanceTo(b.p);
        if (d < 0.16 || d > Math.max(vacSize.x, vacSize.z) * 0.72) continue;

        const mid = a.p.clone().add(b.p).multiplyScalar(0.5);
        const centerPenalty = mid.distanceTo(vacCenter) * 1.2;
        const alignPenalty = Math.abs(a.p.y - b.p.y) * 0.7;
        const symmetryPenalty = Math.abs(a.p.distanceTo(vacCenter) - b.p.distanceTo(vacCenter)) * 0.55;
        const yNorm = clamp((mid.y - vacBox.min.y) / Math.max(vacSize.y, 1e-6), 0, 1);
        const score = d * 1.18 - centerPenalty - alignPenalty - symmetryPenalty + yNorm * 0.95 - (yNorm < 0.48 ? 0.65 : 0);

        if (score > bestScore) {
          bestScore = score;
          bestPair = [a, b];
        }
      }
    }

    if (bestPair) {
      const [a, b] = bestPair;
      const leftObj = a.p.x <= b.p.x ? a : b;
      const rightObj = leftObj === a ? b : a;
      const frame = buildFacingPlateAnchors(leftObj.o, rightObj.o, chamberBox);
      if (frame) {
        makeHelpers(frame.a, frame.b, frame, leftObj.o, rightObj.o);
      } else {
        const leftPos = electrodeDischargeCenter(leftObj.o, chamberCenter, chamberBox);
        const rightPos = electrodeDischargeCenter(rightObj.o, chamberCenter, chamberBox);
        makeHelpers(leftPos, rightPos, null, leftObj.o, rightObj.o);
      }
    } else {
      eng.useModelElectrodes = false;
      eng.gapRig = null;
      eng.dischargeFrame = null;
    }
  }

  function scanNodes(root) {
    const map = [
      { k: 'motor', t: ['motor', '\u7535\u673a', 'servo', 'step'] },
      { k: 'mainPower', t: ['main_power', '\u4e3b\u7535\u6e90', 'hv', 'power'] },
      { k: 'vacuum', t: ['vacuum', 'tube', 'chamber', '\u7f69', '\u67f1'] },
      { k: 'pressureGauge', t: ['pressure', 'gauge', 'pcm300kf', '20kpa', '\u6c14\u538b', '\u538b\u529b', '\u538b\u5f3a'] },
      { k: 'probePower', t: ['probe_power', '\u63a2\u9488\u7535\u6e90', 'bias'] },
      { k: 'probe', t: ['probe', '\u63a2\u9488'] },
      { k: 'left', t: ['left', '\u5de6', 'anode', 'plate_l', 'needle'] },
      { k: 'right', t: ['right', '\u53f3', 'cathode', 'plate_r'] },
    ];
    root.traverse((o) => {
      if (!o.name) return;
      const n = o.name.toLowerCase();
      map.forEach((m) => {
        if (eng.anchor[m.k]) return;
        if (m.t.some((x) => n.includes(x.toLowerCase()))) eng.anchor[m.k] = o;
      });
    });
  }
  function findByName(root, tokens) {
    let out = null;
    root.traverse((o) => {
      if (out || !o.name) return;
      const n = o.name.toLowerCase();
      if (tokens.some((x) => n.includes(x.toLowerCase()))) out = o;
    });
    return out;
  }

  function rebuildHotspots(obj) {
    const T = eng.T;
    eng.hotspots.clear();

    const m = new T.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
      colorWrite: false,
    });

    const addBox = (part, target, pad = 1.2) => {
      if (!target) return false;
      const box = new T.Box3().setFromObject(target);
      if (box.isEmpty()) return false;

      const center = box.getCenter(new T.Vector3());
      const size = box.getSize(new T.Vector3()).multiplyScalar(pad);
      const isPressureGauge = part === 'vacuum' && target === eng.anchor.pressureGauge;
      size.x = Math.max(size.x, isPressureGauge ? 0.16 : 0.45);
      size.y = Math.max(size.y, isPressureGauge ? 0.3 : 0.35);
      size.z = Math.max(size.z, isPressureGauge ? 0.16 : 0.35);

      if (part === 'vacuum' && !isPressureGauge) {
        size.x *= 0.84;
        size.z *= 0.84;
      }

      if (part === 'mainPower' || part === 'motor' || part === 'probePower') {
        center.z -= size.z * 0.22;
        size.z *= 0.66;
      }

      if (part === 'motor') {
        center.y -= size.y * 0.06;
        size.x *= 1.08;
        size.y *= 1.14;
        size.z *= 0.9;
      }

      if (part === 'probePower') {
        center.y += size.y * 0.14;
        size.x *= 0.88;
        size.y *= 0.78;
        size.z *= 0.82;
      }

      const mesh = new T.Mesh(new T.BoxGeometry(size.x, size.y, size.z), m);
      mesh.position.copy(center);
      mesh.name = `hotspot_${part}`;
      mesh.userData.part = part;
      eng.hotspots.add(mesh);
      return true;
    };

    const addFrontPlate = (part, target, options = {}) => {
      if (!target) return false;
      const box = new T.Box3().setFromObject(target);
      if (box.isEmpty()) return false;

      const fullSize = box.getSize(new T.Vector3());
      const size = fullSize.clone();
      size.x = Math.max(size.x * (options.xScale ?? 0.92), options.minX ?? 0.52);
      size.y = Math.max(size.y * (options.yScale ?? 0.72), options.minY ?? 0.42);
      size.z = Math.max(size.z * (options.zScale ?? 0.22), options.minZ ?? 0.18);

      const center = box.getCenter(new T.Vector3());
      center.y += fullSize.y * (options.yBias ?? 0);
      center.z = box.max.z + size.z * (options.outset ?? 0.28);

      const mesh = new T.Mesh(new T.BoxGeometry(size.x, size.y, size.z), m);
      mesh.position.copy(center);
      mesh.name = `hotspot_${part}_front`;
      mesh.userData.part = part;
      eng.hotspots.add(mesh);
      return true;
    };

    const addMainPowerSwitchHotspot = (target) => {
      if (!target) return false;
      const box = new T.Box3().setFromObject(target);
      if (box.isEmpty()) return false;
      const size = box.getSize(new T.Vector3());
      const center = new T.Vector3(
        box.min.x + size.x * 0.92,
        box.min.y + size.y * 0.52,
        box.min.z - size.z * 0.035
      );
      const mesh = new T.Mesh(
        new T.BoxGeometry(
          Math.max(size.x * 0.16, 0.14),
          Math.max(size.y * 0.30, 0.16),
          Math.max(size.z * 0.20, 0.10)
        ),
        m
      );
      mesh.position.copy(center);
      mesh.name = 'hotspot_main_power_switch';
      mesh.userData.part = 'mainPowerSwitch';
      eng.hotspots.add(mesh);
      return true;
    };

    let added = 0;
    added += addBox('motor', eng.anchor.motor, 1.1) ? 1 : 0;
    added += addBox('mainPower', eng.anchor.mainPower, 1.12) ? 1 : 0;
    added += addBox('vacuum', eng.anchor.pressureGauge || eng.anchor.vacuum, 1.16) ? 1 : 0;
    added += addBox('probePower', eng.anchor.probePower, 0.88) ? 1 : 0;
    added += addFrontPlate('motor', eng.anchor.motor, { xScale: 0.88, yScale: 0.76, zScale: 0.2, minX: 0.28, minY: 0.24, minZ: 0.16, yBias: -0.05, outset: 0.24 }) ? 1 : 0;
    added += addFrontPlate('mainPower', eng.anchor.mainPower, { xScale: 0.84, yScale: 0.42, zScale: 0.16, minX: 0.42, minY: 0.16, minZ: 0.12, yBias: -0.2, outset: 0.2 }) ? 1 : 0;
    addMainPowerSwitchHotspot(eng.anchor.mainPower);
    added += addFrontPlate('probePower', eng.anchor.probePower, { xScale: 0.82, yScale: 0.42, zScale: 0.16, minX: 0.24, minY: 0.14, minZ: 0.1, yBias: -0.14, outset: 0.18 }) ? 1 : 0;
    addGroundHotspot();

    if (added) return;

    const box = new T.Box3().setFromObject(obj);
    const s = box.getSize(new T.Vector3());
    const min = box.min;
    const max = box.max;
    const r = Math.max(s.length() * 0.025, 0.15);
    const pts = {
      motor: new T.Vector3(min.x + s.x * 0.15, min.y + s.y * 0.22, max.z - s.z * 0.12),
      mainPower: new T.Vector3(max.x - s.x * 0.15, min.y + s.y * 0.25, max.z - s.z * 0.12),
      vacuum: new T.Vector3((min.x + max.x) / 2, min.y + s.y * 0.57, (min.z + max.z) / 2),
      probePower: new T.Vector3((min.x + max.x) / 2, min.y + s.y * 0.25, max.z - s.z * 0.16),
    };

    Object.entries(pts).forEach(([k, p]) => {
      const mesh = new T.Mesh(new T.SphereGeometry(r, 16, 16), m);
      mesh.position.copy(p);
      mesh.name = `hotspot_${k}`;
      mesh.userData.part = k;
      eng.hotspots.add(mesh);
    });
    addGroundHotspot();

    function addGroundHotspot() {
      const vacuum = eng.anchor.vacuum;
      if (!vacuum) return false;
      const box = new T.Box3().setFromObject(vacuum);
      if (box.isEmpty()) return false;
      const center = box.getCenter(new T.Vector3());
      const size = box.getSize(new T.Vector3());
      const radius = Math.max(size.x, size.z) * 0.5;
      const y = box.min.y - Math.max(size.y * 0.045, 0.08);
      const hotspotSize = Math.max(radius * 0.18, 0.28);
      const points = [
        new T.Vector3(center.x + radius * 0.86, y, center.z + radius * 1.05),
        new T.Vector3(center.x + radius * 0.86, y, center.z - radius * 1.05),
        new T.Vector3(center.x - radius * 0.86, y, center.z + radius * 1.05),
        new T.Vector3(center.x - radius * 0.86, y, center.z - radius * 1.05),
      ];
      points.forEach((point, i) => {
        const mesh = new T.Mesh(new T.BoxGeometry(hotspotSize, hotspotSize, hotspotSize), m);
        mesh.position.copy(point);
        mesh.name = `hotspot_ground_${i + 1}`;
        mesh.userData.part = 'ground';
        eng.hotspots.add(mesh);
      });
      eng.anchor.ground = eng.hotspots.getObjectByName('hotspot_ground_1') || null;
      return true;
    }
  }

  function rebuildControlKnobs() {
    const T = eng.T;
    const existing = eng.machine.getObjectByName('detail_overlays');
    if (existing) eng.machine.remove(existing);
    eng.instrumentScreens3d = {};
    if (eng.rawModelRender) return;

    const overlays = new T.Group();
    overlays.name = 'detail_overlays';
    eng.machine.add(overlays);

    const knobMaterial = new T.MeshStandardMaterial({ color: 0x111111, metalness: 0.18, roughness: 0.82 });

    const addKnob = (target, part, config) => {
      if (!target || target.visible === false) return;
      const box = new T.Box3().setFromObject(target);
      if (box.isEmpty()) return;

      const size = box.getSize(new T.Vector3());
      const radius = Math.max(Math.min(size.x, size.y, size.z) * (config.radiusScale ?? 0.085), config.minRadius ?? 0.03);
      const length = Math.max(radius * (config.lengthScale ?? 0.95), config.minLength ?? 0.02);
      const knob = new T.Mesh(new T.CylinderGeometry(radius, radius * 0.94, length, 24), knobMaterial);
      knob.rotation.x = Math.PI / 2;
      knob.position.set(
        box.min.x + size.x * config.x,
        box.min.y + size.y * config.y,
        box.max.z + length * (config.outset ?? 0.32)
      );
      knob.userData.part = part;
      knob.name = 'detail_' + part + '_knob';
      overlays.add(knob);
    };

    const addPanelTexture = (target, name, url, config = {}) => {
      if (!target || target.visible === false) return;
      const box = new T.Box3().setFromObject(target);
      if (box.isEmpty()) return;
      const size = box.getSize(new T.Vector3());
      const width = config.fullFace
        ? size.x * (config.width ?? 1)
        : clamp(size.x * (config.width ?? 0.86), config.minWidth ?? 0.3, config.maxWidth ?? 1.2);
      const height = config.fullFace
        ? size.y * (config.height ?? 1)
        : clamp(size.y * (config.height ?? 0.72), config.minHeight ?? 0.2, config.maxHeight ?? 0.9);
      const texture = new T.TextureLoader().load(url, () => {
        texture.colorSpace = T.SRGBColorSpace;
        texture.needsUpdate = true;
      });
      texture.wrapS = T.ClampToEdgeWrapping;
      texture.wrapT = T.ClampToEdgeWrapping;
      const material = new T.MeshBasicMaterial({
        map: texture,
        transparent: false,
        toneMapped: false,
        side: config.singleSided ? T.FrontSide : T.DoubleSide,
        depthTest: config.depthTest ?? true,
        depthWrite: config.depthWrite ?? false,
      });
      const makePlane = (z, flip = false) => {
        if (config.frontOnly && flip) return;
        if (config.backOnly && !flip) return;
        if (config.face === 'front' && flip) return;
        if (config.face === 'back' && !flip) return;
        if (config.backingColor) {
          const backing = new T.Mesh(
            new T.PlaneGeometry(width * (config.backingScaleX ?? 1.06), height * (config.backingScaleY ?? 1.06)),
            new T.MeshBasicMaterial({
              color: config.backingColor,
              side: T.DoubleSide,
              depthTest: config.depthTest ?? true,
              depthWrite: true,
            })
          );
          backing.name = `detail_${name}_panel_backing_${flip ? 'back' : 'front'}`;
          backing.position.set(
            box.min.x + size.x * (config.x ?? 0.5),
            box.min.y + size.y * (config.y ?? 0.5),
            z + (flip ? 0.001 : -0.001)
          );
          if (flip) backing.rotation.y = Math.PI;
          backing.renderOrder = (config.renderOrder ?? 12) - 1;
          overlays.add(backing);
        }
        const plane = new T.Mesh(new T.PlaneGeometry(width, height), material);
        plane.name = `detail_${name}_panel_texture_${flip ? 'back' : 'front'}`;
        plane.position.set(
          box.min.x + size.x * (config.x ?? 0.5),
          box.min.y + size.y * (config.y ?? 0.5),
          z
        );
        if (flip) plane.rotation.y = Math.PI;
        plane.renderOrder = config.renderOrder ?? 12;
        overlays.add(plane);
      };
      makePlane(
        box.max.z + (config.zOffset ?? 0.018),
        false
      );
      makePlane(
        box.min.z - (config.zOffset ?? 0.018),
        true
      );
    };

    const addMotorControlPanelTexture = (target, url, config = {}) => {
      if (!target || target.visible === false) return;
      const box = new T.Box3().setFromObject(target);
      if (box.isEmpty()) return;
      const size = box.getSize(new T.Vector3());
      const width = size.x * (config.width ?? 1);
      const height = size.y * (config.height ?? 1);
      const canvas = document.createElement('canvas');
      canvas.width = 1998;
      canvas.height = 2097;
      const texture = new T.CanvasTexture(canvas);
      texture.colorSpace = T.SRGBColorSpace;
      texture.wrapS = T.ClampToEdgeWrapping;
      texture.wrapT = T.ClampToEdgeWrapping;
      texture.minFilter = T.LinearFilter;
      texture.magFilter = T.LinearFilter;
      const material = new T.MeshBasicMaterial({
        map: texture,
        transparent: false,
        toneMapped: false,
        side: T.FrontSide,
        depthTest: config.depthTest ?? true,
        depthWrite: config.depthWrite ?? true,
      });
      const image = new Image();
      image.onload = () => {
        eng.motorControlPanel3d.imageReady = true;
        renderMotorControlPanelTexture();
      };
      image.src = url;

      if (config.backingColor) {
        const backing = new T.Mesh(
          new T.PlaneGeometry(width * (config.backingScaleX ?? 1.01), height * (config.backingScaleY ?? 1.01)),
          new T.MeshBasicMaterial({
            color: config.backingColor,
            side: T.DoubleSide,
            depthTest: true,
            depthWrite: true,
          })
        );
        backing.name = 'detail_motor_control_dynamic_backing';
        backing.position.set(
          box.min.x + size.x * (config.x ?? 0.5),
          box.min.y + size.y * (config.y ?? 0.5),
          box.min.z - (config.zOffset ?? 0.01) + 0.001
        );
        backing.rotation.y = Math.PI;
        backing.renderOrder = (config.renderOrder ?? 10) - 1;
        overlays.add(backing);
      }

      const plane = new T.Mesh(new T.PlaneGeometry(width, height), material);
      plane.name = 'detail_motor_control_dynamic_panel';
      plane.position.set(
        box.min.x + size.x * (config.x ?? 0.5),
        box.min.y + size.y * (config.y ?? 0.5),
        box.min.z - (config.zOffset ?? 0.01)
      );
      plane.rotation.y = Math.PI;
      plane.renderOrder = config.renderOrder ?? 10;
      overlays.add(plane);

      eng.motorControlPanel3d = { canvas, texture, image, imageReady: false, lastText: '', lastProbe: '', plane };
      renderMotorControlPanelTexture();
    };

    const addMainRackPowerPanelTexture = (target, config = {}) => {
      if (!target || target.visible === false) return;
      const box = new T.Box3().setFromObject(target);
      if (box.isEmpty()) return;
      const size = box.getSize(new T.Vector3());
      const width = clamp(size.x * (config.width ?? 0.58), config.minWidth ?? 0.7, config.maxWidth ?? 2.1);
      const height = clamp(size.y * (config.height ?? 0.28), config.minHeight ?? 0.18, config.maxHeight ?? 0.52);
      const canvas = document.createElement('canvas');
      canvas.width = 960;
      canvas.height = 390;
      const texture = new T.CanvasTexture(canvas);
      texture.colorSpace = T.SRGBColorSpace;
      texture.wrapS = T.ClampToEdgeWrapping;
      texture.wrapT = T.ClampToEdgeWrapping;
      texture.minFilter = T.LinearFilter;
      texture.magFilter = T.LinearFilter;
      const material = new T.MeshBasicMaterial({
        map: texture,
        transparent: false,
        toneMapped: false,
        side: T.FrontSide,
        depthTest: true,
        depthWrite: true,
      });
      const plane = new T.Mesh(new T.PlaneGeometry(width, height), material);
      plane.name = 'detail_main_rack_power_dynamic_panel';
      plane.position.set(
        box.min.x + size.x * (config.x ?? 0.33) + (config.worldXOffset ?? 0),
        box.min.y + size.y * (config.y ?? 0.50) + (config.worldYOffset ?? 0),
        box.min.z - (config.zOffset ?? 0.018) + (config.worldZOffset ?? 0)
      );
      plane.rotation.y = Math.PI;
      plane.renderOrder = config.renderOrder ?? 24;
      overlays.add(plane);
      const image = new Image();
      image.onload = () => {
        if (eng.mainRackPowerPanel3d) {
          eng.mainRackPowerPanel3d.imageReady = true;
          eng.mainRackPowerPanel3d.lastText = '';
          renderMainRackPowerPanelTexture();
        }
      };
      image.src = config.imageUrl || './main_power_panel_texture_20260515.png';
      eng.mainRackPowerPanel3d = { canvas, texture, image, imageReady: false, lastText: '', plane };
      renderMainRackPowerPanelTexture();
    };

    const addMainRackPowerKnob = (target, config = {}) => {
      if (!target || target.visible === false) return;
      const box = new T.Box3().setFromObject(target);
      if (box.isEmpty()) return;
      const size = box.getSize(new T.Vector3());
      const radius = clamp(size.y * (config.radiusScale ?? 0.095), config.minRadius ?? 0.08, config.maxRadius ?? 0.16);
      const length = clamp(size.z * (config.lengthScale ?? 0.06), config.minLength ?? 0.035, config.maxLength ?? 0.08);
      const group = new T.Group();
      group.name = 'detail_main_power_physical_knob';
      group.userData.part = 'mainPower';
      group.position.set(
        box.min.x + size.x * (config.x ?? 0.86),
        box.min.y + size.y * (config.y ?? 0.55),
        box.min.z - length * 0.72 + (config.zOffset ?? 0)
      );
      const knobMat = new T.MeshStandardMaterial({
        color: 0xd8d3bd,
        metalness: 0.18,
        roughness: 0.48,
      });
      const rimMat = new T.MeshStandardMaterial({
        color: 0xf1eee2,
        metalness: 0.16,
        roughness: 0.34,
      });
      const markMat = new T.MeshStandardMaterial({
        color: 0x11141a,
        metalness: 0.04,
        roughness: 0.55,
      });
      const body = new T.Mesh(new T.CylinderGeometry(radius, radius * 0.92, length, 48), knobMat);
      body.rotation.x = Math.PI / 2;
      body.userData.part = 'mainPower';
      group.add(body);
      const rim = new T.Mesh(new T.TorusGeometry(radius * 0.98, radius * 0.055, 10, 56), rimMat);
      rim.position.z = -length * 0.52;
      rim.userData.part = 'mainPower';
      group.add(rim);
      const mark = new T.Mesh(
        new T.BoxGeometry(radius * 0.12, radius * 0.72, length * 0.28),
        markMat
      );
      mark.position.set(-radius * 0.25, radius * 0.12, -length * 0.78);
      mark.rotation.z = -0.95;
      mark.userData.part = 'mainPower';
      group.add(mark);
      overlays.add(group);
    };

    const addXFacePanelTexture = (target, name, url, config = {}) => {
      if (!target || target.visible === false) return;
      const box = new T.Box3().setFromObject(target);
      if (box.isEmpty()) return;
      const size = box.getSize(new T.Vector3());
      const width = clamp(size.z * (config.width ?? 0.96), config.minWidth ?? 0.2, config.maxWidth ?? 1.2);
      const height = clamp(size.y * (config.height ?? 0.96), config.minHeight ?? 0.2, config.maxHeight ?? 1.2);
      const texture = new T.TextureLoader().load(url, () => {
        texture.colorSpace = T.SRGBColorSpace;
        texture.needsUpdate = true;
      });
      const material = new T.MeshBasicMaterial({
        map: texture,
        transparent: false,
        toneMapped: false,
        side: T.DoubleSide,
        depthTest: false,
        depthWrite: false,
      });
      const faceX = config.side === 'max' ? box.max.x + (config.xOffset ?? 0.002) : box.min.x - (config.xOffset ?? 0.002);
      const rotationY = config.side === 'max' ? Math.PI / 2 : -Math.PI / 2;
      const centerY = box.min.y + size.y * (config.y ?? 0.5);
      const centerZ = box.min.z + size.z * (config.z ?? 0.5);

      if (config.backingColor) {
        const backing = new T.Mesh(
          new T.PlaneGeometry(width * (config.backingScaleX ?? 1), height * (config.backingScaleY ?? 1)),
          new T.MeshBasicMaterial({
            color: config.backingColor,
            side: T.DoubleSide,
            depthTest: false,
            depthWrite: true,
            toneMapped: false,
          })
        );
        backing.name = `detail_${name}_xface_backing`;
        backing.rotation.y = rotationY;
        backing.position.set(faceX, centerY, centerZ);
        backing.renderOrder = (config.renderOrder ?? 20) - 1;
        overlays.add(backing);
      }

      const plane = new T.Mesh(new T.PlaneGeometry(width, height), material);
      plane.name = `detail_${name}_xface_texture`;
      plane.rotation.y = rotationY;
      plane.position.set(faceX + (config.side === 'max' ? 0.0005 : -0.0005), centerY, centerZ);
      plane.renderOrder = config.renderOrder ?? 20;
      overlays.add(plane);
    };

    const addReliefCover = (target, name, color, config = {}) => {
      if (!target || target.visible === false) return;
      const box = new T.Box3().setFromObject(target);
      if (box.isEmpty()) return;
      const size = box.getSize(new T.Vector3());
      const face = config.face || 'minX';
      const alongZ = face === 'minX' || face === 'maxX';
      const width = clamp((alongZ ? size.z : size.x) * (config.width ?? 0.42), config.minWidth ?? 0.08, config.maxWidth ?? 0.38);
      const height = clamp(size.y * (config.height ?? 0.18), config.minHeight ?? 0.03, config.maxHeight ?? 0.16);
      const cover = new T.Mesh(
        new T.PlaneGeometry(width, height),
        new T.MeshBasicMaterial({
          color,
          side: T.DoubleSide,
          depthTest: false,
          depthWrite: true,
          toneMapped: false,
        })
      );
      cover.name = `detail_${name}_relief_cover`;
      const centerY = box.min.y + size.y * (config.y ?? 0.32);
      const centerX = box.min.x + size.x * (config.x ?? 0.5);
      const centerZ = box.min.z + size.z * (config.z ?? 0.5);
      if (face === 'minX' || face === 'maxX') {
        cover.rotation.y = face === 'maxX' ? Math.PI / 2 : -Math.PI / 2;
        cover.position.set(face === 'maxX' ? box.max.x + 0.001 : box.min.x - 0.001, centerY, centerZ);
      } else {
        cover.rotation.y = face === 'back' ? Math.PI : 0;
        cover.position.set(centerX, centerY, face === 'back' ? box.min.z - 0.001 : box.max.z + 0.001);
      }
      cover.renderOrder = config.renderOrder ?? 9;
      overlays.add(cover);
    };


    // The current GLB is viewed from the opposite side of the original naming,
    // so bind these readouts by the visible instrument positions instead.
    const scenePowerBody = findAnyExact(eng.machine, ['\u7acb\u65b9\u4f53016']) || eng.anchor.motor || eng.anchor.mainPower;
    const sceneControlBody = findAnyExact(eng.machine, ['\u67f1\u4f53042']) || eng.anchor.mainPower || eng.anchor.motor;
    const dcPowerBody = findAnyExact(eng.machine, ['DC5_plain_rectangular_body']) || findAnyExact(eng.machine, ['dc5plainrectangularbody']);

    const upperSupplyBody = findAnyExact(eng.machine, ['\u67f1\u4f53033']) || eng.anchor.probePower;

    if (scenePowerBody) {
      const box = new T.Box3().setFromObject(scenePowerBody);
      if (!box.isEmpty()) {
        const size = box.getSize(new T.Vector3());
        const fillMat = new T.MeshBasicMaterial({
          color: 0x050505,
          side: T.FrontSide,
          depthTest: true,
          depthWrite: true,
          toneMapped: false,
        });
        const addInnerBacking = (name, z, flip = false) => {
          const backing = new T.Mesh(new T.PlaneGeometry(size.x * 0.985, size.y * 0.86), fillMat.clone());
          backing.name = name;
          backing.position.set(
            box.min.x + size.x * 0.5,
            box.min.y + size.y * 0.51,
            z
          );
          if (flip) backing.rotation.y = Math.PI;
          backing.renderOrder = 1;
          overlays.add(backing);
        };
        addInnerBacking('main_power_inner_fill_front', box.min.z + 0.228, true);
      }
    }

    addMotorControlPanelTexture(sceneControlBody, './control-panel-reference-clean.png', {
      x: 0.5,
      y: 0.5,
      width: 1,
      height: 1,
      zOffset: 0.01,
      backingColor: 0xf7f7f2,
      backingScaleX: 1.01,
      backingScaleY: 1.01,
      renderOrder: 10,
    });
    addPanelTexture(upperSupplyBody, 'upper_dc_supply_flat', './dc_power_supply_flat_front_texture_clean_20260512.png', {
      x: 0.5,
      y: 0.5,
      width: 1,
      height: 1,
      fullFace: true,
      zOffset: 0.012,
      face: 'back',
      singleSided: true,
      depthTest: true,
      depthWrite: true,
      renderOrder: 18,
    });
    addMainRackPowerPanelTexture(scenePowerBody, {
      x: 0.68,
      y: 0.53,
      width: 0.38,
      height: 0.50,
      zOffset: 0,
      minWidth: 0.74,
      maxWidth: 1.62,
      minHeight: 0.36,
      maxHeight: 0.98,
      worldXOffset: 0.18,
      worldYOffset: 0.04,
      worldZOffset: 0.15,
      renderOrder: 120,
      depthTest: false,
      depthWrite: false,
      imageUrl: './main_power_panel_texture_20260515.png',
    });
    addRealtimeInstrumentScreen(overlays, upperSupplyBody, 'probeVoltage', {
      screenKey: 'probeVoltageSupply',
      x: 0.5,
      y: 0.73,
      width: 0.84,
      height: 0.23,
      minWidth: 0.38,
      maxWidth: 0.86,
      minHeight: 0.12,
      maxHeight: 0.24,
      zOffset: 0.036,
      backOnly: true,
      singleSided: true,
      transparent: false,
      opacity: 1,
      renderOnTop: true,
      renderOrder: 96,
      style: 'probePowerLcd',
    });
    addRealtimeInstrumentScreen(overlays, eng.anchor.pressureGauge, 'pressureGauge', {
      x: 0.5,
      y: 0.56,
      width: 0.92,
      height: 0.34,
      maxWidth: 0.16,
      minWidth: 0.1,
      maxHeight: 0.14,
      minHeight: 0.09,
      zOffset: 0.012,
      style: 'green',
    });
    renderInstrumentSceneScreens();
  }

  function addRealtimeInstrumentScreen(parent, target, configKey, placement) {
    if (!eng.ok || !target || target.visible === false) return;
    const T = eng.T;
    const config = INSTRUMENT_PANEL_CONFIGS[configKey];
    if (!config) return;

    const box = new T.Box3().setFromObject(target);
    if (box.isEmpty()) return;
    const size = box.getSize(new T.Vector3());
    const width = clamp(size.x * placement.width, placement.minWidth || 0.18, placement.maxWidth || 1.2);
    const height = clamp(size.y * placement.height, placement.minHeight || 0.06, placement.maxHeight || 1.2);
      const center = new T.Vector3(
      box.min.x + size.x * placement.x + (placement.worldXOffset ?? 0),
      box.min.y + size.y * placement.y + (placement.worldYOffset ?? 0),
      0
    );

    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 288;
    const texture = new T.CanvasTexture(canvas);
    texture.minFilter = T.LinearFilter;
    texture.magFilter = T.LinearFilter;
    texture.needsUpdate = true;

    const material = new T.MeshBasicMaterial({
      map: texture,
      transparent: placement.transparent ?? true,
      opacity: placement.opacity ?? 0.96,
      depthWrite: placement.depthWrite ?? false,
      depthTest: placement.depthTest ?? true,
      side: placement.singleSided ? T.FrontSide : T.DoubleSide,
      toneMapped: false,
    });
    if (placement.renderOnTop) {
      material.depthTest = false;
      material.depthWrite = false;
      material.polygonOffset = true;
      material.polygonOffsetFactor = -4;
      material.polygonOffsetUnits = -4;
    }

    const makePlane = (z, flip = false) => {
      if (placement.frontOnly && flip) return null;
      if (placement.backOnly && !flip) return null;
      const plane = new T.Mesh(new T.PlaneGeometry(width, height), material);
      plane.position.set(center.x, center.y, z);
      if (flip) plane.rotation.y = Math.PI;
      plane.renderOrder = placement.renderOrder ?? 42;
      const screenKey = placement.screenKey || configKey;
      plane.name = `realtime_${screenKey}_screen_${flip ? 'back' : 'front'}`;
      parent.add(plane);
      return plane;
    };

    const front = makePlane(box.max.z + placement.zOffset + (placement.worldZOffset ?? 0), false);
    const back = makePlane(box.min.z - placement.zOffset + (placement.worldZOffset ?? 0), true);
    eng.instrumentScreens3d[placement.screenKey || configKey] = {
      canvas,
      texture,
      config,
      placement,
      planes: [front, back],
      lastText: '',
    };
  }

  function renderInstrumentSceneScreens() {
    if (!eng.ok || !eng.instrumentScreens3d) return;
    renderMotorControlPanelTexture();
    renderMainRackPowerPanelTexture();
    Object.values(eng.instrumentScreens3d).forEach((screen) => {
      if (!screen?.canvas || !screen.texture || !screen.config) return;
      const value = Number(state[screen.config.key]) || 0;
      const text = screen.config.sceneFormat ? screen.config.sceneFormat(value) : screen.config.format(value);
      if (text === screen.lastText) return;
      drawInstrumentSceneScreen(screen, text);
      screen.lastText = text;
      screen.texture.needsUpdate = true;
    });
    renderSceneReadoutText();
  }

  function renderMainRackPowerPanelTexture() {
    const panel = eng.mainRackPowerPanel3d;
    if (!panel?.canvas || !panel.texture) return;
    const c = panel.canvas;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const stateText = mainPowerDisplaySignature();
    if (panel.lastText === stateText) return;

    const data = getMainPowerDisplayData();
    ctx.clearRect(0, 0, c.width, c.height);

    if (panel.imageReady && panel.image?.complete) {
      ctx.drawImage(panel.image, 0, 0, c.width, c.height);
    } else {
      const panelGrad = ctx.createLinearGradient(0, 0, c.width, c.height);
      panelGrad.addColorStop(0, '#263954');
      panelGrad.addColorStop(0.45, '#102033');
      panelGrad.addColorStop(1, '#222727');
      ctx.fillStyle = panelGrad;
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.strokeStyle = 'rgba(145, 188, 235, 0.42)';
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 104, 410, 136);
    }

    const mainVoltage = String(data.voltageText || '0V').replace(/V$/i, '');
    const mainCurrent = String(data.currentText || '0A').replace(/A$/i, '');
    const mainPower = String(data.powerText || '0W').replace(/W$/i, '');
    const drawMeter = (value, unit, label, x, y, color, glow, size = 31) => {
      ctx.save();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = `900 ${size}px Sora, Arial, sans-serif`;
      ctx.shadowBlur = 13;
      ctx.shadowColor = glow;
      ctx.fillStyle = color;
      ctx.fillText(`${value}${unit}`, x, y);
      ctx.font = '900 14px IBM Plex Sans, Arial, sans-serif';
      ctx.shadowBlur = 7;
      ctx.fillStyle = '#fff7fb';
      ctx.fillText(label, x + 2, y + size * 0.62);
      ctx.restore();
    };
    drawMeter(Number(mainCurrent).toFixed(4), 'A', 'CURRENT A', 58, 138, '#58f878', 'rgba(74, 255, 105, 0.92)', 31);
    drawMeter(Number(mainVoltage).toFixed(1), 'V', 'VOLTAGE V', 212, 138, '#ff4c3b', 'rgba(255, 65, 50, 0.95)', 31);
    drawMeter(Number(mainPower).toFixed(2), 'W', 'POWER W', 122, 196, '#9fbeff', 'rgba(143, 184, 255, 0.95)', 31);

    panel.lastText = stateText;
    panel.texture.needsUpdate = true;
  }

  function renderMotorControlPanelTexture() {
    const panel = eng.motorControlPanel3d;
    if (!panel?.canvas || !panel.texture) return;
    const c = panel.canvas;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const stateText = `${state.controlInstrumentMode}|${state.gapMm}|${state.probeHeightMm}|${state.probeHorizontalMm}`;
    if (stateText === panel.lastText && panel.renderedWithImage === panel.imageReady) return;
    ctx.clearRect(0, 0, c.width, c.height);
    if (panel.imageReady) ctx.drawImage(panel.image, 0, 0, c.width, c.height);
    else {
      ctx.fillStyle = '#f8f8f4';
      ctx.fillRect(0, 0, c.width, c.height);
    }

    const screen = { canvas: document.createElement('canvas') };
    screen.canvas.width = 900;
    screen.canvas.height = 330;
    drawSceneMotorReadout(screen.canvas.getContext('2d'), screen.canvas, []);
    ctx.drawImage(screen.canvas, 435, 500, 900, 330);

    panel.lastText = stateText;
    panel.renderedWithImage = panel.imageReady;
    panel.texture.needsUpdate = true;
  }

  function renderSceneReadoutText() {
    Object.values(INSTRUMENT_PANEL_CONFIGS).forEach((config) => {
      if (!config.sceneReadoutId) return;
      const el = id(config.sceneReadoutId);
      if (!el) return;
      const value = Number(state[config.key]) || 0;
      el.textContent = config.sceneFormat ? config.sceneFormat(value) : config.format(value);
    });
  }

  function updateSceneReadoutOverlays() {
    if (!eng.ok || !eng.camera || !refs.canvas || !eng.instrumentScreens3d) return;
    const canvasRect = refs.canvas.getBoundingClientRect();
    const panelRect = refs.canvas.parentElement.getBoundingClientRect();
    Object.values(eng.instrumentScreens3d).forEach((screen) => {
      const el = id(screen?.config?.sceneReadoutId);
      const plane = screen?.planes?.[0];
      if (!el || !plane) return;

      const pos = new eng.T.Vector3();
      plane.getWorldPosition(pos);
      pos.project(eng.camera);

      const visible = Number.isFinite(pos.x) && Number.isFinite(pos.y) && Number.isFinite(pos.z)
        && pos.z > -1 && pos.z < 1
        && pos.x > -1.14 && pos.x < 1.14
        && pos.y > -1.14 && pos.y < 1.14;

      if (!visible) {
        el.classList.remove('visible');
        return;
      }

      const x = canvasRect.left - panelRect.left + (pos.x * 0.5 + 0.5) * canvasRect.width;
      const y = canvasRect.top - panelRect.top + (-pos.y * 0.5 + 0.5) * canvasRect.height;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.classList.add('visible');
    });
  }

  function drawInstrumentSceneScreen(screen, text) {
    const c = screen.canvas;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const red = screen.placement?.style === 'red';
    const green = screen.placement?.style === 'green';
    const probeDigital = screen.placement?.style === 'probeDigital';
    const probeSupplyPanel = screen.placement?.style === 'probeSupplyPanel';
    const probePowerLcd = screen.placement?.style === 'probePowerLcd';
    const motorLcd = screen.placement?.style === 'motorLcd';
    const key = screen.config?.key;
    const parts = String(text || '').split('|');

    ctx.clearRect(0, 0, c.width, c.height);
    if (motorLcd) {
      drawSceneMotorReadout(ctx, c, parts);
      return;
    }
    const bg = ctx.createLinearGradient(0, 0, c.width, c.height);
    if (probeSupplyPanel) {
      bg.addColorStop(0, 'rgba(215, 220, 214, 1)');
      bg.addColorStop(0.52, 'rgba(170, 176, 169, 0.98)');
      bg.addColorStop(1, 'rgba(126, 132, 126, 1)');
    } else if (probeDigital || probePowerLcd) {
      bg.addColorStop(0, 'rgba(3, 10, 9, 1)');
      bg.addColorStop(0.52, 'rgba(5, 11, 12, 0.98)');
      bg.addColorStop(1, 'rgba(1, 4, 5, 1)');
    } else if (green) {
      bg.addColorStop(0, 'rgba(0, 45, 22, 0.98)');
      bg.addColorStop(0.54, 'rgba(0, 92, 44, 0.9)');
      bg.addColorStop(1, 'rgba(0, 24, 12, 0.98)');
    } else if (red) {
      bg.addColorStop(0, 'rgba(8, 12, 18, 0.98)');
      bg.addColorStop(0.52, 'rgba(12, 18, 26, 0.92)');
      bg.addColorStop(1, 'rgba(3, 7, 12, 0.98)');
    } else {
      bg.addColorStop(0, 'rgba(8, 32, 83, 0.98)');
      bg.addColorStop(0.56, 'rgba(13, 48, 116, 0.9)');
      bg.addColorStop(1, 'rgba(3, 16, 47, 0.98)');
    }
    ctx.fillStyle = bg;
    roundRect(ctx, 10, 12, c.width - 20, c.height - 24, 16);
    ctx.fill();

    ctx.strokeStyle = probeSupplyPanel ? 'rgba(65, 70, 66, 0.72)' : (probeDigital || probePowerLcd) ? 'rgba(210, 225, 215, 0.55)' : green ? 'rgba(96, 255, 158, 0.7)' : red ? 'rgba(255, 90, 70, 0.55)' : 'rgba(105, 209, 255, 0.68)';
    ctx.lineWidth = 5;
    roundRect(ctx, 16, 18, c.width - 32, c.height - 36, 12);
    ctx.stroke();

    if (key === 'mainVoltageV') {
      drawScenePowerReadout(ctx, c, parts, {
        voltageColor: '#ff4b35',
        currentColor: '#58ff82',
        powerColor: '#9fbaff',
      });
    } else if (key === 'probeVoltageV') {
      if (probeSupplyPanel) {
        drawProbeSupplyPanel(ctx, c);
      } else if (probePowerLcd) {
        drawProbePowerLcdReadout(ctx, c);
      } else if (probeDigital) {
        drawProbeDigitalReadout(ctx, c);
      } else {
        drawScenePowerReadout(ctx, c, parts, {
          voltageColor: '#ff6850',
          currentColor: '#75f79a',
          powerColor: '#98d9ff',
        });
      }
    } else if (key === 'gapMm') {
      drawSceneMotorReadout(ctx, c, parts);
    } else if (key === 'pressurePa') {
      drawScenePressureReadout(ctx, c, text);
    } else {
      ctx.font = '800 72px Sora, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = red ? 24 : 20;
      ctx.shadowColor = red ? 'rgba(255, 71, 44, 0.95)' : 'rgba(120, 220, 255, 0.92)';
      ctx.fillStyle = red ? '#ff4b35' : '#9ee6ff';
      ctx.fillText(text, c.width / 2, c.height / 2 + 2);
    }
    ctx.shadowBlur = 0;
  }

  function drawScenePressureReadout(ctx, c, text) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 22;
    ctx.shadowColor = 'rgba(80, 255, 130, 0.95)';
    ctx.fillStyle = '#62ff8d';
    ctx.font = '900 82px Sora, Arial, sans-serif';
    ctx.fillText(String(text || ''), c.width / 2, c.height * 0.48);
    ctx.font = '800 32px Sora, Arial, sans-serif';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#d8ffe4';
    ctx.fillText('\u6c14\u538b', c.width / 2, c.height * 0.75);
  }

  function drawProbeDigitalReadout(ctx, c) {
    const currentA = Math.abs(Number(state.probeCurrentUa) || Number(state.probeLoopCurrentUa) || 0) / 1000;
    const voltageV = Math.abs(Number(state.probeVoltageV) || 0);
    const currentText = currentA.toFixed(3);
    const voltageText = voltageV.toFixed(1);

    ctx.save();
    const gloss = ctx.createLinearGradient(0, 0, 0, c.height);
    gloss.addColorStop(0, 'rgba(255,255,255,0.18)');
    gloss.addColorStop(0.42, 'rgba(255,255,255,0.02)');
    gloss.addColorStop(1, 'rgba(255,255,255,0.08)');
    ctx.fillStyle = gloss;
    roundRect(ctx, 26, 26, c.width - 52, c.height - 52, 18);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 104px Sora, Arial, sans-serif';
    ctx.shadowBlur = 24;
    ctx.shadowColor = 'rgba(50, 255, 96, 0.95)';
    ctx.fillStyle = '#42ff72';
    ctx.fillText(currentText, c.width * 0.25, c.height * 0.38);
    ctx.font = '800 38px IBM Plex Sans, Arial, sans-serif';
    ctx.shadowBlur = 7;
    ctx.fillStyle = '#d9e1da';
    ctx.fillText('CURRENT   A', c.width * 0.25, c.height * 0.74);

    ctx.font = '900 104px Sora, Arial, sans-serif';
    ctx.shadowBlur = 24;
    ctx.shadowColor = 'rgba(255, 47, 23, 0.98)';
    ctx.fillStyle = '#ff2b18';
    ctx.fillText(voltageText, c.width * 0.74, c.height * 0.38);
    ctx.font = '800 38px IBM Plex Sans, Arial, sans-serif';
    ctx.shadowBlur = 7;
    ctx.fillStyle = '#d9e1da';
    ctx.fillText('VOLTAGE   V', c.width * 0.74, c.height * 0.74);

    ctx.strokeStyle = 'rgba(30, 35, 34, 0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(c.width * 0.5, 36);
    ctx.lineTo(c.width * 0.5, c.height - 36);
    ctx.stroke();
    ctx.restore();
  }

  function drawProbePowerLcdReadout(ctx, c) {
    const data = getProbePowerDisplayData();
    ctx.save();
    const gloss = ctx.createLinearGradient(0, 0, 0, c.height);
    gloss.addColorStop(0, 'rgba(255,255,255,0.16)');
    gloss.addColorStop(0.42, 'rgba(255,255,255,0.015)');
    gloss.addColorStop(1, 'rgba(255,255,255,0.07)');
    ctx.fillStyle = gloss;
    roundRect(ctx, 26, 26, c.width - 52, c.height - 52, 18);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 104px Sora, Arial, sans-serif';
    ctx.shadowBlur = 24;
    ctx.shadowColor = 'rgba(50, 255, 96, 0.95)';
    ctx.fillStyle = '#42ff72';
    ctx.fillText(data.currentText, c.width * 0.25, c.height * 0.38);
    ctx.font = '800 38px IBM Plex Sans, Arial, sans-serif';
    ctx.shadowBlur = 7;
    ctx.fillStyle = '#d9e1da';
    ctx.fillText(data.currentLabel, c.width * 0.22, c.height * 0.80);

    ctx.font = '900 104px Sora, Arial, sans-serif';
    ctx.shadowBlur = 24;
    ctx.shadowColor = 'rgba(255, 47, 23, 0.98)';
    ctx.fillStyle = '#ff2b18';
    ctx.fillText(data.voltageText, c.width * 0.74, c.height * 0.38);
    ctx.font = '800 38px IBM Plex Sans, Arial, sans-serif';
    ctx.shadowBlur = 7;
    ctx.fillStyle = '#d9e1da';
    ctx.fillText(data.voltageLabel, c.width * 0.71, c.height * 0.80);

    ctx.strokeStyle = 'rgba(84, 110, 150, 0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(c.width * 0.5, 36);
    ctx.lineTo(c.width * 0.5, c.height - 36);
    ctx.stroke();
    ctx.restore();
  }

  function drawProbeSupplyPanel(ctx, c) {
    const currentA = Math.abs(Number(state.probeCurrentUa) || Number(state.probeLoopCurrentUa) || 0) / 1000;
    const voltageV = Math.abs(Number(state.probeVoltageV) || 0);
    ctx.save();
    ctx.clearRect(0, 0, c.width, c.height);

    const panel = ctx.createLinearGradient(0, 0, c.width, c.height);
    panel.addColorStop(0, '#d7dad2');
    panel.addColorStop(0.55, '#9fa49b');
    panel.addColorStop(1, '#6f746d');
    ctx.fillStyle = panel;
    roundRect(ctx, 18, 16, c.width - 36, c.height - 32, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(48, 54, 49, 0.7)';
    ctx.lineWidth = 5;
    roundRect(ctx, 28, 28, c.width - 56, c.height - 56, 18);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '800 34px IBM Plex Sans, Arial, sans-serif';
    ctx.fillStyle = '#2388a5';
    ctx.fillText('DINGCE 鼎策', 82, 70);
    ctx.fillStyle = '#2d302f';
    ctx.font = '700 34px IBM Plex Sans, Arial, sans-serif';
    ctx.fillText('DC POWER SUPPLY', 280, 70);

    const displayX = 70;
    const displayY = 116;
    const displayW = c.width - 140;
    const displayH = 150;
    const screen = ctx.createLinearGradient(displayX, displayY, displayX + displayW, displayY + displayH);
    screen.addColorStop(0, '#07120e');
    screen.addColorStop(0.52, '#101514');
    screen.addColorStop(1, '#030606');
    ctx.fillStyle = screen;
    roundRect(ctx, displayX, displayY, displayW, displayH, 16);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.font = '900 76px Sora, Arial, sans-serif';
    ctx.shadowBlur = 18;
    ctx.shadowColor = 'rgba(55, 255, 105, 0.95)';
    ctx.fillStyle = '#44ff73';
    ctx.fillText(currentA.toFixed(3), displayX + displayW * 0.27, displayY + 68);
    ctx.shadowColor = 'rgba(255, 55, 36, 0.95)';
    ctx.fillStyle = '#ff3a28';
    ctx.fillText(voltageV.toFixed(1), displayX + displayW * 0.75, displayY + 68);
    ctx.shadowBlur = 0;
    ctx.font = '800 26px IBM Plex Sans, Arial, sans-serif';
    ctx.fillStyle = '#d7ddd6';
    ctx.fillText('CURRENT   A', displayX + displayW * 0.27, displayY + 118);
    ctx.fillText('VOLTAGE   V', displayX + displayW * 0.75, displayY + 118);

    const controlX = 64;
    const controlY = 298;
    const controlW = c.width - 128;
    const controlH = 170;
    ctx.strokeStyle = 'rgba(52, 57, 53, 0.65)';
    ctx.lineWidth = 4;
    roundRect(ctx, controlX, controlY, controlW, controlH, 14);
    ctx.stroke();

    const drawKnob = (x, y, label) => {
      const grad = ctx.createRadialGradient(x - 8, y - 8, 5, x, y, 35);
      grad.addColorStop(0, '#eff0e7');
      grad.addColorStop(0.55, '#b9bab0');
      grad.addColorStop(1, '#5f635f');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, 31, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#404541';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = '#2c302d';
      ctx.font = '700 21px IBM Plex Sans, Arial, sans-serif';
      ctx.fillText(label, x, y + 58);
    };
    ctx.textAlign = 'center';
    ctx.font = '800 28px IBM Plex Sans, Arial, sans-serif';
    ctx.fillStyle = '#303431';
    ctx.fillText('CURRENT', controlX + controlW * 0.22, controlY + 32);
    ctx.fillText('VOLTAGE', controlX + controlW * 0.68, controlY + 32);
    drawKnob(controlX + controlW * 0.16, controlY + 82, 'COARSE');
    drawKnob(controlX + controlW * 0.30, controlY + 82, 'FINE');
    drawKnob(controlX + controlW * 0.62, controlY + 82, 'COARSE');
    drawKnob(controlX + controlW * 0.76, controlY + 82, 'FINE');

    ctx.fillStyle = '#1f8bd0';
    roundRect(ctx, 82, c.height - 78, 116, 42, 15);
    ctx.fill();
    ctx.fillStyle = '#d7edf8';
    ctx.font = '800 24px IBM Plex Sans, Arial, sans-serif';
    ctx.fillText('POWER', 140, c.height - 56);
    [['#151716', 0.52], ['#1f8e47', 0.64], ['#b83b38', 0.76]].forEach(([color, pos]) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(c.width * pos, c.height - 58, 17, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawScenePowerReadout(ctx, c, parts, colors) {
    const [voltage = '', current = '', power = ''] = parts;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(150, 185, 255, 0.46)';
    ctx.beginPath();
    ctx.moveTo(c.width / 2, 25);
    ctx.lineTo(c.width / 2, c.height - 24);
    ctx.moveTo(42, c.height * 0.56);
    ctx.lineTo(c.width - 42, c.height * 0.56);
    ctx.stroke();

    ctx.font = '900 60px Sora, Arial, sans-serif';
    ctx.shadowBlur = 18;
    ctx.shadowColor = colors.currentColor;
    ctx.fillStyle = colors.currentColor;
    ctx.fillText(current, c.width * 0.25, c.height * 0.31);
    ctx.font = '800 28px Sora, Arial, sans-serif';
    ctx.shadowBlur = 8;
    ctx.fillText('CURRENT', c.width * 0.25, c.height * 0.49);

    ctx.font = '900 60px Sora, Arial, sans-serif';
    ctx.shadowBlur = 18;
    ctx.shadowColor = colors.voltageColor;
    ctx.fillStyle = colors.voltageColor;
    ctx.fillText(voltage, c.width * 0.75, c.height * 0.31);
    ctx.font = '800 28px Sora, Arial, sans-serif';
    ctx.shadowBlur = 8;
    ctx.fillText('VOLTAGE', c.width * 0.75, c.height * 0.49);

    ctx.font = '900 66px Sora, Arial, sans-serif';
    ctx.shadowBlur = 18;
    ctx.shadowColor = colors.powerColor;
    ctx.fillStyle = colors.powerColor;
    ctx.fillText(power, c.width * 0.5, c.height * 0.78);
  }

  function drawSceneMotorReadout(ctx, c, parts) {
    const lcd = getMotorControlLcdRows();
    const rows = lcd.rows;
    const left = 18;
    const top = 16;
    const rowH = (c.height - top * 2) / rows.length;
    const col1 = c.width * 0.26;
    const col2 = c.width * 0.43;
    const col3 = c.width - left * 2 - col1 - col2;

    ctx.save();
    const bg = ctx.createLinearGradient(0, 0, c.width, c.height);
    bg.addColorStop(0, '#2f78c5');
    bg.addColorStop(0.5, '#255aa9');
    bg.addColorStop(1, '#163f91');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, c.width, c.height);

    ctx.strokeStyle = 'rgba(190, 232, 255, 0.92)';
    ctx.lineWidth = 2;
    ctx.strokeRect(left, top, c.width - left * 2, rowH * rows.length);
    for (let i = 1; i < rows.length; i += 1) {
      ctx.beginPath();
      ctx.moveTo(left, top + rowH * i);
      ctx.lineTo(c.width - left, top + rowH * i);
      ctx.stroke();
    }
    [left + col1, left + col1 + col2].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, top + rowH * rows.length);
      ctx.stroke();
    });

    ctx.font = `900 ${Math.max(26, Math.min(48, rowH * 0.58))}px IBM Plex Sans, Sora, Arial, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(150, 225, 255, 0.9)';
    ctx.fillStyle = '#dff8ff';
    rows.forEach((row, i) => {
      const y = top + rowH * (i + 0.5);
      ctx.fillText(row[0], left + 10, y);
      ctx.fillText(row[1] || '', left + col1 + 14, y);
      ctx.fillText(row[2] || '', left + col1 + col2 + 14, y);
    });
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function setupPicking() {
    const labels = {
      motor: '\u7535\u6781\u63a7\u5236\u88c5\u7f6e',
      mainPower: '\u4e3b\u7535\u6e90',
      mainPowerSwitch: '\u4e3b\u7535\u6e90\u5f00\u5173',
      vacuum: '\u6c14\u538b\u8ba1',
      ground: '\u63a5\u5730\u786e\u8ba4',
      probePower: '\u63a2\u9488\u63a7\u5236\u88c5\u7f6e',
    };

    refs.canvas.addEventListener('mousemove', (e) => {
      cast(e);
      const p = pickPart();
      if (!p) {
        refs.hoverLabel.style.opacity = '0';
        return;
      }
      refs.hoverLabel.style.opacity = '1';
      refs.hoverLabel.textContent = p === 'mainPowerSwitch'
        ? (state.running ? '\u4e3b\u7535\u6e90\u5f00\u5173\uff1a\u70b9\u51fb\u65ad\u7535' : '\u4e3b\u7535\u6e90\u5f00\u5173\uff1a\u70b9\u51fb\u901a\u7535')
        : labels[p];
      refs.hoverLabel.style.left = `${e.clientX}px`;
      refs.hoverLabel.style.top = `${e.clientY}px`;
    });

    refs.canvas.addEventListener('click', (e) => {
      cast(e);
      const p = pickPart();
      if (!p) return;
      if (p === 'ground') {
        state.groundConfirmed = true;
        showGroundNotice('\u63a5\u5730\u6210\u529f');
        renderStats();
        return;
      }
      if (p === 'mainPowerSwitch') {
        toggleMainPowerSwitch();
        return;
      }
      if (!ensureGroundConfirmed()) return;
      if (p === 'motor') openDialog(refs.dialogs.motor);
      if (p === 'mainPower') openDialog(refs.dialogs.mainPower);
      if (p === 'vacuum') openDialog(refs.dialogs.vacuum);
      if (p === 'probePower') openDialog(refs.dialogs.probePower);
    });
  }
  function cast(e) {
    const rect = refs.canvas.getBoundingClientRect();
    eng.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    eng.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    eng.ray.setFromCamera(eng.mouse, eng.camera);
    eng.hits = eng.ray.intersectObjects(eng.scene.children, true);
  }

  function pickPart() {
    const parts = ['motor', 'mainPower', 'mainPowerSwitch', 'vacuum', 'probePower', 'ground'];

    const byAnchor = (obj) => {
      if (obj === eng.anchor.mainPower) return 'mainPower';
      if (obj === eng.anchor.motor) return 'motor';
      if (obj === eng.anchor.pressureGauge) return 'vacuum';
      if (obj === eng.anchor.probePower) return 'probePower';
      return null;
    };

    const byName = (obj) => {
      if (!obj?.name) return null;
      if (nameHasAny(obj, ['\u4e3b\u7535\u6e90', 'mainpower', 'main_power', '\u7acb\u65b9\u4f53016'])) return 'mainPower';
      if (nameHasAny(obj, ['\u7535\u6781\u63a7\u5236\u88c5\u7f6e', '\u7535\u673a\u63a7\u5236\u88c5\u7f6e', 'motorcontroller', 'motor_controller', 'motorcontrol', '\u67f1\u4f53042'])) return 'motor';
      if (nameHasAny(obj, ['\u6c14\u538b\u8ba1', '\u538b\u529b\u8ba1', '\u538b\u529b\u8868', '\u538b\u5f3a\u8ba1', 'pressuregauge', 'pressure_gauge', 'pressure', 'gauge', 'pcm300kf', '20kpa'])) return 'vacuum';
      if (nameHasAny(obj, ['\u63a2\u9488\u63a7\u5236\u88c5\u7f6e', '\u63a2\u9488\u7535\u6e90', 'probepower', 'probe_power', '\u67f1\u4f53033'])) return 'probePower';
      return null;
    };

    const byFrontPanel = (point) => {
      if (!point) return null;
      const checks = [
        { part: 'motor', target: eng.anchor.motor, xPad: 0.1, yPad: 0.12, zPad: 0.28, yBias: -0.06 },
        { part: 'mainPower', target: eng.anchor.mainPower, xPad: 0.07, yPad: 0.06, zPad: 0.22, yBias: -0.2 },
        { part: 'probePower', target: eng.anchor.probePower, xPad: 0.06, yPad: 0.06, zPad: 0.18, yBias: -0.14 },
      ];

      let best = null;
      checks.forEach(({ part, target, xPad, yPad, zPad, yBias }) => {
        if (!target) return;
        const box = new eng.T.Box3().setFromObject(target);
        if (box.isEmpty()) return;
        const size = box.getSize(new eng.T.Vector3());
        const minX = box.min.x - size.x * xPad;
        const maxX = box.max.x + size.x * xPad;
        const minY = box.min.y + size.y * yBias - size.y * yPad;
        const maxY = box.max.y + size.y * yBias + size.y * yPad;
        const minZ = box.max.z - size.z * zPad;
        const maxZ = box.max.z + size.z * 0.55;
        if (point.x < minX || point.x > maxX || point.y < minY || point.y > maxY || point.z < minZ || point.z > maxZ) return;
        const centerX = (minX + maxX) * 0.5;
        const centerY = (minY + maxY) * 0.5;
        const centerZ = (minZ + maxZ) * 0.5;
        const score =
          1 / Math.max(Math.abs(point.x - centerX), 0.001) +
          1 / Math.max(Math.abs(point.y - centerY), 0.001) +
          1 / Math.max(Math.abs(point.z - centerZ), 0.001);
        if (!best || score > best.score) best = { part, score };
      });

      return best?.part || null;
    };

    const byMainPowerSwitchRegion = (point) => {
      if (!point || !eng.anchor.mainPower) return null;
      const box = new eng.T.Box3().setFromObject(eng.anchor.mainPower);
      if (box.isEmpty()) return null;
      const size = box.getSize(new eng.T.Vector3());
      const rx = (point.x - box.min.x) / Math.max(size.x, 1e-6);
      const ry = (point.y - box.min.y) / Math.max(size.y, 1e-6);
      const nearFront = Math.abs(point.z - box.min.z) <= Math.max(size.z * 0.28, 0.12);
      if (nearFront && rx >= 0.84 && rx <= 0.99 && ry >= 0.34 && ry <= 0.72) return 'mainPowerSwitch';
      return null;
    };

    // Ground confirmation sits next to the vacuum base, so prefer its explicit hotspot over nearby model parts.
    for (const h of eng.hits) {
      let o = h.object;
      while (o) {
        const n = (o.name || '').toLowerCase();
        if (o.userData?.part === 'ground' || n.startsWith('hotspot_ground')) return 'ground';
        if (o.userData?.part === 'mainPowerSwitch' || n === 'hotspot_main_power_switch') return 'mainPowerSwitch';
        o = o.parent;
      }
    }

    // The physical rocker switch is part of the main power model, so recognize
    // that face region before the whole instrument falls through to its dialog.
    for (const h of eng.hits) {
      const p = byMainPowerSwitchRegion(h.point);
      if (p) return p;
    }

    // Pass 0: honor explicit model naming first.
    for (const h of eng.hits) {
      let o = h.object;
      while (o) {
        const p = byName(o);
        if (p) return p;
        o = o.parent;
      }
    }

    // Pass 1: front-panel fallback for the stacked right-side control units.
    for (const h of eng.hits) {
      const p = byFrontPanel(h.point);
      if (p) return p;
    }

    // Pass 2: prefer direct model-part hits, so overlap in hotspots cannot misroute dialogs.
    for (const h of eng.hits) {
      let o = h.object;
      while (o) {
        const n = (o.name || '').toLowerCase();
        if (!n.startsWith('hotspot_')) {
          const p = byAnchor(o);
          if (p) return p;
        }
        o = o.parent;
      }
    }

    // Pass 3: fallback to explicit hotspots.
    for (const h of eng.hits) {
      let o = h.object;
      while (o) {
        const n = (o.name || '').toLowerCase();
        if (n.startsWith('hotspot_')) {
          const p = n.slice(8);
          if (parts.includes(p)) return p;
        }
        if (o.userData?.part && parts.includes(o.userData.part)) return o.userData.part;
        o = o.parent;
      }
    }

    return null;
  }
  function createVisuals() {
    const T = eng.T;

    const glowCol = new T.Mesh(
      new T.CylinderGeometry(0.75, 0.9, 4.8, 24, 1, true),
      new T.MeshBasicMaterial({ color: 0xc27cff, transparent: true, opacity: 0.16, blending: T.AdditiveBlending, depthWrite: false })
    );
    glowCol.visible = false;
    eng.plasma.add(glowCol);

    const createGlowMaterial = (alphaScale, widthScale, colorMix) =>
      new T.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: T.AdditiveBlending,
        side: T.DoubleSide,
        uniforms: {
          uColorA: { value: new T.Color(0x8f6dff) },
          uColorB: { value: new T.Color(0xff41d9) },
          uTime: { value: 0 },
          uIntensity: { value: 0.6 },
          uAlphaScale: { value: alphaScale },
          uWidthScale: { value: widthScale },
          uColorMix: { value: colorMix }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          uniform vec3 uColorA;
          uniform vec3 uColorB;
          uniform float uTime;
          uniform float uIntensity;
          uniform float uAlphaScale;
          uniform float uWidthScale;
          uniform float uColorMix;

          float band(float x, float center, float width) {
            return exp(-pow((x - center) / width, 2.0));
          }

          void main() {
            float x = vUv.x;
            float y = vUv.y;
            float cathode = band(x, 0.16, 0.04 * uWidthScale);
            float negativeGlow = band(x, 0.27, 0.075 * uWidthScale);
            float positive = band(x, 0.68, 0.15 * uWidthScale);
            float dark = band(x, 0.41, 0.055 * uWidthScale);
            float core = band(y, 0.52, 0.12);
            float halo = band(y, 0.5, 0.26);
            float edgeFade = smoothstep(0.03, 0.16, y) * smoothstep(0.03, 0.16, 1.0 - y);
            float striationA = 0.42 + 0.58 * pow(0.5 + 0.5 * sin((x * 10.5 - uTime * 0.3) * 6.28318 + y * 5.8), 2.1);
            float striationB = 0.72 + 0.28 * pow(0.5 + 0.5 * sin((x * 15.5 - uTime * 0.44) * 6.28318 + y * 3.2), 1.7);
            float striation = striationA * striationB;
            float pulse = 0.94 + 0.06 * cos((y * 3.4 + uTime * 0.26) * 6.28318);
            float alpha = clamp((0.05 + cathode * 0.88 + negativeGlow * 0.24 + positive * 1.18 - dark * 0.44) * mix(halo, core, 0.62) * edgeFade * striation * pulse, 0.0, 1.0);
            alpha *= uAlphaScale * (0.28 + uIntensity * 0.24);
            vec3 color = mix(uColorA, uColorB, clamp(uColorMix + cathode * 0.2 + positive * 0.48, 0.0, 1.0));
            color = mix(color, vec3(0.98, 0.82, 1.0), clamp(core * (0.06 + positive * 0.08), 0.0, 0.08));
            gl_FragColor = vec4(color, alpha);
          }
        `
      });

    const glowVeil = new T.Mesh(new T.PlaneGeometry(1, 1), createGlowMaterial(0.4, 1.42, 0.04));
    glowVeil.visible = false;
    glowVeil.renderOrder = 14;
    eng.plasma.add(glowVeil);

    const glowOuter = new T.Mesh(new T.PlaneGeometry(1, 1), createGlowMaterial(0.56, 1.08, 0.08));
    glowOuter.visible = false;
    glowOuter.renderOrder = 15;
    eng.plasma.add(glowOuter);

    const glowMid = new T.Mesh(new T.PlaneGeometry(1, 1), createGlowMaterial(0.68, 0.88, 0.46));
    glowMid.visible = false;
    glowMid.renderOrder = 16;
    eng.plasma.add(glowMid);

    const glowCore = new T.Mesh(new T.PlaneGeometry(1, 1), createGlowMaterial(0.78, 0.56, 0.72));
    glowCore.visible = false;
    glowCore.renderOrder = 17;
    eng.plasma.add(glowCore);

    const glowCathode = new T.Mesh(new T.PlaneGeometry(1, 1), createGlowMaterial(0.62, 0.38, 0.34));
    glowCathode.visible = false;
    glowCathode.renderOrder = 18;
    eng.plasma.add(glowCathode);

    const glowRibbon = new T.Mesh(new T.PlaneGeometry(1, 1), createGlowMaterial(1.08, 0.28, 0.9));
    glowRibbon.visible = false;
    glowRibbon.renderOrder = 19;
    eng.plasma.add(glowRibbon);

    glowVeil.material.uniforms.uColorA.value.set(0x8568ff);
    glowVeil.material.uniforms.uColorB.value.set(0xd8b0ff);
    glowOuter.material.uniforms.uColorA.value.set(0xa174ff);
    glowOuter.material.uniforms.uColorB.value.set(0xe5a4ff);
    glowMid.material.uniforms.uColorA.value.set(0x7038ff);
    glowMid.material.uniforms.uColorB.value.set(0xdd54ff);
    glowCore.material.uniforms.uColorA.value.set(0x5318ff);
    glowCore.material.uniforms.uColorB.value.set(0xbc12ff);
    glowCathode.material.uniforms.uColorA.value.set(0x7430ff);
    glowCathode.material.uniforms.uColorB.value.set(0xf06cff);
    glowRibbon.material.uniforms.uColorA.value.set(0x2d059c);
    glowRibbon.material.uniforms.uColorB.value.set(0xa500ff);

    const glowShell = new T.Mesh(
      new T.BoxGeometry(1, 1, 1),
      new T.MeshBasicMaterial({
        color: 0xb46cff,
        transparent: true,
        opacity: 0.025,
        blending: T.AdditiveBlending,
        depthWrite: false,
        depthTest: false
      })
    );
    glowShell.visible = false;
    glowShell.renderOrder = 13;
    eng.plasma.add(glowShell);

    const glow = [];
    for (let i = 0; i < 12; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: radial('#ff4dd1', 'rgba(255,77,209,0)'), color: 0xc59bff, transparent: true, opacity: 0.42, blending: T.AdditiveBlending, depthWrite: false }));
      s.visible = false;
      s.scale.set(0.18 + Math.random() * 0.05, 0.18 + Math.random() * 0.05, 1);
      eng.plasma.add(s);
      glow.push(s);
    }

    const corona = [];
    for (let i = 0; i < 8; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: radial('#6c56ff', 'rgba(108,86,255,0)'), transparent: true, opacity: 0.44, blending: T.AdditiveBlending, depthWrite: false }));
      s.visible = false;
      s.scale.set(0.18, 0.18, 1);
      eng.plasma.add(s);
      corona.push(s);
    }

    const coronaHalo = [];
    for (let i = 0; i < 2; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({
        map: radial('#a56bff', 'rgba(165,107,255,0)'),
        color: 0xb683ff,
        transparent: true,
        opacity: 0.0,
        blending: T.AdditiveBlending,
        depthWrite: false
      }));
      s.visible = false;
      s.scale.set(0.3, 0.3, 1);
      eng.plasma.add(s);
      coronaHalo.push(s);
    }

    const spark = [];
    for (let i = 0; i < 4; i++) {
      const core = new T.Line(
        new T.BufferGeometry().setFromPoints([new T.Vector3(-1, 3.3, 0), new T.Vector3(1, 3.3, 0)]),
        new T.LineBasicMaterial({
          color: i === 0 ? 0xfafdff : 0xcce4ff,
          transparent: true,
          opacity: 0.0,
          blending: T.AdditiveBlending,
          depthWrite: false,
          depthTest: false
        })
      );
      core.visible = false;
      core.renderOrder = 24;
      eng.plasma.add(core);

      const aura = [];
      for (let j = 0; j < 7; j++) {
        const s = new T.Sprite(new T.SpriteMaterial({
          map: radial('#d7ecff', 'rgba(215,236,255,0)'),
          color: i === 0 ? 0xd7ecff : 0xbfdcff,
          transparent: true,
          opacity: 0.0,
          blending: T.AdditiveBlending,
          depthWrite: false,
          depthTest: false
        }));
        s.visible = false;
        s.renderOrder = 23;
        s.scale.set(0.02, 0.02, 1);
        eng.plasma.add(s);
        aura.push(s);
      }
      spark.push({ core, aura });
    }

    const arc = new T.Mesh(
      new T.TubeGeometry(new T.LineCurve3(new T.Vector3(-1, 3.3, 0), new T.Vector3(1, 3.3, 0)), 32, 0.04, 10, false),
      new T.MeshBasicMaterial({ color: 0x9c43ff, transparent: true, opacity: 0.18, blending: T.AdditiveBlending, depthWrite: false })
    );
    arc.visible = false;
    eng.plasma.add(arc);

    const arcCore = new T.Mesh(
      new T.TubeGeometry(new T.LineCurve3(new T.Vector3(-1, 3.3, 0), new T.Vector3(1, 3.3, 0)), 32, 0.012, 10, false),
      new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false })
    );
    arcCore.visible = false;
    eng.plasma.add(arcCore);

    const arcHalo = [];
    for (let i = 0; i < 4; i++) {
      const h = new T.Sprite(new T.SpriteMaterial({ map: radial('#cf9cff', 'rgba(207,156,255,0)'), color: 0xc58fff, transparent: true, opacity: 0.12, blending: T.AdditiveBlending, depthWrite: false }));
      h.visible = false;
      h.scale.set(0.22, 0.11, 1);
      eng.plasma.add(h);
      arcHalo.push(h);
    }

    const arcContacts = [];
    for (let i = 0; i < 2; i++) {
      const contact = new T.Sprite(new T.SpriteMaterial({ map: radial('#f7e7ff', 'rgba(247,231,255,0)'), color: 0xf3d9ff, transparent: true, opacity: 0.56, blending: T.AdditiveBlending, depthWrite: false }));
      contact.visible = false;
      contact.scale.set(0.08, 0.08, 1);
      eng.plasma.add(contact);
      arcContacts.push(contact);
    }

    eng.fx.glowCol = glowCol;
    eng.fx.glowVeil = glowVeil;
    eng.fx.glowOuter = glowOuter;
    eng.fx.glowMid = glowMid;
    eng.fx.glowCore = glowCore;
    eng.fx.glowCathode = glowCathode;
    eng.fx.glowRibbon = glowRibbon;
    eng.fx.glowShell = glowShell;
    eng.fx.glowMaterials = [glowVeil.material, glowOuter.material, glowMid.material, glowCore.material, glowCathode.material, glowRibbon.material];
    eng.fx.glow = glow;
    eng.fx.corona = corona;
    eng.fx.coronaHalo = coronaHalo;
    eng.fx.spark = spark;
    eng.fx.arc = arc;
    eng.fx.arcCore = arcCore;
    eng.fx.arcHalo = arcHalo;
    eng.fx.arcContacts = arcContacts;
  }

  function getDischargeFrame(l, r) {
    const T = eng.T;
    const dir = r.clone().sub(l);
    const len = Math.max(dir.length(), 1e-4);
    const direction = dir.clone().normalize();

    let up = eng.dischargeFrame?.up?.clone() || new T.Vector3(0, 1, 0);
    if (Math.abs(direction.dot(up)) > 0.84) up = new T.Vector3(0, 0, 1);
    up.normalize();

    let depth = eng.dischargeFrame?.depth?.clone();
    if (!depth || depth.lengthSq() < 1e-6 || Math.abs(direction.dot(depth)) > 0.84) {
      depth = new T.Vector3().crossVectors(direction, up);
    }
    if (depth.lengthSq() < 1e-6) depth = new T.Vector3(1, 0, 0);
    depth.normalize();

    return {
      direction,
      length: len,
      up,
      depth,
      height: clamp(eng.dischargeFrame?.height || len * 0.65, 0.18, 1.3),
      width: clamp(eng.dischargeFrame?.width || len * 0.08, 0.035, 0.18),
    };
  }

  function worldUnitsPerMm(frame) {
    const fromRig = Math.max(eng.gapRig?.scale || 0, 0);
    if (fromRig > 1e-5) return fromRig;
    const gapMm = Math.max(Math.abs(Number(state.gapMm) || 0), PHYSICS_GAP_MIN_MM);
    return frame.length / gapMm;
  }

  function resetSparkPulse(mode, time) {
    eng.sparkPulse.active = false;
    eng.sparkPulse.nextAt = time + 0.08;
    eng.sparkPulse.flashStart = 0;
    eng.sparkPulse.activeUntil = 0;
    eng.sparkPulse.afterglowUntil = 0;
    eng.sparkPulse.duration = 0;
    eng.sparkPulse.branchCount = 0;
    eng.sparkPulse.lastMode = mode;
  }

  function sampleSparkPulse(time, frame, ratio) {
    const pulse = eng.sparkPulse;
    if (pulse.lastMode !== MODE_SPARK) resetSparkPulse(MODE_SPARK, time);

    if (!pulse.active && time >= pulse.nextAt) {
      const drive = clamp(Math.max(ratio - 1, 0), 0, 1.2);
      pulse.duration = 0.012 + Math.random() * 0.01 + drive * 0.003;
      pulse.flashStart = time;
      pulse.activeUntil = time + pulse.duration;
      pulse.afterglowUntil = pulse.activeUntil + 0.008 + Math.random() * 0.012;
      pulse.nextAt = pulse.afterglowUntil + 0.085 + Math.random() * 0.16 - drive * 0.02;
      pulse.seed = Math.random() * Math.PI * 2;
      pulse.pathSeed = Math.random() * 100;
      pulse.branchCount = 0;
      pulse.amplitude = clamp(frame.width * (0.02 + Math.random() * 0.02), 0.0008, 0.0022);
      pulse.steps = 6 + Math.floor(Math.random() * 2);
      pulse.active = true;
    }

    if (pulse.active && time > pulse.afterglowUntil) {
      pulse.active = false;
    }

    const flash = pulse.active && time <= pulse.activeUntil;
    const afterglow = pulse.active && time > pulse.activeUntil && time <= pulse.afterglowUntil;
    const flashPhase = flash ? clamp((time - pulse.flashStart) / Math.max(pulse.duration, 1e-3), 0, 1) : 0;
    const coreOpacity = flash
      ? 0.78 + Math.sin(flashPhase * Math.PI) * 0.18
      : afterglow ? 0.14 + (1 - (time - pulse.activeUntil) / Math.max(pulse.afterglowUntil - pulse.activeUntil, 1e-3)) * 0.12 : 0;
    return {
      active: flash || afterglow,
      flash,
      afterglow,
      branchCount: flash ? pulse.branchCount : 0,
      amplitude: pulse.amplitude,
      steps: pulse.steps,
      seed: pulse.pathSeed,
      coreOpacity,
      auraOpacity: coreOpacity * (flash ? 0.2 : 0.08)
    };
  }

  function buildSparkPath(start, end, frame, steps, amplitude, seed, taper = 1) {
    const T = eng.T;
    const points = [];
    for (let index = 0; index <= steps; index += 1) {
      const a = index / steps;
      const point = new T.Vector3().lerpVectors(start, end, a);
      const weight = Math.sin(Math.PI * a) * taper;
      const upJitter = Math.sin(seed * 0.73 + a * 6.0) * 0.1;
      const depthJitter = Math.cos(seed * 0.51 + a * 5.4) * 0.08;
      point.addScaledVector(frame.up, upJitter * amplitude * weight);
      point.addScaledVector(frame.depth, depthJitter * amplitude * 0.45 * weight);
      points.push(point);
    }
    points[0].copy(start);
    points[points.length - 1].copy(end);
    return points;
  }

  function generateArcPoints(l, r, frame, time, intensity) {
    const T = eng.T;
    const points = [];
    const segments = 28;
    const swing = clamp(frame.length * 0.0045, 0.0006, 0.0035) * (0.9 + intensity * 0.05);

    for (let index = 0; index <= segments; index += 1) {
      const a = index / segments;
      const point = new T.Vector3().lerpVectors(l, r, a);
      const bodyWeight = Math.sin(Math.PI * a);
      const upWobble =
        Math.sin(a * Math.PI * 1.4 + time * 0.42) * 0.08 +
        Math.sin(a * Math.PI * 2.8 - time * 0.62) * 0.02;
      const depthWobble =
        Math.sin(a * Math.PI * 2.1 - time * 0.35) * 0.03 +
        Math.cos(a * Math.PI * 3.8 + time * 0.58) * 0.015;
      point.addScaledVector(frame.up, upWobble * swing * bodyWeight);
      point.addScaledVector(frame.depth, depthWobble * swing * 0.35 * bodyWeight);
      points.push(point);
    }

    points[0].copy(l);
    points[points.length - 1].copy(r);
    return points;
  }

  function resolveSparkEndpoints(leftPoint, rightPoint, frame) {
    const leftInset = eng.gapRig?.leftInset ?? eng.dischargeFrame?.leftInset ?? 0;
    const rightInset = eng.gapRig?.rightInset ?? eng.dischargeFrame?.rightInset ?? 0;
    const worldPerMm = Math.max(eng.gapRig?.scale || 0.02, 1e-4);
    const extraInward = clamp(worldPerMm * 1.5, 0.0015, Math.max(frame.length * 0.16, 0.004));
    const inwardLeft = clamp(leftInset * 0.55, 0.0015, 0.008);
    const inwardRight = clamp(rightInset * 0.55, 0.0015, 0.008);
    const sparkLeft = leftPoint.clone().addScaledVector(frame.direction, -leftInset + inwardLeft + extraInward);
    const sparkRight = rightPoint.clone().addScaledVector(frame.direction, rightInset - inwardRight - extraInward);
    return { left: sparkLeft, right: sparkRight };
  }

  function resolveArcAnchors(leftPoint, rightPoint, frame, time) {
    const worldPerMm = worldUnitsPerMm(frame);
    const inset = clamp(worldPerMm * ARC_ANCHOR_INSET_MM, 0.0015, Math.max(frame.length * 0.08, 0.01));
    const travelUp = clamp(frame.height * 0.03, 0.002, 0.012);
    const travelDepth = clamp(frame.width * 0.08, 0.0015, 0.008);
    const sharedUp = Math.sin(time * 0.72 + 0.6) * travelUp;
    const sharedDepth = Math.sin(time * 0.58 + 1.4) * travelDepth;
    const skewUp = Math.sin(time * 0.88 + 0.9) * travelUp * 0.24;
    const skewDepth = Math.sin(time * 0.66 + 2.1) * travelDepth * 0.2;
    const left = leftPoint.clone()
      .addScaledVector(frame.direction, inset)
      .addScaledVector(frame.up, sharedUp + skewUp)
      .addScaledVector(frame.depth, sharedDepth + skewDepth);
    const right = rightPoint.clone()
      .addScaledVector(frame.direction, -inset)
      .addScaledVector(frame.up, sharedUp - skewUp)
      .addScaledVector(frame.depth, sharedDepth - skewDepth);
    return { left, right };
  }

  function updateVisual(t) {
    if (!eng.ok) return;
    const T = eng.T;
    const { mode, ratio } = resolveMode();
    const c = centerPoint();
    const l = electrodePoint('left');
    const r = electrodePoint('right');
    const frame = getDischargeFrame(l, r);
    const intensity = clamp(0.28 + Math.max(ratio - 0.95, 0) * 0.72, 0.24, 1.18);

    const MODE_IDLE = '\u5f85\u673a';
    const MODE_NO = '\u672a\u51fb\u7a7f';
    const MODE_CORONA = '\u7535\u6655\u653e\u7535';
    const MODE_GLOW = '\u8f89\u5149\u653e\u7535';
    const MODE_SPARK = '\u706b\u82b1\u653e\u7535';
    const MODE_ARC = '\u5f27\u5149\u653e\u7535';

    const fx = eng.fx;
    fx.glowCol.visible = false;
    if (fx.glowVeil) fx.glowVeil.visible = false;
    if (fx.glowOuter) fx.glowOuter.visible = false;
    if (fx.glowMid) fx.glowMid.visible = false;
    if (fx.glowCore) fx.glowCore.visible = false;
    if (fx.glowCathode) fx.glowCathode.visible = false;
    if (fx.glowRibbon) fx.glowRibbon.visible = false;
    if (fx.glowShell) fx.glowShell.visible = false;
    fx.glow.forEach((x) => x.visible = false);
    fx.corona.forEach((x) => x.visible = false);
    if (fx.coronaHalo) fx.coronaHalo.forEach((x) => x.visible = false);
    fx.spark.forEach((branch) => {
      branch.core.visible = false;
      branch.aura.forEach((sprite) => sprite.visible = false);
    });
    fx.arc.visible = false;
    if (fx.arcCore) fx.arcCore.visible = false;
    fx.arcHalo.forEach((x) => x.visible = false);
    fx.arcContacts.forEach((x) => x.visible = false);
    if (mode !== MODE_SPARK) eng.sparkPulse.lastMode = mode;

    if (!state.running || mode === MODE_NO || mode === MODE_IDLE) return;

    if (mode === MODE_CORONA) {
      const tipRadius =
        state.electrodeType === 'sphere'
          ? clamp(frame.width * 0.62, 0.05, 0.14)
          : clamp(frame.width * 0.28, 0.018, 0.06);
      fx.corona.forEach((s, i) => {
        const useLeft = i < fx.corona.length / 2;
        const tip = useLeft ? l : r;
        const sign = useLeft ? 1 : -1;
        const ring = i % Math.max(1, Math.floor(fx.corona.length / 2));
        const orbit = t * (2.1 + ring * 0.24) + ring * 1.35;
        const spread = tipRadius * (0.7 + ring * 0.24);
        const along = tipRadius * (0.22 + ring * 0.08) + Math.max(0, Math.sin(t * 3.8 + ring * 0.7)) * tipRadius * 0.24;
        const pulse = 0.46 + 0.22 * Math.sin(t * 5.4 + i * 0.8);
        s.visible = true;
        s.position.copy(tip)
          .addScaledVector(frame.direction, sign * along)
          .addScaledVector(frame.up, Math.sin(orbit) * spread * 0.82)
          .addScaledVector(frame.depth, Math.cos(orbit * 1.28) * spread);
        s.scale.setScalar(tipRadius * (1.8 + ring * 0.28) + pulse * 0.08);
        s.material.opacity = 0.16 + pulse * 0.26 + ring * 0.025;
        s.material.color.setHex(useLeft ? 0x7b65ff : 0xa96dff);
      });
      if (fx.coronaHalo) {
        fx.coronaHalo.forEach((h, i) => {
          const tip = i === 0 ? l : r;
          const sign = i === 0 ? 1 : -1;
          const pulse = 0.5 + 0.26 * Math.sin(t * 4.6 + i * 1.6);
          h.visible = true;
          h.position.copy(tip).addScaledVector(frame.direction, sign * tipRadius * 0.34);
          h.scale.setScalar(tipRadius * (3.8 + pulse * 0.9));
          h.material.opacity = 0.12 + pulse * 0.16;
          h.material.color.setHex(i === 0 ? 0x845fff : 0xbf79ff);
        });
      }
      return;
    }

    if (mode === MODE_GLOW) {
      const len = frame.length;
      const basis = new T.Matrix4().makeBasis(frame.direction, frame.up, frame.depth);

      fx.glowCol.visible = true;
      fx.glowCol.position.copy(c);
      fx.glowCol.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), frame.direction);

      const pf = clamp(1 - state.pressurePa / 22000, 0.18, 1.08);
      const radius = clamp(frame.width * 0.62 + state.gapMm * 0.0024, 0.055, 0.21);
      fx.glowCol.material.opacity = 0.008 + 0.022 * pf;
      fx.glowCol.material.color.setHex(0xd288ff);
      fx.glowCol.scale.set(radius * 0.8, len / 5.2, radius * 0.58);

      fx.glowShell.visible = true;
      fx.glowShell.position.copy(c);
      fx.glowShell.quaternion.setFromRotationMatrix(basis);
      fx.glowShell.scale.set(len * 1.54, frame.height * 1.72, frame.width * 2.34);
      fx.glowShell.material.opacity = 0.008 + intensity * 0.012;

      fx.glowVeil.visible = true;
      fx.glowVeil.position.copy(c)
        .addScaledVector(frame.depth, -frame.width * 0.98)
        .addScaledVector(frame.up, -frame.height * 0.015);
      fx.glowVeil.quaternion.setFromRotationMatrix(basis);
      fx.glowVeil.scale.set(len * 1.46, frame.height * 1.6, 1);

      fx.glowOuter.visible = true;
      fx.glowOuter.position.copy(c);
      fx.glowOuter.quaternion.setFromRotationMatrix(basis);
      fx.glowOuter.position.addScaledVector(frame.depth, -frame.width * 0.34);
      fx.glowOuter.scale.set(len * 1.4, frame.height * 1.18, 1);

      fx.glowMid.visible = true;
      fx.glowMid.position.copy(c)
        .addScaledVector(frame.depth, frame.width * 0.32)
        .addScaledVector(frame.up, frame.height * 0.012);
      fx.glowMid.quaternion.copy(fx.glowOuter.quaternion);
      fx.glowMid.scale.set(len * 1.12, frame.height * 0.74, 1);

      fx.glowCore.visible = true;
      fx.glowCore.position.copy(c)
        .addScaledVector(frame.depth, frame.width * 0.98)
        .addScaledVector(frame.up, frame.height * 0.018);
      fx.glowCore.quaternion.copy(fx.glowOuter.quaternion);
      fx.glowCore.scale.set(len * 0.5, frame.height * 0.2, 1);

      fx.glowCathode.visible = true;
      fx.glowCathode.position.copy(new T.Vector3().lerpVectors(l, r, 0.16))
        .addScaledVector(frame.depth, frame.width * 0.08)
        .addScaledVector(frame.up, -frame.height * 0.01);
      fx.glowCathode.quaternion.copy(fx.glowOuter.quaternion);
      fx.glowCathode.scale.set(len * 0.18, frame.height * 0.54, 1);

      fx.glowRibbon.visible = true;
      fx.glowRibbon.position.copy(c)
        .addScaledVector(frame.depth, -frame.width * 2.32)
        .addScaledVector(frame.up, frame.height * 0.03);
      fx.glowRibbon.quaternion.copy(fx.glowOuter.quaternion);
      fx.glowRibbon.scale.set(len * 1.02, frame.height * 1.24, 1);

      const layerGain = [0.12, 0.46, 0.96, 1.34, 0.68, 1.54];
      fx.glowMaterials.forEach((material, idx) => {
        material.uniforms.uTime.value = t;
        material.uniforms.uIntensity.value = intensity * layerGain[idx];
      });

      fx.glow.forEach((s, i) => {
        const a = fx.glow.length > 1 ? 0.12 + (i / (fx.glow.length - 1)) * 0.76 : 0.5;
        const p = l.clone().lerp(r, a);
        const nearCathode = Math.exp(-(((a - 0.18) / 0.095) ** 2));
        const positiveColumn = Math.exp(-(((a - 0.72) / 0.18) ** 2));
        const centerFill = Math.exp(-(((a - 0.5) / 0.2) ** 2));
        const discBand = 0.48 + 0.52 * Math.pow(0.5 + 0.5 * Math.sin((a * 7.2 - t * 0.26) * 6.28318 + i * 0.18), 1.9);
        const lane = (i % 2 === 0 ? -1 : 1) * frame.width * (0.045 + positiveColumn * 0.018 - centerFill * 0.024);
        const driftDepth = Math.sin(t * 0.84 + i * 0.55) * frame.width * (0.022 + centerFill * 0.01);
        const driftUp = Math.cos(t * 0.92 + i * 0.4) * frame.height * 0.012;
        p.addScaledVector(frame.up, driftUp + positiveColumn * frame.height * 0.02 + centerFill * frame.height * 0.01);
        p.addScaledVector(frame.depth, lane + driftDepth);

        s.visible = true;
        s.position.copy(p);
        s.material.color.setHex(discBand > 0.72 || positiveColumn > 0.46 ? 0xf15eff : 0xbf8cff);
        const aOpacity = clamp((0.065 + nearCathode * 0.06 + positiveColumn * 0.12 + centerFill * 0.05) * (0.72 + discBand * 0.92), 0.055, 0.24);
        s.material.opacity = aOpacity;
        const discSize = 0.05 + frame.width * (0.5 + positiveColumn * 0.12 + centerFill * 0.1);
        s.scale.set(discSize * (1.04 + discBand * 0.08), discSize * (0.96 + positiveColumn * 0.1 + centerFill * 0.06), 1);
      });
      return;
    }

    if (mode === MODE_SPARK) {
      const sparkEndpoints = resolveSparkEndpoints(l, r, frame);
      const sparkL = sparkEndpoints.left;
      const sparkR = sparkEndpoints.right;
      const sparkFrame = getDischargeFrame(sparkL, sparkR);
      const pulse = sampleSparkPulse(t, sparkFrame, ratio);
      if (!pulse.active) return;
      const mainPts = buildSparkPath(sparkL, sparkR, sparkFrame, pulse.steps, pulse.amplitude, pulse.seed, 1);
      fx.spark.forEach((branch, i) => {
        let pts = [];
        let opacity = 0;

        if (i === 0) {
          pts = mainPts;
          opacity = pulse.coreOpacity;
        } else if (i <= pulse.branchCount) {
          const branchSeed = pulse.seed + i * 1.37;
          const branchAnchor = mainPts[Math.min(mainPts.length - 2, 2 + i)];
          const branchEnd = branchAnchor.clone()
            .lerp(sparkR, 0.12 + i * 0.05)
            .addScaledVector(sparkFrame.up, (i % 2 === 0 ? 1 : -1) * clamp(sparkFrame.width * 0.34, 0.012, 0.032))
            .addScaledVector(sparkFrame.depth, Math.sin(branchSeed) * clamp(sparkFrame.width * 0.18, 0.006, 0.018));
          pts = buildSparkPath(branchAnchor, branchEnd, sparkFrame, 5, pulse.amplitude * 0.42, branchSeed, 0.65);
          opacity = pulse.flash ? pulse.coreOpacity * (i === 1 ? 0.28 : 0.18) : 0;
        }

        branch.core.visible = opacity > 0.05;
        branch.aura.forEach((sprite) => sprite.visible = branch.core.visible);
        if (!branch.core.visible) return;

        branch.core.geometry.dispose();
        branch.core.geometry = new T.BufferGeometry().setFromPoints(pts);
        branch.core.material.opacity = opacity;
        branch.core.material.color.setHex(i === 0 ? 0xfafdff : 0xcce4ff);

        branch.aura.forEach((sprite, j) => {
          const a = branch.aura.length > 1 ? j / (branch.aura.length - 1) : 0.5;
          const idx = Math.round(a * (pts.length - 1));
          const p = pts[idx];
          const mid = Math.sin(Math.PI * a);
          sprite.position.copy(p);
          sprite.material.opacity = pulse.auraOpacity * (i === 0 ? 0.72 + mid * 0.2 : 0.55 + mid * 0.15);
          const size = i === 0
            ? clamp(sparkFrame.width * (0.22 + mid * 0.08), 0.01, 0.022)
            : clamp(sparkFrame.width * (0.12 + mid * 0.05), 0.006, 0.014);
          sprite.scale.set(size, size * (0.88 + mid * 0.18), 1);
        });
      });
      return;
    }

    if (mode === MODE_ARC) {
      fx.arc.visible = true;
      if (fx.arcCore) fx.arcCore.visible = true;
      const arcAnchors = resolveArcAnchors(l, r, frame, t);
      const arcL = arcAnchors.left;
      const arcR = arcAnchors.right;
      const arcFrame = getDischargeFrame(arcL, arcR);
      const points = generateArcPoints(arcL, arcR, arcFrame, t, intensity);
      const curve = new T.CatmullRomCurve3(points, false, 'centripetal');
      const coreRadius = clamp(arcFrame.length * 0.0032, 0.0014, 0.0036);
      const shellGeo = new T.TubeGeometry(curve, 64, coreRadius * (2.25 + 0.03 * Math.sin(t * 3.8)), 10, false);
      const coreGeo = new T.TubeGeometry(curve, 64, coreRadius * (0.92 + 0.02 * Math.sin(t * 6.6)), 8, false);
      fx.arc.geometry.dispose();
      fx.arc.geometry = shellGeo;
      fx.arc.material.opacity = 0.22 + Math.abs(Math.sin(t * 5.1)) * 0.03;
      fx.arc.material.color.setHex(0x9c43ff);
      if (fx.arcCore) {
        fx.arcCore.geometry.dispose();
        fx.arcCore.geometry = coreGeo;
        fx.arcCore.material.opacity = 0.94 + Math.abs(Math.sin(t * 7.6)) * 0.04;
        fx.arcCore.material.color.setHex(0xffffff);
      }
      fx.arcHalo.forEach((h, i) => {
        h.visible = true;
        h.position.copy(curve.getPoint((i + 1) / (fx.arcHalo.length + 1)));
        const sz = 0.04 + coreRadius * 4.8 + Math.abs(Math.cos(t * 3.2 + i)) * 0.012;
        h.scale.set(sz * 1.52, sz * 0.8, 1);
        h.material.opacity = 0.07 + Math.abs(Math.sin(t * 4.6 + i)) * 0.03;
      });
      fx.arcContacts.forEach((contact, i) => {
        const endpoint = i === 0 ? arcL : arcR;
        const sign = i === 0 ? 1 : -1;
        contact.visible = true;
        contact.position.copy(endpoint).addScaledVector(arcFrame.direction, sign * coreRadius * 1.05);
        const sz = 0.022 + coreRadius * 2.8 + Math.abs(Math.sin(t * 6.2 + i)) * 0.007;
        contact.scale.set(sz, sz, 1);
        contact.material.opacity = 0.44 + Math.abs(Math.sin(t * 5.4 + i)) * 0.12;
      });
    }
  }
  function applyGap() {
    if (!eng.ok || !eng.anchor.left || !eng.anchor.right) return;
    const gapMm = visualGapMm(state.gapMm);

    if (eng.useModelElectrodes && eng.gapRig) {
      const half = (gapMm * eng.gapRig.scale) / 2;
      const rawLeft = eng.gapRig.center.clone().addScaledVector(eng.gapRig.axis, -half);
      const rawRight = eng.gapRig.center.clone().addScaledVector(eng.gapRig.axis, half);
      const leftPos = rawLeft.clone().addScaledVector(eng.gapRig.axis, eng.gapRig.leftInset || 0);
      const rightPos = rawRight.clone().addScaledVector(eng.gapRig.axis, -(eng.gapRig.rightInset || 0));
      const anchorExtend = (eng.gapRig.scale || 0.01) * DISCHARGE_ANCHOR_EXTEND_MM;
      leftPos.addScaledVector(eng.gapRig.axis, -anchorExtend);
      rightPos.addScaledVector(eng.gapRig.axis, anchorExtend);
      leftPos.y += DISCHARGE_ANCHOR_UP_OFFSET;
      rightPos.y += DISCHARGE_ANCHOR_UP_OFFSET;
      if (shouldApplyLeftElectrodeZOffset()) leftPos.z += LEFT_ELECTRODE_ASSEMBLY_Z_OFFSET_M;
      eng.anchor.left.position.copy(leftPos);
      eng.anchor.right.position.copy(rightPos);
      const leftMotionTarget = rawLeft.clone();
      if (shouldApplyLeftElectrodeZOffset()) leftMotionTarget.z += LEFT_ELECTRODE_ASSEMBLY_Z_OFFSET_M;
      const leftDelta = leftMotionTarget.sub(eng.gapRig.frontA || rawLeft);
      const rightMotionTarget = rawRight.clone();
      const rightDelta = rightMotionTarget.sub(eng.gapRig.frontB || rawRight);

      const moveNodes = (items, delta) => {
        let moved = 0;
        items.forEach((item) => {
          if (!item?.node || !item.baseWorld) return;
          const world = item.baseWorld.clone().add(delta);
          const local = item.node.parent ? item.node.parent.worldToLocal(world.clone()) : world;
          item.node.position.copy(local);
          moved += 1;
        });
        return moved;
      };

      const movedLeft = moveNodes(eng.gapRig.motionLeft, leftDelta);
      const movedRight = moveNodes(eng.gapRig.motionRight, rightDelta);

      if (!movedLeft && eng.gapRig.modelLeft && eng.gapRig.modelLeftBaseWorld && eng.gapRig.frontA) {
        const leftWorld = eng.gapRig.modelLeftBaseWorld.clone().add(leftDelta);
        const leftLocal = eng.gapRig.modelLeft.parent ? eng.gapRig.modelLeft.parent.worldToLocal(leftWorld.clone()) : leftWorld;
        eng.gapRig.modelLeft.position.copy(leftLocal);
      }
      if (!movedRight && eng.gapRig.modelRight && eng.gapRig.modelRightBaseWorld && eng.gapRig.frontB) {
        const rightWorld = eng.gapRig.modelRightBaseWorld.clone().add(rightDelta);
        const rightLocal = eng.gapRig.modelRight.parent ? eng.gapRig.modelRight.parent.worldToLocal(rightWorld.clone()) : rightWorld;
        eng.gapRig.modelRight.position.copy(rightLocal);
      }
      refreshElectrodeVisuals();
      return;
    }

    const space = gapMm * 0.02;
    eng.anchor.left.position.x = -space / 2;
    eng.anchor.right.position.x = space / 2;
    if (shouldApplyLeftElectrodeZOffset()) eng.anchor.left.position.z = LEFT_ELECTRODE_ASSEMBLY_Z_OFFSET_M;
    refreshElectrodeVisuals();
  }

  function shouldApplyLeftElectrodeZOffset() {
    return state.electrodeType === 'sphere' || state.electrodeType === 'parallel';
  }

  function ensureProbeMotionRig() {
    if (!eng.ok || !eng.anchor.probe) return null;
    if (eng.probeMotionRig?.anchor === eng.anchor.probe) return eng.probeMotionRig;

    const T = eng.T;
    const root = eng.machine || eng.root;
    const translateNames = [
      '柱体024',
      '柱体022',
      '柱体023',
      '气体放电与等离子实验仪stp_-___05_______1stp-1',
      '气体放电与等离子实验仪stp_-___05_______1stp-2',
      '气体放电与等离子实验仪stp_-________1stp-1',
      '气体放电与等离子实验仪stp_-_X_________1stp-2',
      '气体放电与等离子实验仪stp_-_2mm_______________1stp-1',
      '气体放电与等离子实验仪stp_-__________1-4stp-1',
    ];
    const stretchNames = [
      '气体放电与等离子实验仪stp_-_MNTL______50___20stp_1stp-1',
    ];
    const horizontalStretchNames = [
    ];
    const horizontalTranslateNames = [
    ];
    const fixedShellNames = [
      '气体放电与等离子实验仪stp_-_X_________1stp-1',
      '气体放电与等离子实验仪stp_-_Z_________1stp-1',
      '气体放电与等离子实验仪stp_-_GX28-____250mm-2840(1)stp_1stp-1',
    ];
    const translateNameSet = new Set(translateNames);
    const stretchNameSet = new Set(stretchNames);
    const horizontalStretchNameSet = new Set(horizontalStretchNames);
    const horizontalTranslateNameSet = new Set(horizontalTranslateNames);
    const fixedShellNameSet = new Set(fixedShellNames);
    const nodes = new Map();
    nodes.set(eng.anchor.probe, 'translate');
    root.traverse((obj) => {
      const name = obj.name || '';
      if (fixedShellNameSet.has(name)) {
        nodes.set(obj, 'fixed');
        return;
      }
      if (translateNameSet.has(name)) nodes.set(obj, 'translate');
      if (stretchNameSet.has(name)) nodes.set(obj, 'stretch');
      if (horizontalStretchNameSet.has(name)) nodes.set(obj, 'horizontalStretch');
      if (horizontalTranslateNameSet.has(name)) nodes.set(obj, 'horizontalTranslate');
    });

    root.updateMatrixWorld(true);
    const baseItems = Array.from(nodes.entries())
      .filter(([node]) => node?.parent && node.visible !== false)
      .map(([node, mode]) => {
        const box = new T.Box3().setFromObject(node);
        const size = box.isEmpty() ? new T.Vector3() : box.getSize(new T.Vector3());
        return {
          node,
          mode,
          baseWorld: node.getWorldPosition(new T.Vector3()),
          baseScale: node.scale.clone(),
          baseHeight: Math.max(size.y, 1e-6),
          baseMinY: box.isEmpty() ? null : box.min.y,
          baseWidthX: Math.max(size.x, 1e-6),
          baseMinX: box.isEmpty() ? null : box.min.x,
          stretchAxis:
            mode === 'stretch' ? worldLocalScaleAxis(node, new T.Vector3(0, 1, 0)) :
            mode === 'horizontalStretch' ? worldLocalScaleAxis(node, new T.Vector3(1, 0, 0)) :
            'y',
        };
      });

    eng.probeMotionRig = {
      anchor: eng.anchor.probe,
      items: baseItems.length ? baseItems : [{
        node: eng.anchor.probe,
        mode: 'translate',
        baseWorld: eng.anchor.probe.getWorldPosition(new T.Vector3()),
        baseScale: eng.anchor.probe.scale.clone(),
        baseHeight: 1,
        baseMinY: null,
        baseWidthX: 1,
        baseMinX: null,
        stretchAxis: 'y',
      }],
    };
    return eng.probeMotionRig;
  }

  function worldLocalScaleAxis(node, worldAxis) {
    const T = eng.T;
    if (!T || !node) return 'y';
    node.updateMatrixWorld(true);
    const target = worldAxis?.clone?.().normalize?.() || new T.Vector3(0, 1, 0);
    const rotation = new T.Matrix4().extractRotation(node.matrixWorld);
    const axes = [
      ['x', new T.Vector3(1, 0, 0)],
      ['y', new T.Vector3(0, 1, 0)],
      ['z', new T.Vector3(0, 0, 1)],
    ];
    let best = axes[1][0];
    let bestDot = -1;
    axes.forEach(([axis, vector]) => {
      const dot = Math.abs(vector.clone().applyMatrix4(rotation).normalize().dot(target));
      if (dot > bestDot) {
        best = axis;
        bestDot = dot;
      }
    });
    return best;
  }

  function applyProbeHeight() {
    if (!eng.ok || !eng.anchor.probe) return;
    const rig = ensureProbeMotionRig();
    if (!rig?.items?.length) return;

    const horizontalDelta = new eng.T.Vector3(
      state.probeHorizontalMm * 0.03,
      0,
      0
    );
    const fullDelta = new eng.T.Vector3(
      state.probeHorizontalMm * 0.03,
      state.probeHeightMm * 0.03,
      0
    );
    const stretchDelta = new eng.T.Vector3(
      state.probeHorizontalMm * 0.03,
      0,
      0
    );
    rig.items.forEach((item) => {
      if (!item?.node || !item.baseWorld) return;
      const delta =
        item.mode === 'fixed' ? null :
        item.mode === 'horizontalTranslate' ? horizontalDelta :
        item.mode === 'horizontalStretch' ? horizontalDelta :
        item.mode === 'stretch' ? stretchDelta :
        fullDelta;
      const world = delta ? item.baseWorld.clone().add(delta) : item.baseWorld.clone();
      const local = item.node.parent ? item.node.parent.worldToLocal(world.clone()) : world;
      item.node.position.copy(local);
      if (item.mode === 'horizontalStretch' && item.baseScale) {
        const travel = state.probeHorizontalMm * 0.03;
        const nextWidth = Math.max(item.baseWidthX + travel, item.baseWidthX * 0.28);
        item.node.scale.copy(item.baseScale);
        const axis = item.stretchAxis || 'y';
        item.node.scale[axis] = item.baseScale[axis] * (nextWidth / item.baseWidthX);
        item.node.updateMatrixWorld(true);
        if (item.baseMinX != null) {
          const box = new eng.T.Box3().setFromObject(item.node);
          if (!box.isEmpty()) {
            const correctedWorld = item.node.getWorldPosition(new eng.T.Vector3());
            correctedWorld.x += item.baseMinX - box.min.x;
            const correctedLocal = item.node.parent ? item.node.parent.worldToLocal(correctedWorld.clone()) : correctedWorld;
            item.node.position.copy(correctedLocal);
          }
        }
      } else if (item.mode === 'stretch' && item.baseScale) {
        const nextHeight = Math.max(item.baseHeight + state.probeHeightMm * 0.03, item.baseHeight * 0.22);
        item.node.scale.copy(item.baseScale);
        const axis = item.stretchAxis || 'y';
        item.node.scale[axis] = item.baseScale[axis] * (nextHeight / item.baseHeight);
        item.node.updateMatrixWorld(true);
        if (item.baseMinY != null) {
          const box = new eng.T.Box3().setFromObject(item.node);
          if (!box.isEmpty()) {
            const correctedWorld = item.node.getWorldPosition(new eng.T.Vector3());
            correctedWorld.y += item.baseMinY - box.min.y;
            const correctedLocal = item.node.parent ? item.node.parent.worldToLocal(correctedWorld.clone()) : correctedWorld;
            item.node.position.copy(correctedLocal);
          }
        }
      } else if (item.baseScale) {
        item.node.scale.copy(item.baseScale);
      }
      item.node.updateMatrixWorld(true);
    });
  }

  function centerPoint() {
    return electrodePoint('left').clone().add(electrodePoint('right')).multiplyScalar(0.5);
  }

  function electrodePoint(side) {
    const T = eng.T;
    if (state.electrodeType === 'sphere' && eng.sphereDischargePoints?.[side]) {
      return eng.sphereDischargePoints[side].clone();
    }
    const n = side === 'left' ? eng.anchor.left : eng.anchor.right;
    if (!n) return new T.Vector3(side === 'left' ? -1 : 1, 3.2, 0);
    const p = new T.Vector3();
    n.getWorldPosition(p);
    return p;
  }

  function ensureDischargeViewRenderer(canvas) {
    if (!eng.ok || !eng.T || !canvas) return null;
    if (eng.dischargeViewRenderer?.domElement === canvas) return eng.dischargeViewRenderer;

    try {
      eng.dischargeViewRenderer?.dispose?.();
      const renderer = new eng.T.WebGLRenderer({ canvas, antialias: true, alpha: false });
      renderer.setClearColor(0x8fa0ae, 1);
      renderer.outputColorSpace = eng.renderer?.outputColorSpace || eng.T.SRGBColorSpace;
      renderer.toneMapping = eng.renderer?.toneMapping || renderer.toneMapping;
      renderer.toneMappingExposure = eng.renderer?.toneMappingExposure || 1;
      eng.dischargeViewRenderer = renderer;
      eng.dischargeViewCamera = new eng.T.PerspectiveCamera(34, 1, 0.01, 40);
      return renderer;
    } catch (err) {
      eng.dischargeViewRenderer = null;
      eng.dischargeViewCamera = null;
      return null;
    }
  }

  function positionDischargeViewCamera(camera, aspect) {
    if (!camera || !eng.T) return;
    const T = eng.T;
    const left = electrodePoint('left');
    const right = electrodePoint('right');
    const frame = getDischargeFrame(left, right);
    const center = left.clone().add(right).multiplyScalar(0.5);

    if (eng.anchor.vacuum) {
      const chamberBox = new T.Box3().setFromObject(eng.anchor.vacuum);
      if (!chamberBox.isEmpty()) {
        const chamberCenter = chamberBox.getCenter(new T.Vector3());
        center.lerp(chamberCenter, 0.04);
      }
    }

    const span = Math.max(frame.length, frame.width * 4, frame.height * 0.7, 0.22);
    const upDistance = clamp(span * 2.85, 1.25, 2.28);
    const frontDistance = clamp(span * 0.92, 0.42, 0.82);
    const target = center.clone()
      .addScaledVector(new T.Vector3(0, 1, 0), frame.height * 0.04);
    const position = target.clone()
      .add(new T.Vector3(0, upDistance, frontDistance));

    camera.position.copy(position);
    camera.up.set(0, 1, 0);
    camera.lookAt(target);
    camera.aspect = aspect || 1;
    camera.fov = 37;
    camera.near = 0.01;
    camera.far = 40;
    camera.updateProjectionMatrix();
  }

  function updateDischargeZoomView() {
    const out = refs.dischargeZoomCanvas;
    const dialog = refs.dialogs.dischargeView;
    if (!out || !dialog?.open || !eng.ok || !eng.scene) return;

    const renderer = ensureDischargeViewRenderer(out);
    if (!renderer || !eng.dischargeViewCamera) return;

    const cssWidth = Math.max(out.clientWidth || out.width || 720, 1);
    const cssHeight = Math.max(out.clientHeight || out.height || 520, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(cssWidth, cssHeight, false);
    positionDischargeViewCamera(eng.dischargeViewCamera, cssWidth / cssHeight);
    renderer.render(eng.scene, eng.dischargeViewCamera);
  }

  function getDischargeZoomCrop(sourceWidth, sourceHeight) {
    let cx = sourceWidth * 0.53;
    let cy = sourceHeight * 0.55;
    let electrodeSpan = sourceWidth * 0.07;

    if (eng.ok && eng.camera && eng.T) {
      try {
        const projected = [electrodePoint('left'), electrodePoint('right'), centerPoint()]
          .map((point) => {
            const p = point.clone().project(eng.camera);
            return {
              x: (p.x * 0.5 + 0.5) * sourceWidth,
              y: (-p.y * 0.5 + 0.5) * sourceHeight,
              visible: Number.isFinite(p.x) && Number.isFinite(p.y) && p.z > -1 && p.z < 1,
            };
          })
          .filter((p) => p.visible);

        if (projected.length >= 2) {
          const xs = projected.map((p) => p.x);
          const ys = projected.map((p) => p.y);
          cx = xs.reduce((sum, x) => sum + x, 0) / xs.length;
          cy = ys.reduce((sum, y) => sum + y, 0) / ys.length;
          electrodeSpan = Math.max(Math.max(...xs) - Math.min(...xs), sourceWidth * 0.12);
        }
      } catch (err) {
        // If the model is still loading, fall back to the central chamber crop.
      }
    }

    const cropWidth = clamp(electrodeSpan * 5.2, sourceWidth * 0.15, sourceWidth * 0.24);
    const cropHeight = clamp(cropWidth * 0.82, sourceHeight * 0.18, sourceHeight * 0.38);
    const x = clamp(cx - cropWidth / 2, 0, Math.max(0, sourceWidth - cropWidth));
    const y = clamp(cy - cropHeight * 0.52, 0, Math.max(0, sourceHeight - cropHeight));
    return { x, y, width: cropWidth, height: cropHeight };
  }

  function resolveMode() {
    state.gasType = FIXED_GAS_TYPE;
    const gapMm = Math.max(Math.abs(Number(state.gapMm) || 0), PHYSICS_GAP_MIN_MM);
    const pressurePa = Math.max(Math.abs(Number(state.pressurePa) || 0), 1);
    const mainVoltageV = Math.max(Number(state.mainVoltageV) || 0, 0);
    const pdRaw = Math.max(pressurePa * (gapMm / 1000), PHYSICS_PD_MIN);
    const geom = state.electrodeType === 'parallel' ? 1 : 0.97;
    const env = getAmbientCorrection(state.gasType);
    const pdNominal = Math.max(pdRaw * geom, PHYSICS_PD_MIN);
    const pd = Math.max(pdNominal * env.densityFactor, PHYSICS_PD_MIN);
    const gas = GAS[state.gasType] || GAS.air;
    const ubBase = paschen(pdNominal, gas);
    const ub = paschen(pd, gas);
    const actual = actualBreakdownVoltage(ub, pd, state.gasType, state.electrodeType, pressurePa, gapMm, env);
    const ubActual = roundUpDecimals(actual.ub, 2);
    const ratioBase = mainVoltageV / Math.max(ubBase, 1);
    const ratio = mainVoltageV / Math.max(ub, 1);
    const ratioActual = mainVoltageV / Math.max(ubActual, 1);
    const gapM = Math.max(gapMm / 1000, FIELD_GAP_MIN_M);
    const fieldVpm = mainVoltageV / gapM;
    const eOverP = fieldVpm / Math.max(pressurePa, 1);
    const coronaFieldGain = state.electrodeType === 'sphere' ? 1.35 : 0.78;
    const localFieldMetric = eOverP * coronaFieldGain;
    const holdRatio =
      pressurePa < 1200 ? 0.8 :
      pressurePa < 8000 ? 0.74 :
      pressurePa < 30000 ? 0.7 : 0.62;
    const sustainVoltage = ubActual * holdRatio;
    const rawCurrentMa = state.running ? Math.max((mainVoltageV - sustainVoltage) / DISCHARGE_BALLAST_OHM * 1000, 0) : 0;
    let currentMa = 0;
    let powerW = 0;

    let mode = MODE_IDLE;
    let breakdown = false;
    const inWindow = (window) =>
      pressurePa >= window.pMin &&
      pressurePa <= window.pMax &&
      gapMm >= window.gapMinMm &&
      gapMm <= window.gapMaxMm;

    if (!state.running) {
      mode = MODE_IDLE;
    } else {
      const nonUniform = state.electrodeType !== 'parallel';
      const coronaLike =
        nonUniform &&
        inWindow(DISCHARGE_WINDOWS.corona) &&
        ratioActual >= 0.72 &&
        ratioActual < 1.16 &&
        localFieldMetric > 42 &&
        gapMm >= 15;

      if (coronaLike) {
        mode = MODE_CORONA;
        currentMa = clamp((ratioActual - 0.72) * 0.82 + (localFieldMetric - 42) * 0.0034, 0.03, 0.58);
        powerW = mainVoltageV * currentMa / 1000;
      } else if (ratioActual < 1) {
        mode = MODE_NO;
      } else {
        breakdown = true;
        currentMa = rawCurrentMa;
        powerW = mainVoltageV * currentMa / 1000;

        const glowLike =
          state.electrodeType === 'parallel' &&
          inWindow(DISCHARGE_WINDOWS.glow) &&
          currentMa <= 4.2 &&
          ratioActual <= 1.52;
        const arcLike =
          inWindow(DISCHARGE_WINDOWS.arc) &&
          (currentMa >= 2.8 || powerW >= 5.5 || ratioActual >= 1.55);
        const sparkLike =
          inWindow(DISCHARGE_WINDOWS.spark) &&
          currentMa < 4.8 &&
          ratioActual >= 1.01;

        if (glowLike) mode = MODE_GLOW;
        else if (arcLike) mode = MODE_ARC;
        else if (sparkLike) mode = MODE_SPARK;
        else if (state.electrodeType === 'parallel' && pressurePa >= 500 && pressurePa <= 1800 && currentMa < 4.4 && ratioActual <= 1.55) mode = MODE_GLOW;
        else if (pressurePa >= 6000 && currentMa < 5.2) mode = MODE_SPARK;
        else mode = MODE_ARC;

        if (state.electrodeType === 'sphere' && pressurePa >= 5000 && currentMa < 4.8) mode = MODE_SPARK;
        if (nonUniform && ratioActual < 1.16 && pressurePa <= Math.max(DISCHARGE_WINDOWS.corona.pMax, 900) && localFieldMetric > 44) {
          mode = MODE_CORONA;
          breakdown = false;
          currentMa = clamp((ratioActual - 0.72) * 0.7 + (localFieldMetric - 44) * 0.0028, 0.03, 0.58);
          powerW = mainVoltageV * currentMa / 1000;
        }
      }
    }

    state.mode = mode;
    state.breakdown = breakdown;
    state.ub = ubActual;
    state.ubTheory = ub;
    state.mainCurrentMa = currentMa;
    state.mainPowerW = powerW;
    return {
      mode, ub, ubBase, ubActual, ratio, ratioBase, ratioActual,
      pd, pdNominal, pdRaw, currentMa, powerW, fieldVpm, eOverP,
      localFieldMetric, sustainVoltage, breakdown,
      temperatureC: env.temperatureC, humidity: env.humidity,
      densityFactor: env.densityFactor, humidityFactor: env.humidityFactor,
      lookupUb: actual.lookupUb, lookupConfidence: actual.lookupConfidence,
      calibrationSource: actual.calibrationSource
    };
  }

  function theoreticalPaschen(pd, gas) {
    const x = Math.max(pd, PHYSICS_PD_MIN) * PA_M_TO_TORR_CM;
    const den = Math.log(Math.max(gas.A * x, 1e-6)) - Math.log(Math.log(1 + 1 / gas.g));
    return gas.B * x / Math.max(den, 0.08);
  }

  function airDevicePaschen(pd) {
    const x = Math.max(pd, PHYSICS_PD_MIN);
    return modelPaschen(x, AIR_DEVICE_CURVE.a, AIR_DEVICE_CURVE.b, AIR_DEVICE_CURVE.c);
  }

  function paschen(pd, gas) {
    const x = Math.max(pd, PHYSICS_PD_MIN);
    if (gas === GAS.air) return airDevicePaschen(x);
    return theoreticalPaschen(x, gas);
  }

  function getAmbientCorrection(gasType) {
    const temperatureC = Number.isFinite(state.env.temperatureC) ? state.env.temperatureC : ENV_REFERENCE.temperatureC;
    const humidity = clamp(Number.isFinite(state.env.humidity) ? state.env.humidity : ENV_REFERENCE.humidity, 0, 100);
    const rawDensityFactor = (ENV_REFERENCE.temperatureC + 273.15) / (temperatureC + 273.15);
    const densityFactor = clamp(1 + (rawDensityFactor - 1) * 0.32, 0.965, 1.035);
    const humidityFactor = gasType === 'air'
      ? 1 + clamp((humidity - ENV_REFERENCE.humidity) * 0.00022, -0.008, 0.012)
      : 1;
    return { temperatureC, humidity, densityFactor, humidityFactor };
  }

  function lookupBreakdownVoltage(pressurePa, gapMm, gasType, electrodeType, sourceRows = state.paschenRows) {
    const rows = (sourceRows || [])
      .filter((row) =>
        Number.isFinite(row.p) &&
        Number.isFinite(row.d) &&
        Number.isFinite(row.ub) &&
        row.ub > 0 &&
        (!row.gasType || row.gasType === gasType) &&
        (!row.electrodeType || row.electrodeType === electrodeType)
      );
    if (rows.length < 4) return null;

    const pValues = rows.map((row) => row.p);
    const dValues = rows.map((row) => row.d);
    const pScale = Math.max(Math.max(...pValues) - Math.min(...pValues), pressurePa * 0.35, 400);
    const dScale = Math.max(Math.max(...dValues) - Math.min(...dValues), gapMm * 0.45, 4);
    const ranked = rows
      .map((row) => {
        const dp = (row.p - pressurePa) / pScale;
        const dd = (row.d - gapMm) / dScale;
        const distSq = dp * dp + dd * dd;
        return { row, distSq, weight: 1 / Math.max(distSq, 1e-5) };
      })
      .sort((a, b) => a.distSq - b.distSq)
      .slice(0, Math.min(rows.length, 8));

    let sum = 0;
    let wsum = 0;
    ranked.forEach((item) => {
      sum += item.row.ub * item.weight;
      wsum += item.weight;
    });
    if (wsum <= 0) return null;

    const nearest = Math.sqrt(ranked[0].distSq);
    const countFactor = clamp((ranked.length - 2) / 6, 0, 1);
    const distanceFactor = clamp(1 - nearest / 1.2, 0, 1);
    const confidence = clamp(0.1 + 0.78 * countFactor * distanceFactor, 0, 0.86);
    if (confidence <= 0.01) return null;
    return { ub: sum / wsum, confidence };
  }

  function actualBreakdownVoltage(theoryUb, pd, gasType, electrodeType, pressurePa, gapMm, env) {
    const gasBias = {
      air: 0.003,
      argon: -0.006,
      nitrogen: 0.008,
      helium: -0.012,
    }[gasType] ?? 0.003;
    const geometryBias = {
      parallel: 0.004,
      sphere: 0.012,
      needle: -0.012,
    }[electrodeType] ?? 0.004;
    const regimeBias =
      electrodeType === 'parallel' && pressurePa >= 600 && pressurePa <= 1300 && gapMm >= 20 && gapMm <= 40 ? -0.028 :
      electrodeType === 'parallel' && pressurePa > 1300 && pressurePa <= 7000 && gapMm >= 20 && gapMm <= 40 ? -0.016 :
      electrodeType === 'sphere' && pressurePa >= 200 && pressurePa <= 700 && gapMm >= 35 && gapMm <= 60 ? 0.014 :
      electrodeType === 'sphere' && pressurePa >= 7000 && pressurePa <= 20000 && gapMm >= 30 && gapMm <= 50 ? -0.01 :
      0;
    const pressureBias = clamp((Math.log10(Math.max(pressurePa, 1)) - 3.0) * 0.004, -0.008, 0.01);
    const gapBias = clamp((gapMm - 30) * 0.00012, -0.004, 0.004);
    const ambientBias = gasType === 'air'
      ? clamp((env.densityFactor - 1) * 0.45 + (env.humidityFactor - 1) * 0.12, -0.012, 0.012)
      : 0;
    const ripple = Math.sin(pd * 6.1 + gapMm * 0.09 + pressurePa * 0.0009 + theoryUb * 0.0007) * 0.001;
    const totalBias = clamp(gasBias + geometryBias + regimeBias + pressureBias + gapBias + ambientBias + ripple, -0.05, 0.08);
    const sphereCoronaMultiplier =
      electrodeType === 'sphere' && pressurePa >= 200 && pressurePa <= 700 && gapMm >= 35 && gapMm <= 60
        ? clamp(1.84 + (gapMm - 50) * 0.0032 - (pressurePa - 400) * 0.00016, 1.68, 1.98)
        : 1;
    const modelUb = theoryUb * (1 + totalBias) * sphereCoronaMultiplier;
    const matchingUserRows = (state.paschenRows || []).filter((row) =>
      Number.isFinite(row?.p) &&
      Number.isFinite(row?.d) &&
      Number.isFinite(row?.ub) &&
      row.ub > 0 &&
      (!row.gasType || row.gasType === gasType) &&
      (!row.electrodeType || row.electrodeType === electrodeType)
    );
    const userLookup = matchingUserRows.length >= 6
      ? lookupBreakdownVoltage(pressurePa, gapMm, gasType, electrodeType, matchingUserRows)
      : null;
    if (userLookup && userLookup.confidence >= 0.32) {
      const lookupBias = clamp((userLookup.ub - modelUb) / Math.max(modelUb, 1), -0.06, 0.06);
      const blend = clamp(0.04 + userLookup.confidence * 0.06, 0.04, 0.1);
      const actualUb = modelUb * (1 + lookupBias * blend);
      return {
        ub: actualUb,
        lookupUb: userLookup.ub,
        lookupConfidence: blend,
        calibrationSource: '\u7406\u8bba+\u73af\u5883+\u7528\u6237\u5b9e\u6d4b\u8f7b\u5fae\u8d34\u8fd1'
      };
    }

    const deviceLookup = lookupBreakdownVoltage(pressurePa, gapMm, gasType, electrodeType, DEVICE_BREAKDOWN_ROWS);
    if (!deviceLookup) {
      return { ub: modelUb, lookupUb: null, lookupConfidence: 0, calibrationSource: '\u7406\u8bba\u6a21\u578b+\u73af\u5883\u4e8c\u7ea7\u4fee\u6b63' };
    }
    const lookupBias = clamp((deviceLookup.ub - modelUb) / Math.max(modelUb, 1), -0.08, 0.08);
    const blend = clamp(0.16 + deviceLookup.confidence * 0.14, 0.16, 0.24);
    const actualUb = modelUb * (1 + lookupBias * blend);
    return {
      ub: actualUb,
      lookupUb: deviceLookup.ub,
      lookupConfidence: blend,
      calibrationSource: '\u7406\u8bba+\u73af\u5883+\u88c5\u7f6e\u793a\u4f8b\u6821\u51c6'
    };
  }

  function legacyRenderStats_unused() {
    const r = resolveMode();
    refs.liveStats.innerHTML = '';
    [
      ['\u653e\u7535\u72b6\u6001', state.mode],
      ['\u662f\u5426\u51fb\u7a7f', state.breakdown ? '\u662f' : '\u5426'],
      ['\u7406\u8bba\u51fb\u7a7f', r.ub.toFixed(2) + ' V'],
      ['\u6a21\u62df\u5b9e\u9645\u51fb\u7a7f', r.ubActual.toFixed(2) + ' V'],
      ['pd', r.pd.toFixed(3) + ' Pa*m'],
      ['\u573a\u5f3a', (r.fieldVpm / 1000).toFixed(2) + ' kV/m'],
      ['\u7535\u538b\u6bd4 U/U\u7406', r.ratio.toFixed(2)],
      ['\u7535\u538b\u6bd4 U/U\u5b9e', r.ratioActual.toFixed(2)],
      ['\u4f30\u7b97\u7535\u6d41', r.currentMa.toFixed(2) + ' mA'],
      ['\u4f30\u7b97\u529f\u7387', r.powerW.toFixed(2) + ' W'],
    ].forEach(([k, v]) => {
      const d = document.createElement('div');
      d.className = 'stat';
      d.innerHTML = "<div class='k'>" + k + "</div><div class='v'>" + v + '</div>';
      refs.liveStats.appendChild(d);
    });
    if (refs.dataExplain) {
      refs.dataExplain.textContent =
        '数据说明：理论击穿电压先由 pd = p*d 计算，再代入当前气体的帕邢模型；模拟实际击穿电压在理论值基础上叠加了气体种类、电极形状、压强和极距带来的小幅校正，因此会与理论值略有差别。电晕按“小曲率电极、强非均匀局部场、高电压但未形成整间隙贯通、并且限流小电流”的条件判定；辉光、火花、弧光都要求先击穿。';
    }
  }
  function renderStats() {
    const r = resolveMode();
    syncProbePowerLinkedValues(r);
    state.probeCurrentUa = estimateProbeCurrentUa(r, state.probeVoltageV);
    syncProbePowerAfterMeasurement();
    syncProbeCurrentDisplay();
    refs.liveStats.innerHTML = '';
    [
      ['IP\u5730\u5740', state.env.ipAddress || '--'],
      ['\u73af\u5883\u6e29\u5ea6', r.temperatureC.toFixed(1) + ' \u00b0C'],
      ['\u73af\u5883\u6e7f\u5ea6', r.humidity.toFixed(1) + ' %RH'],
      ['\u5b9e\u9645\u51fb\u7a7f\u7535\u538b', r.ubActual.toFixed(2) + ' V'],
    ].forEach(([k, v]) => {
      const d = document.createElement('div');
      d.className = 'stat';
      d.innerHTML = "<div class='k'>" + k + "</div><div class='v'>" + v + '</div>';
      refs.liveStats.appendChild(d);
    });
    if (refs.dataExplain) {
      refs.dataExplain.textContent = '';
    }
    renderMainPowerSwitch();
    renderInstrumentDisplays();
  }

  function syncProbeCurrentDisplay() {
    const text = `${state.probeCurrentUa >= 0 ? '' : '-'}${Math.abs(state.probeCurrentUa).toFixed(2)}`;
    if (refs.probeCurrentMeasured) refs.probeCurrentMeasured.value = text;
    const out = id('probeCurrentOut');
    if (out) out.textContent = `${state.probeCurrentUa.toFixed(2)} uA`;
  }

  function sampleLangmuirCurrentUa(voltageV, isatUa) {
    const absIsat = Math.max(Math.abs(isatUa), 1);
    const zeroBias = LANGMUIR_REF.zeroBiasUa * (absIsat / LANGMUIR_REF.refIsatUa);
    const core = absIsat * LANGMUIR_REF.coreGain * Math.tanh(voltageV / (2 * LANGMUIR_REF.teEv));
    const positive = voltageV > 0
      ? LANGMUIR_REF.posSlope * voltageV + absIsat * LANGMUIR_REF.posSheath * (1 - Math.exp(-voltageV / LANGMUIR_REF.posTauV))
      : 0;
    const negative = voltageV < 0
      ? LANGMUIR_REF.negSlope * voltageV - absIsat * LANGMUIR_REF.negSheath * (1 - Math.exp(voltageV / LANGMUIR_REF.negTauV))
      : 0;
    const ripple = Math.sin(voltageV * 0.11) * absIsat * 0.002 * Math.exp(-Math.abs(voltageV) / 160);
    return zeroBias + core + positive + negative + ripple;
  }

  function estimateProbeCurrentUa(modeInfo, probeVoltageV) {
    if (!state.running || (!modeInfo.breakdown && modeInfo.mode !== MODE_CORONA)) return 0;
    const isatRef = Math.max(readLooseNumber(id('langIsat')?.value, LANGMUIR_REF.refIsatUa), 0.5);
    const pressureFactor = clamp(Math.sqrt(Math.max(state.pressurePa, 1) / 900), 0.45, 3.2);
    const currentFactor = clamp(0.35 + modeInfo.currentMa * 0.22, 0.2, 4.5);
    const modeFactor =
      modeInfo.mode === MODE_CORONA ? 0.28 :
      modeInfo.mode === MODE_GLOW ? 1 :
      modeInfo.mode === MODE_ARC ? 1.35 :
      modeInfo.mode === MODE_SPARK ? 0.72 : 0.18;
    const effectiveIsat = isatRef * pressureFactor * currentFactor * modeFactor;
    return sampleLangmuirCurrentUa(probeVoltageV, effectiveIsat);
  }

  function animate(ms = 0) {
    const t = ms * 0.001;
    eng.controls.update();
    updateVisual(t);
    updateSceneReadoutOverlays();
    eng.renderer.render(eng.scene, eng.camera);
    updateDischargeZoomView();
    requestAnimationFrame(animate);
  }

  function resizeRenderer() {
    if (!eng.ok) return;
    const w = refs.canvas.clientWidth || refs.canvas.parentElement.clientWidth || 800;
    const h = refs.canvas.clientHeight || refs.canvas.parentElement.clientHeight || 500;
    eng.renderer.setSize(w, h, false);
    eng.camera.aspect = w / h;
    eng.camera.updateProjectionMatrix();
  }

  function startFallback2D() {
    const c = refs.canvas;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    function loop() {
      const w = c.width = c.clientWidth;
      const h = c.height = c.clientHeight;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#051a3b';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#6d92ff';
      ctx.lineWidth = 2;
      rr(ctx, w * 0.2, h * 0.25, w * 0.6, h * 0.5, 18);
      ctx.stroke();
      ctx.strokeStyle = '#9bc0ff';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(w * 0.38, h * 0.35);
      ctx.lineTo(w * 0.38, h * 0.65);
      ctx.moveTo(w * 0.62, h * 0.35);
      ctx.lineTo(w * 0.62, h * 0.65);
      ctx.stroke();

      const m = resolveMode().mode;
      const MODE_IDLE = '\u5f85\u673a';
      const MODE_NO = '\u672a\u51fb\u7a7f';
      const MODE_ARC = '\u5f27\u5149\u653e\u7535';

      if (state.running && m !== MODE_NO && m !== MODE_IDLE) {
        ctx.strokeStyle = m === MODE_ARC ? '#ffffff' : '#ff63de';
        ctx.shadowColor = '#ff63de';
        ctx.shadowBlur = m === MODE_ARC ? 32 : 18;
        ctx.lineWidth = m === MODE_ARC ? 12 : 8;
        ctx.beginPath();
        ctx.moveTo(w * 0.4, h * 0.5);
        ctx.lineTo(w * 0.6, h * 0.5);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = '#cde0ff';
      ctx.font = '600 24px Sora';
      ctx.fillText(`\u540e\u5907\u6a21\u5f0f: ${m}`, 20, 36);
      requestAnimationFrame(loop);
    }

    loop();
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function radial(inner, outer) {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 64);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new eng.T.CanvasTexture(c);
  }

  function legacySetupPaschen_unused() {
    const tbody = document.querySelector('#paschenTable tbody');
    id('addPaschenRowBtn').addEventListener('click', addRow);
    id('analyzePaschenBtn').addEventListener('click', analyzePaschen);
    id('exportPaschenCsvBtn').addEventListener('click', exportPaschenCsv);
    id('exportPaschenPngBtn').addEventListener('click', () => downloadCanvas('paschenCanvas', 'paschen_curve.png'));
    for (let i = 0; i < 10; i++) addRow();

    function addRow() {
      const live = resolveMode();
      const row = { p: state.pressurePa, d: state.gapMm, ub: Number(live.ubActual.toFixed(2)) };
      state.paschenRows.push(row);
      const tr = document.createElement('tr');
      tr.innerHTML =
        "<td>" + state.paschenRows.length + '</td>' +
        "<td><input type='number' step='any' value='" + row.p + "' data-k='p' /></td>" +
        "<td><input type='number' step='any' value='" + row.d + "' data-k='d' /></td>" +
        "<td class='pd-cell'>" + (row.p * row.d / 1000).toFixed(3) + '</td>' +
        "<td><input type='number' step='any' value='" + row.ub + "' data-k='ub' /></td>" +
        "<td><button class='del-row'>\u5220\u9664</button></td>";

      tbody.appendChild(tr);
      const syncRow = (inp) => {
        const raw = inp.value.trim();
        row[inp.dataset.k] = raw === '' || raw === '-' || raw === '.' || raw === '-.' ? NaN : Number(raw);
        tr.querySelector('.pd-cell').textContent =
          Number.isFinite(row.p) && Number.isFinite(row.d)
            ? (row.p * row.d / 1000).toFixed(3)
            : '';
      };
      tr.querySelectorAll('input').forEach((inp) => {
        inp.addEventListener('input', () => syncRow(inp));
        inp.addEventListener('change', () => syncRow(inp));
      });

      tr.querySelector('.del-row').addEventListener('click', () => {
        const i = Array.from(tbody.children).indexOf(tr);
        state.paschenRows.splice(i, 1);
        tr.remove();
        Array.from(tbody.children).forEach((r, idx) => {
          r.firstElementChild.textContent = String(idx + 1);
        });
      });
    }
  }

  function analyzePaschen() {
    syncPaschenRowsFromTable();
    const analysis = collectPaschenAnalysisData();
    const canvas = id('paschenCanvas');
    const summary = id('paschenSummary');

    if (!analysis.points.length) {
      summary.textContent = '\u672a\u8bc6\u522b\u5230\u6709\u6548\u7684 p\u3001d\u3001Ub \u6570\u636e\u3002\u8bf7\u68c0\u67e5\u662f\u5426\u5b58\u5728\u7a7a\u503c\u3001\u8d1f\u503c\u6216\u975e\u6570\u5b57\u8f93\u5165\u3002';
      drawPlaceholderChart(canvas, '\u5e15\u90a2\u66f2\u7ebf Ub - pd', '\u8bf7\u5148\u586b\u5165\u6709\u6548\u7684 p\u3001d\u3001Ub \u6570\u636e');
      return;
    }

    const points = analysis.points.map((p) => ({ x: p.x, y: p.y }));
    const invalidTail = analysis.invalidRows.length
      ? ` \u672a\u8ba1\u5165\u7684\u884c: ${analysis.invalidRows.join('\u3001')}\u3002`
      : '';

    if (points.length < 4) {
      drawChart(canvas, {
        title: '\u5e15\u90a2\u66f2\u7ebf Ub - pd',
        xLabel: 'pd (Pa*m)',
        yLabel: 'Ub (V)',
        points,
        line: [],
        pointColor: '#ffffff',
        lineColor: '#ff7db9',
      });
      summary.textContent =
        `\u5f53\u524d\u8bc6\u522b\u5230 ${points.length} \u7ec4\u6709\u6548\u6570\u636e\uff0c\u5df2\u5148\u7ed8\u5236\u6563\u70b9\u9884\u89c8\u3002` +
        ' \u81f3\u5c11 4 \u7ec4\u6570\u636e\u624d\u80fd\u8fdb\u884c\u5e15\u90a2\u66f2\u7ebf\u62df\u5408\uff0c\u63a8\u8350\u4e0d\u5c11\u4e8e 10 \u7ec4\u3002' +
        invalidTail;
      return;
    }

    const fit = fitPaschen(points);
    drawChart(canvas, {
      title: '\u5e15\u90a2\u66f2\u7ebf Ub - pd',
      xLabel: 'pd (Pa*m)',
      yLabel: 'Ub (V)',
      points,
      line: fit.curve,
      pointColor: '#ffffff',
      lineColor: '#ff7db9',
      infoBox: [
        ['Model', 'Paschen (fit)'],
        ['Equation', 'Ub=B(pd+c)/ln(a(pd+c))'],
        ['a', fit.a.toFixed(5)],
        ['B', fit.b.toFixed(5)],
        ['c', fit.c.toFixed(5)],
        ['R\u00b2', fit.r2.toFixed(5)],
        ['Adj. R\u00b2', fit.adjR2.toFixed(5)],
      ],
    });

    summary.textContent =
      `\u5df2\u8bc6\u522b ${points.length} \u7ec4\u6709\u6548\u6570\u636e\u3002` +
      (points.length < 10 ? ' \u5c11\u4e8e\u63a8\u8350\u7684 10 \u7ec4\uff0c\u62df\u5408\u7ed3\u679c\u4ec5\u4f9b\u9884\u89c8\u3002' : '') +
      invalidTail +
      ' \u62df\u5408: Ub = B*(pd+c)/ln(a*(pd+c)); a=' + fit.a.toFixed(4) +
      ', B=' + fit.b.toFixed(2) +
      ', c=' + fit.c.toFixed(4) +
      ', R\u00b2=' + fit.r2.toFixed(4) +
      ', Adj.R\u00b2=' + fit.adjR2.toFixed(4) +
      ', RMSE=' + fit.rmse.toFixed(2) + ' V';
  }
  function fitPaschen(points) {
    const xValues = points.map((p) => p.x);
    const yValues = points.map((p) => p.y);
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const weights = xValues.map((x) => paschenWeight(x));
    const cUpper = clamp(Math.max(1.2, xMax * 0.45, xMin * 40), 0.25, 8);
    const aUpper = xMin < 0.2 ? 12 : 8;
    let best = null;

    const testCandidate = (a, c) => {
      const xs = points.map((p) => {
        const inner = a * (p.x + c);
        const v = Math.log(inner);
        return inner > 1.0005 && v > 0.03 ? (p.x + c) / v : null;
      });
      if (xs.some((x) => x == null)) return;
      const b = lsScaleWeighted(xs, yValues, weights);
      if (!Number.isFinite(b) || b <= 0) return;
      let err = 0;
      for (let i = 0; i < xs.length; i++) {
        const residual = b * xs[i] - yValues[i];
        err += residual * residual * weights[i];
      }
      if (!best || err < best.err) best = { a, b, c, err };
    };

    const globalCStep = Math.max(0.02, cUpper / 120);
    for (let a = 1.02; a <= aUpper; a += 0.08) {
      for (let c = 0; c <= cUpper; c += globalCStep) {
        testCandidate(a, c);
      }
    }

    if (best) {
      for (let a = Math.max(1.001, best.a - 0.45); a <= best.a + 0.45; a += 0.01) {
        for (let c = Math.max(0, best.c - 0.45); c <= best.c + 0.45; c += 0.005) {
          testCandidate(a, c);
        }
      }
      for (let a = Math.max(1.0005, best.a - 0.08); a <= best.a + 0.08; a += 0.002) {
        for (let c = Math.max(0, best.c - 0.08); c <= best.c + 0.08; c += 0.0015) {
          testCandidate(a, c);
        }
      }
    }

    if (!best) {
      const fallbackX = points.map((p) => {
        const v = Math.log(AIR_DEVICE_CURVE.a * (p.x + AIR_DEVICE_CURVE.c));
        return (p.x + AIR_DEVICE_CURVE.c) / Math.max(v, 0.1);
      });
      best = {
        a: AIR_DEVICE_CURVE.a,
        c: AIR_DEVICE_CURVE.c,
        b: lsScaleWeighted(fallbackX, yValues, weights),
        err: Infinity,
      };
    }

    const yAvg = points.reduce((s, p) => s + p.y, 0) / points.length;
    let ssr = 0, sst = 0;
    points.forEach((p) => {
      const y = modelPaschen(p.x, best.a, best.b, best.c);
      ssr += (p.y - y) ** 2;
      sst += (p.y - yAvg) ** 2;
    });
    const curve = [];
    const curveMin = Math.max(0, xMin * 0.92);
    const curveMax = xMax * 1.03;
    for (let i = 0; i < 160; i++) {
      const x = curveMin + ((curveMax - curveMin) * i) / 159;
      curve.push({ x, y: modelPaschen(x, best.a, best.b, best.c) });
    }
    const r2 = 1 - ssr / Math.max(sst, 1e-6);
    const adjR2 = calcAdjustedRSquared(r2, points.length, 3);
    const rmse = Math.sqrt(ssr / Math.max(points.length, 1));
    return { ...best, r2, adjR2, rmse, curve };
  }

  function modelPaschen(x, a, b, c) {
    return (b * (x + c)) / Math.max(Math.log(a * (x + c)), 0.1);
  }

  function lsScale(xs, ys) {
    let up = 0, down = 0;
    for (let i = 0; i < xs.length; i++) {
      up += xs[i] * ys[i];
      down += xs[i] * xs[i];
    }
    return up / Math.max(down, 1e-12);
  }

  function lsScaleWeighted(xs, ys, ws) {
    let up = 0, down = 0;
    for (let i = 0; i < xs.length; i++) {
      const w = Number.isFinite(ws?.[i]) ? ws[i] : 1;
      up += xs[i] * ys[i] * w;
      down += xs[i] * xs[i] * w;
    }
    return up / Math.max(down, 1e-12);
  }

  function paschenWeight(x) {
    return clamp(1.65 - Math.log10(Math.max(x, 0.02)) * 0.45, 0.55, 2.2);
  }

  function legacyExportPaschenCsv_unused() {
    const lines = ['index,p_pa,d_mm,pd_pa_m,ub_v'];
    state.paschenRows.forEach((r, i) => lines.push(`${i + 1},${r.p},${r.d},${(r.p * r.d / 1000).toFixed(6)},${r.ub}`));
    downloadText('paschen_data.csv', lines.join('\n'));
  }

  function setupPaschen() {
    const tbody = document.querySelector('#paschenTable tbody');
    id('addPaschenRowBtn').addEventListener('click', () => addRow(true));
    id('analyzePaschenBtn').addEventListener('click', analyzePaschen);
    id('exportPaschenCsvBtn').addEventListener('click', exportPaschenCsv);
    id('exportPaschenPngBtn').addEventListener('click', () => downloadCanvas('paschenCanvas', 'paschen_curve.png'));
    for (let i = 0; i < 10; i++) addRow(false);

    function addRow(seedLive = false) {
      const live = seedLive ? resolveMode() : null;
      const row = {
        p: seedLive ? state.pressurePa : NaN,
        d: seedLive ? state.gapMm : NaN,
        ub: seedLive ? Number(live.ubActual.toFixed(2)) : NaN,
        gasType: state.gasType,
        electrodeType: state.electrodeType,
        temperatureC: state.env.temperatureC,
        humidity: state.env.humidity
      };
      state.paschenRows.push(row);
      const show = (value) => Number.isFinite(value) ? String(value) : '';
      const tr = document.createElement('tr');
      tr.innerHTML =
        "<td>" + state.paschenRows.length + '</td>' +
        "<td><input type='number' step='any' value='" + show(row.p) + "' data-k='p' /></td>" +
        "<td><input type='number' step='any' value='" + show(row.d) + "' data-k='d' /></td>" +
        "<td class='pd-cell'>" + (Number.isFinite(row.p) && Number.isFinite(row.d) ? (row.p * row.d / 1000).toFixed(3) : '') + '</td>' +
        "<td><input type='number' step='any' value='" + show(row.ub) + "' data-k='ub' /></td>" +
        "<td><button class='del-row'>\u5220\u9664</button></td>";
      tbody.appendChild(tr);

      const syncRow = (inp) => {
        const raw = inp.value.trim();
        row[inp.dataset.k] = raw === '' || raw === '-' || raw === '.' || raw === '-.' ? NaN : Number(raw);
        row.gasType = state.gasType;
        row.electrodeType = state.electrodeType;
        row.temperatureC = state.env.temperatureC;
        row.humidity = state.env.humidity;
        tr.querySelector('.pd-cell').textContent =
          Number.isFinite(row.p) && Number.isFinite(row.d)
            ? (row.p * row.d / 1000).toFixed(3)
            : '';
      };
      tr.querySelectorAll('input').forEach((inp) => {
        inp.addEventListener('input', () => syncRow(inp));
        inp.addEventListener('change', () => syncRow(inp));
      });
      tr.querySelector('.del-row').addEventListener('click', () => {
        const i = Array.from(tbody.children).indexOf(tr);
        state.paschenRows.splice(i, 1);
        tr.remove();
        Array.from(tbody.children).forEach((r, idx) => {
          r.firstElementChild.textContent = String(idx + 1);
        });
      });
    }
  }

  function syncPaschenRowsFromTable() {
    const tbody = document.querySelector('#paschenTable tbody');
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll('tr'));
    state.paschenRows = rows.map((tr) => {
      const read = (key) => {
        const input = tr.querySelector(`input[data-k='${key}']`);
        const raw = String(input?.value ?? '').trim();
        return raw === '' || raw === '-' || raw === '.' || raw === '-.' ? NaN : Number(raw);
      };
      return {
        p: read('p'),
        d: read('d'),
        ub: read('ub'),
        gasType: state.gasType,
        electrodeType: state.electrodeType,
        temperatureC: state.env.temperatureC,
        humidity: state.env.humidity,
      };
    });
  }

  function collectPaschenAnalysisData() {
    const points = [];
    const invalidRows = [];

    state.paschenRows.forEach((row, index) => {
      const p = Number(row.p);
      const d = Number(row.d);
      const ub = Number(row.ub);
      const pd = p * d / 1000;
      if (Number.isFinite(p) && Number.isFinite(d) && Number.isFinite(ub) && pd > 0 && ub > 0) {
        points.push({ x: pd, y: ub, row: index + 1 });
      } else {
        invalidRows.push(index + 1);
      }
    });

    return { points, invalidRows };
  }

  function drawPlaceholderChart(canvas, title, message) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#091224';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#dce9ff';
    ctx.font = '700 22px Sora';
    ctx.fillText(title, 70, 30);
    ctx.font = '500 16px IBM Plex Sans';
    ctx.fillStyle = 'rgba(220,233,255,0.78)';
    ctx.fillText(message, 70, canvas.height / 2);
  }

  function exportPaschenCsv() {
    syncPaschenRowsFromTable();
    const lines = ['index,gas,electrode,temp_c,humidity_pct,p_pa,d_mm,pd_pa_m,ub_v'];
    state.paschenRows.forEach((r, i) => lines.push(
      `${i + 1},${r.gasType || ''},${r.electrodeType || ''},${r.temperatureC ?? ''},${r.humidity ?? ''},${r.p},${r.d},${Number.isFinite(r.p) && Number.isFinite(r.d) ? (r.p * r.d / 1000).toFixed(6) : ''},${r.ub}`
    ));
    downloadText('paschen_data.csv', lines.join('\n'));
  }

  function setupLangmuir() {
    id('runLangmuirBtn').addEventListener('click', runLangmuir);
    id('exportLangmuirCsvBtn').addEventListener('click', exportLangmuirCsv);
    id('exportLangmuirPngBtn').addEventListener('click', () => downloadCanvas('langmuirCanvas', 'langmuir_iv.png'));
  }

  function runLangmuir() {
    const umin = readLooseNumber(id('langUmin').value, -100);
    const umax = readLooseNumber(id('langUmax').value, 100);
    const n = Math.max(20, Math.round(readLooseNumber(id('langN').value, 48)));
    const isat = readLooseNumber(id('langIsat').value, LANGMUIR_REF.refIsatUa);
    const area = Math.max(0.0001, readLooseNumber(id('langArea').value, LANGMUIR_REF.probeAreaCm2));

    state.langmuirData = genLangmuir(umin, umax, n, isat);
    const effectiveSatUa = Math.max(Math.abs(isat) * LANGMUIR_REF.coreGain, 0.5);
    const te = calcTe(state.langmuirData, effectiveSatUa);
    const ne = calcNe(effectiveSatUa, area, te);
    const teK = te * 11604;
    const fit = fitLangmuirTanh(state.langmuirData, effectiveSatUa, area, te, ne);
    state.langmuirFit = fit;

    drawChart(id('langmuirCanvas'), {
      title: '\u6717\u7f2a\u5c14\u53cc\u63a2\u9488 I-V \u66f2\u7ebf',
      xLabel: 'U (V)',
      yLabel: 'I (uA)',
      points: state.langmuirData,
      line: fit.line,
      pointColor: '#ffffff',
      lineColor: '#ff97bc',
      infoBox: [
        ['Model', 'Double probe fit'],
        ['Equation', `I = ${fit.isatUa.toFixed(2)} μA·tanh(${fit.alphaPerV.toFixed(4)}U)`],
        ['Is', `${fit.isatUa.toFixed(2)} μA`],
        ['α', `${fit.alphaPerV.toFixed(4)} V⁻¹`],
        ['Te', `${fit.teEv.toFixed(2)} eV / ${fit.teK.toExponential(3)} K`],
        ['ne', `${fit.ne.toExponential(3)} m⁻³`],
        ['R²', fit.r2.toFixed(5)],
        ['Adj. R²', fit.adjR2.toFixed(5)],
      ],
    });

    id('langmuirSummary').textContent =
      '\u7535\u5b50\u6e29\u5ea6 Te \u2248 ' + te.toFixed(2) +
      ' eV (' + teK.toExponential(4) + ' K)\uff1b\u7535\u5b50\u5bc6\u5ea6 ne \u2248 ' + ne.toExponential(4) +
      ' m\u207b\u00b3\uff1b\u62df\u5408 I = ' + fit.isatUa.toFixed(2) + ' \u03bcA \u00d7 tanh(' + fit.alphaPerV.toFixed(4) + ' V\u207b\u00b9 \u00d7 U)\uff0cR\u00b2 = ' + fit.r2.toFixed(5);
  }
  function genLangmuir(umin, umax, n, isat) {
    const arr = [];
    for (let i = 0; i < n; i++) {
      const u = sampleLangmuirVoltage(umin, umax, i, n);
      arr.push({ x: u, y: sampleLangmuirCurrentUa(u, isat) });
    }
    return arr;
  }

  function sampleLangmuirVoltage(umin, umax, index, count) {
    if (count <= 1) return umin;
    const t = index / (count - 1);
    if (!(umin < 0 && umax > 0)) {
      return umin + (umax - umin) * t;
    }
    // Concentrate samples near 0 V so the central tanh region is denser.
    const gamma = 1.75;
    const s = t * 2 - 1;
    if (Math.abs(s) < 1e-9) return 0;
    return s < 0
      ? -Math.abs(umin) * Math.pow(-s, gamma)
      : umax * Math.pow(s, gamma);
  }

  function calcTe(data, isat) {
    const zone = data.filter((p) => Math.abs(p.x) <= 20 && Math.abs(p.y) < Math.abs(isat) * 0.9);
    const xs = [], ys = [];
    zone.forEach((p) => {
      const r = clamp(p.y / isat, -0.999, 0.999);
      xs.push(p.x);
      ys.push(0.5 * Math.log((1 + r) / (1 - r)));
    });
    const slope = linSlope(xs, ys);
    return clamp(1 / Math.max(2 * Math.abs(slope), 0.01), 0.2, 80);
  }

  function linSlope(xs, ys) {
    const n = Math.min(xs.length, ys.length);
    if (n < 2) return 0.03;
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (let i = 0; i < n; i++) {
      sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i];
    }
    return (n * sxy - sx * sy) / Math.max(n * sxx - sx * sx, 1e-9);
  }

  function calcNe(isatUa, areaCm2, teEv) {
    const e = 1.602e-19;
    const k = 1.380649e-23;
    const mi = LANGMUIR_REF.ionMassKg;
    const a = areaCm2 * 1e-4;
    const teK = teEv * 11604;
    const iA = Math.abs(isatUa) * 1e-6;
    const thermal = Math.sqrt((k * teK) / (2 * Math.PI * mi));
    return (4 * iA) / Math.max(a * e * thermal, 1e-40);
  }

  function fitLangmuirTanh(data, fallbackIsatUa, areaCm2, fallbackTeEv, fallbackNe) {
    const satTail = data
      .filter((p) => Math.abs(p.x) >= 0.55 * Math.max(...data.map((d) => Math.abs(d.x))))
      .map((p) => Math.abs(p.y))
      .sort((a, b) => b - a);
    const tailTake = satTail.slice(0, Math.max(4, Math.min(10, satTail.length)));
    const isatUa = clamp(
      tailTake.length ? tailTake.reduce((s, v) => s + v, 0) / tailTake.length : fallbackIsatUa,
      0.5,
      Math.max(fallbackIsatUa * 1.8, 8)
    );

    const zone = data.filter((p) => Math.abs(p.x) <= 20 && Math.abs(p.y) < Math.abs(isatUa) * 0.92);
    const xs = [];
    const ys = [];
    zone.forEach((p) => {
      const r = clamp(p.y / isatUa, -0.999, 0.999);
      xs.push(p.x);
      ys.push(0.5 * Math.log((1 + r) / (1 - r)));
    });
    const alphaPerV = Math.max(Math.abs(linSlope(xs, ys)), 1e-3);
    const teEv = clamp(1 / Math.max(2 * alphaPerV, 0.01), 0.2, 80);
    const ne = calcNe(isatUa, areaCm2, teEv);
    const line = data.map((p) => ({ x: p.x, y: isatUa * Math.tanh(alphaPerV * p.x) }));
    const r2 = calcRSquared(data, line);
    const adjR2 = calcAdjustedRSquared(r2, data.length, 2);
    return {
      isatUa,
      alphaPerV,
      teEv: Number.isFinite(teEv) ? teEv : fallbackTeEv,
      teK: (Number.isFinite(teEv) ? teEv : fallbackTeEv) * 11604,
      ne: Number.isFinite(ne) ? ne : fallbackNe,
      r2,
      adjR2,
      line,
    };
  }

  function calcRSquared(points, fitLine) {
    const fitted = new Map(fitLine.map((p) => [p.x, p.y]));
    const ys = points.map((p) => p.y);
    const yMean = ys.reduce((s, v) => s + v, 0) / Math.max(ys.length, 1);
    let ssRes = 0;
    let ssTot = 0;
    points.forEach((p) => {
      const fitY = fitted.has(p.x) ? fitted.get(p.x) : p.y;
      ssRes += (p.y - fitY) ** 2;
      ssTot += (p.y - yMean) ** 2;
    });
    if (ssTot <= 1e-12) return 1;
    return clamp(1 - ssRes / ssTot, -1, 1);
  }

  function calcAdjustedRSquared(r2, n, k) {
    if (n <= k + 1) return r2;
    return 1 - (1 - r2) * ((n - 1) / Math.max(n - k - 1, 1));
  }

  function exportLangmuirCsv() {
    if (!state.langmuirData.length) {
      alert('\u8bf7\u5148\u751f\u6210 I-V \u6570\u636e');
      return;
    }

    const lines = ['index,voltage_v,current_ua'];
    state.langmuirData.forEach((p, i) => lines.push(`${i + 1},${p.x.toFixed(6)},${p.y.toFixed(6)}`));
    downloadText('langmuir_iv.csv', lines.join('\n'));
  }
  function drawChart(canvas, opt) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const p = { l: 70, r: 24, t: 45, b: 58 };
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#091224';
    ctx.fillRect(0, 0, w, h);

    const all = opt.line?.length ? opt.points.concat(opt.line) : opt.points;
    const xMin = Math.min(...all.map((x) => x.x));
    const xMax = Math.max(...all.map((x) => x.x));
    const yMin = Math.min(...all.map((x) => x.y));
    const yMax = Math.max(...all.map((x) => x.y));
    const sx = (x) => p.l + ((x - xMin) / (xMax - xMin || 1)) * (w - p.l - p.r);
    const sy = (y) => h - p.b - ((y - yMin) / (yMax - yMin || 1)) * (h - p.t - p.b);

    ctx.strokeStyle = 'rgba(164,196,255,0.25)';
    for (let i = 0; i <= 6; i++) {
      const x = p.l + ((w - p.l - p.r) * i) / 6;
      const y = p.t + ((h - p.t - p.b) * i) / 6;
      ctx.beginPath(); ctx.moveTo(x, p.t); ctx.lineTo(x, h - p.b); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p.l, y); ctx.lineTo(w - p.r, y); ctx.stroke();
    }

    ctx.strokeStyle = '#a5c9ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p.l, p.t); ctx.lineTo(p.l, h - p.b); ctx.lineTo(w - p.r, h - p.b); ctx.stroke();

    if (opt.line?.length) {
      ctx.strokeStyle = opt.lineColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      opt.line.forEach((pp, i) => i ? ctx.lineTo(sx(pp.x), sy(pp.y)) : ctx.moveTo(sx(pp.x), sy(pp.y)));
      ctx.stroke();
    }

    ctx.fillStyle = opt.pointColor;
    opt.points.forEach((pp) => {
      ctx.beginPath(); ctx.arc(sx(pp.x), sy(pp.y), 3.2, 0, Math.PI * 2); ctx.fill();
    });

    ctx.fillStyle = '#dce9ff';
    ctx.font = '700 22px Sora';
    ctx.fillText(opt.title, p.l, 30);
    ctx.font = '500 15px IBM Plex Sans';
    ctx.fillText(opt.xLabel, w / 2 - 40, h - 16);
    ctx.save();
    ctx.translate(22, h / 2 + 30);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(opt.yLabel, 0, 0);
    ctx.restore();

    ctx.font = '500 12px IBM Plex Sans';
    for (let i = 0; i <= 6; i++) {
      const xv = xMin + ((xMax - xMin) * i) / 6;
      const yv = yMax - ((yMax - yMin) * i) / 6;
      ctx.fillText(xv.toFixed(2), p.l + ((w - p.l - p.r) * i) / 6 - 14, h - p.b + 18);
      ctx.fillText(yv.toFixed(1), 8, p.t + ((h - p.t - p.b) * i) / 6 + 4);
    }

    if (Array.isArray(opt.infoBox) && opt.infoBox.length) {
      drawInfoBox(ctx, {
        x: p.l + 42,
        y: p.t + 18,
        width: Math.min(320, w - p.l - p.r - 64),
        rows: opt.infoBox,
      });
    }
  }

  function drawInfoBox(ctx, opt) {
    const rowHeight = 20;
    const titleHeight = 24;
    const pad = 12;
    const width = opt.width;
    const height = titleHeight + pad * 2 + opt.rows.length * rowHeight;
    roundedRectPath(ctx, opt.x, opt.y, width, height, 10);
    ctx.fillStyle = 'rgba(245, 248, 255, 0.88)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(110, 140, 180, 0.55)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#1f2b3f';
    ctx.font = '700 13px IBM Plex Sans';
    ctx.fillText('拟合参数', opt.x + pad, opt.y + 18);

    ctx.font = '500 12px IBM Plex Sans';
    opt.rows.forEach((row, idx) => {
      const y = opt.y + titleHeight + pad + idx * rowHeight;
      ctx.fillStyle = '#44536f';
      ctx.fillText(row[0], opt.x + pad, y);
      ctx.fillStyle = '#1f2b3f';
      ctx.fillText(row[1], opt.x + width * 0.42, y);
    });
  }

  function roundedRectPath(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function downloadText(name, text) {
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    downloadURL(url, name);
    URL.revokeObjectURL(url);
  }

  function downloadCanvas(canvasId, name) {
    downloadURL(id(canvasId).toDataURL('image/png'), name);
  }

  function downloadURL(url, name) {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
  }

  function id(x) { return document.getElementById(x); }
  function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }
  function roundUpDecimals(v, digits = 2) {
    const factor = 10 ** digits;
    return Math.ceil((Number(v) - 1e-12) * factor) / factor;
  }
  function modelGapMm(rawGapMm) {
    return Math.max(Math.abs(Number(rawGapMm) || 0) + GAP_ZERO_OFFSET_MM, 0);
  }
  function sphereVisualMinGapMm() {
    if (!eng.gapRig || !eng.dischargeFrame) return 26;
    const frame = eng.dischargeFrame;
    const direction = frame.frontB.clone().sub(frame.frontA);
    if (direction.lengthSq() < 1e-8) return 26;
    direction.normalize();

    const averagePlateSpan =
      ((Math.max(frame.leftSize?.y || 0, frame.leftSize?.z || 0) || 0.26) +
       (Math.max(frame.rightSize?.y || 0, frame.rightSize?.z || 0) || 0.26)) / 2;
    const worldPerMm = Math.max(eng.gapRig.scale || 0.01, 1e-4);
    const pair = eng.electrodeLibrary?.sphere || {
      left: createFallbackSphereTemplate(),
      right: createFallbackSphereTemplate(),
    };
    const left = estimateSphereContactMetric('left', pair.left, frame, direction, averagePlateSpan);
    const right = estimateSphereContactMetric('right', pair.right, frame, direction, averagePlateSpan);

    if (left && right) {
      const minGapWorld =
        left.protrusion +
        right.protrusion +
        left.radius +
        right.radius -
        worldPerMm * (SPHERE_ZERO_CONTACT_TRIM_CM * 10);
      return Math.max(modelGapMm(0), minGapWorld / worldPerMm);
    }

    const sphereDiameterWorld = clamp(averagePlateSpan * 0.46, 0.1, 0.24);
    return Math.max(modelGapMm(0), sphereDiameterWorld / worldPerMm);
  }
  function visualGapMm(rawGapMm, electrodeType = state.electrodeType) {
    const base = modelGapMm(rawGapMm);
    if (electrodeType !== 'sphere') return base;
    return base + SPHERE_VISUAL_ZERO_OFFSET_CM;
  }
  function readLooseNumber(raw, fallback) {
    const text = String(raw ?? '').trim();
    if (text === '' || text === '-' || text === '.' || text === '-.') return fallback;
    const value = Number(text);
    return Number.isFinite(value) ? value : fallback;
  }
})();
