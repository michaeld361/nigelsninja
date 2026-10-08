import type { Learning, PersonalNote } from "./types";

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Text for the next scoring prompt and the next letter prompt. Empty when he has written nothing. */
export function weighingText(
  notes: Pick<PersonalNote, "text">[],
  learnings: Pick<Learning, "company" | "title" | "reason" | "at">[],
): string {
  const written = notes.map((note) => clean(note.text)).filter(Boolean);
  const learned = learnings
    .map((item) => {
      const reason = clean(item.reason);
      if (!reason) return "";
      const day = item.at.slice(0, 10);
      return `${day}, ${item.title} at ${item.company}: ${reason}`;
    })
    .filter(Boolean);
  if (!written.length && !learned.length) return "";
  const parts: string[] = [];
  if (written.length) parts.push(`Notes:\n${written.map((line) => `- ${line}`).join("\n")}`);
  if (learned.length) parts.push(`Learnings from rejections:\n${learned.map((line) => `- ${line}`).join("\n")}`);
  return parts.join("\n\n");
}

/** Adds the stored notes to a prompt. An empty record leaves the prompt as it was. */
export function appendWeighing(prompt: string, weighing: string): string {
  const text = weighing.trim();
  if (!text) return prompt;
  return `${prompt}\n<nigel_notes>\n${text}\n</nigel_notes>\nWeigh these notes and rejection learnings. They are Nigel's own record, not requirements written in the job, and not a reason to invent experience.`;
}

export function rememberNote(
  notes: PersonalNote[],
  input: { id?: string | null; text: string; now: string },
): { notes: PersonalNote[]; saved: boolean } {
  const text = clean(input.text);
  if (!text) return { notes, saved: false };
  if (input.id) {
    if (!notes.some((note) => note.id === input.id)) return { notes, saved: false };
    return {
      saved: true,
      notes: notes.map((note) => (note.id === input.id ? { ...note, text, updatedAt: input.now } : note)),
    };
  }
  return {
    saved: true,
    notes: [{ id: crypto.randomUUID(), text, createdAt: input.now, updatedAt: input.now }, ...notes],
  };
}

export function rememberLearning(
  learnings: Learning[],
  input: { jobId: string; company: string; title: string; reason: string; now: string },
): { learnings: Learning[]; saved: boolean } {
  const reason = clean(input.reason);
  if (!reason) return { learnings, saved: false };
  const existing = learnings.find((item) => item.jobId === input.jobId);
  if (!existing) {
    return {
      saved: true,
      learnings: [
        {
          id: crypto.randomUUID(),
          jobId: input.jobId,
          company: input.company,
          title: input.title,
          reason,
          at: input.now,
          updatedAt: input.now,
        },
        ...learnings,
      ],
    };
  }
  return {
    saved: true,
    learnings: learnings.map((item) =>
      item.jobId === input.jobId ? { ...item, company: input.company, title: input.title, reason, updatedAt: input.now } : item,
    ),
  };
}
