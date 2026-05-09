import { create } from "zustand";
import { MONTHS } from "./mock-data";

interface DashboardState {
  date: string;
  blkOnly: boolean;
  setDate: (d: string) => void;
  setBlkOnly: (b: boolean) => void;
}

export const useDashboard = create<DashboardState>((set) => ({
  date: MONTHS[MONTHS.length - 1],
  blkOnly: false,
  setDate: (d) => set({ date: d }),
  setBlkOnly: (b) => set({ blkOnly: b }),
}));