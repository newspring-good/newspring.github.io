"use strict";

/* ---------------------------------------------------------------------
 * PN 접합 반도체 시뮬레이터
 * 확산 → 재결합 → 공핍층 형성 → 바이어스에 따른 전류 흐름을 보여주는
 * 근사적 개념 모델 (정량적 반도체 물성 계산이 아님).
 * ------------------------------------------------------------------- */

const canvas = document.getElementById("pn-canvas");
const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;
const JUNCTION_X = W / 2;
const TOP = 34, BOTTOM = H - 16;

const BASE_HALF = 45;   // 평형 상태 공핍층 반폭 (px)
const MAX_HALF = 150;   // 최대 공핍층 반폭 (강한 역방향)
const VBI = 0.75;       // 시각화용 내부전위 상수
const FORWARD_MAX = 0.75;
const REVERSE_MAX = 5;
const APPROACH = 8;
const CROSS_SPEED = 2.3;
const RECOMBINE_FRAMES = 18;
const JITTER = 0.7;
const DRIFT_MAJ = 0.55;
const DRIFT_MIN = 0.35;

let bias = 0;
let speedMul = 1;
let playing = true;
let leftEdge = JUNCTION_X - BASE_HALF;
let rightEdge = JUNCTION_X + BASE_HALF;

function readColors() {
  const cs = getComputedStyle(document.documentElement);
  const g = (name) => cs.getPropertyValue(name).trim();
  return {
    n: g("--n-region"), p: g("--p-region"), depletion: g("--depletion"),
    electron: g("--electron"), hole: g("--hole"), ion: g("--ion-plus"),
    text: g("--text"), muted: g("--muted"), accent: g("--accent")
  };
}
let COLORS = readColors();
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { COLORS = readColors(); });

/* ---------------------------------------------------------------------
 * 공핍층 폭 계산 (근사식: W ∝ sqrt(Vbi - V))
 * ------------------------------------------------------------------- */
function depletionHalfWidth(V) {
  const ratio = Math.max(1 - V / VBI, 0.04);
  return Math.min(BASE_HALF * Math.sqrt(ratio), MAX_HALF);
}

function biasStrengths() {
  const strengthF = Math.max(0, Math.min(1, bias / FORWARD_MAX));
  const strengthR = Math.max(0, Math.min(1, -bias / REVERSE_MAX));
  return { strengthF, strengthR };
}

/* ---------------------------------------------------------------------
 * 고정 격자 이온 (도너 +, 억셉터 -) — 공핍층 폭에 따라 표시 여부만 바뀜
 * ------------------------------------------------------------------- */
let ions = [];
(function buildIons() {
  const rows = [70, 140, 210, 280, 350, 410].filter(y => y > TOP && y < BOTTOM);
  for (let x = JUNCTION_X - MAX_HALF; x <= JUNCTION_X + MAX_HALF; x += 15) {
    rows.forEach(y => {
      ions.push({ x, y: y + (Math.random() * 8 - 4), side: x < JUNCTION_X ? "donor" : "acceptor" });
    });
  }
})();

/* ---------------------------------------------------------------------
 * 캐리어 입자
 * ------------------------------------------------------------------- */
let particles = [];

function randRange(a, b) { return a + Math.random() * (b - a); }

function makeParticle(kind, role) {
  const p = { kind, role, state: "bulk", vx: 0, vy: 0 };
  respawn(p);
  return p;
}

function respawn(p) {
  p.state = "bulk";
  p.vx = 0; p.vy = 0;
  p.y = randRange(TOP + 12, BOTTOM - 12);
  if (p.kind === "electron" && p.role === "majority") p.x = randRange(50, Math.max(60, leftEdge - 20));
  else if (p.kind === "hole" && p.role === "majority") p.x = randRange(Math.min(W - 60, rightEdge + 20), W - 50);
  else if (p.kind === "hole" && p.role === "minority") p.x = randRange(50, Math.max(60, leftEdge - 20));
  else if (p.kind === "electron" && p.role === "minority") p.x = randRange(Math.min(W - 60, rightEdge + 20), W - 50);
}

function initParticles(count) {
  particles = [];
  for (let i = 0; i < count; i++) particles.push(makeParticle("electron", "majority"));
  for (let i = 0; i < count; i++) particles.push(makeParticle("hole", "majority"));
  for (let i = 0; i < 3; i++) particles.push(makeParticle("hole", "minority"));
  for (let i = 0; i < 3; i++) particles.push(makeParticle("electron", "minority"));
}

function stepParticle(p) {
  const { strengthF, strengthR } = biasStrengths();

  if (p.state === "bulk") {
    let driftX = 0;
    if (p.kind === "electron" && p.role === "majority") {
      driftX = strengthF > 0 ? DRIFT_MAJ * strengthF : (strengthR > 0 ? -DRIFT_MAJ * 0.4 * strengthR : 0);
    } else if (p.kind === "hole" && p.role === "majority") {
      driftX = strengthF > 0 ? -DRIFT_MAJ * strengthF : (strengthR > 0 ? DRIFT_MAJ * 0.4 * strengthR : 0);
    } else if (p.kind === "hole" && p.role === "minority") {
      driftX = strengthR > 0 ? DRIFT_MIN * strengthR : 0;
    } else if (p.kind === "electron" && p.role === "minority") {
      driftX = strengthR > 0 ? -DRIFT_MIN * strengthR : 0;
    }
    p.vx = driftX + (Math.random() - 0.5) * JITTER;
    p.vy = (Math.random() - 0.5) * JITTER;
    p.x += p.vx * speedMul;
    p.y += p.vy * speedMul;
    if (p.y < TOP + 8) p.y = TOP + 8;
    if (p.y > BOTTOM - 8) p.y = BOTTOM - 8;

    if (p.kind === "electron" && p.role === "majority") {
      const edge = leftEdge - APPROACH;
      if (p.x < 40) p.x = 40;
      if (p.x > edge) {
        if (strengthF > 0.02 && Math.random() < 0.02 + 0.12 * strengthF) { p.state = "crossing"; p.dir = 1; }
        else p.x = edge;
      }
    } else if (p.kind === "hole" && p.role === "majority") {
      const edge = rightEdge + APPROACH;
      if (p.x > W - 40) p.x = W - 40;
      if (p.x < edge) {
        if (strengthF > 0.02 && Math.random() < 0.02 + 0.12 * strengthF) { p.state = "crossing"; p.dir = -1; }
        else p.x = edge;
      }
    } else if (p.kind === "hole" && p.role === "minority") {
      const edge = leftEdge - APPROACH;
      if (p.x < 40) p.x = 40;
      if (p.x > edge) {
        if (strengthR > 0.05 && Math.random() < 0.01 + 0.05 * strengthR) { p.state = "crossing"; p.dir = 1; }
        else p.x = edge;
      }
    } else if (p.kind === "electron" && p.role === "minority") {
      const edge = rightEdge + APPROACH;
      if (p.x > W - 40) p.x = W - 40;
      if (p.x < edge) {
        if (strengthR > 0.05 && Math.random() < 0.01 + 0.05 * strengthR) { p.state = "crossing"; p.dir = -1; }
        else p.x = edge;
      }
    }
  } else if (p.state === "crossing") {
    p.x += p.dir * CROSS_SPEED * speedMul;
    p.y += (Math.random() - 0.5) * JITTER * 0.3;
    const targetEdge = p.dir > 0 ? rightEdge + 16 : leftEdge - 16;
    if ((p.dir > 0 && p.x >= targetEdge) || (p.dir < 0 && p.x <= targetEdge)) {
      p.state = "recombine";
      p.recTimer = RECOMBINE_FRAMES;
    }
  } else if (p.state === "recombine") {
    p.recTimer -= speedMul;
    if (p.recTimer <= 0) respawn(p);
  }
}

/* ---------------------------------------------------------------------
 * 렌더링
 * ------------------------------------------------------------------- */
function drawArrow(x1, y, x2) {
  ctx.strokeStyle = COLORS.muted;
  ctx.fillStyle = COLORS.muted;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y);
  ctx.lineTo(x2 - 6, y - 4);
  ctx.lineTo(x2 - 6, y + 4);
  ctx.closePath();
  ctx.fill();
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = COLORS.n;
  ctx.fillRect(0, 0, JUNCTION_X, H);
  ctx.fillStyle = COLORS.p;
  ctx.fillRect(JUNCTION_X, 0, W - JUNCTION_X, H);

  ctx.globalAlpha = 0.35;
  ctx.fillStyle = COLORS.depletion;
  ctx.fillRect(leftEdge, 0, rightEdge - leftEdge, H);
  ctx.globalAlpha = 1;

  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = COLORS.muted;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(JUNCTION_X, 0);
  ctx.lineTo(JUNCTION_X, H);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = COLORS.text;
  ctx.font = "bold 15px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("N형 (전자 다수)", 16, 22);
  ctx.textAlign = "right";
  ctx.fillText("P형 (정공 다수)", W - 16, 22);
  ctx.textAlign = "left";

  if (rightEdge - leftEdge > 8) {
    [90, 200, 310].forEach(y => {
      if (y < BOTTOM) drawArrow(leftEdge + 4, y, rightEdge - 4);
    });
  }

  ions.forEach(ion => {
    const visible = ion.side === "donor" ? ion.x >= leftEdge : ion.x <= rightEdge;
    if (!visible) return;
    ctx.beginPath();
    ctx.arc(ion.x, ion.y, 6, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.ion;
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.fillStyle = COLORS.ion;
    ctx.font = "9px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(ion.side === "donor" ? "+" : "−", ion.x, ion.y + 0.5);
  });
  ctx.textBaseline = "alphabetic";

  particles.forEach(p => {
    const isElectron = p.kind === "electron";
    const isMinor = p.role === "minority";
    const r = isMinor ? 4 : 6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = isElectron ? COLORS.electron : COLORS.hole;
    ctx.globalAlpha = isMinor ? 0.55 : 1;
    ctx.fill();
    ctx.globalAlpha = 1;
    if (!isMinor) {
      ctx.fillStyle = "#fff";
      ctx.font = "8px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(isElectron ? "−" : "+", p.x, p.y + 0.5);
      ctx.textBaseline = "alphabetic";
    }
    if (p.state === "recombine") {
      const t = 1 - p.recTimer / RECOMBINE_FRAMES;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4 + t * 14, 0, Math.PI * 2);
      ctx.strokeStyle = COLORS.accent;
      ctx.globalAlpha = 1 - t;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  });
}

/* ---------------------------------------------------------------------
 * HUD 업데이트
 * ------------------------------------------------------------------- */
const biasSlider = document.getElementById("bias-slider");
const biasValueEl = document.getElementById("bias-value");
const stateBadge = document.getElementById("state-badge");
const meterFill = document.getElementById("meter-fill");
const meterLabel = document.getElementById("meter-label");
const infoWidth = document.getElementById("info-width");
const infoCurrent = document.getElementById("info-current");
const explainPanel = document.getElementById("explain-panel");

const EXPLAIN = {
  equilibrium: "바이어스가 없는 평형 상태입니다. N형의 자유 전자와 P형의 정공이 서로 확산하다가 접합 부근에서 재결합하면서, 도너/억셉터 이온만 남은 공핍층이 형성되었습니다. 공핍층 내부의 전기장이 추가 확산을 막아 순 전류는 흐르지 않습니다.",
  forward: "순방향 바이어스가 걸리면 외부 전압이 내부 전기장을 상쇄시켜 공핍층이 좁아집니다. N형의 자유 전자와 P형의 정공이 장벽을 넘어 서로의 영역으로 밀려들어가 접합 부근에서 재결합하며, 이 과정이 반복되면서 전류가 계속 흐릅니다.",
  reverse: "역방향 바이어스가 걸리면 외부 전압이 내부 전기장을 더 강하게 만들어 공핍층이 넓어집니다. 다수 캐리어는 접합에서 멀어지고, 열적으로 생성된 소수 캐리어(N형의 정공, P형의 전자)만 아주 가끔 장벽을 넘으며 매우 작은 역방향 누설전류를 만듭니다."
};

function updateHUD() {
  biasValueEl.textContent = `${bias.toFixed(2)} V`;
  const { strengthF, strengthR } = biasStrengths();

  let stateKey;
  if (bias > 0.05) stateKey = "forward";
  else if (bias < -0.05) stateKey = "reverse";
  else stateKey = "equilibrium";

  stateBadge.className = "state-badge " + stateKey;
  stateBadge.textContent = stateKey === "forward" ? "순방향 바이어스 — 전류 흐름"
    : stateKey === "reverse" ? "역방향 바이어스 — 미세 누설전류만"
    : "평형 상태 — 순 전류 없음";

  if (stateKey === "forward") {
    const pct = Math.pow(strengthF, 0.6) * 48;
    meterFill.style.left = "50%";
    meterFill.style.width = pct + "%";
    meterLabel.textContent = `순방향 전류 흐름 → (강도 ${Math.round(strengthF * 100)}%)`;
  } else if (stateKey === "reverse") {
    meterFill.style.left = "44%";
    meterFill.style.width = "6%";
    meterLabel.textContent = "역방향 미세 누설전류 (소수 캐리어)";
  } else {
    meterFill.style.left = "50%";
    meterFill.style.width = "0%";
    meterLabel.textContent = "전류 없음";
  }

  infoWidth.textContent = `${Math.round(rightEdge - leftEdge)} px (상대값)`;
  infoCurrent.textContent = stateKey === "forward" ? "있음 (다수 캐리어가 접합을 넘어 흐름)"
    : stateKey === "reverse" ? "거의 없음 (소수 캐리어에 의한 미세 누설전류만)"
    : "없음 (평형)";

  explainPanel.textContent = EXPLAIN[stateKey];
}

/* ---------------------------------------------------------------------
 * 메인 루프
 * ------------------------------------------------------------------- */
function loop() {
  const half = depletionHalfWidth(bias);
  leftEdge = JUNCTION_X - half;
  rightEdge = JUNCTION_X + half;

  if (playing) particles.forEach(stepParticle);
  draw();
  requestAnimationFrame(loop);
}

/* ---------------------------------------------------------------------
 * 컨트롤 바인딩
 * ------------------------------------------------------------------- */
biasSlider.addEventListener("input", () => {
  bias = parseFloat(biasSlider.value);
  updateHUD();
});

document.getElementById("speed-slider").addEventListener("input", (e) => {
  speedMul = parseFloat(e.target.value);
});

document.getElementById("density-slider").addEventListener("input", (e) => {
  initParticles(parseInt(e.target.value, 10));
});

const btnPlay = document.getElementById("btn-play");
btnPlay.addEventListener("click", () => {
  playing = !playing;
  btnPlay.textContent = playing ? "일시정지" : "재생";
});

document.getElementById("btn-reset").addEventListener("click", () => {
  bias = 0;
  biasSlider.value = 0;
  playing = true;
  btnPlay.textContent = "일시정지";
  updateHUD();
  initParticles(parseInt(document.getElementById("density-slider").value, 10));
});

/* ---------------------------------------------------------------------
 * 초기화
 * ------------------------------------------------------------------- */
initParticles(parseInt(document.getElementById("density-slider").value, 10));
updateHUD();
requestAnimationFrame(loop);
