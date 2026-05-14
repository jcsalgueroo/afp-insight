import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useDashboard } from "@/lib/dashboard-store";
import {
  applyFilters,
  formatBps,
  formatUSD,
  getSecurityAumByAfp,
  MASTER_DATA,
  type MasterRow,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

export function Securities() {
  const { date, blkOnly } = useDashboard();
  // closure for hover cell
  // (date used in AumHoverCell below)
  ;
  const data = useMemo(
    () => applyFilters(MASTER_DATA, { date, afps: [], blkOnly }),
    [date, blkOnly],
  );

  const [sorting, setSorting] = useState<SortingState>([{ id: "AUM_USD", desc: true }]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo<ColumnDef<MasterRow>[]>(() => [
    { accessorKey: "Date", header: "Date" },
    { accessorKey: "AFP", header: "AFP" },
    { accessorKey: "Portfolio_Type", header: "Portfolio" },
    { accessorKey: "ISIN", header: "ISIN", cell: (c) => <span className="tabular-nums text-xs">{c.getValue<string>()}</span> },
    { accessorKey: "Ticker", header: "Ticker", cell: (c) => <span className="tabular-nums text-xs">{c.getValue<string>() || "—"}</span> },
    { accessorKey: "Name", header: "Name" },
    {
      accessorKey: "Manager",
      header: "Manager",
      cell: (c) => {
        const m = c.getValue<string>();
        return (
          <Badge
            variant="outline"
            className={cn(
              "rounded-sm font-medium uppercase text-[10px]",
              m === "BlackRock" ? "bg-primary/10 text-primary border-primary/30" : "bg-muted text-muted-foreground border-border",
            )}
          >
            {m}
          </Badge>
        );
      },
    },
    { accessorKey: "Category", header: "Category" },
    {
      accessorKey: "AUM_USD",
      header: () => <div className="text-right">AUM</div>,
      cell: (c) => <AumHoverCell row={c.row.original} value={c.getValue<number>()} />,
    },
    {
      accessorKey: "NNB_USD",
      header: () => <div className="text-right">NNB</div>,
      cell: (c) => {
        const v = c.getValue<number>();
        return <div className={cn("text-right tabular-nums", v >= 0 ? "text-positive" : "text-negative")}>{formatUSD(v)}</div>;
      },
    },
    {
      accessorKey: "RRR_USD",
      header: () => <div className="text-right">RRR</div>,
      cell: (c) => <div className="text-right tabular-nums">{formatUSD(c.getValue<number>())}</div>,
    },
    {
      accessorKey: "Fee_bps",
      header: () => <div className="text-right">Fee</div>,
      cell: (c) => <div className="text-right tabular-nums">{formatBps(c.getValue<number>())}</div>,
    },
    {
      accessorKey: "YTD_Perf",
      header: () => <div className="text-right">YTD %</div>,
      cell: (c) => {
        const v = c.getValue<number>();
        return <div className={cn("text-right tabular-nums", v >= 0 ? "text-positive" : "text-negative")}>{v.toFixed(2)}%</div>;
      },
    },
  ], []);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  return (
    <div className="p-3 sm:p-6 space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Security-Level Detail</h1>
          <p className="text-sm text-muted-foreground">Full holdings ledger for the selected period.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search ISIN, name, manager..."
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-md shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      onClick={h.column.getToggleSortingHandler()}
                      className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium cursor-pointer select-none whitespace-nowrap"
                    >
                      <div className="inline-flex items-center gap-1">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {h.column.getIsSorted() === "asc" && <ArrowUp className="h-3 w-3" />}
                        {h.column.getIsSorted() === "desc" && <ArrowDown className="h-3 w-3" />}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-t border-border hover:bg-muted/40">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-2 whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-10 text-center text-muted-foreground text-sm">
                    No rows match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted-foreground">
          <div>
            Showing {table.getRowModel().rows.length} of {data.length} rows
          </div>
          <div className="flex items-center gap-2">
            <span>
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
            </span>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="border border-border rounded-sm p-1 disabled:opacity-40 hover:bg-muted"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="border border-border rounded-sm p-1 disabled:opacity-40 hover:bg-muted"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AumHoverCell({ row, value }: { row: MasterRow; value: number }) {
  const breakdown = useMemo(
    () => getSecurityAumByAfp(row.ISIN, row.Date),
    [row.ISIN, row.Date],
  );
  const total = breakdown.reduce((s, b) => s + b.AUM, 0) || 1;
  return (
    <HoverCard openDelay={120} closeDelay={60}>
      <HoverCardTrigger asChild>
        <div className="text-right tabular-nums cursor-default">{formatUSD(value)}</div>
      </HoverCardTrigger>
      <HoverCardContent align="end" className="w-64 p-3 text-xs">
        <div className="font-semibold text-sm mb-0.5 truncate">{row.Ticker || row.Name}</div>
        <div className="text-muted-foreground mb-2 truncate text-[11px]">
          {row.ISIN} · {formatUSD(total)} total
        </div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
          AUM Org by AFP
        </div>
        <div className="space-y-0.5 max-h-56 overflow-auto">
          {breakdown.map((b) => (
            <div key={b.AFP} className="flex items-center justify-between gap-2">
              <span className="truncate">{b.AFP}</span>
              <span className="font-medium tabular-nums">
                {formatUSD(b.AUM)}{" "}
                <span className="text-muted-foreground">
                  ({((b.AUM / total) * 100).toFixed(0)}%)
                </span>
              </span>
            </div>
          ))}
          {breakdown.length === 0 && (
            <div className="text-muted-foreground">No holdings.</div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}