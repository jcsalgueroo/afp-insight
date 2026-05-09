import { createFileRoute } from "@tanstack/react-router";
import { Flows } from "@/components/views/Flows";

export const Route = createFileRoute("/flows")({
  head: () => ({
    meta: [
      { title: "Flows & Fees — AFP Portfolio Intelligence" },
      { name: "description", content: "NNB flows, performance and fee dynamics across managers." },
    ],
  }),
  component: Flows,
});