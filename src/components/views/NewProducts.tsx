import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CHART_COLORS,
  aggregateNewProductsByManager,
  brandColor,
  formatBps,
  formatUSD,
  getNewProducts,
  type Bucket,
  type NewProductRow,
} from "@/lib/mock-data";
import { useDashboard } from "@/lib/dashboard-store";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

function CardShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card border border-border rounded-md shadow-sm flex flex-col">
      <header className="px-4 sm:px-5 py-3 border-b border-border">
        <h2 className="text-sm font-semibold uppercase tracking-wide">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </header>
      <div className="p-3 sm:p-4 flex-1">{children}</div>
    </section>
  );
}

function NewProductsTable({ rows }: { rows: NewProductRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-10">
        No new products in the selected month.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto -mx-4 sm:-mx-4">
      <table className="w-full text-sm">
        <thead className="bg-surface-alt">
          <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-2 font-medium">Ticker</th>
            <th className="px-4 py-2 font-medium">Manager</th>
            <th className="px-4 py-2 font-medium text-right">Fee</th>
            <th className="px-4 py-2 font-medium text-right">YTD NNB</th>
            <th className="px-4 py-2 font-medium text-right">YTD NNBF</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <HoverCard key={r.isin} openDelay={120} closeDelay={50}>
              <HoverCardTrigger asChild>
                <tr className="border-t border-border hover:bg-muted/50 cursor-default">
                  <td className="px-4 py-2 tabular-nums">
                    <div className="font-medium">{r.ticker}</div>
                    <div className="text-[11px] text-muted-foreground truncate max-w-[260px]">
                      {r.name}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{r.manager}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatBps(r.feeBps)}</td>
                  <td
                    className={cn(
                      "px-4 py-2 text-right tabular-nums font-medium",
                      r.ytdNnb < 0 ? "text-negative" : "text-positive",
                    )}
                  >
                    {formatUSD(r.ytdNnb)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-2 text-right tabular-nums",
                      r.ytdNnbf < 0 && "text-negative",
                    )}
                  >
                    {formatUSD(r.ytdNnbf)}
                  </td>
                </tr>
              </HoverCardTrigger>
              <HoverCardContent align="start" className="w-72">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground pb-1.5 border-b border-border">
                  YTD NNB by AFP — {r.ticker}
                </div>
                <div className="pt-2 space-y-1 text-xs">
                  {r.byAfp.length === 0 && (
                    <div className="text-muted-foreground">No AFP flows.</div>
                  )}
                  {r.byAfp.map((a) => (
                    <div key={a.AFP} className="flex items-center gap-2">
                      <span className="truncate">{a.AFP}</span>
                      <span
                        className={cn(
                          "ml-auto tabular-nums",
                          a.ytdNnb < 0 ? "text-negative" : "text-foreground",
                        )}
                      >
                        {formatUSD(a.ytdNnb)}
                      </span>
                    </div>
                  ))}
                </div>
              </HoverCardContent>
            </HoverCard>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ManagerBarChart({ rows }: { rows: NewProductRow[] }) {
  const data = useMemo(() => aggregateNewProductsByManager(rows), [rows]);
  if (data.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        No data to chart.
      </div>
    );
  }
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 28 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="Manager"
            stroke="#999"
            fontSize={11}
            angle={-25}
            textAnchor="end"
            interval={0}
            height={50}
          />
          <YAxis
            stroke="#999"
            fontSize={11}
            tickFormatter={(v) => formatUSD(v)}
            width={70}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            contentStyle={{ fontSize: 12, border: "1px solid #E5E5E5", borderRadius: 4 }}
            formatter={(v: number) => formatUSD(v)}
          />
          <Bar dataKey="NNB" isAnimationActive={false}>
            {data.map((d) => (
              <Cell
                key={d.Manager}
                fill={d.NNB < 0 ? CHART_COLORS.negative : brandColor(d.Manager)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Section({ bucket, label }: { bucket: Bucket; label: string }) {
  const { date } = useDashboard();
  const rows = useMemo(() => getNewProducts(date, bucket), [date, bucket]);
  return (
    <div className="space-y-4 min-w-0">
      <CardShell
        title={`New ${label}s`}
        subtitle={`${rows.length} ${label.toLowerCase()}${rows.length === 1 ? "" : "s"} not in Dec 2025 records`}
      >
        <NewProductsTable rows={rows} />
      </CardShell>
      <CardShell
        title={`${label} — YTD NNB by Manager`}
        subtitle="Aggregated YTD NNB across all new products in the table above"
      >
        <ManagerBarChart rows={rows} />
      </CardShell>
    </div>
  );
}

export function NewProducts() {
  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">New Products</h1>
        <p className="text-sm text-muted-foreground">
          ETFs and Mutual Funds that appeared after the December 2025 baseline, ranked by YTD NNB.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section bucket="ETF" label="ETF" />
        <Section bucket="Mutual Fund" label="Mutual Fund" />
      </div>
    </div>
  );
}