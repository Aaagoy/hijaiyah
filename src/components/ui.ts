/** Shared Tailwind class strings so buttons and fields look the same everywhere. */
export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-500 px-5 py-3 font-bold text-white shadow-[0_4px_0_#15803d] transition active:translate-y-0.5 active:shadow-none hover:bg-brand-600 disabled:opacity-50 disabled:pointer-events-none",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 shadow-[0_4px_0_#e2e8f0] transition active:translate-y-0.5 active:shadow-none hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none",
  danger:
    "inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 font-bold text-white shadow-[0_4px_0_#991b1b] transition active:translate-y-0.5 active:shadow-none hover:bg-red-700 disabled:opacity-50",
};

export const field =
  "w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-brand-500";
