export function SectionPlaceholder({
  title,
  summary,
  milestones,
}: {
  title: string
  summary: string
  milestones: Array<string>
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="panel-soft p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-300">Current slice</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">{title}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-300">{summary}</p>
        </article>
        <article className="panel-soft p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-300">Delivery rules</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
            <li>No raw fetch calls inside feature components.</li>
            <li>Keep TanStack routes explicit and client-first.</li>
            <li>All server state comes from Convex queries and mutations.</li>
          </ul>
        </article>
      </div>

      <article className="panel-soft p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Next migration steps</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {milestones.map((milestone, index) => (
            <div key={milestone} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Step {index + 1}
              </p>
              <p className="mt-3 text-sm leading-6 text-white">{milestone}</p>
            </div>
          ))}
        </div>
      </article>
    </div>
  )
}
