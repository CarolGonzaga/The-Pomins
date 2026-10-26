'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { FocusRuntime } from './runtime';
const Context = createContext<FocusRuntime | null>(null);
export function FocusRuntimeProvider({
  accountId,
  children,
}: {
  accountId: string;
  children: React.ReactNode;
}) {
  const [runtime] = useState(() => new FocusRuntime(accountId));
  useEffect(() => runtime.mount(), [runtime]);
  return <Context.Provider value={runtime}>{children}</Context.Provider>;
}
export function useFocusRuntime() {
  const value = useContext(Context);
  if (!value) throw Error('FocusRuntimeProvider necessário.');
  return value;
}
