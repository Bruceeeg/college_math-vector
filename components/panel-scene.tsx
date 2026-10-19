"use client";

import { Line, OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { BufferAttribute, BufferGeometry, CanvasTexture, DoubleSide, Quaternion, Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { mag, type PanelModel, type Vec3 } from "@/lib/panel";

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

function Label({
  text,
  color,
  position,
}: {
  text: string;
  color: string;
  position: [number, number, number];
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return new CanvasTexture(canvas);
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(248, 250, 252, 0.94)";
    ctx.fillRect(4, 8, 120, 48);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 8, 120, 48);
    ctx.fillStyle = color;
    ctx.font = "600 36px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 64, 32);
    const next = new CanvasTexture(canvas);
    next.needsUpdate = true;
    return next;
  }, [text, color]);

  useEffect(() => {
    return () => texture.dispose();
  }, [texture]);

  return (
    <sprite position={position} scale={[0.62, 0.31, 1]}>
      <spriteMaterial map={texture} transparent depthTest={false} />
    </sprite>
  );
}

function Arrow({
  from,
  dir,
  color,
  label,
  length,
  labelAt = "tip",
}: {
  from: Vec3;
  dir: Vec3;
  color: string;
  label: string;
  length: number;
  labelAt?: "tip" | "mid";
}) {
  if (length < 0.08 || mag(dir) < 1e-8) {
    return null;
  }
  const direction = new Vector3(dir.x, dir.z, dir.y).normalize();
  const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction);
  const head = Math.min(0.32, length * 0.24);
  const shaft = Math.max(length - head, 0.04);
  const origin = toThree(from);

  return (
    <group position={origin} quaternion={quaternion}>
      <mesh position={[0, shaft / 2, 0]}>
        <cylinderGeometry args={[0.03, 0.03, shaft, 14]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, shaft + head / 2, 0]}>
        <coneGeometry args={[0.09, head, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Label
        text={label}
        color={color}
        position={[0.42, labelAt === "mid" ? length * 0.55 : length + 0.08, 0]}
      />
    </group>
  );
}

function PanelGlass({ model, color }: { model: PanelModel; color: string }) {
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
      <meshStandardMaterial color={color} side={DoubleSide} transparent opacity={0.92} />
    </mesh>
  );
}

function CameraFrame() {
  const camera = useThree((state) => state.camera);
  const controls = useRef<OrbitControlsImpl>(null);

  useLayoutEffect(() => {
    camera.position.set(9.6, 7.4, -8.8);
    controls.current?.target.set(1.5, 1.35, 2);
    controls.current?.update();
  }, [camera]);

  return (
    <OrbitControls ref={controls} enablePan={false} maxDistance={22} minDistance={4.5} />
  );
}

function RoofScene({
  model,
  show,
}: {
  model: PanelModel;
  show: { u: boolean; v: boolean; n: boolean; s: boolean };
}) {
  const center = centroid(model);
  const loop = [model.a, model.b, model.c, model.d, model.a].map(toThree);
  const lit = (model.cosTheta ?? 0) > 0.02;
  const behind = (model.cosTheta ?? 0) < -0.02;
  const glass = behind ? "#dbe4ef" : lit ? "#f6e7c1" : "#e7e5e4";
  const corners: { name: string; at: Vec3 }[] = [
    { name: "A", at: model.a },
    { name: "B", at: model.b },
    { name: "C", at: model.c },
    { name: "D", at: model.d },
  ];

  return (
    <>
      <color attach="background" args={["#f8fafc"]} />
      <ambientLight intensity={0.78} />
      <directionalLight position={[7, 11, 5]} intensity={1.15} />
      <gridHelper args={[12, 12, "#cbd5e1", "#e9eef5"]} />
      <group position={[1.1, 0, -2.3]}>
        <Line points={[[0, 0.02, 0], [1.7, 0.02, 0]]} color="#1e3a5f" lineWidth={1.5} />
        <Line points={[[0, 0.02, 0], [0, 1.7, 0]]} color="#a16207" lineWidth={1.5} />
        <Line points={[[0, 0.02, 0], [0, 0.02, 1.7]]} color="#0f766e" lineWidth={1.5} />
        <Label text="east" color="#1e3a5f" position={[2.15, 0.2, 0]} />
        <Label text="up" color="#a16207" position={[0.15, 2.05, 0]} />
        <Label text="north" color="#0f766e" position={[0, 0.2, 2.15]} />
      </group>
      <PanelGlass model={model} color={glass} />
      <Line points={loop} color="#1e3a5f" lineWidth={2} />
      {corners.map((corner) => {
        const dx = corner.at.x - center.x;
        const dy = corner.at.z - center.z;
        const dz = corner.at.y - center.y;
        const span = Math.hypot(dx, dy, dz) || 1;
        const [x, y, z] = toThree(corner.at);
        return (
          <Label
            key={corner.name}
            text={corner.name}
            color="#334155"
            position={[x + (dx / span) * 0.42, y + (dy / span) * 0.42, z + (dz / span) * 0.42]}
          />
        );
      })}
      {show.u ? (
        <Arrow from={model.a} dir={model.u} length={mag(model.u)} color="#1e3a5f" label="u" labelAt="mid" />
      ) : null}
      {show.v ? (
        <Arrow from={model.a} dir={model.v} length={mag(model.v)} color="#0f766e" label="v" labelAt="mid" />
      ) : null}
      {show.n && model.nHat ? (
        <Arrow from={center} dir={model.nHat} length={2.6} color="#a16207" label="n" />
      ) : null}
      {show.s && model.sHat ? (
        <Arrow from={center} dir={model.sHat} length={3.3} color="#c2410c" label="s" />
      ) : null}
      <CameraFrame />
    </>
  );
}

export function PanelScene({
  model,
  show,
}: {
  model: PanelModel;
  show: { u: boolean; v: boolean; n: boolean; s: boolean };
}) {
  return (
    <Canvas camera={{ position: [9.6, 7.4, -8.8], fov: 38 }} dpr={[1, 1.75]}>
      <RoofScene model={model} show={show} />
    </Canvas>
  );
}
