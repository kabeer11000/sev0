import { useState } from 'react'
import { Chip } from './Chip'
import { TutorialClipboardIllustration } from './TutorialClipboardIllustration'

interface Step {
  title: string
  body: string
  tag: string
}

const STEPS: Step[] = [
  {
    tag: 'Concept',
    title: "You're not solving a puzzle — you're on call",
    body: "Sev0 hands you a running system with something broken in it, right now. There's no failing test pointing at a line number. Your job is the same as a real incident: read the signals, form a hypothesis, find the defect, patch it, and prove the fix holds on seeds you've never seen.",
  },
  {
    tag: 'The brief',
    title: 'Start with what actually happened',
    body: "The Incident tab is your ticket — symptoms, timing, what support is seeing. It won't tell you which file or line is wrong. That's the part you have to figure out from the system's behavior.",
  },
  {
    tag: 'Topology panel',
    title: 'The system, live, on the left',
    body: "Dashed-border nodes are read-only — managed services or someone else's code. Solid borders are yours to edit. Colors track health in real time as you scrub through a run: gray is healthy, amber is degraded, red is down.",
  },
  {
    tag: 'Files panel',
    title: 'A real codebase, most of it not yours to touch',
    body: 'The Files panel below the topology is the whole repo — middleware, types, configs, READMEs — the kind of surrounding code a real service actually has. Only two files are editable: handler.ts and consume.ts, about 30 lines combined. Everything else is there to read for context, exactly like on-call in a codebase you didn\'t write. The pinned Docs tab next to Incident has every ctx method with a worked example — it\'s also wired into the editor, so autocomplete and hover on "ctx." show the same thing live.',
  },
  {
    tag: 'Right-click',
    title: 'Right-click a node for shortcuts',
    body: 'Right-click any node in the topology (or any file in the tree) to jump straight to its code, open a terminal scoped to that node, or view the live config in infra/topology.yaml. Sealed nodes offer the same shortcuts, minus editing.',
  },
  {
    tag: 'Terminal',
    title: 'Drop into a shell on any node',
    body: "Open a terminal on a worker, the queue, the database, or an external dependency and run real commands — ps, status, depth, select * from orders. Output reflects the exact moment you're scrubbed to, not just the end state — scrub backward and rerun a command to see what it looked like earlier.",
  },
  {
    tag: 'Command tip',
    title: 'Every log command takes an order id',
    body: "logs ord-42, peek ord-42, select * from orders where id='ord-42' — every terminal that has a logs/peek/select command accepts an order id and filters down to just that order's own trail across queue, db, and gateway events. Once the feed flags an order, grab its id and pull the same thread from every node it touched.",
  },
  {
    tag: 'Command palette',
    title: '⌘K jumps anywhere',
    body: 'Press Cmd/Ctrl+K to fuzzy-search every file and action — quicker than clicking through the tree. Every panel border is also a drag handle — resize the layout however you like.',
  },
  {
    tag: 'Run',
    title: 'Run is free — iterate as much as you want',
    body: 'Run (or Cmd/Ctrl+Enter) replays the incident on a seed you can see, instantly, in your browser. Nothing here costs you anything. Change the code, run again, see what changed.',
  },
  {
    tag: 'Timeline',
    title: 'Every run is a complete, scrubbable recording',
    body: "Drag the scrubber — or hit play — to move through the incident second by second. The topology, the queue depth, and the feed below all replay in sync, so you can rewind to the exact moment something goes wrong.",
  },
  {
    tag: 'Verdict panel',
    title: 'Some numbers are gates, some are just context',
    body: "The verdict panel grades your practice run against the invariants that actually matter — like never charging an order twice. Latency and other metrics show you what's happening on the wire but don't gate you — some things are out of your hands.",
  },
  {
    tag: 'Submit',
    title: "Submit is the real test",
    body: 'When you think it\'s fixed, Submit grades your code against 5 hidden seeds you\'ve never seen — different timing, different arrival patterns, same defect. Passing means the bug is actually gone, not just quiet on the one seed you were staring at.',
  },
]

export function TutorialModal({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0)
  const step = STEPS[i]
  const last = i === STEPS.length - 1

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(43, 36, 28, 0.40)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[460px] flex-col rounded-3xl"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-modal)' }}
      >
        <div className="flex items-center justify-between px-6 pt-6">
          <Chip tone="accent">{step.tag}</Chip>
          <button
            onClick={onClose}
            aria-label="Close tutorial"
            className="text-[12px]"
            style={{ color: 'var(--fg-faint)' }}
          >
            skip
          </button>
        </div>

        {i === 0 && (
          <div className="flex justify-center px-6 pt-5">
            <TutorialClipboardIllustration />
          </div>
        )}

        <div className="px-6 pb-2 pt-5">
          <h2 className="mb-3 text-[17px] font-semibold" style={{ letterSpacing: '-0.01em' }}>
            {step.title}
          </h2>
          <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
            {step.body}
          </p>
        </div>

        <div className="flex items-center justify-between px-6 pb-6 pt-5">
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, idx) => (
              <span
                key={idx}
                className="rounded-full transition-all duration-300"
                style={{
                  width: idx === i ? 14 : 5,
                  height: 5,
                  background: idx === i ? 'var(--accent)' : idx < i ? 'var(--accent-dim)' : 'var(--border-strong)',
                }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {i > 0 && (
              <button
                onClick={() => setI(i - 1)}
                className="h-8 rounded-full px-4 text-[13px] font-medium transition-all duration-200 hover:-translate-y-px"
                style={{ border: '1px solid var(--border)', color: 'var(--fg-muted)', background: 'var(--surface)' }}
              >
                Back
              </button>
            )}
            <button
              onClick={() => (last ? onClose() : setI(i + 1))}
              className="h-8 rounded-full px-4 text-[13px] font-bold text-white transition-all duration-200 hover:-translate-y-px hover:shadow-md"
              style={{
                background: 'linear-gradient(180deg, #f37c5a 0%, var(--accent) 60%, var(--accent-strong) 100%)',
                boxShadow: '0 2px 8px rgba(238, 90, 54, 0.28)',
              }}
            >
              {last ? "Let's go" : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
