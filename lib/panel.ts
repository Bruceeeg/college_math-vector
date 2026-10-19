export type Vec3 = { readonly x: number; readonly y: number; readonly z: number };

export type PanelInput = {
  east: number;
  north: number;
  rise: number;
  sunEast: number;
  sunNorth: number;
  sunUp: number;
};

export type PresetId = "case" | "flat" | "behind";

export type Step = {
  id: string;
  title: string;
  lines: string[];
  note: string;
};

export type PanelModel = {
  input: PanelInput;
  a: Vec3;
  b: Vec3;
  c: Vec3;
  d: Vec3;
  u: Vec3;
  v: Vec3;
  n: Vec3;
  s: Vec3;
  sEast: Vec3;
  sNorth: Vec3;
  sUp: Vec3;
  nMag: number;
  sMag: number;
  area: number;
  edgeDot: number;
  dot: number;
  cosTheta: number | null;
  thetaDeg: number | null;
  nHat: Vec3 | null;
  sHat: Vec3 | null;
  flatCos: number | null;
  gain: number | null;
  frontShare: number | null;
  isCaseStudy: boolean;
  tiltAgrees: boolean;
  status: string;
  statusKind: "ok" | "warn" | "neutral";
  formula: string[];
  steps: Step[];
};

export const CASE_STUDY: PanelInput = {
  east: 3,
  north: 4,
  rise: 3,
  sunEast: 0,
  sunNorth: -4,
  sunUp: 3,
};

export const PRESETS: Record<PresetId, { label: string; detail: string; input: PanelInput }> = {
  case: {
    label: "Case study",
    detail: "3 by 5 m",
    input: CASE_STUDY,
  },
  flat: {
    label: "Flat roof",
    detail: "No tilt",
    input: { east: 3, north: 4, rise: 0, sunEast: 0, sunNorth: -4, sunUp: 3 },
  },
  behind: {
    label: "Sun behind",
    detail: "From the north",
    input: { east: 3, north: 4, rise: 3, sunEast: 0, sunNorth: 5, sunUp: 0 },
  },
};

const ZERO: Vec3 = { x: 0, y: 0, z: 0 };

export function vec(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale(a: Vec3, k: number): Vec3 {
  return { x: a.x * k, y: a.y * k, z: a.z * k };
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function mag(a: Vec3): number {
  return Math.hypot(a.x, a.y, a.z);
}

export function sameInput(a: PanelInput, b: PanelInput): boolean {
  return (
    a.east === b.east &&
    a.north === b.north &&
    a.rise === b.rise &&
    a.sunEast === b.sunEast &&
    a.sunNorth === b.sunNorth &&
    a.sunUp === b.sunUp
  );
}

export function matchingPreset(input: PanelInput): PresetId | null {
  const ids: PresetId[] = ["case", "flat", "behind"];
  return ids.find((id) => sameInput(input, PRESETS[id].input)) ?? null;
}

export function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) {
    return "—";
  }
  if (Math.abs(value) < 5e-4) {
    return "0";
  }
  const rounded = Math.round(value * 100) / 100;
  const abs = Math.abs(rounded);
  const nearInt = Math.abs(abs - Math.round(abs)) < 1e-9;
  const body = nearInt ? String(Math.round(abs)) : abs.toFixed(2);
  return rounded < 0 ? `−${body}` : body;
}

export function formatVec(v: Vec3): string {
  return `⟨${formatQuantity(v.x)}, ${formatQuantity(v.y)}, ${formatQuantity(v.z)}⟩`;
}

function paren(value: number): string {
  const text = formatQuantity(value);
  return text.startsWith("−") ? `(${text})` : text;
}

function formatLengthFromParts(east: number, north: number, rise: number, length: number): string {
  const under = north * north + rise * rise;
  const root = Math.sqrt(under);
  const perfect =
    Number.isInteger(east) &&
    Number.isInteger(north) &&
    Number.isInteger(rise) &&
    Math.abs(under - Math.round(under)) < 1e-6 &&
    Math.abs(root - Math.round(root)) < 1e-8;
  if (perfect) {
    return `${formatQuantity(Math.abs(east))} √(${formatQuantity(north)}² + ${formatQuantity(rise)}²) = ${formatQuantity(Math.abs(east))} √${Math.round(under)} = ${formatQuantity(length)}`;
  }
  return `${formatQuantity(length)}`;
}

export function solvePanel(input: PanelInput): PanelModel {
  const a = ZERO;
  const b = vec(input.east, 0, 0);
  const d = vec(0, input.north, input.rise);
  const c = add(b, d);
  const u = sub(b, a);
  const v = sub(d, a);
  const n = cross(u, v);
  const sEast = vec(input.sunEast, 0, 0);
  const sNorth = vec(0, input.sunNorth, 0);
  const sUp = vec(0, 0, input.sunUp);
  const s = add(add(sEast, sNorth), sUp);
  const nMag = mag(n);
  const sMag = mag(s);
  const area = nMag;
  const edgeDot = dot(u, v);
  const rawDot = dot(n, s);
  const nHat = nMag > 1e-9 ? scale(n, 1 / nMag) : null;
  const sHat = sMag > 1e-9 ? scale(s, 1 / sMag) : null;
  const cosTheta = nHat && sHat ? dot(nHat, sHat) : null;
  const clamped = cosTheta === null ? null : Math.min(1, Math.max(-1, cosTheta));
  const thetaDeg = clamped === null ? null : (Math.acos(clamped) * 180) / Math.PI;
  const flatCos = sHat ? sHat.z : null;
  const gain =
    cosTheta !== null && flatCos !== null && flatCos > 1e-9 && cosTheta > 0 ? cosTheta / flatCos : null;
  const frontShare = cosTheta === null ? null : Math.max(0, cosTheta);
  const isCaseStudy = sameInput(input, CASE_STUDY);
  const tiltAgrees =
    input.sunEast === 0 &&
    input.sunNorth <= 0 &&
    input.rise >= 0 &&
    input.north > 0 &&
    nMag > 1e-9 &&
    sMag > 1e-9 &&
    cosTheta !== null &&
    Math.abs(Math.sin(Math.atan2(input.sunUp, -input.sunNorth) + Math.atan2(input.rise, input.north)) - cosTheta) <
      1e-8;

  let status = "Set a sun direction. The zero vector has no direction.";
  let statusKind: PanelModel["statusKind"] = "neutral";
  if (nMag <= 1e-9) {
    status = "The two edges are parallel, so this is not a panel.";
    statusKind = "warn";
  } else if (cosTheta === null) {
    status = "The sun vector is ⟨0, 0, 0⟩, so it has no direction.";
  } else if (cosTheta > 0.02) {
    status = "Direct sunlight reaches the front of the glass.";
    statusKind = "ok";
  } else if (cosTheta < -0.02) {
    status = "The sun is behind the glass, so the front-face share is 0.";
    statusKind = "warn";
  } else {
    status = "The sun is grazing along the glass.";
  }

  const modelBase = {
    input,
    a,
    b,
    c,
    d,
    u,
    v,
    n,
    s,
    sEast,
    sNorth,
    sUp,
    nMag,
    sMag,
    area,
    edgeDot,
    dot: rawDot,
    cosTheta,
    thetaDeg,
    nHat,
    sHat,
    flatCos,
    gain,
    frontShare,
    isCaseStudy,
    tiltAgrees,
    status,
    statusKind,
  };

  return {
    ...modelBase,
    formula: buildFormula(modelBase),
    steps: buildSteps(modelBase),
  };
}

type ModelCore = Omit<PanelModel, "formula" | "steps">;

function buildFormula(model: ModelCore): string[] {
  const cos =
    model.cosTheta === null
      ? "—"
      : model.isCaseStudy
        ? "24/25"
        : formatQuantity(model.cosTheta);
  return [
    `u = B − A = ${formatVec(model.u)}`,
    `v = D − A = ${formatVec(model.v)}`,
    `n = u × v = ${formatVec(model.n)}`,
    `|n| = ${formatQuantity(model.area)} m²`,
    `s = ${formatVec(model.s)}`,
    `n · s = ${formatQuantity(model.dot)}`,
    `cos θ = ${cos}`,
  ];
}

function buildSteps(model: ModelCore): Step[] {
  const { input, u, v, n, s } = model;
  const unitLine = model.isCaseStudy
    ? `n̂ = (1/15) ⟨0, −9, 12⟩ = ⟨0, −3/5, 4/5⟩`
    : model.nHat
      ? `n̂ = (1 / ${formatQuantity(model.nMag)}) ${formatVec(n)} = ${formatVec(model.nHat)}`
      : "n̂ is undefined because the edges do not span a panel.";
  const cosLine =
    model.cosTheta === null
      ? "cos θ is undefined because the sun vector has length 0."
      : model.isCaseStudy
        ? "cos θ = (n · s) / (|n| |s|) = 72 / (15 × 5) = 72/75 = 24/25"
        : `cos θ = (n · s) / (|n| |s|) = ${formatQuantity(model.dot)} / (${formatQuantity(model.nMag)} × ${formatQuantity(model.sMag)}) = ${formatQuantity(model.cosTheta)}`;
  const thetaLine =
    model.thetaDeg === null ? "θ is undefined." : `θ = arccos(cos θ) ≈ ${formatQuantity(model.thetaDeg)}°`;
  const flatLines: string[] = [];
  if (model.flatCos === null) {
    flatLines.push("A flat roof cannot be compared until the sun has a direction.");
  } else if (model.isCaseStudy) {
    flatLines.push("k = ⟨0, 0, 1⟩");
    flatLines.push("k · ŝ = 3/5");
    flatLines.push("(24/25) / (3/5) = 8/5 = 1.60");
  } else {
    flatLines.push("k = ⟨0, 0, 1⟩");
    flatLines.push(`k · ŝ = ${formatQuantity(model.flatCos)}`);
    flatLines.push(
      model.gain === null
        ? "The ratio is not used: the sun misses the front, or it also misses a flat roof."
        : `cos θ / (k · ŝ) = ${formatQuantity(model.gain)}`,
    );
  }

  const tiltLines = model.tiltAgrees
    ? [
        model.isCaseStudy
          ? "α = β = arctan(3/4), and sin(α + β) = sin(2α) = 2 × (3/5) × (4/5) = 24/25"
          : `sin(α + β) = ${formatQuantity(model.cosTheta ?? 0)}, the same value as cos θ`,
      ]
    : [];

  return [
    {
      id: "corners",
      title: "Corners of the glass",
      lines: [
        "x east, y north, z up, in metres",
        `A = ${formatVec(model.a)}`,
        `B = ${formatVec(model.b)}`,
        `D = ${formatVec(model.d)}`,
        `C = B + v = ${formatVec(model.c)}`,
      ],
      note: "These four points are the corners of one rectangular panel. A is the local origin, not a point on a map.",
    },
    {
      id: "edges",
      title: "Edges, by subtraction",
      lines: [
        `u = B − A = ${formatVec(model.b)} − ${formatVec(model.a)} = ${formatVec(u)}`,
        `v = D − A = ${formatVec(model.d)} − ${formatVec(model.a)} = ${formatVec(v)}`,
        `|u| = ${formatQuantity(mag(u))} m`,
        `|v| = ${formatQuantity(mag(v))} m`,
      ],
      note: "u lies along the eaves. v runs from the eaves up the slope. Subtraction turns two corner positions into a direction in the glass.",
    },
    {
      id: "right-angle",
      title: "Right angle, by a dot product",
      lines: [
        `u · v = ${paren(u.x)}·${paren(v.x)} + ${paren(u.y)}·${paren(v.y)} + ${paren(u.z)}·${paren(v.z)} = ${formatQuantity(model.edgeDot)}`,
      ],
      note: "The dot product is zero, so the edges are perpendicular and the panel is a rectangle. That happens because v has no east component: the eaves stay east–west.",
    },
    {
      id: "cross",
      title: "Normal, by the cross product",
      lines: [
        "n = u × v",
        `x = ${paren(u.y)}·${paren(v.z)} − ${paren(u.z)}·${paren(v.y)} = ${formatQuantity(n.x)}`,
        `y = −( ${paren(u.x)}·${paren(v.z)} − ${paren(u.z)}·${paren(v.x)} ) = ${formatQuantity(n.y)}`,
        `z = ${paren(u.x)}·${paren(v.y)} − ${paren(u.y)}·${paren(v.x)} = ${formatQuantity(n.z)}`,
        `n = ${formatVec(n)}`,
        `u · n = ${formatQuantity(dot(u, n))}`,
        `v · n = ${formatQuantity(dot(v, n))}`,
      ],
      note: "n is perpendicular to the glass. The sign of the north component says which way the front faces: negative looks south, positive looks north. The upward component says the front still sees the sky.",
    },
    {
      id: "area",
      title: "Area, from the length of the normal",
      lines: [
        `|n| = |east| √(north² + rise²) = ${formatLengthFromParts(input.east, input.north, input.rise, model.nMag)}`,
        `Area = |u × v| = ${formatQuantity(model.area)} m²`,
      ],
      note: "For any parallelogram the area is the length of the cross product. Here the right angle makes that length equal to |u| times |v|.",
    },
    {
      id: "unit",
      title: "Unit normal, by scalar multiplication",
      lines: [unitLine],
      note: "Dividing by the length keeps the direction and throws away the area. The angle with the sun should not change if the panel is measured in centimetres instead of metres.",
    },
    {
      id: "sun",
      title: "Sun direction, by addition",
      lines: [
        `s = ${formatVec(model.sEast)} + ${formatVec(model.sNorth)} + ${formatVec(model.sUp)}`,
        `s = ${formatVec(s)}`,
        `|s| = ${formatQuantity(model.sMag)}`,
      ],
      note: "s points from the panel toward the sun. It is the sum of an east piece, a north piece and an upward piece. Only the direction matters, so a longer arrow is the same sun.",
    },
    {
      id: "angle",
      title: "Alignment, by the dot product",
      lines: [
        `n · s = ${paren(n.x)}·${paren(s.x)} + ${paren(n.y)}·${paren(s.y)} + ${paren(n.z)}·${paren(s.z)} = ${formatQuantity(model.dot)}`,
        cosLine,
        thetaLine,
        model.frontShare === null
          ? "Front-face share is undefined."
          : model.isCaseStudy
            ? "Front-face share = max(cos θ, 0) = 24/25"
            : `Front-face share = max(cos θ, 0) = ${formatQuantity(model.frontShare)}`,
      ],
      note: "cos θ is the share of a direct beam that lands perpendicular to the glass. Positive means the sun is on the front. Zero means the beam skims the surface. Negative means the sun is behind the panel, and the front-face share is taken to be zero.",
    },
    {
      id: "flat",
      title: "Compare with a flat roof",
      lines: flatLines,
      note: "A flat roof has normal k = ⟨0, 0, 1⟩. The ratio says how many times more of this same direct beam the tilted panel takes, compared with lying flat.",
    },
    ...(tiltLines.length
      ? [
          {
            id: "tilt-check",
            title: "Check against the south-facing tilt rule",
            lines: tiltLines,
            note: "When the sun is due south and the panel faces south, PVEducation’s sin(α + β) is the same number as this dot product. α is the sun’s elevation and β is the tilt from horizontal.",
          },
        ]
      : []),
  ];
}
