import { useEffect } from "react";
import { useDataLoader } from "@/lib/data-loader";
import { useDashboard } from "@/lib/dashboard-store";
import { MONTHS } from "@/lib/mock-data";

export function DataGate({ children }: { children: React.ReactNode }) {
  const { status, error, load } = useDataLoader();
  const setDate = useDashboard((s) => s.setDate);
  const date = useDashboard((s) => s.date);

  useEffect(() => {
    if (status === "idle") load();
  }, [status, load]);

  // Once data is ready, default the dashboard to the most recent month.
  useEffect(() => {
    if (status === "ready" && (!date || !MONTHS.includes(date))) {
      const latest = MONTHS[MONTHS.length - 1];
      if (latest) setDate(latest);
    }
  }, [status, date, setDate]);

  if (status === "error") {
    return (
      <div className="flex h-[60vh] items-center justify-center px-6">
        <div className="max-w-md text-center border border-negative/30 bg-negative/5 rounded-md p-6">
          <h2 className="text-base font-semibold text-foreground">
            Couldn't load live AFP data
          </h2>
          <p className="mt-2 text-sm text-muted-foreground break-words">
            {error}
          </p>
          <button
            onClick={() => load()}
            className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (status !== "ready" || !date) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        <p className="text-sm">Loading live AFP data…</p>
      </div>
    );
  }

  return <>{children}</>;
}