import { LoginForm } from "@/components/login-form";
import { getSession } from "@/lib/auth";
import { formatLongDate } from "@/lib/text";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/jobs");
  return <LoginForm today={formatLongDate(new Date())} />;
}
