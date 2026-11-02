"use client";

import { Line, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  Group,
  Quaternion,
  Sprite,
  Vector3,
} from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { VECTOR_COLOR } from "@/lib/colors";
import { mag, type PanelModel, type StepFocus, type Vec3 } from "@/lib/panel";

export type SceneVisibility = {
  vertices: boolean;
  edges: boolean;
  normal: boolean;
  sun: boolean;
  axes: boolean;
};

type RegisteredLabel = {
  anchor: Vector3;
  sprite: Sprite;
};

function toThree(v: Vec3): [number, number, number] {
  return [v.x, v.z, v.y];
}

function centroid(model: PanelModel): Vec3 {
  return {
    x: (model.a.x + model.b.x + model.c.x + model.d.x) / 4,
    y: (model.a.y + model.b.y + model.c.y + model.d.y) / 4,
    z: (model.a.z + model.b.z + model.c.z + model.d.z) / 4,
  };
}

function useLabelLayout(registry: Map<string, RegisteredLabel>) {
  const camera = useThree((state) => state.camera);
  const scratch = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const items = [...registry.values()];
    if (items.length === 0) return;
    const points = items.map((item) => {
      scratch.copy(item.anchor).project(camera);
      return { item, x: scratch.x, y: scratch.y, z: scratch.z, ox: scratch.x, oy: scratch.y };
    });
    const minDist = 0.08;
    for (let pass = 0; pass < 12; pass += 1) {
      for (let i = 0; i < points.length; i += 1) {
        for (let j = i + 1; j < points.length; j += 1) {
          const dx = points[j].x - points[i].x;
          const dy = points[j].y - points[i].y;
          const dist = Math.hypot(dx, dy);
          if (dist >= minDist) continue;
          const gap = dist < 1e-4 ? minDist : dist;
          const push = (minDist - gap) / 2;
          const ux = dist < 1e-4 ? 1 : dx / gap;
          const uy = dist < 1e-4 ? 0 : dy / gap;
          points[i].x -= ux * push;
          points[i].y -= uy * push;
          points[j].x += ux * push;
          points[j].y += uy * push;
        }
      }
    }
    const limit = 0.14;
    for (const point of points) {
      const behind = point.z < -1 || point.z > 1;
      point.item.sprite.visible = !behind;
      if (behind) continue;
      const dx = Math.max(-limit, Math.min(limit, point.x - point.ox));
      const dy = Math.max(-limit, Math.min(limit, point.y - point.oy));
      scratch.set(point.ox + dx, point.oy + dy, point.z);
      scratch.unproject(camera);
      point.item.sprite.position.copy(scratch);
    }
  }, 1);
}

function Label({
  id,
  text,
  color,
  position,
  size = "md",
  fixed = false,
  registry,
}: {
  id: string;
  text: string;
  color: string;
  position: [number, number, number];
  size?: "md" | "xs";
  fixed?: boolean;
  registry: Map<string, RegisteredLabel>;
}) {
  const sprite = useRef<Sprite>(null);
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    const fontSize = 64;
    canvas.width = Math.ceil(Math.max(96, text.length * fontSize * 0.72));
    canvas.height = 96;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `600 ${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;
      ctx.lineWidth = 12;
      ctx.strokeStyle = "rgba(255,255,255,0.96)";
      ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
      ctx.fillStyle = color;
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    }
    const next = new CanvasTexture(canvas);
    next.needsUpdate = true;
    return next;
  }, [text, color]);

  useEffect(() => {
    return () => texture.dispose();
  }, [texture]);

  useLayoutEffect(() => {
    const spriteObj = sprite.current;
    if (fixed || !spriteObj) return;
    registry.set(id, { anchor: new Vector3(position[0], position[1], position[2]), sprite: spriteObj });
    return () => {
      const current = registry.get(id);
      if (current?.sprite === spriteObj) registry.delete(id);
    };
  }, [fixed, id, position[0], position[1], position[2], registry]);

  const scaleY = size === "xs" ? 0.055 : 0.2;
  const scaleX =
    size === "xs" ? Math.min(0.28, 0.045 + text.length * 0.028) : Math.min(0.92, 0.16 + text.length * 0.12);

  return (
    <sprite ref={sprite} position={position} scale={[scaleX, scaleY, 1]} frustumCulled={false} renderOrder={4}>
      <spriteMaterial map={texture} transparent depthTest={false} />
    </sprite>
  );
}

function worldPoint(from: Vec3, dir: Vec3, along: number, side: number): [number, number, number] {
  const direction = new Vector3(dir.x, dir.z, dir.y);
  if (direction.lengthSq() < 1e-10) return toThree(from);
  direction.normalize();
  const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction);
  const shifted = new Vector3(0.42 * side, along, 0).applyQuaternion(quaternion);
  const origin = new Vector3(...toThree(from));
  origin.add(shifted);
  return [origin.x, origin.y, origin.z];
}

function Arrow({
  from,
  dir,
  color,
  label,
  length,
  along,
  side,
  opacity,
  strong,
  showLabel,
  registry,
}: {
  from: Vec3;
  dir: Vec3;
  color: string;
  label: string;
  length: number;
  along: number;
  side: number;
  opacity: number;
  strong: boolean;
  showLabel: boolean;
  registry: Map<string, RegisteredLabel>;
}) {
  if (length < 0.08 || mag(dir) < 1e-8) return null;
  const direction = new Vector3(dir.x, dir.z, dir.y).normalize();
  const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction);
  const head = Math.min(strong ? 0.4 : 0.3, length * 0.22);
  const shaft = Math.max(length - head, 0.04);
  const radius = strong ? 0.05 : 0.028;

  return (
    <>
      <group position={toThree(from)} quaternion={quaternion}>
        <mesh position={[0, shaft / 2, 0]}>
          <cylinderGeometry args={[radius, radius, shaft, 14]} />
          <meshStandardMaterial color={color} transparent opacity={opacity} depthWrite={opacity > 0.8} />
        </mesh>
        <mesh position={[0, shaft + head / 2, 0]}>
          <coneGeometry args={[strong ? 0.12 : 0.085, head, 16]} />
          <meshStandardMaterial color={color} transparent opacity={opacity} depthWrite={opacity > 0.8} />
        </mesh>
      </group>
      {showLabel ? (
        <Label
          id={label}
          text={label}
          color={color}
          position={worldPoint(from, dir, along, side)}
          registry={registry}
        />
      ) : null}
    </>
  );
}

function AngleMark({
  origin,
  a,
  b,
  registry,
}: {
  origin: Vec3;
  a: Vec3;
  b: Vec3;
  registry: Map<string, RegisteredLabel>;
}) {
  const mark = useMemo(() => {
    const va = new Vector3(a.x, a.z, a.y).normalize();
    const vb = new Vector3(b.x, b.z, b.y).normalize();
    const axis = new Vector3().crossVectors(va, vb);
    const sine = axis.length();
    const angle = Math.atan2(sine, va.dot(vb));
    if (angle < 0.05 || sine < 1e-6) return null;
    axis.normalize();
    const radius = 1.15;
    const quaternion = new Quaternion();
    const base = toThree(origin);
    const points: [number, number, number][] = [];
    const count = 28;
    for (let i = 0; i <= count; i += 1) {
      quaternion.setFromAxisAngle(axis, (angle * i) / count);
      const point = va.clone().applyQuaternion(quaternion).multiplyScalar(radius);
      points.push([base[0] + point.x, base[1] + point.y, base[2] + point.z]);
    }
    quaternion.setFromAxisAngle(axis, angle / 2);
    const mid = va.clone().applyQuaternion(quaternion).multiplyScalar(radius + 0.32);
    return {
      points,
      label: [base[0] + mid.x, base[1] + mid.y, base[2] + mid.z] as [number, number, number],
    };
  }, [a, b, origin]);

  if (!mark) return null;
  return (
    <>
      <Line points={mark.points} color={VECTOR_COLOR.angle} lineWidth={2} />
      <Label id="theta" text="θ" color={VECTOR_COLOR.angle} position={mark.label} registry={registry} />
    </>
  );
}

function PanelGlass({ model, color, opacity }: { model: PanelModel; color: string; opacity: number }) {
  const geometry = useMemo(() => {
    const geo = new BufferGeometry();
    const corners = [model.a, model.b, model.c, model.d];
    const positions = new Float32Array(12);
    corners.forEach((corner, index) => {
      const [x, y, z] = toThree(corner);
      positions[index * 3] = x;
      positions[index * 3 + 1] = y;
      positions[index * 3 + 2] = z;
    });
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    geo.computeVertexNormals();
    return geo;
  }, [model.a, model.b, model.c, model.d]);

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} side={DoubleSide} transparent opacity={opacity} />
    </mesh>
  );
}

function CameraFrame() {
  const camera = useThree((state) => state.camera);
  const controls = useRef<OrbitControlsImpl>(null);

  useLayoutEffect(() => {
    camera.position.set(9.6, 7.4, -8.8);
    camera.lookAt(1.5, 1.35, 2);
    controls.current?.target.set(1.5, 1.35, 2);
    controls.current?.update();
  }, [camera]);

  return <OrbitControls ref={controls} enablePan={false} maxDistance={22} minDistance={4.5} />;
}

function CornerAxes({ registry }: { registry: Map<string, RegisteredLabel> }) {
  const camera = useThree((state) => state.camera);
  const group = useRef<Group>(null);
  const offset = useMemo(() => new Vector3(), []);
  const length = 0.36;

  useFrame(() => {
    const node = group.current;
    if (!node) return;
    offset.set(-1.15, -0.72, -3.1).applyQuaternion(camera.quaternion);
    node.position.copy(camera.position).add(offset);
  });

  return (
    <group ref={group}>
      <Line points={[[0, 0, 0], [length, 0, 0]]} color={VECTOR_COLOR.axis} lineWidth={1.5} />
      <Line points={[[0, 0, 0], [0, length, 0]]} color={VECTOR_COLOR.axis} lineWidth={1.5} />
      <Line points={[[0, 0, 0], [0, 0, length]]} color={VECTOR_COLOR.axis} lineWidth={1.5} />
      <Label
        id="axis-east"
        text="east"
        color={VECTOR_COLOR.axis}
        position={[length + 0.08, 0, 0]}
        size="xs"
        fixed
        registry={registry}
      />
      <Label
        id="axis-up"
        text="up"
        color={VECTOR_COLOR.axis}
        position={[0.02, length + 0.06, 0]}
        size="xs"
        fixed
        registry={registry}
      />
      <Label
        id="axis-north"
        text="north"
        color={VECTOR_COLOR.axis}
        position={[0, 0.02, length + 0.1]}
        size="xs"
        fixed
        registry={registry}
      />
    </group>
  );
}

function RoofScene({
  model,
  show,
  emphasis,
}: {
  model: PanelModel;
  show: SceneVisibility;
  emphasis: StepFocus | null;
}) {
  const registry = useMemo(() => new Map<string, RegisteredLabel>(), []);
  useLabelLayout(registry);
  const center = centroid(model);
  const loop = [model.a, model.b, model.c, model.d, model.a].map(toThree);
  const lit = (model.cosTheta ?? 0) > 0.02;
  const behind = (model.cosTheta ?? 0) < -0.02;
  const glass = behind ? "#dbe4ef" : lit ? "#f6e7c1" : "#e7e5e4";
  const showVertices = show.vertices || emphasis === "panel";
  const showEdges = show.edges || emphasis === "edges";
  const showNormal = show.normal || emphasis === "normal" || emphasis === "incidence";
  const showSun = show.sun || emphasis === "incidence";
  const vertexFocus = emphasis === null || emphasis === "panel";
  const edgeFocus = emphasis === null || emphasis === "edges";
  const normalFocus = emphasis === null || emphasis === "normal" || emphasis === "incidence";
  const sunFocus = emphasis === null || emphasis === "incidence";
  const corners: { name: string; at: Vec3 }[] = [
    { name: "A", at: model.a },
    { name: "B", at: model.b },
    { name: "C", at: model.c },
    { name: "D", at: model.d },
  ];

  return (
    <>
      <color attach="background" args={["#fbfcfe"]} />
      <ambientLight intensity={0.82} />
      <directionalLight position={[7, 11, 5]} intensity={1.05} />
      <gridHelper args={[12, 12, "#e2e8f0", "#eef2f6"]} />
      {show.axes ? <CornerAxes registry={registry} /> : null}
      <PanelGlass model={model} color={glass} opacity={emphasis ? 0.72 : 0.94} />
      <Line points={loop} color={emphasis === "panel" ? "#1e3a5f" : VECTOR_COLOR.outline} lineWidth={emphasis === "panel" ? 3 : 1.5} />
      {emphasis === "edges" ? (
        <>
          <Line points={[toThree(model.a), toThree(model.b)]} color={VECTOR_COLOR.u} lineWidth={4} />
          <Line points={[toThree(model.a), toThree(model.d)]} color={VECTOR_COLOR.v} lineWidth={4} />
        </>
      ) : null}
      {showVertices
        ? corners.map((corner) => {
            const dx = corner.at.x - center.x;
            const dy = corner.at.z - center.z;
            const dz = corner.at.y - center.y;
            const span = Math.hypot(dx, dy, dz) || 1;
            const [x, y, z] = toThree(corner.at);
            return (
              <group key={corner.name}>
                <mesh position={[x, y, z]}>
                  <sphereGeometry args={[vertexFocus ? 0.07 : 0.045, 16, 16]} />
                  <meshStandardMaterial color={VECTOR_COLOR.vertex} transparent opacity={vertexFocus ? 1 : 0.35} />
                </mesh>
                {vertexFocus ? (
                  <Label
                    id={corner.name}
                    text={corner.name}
                    color={VECTOR_COLOR.vertex}
                    position={[x + (dx / span) * 0.26, y + (dy / span) * 0.26, z + (dz / span) * 0.26]}
                    registry={registry}
                  />
                ) : null}
              </group>
            );
          })
        : null}
      {showEdges ? (
        <>
          <Arrow
            from={model.a}
            dir={model.u}
            length={mag(model.u)}
            color={VECTOR_COLOR.u}
            label="u"
            along={mag(model.u) * 0.58}
            side={1}
            opacity={edgeFocus ? 1 : 0.16}
            strong={emphasis === "edges"}
            showLabel={edgeFocus}
            registry={registry}
          />
          <Arrow
            from={model.a}
            dir={model.v}
            length={mag(model.v)}
            color={VECTOR_COLOR.v}
            label="v"
            along={mag(model.v) * 0.58}
            side={-1}
            opacity={edgeFocus ? 1 : 0.16}
            strong={emphasis === "edges"}
            showLabel={edgeFocus}
            registry={registry}
          />
        </>
      ) : null}
      {showNormal && model.nHat ? (
        <Arrow
          from={center}
          dir={model.nHat}
          length={2.6}
          color={VECTOR_COLOR.n}
          label="n"
          along={2.72}
          side={1}
          opacity={normalFocus ? 1 : 0.16}
          strong={emphasis === "normal" || emphasis === "incidence"}
          showLabel={normalFocus}
          registry={registry}
        />
      ) : null}
      {showSun && model.sHat ? (
        <Arrow
          from={center}
          dir={model.sHat}
          length={3.25}
          color={VECTOR_COLOR.s}
          label="s"
          along={3.38}
          side={-1}
          opacity={sunFocus ? 1 : 0.16}
          strong={emphasis === "incidence"}
          showLabel={sunFocus}
          registry={registry}
        />
      ) : null}
      {emphasis === "incidence" && model.nHat && model.sHat ? (
        <AngleMark origin={center} a={model.nHat} b={model.sHat} registry={registry} />
      ) : null}
      <CameraFrame />
    </>
  );
}

export function PanelScene({
  model,
  show,
  emphasis,
}: {
  model: PanelModel;
  show: SceneVisibility;
  emphasis: StepFocus | null;
}) {
  return (
    <Canvas camera={{ position: [9.6, 7.4, -8.8], fov: 38 }} dpr={[1, 1.75]}>
      <RoofScene model={model} show={show} emphasis={emphasis} />
    </Canvas>
  );
}
