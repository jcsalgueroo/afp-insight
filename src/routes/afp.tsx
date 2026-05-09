import { createFileRoute } from "@tanstack/react-router";
import { AFPDeepDive } from "@/components/views/AFPDeepDive";

export const Route = createFileRoute("/afp")({
  head: () => ({
    meta: [
      { title: "AFP Deep Dive — AFP Portfolio Intelligence" },
      { name: "description", content: "Per-AFP composition and displacement opportunities." },
    ],
  }),
  component: AFPDeepDive,
});