import { createFileRoute } from "@tanstack/react-router";
import { ProductPenetration } from "@/components/views/ProductPenetration";

export const Route = createFileRoute("/penetration")({
  head: () => ({
    meta: [
      { title: "Product Penetration — AFP Portfolio Intelligence" },
      {
        name: "description",
        content: "BlackRock/iShares market share heatmap by Category and AFP, plus weak-cell securities.",
      },
    ],
  }),
  component: ProductPenetration,
});
