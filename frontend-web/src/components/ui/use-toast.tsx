'use client';

import { useEffect, useState } from 'react';

export type ToastData = {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
};

type Listener = (toasts: ToastData[]) => void;

let memoryToasts: ToastData[] = [];
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l(memoryToasts);
}

export function toast(t: Omit<ToastData, 'id'>) {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  memoryToasts = [{ id, ...t }, ...memoryToasts].slice(0, 4);
  emit();
  return id;
}

export function dismissToast(id: string) {
  memoryToasts = memoryToasts.filter((t) => t.id !== id);
  emit();
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>(memoryToasts);

  useEffect(() => {
    const listener: Listener = (next) => setToasts(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return { toasts };
}
