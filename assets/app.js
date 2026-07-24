"use strict";

/* ---------------------------------------------------------------------
 * 부품 정의 (component definitions)
 * 각 부품은 폭/높이, 단자(terminal) 좌표, 몸체 SVG, 기본 속성(props),
 * 그리고 라벨을 만드는 함수를 가진다.
 * ------------------------------------------------------------------- */
const COMPONENT_DEFS = {
  battery: {
    label: "배터리",
    w: 55, h: 40,
    terminals: [{ x: 0, y: 20, name: "+" }, { x: 55, y: 20, name: "-" }],
    defaultProps: { voltage: 9, name: "" },
    body(props) {
      return `
        <line x1="0" y1="20" x2="20" y2="20"/>
        <line x1="20" y1="4" x2="20" y2="36" stroke-width="3"/>
        <line x1="35" y1="11" x2="35" y2="29" stroke-width="7"/>
        <line x1="35" y1="20" x2="55" y2="20"/>`;
    },
    valueLabel(props) {
      return `${props.name ? props.name + " " : ""}${props.voltage}V`;
    }
  },
  resistor: {
    label: "저항",
    w: 56, h: 20,
    terminals: [{ x: 0, y: 10 }, { x: 56, y: 10 }],
    defaultProps: { resistance: 1000 },
    body() {
      return `<path d="M0,10 H8 L12,2 L20,18 L28,2 L36,18 L44,2 L48,10 H56"/>`;
    },
    valueLabel(props) {
      return formatOhms(props.resistance);
    }
  },
  capacitor: {
    label: "커패시터",
    w: 60, h: 30,
    terminals: [{ x: 0, y: 15 }, { x: 60, y: 15 }],
    defaultProps: { capacitance: "10µF" },
    body() {
      return `
        <line x1="0" y1="15" x2="25" y2="15"/>
        <line x1="25" y1="0" x2="25" y2="30" stroke-width="3"/>
        <line x1="35" y1="0" x2="35" y2="30" stroke-width="3"/>
        <line x1="35" y1="15" x2="60" y2="15"/>`;
    },
    valueLabel(props) {
      return `${props.capacitance}`;
    }
  },
  diode: {
    label: "다이오드",
    w: 50, h: 30,
    terminals: [{ x: 0, y: 15, name: "A" }, { x: 50, y: 15, name: "K" }],
    defaultProps: { name: "1N4007" },
    body() {
      return `
        <line x1="0" y1="15" x2="15" y2="15"/>
        <path d="M15,0 L15,30 L35,15 Z"/>
        <line x1="35" y1="0" x2="35" y2="30" stroke-width="3"/>
        <line x1="35" y1="15" x2="50" y2="15"/>`;
    },
    valueLabel(props) {
      return props.name || "다이오드";
    }
  },
  led: {
    label: "LED",
    w: 50, h: 30,
    terminals: [{ x: 0, y: 15, name: "A" }, { x: 50, y: 15, name: "K" }],
    defaultProps: { color: "빨강" },
    body() {
      return `
        <line x1="0" y1="15" x2="15" y2="15"/>
        <path d="M15,0 L15,30 L35,15 Z"/>
        <line x1="35" y1="0" x2="35" y2="30" stroke-width="3"/>
        <line x1="35" y1="15" x2="50" y2="15"/>
        <line x1="30" y1="-2" x2="38" y2="-10" marker-end="url(#arrow)"/>
        <line x1="36" y1="4" x2="44" y2="-4" marker-end="url(#arrow)"/>`;
    },
    valueLabel(props) {
      return `${props.color || ""} LED`.trim();
    }
  },
  switch: {
    label: "스위치",
    w: 55, h: 20,
    terminals: [{ x: 0, y: 15 }, { x: 55, y: 15 }],
    defaultProps: {},
    body() {
      return `
        <line x1="0" y1="15" x2="12" y2="15"/>
        <circle cx="12" cy="15" r="2.5" fill="currentColor"/>
        <line x1="14" y1="14" x2="40" y2="3"/>
        <circle cx="43" cy="15" r="2.5" fill="currentColor"/>
        <line x1="43" y1="15" x2="55" y2="15"/>`;
    },
    valueLabel() { return "SW"; }
  },
  motor: {
    label: "모터",
    w: 60, h: 50,
    terminals: [{ x: 0, y: 25 }, { x: 60, y: 25 }],
    defaultProps: { voltage: 9, current: 0.5 },
    body() {
      return `
        <line x1="0" y1="25" x2="10" y2="25"/>
        <circle cx="30" cy="25" r="20"/>
        <text x="30" y="30" text-anchor="middle" class="sym-text">M</text>
        <line x1="50" y1="25" x2="60" y2="25"/>`;
    },
    valueLabel(props) {
      return `${props.voltage}V / ${props.current}A 모터`;
    }
  },
  ground: {
    label: "접지",
    w: 40, h: 20,
    terminals: [{ x: 20, y: 0 }],
    defaultProps: {},
    body() {
      return `
        <line x1="20" y1="0" x2="20" y2="10"/>
        <line x1="4" y1="10" x2="36" y2="10"/>
        <line x1="9" y1="15" x2="31" y2="15"/>
        <line x1="14" y1="20" x2="26" y2="20"/>`;
    },
    valueLabel() { return ""; }
  },
  transistor: {
    label: "트랜지스터(NPN)",
    w: 70, h: 70,
    terminals: [{ x: 0, y: 35, name: "B" }, { x: 60, y: 12, name: "C" }, { x: 60, y: 58, name: "E" }],
    defaultProps: { name: "2N2222" },
    body() {
      return `
        <circle cx="30" cy="35" r="26"/>
        <line x1="0" y1="35" x2="18" y2="35"/>
        <line x1="18" y1="20" x2="18" y2="50"/>
        <line x1="18" y1="24" x2="45" y2="12"/>
        <line x1="45" y1="12" x2="60" y2="12"/>
        <line x1="18" y1="46" x2="45" y2="58" marker-end="url(#arrow)"/>
        <line x1="45" y1="58" x2="60" y2="58"/>`;
    },
    valueLabel(props) { return props.name || "NPN"; }
  },
  relay: {
    label: "릴레이",
    w: 80, h: 70,
    terminals: [
      { x: 0, y: 15, name: "coil1" }, { x: 0, y: 55, name: "coil2" },
      { x: 80, y: 15, name: "common" }, { x: 80, y: 55, name: "NO" }
    ],
    defaultProps: {},
    body() {
      return `
        <rect x="5" y="5" width="70" height="60" rx="4"/>
        <line x1="0" y1="15" x2="5" y2="15"/>
        <line x1="0" y1="55" x2="5" y2="55"/>
        <line x1="75" y1="15" x2="80" y2="15"/>
        <line x1="75" y1="55" x2="80" y2="55"/>
        <text x="40" y="39" text-anchor="middle" class="sym-text">RELAY</text>`;
    },
    valueLabel() { return ""; }
  },
  box: {
    label: "모듈(센서/MCU)",
    w: 90, h: 70,
    terminals: [
      { x: 0, y: 15, name: "VCC" }, { x: 0, y: 55, name: "GND" }, { x: 90, y: 35, name: "OUT" }
    ],
    defaultProps: { label: "모듈" },
    body(props) {
      return `
        <rect x="0" y="0" width="90" height="70" rx="4"/>
        <text x="45" y="39" text-anchor="middle" class="sym-text">${escapeXml(props.label || "모듈")}</text>
        <line x1="-10" y1="15" x2="0" y2="15"/>
        <text x="4" y="11" class="pin-label">VCC</text>
        <line x1="-10" y1="55" x2="0" y2="55"/>
        <text x="4" y="51" class="pin-label">GND</text>
        <line x1="90" y1="35" x2="100" y2="35"/>
        <text x="66" y="31" class="pin-label">OUT</text>`;
    },
    valueLabel() { return ""; }
  }
};

const PALETTE_ORDER = ["battery", "resistor", "capacitor", "diode", "led", "switch", "motor", "ground", "transistor", "relay", "box"];
const PALETTE_ICON = {
  battery: "🔋", resistor: "⚡", capacitor: "🧲", diode: "▷|", led: "💡",
  switch: "🔘", motor: "🌀", ground: "⏚", transistor: "🔺", relay: "📦", box: "🧩"
};

/* ---------------------------------------------------------------------
 * 기계 모형 템플릿 (machine model templates)
 * components: [{type, x, y, props}], wires: [[compIndexA, termIndexA, compIndexB, termIndexB], ...]
 * ------------------------------------------------------------------- */
const MACHINE_TEMPLATES = {
  motor: {
    name: "DC 모터 구동 회로",
    components: [
      { type: "battery", x: 40, y: 80, props: { voltage: 9 } },
      { type: "switch", x: 150, y: 40, props: {} },
      { type: "resistor", x: 230, y: 40, props: { resistance: 1000 } },
      { type: "transistor", x: 320, y: 20, props: { name: "2N2222" } },
      { type: "motor", x: 470, y: 55, props: { voltage: 9, current: 0.5 } },
      { type: "diode", x: 470, y: 170, props: { name: "1N4007" } },
      { type: "ground", x: 40, y: 220 }
    ],
    wires: [
      [0, 0, 1, 0], [1, 1, 2, 0], [2, 1, 3, 0],
      [0, 0, 4, 0], [4, 1, 3, 1],
      [3, 2, 6, 0], [0, 1, 6, 0],
      [5, 0, 3, 1], [5, 1, 4, 0]
    ]
  },
  led: {
    name: "LED 표시 회로",
    components: [
      { type: "battery", x: 40, y: 60, props: { voltage: 9 } },
      { type: "resistor", x: 150, y: 60, props: { resistance: 470 } },
      { type: "led", x: 260, y: 60, props: { color: "빨강" } },
      { type: "ground", x: 40, y: 170 }
    ],
    wires: [
      [0, 0, 1, 0], [1, 1, 2, 0], [2, 1, 3, 0], [0, 1, 3, 0]
    ]
  },
  relay: {
    name: "릴레이 부하 구동 회로",
    components: [
      { type: "battery", x: 40, y: 40, props: { voltage: 12 } },
      { type: "switch", x: 150, y: 10, props: {} },
      { type: "resistor", x: 230, y: 10, props: { resistance: 1000 } },
      { type: "transistor", x: 320, y: -10, props: { name: "2N2222" } },
      { type: "relay", x: 430, y: -20, props: {} },
      { type: "diode", x: 430, y: 100, props: { name: "1N4007" } },
      { type: "motor", x: 600, y: 20, props: { voltage: 12, current: 1.0 } },
      { type: "ground", x: 40, y: 180 }
    ],
    wires: [
      [0, 0, 1, 0], [1, 1, 2, 0], [2, 1, 3, 0],
      [0, 0, 4, 0], [4, 1, 3, 1],
      [3, 2, 7, 0], [0, 1, 7, 0],
      [5, 0, 4, 1], [5, 1, 4, 0],
      [0, 0, 4, 2], [4, 3, 6, 0], [6, 1, 7, 0]
    ]
  },
  solar: {
    name: "태양광 충전 회로",
    components: [
      { type: "battery", x: 40, y: 60, props: { voltage: 18, name: "태양광패널" } },
      { type: "diode", x: 190, y: 60, props: { name: "역류방지" } },
      { type: "battery", x: 320, y: 60, props: { voltage: 12, name: "충전지" } },
      { type: "ground", x: 40, y: 200 }
    ],
    wires: [
      [0, 0, 1, 0], [1, 1, 2, 0], [0, 1, 3, 0], [2, 1, 3, 0]
    ]
  },
  sensor: {
    name: "센서-MCU 인터페이스 회로",
    components: [
      { type: "battery", x: 40, y: 40, props: { voltage: 5 } },
      { type: "box", x: 170, y: 20, props: { label: "센서" } },
      { type: "resistor", x: 170, y: 150, props: { resistance: 10000 } },
      { type: "box", x: 350, y: 20, props: { label: "MCU" } },
      { type: "ground", x: 40, y: 200 }
    ],
    wires: [
      [0, 0, 1, 0], [0, 0, 2, 0], [2, 1, 1, 2], [1, 2, 3, 0],
      [1, 1, 4, 0], [0, 1, 4, 0], [3, 1, 4, 0]
    ]
  }
};

/* ---------------------------------------------------------------------
 * 상태 (state)
 * ------------------------------------------------------------------- */
let state = { components: [], wires: [] };
let nextId = 1;
let selected = null; // {kind:'component'|'wire', id}
let pendingWire = null; // {compId, term}
let dragging = null; // {id, offsetX, offsetY}

const svg = document.getElementById("canvas");
const wiresLayer = document.getElementById("wires-layer");
const componentsLayer = document.getElementById("components-layer");

function uid() { return "c" + (nextId++); }

function formatOhms(r) {
  r = Number(r);
  if (!isFinite(r)) return `${r} Ω`;
  if (r >= 1e6) return `${trimNum(r / 1e6)} MΩ`;
  if (r >= 1e3) return `${trimNum(r / 1e3)} kΩ`;
  return `${trimNum(r)} Ω`;
}
function trimNum(n) {
  return Math.round(n * 100) / 100;
}
function escapeXml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
}

/* ---------------------------------------------------------------------
 * 부품/전선 조작
 * ------------------------------------------------------------------- */
function addComponent(type, x, y, props) {
  const def = COMPONENT_DEFS[type];
  const comp = {
    id: uid(),
    type,
    x, y,
    props: Object.assign({}, def.defaultProps, props || {})
  };
  state.components.push(comp);
  return comp;
}

function removeComponent(id) {
  state.components = state.components.filter(c => c.id !== id);
  state.wires = state.wires.filter(w => w.from.id !== id && w.to.id !== id);
}

function addWire(fromId, fromTerm, toId, toTerm) {
  if (fromId === toId && fromTerm === toTerm) return;
  const exists = state.wires.some(w =>
    (w.from.id === fromId && w.from.term === fromTerm && w.to.id === toId && w.to.term === toTerm) ||
    (w.from.id === toId && w.from.term === toTerm && w.to.id === fromId && w.to.term === fromTerm)
  );
  if (exists) return;
  state.wires.push({ id: uid(), from: { id: fromId, term: fromTerm }, to: { id: toId, term: toTerm } });
}

function removeWire(id) {
  state.wires = state.wires.filter(w => w.id !== id);
}

function findComponent(id) {
  return state.components.find(c => c.id === id);
}

function terminalPos(comp, termIdx) {
  const def = COMPONENT_DEFS[comp.type];
  const t = def.terminals[termIdx];
  return { x: comp.x + t.x, y: comp.y + t.y };
}

function clearAll() {
  state = { components: [], wires: [] };
  selected = null;
  pendingWire = null;
  render();
}

/* ---------------------------------------------------------------------
 * 렌더링
 * ------------------------------------------------------------------- */
function render() {
  renderWires();
  renderComponents();
  renderPropertiesPanel();
  renderCircuitSummary();
}

function renderWires() {
  wiresLayer.innerHTML = "";
  state.wires.forEach(w => {
    const fromComp = findComponent(w.from.id);
    const toComp = findComponent(w.to.id);
    if (!fromComp || !toComp) return;
    const p1 = terminalPos(fromComp, w.from.term);
    const p2 = terminalPos(toComp, w.to.term);
    const midX = (p1.x + p2.x) / 2;
    let d;
    if (p1.y === p2.y) {
      d = `M${p1.x},${p1.y} L${p2.x},${p2.y}`;
    } else {
      d = `M${p1.x},${p1.y} L${midX},${p1.y} L${midX},${p2.y} L${p2.x},${p2.y}`;
    }
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("class", "wire" + (selected && selected.kind === "wire" && selected.id === w.id ? " selected" : ""));
    path.dataset.wireId = w.id;
    wiresLayer.appendChild(path);
  });
}

function renderComponents() {
  componentsLayer.innerHTML = "";
  state.components.forEach(comp => {
    const def = COMPONENT_DEFS[comp.type];
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("transform", `translate(${comp.x},${comp.y})`);
    g.setAttribute("class", "component" + (selected && selected.kind === "component" && selected.id === comp.id ? " selected" : ""));
    g.dataset.compId = comp.id;

    const bodyWrap = document.createElementNS("http://www.w3.org/2000/svg", "g");
    bodyWrap.setAttribute("class", "component-body");
    bodyWrap.dataset.compId = comp.id;
    bodyWrap.innerHTML = def.body(comp.props);
    g.appendChild(bodyWrap);

    const labelText = def.valueLabel(comp.props);
    if (labelText) {
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", def.w / 2);
      label.setAttribute("y", def.h + 16);
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("class", "value-label");
      label.textContent = labelText;
      g.appendChild(label);
    }

    def.terminals.forEach((t, idx) => {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", t.x);
      circle.setAttribute("cy", t.y);
      circle.setAttribute("r", 4.5);
      circle.setAttribute("class", "terminal" + (pendingWire && pendingWire.compId === comp.id && pendingWire.term === idx ? " pending" : ""));
      circle.dataset.compId = comp.id;
      circle.dataset.term = idx;
      g.appendChild(circle);
    });

    componentsLayer.appendChild(g);
  });
}

/* ---------------------------------------------------------------------
 * 속성 패널
 * ------------------------------------------------------------------- */
const PROP_FIELDS = {
  battery: [
    { key: "name", label: "이름", type: "text" },
    { key: "voltage", label: "전압 (V)", type: "number" }
  ],
  resistor: [{ key: "resistance", label: "저항 (Ω)", type: "number" }],
  capacitor: [{ key: "capacitance", label: "정전용량", type: "text" }],
  diode: [{ key: "name", label: "이름", type: "text" }],
  led: [{ key: "color", label: "색상", type: "text" }],
  switch: [],
  motor: [
    { key: "voltage", label: "전압 (V)", type: "number" },
    { key: "current", label: "전류 (A)", type: "number" }
  ],
  ground: [],
  transistor: [{ key: "name", label: "모델명", type: "text" }],
  relay: [],
  box: [{ key: "label", label: "라벨", type: "text" }]
};

function renderPropertiesPanel() {
  const panel = document.getElementById("properties-panel");
  if (!selected) {
    panel.innerHTML = `<h2>속성</h2><p class="hint">부품이나 전선을 클릭하면 여기서 값을 편집할 수 있습니다. (선택한 항목은 Delete 키로 삭제)</p>`;
    return;
  }
  if (selected.kind === "wire") {
    panel.innerHTML = `<h2>속성</h2><p class="hint">전선이 선택되었습니다.</p><button id="delete-selected" class="danger">전선 삭제</button>`;
    document.getElementById("delete-selected").onclick = () => {
      removeWire(selected.id);
      selected = null;
      render();
    };
    return;
  }
  const comp = findComponent(selected.id);
  if (!comp) { selected = null; panel.innerHTML = ""; return; }
  const def = COMPONENT_DEFS[comp.type];
  const fields = PROP_FIELDS[comp.type] || [];
  let html = `<h2>속성 — ${def.label}</h2>`;
  fields.forEach(f => {
    const val = comp.props[f.key] !== undefined ? comp.props[f.key] : "";
    html += `<div class="prop-row"><label for="prop-${f.key}">${f.label}</label>
      <input id="prop-${f.key}" type="${f.type}" value="${escapeXml(val)}" data-key="${f.key}"></div>`;
  });
  html += `<button id="delete-selected" class="danger">부품 삭제</button>`;
  panel.innerHTML = html;
  fields.forEach(f => {
    const input = document.getElementById(`prop-${f.key}`);
    input.addEventListener("input", () => {
      comp.props[f.key] = f.type === "number" ? Number(input.value) : input.value;
      renderComponents();
      renderCircuitSummary();
    });
  });
  document.getElementById("delete-selected").onclick = () => {
    removeComponent(comp.id);
    selected = null;
    render();
  };
}

function renderCircuitSummary() {
  const el = document.getElementById("circuit-summary");
  if (!el) return;
  if (state.components.length === 0) {
    el.textContent = "부품이 없습니다.";
    return;
  }
  const counts = {};
  state.components.forEach(c => { counts[c.type] = (counts[c.type] || 0) + 1; });
  const lines = Object.keys(counts).map(type => `${COMPONENT_DEFS[type].label}: ${counts[type]}개`);
  lines.push(`전선: ${state.wires.length}개`);
  el.textContent = lines.join("\n");
}

/* ---------------------------------------------------------------------
 * 캔버스 상호작용 (드래그, 전선 연결, 선택)
 * ------------------------------------------------------------------- */
function svgPoint(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX;
  pt.y = evt.clientY;
  const ctm = svg.getScreenCTM().inverse();
  const p = pt.matrixTransform(ctm);
  return { x: p.x, y: p.y };
}

svg.addEventListener("pointerdown", (e) => {
  const terminalEl = e.target.closest(".terminal");
  if (terminalEl) {
    const compId = terminalEl.dataset.compId;
    const term = Number(terminalEl.dataset.term);
    if (pendingWire && pendingWire.compId === compId && pendingWire.term === term) {
      pendingWire = null;
    } else if (pendingWire) {
      addWire(pendingWire.compId, pendingWire.term, compId, term);
      pendingWire = null;
    } else {
      pendingWire = { compId, term };
    }
    selected = null;
    render();
    return;
  }

  const bodyEl = e.target.closest(".component-body");
  if (bodyEl) {
    const compId = bodyEl.dataset.compId;
    const comp = findComponent(compId);
    selected = { kind: "component", id: compId };
    const p = svgPoint(e);
    dragging = { id: compId, offsetX: p.x - comp.x, offsetY: p.y - comp.y };
    svg.setPointerCapture(e.pointerId);
    render();
    return;
  }

  const wireEl = e.target.closest(".wire");
  if (wireEl) {
    selected = { kind: "wire", id: wireEl.dataset.wireId };
    render();
    return;
  }

  selected = null;
  pendingWire = null;
  render();
});

svg.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const p = svgPoint(e);
  const comp = findComponent(dragging.id);
  if (!comp) return;
  comp.x = Math.round(p.x - dragging.offsetX);
  comp.y = Math.round(p.y - dragging.offsetY);
  renderWires();
  renderComponents();
});

svg.addEventListener("pointerup", () => { dragging = null; });
svg.addEventListener("pointercancel", () => { dragging = null; });

document.addEventListener("keydown", (e) => {
  if (e.key !== "Delete" && e.key !== "Backspace") return;
  if (document.activeElement && ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
  if (!selected) return;
  if (selected.kind === "component") removeComponent(selected.id);
  else removeWire(selected.id);
  selected = null;
  render();
});

/* ---------------------------------------------------------------------
 * 팔레트
 * ------------------------------------------------------------------- */
function buildPalette() {
  const grid = document.getElementById("palette-grid");
  let cascade = 0;
  PALETTE_ORDER.forEach(type => {
    const def = COMPONENT_DEFS[type];
    const btn = document.createElement("button");
    btn.innerHTML = `<span class="sym">${PALETTE_ICON[type] || "▫"}</span><span>${def.label}</span>`;
    btn.addEventListener("click", () => {
      const offset = (cascade++ % 8) * 25;
      const comp = addComponent(type, 60 + offset, 60 + offset);
      selected = { kind: "component", id: comp.id };
      render();
    });
    grid.appendChild(btn);
  });
}

/* ---------------------------------------------------------------------
 * 기계 모형 로드
 * ------------------------------------------------------------------- */
function loadTemplate(key) {
  if (key === "blank" || !key) {
    clearAll();
    return;
  }
  const tpl = MACHINE_TEMPLATES[key];
  if (!tpl) return;
  state = { components: [], wires: [] };
  selected = null;
  pendingWire = null;
  const ids = tpl.components.map(spec => addComponent(spec.type, spec.x, spec.y, spec.props).id);
  tpl.wires.forEach(([ai, ti, bi, tj]) => addWire(ids[ai], ti, ids[bi], tj));
  render();
}

document.getElementById("machine-select").addEventListener("change", (e) => {
  loadTemplate(e.target.value);
});

/* ---------------------------------------------------------------------
 * 저장 / 불러오기 / 내보내기
 * ------------------------------------------------------------------- */
const STORAGE_KEY = "circuitDesignerState";

document.getElementById("btn-save").addEventListener("click", () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  alert("현재 회로가 브라우저에 저장되었습니다.");
});

document.getElementById("btn-load").addEventListener("click", () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) { alert("저장된 회로가 없습니다."); return; }
  try {
    state = JSON.parse(raw);
    const maxNum = state.components.reduce((m, c) => Math.max(m, Number(String(c.id).replace("c", "")) || 0), 0);
    nextId = maxNum + 1;
    selected = null;
    pendingWire = null;
    render();
  } catch (err) {
    alert("저장된 데이터를 불러오는 중 오류가 발생했습니다.");
  }
});

document.getElementById("btn-export-json").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "circuit.json";
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("btn-import-json").addEventListener("click", () => {
  document.getElementById("file-import").click();
});

document.getElementById("file-import").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      state = JSON.parse(reader.result);
      const maxNum = state.components.reduce((m, c) => Math.max(m, Number(String(c.id).replace("c", "")) || 0), 0);
      nextId = maxNum + 1;
      selected = null;
      pendingWire = null;
      render();
    } catch (err) {
      alert("JSON 파일을 읽는 중 오류가 발생했습니다.");
    }
  };
  reader.readAsText(file);
  e.target.value = "";
});

document.getElementById("btn-export-svg").addEventListener("click", () => {
  const clone = svg.cloneNode(true);
  clone.querySelectorAll(".selected").forEach(el => el.classList.remove("selected"));
  const serializer = new XMLSerializer();
  let src = serializer.serializeToString(clone);
  src = `<?xml version="1.0" encoding="UTF-8"?>\n` + src;
  const blob = new Blob([src], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "circuit.svg";
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("btn-clear").addEventListener("click", () => {
  if (state.components.length === 0 || confirm("캔버스를 전체 지울까요? 저장하지 않은 내용은 사라집니다.")) {
    clearAll();
    document.getElementById("machine-select").value = "";
  }
});

/* ---------------------------------------------------------------------
 * 계산기
 * ------------------------------------------------------------------- */
document.getElementById("ohm-calc").addEventListener("click", () => {
  const target = document.getElementById("ohm-target").value;
  const v = parseFloat(document.getElementById("ohm-v").value);
  const i = parseFloat(document.getElementById("ohm-i").value);
  const r = parseFloat(document.getElementById("ohm-r").value);
  const result = document.getElementById("ohm-result");
  let out;
  if (target === "V") {
    if (isNaN(i) || isNaN(r)) { out = "전류(I)와 저항(R) 값을 입력하세요."; }
    else { out = `V = I × R = ${trimNum(i * r)} V`; document.getElementById("ohm-v").value = trimNum(i * r); }
  } else if (target === "I") {
    if (isNaN(v) || isNaN(r) || r === 0) { out = "전압(V)과 저항(R) 값을 입력하세요. (R≠0)"; }
    else { out = `I = V / R = ${trimNum(v / r)} A`; document.getElementById("ohm-i").value = trimNum(v / r); }
  } else {
    if (isNaN(v) || isNaN(i) || i === 0) { out = "전압(V)과 전류(I) 값을 입력하세요. (I≠0)"; }
    else { out = `R = V / I = ${formatOhms(v / i)}`; document.getElementById("ohm-r").value = trimNum(v / i); }
  }
  result.textContent = out;
});

document.getElementById("led-calc").addEventListener("click", () => {
  const vs = parseFloat(document.getElementById("led-vs").value);
  const vf = parseFloat(document.getElementById("led-vf").value);
  const ifMa = parseFloat(document.getElementById("led-if").value);
  const result = document.getElementById("led-result");
  if (isNaN(vs) || isNaN(vf) || isNaN(ifMa) || ifMa === 0) {
    result.textContent = "모든 값을 입력하세요.";
    return;
  }
  if (vs <= vf) {
    result.textContent = "공급 전압이 LED 순방향전압보다 커야 합니다.";
    return;
  }
  const ifA = ifMa / 1000;
  const r = (vs - vf) / ifA;
  const p = ifA * ifA * r;
  const standard = nearestE12(r);
  result.textContent = `필요 저항 R = (Vs−Vf)/If = ${trimNum(r)} Ω\n권장 표준값(E12): ${formatOhms(standard)}\n저항 소비전력 ≈ ${trimNum(p * 1000)} mW (여유를 위해 1/4W 이상 권장)`;
});

const E12_BASE = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
function nearestE12(value) {
  if (value <= 0) return 0;
  const exp = Math.floor(Math.log10(value));
  let best = null, bestDiff = Infinity;
  for (let e = exp - 1; e <= exp + 1; e++) {
    E12_BASE.forEach(base => {
      const candidate = base * Math.pow(10, e);
      if (candidate >= value) {
        const diff = candidate - value;
        if (diff < bestDiff) { bestDiff = diff; best = candidate; }
      }
    });
  }
  return best || value;
}

/* ---------------------------------------------------------------------
 * 초기화
 * ------------------------------------------------------------------- */
buildPalette();
render();
