import { PAYSILO_ADDRESS, configured } from "@/lib/contracts";
import { explorerAddr, short } from "@/lib/format";

export function Footer() {
  return (
    <footer className="border-t border-line/70">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="font-display text-lg font-semibold">
            Pay<span className="text-cipher">Silo</span>
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-dim">
            Confidential payroll for Safe treasuries. Public totals, sealed
            salaries, checkable on-chain.
          </p>
        </div>
        <div>
          <p className="eyebrow">Product</p>
          <ul className="mt-3 space-y-2 font-mono text-xs text-ink-dim">
            <li><a href="/#how" className="hover:text-ink">How it works</a></li>
            <li><a href="/#proof" className="hover:text-ink">Live proof</a></li>
            <li><a href="/admin" className="hover:text-ink">Open the app</a></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow">Learn</p>
          <ul className="mt-3 space-y-2 font-mono text-xs text-ink-dim">
            {configured ? (
              <li>
                <a href={explorerAddr(PAYSILO_ADDRESS)} target="_blank" rel="noreferrer" className="hover:text-ink">
                  Verified contract {short(PAYSILO_ADDRESS)}
                </a>
              </li>
            ) : (
              <li>Contract pending deployment</li>
            )}
            <li><a href="https://docs.noxprotocol.io" target="_blank" rel="noreferrer" className="hover:text-ink">Nox protocol docs</a></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow">Connect</p>
          <ul className="mt-3 space-y-2 font-mono text-xs text-ink-dim">
            <li><a href="https://x.com/0x_Dave" target="_blank" rel="noreferrer" className="hover:text-ink">@0x_Dave on X</a></li>
            <li><a href="https://github.com/Chibey-max" target="_blank" rel="noreferrer" className="hover:text-ink">GitHub</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-5 font-mono text-[11px] text-ink-dim sm:flex-row sm:justify-between">
          <span>© 2026 PaySilo. Built on iExec Nox. Settled on Ethereum Sepolia.</span>
          <span>Amounts are sealed by design. Totals are public by design.</span>
        </div>
      </div>
    </footer>
  );
}
