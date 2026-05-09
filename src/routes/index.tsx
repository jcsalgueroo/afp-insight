import { createFileRoute } from "@tanstack/react-router";
import { Scorecard } from "@/components/views/Scorecard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Executive Scorecard — AFP Portfolio Intelligence" },
      { name: "description", content: "BlackRock RRR, AUM and NNB across the AFP institutional market." },
    ],
  }),
  component: Index,
});

function Index() {
  return <Scorecard />;
}
