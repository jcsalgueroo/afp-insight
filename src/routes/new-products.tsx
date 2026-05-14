import { createFileRoute } from "@tanstack/react-router";
import { NewProducts } from "@/components/views/NewProducts";

export const Route = createFileRoute("/new-products")({
  head: () => ({
    meta: [
      { title: "New Products — AFP Portfolio Intelligence" },
      {
        name: "description",
        content:
          "ETFs and Mutual Funds that appeared after December 2025 with YTD flows and manager aggregation.",
      },
    ],
  }),
  component: NewProducts,
});