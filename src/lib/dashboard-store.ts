import { create } from "zustand";
import { MONTHS, type AFP } from "./mock-data";

interface DashboardState {
  date: string;
  afps: AFP[];
  blkOnly: boolean;
  setDate: (d: string) => void;
  setAfps: (a: AFP[]) => void;
  toggleAfp: (a: AFP) => void;
  setBlkOnly: (b: boolean) => void;
}

export const useDashboard = create<DashboardState>((set) => ({
  date: MONTHS[MONTHS.length - 1],
  afps: [],
  blkOnly: false,
  setDate: (d) => set({ date: d }),
  setAfps: (a) => set({ afps: a }),
  toggleAfp: (a) =>
    set((s) => ({
      afps: s.afps.includes(a) ? s.afps.filter((x) => x !== a) : [...s.afps, a],
    })),
  setBlkOnly: (b) => set({ blkOnly: b }),
}));