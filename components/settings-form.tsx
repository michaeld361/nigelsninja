"use client";

import { useState, useTransition } from "react";
import { deleteAllData, saveSettings, signOutEverywhere, uploadCv } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Profile, ProfileFile, Settings } from "@/lib/types";
import { toast } from "sonner";

export function SettingsForm({ profile, settings, files }: { profile: Profile; settings: Settings; files: ProfileFile[] }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl tracking-tight">Your profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {profile.headline}. {profile.addressLines.join(", ")}. {profile.phone}. {profile.email}. A change to the search is picked up on the next LinkedIn look.
        </p>
      </div>

      <form
        className="space-y-4 rounded-2xl border p-4"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          start(async () => {
            const result = await uploadCv(data);
            if (!result.ok) toast.error(result.message);
            else toast.success(result.message ?? "CV saved");
          });
        }}
      >
        <h2 className="font-medium">CV, version {profile.cvVersion || "none"}</h2>
        <p className="text-sm text-muted-foreground">Upload a replacement .docx under 5 MB. Letters record which version they used. Earlier text stays in the history.</p>
        <Input name="cv" type="file" accept=".docx,.pdf" />
        <Button type="submit" disabled={pending} size="sm">
          Upload CV
        </Button>
        {profile.cvHistory.length ? (
          <ul className="text-xs text-muted-foreground">
            {profile.cvHistory.map((item) => (
              <li key={item.version}>Version {item.version}, {item.filename}, {item.uploadedAt.slice(0, 10)}</li>
            ))}
          </ul>
        ) : null}
      </form>

      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          start(async () => {
            const result = await saveSettings(data);
            if (!result.ok) toast.error(result.message);
            else {
              setMessage(result.message ?? "Saved");
              toast.success(result.message ?? "Saved");
            }
          });
        }}
      >
        <section className="space-y-3 rounded-2xl border p-4">
          <h2 className="font-medium">Profile text</h2>
          <label className="block text-sm">
            LinkedIn summary
            <Textarea name="linkedin" className="mt-1 min-h-40" defaultValue={profile.linkedinSummary} />
          </label>
          <label className="block text-sm">
            Personal statement
            <Textarea name="statement" className="mt-1 min-h-40" defaultValue={profile.personalStatement} />
          </label>
        </section>

        <section className="space-y-4 rounded-2xl border p-4">
          <h2 className="font-medium">Search</h2>
          {settings.tiers.map((tier) => (
            <div key={tier.id} className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name={`tier-${tier.id}`} defaultChecked={tier.enabled} />
                {tier.label} {tier.id === "stretch" ? "(off until you want a wider net)" : ""}
              </label>
              <Textarea name={`phrases-${tier.id}`} className="min-h-28" defaultValue={tier.phrases.join("\n")} />
            </div>
          ))}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Home postcode
              <Input name="postcode" className="mt-1" defaultValue={settings.homePostcode} />
            </label>
            <label className="text-sm">
              London radius, miles
              <Input name="radius" type="number" className="mt-1" defaultValue={settings.radiusMiles} />
            </label>
          </div>
          <p className="text-sm text-muted-foreground">Locations: London plus the radius, and UK remote. Europe-remote roles are shown and scored down. On-site roles outside the radius are filtered.</p>
          <div className="flex flex-wrap gap-3 text-sm">
            {(Object.keys(settings.contractTypes) as (keyof Settings["contractTypes"])[]).map((contract) => (
              <label key={contract} className="flex items-center gap-2">
                <input type="checkbox" name={`contract-${contract}`} defaultChecked={settings.contractTypes[contract]} />
                {contract}
              </label>
            ))}
          </div>
          <label className="block text-sm">
            Letter threshold
            <Input name="threshold" type="number" className="mt-1 max-w-32" defaultValue={settings.scoreThreshold} />
          </label>
        </section>

        <section className="space-y-3 rounded-2xl border p-4">
          <h2 className="font-medium">Letters</h2>
          <label className="block text-sm">
            Standing notes, applied to every letter
            <Textarea name="standing" className="mt-1 min-h-28" defaultValue={settings.standingNotes} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="digest" defaultChecked={settings.digestEnabled} />
            Morning email digest
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="disclaimerOn" defaultChecked={settings.disclaimerEnabled} />
            AI disclaimer on new letters
          </label>
          <label className="block text-sm">
            Disclaimer wording
            <Textarea name="disclaimer" className="mt-1" defaultValue={settings.disclaimerText} />
          </label>
          <label className="block text-sm">
            Monthly spend ceiling, USD
            <Input name="ceiling" type="number" className="mt-1 max-w-32" defaultValue={settings.monthlySpendCeilingUsd} />
          </label>
        </section>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </form>

      <section className="space-y-2 rounded-2xl border p-4">
        <h2 className="font-medium">Certificates</h2>
        <p className="text-sm text-muted-foreground">CIPP/E, CIPM and AIGP scans, stored so you can attach them when a form asks for proof.</p>
        <ul className="text-sm">
          {files.filter((file) => file.kind === "certificate").map((file) => (
            <li key={file.id}>
              <a className="underline" href={`/api/files/${file.id}`}>{file.label}</a>
            </li>
          ))}
          {files.every((file) => file.kind !== "certificate") ? <li>No certificate file stored yet.</li> : null}
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl border p-4">
        <h2 className="font-medium">Session and data</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            start(async () => {
              await signOutEverywhere();
            });
          }}
        >
          <Button type="submit" variant="outline" size="sm">Sign out everywhere</Button>
        </form>
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            start(async () => {
              const result = await deleteAllData(data);
              if (!result.ok) toast.error(result.message);
              else toast.success(result.message ?? "Deleted");
            });
          }}
        >
          <Label htmlFor="confirm">Delete all my data</Label>
          <p className="text-xs text-muted-foreground">Removes roles, letters, the CV text and uploaded files. The allow-list stays so you can still sign in. Type DELETE.</p>
          <Input id="confirm" name="confirm" placeholder="DELETE" />
          <Button type="submit" variant="destructive" size="sm" disabled={pending}>Delete everything</Button>
        </form>
      </section>
    </div>
  );
}
