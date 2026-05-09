import { createFileRoute } from "@tanstack/react-router";
import { Securities } from "@/components/views/Securities";

export const Route = createFileRoute("/securities")({
  head: () => ({
    meta: [
      { title: "Security Detail — AFP Portfolio Intelligence" },
      { name: "description", content: "Full holdings ledger with sortable, searchable detail." },
    ],
  }),
  component: Securities,
});