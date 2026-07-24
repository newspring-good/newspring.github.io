"use strict";

/* ---------------------------------------------------------------------
 * 직렬/병렬 회로 전자 이동 시각화
 * 저항과 다이오드가 포함된 회로에서, 직렬 연결은 하나의 경로만 있어
 * 한 곳이 막히면 전체 전류가 멈추고, 병렬 연결은 가지(branch)마다
 * 독립적으로 전류가 흐른다는 점을 애니메이션으로 보여주는 근사 모델.
 * ------------------------------------------------------------------- */

const svg = document.getElementById("circuit-svg");
const staticLayer = document.getElementById("static-layer");
const electronsLayer = document.getElementById("electrons-layer");

const BAT_X = 100, TOP_Y = 80, BOT_Y = 320;
const SERIES_RIGHT_X = 500;
const PAR_B1_X = 300, PAR_B2_X = 460;
const VF = 0.7; // 다이오드 순방향 전압강하(이상적 근사)

let mode = "series";
let state = { V: 9, R1: 220, R2: 470, diodeForward: true };
let electrons = [];

function colorVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function formatOhms(r) {
  r = Number(r);
  if (r >= 1000) return `${Math.round(r / 100) / 10}kΩ`;
  return `${Math.round(r)}Ω`;
}

/* ---------------------------------------------------------------------
 * 회로 계산 (이상적 다이오드, 저항 없는 도선 가정)
 * ------------------------------------------------------------------- */
function calc() {
  if (mode === "series") {
    const total = state.R1 + state.R2;
    const I = state.diodeForward ? Math.max((state.V - VF) / total, 0) : 0;
    return { I };
  }
  const I1 = state.V / state.R1;
  const I2 = state.diodeForward ? Math.max((state.V - VF) / state.R2, 0) : 0;
  return { I1, I2 };
}

function speedFromCurrent(I) {
  if (I <= 0) return 0;
  return Math.min(Math.max(I * 40, 0.6), 5);
}

/* ---------------------------------------------------------------------
 * SVG 부품 조각 생성 함수
 * ------------------------------------------------------------------- */
function batterySymbol() {
  const cy = (TOP_Y + BOT_Y) / 2;
  const wire = colorVar("--wire");
  return `
    <line x1="${BAT_X}" y1="${TOP_Y}" x2="${BAT_X}" y2="${cy - 18}" stroke="${wire}" stroke-width="2.5"/>
    <line x1="${BAT_X - 18}" y1="${cy - 14}" x2="${BAT_X + 18}" y2="${cy - 14}" stroke="${wire}" stroke-width="3.5"/>
    <line x1="${BAT_X - 10}" y1="${cy + 2}" x2="${BAT_X + 10}" y2="${cy + 2}" stroke="${wire}" stroke-width="7"/>
    <line x1="${BAT_X}" y1="${cy + 16}" x2="${BAT_X}" y2="${BOT_Y}" stroke="${wire}" stroke-width="2.5"/>
    <text class="value-label" x="${BAT_X - 30}" y="${TOP_Y + 6}" text-anchor="middle">+</text>
    <text class="value-label" x="${BAT_X - 30}" y="${BOT_Y - 2}" text-anchor="middle">−</text>
    <text class="value-label" x="${BAT_X}" y="${BOT_Y + 40}" text-anchor="middle">${state.V.toFixed(1)}V</text>`;
}

function resistorGroup(cx, cy, rotation, label, labelX, labelY, labelAnchor) {
  const wire = colorVar("--wire");
  return `
    <g transform="translate(${cx},${cy}) rotate(${rotation})">
      <path d="M-40,0 L-26,0 L-19,-9 L-6,9 L7,-9 L20,9 L27,0 L40,0" stroke="${wire}" stroke-width="2.5" fill="none"/>
    </g>
    <text class="value-label" x="${labelX}" y="${labelY}" text-anchor="${labelAnchor || "middle"}">${label}</text>`;
}

function diodeGroup(cx, cy, rotation, strokeColor) {
  return `
    <g transform="translate(${cx},${cy}) rotate(${rotation})">
      <line x1="-25" y1="0" x2="-10" y2="0" stroke="${strokeColor}" stroke-width="2.5"/>
      <path d="M-10,-14 L-10,14 L14,0 Z" stroke="${strokeColor}" stroke-width="2.5" fill="none"/>
      <line x1="14" y1="-14" x2="14" y2="14" stroke="${strokeColor}" stroke-width="2.5"/>
      <line x1="14" y1="0" x2="25" y2="0" stroke="${strokeColor}" stroke-width="2.5"/>
    </g>`;
}

function arrowMarker(x, y, dir, color) {
  const s = 7;
  let points;
  if (dir === "right") points = `${x - s},${y - s} ${x - s},${y + s} ${x + s},${y}`;
  else if (dir === "left") points = `${x + s},${y - s} ${x + s},${y + s} ${x - s},${y}`;
  else if (dir === "down") points = `${x - s},${y - s} ${x + s},${y - s} ${x},${y + s}`;
  else points = `${x - s},${y + s} ${x + s},${y + s} ${x},${y - s}`;
  return `<polygon points="${points}" fill="${color}"/>`;
}

function nodeDot(x, y) {
  return `<circle class="node-dot" cx="${x}" cy="${y}" r="3.5"/>`;
}

/* ---------------------------------------------------------------------
 * 정적 다이어그램 그리기
 * ------------------------------------------------------------------- */
function buildStaticSVG() {
  const condColor = colorVar("--conducting");
  const blockColor = colorVar("--blocking");
  const arrowColor = colorVar("--current-arrow");
  let html = batterySymbol();

  if (mode === "series") {
    const { I } = calc();
    const conducting = state.diodeForward && I > 0;
    const diodeColor = conducting ? condColor : blockColor;
    const diodeRot = state.diodeForward ? 180 : 0;

    html += `<path id="path-series" class="wire" fill="none"
      d="M${BAT_X},${BOT_Y} L${SERIES_RIGHT_X},${BOT_Y} L${SERIES_RIGHT_X},${TOP_Y} L${BAT_X},${TOP_Y}"/>`;
    html += resistorGroup(260, TOP_Y, 0, `R2 ${formatOhms(state.R2)}`, 260, TOP_Y - 16);
    html += resistorGroup(420, TOP_Y, 0, `R1 ${formatOhms(state.R1)}`, 420, TOP_Y - 16);
    html += diodeGroup(300, BOT_Y, diodeRot, diodeColor);
    html += `<text class="state-label" x="300" y="${BOT_Y + 30}" text-anchor="middle" fill="${diodeColor}">${conducting ? "도통" : "차단"}</text>`;

    if (conducting) {
      html += arrowMarker(190, TOP_Y, "right", arrowColor);
      html += arrowMarker(SERIES_RIGHT_X, 200, "down", arrowColor);
      html += arrowMarker(190, BOT_Y, "left", arrowColor);
    }
  } else {
    const { I1, I2 } = calc();
    const conducting2 = state.diodeForward && I2 > 0;
    const diodeColor = conducting2 ? condColor : blockColor;
    const diodeRot = state.diodeForward ? 90 : 270;

    html += `<path id="path-loop1" class="wire" fill="none"
      d="M${BAT_X},${BOT_Y} L${PAR_B1_X},${BOT_Y} L${PAR_B1_X},${TOP_Y} L${BAT_X},${TOP_Y}"/>`;
    html += `<path id="path-loop2" class="wire" fill="none"
      d="M${BAT_X},${BOT_Y} L${PAR_B2_X},${BOT_Y} L${PAR_B2_X},${TOP_Y} L${BAT_X},${TOP_Y}"/>`;

    html += nodeDot(PAR_B1_X, TOP_Y) + nodeDot(PAR_B1_X, BOT_Y);
    html += nodeDot(PAR_B2_X, TOP_Y) + nodeDot(PAR_B2_X, BOT_Y);

    html += resistorGroup(PAR_B1_X, 200, 90, `R1 ${formatOhms(state.R1)}`, PAR_B1_X + 44, 204);
    html += resistorGroup(PAR_B2_X, 130, 90, `R2 ${formatOhms(state.R2)}`, PAR_B2_X + 44, 134);
    html += diodeGroup(PAR_B2_X, 250, diodeRot, diodeColor);
    html += `<text class="state-label" x="${PAR_B2_X + 44}" y="254" text-anchor="start" fill="${diodeColor}">${conducting2 ? "도통" : "차단"}</text>`;

    html += arrowMarker(180, TOP_Y, "right", arrowColor);
    html += arrowMarker(PAR_B1_X, 200, "down", arrowColor);
    if (conducting2) html += arrowMarker(PAR_B2_X, 190, "down", arrowColor);
    html += arrowMarker(180, BOT_Y, "left", arrowColor);
  }

  staticLayer.innerHTML = html;
}

/* ---------------------------------------------------------------------
 * 전자 입자
 * ------------------------------------------------------------------- */
function buildElectrons() {
  electrons = [];

  if (mode === "series") {
    const { I } = calc();
    const conducting = state.diodeForward && I > 0;
    const pathEl = document.getElementById("path-series");
    const len = pathEl.getTotalLength();
    if (conducting) {
      const speed = speedFromCurrent(I);
      const n = 8;
      for (let i = 0; i < n; i++) electrons.push({ pathId: "path-series", t: (i / n) * len, len, speed, stuck: false });
    } else {
      [260, 270, 280, 290].forEach(x => electrons.push({ pathId: "path-series", t: x - BAT_X, len, speed: 0, stuck: true }));
    }
  } else {
    const { I1, I2 } = calc();
    const path1 = document.getElementById("path-loop1");
    const len1 = path1.getTotalLength();
    const speed1 = speedFromCurrent(I1);
    for (let i = 0; i < 6; i++) electrons.push({ pathId: "path-loop1", t: (i / 6) * len1, len: len1, speed: speed1, stuck: false });

    const conducting2 = state.diodeForward && I2 > 0;
    const path2 = document.getElementById("path-loop2");
    const len2 = path2.getTotalLength();
    if (conducting2) {
      const speed2 = speedFromCurrent(I2);
      for (let i = 0; i < 6; i++) electrons.push({ pathId: "path-loop2", t: (i / 6) * len2, len: len2, speed: speed2, stuck: false });
    } else {
      [300, 290, 280, 270].forEach(y => electrons.push({ pathId: "path-loop2", t: 360 + (320 - y), len: len2, speed: 0, stuck: true }));
    }
  }

  const electronColor = colorVar("--electron");
  electronsLayer.innerHTML = electrons.map((e, i) =>
    `<circle id="e-${i}" r="5" fill="${electronColor}" stroke="#fff" stroke-width="1"/>`).join("");
}

function tick() {
  const pathCache = {};
  electrons.forEach((e, i) => {
    if (!e.stuck) {
      e.t += e.speed;
      if (e.t > e.len) e.t -= e.len;
      if (e.t < 0) e.t += e.len;
    }
    let p = pathCache[e.pathId];
    if (!p) { p = document.getElementById(e.pathId); pathCache[e.pathId] = p; }
    const pt = p.getPointAtLength(e.t);
    const circle = document.getElementById("e-" + i);
    if (circle) { circle.setAttribute("cx", pt.x); circle.setAttribute("cy", pt.y); }
  });
  requestAnimationFrame(tick);
}

/* ---------------------------------------------------------------------
 * 패널 갱신
 * ------------------------------------------------------------------- */
const resultPanel = document.getElementById("result-panel");
const explainPanel = document.getElementById("explain-panel");

function updatePanels() {
  if (mode === "series") {
    const { I } = calc();
    const blocked = !(state.diodeForward && I > 0);
    resultPanel.innerHTML = `전체 전류 I = ${(I * 1000).toFixed(1)} mA${blocked ? " (다이오드가 막아 전류 없음)" : ""}`;
    explainPanel.textContent = blocked
      ? "다이오드가 역방향이 되어 회로를 차단하면, 직렬 회로 전체의 전류가 0이 됩니다. 경로가 하나뿐이라 한 곳이 막히면 회로 전체가 멈춥니다."
      : "직렬 회로에서는 전류가 흐르는 통로가 하나뿐이므로, 회로의 모든 지점에서 전류(전자의 이동 속도)가 동일합니다.";
  } else {
    const { I1, I2 } = calc();
    const blocked2 = !(state.diodeForward && I2 > 0);
    resultPanel.innerHTML = `가지1(R1) 전류 I1 = ${(I1 * 1000).toFixed(1)} mA<br>가지2(R2+다이오드) 전류 I2 = ${(I2 * 1000).toFixed(1)} mA${blocked2 ? " (차단)" : ""}<br>총 전류 = ${((I1 + I2) * 1000).toFixed(1)} mA`;
    explainPanel.textContent = blocked2
      ? "R2-다이오드 가지가 차단되어도 R1 가지는 영향을 받지 않고 그대로 전류가 흐릅니다. 병렬 회로는 한 가지가 끊겨도 나머지 가지가 독립적으로 동작합니다."
      : "병렬 회로에서는 각 가지가 독립된 통로를 가지므로, 저항이 작은 가지에 더 많은 전류가 흐르고 전자도 더 빠르게 이동합니다.";
  }
}

function rebuildAll() {
  buildStaticSVG();
  buildElectrons();
  updatePanels();
}

/* ---------------------------------------------------------------------
 * 컨트롤 바인딩
 * ------------------------------------------------------------------- */
const tabSeries = document.getElementById("tab-series");
const tabParallel = document.getElementById("tab-parallel");
tabSeries.addEventListener("click", () => {
  mode = "series";
  tabSeries.classList.add("active");
  tabParallel.classList.remove("active");
  rebuildAll();
});
tabParallel.addEventListener("click", () => {
  mode = "parallel";
  tabParallel.classList.add("active");
  tabSeries.classList.remove("active");
  rebuildAll();
});

const vSlider = document.getElementById("v-slider");
const r1Slider = document.getElementById("r1-slider");
const r2Slider = document.getElementById("r2-slider");
const vValue = document.getElementById("v-value");
const r1Value = document.getElementById("r1-value");
const r2Value = document.getElementById("r2-value");

vSlider.addEventListener("input", () => {
  state.V = parseFloat(vSlider.value);
  vValue.textContent = `${state.V.toFixed(1)} V`;
  rebuildAll();
});
r1Slider.addEventListener("input", () => {
  state.R1 = parseFloat(r1Slider.value);
  r1Value.textContent = formatOhms(state.R1);
  rebuildAll();
});
r2Slider.addEventListener("input", () => {
  state.R2 = parseFloat(r2Slider.value);
  r2Value.textContent = formatOhms(state.R2);
  rebuildAll();
});

const btnForward = document.getElementById("btn-forward");
const btnReverse = document.getElementById("btn-reverse");
btnForward.addEventListener("click", () => {
  state.diodeForward = true;
  btnForward.classList.add("active");
  btnReverse.classList.remove("active");
  rebuildAll();
});
btnReverse.addEventListener("click", () => {
  state.diodeForward = false;
  btnReverse.classList.add("active");
  btnForward.classList.remove("active");
  rebuildAll();
});

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", rebuildAll);

/* ---------------------------------------------------------------------
 * 초기화
 * ------------------------------------------------------------------- */
rebuildAll();
requestAnimationFrame(tick);
