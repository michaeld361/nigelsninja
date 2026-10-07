import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { loadStore, updateStore } from "./store";
import type { Role, Session } from "./types";

const COOKIE = "nja_session";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (!id) return null;
  const session = loadStore().sessions.find((item) => item.id === id);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) return null;
  return session;
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireRole(role: Role): Promise<Session> {
  const session = await requireSession();
  if (session.role !== role && !(role === "candidate")) {
    redirect("/jobs");
  }
  if (role === "admin" && session.role !== "admin") redirect("/jobs");
  return session;
}

export function sessionCookie(id: string) {
  return {
    name: COOKIE,
    value: id,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: THIRTY_DAYS,
    },
  };
}

export function clearSessionCookie() {
  return { name: COOKIE, value: "", options: { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 0 } };
}

export function findAllowed(email: string) {
  const normalised = email.trim().toLowerCase();
  return loadStore().allowedUsers.find((user) => user.email.toLowerCase() === normalised) ?? null;
}

export function createSession(email: string) {
  const user = findAllowed(email);
  if (!user) return null;
  const session: Session = {
    id: crypto.randomUUID(),
    email: user.email,
    role: user.role,
    name: user.name,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + THIRTY_DAYS * 1000).toISOString(),
  };
  updateStore((store) => {
    store.sessions.push(session);
  });
  return session;
}
