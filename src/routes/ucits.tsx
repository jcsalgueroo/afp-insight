import { createFileRoute } from "@tanstack/react-router";
import { UcitsSnapshot } from "@/components/views/UcitsSnapshot";

export const Route = createFileRoute("/ucits")({
  head: () => ({
    meta: [
      { title: "UCITS Snapshot — AFP Portfolio Intelligence" },
      {
        name: "description",
        content:
          "US (US-domiciled) vs UCITS (IE/LU-domiciled) composition, flows and manager share across AFPs.",
      },
    ],
  }),
  component: UcitsSnapshot,
});
