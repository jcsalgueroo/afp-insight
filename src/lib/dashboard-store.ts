import { create } from "zustand";

interface DashboardState {
  date: string;
  blkOnly: boolean;
  setDate: (d: string) => void;
  setBlkOnly: (b: boolean) => void;
}

export const useDashboard = create<DashboardState>((set) => ({
  date: "",
  blkOnly: false,
  setDate: (d) => set({ date: d }),
  setBlkOnly: (b) => set({ blkOnly: b }),
}));