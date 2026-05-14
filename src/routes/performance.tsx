import { createFileRoute } from "@tanstack/react-router";
import { PerformanceAnalytics } from "@/components/views/PerformanceAnalytics";

export const Route = createFileRoute("/performance")({
  head: () => ({
    meta: [
      { title: "Performance Analytics — AFP Portfolio Intelligence" },
      { name: "description", content: "Cumulative and cross-sectional portfolio performance across AFPs." },
    ],
  }),
  component: PerformanceAnalytics,
});
