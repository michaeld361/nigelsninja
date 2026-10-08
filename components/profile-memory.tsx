"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePersonalNote } from "@/app/actions";
import { RejectionNote } from "@/components/rejection-note";
import { formatLongDate } from "@/lib/text";
import type { Learning, PersonalNote } from "@/lib/types";
import { toast } from "sonner";

export function ProfileMemory({ notes, learnings }: { notes: PersonalNote[]; learnings: Learning[] }) {
  return (
    <section className="space-y-8 border-t border-[#F2F1EC] pt-6">
      <div>
        <h2 className="font-[family-name:var(--font-bricolage)] text-2xl font-bold tracking-[-0.01em]">Notes and learnings</h2>
        <p className="mt-3 max-w-[52ch] text-[17px] leading-7 text-[rgba(242,241,236,0.75)]">
          These notes and learnings are what the letter and the next search will weigh.
        </p>
      </div>
      <div className="space-y-5">
        <h3 className="font-[family-name:var(--font-bricolage)] text-xl font-bold">Notes</h3>
        {notes.length === 0 ? <p className="text-sm text-muted-foreground">Nothing written yet.</p> : null}
        {notes.map((note) => (
          <NoteEditor key={`${note.id}-${note.updatedAt}`} note={note} />
        ))}
        <NoteEditor />
      </div>
      <div className="space-y-5">
        <h3 className="font-[family-name:var(--font-bricolage)] text-xl font-bold">Learnings from rejections</h3>
        {learnings.length === 0 ? (
          <p className="max-w-[52ch] text-sm text-muted-foreground">Nothing yet. When a role is Rejected, write why, and it will be kept here.</p>
        ) : (
          learnings.map((learning) => (
            <div key={`${learning.id}-${learning.updatedAt}`}>
              <p className="text-[17px]">
                {learning.title} at {learning.company}
              </p>
              <RejectionNote learningId={learning.id} reason={learning.reason} date={learning.at} />
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function NoteEditor({ note }: { note?: PersonalNote }) {
  const [text, setText] = useState(note?.text ?? "");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="max-w-[52ch]"
      onSubmit={(event) => {
        event.preventDefault();
        start(async () => {
          const result = await savePersonalNote(note?.id ?? null, text);
          if (!result.ok) toast.error(result.message);
          else {
            if (!note) setText("");
            toast.success(result.message ?? "Saved");
            router.refresh();
          }
        });
      }}
    >
      <label className="sr-only" htmlFor={note?.id ?? "new-note"}>
        {note ? "Edit note" : "Add a note"}
      </label>
      <textarea
        id={note?.id ?? "new-note"}
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={3}
        placeholder={note ? undefined : "Add a note"}
        className="w-full resize-y border-0 border-b border-[rgba(242,241,236,0.35)] bg-transparent px-0 py-2 text-[15px] leading-6 text-[#F2F1EC] outline-none placeholder:text-[rgba(242,241,236,0.35)] focus:border-[#F2F1EC]"
      />
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="pill pill-sm">
          {pending ? "Saving…" : note ? "Save" : "Add note"}
        </button>
        {note ? <span className="font-mono text-[11px] tracking-[0.04em] text-[rgba(242,241,236,0.45)]">{formatLongDate(note.updatedAt)}</span> : null}
      </div>
    </form>
  );
}
