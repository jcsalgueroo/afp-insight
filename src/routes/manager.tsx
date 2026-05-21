import { createFileRoute } from "@tanstack/react-router";
import { ManagerDeepDive } from "@/components/views/ManagerDeepDive";

export const Route = createFileRoute("/manager")({
  head: () => ({
    meta: [
      { title: "Manager Deep Dive — AFP Portfolio Intelligence" },
      { name: "description", content: "Per-manager AUM, NNB and RRR analytics across AFPs." },
    ],
  }),
  component: ManagerDeepDive,
});