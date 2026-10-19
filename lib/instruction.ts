export const INSTRUCTION_PARAGRAPHS = [
  "A solar panel is a flat rectangle, so one tilt angle is not enough: the same tilt can face south or east. This bench uses a local roof frame, with x east, y north and z up, in metres. The case-study corners are A = ⟨0,0,0⟩, B = ⟨3,0,0⟩, D = ⟨0,4,3⟩ and C = ⟨3,4,3⟩. The glass is the rectangle spanned by those corners. Its eaves run east-west, and it rises toward the north.",
  "The edges come from subtraction. u = B − A = ⟨3,0,0⟩ lies along the eaves, and v = D − A = ⟨0,4,3⟩ climbs the slope. Their dot product is zero, so the corners are right angles and the slope is 5 m long. The cross product n = u × v = ⟨0,−9,12⟩ is orthogonal to both edges. That is the direction the front faces: south, because the north component is negative, and toward the sky, because the third component is positive. The area is |n| = 15 m². Scalar multiplication by 1/15 gives the unit normal ⟨0,−3/5,4/5⟩.",
  "The sun is the sum s = ⟨0,−4,0⟩ + ⟨0,0,3⟩ = ⟨0,−4,3⟩. It points south and up, with length 5. Then n · s = 72 and cos θ = 72/(15 × 5) = 24/25, about 16.3°. The positive sign means the sun is on the front. That cosine is the share of a direct beam landing perpendicular to the glass. A flat roof, with normal ⟨0,0,1⟩, reaches only 3/5, so the tilt collects 8/5 times as large a share. For this due-south sun, sin(α + β) gives the same 24/25, since both the elevation and the tilt are arctan(3/4).",
  "Moving the six inputs redraws the arrows and repeats these steps. The eaves stay east-west, the glass stays one rectangle, and one vector stands for the sun. Clouds, reflection and the path of the sun through the day are left out. A negative dot product means the sun is behind the glass, and the front-face share is set to zero. The vector rules come from OpenStax Calculus Volume 3, sections 2.3 and 2.4. The sunlight reading follows the PVEducation notes on a tilted surface.",
];

export const SOURCES = [
  {
    id: "openstax",
    text: "OpenStax. Calculus Volume 3. Section 2.3, The Dot Product, and Section 2.4, The Cross Product.",
    href: "https://openstax.org/books/calculus-volume-3/pages/2-4-the-cross-product",
  },
  {
    id: "pveducation",
    text: "Honsberg, C., and Bowden, S. Solar radiation on a tilted surface. PVEducation.",
    href: "https://www.pveducation.org/pvcdrom/properties-of-sunlight/solar-radiation-on-a-tilted-surface",
  },
] as const;

export function instructionWordCount(): number {
  return INSTRUCTION_PARAGRAPHS.join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}
