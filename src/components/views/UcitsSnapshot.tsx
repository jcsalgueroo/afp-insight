import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AFPS,
  CATEGORIES,
  DOMICILE_COLORS,
  brandColor,
  categoryColor,
  formatUSD,
  getDomicileCompositionSeries,
  getDomicileNnbByAfp,
  getDomicileShareByCategory,
  getUcitsEtfManagerShareByAfp,
  getUcitsNnbByCategory,
  type AFP,
  type AssetClassFilter,
  type Category,
} from "@/lib/mock-data";
import { useDashboard } from "@/lib/dashboard-store";
import { AfpFilterPopover } from "@/components/widgets/AfpFilterPopover";
import { MultiSelectPopover } from "@/components/widgets/MultiSelectPopover";
import { SegmentedToggle } from "@/components/widgets/SegmentedToggle";
import { cn } from "@/lib/utils";

const PERIOD_TOGGLE = [
  { value: "Month" as const, label: "Month" },
  { value: "YTD" as const, label: "YTD" },
] as const;

const ASSET_CLASS_TOGGLE = [
  { value: "All" as AssetClassFilter, label: "All" },
  { value: "Equity" as AssetClassFilter, label: "Equity" },
  { value: "Fixed Income" as AssetClassFilter, label: "FI" },
] as const;

function shortMonth(m: string) {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

function CardShell({
  title,
  subtitle,
  right,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "bg-card border border-border rounded-md shadow-sm flex flex-col",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-border flex-wrap">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide">{title}</h2>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">{right}</div>
      </header>
      <div className="p-3 sm:p-5 flex-1">{children}</div>
    </section>
  );
}

const tooltipStyle = {
  fontSize: 12,
  border: "1px solid #E5E5E5",
  borderRadius: 4,
} as const;

export function UcitsSnapshot() {
  const { date } = useDashboard();

  const [compAfps, setCompAfps] = useState<AFP[]>([]);
  const [nnbPeriod, setNnbPeriod] = useState<"Month" | "YTD">("YTD");
  const [catAC, setCatAC] = useState<AssetClassFilter>("All");
  const [ucitsNnbPeriod, setUcitsNnbPeriod] = useState<"Month" | "YTD">("YTD");
  const [ucitsNnbAfps, setUcitsNnbAfps] = useState<AFP[]>([]);
  const [ucitsNnbCats, setUcitsNnbCats] = useState<Category[]>([]);

  const compSeries = useMemo(
    () => getDomicileCompositionSeries(compAfps),
    [compAfps],
  );
  const nnbByAfp = useMemo(
    () => getDomicileNnbByAfp(nnbPeriod, date),
    [nnbPeriod, date],
  );
  const ucitsShare = useMemo(
    () => getUcitsEtfManagerShareByAfp(date),
    [date],
  );
  const catShare = useMemo(
    () => getDomicileShareByCategory(date, catAC),
    [date, catAC],
  );
  const ucitsNnbCat = useMemo(
    () => getUcitsNnbByCategory(ucitsNnbPeriod, date, ucitsNnbAfps, ucitsNnbCats),
    [ucitsNnbPeriod, date, ucitsNnbAfps, ucitsNnbCats],
  );

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">UCITS Snapshot</h1>
        <p className="text-sm text-muted-foreground">
          US (US-domiciled) vs UCITS (IE / LU domiciled) breakdown across the AFP system.
        </p>
      </div>

      <CardShell
        title="US vs UCITS — Aggregated Portfolio Composition"
        subtitle="Monthly AUM Org by domicile group (stacked)."
        right={<AfpFilterPopover value={compAfps} onChange={setCompAfps} />}
      >
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={compSeries} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid stroke="#EEE" vertical={false} />
              <XAxis dataKey="m" tickFormatter={shortMonth} fontSize={11} />
              <YAxis
                tickFormatter={(v: number) => formatUSD(v)}
                fontSize={11}
                width={70}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => formatUSD(v)}
                labelFormatter={(l: string) => shortMonth(l)}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="US" stackId="a" fill={DOMICILE_COLORS.US} />
              <Bar dataKey="UCITS" stackId="a" fill={DOMICILE_COLORS.UCITS} />
              <Bar dataKey="Other" stackId="a" fill={DOMICILE_COLORS.Other} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardShell>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardShell
          title="US vs UCITS NNB by AFP"
          subtitle="Diverging stacked bars; negatives shown below zero."
          right={
            <SegmentedToggle
              value={nnbPeriod}
              onChange={setNnbPeriod}
              options={PERIOD_TOGGLE}
            />
          }
        >
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={nnbByAfp}
                margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
                stackOffset="sign"
              >
                <CartesianGrid stroke="#EEE" vertical={false} />
                <XAxis dataKey="AFP" fontSize={11} />
                <YAxis
                  tickFormatter={(v: number) => formatUSD(v)}
                  fontSize={11}
                  width={70}
                />
                <ReferenceLine y={0} stroke="#999" />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => formatUSD(v)}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="US" stackId="s" fill={DOMICILE_COLORS.US} />
                <Bar dataKey="UCITS" stackId="s" fill={DOMICILE_COLORS.UCITS} />
                <Bar dataKey="Other" stackId="s" fill={DOMICILE_COLORS.Other} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardShell>

        <CardShell
          title="UCITS ETFs — Manager Market Share"
          subtitle="Top 5 + Others by AFP (100% stacked)."
        >
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={ucitsShare.data}
                margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
              >
                <CartesianGrid stroke="#EEE" vertical={false} />
                <XAxis dataKey="AFP" fontSize={11} />
                <YAxis
                  tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                  fontSize={11}
                  width={40}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => `${v.toFixed(1)}%`}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {ucitsShare.managers.map((m) => (
                  <Bar key={m} dataKey={m} stackId="m" fill={brandColor(m)} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardShell>
      </div>

      <CardShell
        title="US vs UCITS — Share by Category"
        subtitle="100% stacked breakdown of AUM Org by Category."
        right={
          <SegmentedToggle
            value={catAC}
            onChange={setCatAC}
            options={ASSET_CLASS_TOGGLE}
          />
        }
      >
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={catShare} margin={{ top: 8, right: 16, left: 0, bottom: 30 }}>
              <CartesianGrid stroke="#EEE" vertical={false} />
              <XAxis
                dataKey="category"
                fontSize={10}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={50}
              />
              <YAxis
                tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                fontSize={11}
                width={40}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => `${v.toFixed(1)}%`}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="US" stackId="d" fill={DOMICILE_COLORS.US} />
              <Bar dataKey="UCITS" stackId="d" fill={DOMICILE_COLORS.UCITS} />
              <Bar dataKey="Other" stackId="d" fill={DOMICILE_COLORS.Other} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardShell>

      <CardShell
        title="UCITS NNB by Category"
        subtitle="UCITS-domiciled (IE / LU) flows. Negative bars below zero."
        right={
          <>
            <SegmentedToggle
              value={ucitsNnbPeriod}
              onChange={setUcitsNnbPeriod}
              options={PERIOD_TOGGLE}
            />
            <AfpFilterPopover
              value={ucitsNnbAfps}
              onChange={setUcitsNnbAfps}
              label="AFPs"
            />
            <MultiSelectPopover
              label="Category"
              options={CATEGORIES}
              value={ucitsNnbCats}
              onChange={setUcitsNnbCats}
            />
          </>
        }
      >
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={ucitsNnbCat}
              margin={{ top: 8, right: 16, left: 0, bottom: 30 }}
            >
              <CartesianGrid stroke="#EEE" vertical={false} />
              <XAxis
                dataKey="Category"
                fontSize={10}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={50}
              />
              <YAxis
                tickFormatter={(v: number) => formatUSD(v)}
                fontSize={11}
                width={70}
              />
              <ReferenceLine y={0} stroke="#999" />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => formatUSD(v)}
              />
              <Bar dataKey="NNB">
                {ucitsNnbCat.map((d) => (
                  <Cell
                    key={d.Category}
                    fill={d.NNB >= 0 ? categoryColor(d.Category) : "#D93025"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardShell>
    </div>
  );
}
