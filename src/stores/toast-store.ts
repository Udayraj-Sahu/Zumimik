"use client";

import { create } from "zustand";

export type ToastType = "success" | "info" | "error";

export interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastState {
  toasts: ToastItem[];
  push: (type: ToastType, title: string, message?: string) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;
const AUTO_DISMISS_MS = 3500;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (type, title, message) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, type, title, message }] }));
    window.setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, AUTO_DISMISS_MS);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (title: string, message?: string) => useToastStore.getState().push("success", title, message),
  info: (title: string, message?: string) => useToastStore.getState().push("info", title, message),
  error: (title: string, message?: string) => useToastStore.getState().push("error", title, message),
};