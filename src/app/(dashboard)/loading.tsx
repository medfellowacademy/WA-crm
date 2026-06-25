export default function DashboardLoading() {
  return (
    <div className="flex h-full flex-col gap-6 p-4 sm:p-6">
      {/* Header skeleton */}
      <div className="h-8 w-48 rounded-lg bg-slate-800 animate-pulse" />
      <div className="h-4 w-72 rounded bg-slate-800/60 animate-pulse" />
      {/* Cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-slate-800/60 animate-pulse" />
        ))}
      </div>
      {/* Content skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 h-72 rounded-xl bg-slate-800/60 animate-pulse" />
        <div className="lg:col-span-2 h-72 rounded-xl bg-slate-800/60 animate-pulse" />
      </div>
    </div>
  )
}
