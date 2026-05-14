import { createFileRoute } from "@tanstack/react-router";
import { Targets } from "@/components/views/Targets";

export const Route = createFileRoute("/targets")({
  head: () => ({
    meta: [
      { title: "Targets — AFP Portfolio Intelligence" },
      { name: "description", content: "Displacement opportunities across AFPs." },
    ],
  }),
  component: Targets,
});
