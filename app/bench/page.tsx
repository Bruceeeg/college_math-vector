import type { Metadata } from "next";

import { PanelBench } from "@/components/panel-bench";

export const metadata: Metadata = {
  title: "Solar panel",
  description: "Interactive vector calculation for the orientation of a rooftop solar panel.",
};

export default function BenchPage() {
  return <PanelBench />;
}
