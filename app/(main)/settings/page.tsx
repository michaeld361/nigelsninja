import { SettingsForm } from "@/components/settings-form";
import { loadStore } from "@/lib/store";

export default async function SettingsPage() {
  const store = loadStore();
  return <SettingsForm profile={store.profile} settings={store.settings} files={store.profileFiles} />;
}
