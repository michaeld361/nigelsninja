"use client";

import { useState, useTransition } from "react";
import { signInWithEmail } from "@/app/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="mx-auto flex min-h-full w-full max-w-lg flex-col justify-center px-5 py-20">
      <h1 className="font-serif text-5xl tracking-tight">Nigel.</h1>
      <p className="mt-4 max-w-md text-lg leading-8 text-muted-foreground">
        LinkedIn roles worth applying for, and a letter when you decide to. Nothing is sent until you send it.
      </p>
      <form
        className="mt-12 max-w-md space-y-6 border-t pt-8"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setError(null);
          setMessage(null);
          setLink(null);
          start(async () => {
            const result = await signInWithEmail(data);
            if (!result.ok) setError(result.message);
            else {
              setMessage(result.message ?? null);
              setLink(result.link ?? null);
            }
          });
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" placeholder="nigel@nigeldown.com" required />
          <p className="text-sm text-muted-foreground">nigel@nigeldown.com or mail@michaeldown.co.uk.</p>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="font-serif text-xl text-primary underline decoration-primary/30 underline-offset-8 disabled:opacity-60"
        >
          {pending ? "Checking…" : "Continue"}
        </button>
      </form>
      {error ? <p className="mt-8 max-w-md text-sm leading-6 text-destructive">{error}</p> : null}
      {message ? <p className="mt-8 max-w-md text-sm leading-6 text-muted-foreground">{message}</p> : null}
      {link ? (
        <p className="mt-6">
          <a href={link} className="font-serif text-4xl tracking-tight underline decoration-primary/30 underline-offset-8">
            Sign in
          </a>
        </p>
      ) : null}
    </div>
  );
}
