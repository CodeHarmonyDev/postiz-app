export function RuntimeConfigNotice({
  title,
  description,
  variables,
}: {
  title: string
  description: string
  variables: Array<string>
}) {
  return (
    <div className="panel-surface mx-auto max-w-2xl space-y-5 p-8">
      <p className="eyebrow">Runtime Configuration</p>
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-white">{title}</h1>
        <p className="max-w-xl text-sm leading-6 text-slate-300">{description}</p>
      </div>
      <div className="panel-soft p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
          Expected public variables
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {variables.map((variable) => (
            <span
              key={variable}
              className="rounded-full border border-slate-700 bg-slate-950/50 px-3 py-1 text-xs text-slate-200"
            >
              {variable}
            </span>
          ))}
        </div>
      </div>
      <p className="text-xs leading-5 text-slate-400">
        This migration keeps runtime configuration external. No environment files were inspected.
      </p>
    </div>
  )
}
