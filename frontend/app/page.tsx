"use client";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { usePublicClient } from "wagmi";
import { useEffect, useState } from "react";
import { LedgerHero } from "@/components/ledger-hero";
import { SplineScene } from "@/components/ui/splite";
import { Spotlight } from "@/components/ui/spotlight";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/reveal";
import { PAYSILO_ABI, PAYSILO_ADDRESS, configured } from "@/lib/contracts";
import { formatAmount } from "@/lib/format";

export default function Landing() {
  const reduced = useReducedMotion();
  return (
    <>
      <section className="relative">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-16 lg:grid-cols-[1fr_1.05fr] lg:pb-28 lg:pt-24">
          <div>
            <motion.p
              className="eyebrow"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              Confidential payroll for Safe treasuries
            </motion.p>
            <motion.h1
              className="mt-5 font-display text-5xl font-semibold leading-[1.03] tracking-tight sm:text-6xl"
              initial={reduced ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              The ledger is public.
              <br />
              <span className="text-seal">Your salary isn&apos;t.</span>
            </motion.h1>
            <motion.p
              className="mt-6 max-w-md text-base leading-relaxed text-ink-dim"
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.2 }}
            >
              Pay the whole team from your Safe in one transaction. The total is
              public and verifiable. Every individual amount is encrypted and
              readable only by the person it belongs to. The Safe itself is never
              modified.
            </motion.p>
            <motion.div
              className="mt-9 flex flex-wrap gap-3"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              <Link
                href="/admin"
                className="rounded-md bg-ink px-6 py-3 font-mono text-sm font-medium text-void transition-transform hover:scale-[1.02]"
              >
                Open the app
              </Link>
              <a
                href="#how"
                className="rounded-md border border-line px-6 py-3 font-mono text-sm text-ink transition-colors hover:border-seal/50 hover:text-seal"
              >
                How it works
              </a>
            </motion.div>
            <motion.div
              className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-line/70 pt-6"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
            >
              {STATS.map((s) => (
                <div key={s.label}>
                  <p className="font-mono text-xl text-ink">{s.value}</p>
                  <p className="mt-1 font-mono text-[11px] text-ink-dim">{s.label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={reduced ? false : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card className="relative h-[480px] overflow-hidden border-line bg-black/[0.96] p-0">
              <Spotlight className="-top-40 left-0 md:-top-20 md:left-40" size={320} />
              <SplineScene
                scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                className="h-full w-full"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-white/10 bg-black/60 px-5 py-3.5 backdrop-blur-sm">
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
                  Your agent sees handles, never amounts
                </span>
                <span className="font-mono text-xs" style={{ color: "#2BE4C6" }}>
                  sealed
                </span>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      <section id="proof" className="border-t border-line/70 bg-panel-2/40 scroll-mt-14">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal>
            <p className="eyebrow">A record that can&apos;t argue back</p>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              A settled batch, in full
            </h2>
          </Reveal>
          <Reveal delay={0.1} className="mt-8">
            <LedgerHero />
          </Reveal>
        </div>
      </section>

      <section id="how" className="border-t border-line/70 scroll-mt-14">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Reveal>
            <p className="eyebrow">How a batch settles</p>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Three steps. One visible transaction.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {FLOW.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.1}>
                <Card className="group relative h-full p-6 transition-colors hover:border-seal/40">
                  <Spotlight size={200} />
                  <span className="font-mono text-xs text-cipher">0{i + 1}</span>
                  <h3 className="mt-3 font-display text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-dim">{s.body}</p>
                  <p className="mt-5 border-t border-line/60 pt-4 font-mono text-[11px] text-ink-dim">
                    {s.artifact}
                  </p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line/70 bg-panel-2/40">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Reveal>
            <p className="eyebrow">The full path</p>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Five hops, one signature.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-dim">
              Everything between your click and the settled batch, named. You only
              touch the first hop.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-10 flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-0">
              {PIPELINE.map((p, i) => (
                <div key={p.who} className="flex flex-1 items-stretch">
                  <Card className="flex-1 rounded-lg p-4">
                    <p className="font-mono text-xs text-seal">{p.who}</p>
                    <p className="mt-1.5 text-[13px] leading-snug text-ink-dim">{p.does}</p>
                  </Card>
                  {i < PIPELINE.length - 1 && (
                    <span className="hidden items-center px-2 font-mono text-cipher sm:flex" aria-hidden>
                      →
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-line/70">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Reveal>
            <p className="eyebrow">Disclosure model</p>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Exactly who learns exactly what
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-dim">
              Privacy claims deserve precision. This is the complete table, stated
              plainly, including what stays public on purpose.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <Card className="mt-10 overflow-hidden p-0">
              <table className="w-full text-left text-sm">
                <thead className="bg-panel-2 font-mono text-[11px] uppercase tracking-widest text-ink-dim">
                  <tr>
                    <th className="px-5 py-3.5 font-normal">observer</th>
                    <th className="px-5 py-3.5 font-normal">learns</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {DISCLOSURE.map((row) => (
                    <tr key={row.who}>
                      <td className="px-5 py-3.5 font-mono text-xs text-ink">{row.who}</td>
                      <td className="px-5 py-3.5 text-ink-dim">{row.what}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-line/70 bg-panel-2/40">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Reveal>
            <p className="eyebrow">Live on Sepolia</p>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Recent batches
            </h2>
          </Reveal>
          <LiveBatches />
        </div>
      </section>

      <section id="faq" className="border-t border-line/70 scroll-mt-14">
        <div className="mx-auto max-w-3xl px-6 py-24">
          <Reveal>
            <p className="eyebrow">Questions you&apos;d actually ask</p>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Straight answers, plainly put.
            </h2>
          </Reveal>
          <div className="mt-10 divide-y divide-line/70 border-y border-line/70">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between font-display text-base font-medium [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="ml-4 font-mono text-cipher transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-ink-dim">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line/70">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Your first sealed batch is one transaction away.
            </h2>
            <div className="mt-8 flex justify-center gap-3">
              <Link
                href="/admin"
                className="rounded-md bg-ink px-6 py-3 font-mono text-sm font-medium text-void transition-transform hover:scale-[1.02]"
              >
                Open the app
              </Link>
              <a
                href="#how"
                className="rounded-md border border-line px-6 py-3 font-mono text-sm text-ink transition-colors hover:border-seal/50 hover:text-seal"
              >
                How it works
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

const STATS = [
  { value: "1", label: "Safe tx per batch" },
  { value: "0", label: "amounts revealed" },
  { value: "100%", label: "verifiable on-chain" },
] as const;

const FLOW = [
  {
    title: "Encrypted",
    body: "Each amount is encrypted on the admin's machine into a 32-byte handle plus proof. Plaintext never touches the chain.",
    artifact: "artifact: handle + proof, per recipient",
  },
  {
    title: "Executed",
    body: "The Safe batches approve and runPayroll through MultiSend. The aggregate total is deposited, wrapped, and fanned out.",
    artifact: "artifact: a single verifiable Etherscan tx",
  },
  {
    title: "Decrypted",
    body: "Recipients read their own balance with a normal wallet. The access control list is on-chain; keys never leave the KMS path.",
    artifact: "artifact: your amount, on your screen only",
  },
] as const;

const PIPELINE = [
  { who: "You", does: "build the batch, click once" },
  { who: "Browser", does: "encrypts every amount, Nox SDK" },
  { who: "Safe", does: "executes approve + runPayroll" },
  { who: "Nox TEE", does: "computes on ciphertext, Intel TDX" },
  { who: "Recipient", does: "decrypts their own pay" },
] as const;

const DISCLOSURE = [
  { who: "anyone on Etherscan", what: "the Safe, the batch total, the recipient list, timing" },
  { who: "a recipient", what: "their own amounts and balance, nothing about teammates" },
  { who: "the payroll admin", what: "everything — it authored the amounts" },
  { who: "a granted auditor", what: "only the balance handle a recipient chose to share" },
  { who: "iExec infrastructure", what: "ciphertexts; plaintext exists only inside attested TDX enclaves" },
] as const;

const FAQ = [
  {
    q: "What exactly goes on-chain?",
    a: "The Safe address, the batch total, the recipient list, and one encrypted handle per payout. No individual amount ever appears in plaintext, in calldata, or in event logs.",
  },
  {
    q: "Can my employer see my salary?",
    a: "Yes. The payroll admin authored the amounts, so they know them by definition. PaySilo hides amounts from everyone else: teammates, competitors, and anyone reading the chain.",
  },
  {
    q: "Do I need a special wallet?",
    a: "No. Any standard Ethereum wallet works. Decryption is a request your wallet signs; the on-chain access list decides whether the key service answers.",
  },
  {
    q: "Is this real or a demo?",
    a: "Real contracts on Ethereum Sepolia, real encrypted transfers through the iExec Nox protocol. Testnet funds only, and every batch links to the actual transaction on Etherscan.",
  },
  {
    q: "What about audits and compliance?",
    a: "Each recipient can grant a specific address permission to decrypt their balance, one transaction, revocable by rotation. Selective disclosure instead of choosing between privacy and compliance.",
  },
  {
    q: "Why is the batch total public?",
    a: "The wrapper must reconcile real token reserves, so the aggregate is public by design. With one recipient the total would equal their pay, which is why the app warns on single-recipient batches.",
  },
] as const;

function LiveBatches() {
  const publicClient = usePublicClient();
  const [batches, setBatches] = useState<{ id: bigint; count: bigint; total: bigint }[] | null>(null);

  useEffect(() => {
    if (!configured || !publicClient) {
      setBatches([]);
      return;
    }
    (async () => {
      try {
        const next = (await publicClient.readContract({
          address: PAYSILO_ADDRESS,
          abi: PAYSILO_ABI,
          functionName: "nextBatchId",
        })) as bigint;
        const ids = Array.from({ length: Number(next < 5n ? next : 5n) }, (_, i) => next - 1n - BigInt(i));
        const rows = await Promise.all(
          ids.map(async (id) => {
            const b = (await publicClient.readContract({
              address: PAYSILO_ADDRESS,
              abi: PAYSILO_ABI,
              functionName: "batches",
              args: [id],
            })) as readonly [bigint, bigint, bigint, bigint];
            return { id, count: b[2], total: b[3] };
          })
        );
        setBatches(rows);
      } catch {
        setBatches([]);
      }
    })();
  }, [publicClient]);

  if (batches === null)
    return <p className="mt-10 font-mono text-xs text-ink-dim">Reading the contract…</p>;

  if (batches.length === 0)
    return (
      <Card className="mt-10 border-dashed p-10 text-center">
        <p className="font-mono text-sm text-ink-dim">
          {configured
            ? "No batches yet. Be the first: run a payroll from your Safe."
            : "Contract address not configured. Set NEXT_PUBLIC_PAYSILO_ADDRESS after deploying."}
        </p>
        {configured && (
          <Link href="/admin" className="mt-5 inline-block rounded-md bg-ink px-5 py-2.5 font-mono text-xs text-void">
            Run payroll
          </Link>
        )}
      </Card>
    );

  return (
    <div className="mt-10 grid gap-3">
      {batches.map((b, i) => (
        <Reveal key={b.id.toString()} delay={i * 0.06}>
          <Card className="flex items-center justify-between px-5 py-4 font-mono text-sm">
            <span className="text-ink-dim">batch #{b.id.toString()}</span>
            <span className="text-ink-dim">
              {b.count.toString()} recipient{b.count === 1n ? "" : "s"}
            </span>
            <span className="text-ink">{formatAmount(b.total)} tUSDC total</span>
            <span className="text-cipher">splits sealed</span>
          </Card>
        </Reveal>
      ))}
    </div>
  );
}
