import { formatQuantity, formatVec, type PanelModel, type Vec3 } from "@/lib/panel";

function arrowPoints(x1: number, y1: number, x2: number, y2: number) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const size = 8;
  const left = angle + Math.PI * 0.84;
  const right = angle - Math.PI * 0.84;
  return `${x2},${y2} ${x2 + size * Math.cos(left)},${y2 + size * Math.sin(left)} ${x2 + size * Math.cos(right)},${y2 + size * Math.sin(right)}`;
}

export function RoofSlice({
  model,
  idPrefix,
}: {
  model: PanelModel;
  idPrefix: string;
}) {
  const north = model.input.north;
  const rise = model.input.rise;
  const width = 360;
  const height = 230;
  const padL = 42;
  const padR = 18;
  const padT = 18;
  const padB = 32;
  const midN = north / 2;
  const midU = rise / 2;
  const normalPlane = Math.hypot(model.n.y, model.n.z);
  const sunPlane = Math.hypot(model.s.y, model.s.z);
  const draw = 1.8;
  const normalTip: [number, number] =
    normalPlane < 1e-8
      ? [midN, midU]
      : [midN + (model.n.y / normalPlane) * draw, midU + (model.n.z / normalPlane) * draw];
  const sunTip: [number, number] =
    sunPlane < 1e-8
      ? [midN, midU]
      : [midN + (model.s.y / sunPlane) * draw, midU + (model.s.z / sunPlane) * draw];
  const samples: Array<[number, number]> = [
    [0, 0],
    [north, rise],
    normalTip,
    sunTip,
  ];
  let minN = 0;
  let maxN = 1;
  let minU = 0;
  let maxU = 1;
  for (const [n, u] of samples) {
    minN = Math.min(minN, n);
    maxN = Math.max(maxN, n);
    minU = Math.min(minU, u);
    maxU = Math.max(maxU, u);
  }
  const scale = Math.min((width - padL - padR) / (maxN - minN || 1), (height - padT - padB) / (maxU - minU || 1));
  const X = (n: number) => padL + (n - minN) * scale;
  const Y = (u: number) => height - padB - (u - minU) * scale;
  const origin = { x: X(0), y: Y(0) };
  const edge = { x: X(north), y: Y(rise) };
  const mid = { x: X(midN), y: Y(midU) };
  const nTip = { x: X(normalTip[0]), y: Y(normalTip[1]) };
  const sTip = { x: X(sunTip[0]), y: Y(sunTip[1]) };
  const axisN = X(Math.max(maxN, 0.8));
  const axisU = Y(Math.max(maxU, 0.8));

  return (
    <figure>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${idPrefix}-title ${idPrefix}-desc`} className="h-auto w-full bg-paper">
        <title id={`${idPrefix}-title`}>North-up slice of the panel</title>
        <desc id={`${idPrefix}-desc`}>
          The slope edge v, the panel normal, and the north-up part of the sun vector.
        </desc>
        <line x1={origin.x} y1={origin.y} x2={axisN} y2={origin.y} stroke="#94a3b8" strokeWidth="1" />
        <line x1={origin.x} y1={origin.y} x2={origin.x} y2={axisU} stroke="#94a3b8" strokeWidth="1" />
        <text x={axisN - 2} y={origin.y - 6} textAnchor="end" fill="#475569" fontSize="11">
          north
        </text>
        <text x={origin.x + 6} y={axisU + 4} fill="#475569" fontSize="11">
          up
        </text>
        <line x1={origin.x} y1={origin.y} x2={edge.x} y2={edge.y} stroke="#0f766e" strokeWidth="3" />
        <polygon points={arrowPoints(origin.x, origin.y, edge.x, edge.y)} fill="#0f766e" />
        <text x={(origin.x + edge.x) / 2 + 8} y={(origin.y + edge.y) / 2 + 14} fill="#0f766e" fontSize="12">
          v
        </text>
        {normalPlane >= 1e-8 ? (
          <>
            <line x1={mid.x} y1={mid.y} x2={nTip.x} y2={nTip.y} stroke="#a16207" strokeWidth="2" />
            <polygon points={arrowPoints(mid.x, mid.y, nTip.x, nTip.y)} fill="#a16207" />
            <text x={nTip.x + 6} y={nTip.y + 4} fill="#a16207" fontSize="12">
              n
            </text>
          </>
        ) : null}
        {sunPlane >= 1e-8 ? (
          <>
            <line x1={mid.x} y1={mid.y} x2={sTip.x} y2={sTip.y} stroke="#c2410c" strokeWidth="2" />
            <polygon points={arrowPoints(mid.x, mid.y, sTip.x, sTip.y)} fill="#c2410c" />
            <text x={sTip.x + 6} y={sTip.y - 6} fill="#c2410c" fontSize="12">
              s
            </text>
          </>
        ) : null}
      </svg>
      <figcaption className="mt-1 text-[12px] leading-5 text-quiet">
        North–up slice. u points east, out of this picture.{" "}
        {Math.abs(model.input.sunEast) > 0
          ? `The sun also has an east component of ${formatQuantity(model.input.sunEast)}, which this slice does not show.`
          : "This sun has no east component, so the slice shows its whole direction."}
      </figcaption>
    </figure>
  );
}

export function SunComponents({ model }: { model: PanelModel }) {
  const parts: { label: string; vector: Vec3; color: string }[] = [
    { label: "east", vector: model.sEast, color: "#1e3a5f" },
    { label: "north", vector: model.sNorth, color: "#0f766e" },
    { label: "up", vector: model.sUp, color: "#a16207" },
  ];
  const max = Math.max(1, ...parts.map((part) => Math.abs(part.vector.x + part.vector.y + part.vector.z)));

  return (
    <div>
      <p className="font-mono text-[12px] leading-6 text-ink">
        s = {formatVec(model.sEast)} + {formatVec(model.sNorth)} + {formatVec(model.sUp)} = {formatVec(model.s)}
      </p>
      {parts.map((part) => {
        const value = part.vector.x + part.vector.y + part.vector.z;
        const width = `${(Math.abs(value) / max) * 50}%`;
        return (
          <div key={part.label} className="sun-row">
            <span className="font-mono text-[11px] text-quiet">{part.label}</span>
            <div className="sun-track" aria-hidden="true">
              <span className="sun-zero" />
              <span
                className="sun-fill"
                style={
                  value >= 0
                    ? { left: "50%", width, background: part.color }
                    : { right: "50%", width, background: part.color }
                }
              />
            </div>
            <span className="text-right font-mono text-[11px] text-ink tabular-nums">{formatQuantity(value)}</span>
          </div>
        );
      })}
    </div>
  );
}
