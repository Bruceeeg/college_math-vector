import assert from "node:assert/strict";
import { test } from "node:test";

import { instructionWordCount } from "./instruction.ts";
import {
  CASE_STUDY,
  cross,
  dot,
  mag,
  PRESETS,
  solvePanel,
  sub,
  vec,
} from "./panel.ts";

const close = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

test("case study matches the hand calculation", () => {
  const model = solvePanel(CASE_STUDY);
  assert.deepEqual(model.u, vec(3, 0, 0));
  assert.deepEqual(model.v, vec(0, 4, 3));
  assert.deepEqual(model.n, vec(0, -9, 12));
  assert.deepEqual(model.c, vec(3, 4, 3));
  assert.equal(model.edgeDot, 0);
  assert.equal(model.nMag, 15);
  assert.equal(model.area, 15);
  assert.equal(mag(model.v), 5);
  assert.equal(model.dot, 72);
  assert.ok(model.cosTheta !== null && close(model.cosTheta, 24 / 25));
  const expectedTheta = (Math.acos(24 / 25) * 180) / Math.PI;
  assert.ok(model.thetaDeg !== null && close(model.thetaDeg, expectedTheta, 1e-6));
  assert.ok(model.flatCos !== null && close(model.flatCos, 3 / 5));
  assert.ok(model.gain !== null && close(model.gain, 8 / 5));
  assert.equal(model.frontShare !== null && close(model.frontShare, 24 / 25), true);
  assert.equal(dot(model.u, model.n), 0);
  assert.equal(dot(model.v, model.n), 0);
  assert.equal(model.tiltAgrees, true);
  assert.equal(model.isCaseStudy, true);

  const text = model.steps.flatMap((step) => step.lines).join("\n");
  assert.match(text, /24\/25/);
  assert.match(text, /⟨0, −9, 12⟩/);
  assert.match(text, /⟨0, −3\/5, 4\/5⟩/);
  assert.match(text, /8\/5/);
});

test("cross product area agrees with base times height", () => {
  const u = vec(3, 0, 0);
  const v = vec(0, 4, 3);
  assert.equal(mag(cross(u, v)), mag(u) * mag(v) * Math.sin(Math.PI / 2));
});

test("flat roof keeps only the upward part of the sun", () => {
  const model = solvePanel(PRESETS.flat.input);
  assert.deepEqual(model.n, vec(0, 0, 12));
  assert.equal(model.area, 12);
  assert.ok(model.cosTheta !== null && close(model.cosTheta, 0.6));
  assert.equal(model.statusKind, "ok");
});

test("a sun from the north is behind a south-facing panel", () => {
  const model = solvePanel(PRESETS.behind.input);
  assert.equal(model.dot, -45);
  assert.ok(model.cosTheta !== null && close(model.cosTheta, -0.6));
  assert.equal(model.frontShare, 0);
  assert.equal(model.statusKind, "warn");
  assert.equal(model.tiltAgrees, false);
});

test("subtraction builds the slope edge", () => {
  assert.deepEqual(sub(vec(0, 4, 3), vec(0, 0, 0)), vec(0, 4, 3));
});

test("a zero sun has no angle", () => {
  const model = solvePanel({ ...CASE_STUDY, sunEast: 0, sunNorth: 0, sunUp: 0 });
  assert.equal(model.cosTheta, null);
  assert.equal(model.thetaDeg, null);
  assert.equal(model.statusKind, "neutral");
});

test("sin of elevation plus tilt matches the case-study cosine", () => {
  const alpha = Math.atan2(3, 4);
  const beta = Math.atan2(3, 4);
  assert.ok(close(Math.sin(alpha + beta), 24 / 25));
});

test("written instruction stays inside 200 to 400 words", () => {
  const words = instructionWordCount();
  assert.ok(words >= 200, `too short: ${words}`);
  assert.ok(words <= 400, `too long: ${words}`);
});
