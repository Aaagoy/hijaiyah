export function PageLoading({ label = "Memuat…" }: { label?: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-10" role="status">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <span className="font-arabic animate-pulse text-6xl text-brand-500">ب</span>
        <span className="font-semibold">{label}</span>
      </div>
    </div>
  );
}
