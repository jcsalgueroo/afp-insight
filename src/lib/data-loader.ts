import Papa from "papaparse";
import { create } from "zustand";
import {
  setLiveData,
  type DisplacementRow,
  type MasterRow,
} from "./mock-data";
import {
  DISPLACEMENT_URL,
  MASTER_URL,
  normalizeDisplacement,
  normalizeMaster,
} from "./data-normalize";
import snapshot from "@/data/snapshot.json";

type Raw = Record<string, string>;

interface Snapshot {
  generatedAt: string;
  master: MasterRow[];
  displacement: DisplacementRow[];
}

const SNAPSHOT = snapshot as Snapshot;

// Install the bundled snapshot synchronously at module load so the dashboard
// works on networks that block docs.google.com.
setLiveData({ master: SNAPSHOT.master, displacement: SNAPSHOT.displacement });

async function fetchCsv<T = Raw>(url: string): Promise<T[]> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch CSV (${res.status})`);
  const text = await res.text();
  const parsed = Papa.parse<T>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  if (parsed.errors.length) {
    // Surface the first error but continue with rows that did parse.
    console.warn("CSV parse warning:", parsed.errors.slice(0, 3));
  }
  return parsed.data;
}

export type DataStatus = "idle" | "loading" | "ready" | "error";

interface DataState {
  status: DataStatus;
  error: string | null;
  version: number; // bump to force consumers to re-render
  /** ISO timestamp of the embedded snapshot, or of the last successful refresh. */
  dataAsOf: string;
  /** Source of the currently-installed data. */
  source: "snapshot" | "live";
  load: () => Promise<void>;
}

export const useDataLoader = create<DataState>((set, get) => ({
  // Snapshot is installed synchronously above, so we start ready.
  status: "ready",
  error: null,
  version: 1,
  dataAsOf: SNAPSHOT.generatedAt,
  source: "snapshot",
  load: async () => {
    if (get().status === "loading") return;
    const prev = get();
    set({ status: "loading", error: null });
    try {
      const [masterRaw, dispRaw] = await Promise.all([
        fetchCsv<Raw>(MASTER_URL),
        fetchCsv<Raw>(DISPLACEMENT_URL),
      ]);
      const master = normalizeMaster(masterRaw);
      const displacement = normalizeDisplacement(dispRaw);
      setLiveData({ master, displacement });
      set((st) => ({
        status: "ready",
        version: st.version + 1,
        dataAsOf: new Date().toISOString(),
        source: "live",
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Refresh failed — keep showing the snapshot data, surface the error.
      set({
        status: "ready",
        error: msg,
        version: prev.version,
        dataAsOf: prev.dataAsOf,
        source: prev.source,
      });
      throw e;
    }
  },
}));