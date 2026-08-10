export default function StudioLoading() { return <div className="animate-pulse space-y-5"><div className="h-9 w-64 rounded bg-[var(--studio-subtle)]" /><div className="grid gap-3 sm:grid-cols-3">{[0,1,2].map((item) => <div key={item} className="studio-card h-28 bg-[var(--studio-subtle)]" />)}</div><div className="studio-card h-[520px] bg-[var(--studio-subtle)]" /></div>; }

