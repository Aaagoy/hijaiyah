import type { Candidate } from "@/lib/content/curriculum";
import type { VerdictStatus } from "@/lib/recognition/scoring";

export interface FeedbackItem {
  latin: string;
  explanation: string;
  candidates: Candidate[];
}

export interface Feedback {
  tone: VerdictStatus;
  title: string;
  body: string;
}

export function feedbackFor(item: FeedbackItem, verdict: { status: VerdictStatus; heardKey: string | null }): Feedback {
  if (verdict.status === "correct") {
    return { tone: "correct", title: "Benar!", body: `Kamu membaca "${item.latin}" dengan tepat.` };
  }
  if (verdict.status === "silent") {
    return {
      tone: "silent",
      title: "Suara tidak terdengar",
      body: "Dekatkan mikrofon dan baca dengan suara yang jelas, lalu coba lagi.",
    };
  }
  const heard = item.candidates.find((c) => c.key === verdict.heardKey);
  const lead = heard
    ? `Kamu membaca "${heard.latin}", seharusnya "${item.latin}".`
    : `Bacaanmu belum tepat. Seharusnya dibaca "${item.latin}".`;
  return { tone: "wrong", title: "Belum tepat", body: `${lead} ${item.explanation}` };
}
