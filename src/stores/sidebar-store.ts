import { create } from "zustand";

type SidebarState = {
  /** True while the desktop nav rail is hover-expanded. */
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
};

export const useSidebarStore = create<SidebarState>((set) => ({
  expanded: false,
  setExpanded: (expanded) => set({ expanded }),
}));
