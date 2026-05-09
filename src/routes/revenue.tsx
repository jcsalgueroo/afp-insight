import { createFileRoute } from "@tanstack/react-router";
import { RevenueFeeAnalytics } from "@/components/views/RevenueFeeAnalytics";

export const Route = createFileRoute("/revenue")({
  head: () => ({
    meta: [
      { title: "Revenue & Fees Analytics — AFP Portfolio Intelligence" },
      {
        name: "description",
        content: "Fee economics, RRR and competitive positioning across managers and AFPs.",
      },
    ],
  }),
  component: RevenueFeeAnalytics,
});