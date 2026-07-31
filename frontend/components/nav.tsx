"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "./connect-button";
import { ThemeToggle } from "./theme-toggle";

const appLinks = [
  { href: "/admin", label: "Run payroll" },
  { href: "/recipient", label: "My pay" },
  { href: "/audit", label: "Audit" },
] as const;

const landingLinks = [
  { href: "#how", label: "How it works" },
  { href: "#proof", label: "Live proof" },
  { href: "#faq", label: "FAQ" },
] as const;

export function Nav() {
  const path = usePathname();
  const onLanding = path === "/";
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-void/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="group flex items-baseline gap-1 font-display text-lg font-semibold tracking-tight">
          Pay<span className="text-cipher transition-colors group-hover:text-seal">Silo</span>
        </Link>
        <nav className="flex items-center gap-1">
          {onLanding
            ? landingLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="rounded-md px-3 py-1.5 font-mono text-xs text-ink-dim transition-colors hover:text-ink"
                >
                  {l.label}
                </a>
              ))
            : appLinks.map((l) => {
                const active = path.startsWith(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`rounded-md px-3 py-1.5 font-mono text-xs transition-colors ${
                      active ? "bg-seal/15 text-seal" : "text-ink-dim hover:text-ink"
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
          <div className="ml-2">
            <ThemeToggle />
          </div>
          <div className="ml-2">
            {onLanding ? (
              <Link
                href="/admin"
                className="rounded-md bg-ink px-4 py-1.5 font-mono text-xs font-medium text-void transition-transform hover:scale-[1.02]"
              >
                Open the app
              </Link>
            ) : (
              <ConnectButton />
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
