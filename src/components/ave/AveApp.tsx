import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MODES, fullPrompt, phaseName, splitTime, type Mode } from "@/lib/ave-modes";
import { sound } from "@/lib/ave-sound";

type Fb = { why: string; better: string; reply: string; ai: string };
const blankFb = (): Fb => ({ why: "", better: "", reply: "", ai: "" });
const fmt = (t: number) => String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0");
const ease = [0.22, 1, 0.36, 1] as const;

export function AveApp() {
  const [modeId, setModeId] = useState("research");
  const mode = MODES.find((m) => m.id === modeId)!;
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [total, setTotal] = useState(30);
  const [secs, setSecs] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [rem, setRem] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [run, setRun] = useState(false);
  const [snd, setSnd] = useState(true);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<string[]>(Array(6).fill(""));
  const [rate, setRate] = useState<number[]>(Array(6).fill(0));
  const [fb, setFb] = useState<Fb[]>(() => Array.from({ length: 6 }, blankFb));
  const [msg, setMsg] = useState("");
  const started = (secs[1] ?? 0) > 0;

  useEffect(() => { sound.enabled = snd; }, [snd]);

  // timer
  useEffect(() => {
    if (!run) return;
    const id = setInterval(() => {
      setRem((r) => {
        const n = [...r];
        n[i]! = Math.max(0, n[i]! - 1);
        if (n[i]! <= 10 && n[i]! > 0) sound.tick();
        if (n[i]! === 0) { setRun(false); sound.done(); }
        return n;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [run, i]);

  const go = (k: number) => {
    setRun(false);
    setDir(k > i ? 1 : -1);
    setI(k);
    setMsg("");
    if (k === 6) sound.fanfare(); else sound.page();
    if (typeof window !== "undefined") document.getElementById("stage")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const pickMode = (m: Mode) => { sound.prime(); sound.tap(); setModeId(m.id); };

  const startTimed = () => {
    sound.prime();
    if (!started || splitTime(total)[1] !== secs[1]!) {
      const s = splitTime(total);
      setSecs(s); setRem(s);
    }
    go(1);
  };

  const promptKey = (k: number) => `${modeId}:${k}`;
  const promptText = (k: number) => edits[promptKey(k)] ?? fullPrompt(mode.phases[k]!);

  const copy = async (txt: string, ok: string) => {
    try { await navigator.clipboard.writeText(txt); setMsg(ok); sound.copy(); }
    catch { setMsg("Copy was blocked here. Select the text and copy it by hand."); }
  };

  const tot = rate.reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen">
      <Hero mode={mode} />

      <section className="mx-auto max-w-5xl px-5">
        <div className="mb-3 flex items-end justify-between gap-4">
          <h2 className="font-display text-3xl">The prompt bank</h2>
          <span className="font-sc text-sm text-muted-foreground">Choose what you're making</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MODES.map((m, idx) => {
            const on = m.id === modeId;
            return (
              <motion.button
                key={m.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + idx * 0.08, duration: 0.6, ease }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => pickMode(m)}
                aria-pressed={on}
                className={`relative overflow-hidden rounded-md border-[1.5px] border-primary p-4 text-left transition-shadow ${on ? "bg-primary text-primary-foreground shadow-lift" : "bg-card/60 hover:shadow-press"}`}
              >
                <span className="font-display text-5xl leading-none opacity-80">{m.glyph}</span>
                <div className="mt-2 font-display text-2xl">{m.label}</div>
                <p className={`mt-1 text-[15px] leading-snug ${on ? "opacity-90" : "text-muted-foreground"}`}>{m.tagline}</p>
                {on && <motion.span layoutId="mode-dot" className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-accent" />}
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={modeId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-6 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {mode.phases.map((p, k) => (
              <motion.div key={k} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: k * 0.05 }}
                className="rounded-md border border-border p-3">
                <div className="font-sc text-xs text-muted-foreground">Phase {k + 1}</div>
                <div className="font-display text-lg leading-tight">{phaseName(p)}</div>
                <div className="mt-1 text-sm leading-snug text-muted-foreground">{p.r}</div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </section>

      <section id="stage" className="mx-auto mt-14 grid max-w-5xl scroll-mt-4 gap-8 px-5 pb-24 md:grid-cols-[220px_1fr]">
        {/* phase rail */}
        <nav aria-label="Phases" className="md:sticky md:top-6 md:self-start">
          <ol className="relative flex gap-2 overflow-x-auto md:flex-col md:gap-0 md:overflow-visible">
            <span aria-hidden className="absolute left-[11px] top-3 hidden h-[calc(100%-24px)] w-px bg-border md:block" />
            <motion.span aria-hidden className="absolute left-[11px] top-3 hidden w-px origin-top bg-primary md:block"
              animate={{ height: `calc(${(Math.min(i, 5) / 5) * 100}% - ${(Math.min(i, 5) / 5) * 24}px)` }} transition={{ duration: 0.6, ease }} />
            {[...mode.phases.map(phaseName), "Summary"].map((name, k) => {
              const locked = k >= 1 && !started;
              const state = k === i ? "on" : k < i ? "done" : "";
              return (
                <li key={k} className="relative">
                  <button disabled={locked} onClick={() => k !== i && go(k)} aria-current={k === i}
                    className={`flex items-center gap-3 whitespace-nowrap rounded px-1 py-2 text-left transition-opacity ${locked ? "opacity-40" : "hover:opacity-80"}`}>
                    <span className={`relative z-10 grid h-6 w-6 place-items-center rounded-full border-[1.5px] border-primary font-sc text-xs ${state ? "bg-primary text-primary-foreground" : "bg-background"}`}>
                      {state === "on" && <span className="absolute inset-0 rounded-full border-2 border-primary animate-pulse-ring" />}
                      {state === "done" ? "✓" : k + 1}
                    </span>
                    <span className={`font-display text-lg ${state === "on" ? "underline decoration-accent decoration-2 underline-offset-4" : ""}`}>{name}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <button className="ink-btn mt-4" aria-pressed={snd} onClick={() => { setSnd(!snd); sound.enabled = !snd; if (!snd) { sound.prime(); sound.copy(); } }}>
            Sound {snd ? "on" : "off"}
          </button>
        </nav>

        <div className="relative min-h-[600px]">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div key={`${modeId}-${i}`} custom={dir}
              initial={{ opacity: 0, x: 40 * dir, rotate: 0.4 * dir }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              exit={{ opacity: 0, x: -40 * dir }}
              transition={{ duration: 0.45, ease }}>
              {i < 6 ? (
                <PhaseView
                  k={i} mode={mode} total={total} setTotal={setTotal}
                  left={rem[i]!} full={secs[i]!} run={run}
                  onPlay={() => { sound.prime(); sound.tap(); setRun(!run); }}
                  onAdj={(d) => { setSecs((s) => s.map((v, j) => (j === i ? Math.max(60, v + d) : v))); setRem((r) => r.map((v, j) => (j === i ? Math.max(0, v + d) : v))); sound.tap(); }}
                  prompt={promptText(i)}
                  setPrompt={(v) => setEdits((e) => ({ ...e, [promptKey(i)]: v }))}
                  resetPrompt={() => { setEdits((e) => { const n = { ...e }; delete n[promptKey(i)]; return n; }); setMsg("Prompt reset."); }}
                  copyPrompt={() => copy(promptText(i), "Prompt copied.")}
                  msg={msg}
                  note={notes[i]!} setNote={(v) => setNotes((n) => n.map((x, j) => (j === i ? v : x)))}
                  rate={rate[i]!} setRate={(v) => { sound.tap(); setRate((r) => r.map((x, j) => (j === i ? v : x))); }}
                  fb={fb[i]!} setFb={(f) => setFb((a) => a.map((x, j) => (j === i ? f : x)))}
                  onBack={() => go(i - 1)}
                  onNext={() => (i === 0 ? startTimed() : go(i + 1))}
                />
              ) : (
                <Summary mode={mode} rate={rate} notes={notes} fb={fb} tot={tot} msg={msg}
                  onCopy={(t) => copy(t, "Session notes copied.")} onBack={() => go(5)}
                  onReset={() => { setRate(Array(6).fill(0)); setNotes(Array(6).fill("")); setFb(Array.from({ length: 6 }, blankFb)); setSecs([0, 0, 0, 0, 0, 0]); setRem([0, 0, 0, 0, 0, 0]); setEdits({}); go(0); }} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center font-sc text-sm text-muted-foreground">
        The site keeps your time, prompts, notes and scores. Your AI chat happens in the tool you already use.
      </footer>
    </div>
  );
}

function Hero({ mode }: { mode: Mode }) {
  const words = ["Think first,", "verify after."];
  return (
    <header className="relative mx-auto max-w-5xl overflow-hidden px-5 pb-12 pt-6">
      <div className="flex justify-between font-sc text-[13px]">
        <span>Autonomous Verification Engine</span>
        <span>A personal operating system for AI work</span>
      </div>
      <div className="relative mt-10 text-center">
        <svg aria-hidden viewBox="0 0 600 160" className="pointer-events-none absolute inset-x-0 -top-4 mx-auto w-full max-w-2xl text-primary opacity-30">
          <path d="M20 120 C 140 10, 260 150, 360 60 S 540 40, 580 110" fill="none" stroke="currentColor" strokeWidth="1.5" className="animate-ink-draw" />
        </svg>
        <motion.h1 initial={{ opacity: 0, scale: 0.92, filter: "blur(6px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} transition={{ duration: 1, ease }}
          className="font-display text-[clamp(72px,17vw,150px)] leading-[0.85] tracking-tight">AVE</motion.h1>
        <p className="mt-4 font-display text-2xl sm:text-3xl">
          {words.map((w, n) => (
            <motion.span key={w} className="inline-block px-1" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + n * 0.25, duration: 0.6, ease }}>{w}</motion.span>
          ))}
        </p>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Explain it, defend it, own it. Six phases, six personas — now tuned for <AnimatePresence mode="wait"><motion.strong key={mode.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="inline-block text-foreground">{mode.label.toLowerCase()}</motion.strong></AnimatePresence>.
        </motion.p>
        <span aria-hidden className="absolute left-4 top-6 hidden font-display text-6xl opacity-20 animate-float sm:block">✦</span>
        <span aria-hidden className="absolute bottom-0 right-6 hidden font-display text-5xl opacity-20 animate-float [animation-delay:-3s] sm:block">❦</span>
      </div>
    </header>
  );
}

type PV = {
  k: number; mode: Mode; total: number; setTotal: (n: number) => void; left: number; full: number; run: boolean;
  onPlay: () => void; onAdj: (d: number) => void; prompt: string; setPrompt: (v: string) => void; resetPrompt: () => void;
  copyPrompt: () => void; msg: string; note: string; setNote: (v: string) => void; rate: number; setRate: (n: number) => void;
  fb: Fb; setFb: (f: Fb) => void; onBack: () => void; onNext: () => void;
};

function PhaseView(p: PV) {
  const ph = p.mode.phases[p.k]!;
  const timed = p.k >= 1;
  const [open, setOpen] = useState(p.k === 0);
  const pct = p.full ? (p.full - p.left) / p.full : 0;
  const warn = p.left === 0 ? "Time is up. Tell the persona to wrap up with a usable output." : p.left <= 120 ? "Under two minutes left. Tell the persona time is short." : "";
  const fields: [keyof Fb, string, string][] = [
    ["why", "Why the AI gave this score", "Paste the AI’s explanation."],
    ["better", "How to do better next time (from the AI)", "Paste the AI’s advice for your next session."],
    ["reply", "Your response to the feedback", "What you agree with, what you would push back on, and what you will do differently."],
    ["ai", "AI’s reply to your response (optional)", "Paste the AI’s reply, including any change to the score."],
  ];
  return (
    <div>
      <div className="font-sc text-sm text-accent">{p.mode.label} · Phase {p.k + 1} of 6</div>
      <h2 className="font-display text-5xl leading-tight">{phaseName(ph)}</h2>
      <p className="mt-1 text-xl text-muted-foreground">{ph.r}</p>

      {p.k === 0 && (
        <div className="mt-6">
          <label htmlFor="tt" className="font-sc text-sm">How many minutes do you have in total?</label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {[15, 30, 45, 60, 90].map((m) => (
              <button key={m} className="ink-btn" aria-pressed={p.total === m} onClick={() => { sound.tap(); p.setTotal(m); }}>{m}</button>
            ))}
            <input id="tt" type="number" min={5} max={480} value={p.total} onChange={(e) => p.setTotal(+e.target.value)} className="ink-field max-w-24" />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Split evenly across the five phases after this one — about {Math.round(Math.max(5, p.total) / 5)} min each. Adjust any phase later.</p>
        </div>
      )}

      {timed && <Clock left={p.left} pct={pct} run={p.run} onPlay={p.onPlay} onAdj={p.onAdj} warn={warn} />}

      <div className="mt-6 rounded-md border-[1.5px] border-primary bg-card/50">
        <button onClick={() => { sound.tap(); setOpen(!open); }} className="flex w-full items-center justify-between px-4 py-3 font-display text-xl" aria-expanded={open}>
          Persona prompt
          <motion.span animate={{ rotate: open ? 45 : 0 }} className="text-2xl not-italic">+</motion.span>
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease }} className="overflow-hidden">
              <div className="px-4 pb-4">
                <p className="text-sm text-muted-foreground">Edit to add your own context. Changes stay while this page is open.</p>
                <textarea aria-label="Persona prompt" value={p.prompt} onChange={(e) => p.setPrompt(e.target.value)} className="ink-field mt-2 h-56 text-[15px]" />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button className="ink-btn solid" onClick={p.copyPrompt}>Copy prompt</button>
                  <button className="ink-btn" onClick={p.resetPrompt}>Reset to original</button>
                  <AnimatePresence>{p.msg && <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="text-sm text-accent">{p.msg}</motion.span>}</AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Field label={p.k === 0 ? "Brief from the Mentor" : "Notes worth keeping from the AI"} value={p.note} onChange={p.setNote} placeholder="Paste or type the notes you found useful." tall />

      <div className="mt-6">
        <div className="font-sc text-sm">Score the persona gave you</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <motion.button key={n} whileTap={{ scale: 0.85 }} animate={{ scale: p.rate === n ? 1.1 : 1 }} aria-pressed={p.rate === n} onClick={() => p.setRate(n)} className="ink-btn h-11 w-11 p-0 font-display text-xl">{n}</motion.button>
          ))}
          <span className="text-sm text-muted-foreground">Enter the “SCORE: X/5” line the persona gives you.</span>
        </div>
      </div>

      <div className="grid gap-x-4 sm:grid-cols-2">
        {fields.map(([key, label, ph2]) => (
          <Field key={key} label={label} value={p.fb[key]} onChange={(v) => p.setFb({ ...p.fb, [key]: v })} placeholder={ph2} />
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {p.k > 0 && <button className="ink-btn" onClick={p.onBack}>← {phaseName(p.mode.phases[p.k - 1]!)}</button>}
        <button className="ink-btn solid text-lg" onClick={p.onNext}>{p.k === 0 ? "Start the timed phases →" : p.k === 5 ? "Finish session ✦" : "Next phase →"}</button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, tall }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; tall?: boolean }) {
  return (
    <label className="mt-5 block">
      <span className="font-sc text-sm">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`ink-field mt-1.5 ${tall ? "h-32" : "h-24"}`} />
    </label>
  );
}

function Clock({ left, pct, run, onPlay, onAdj, warn }: { left: number; pct: number; run: boolean; onPlay: () => void; onAdj: (d: number) => void; warn: string }) {
  const R = 54, C = 2 * Math.PI * R;
  const urgent = left > 0 && left <= 120;
  return (
    <div className="mt-6 flex flex-wrap items-center gap-6">
      <motion.div className="relative h-36 w-36" animate={urgent && run ? { scale: [1, 1.03, 1] } : { scale: 1 }} transition={{ repeat: urgent && run ? Infinity : 0, duration: 1 }}>
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={R} fill="none" stroke="var(--border)" strokeWidth="6" />
          <motion.circle cx="60" cy="60" r={R} fill="none" stroke={urgent || left === 0 ? "var(--accent)" : "var(--primary)"} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={C} animate={{ strokeDashoffset: C * pct }} transition={{ duration: 0.9, ease: "linear" }} />
        </svg>
        <div role="timer" className="absolute inset-0 grid place-items-center font-display text-4xl tabular-nums">{fmt(left)}</div>
      </motion.div>
      <div className="flex flex-col gap-2">
        <button className="ink-btn solid w-36 text-lg" onClick={onPlay}>{run ? "Pause" : left === 0 ? "Done" : "Start"}</button>
        <div className="flex gap-2">
          <button className="ink-btn" aria-label="Remove one minute" onClick={() => onAdj(-60)}>−1 min</button>
          <button className="ink-btn" aria-label="Add one minute" onClick={() => onAdj(60)}>+1 min</button>
        </div>
      </div>
      <AnimatePresence>{warn && <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full font-display text-lg text-accent">{warn}</motion.p>}</AnimatePresence>
    </div>
  );
}

function Summary({ mode, rate, notes, fb, tot, msg, onCopy, onBack, onReset }: { mode: Mode; rate: number[]; notes: string[]; fb: Fb[]; tot: number; msg: string; onCopy: (t: string) => void; onBack: () => void; onReset: () => void }) {
  const scored = rate.map((r, k) => [r, k] as const).filter((x) => x[0] > 0);
  const low = scored.length ? scored.reduce((m, x) => (x[0] < m[0] ? x : m)) : null;
  const v = (t: string) => (t.trim() ? t.trim() : "(none)");
  const txt = useMemo(() => `AVE SESSION SUMMARY · ${mode.label}\nTotal AI score: ${tot} / 30\nFocus next time: ${low ? phaseName(mode.phases[low[1]]!) + " (" + low[0] + "/5)" : "(no scores recorded)"}\n\n` +
    mode.phases.map((p, k) => `== PHASE: ${phaseName(p)} ==\nScore: ${rate[k]! ? rate[k]! + "/5" : "(not scored)"}\nNotes: ${v(notes[k]!)}\nWhy the AI gave this score: ${v(fb[k]!.why)}\nHow to do better next time: ${v(fb[k]!.better)}\nMy response: ${v(fb[k]!.reply)}\nAI reply: ${v(fb[k]!.ai)}`).join("\n\n"), [mode, rate, notes, fb, tot, low]);
  const shown = useCountUp(tot);
  return (
    <div>
      <div className="font-sc text-sm text-accent">{mode.label} · Session complete</div>
      <h2 className="font-display text-5xl">Session summary</h2>
      <p className="mt-1 text-xl text-muted-foreground">Every score with its reasoning. Copy it to keep it, or go back to any phase to add more.</p>
      <div className="mt-6 rounded-md border-[1.5px] border-primary bg-card/60 p-5 shadow-lift">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-2xl">Character stats</span>
          <span className="font-display text-5xl tabular-nums">{shown}<span className="text-2xl text-muted-foreground"> / 30</span></span>
        </div>
        <div className="mt-4 space-y-3">
          {mode.phases.map((p, k) => (
            <div key={k} className="grid grid-cols-[130px_1fr_40px] items-center gap-3">
              <span className="font-display text-lg">{phaseName(p)}</span>
              <span className="h-2.5 overflow-hidden rounded-full bg-muted">
                <motion.b className="block h-full bg-primary" initial={{ width: 0 }} animate={{ width: `${rate[k]! * 20}%` }} transition={{ delay: 0.3 + k * 0.12, duration: 0.8, ease }} />
              </span>
              <span className="text-right font-sc">{rate[k]! || "–"}/5</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{low ? `Lowest phase: ${phaseName(mode.phases[low[1]]!)} (${low[0]}/5). Start there next session.` : "No scores recorded yet. Enter the AI’s score in each phase."}</p>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button className="ink-btn solid" onClick={() => onCopy(txt)}>Copy session notes</button>
        <button className="ink-btn" onClick={onBack}>← Back</button>
        <button className="ink-btn" onClick={onReset}>Start a new session</button>
        {msg && <span className="text-sm text-accent">{msg}</span>}
      </div>
    </div>
  );
}

function useCountUp(target: number) {
  const [n, setN] = useState(0);
  const ref = useRef(0);
  useEffect(() => {
    const from = ref.current, t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const q = Math.min(1, (t - t0) / 1200);
      const val = Math.round(from + (target - from) * (1 - Math.pow(1 - q, 3)));
      setN(val); ref.current = val;
      if (q < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return n;
}
