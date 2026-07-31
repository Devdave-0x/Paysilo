"use client";
import * as RadixToast from "@radix-ui/react-toast";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { explorerTx } from "@/lib/format";

type ToastMsg = { id: number; title: string; body?: string; txHash?: string; kind: "ok" | "err" };
const ToastCtx = createContext<(t: Omit<ToastMsg, "id">) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const push = useCallback((t: Omit<ToastMsg, "id">) => {
    setToasts((prev) => [...prev, { ...t, id: Date.now() + Math.random() }]);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      <RadixToast.Provider swipeDirection="right" duration={6500}>
        {children}
        {toasts.map((t) => (
          <RadixToast.Root
            key={t.id}
            className={`rounded-md border bg-panel p-4 shadow-card data-[state=open]:animate-none ${
              t.kind === "ok" ? "border-seal/40" : "border-danger/40"
            }`}
            onOpenChange={(open) => {
              if (!open) setToasts((prev) => prev.filter((x) => x.id !== t.id));
            }}
          >
            <RadixToast.Title className="font-display text-sm font-semibold">
              {t.title}
            </RadixToast.Title>
            {t.body && (
              <RadixToast.Description className="mt-1 font-mono text-xs text-ink-dim">
                {t.body}
              </RadixToast.Description>
            )}
            {t.txHash && (
              <a
                href={explorerTx(t.txHash)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block font-mono text-xs text-seal underline underline-offset-4"
              >
                View on Etherscan
              </a>
            )}
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className="fixed bottom-5 right-5 z-50 flex w-[340px] max-w-[90vw] flex-col gap-2" />
      </RadixToast.Provider>
    </ToastCtx.Provider>
  );
}
