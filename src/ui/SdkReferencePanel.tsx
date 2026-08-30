import { useSev0Store } from '../store'

function Code({ children }: { children: string }) {
  return (
    <pre
      className="overflow-x-auto rounded-md border p-3 font-mono text-[12px] leading-relaxed"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
    >
      {children}
    </pre>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 mt-10 flex items-center gap-2">
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
      <h2 className="text-[11px] font-bold uppercase" style={{ color: 'var(--accent-strong)', letterSpacing: '0.10em' }}>
        {children}
      </h2>
    </div>
  )
}

function Entry({
  sig,
  usedIn,
  blurb,
  example,
  options,
}: {
  sig: string
  usedIn: string
  blurb: string
  example: string
  options?: { name: string; desc: string }[]
}) {
  return (
    <div className="border-b py-5" style={{ borderColor: 'var(--border)' }}>
      <div className="mb-2 flex items-center gap-2">
        <code
          className="rounded-md px-2 py-0.5 font-mono text-[12.5px] font-semibold"
          style={{ color: 'var(--accent-strong)', background: 'var(--accent-dim)' }}
        >
          {sig}
        </code>
        <span
          className="rounded-full px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg-muted)', letterSpacing: '0.06em' }}
        >
          {usedIn}
        </span>
      </div>
      <p className="mb-2.5 text-[13px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
        {blurb}
      </p>
      {options && options.length > 0 && (
        <div className="mb-2.5 flex flex-col gap-1">
          {options.map((o) => (
            <div key={o.name} className="flex gap-2 text-[12px]">
              <code className="shrink-0 font-mono" style={{ color: 'var(--fg)' }}>
                {o.name}
              </code>
              <span style={{ color: 'var(--fg-muted)' }}>{o.desc}</span>
            </div>
          ))}
        </div>
      )}
      <Code>{example}</Code>
    </div>
  )
}

interface Field {
  name: string
  type: string
  required?: boolean
  desc: string
}

function FieldTable({ title, fields }: { title: string; fields: Field[] }) {
  return (
    <div className="mb-3">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--fg-faint)' }}>
        {title}
      </div>
      <div className="overflow-hidden rounded-md border" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full border-collapse text-[12px]">
          <tbody>
            {fields.map((f, i) => (
              <tr key={f.name} style={{ borderTop: i === 0 ? undefined : '1px solid var(--border)' }}>
                <td className="whitespace-nowrap px-3 py-2 align-top" style={{ background: 'var(--surface)' }}>
                  <code className="font-mono" style={{ color: 'var(--fg)' }}>
                    {f.name}
                  </code>
                  {f.required && (
                    <span className="ml-1.5 font-mono text-[9px] uppercase" style={{ color: 'var(--accent)' }}>
                      required
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 align-top font-mono" style={{ color: 'var(--fg-faint)' }}>
                  {f.type}
                </td>
                <td className="px-3 py-2 align-top" style={{ color: 'var(--fg-muted)' }}>
                  {f.desc}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EndpointDoc({
  endpoint,
  calledFrom,
  summary,
  body,
  options,
  response,
  example,
}: {
  endpoint: string
  calledFrom: string
  summary: string
  body: Field[]
  options: Field[]
  response: Field[]
  example: string
}) {
  return (
    <div className="border-b py-6" style={{ borderColor: 'var(--border)' }}>
      <div className="mb-1.5 flex items-center gap-2">
        <span
          className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold"
          style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
        >
          POST
        </span>
        <code className="font-mono text-[13.5px] font-semibold" style={{ color: 'var(--fg)' }}>
          {endpoint}
        </code>
      </div>
      <p className="mb-1 text-[13px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
        {summary}
      </p>
      <p className="mb-3 font-mono text-[11px]" style={{ color: 'var(--fg-faint)' }}>
        called via <code style={{ color: 'var(--fg-muted)' }}>{calledFrom}</code>
      </p>

      <FieldTable title="Body" fields={body} />
      <FieldTable title="Options" fields={options} />
      <FieldTable title="Response" fields={response} />

      <Code>{example}</Code>
    </div>
  )
}

function IotSdkReferencePanel() {
  const openFile = useSev0Store((s) => s.openFile)

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--fg-faint)' }}>
        Reference
      </div>
      <h1 className="mb-2 text-[19px] font-semibold" style={{ letterSpacing: '-0.01em' }}>
        The ctx SDK
      </h1>
      <p className="mb-2 max-w-[62ch] text-[13px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
        This is the entire interface your code has to the outside world — no ambient network, clock, or
        filesystem access, only what&rsquo;s below. Every method is also live in the editor: autocomplete or
        hover <code style={{ color: 'var(--fg)' }}>ctx.</code> in either handler to see the same signatures
        inline as you type.
      </p>

      <SectionHeader>Runtime SDK</SectionHeader>

      <Entry
        sig="ctx.db.insertPacket(packet)"
        usedIn="dataentry-lambda"
        blurb="Appends one raw packet row. Never fails, never dedups — every invocation is a new row."
        example={`await ctx.db.insertPacket(packet)`}
      />

      <Entry
        sig="ctx.db.writeLineStatus(lineId, up, ts, opts?)"
        usedIn="dataentry-lambda"
        blurb="Sets the line's current run status, derived from ss1/ss2. Packets can arrive out of order — with ifNewerThan, a write is dropped (updated: false) if the stored status already has a newer ts (pts) than this one."
        options={[
          { name: 'opts.ifNewerThan', desc: "only apply the write if `ts` is newer than the row's current ts — otherwise a safe no-op" },
        ]}
        example={`const up = packet.ss1 === 1 && packet.ss2 === 0\nconst { updated } = await ctx.db.writeLineStatus(\n  packet.lineId,\n  up,\n  packet.pts,\n  { ifNewerThan: true },\n)`}
      />

      <Entry
        sig="ctx.lines()"
        usedIn="shift-aggregator"
        blurb="Every line id across every tenant — including lines that only ever receive fan-out copies."
        example={`for (const lineId of ctx.lines()) { /* ... */ }`}
      />

      <Entry
        sig="ctx.shiftFor(lineId, ts)"
        usedIn="shift-aggregator"
        blurb="Which shift ts falls into for that line's tenant. Shifts recur daily and each tenant (plant) has its own schedule, so the same ts can map to a different shift on a different line."
        example={`const shiftId = ctx.shiftFor(lineId, packet.pts)`}
      />

      <Entry
        sig="ctx.db.getCursor(lineId) / ctx.db.packetsSince(lineId, cursorPts)"
        usedIn="shift-aggregator"
        blurb="The usual cursor pattern: getCursor returns the pts you last processed for that line, packetsSince returns every packet after it, oldest first."
        example={`const cursor = await ctx.db.getCursor(lineId)\nconst packets = await ctx.db.packetsSince(lineId, cursor)`}
      />

      <Entry
        sig="ctx.db.getLastCounters(lineId)"
        usedIn="shift-aggregator"
        blurb="The sr1/sr2 values from the last packet you folded in for that line, or undefined if none yet. sr1 (good) and sr2 (reject) are cumulative counters read straight off the device — they only reset when the device itself reboots, dropping back near 0 mid-stream. A plain `packet.sr1 - last.sr1` goes negative right after that; detect current < last and count from 0 instead."
        example={`const last = await ctx.db.getLastCounters(lineId)\nconst goodDelta = last && p.sr1 >= last.sr1 ? p.sr1 - last.sr1 : p.sr1`}
      />

      <Entry
        sig="ctx.db.commitShiftCounts(lineId, shiftId, delta, opts)"
        usedIn="shift-aggregator"
        blurb="Adds delta.good/delta.reject to shiftId's running totals, and advances the line's cursor and last-seen counters to opts.newCursor/opts.lastCounters."
        options={[
          { name: 'opts.newCursor', desc: 'pts to advance this line’s cursor to' },
          { name: 'opts.lastCounters', desc: 'sr1/sr2 to remember as this line’s last-seen counters' },
        ]}
        example={`await ctx.db.commitShiftCounts(\n  lineId,\n  shiftId,\n  { good: goodDelta, reject: rejectDelta },\n  { newCursor: p.pts, lastCounters: { sr1: p.sr1, sr2: p.sr2 } },\n)`}
      />

      <Entry
        sig="ctx.now()"
        usedIn="both"
        blurb="The current simulated time in milliseconds. Never use a real clock — there isn't one."
        example={`const startedAt = ctx.now()`}
      />

      <div className="mt-4 text-[12px]" style={{ color: 'var(--fg-faint)' }}>
        Full raw type declarations:{' '}
        <button onClick={() => openFile('shared/sdk.d.ts')} className="hover:underline" style={{ color: 'var(--accent)' }}>
          shared/sdk.d.ts
        </button>
      </div>
    </div>
  )
}

function CheckoutSdkReferencePanel() {
  const openFile = useSev0Store((s) => s.openFile)

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--fg-faint)' }}>
        Reference
      </div>
      <h1 className="mb-2 text-[19px] font-semibold" style={{ letterSpacing: '-0.01em' }}>
        The ctx SDK
      </h1>
      <p className="mb-2 max-w-[62ch] text-[13px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
        This is the entire interface your code has to the outside world — no ambient network, clock, or
        filesystem access, only what&rsquo;s below. Every method is also live in the editor: autocomplete or
        hover <code style={{ color: 'var(--fg)' }}>ctx.</code> in handler.ts / consume.ts to see the same
        signatures inline as you type.
      </p>

      <SectionHeader>Runtime SDK</SectionHeader>

      <Entry
        sig="ctx.db.create(id, total)"
        usedIn="orders-api"
        blurb="Inserts a new order row with status 'pending'. Called once, when a checkout is first accepted."
        example={`await ctx.db.create(req.orderId, req.total)`}
      />

      <Entry
        sig="ctx.db.query(id)"
        usedIn="both"
        blurb="Reads the current row for an order, or undefined if it doesn't exist."
        example={`const order = await ctx.db.query(orderId)\nif (!order) { /* not found */ }`}
      />

      <Entry
        sig="ctx.db.exec(id, patch, opts?)"
        usedIn="both"
        blurb="Updates fields on an existing row. Models UPDATE ... WHERE — with ifStatus, the write only takes effect if the row's current status still matches, and updated tells you whether it actually happened."
        options={[
          { name: 'opts.ifStatus', desc: "only apply the patch if the row's status currently equals this — otherwise a safe no-op" },
        ]}
        example={`const { updated } = await ctx.db.exec(\n  orderId,\n  { status: 'settled' },\n  { ifStatus: 'pending' },\n)`}
      />

      <Entry
        sig="ctx.queue.publish(orderId)"
        usedIn="orders-api"
        blurb="Enqueues a message for the worker pool to pick up asynchronously."
        example={`ctx.queue.publish(req.orderId)`}
      />

      <Entry
        sig="ctx.queue.ack()"
        usedIn="worker"
        blurb="Acknowledges the current message. Until this is called, the queue assumes you might still be working on it — if it never gets called and the visibility timeout lapses, the message is redelivered to another worker."
        example={`ctx.queue.ack()`}
      />

      <Entry
        sig="ctx.now()"
        usedIn="both"
        blurb="The current simulated time in milliseconds. Never use a real clock — there isn't one."
        example={`const startedAt = ctx.now()`}
      />

      <SectionHeader>External APIs</SectionHeader>
      <p className="mb-4 max-w-[62ch] text-[13px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
        Both services reach third parties through the same{' '}
        <code style={{ color: 'var(--fg)' }}>ctx.http.post(endpoint, body, opts?)</code> call — the endpoint
        argument picks which API you're calling, and each one has its own body shape below, same as any other
        vendor's REST API.
      </p>

      <EndpointDoc
        endpoint="payments.charge"
        calledFrom="ctx.http.post('payments.charge', body, opts?)"
        summary="Charges the payment method on file for an order. Owned by the payments provider — this is not our code, and it's the sealed part of the checkout flow."
        body={[
          { name: 'orderId', type: 'string', required: true, desc: 'the order this charge is for' },
          { name: 'amt', type: 'number', required: true, desc: 'amount to charge, in cents' },
        ]}
        options={[
          {
            name: 'idempotencyKey',
            type: 'string',
            desc: 'if a previous call used this same key, the provider returns that original result instead of charging again',
          },
        ]}
        response={[
          { name: 'ok', type: 'boolean', desc: 'true if the request reached the provider at all' },
          { name: 'charged', type: 'boolean', desc: 'true if the order is now charged — true on both a fresh charge and a deduped repeat' },
          { name: 'status', type: 'number', desc: 'HTTP-style status code' },
        ]}
        example={`const result = await ctx.http.post(\n  'payments.charge',\n  { orderId, amt: order.total },\n  { idempotencyKey: orderId },\n)\n// result: { ok: true, charged: true, status: 200 }`}
      />

      <EndpointDoc
        endpoint="risk.check"
        calledFrom="ctx.http.post('risk.check', body, opts?)"
        summary="Screens an order before it's accepted. A separate vendor from the payment gateway — its latency is its own, not tied to payment-gateway incidents."
        body={[{ name: 'orderId', type: 'string', required: true, desc: 'the order being screened' }]}
        options={[
          {
            name: 'idempotencyKey',
            type: 'string',
            desc: 'same dedup contract as every other ctx.http.post call — not required for a screening check, but honored if sent',
          },
        ]}
        response={[
          { name: 'ok', type: 'boolean', desc: 'true if the request reached the provider at all' },
          { name: 'charged', type: 'boolean', desc: 'always false — this endpoint never charges anything' },
          { name: 'status', type: 'number', desc: 'HTTP-style status code' },
        ]}
        example={`await ctx.http.post('risk.check', { orderId: req.orderId })`}
      />

      <div className="mt-4 text-[12px]" style={{ color: 'var(--fg-faint)' }}>
        Full raw type declarations:{' '}
        <button onClick={() => openFile('shared/sdk.d.ts')} className="hover:underline" style={{ color: 'var(--accent)' }}>
          shared/sdk.d.ts
        </button>
      </div>
    </div>
  )
}

export function SdkReferencePanel() {
  const domain = useSev0Store((s) => s.scenario.domain)
  return domain === 'iot' ? <IotSdkReferencePanel /> : <CheckoutSdkReferencePanel />
}
