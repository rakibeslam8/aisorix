import { useEffect, useState } from "react";
import { invokeAdmin } from "@/admin/lib/adminApi";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save } from "lucide-react";

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);

  const load = () => invokeAdmin<{ settings: any }>("admin-settings-get").then((r) => setSettings(r.settings)).catch((e: any) => toast.error(e.message));
  useEffect(() => { load(); }, []);

  const save = async (key: string) => {
    setBusy(true);
    try { await invokeAdmin("admin-settings-update", { key, value: settings[key] }); toast.success(`${key} saved`); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  const patch = (key: string, field: string, value: any) => setSettings((s) => ({ ...s, [key]: { ...(s[key] ?? {}), [field]: value } }));

  const tabs = ["general", "branding", "email", "limits", "integrations"];

  return (
    <Tabs defaultValue="general">
      <TabsList>{tabs.map((t) => <TabsTrigger key={t} value={t} className="capitalize">{t}</TabsTrigger>)}</TabsList>

      <TabsContent value="general"><Card className="p-5 bg-white border-slate-200 space-y-3">
        <div><label className="text-xs text-slate-600">Site name</label><Input value={settings.general?.site_name ?? ""} onChange={(e) => patch("general", "site_name", e.target.value)} /></div>
        <div><label className="text-xs text-slate-600">Support email</label><Input value={settings.general?.support_email ?? ""} onChange={(e) => patch("general", "support_email", e.target.value)} /></div>
        <Button onClick={() => save("general")} disabled={busy}><Save className="w-4 h-4 mr-1" /> Save</Button>
      </Card></TabsContent>

      <TabsContent value="branding"><Card className="p-5 bg-white border-slate-200 space-y-3">
        <div><label className="text-xs text-slate-600">Logo URL</label><Input value={settings.branding?.logo_url ?? ""} onChange={(e) => patch("branding", "logo_url", e.target.value)} placeholder="https://…" /></div>
        <div><label className="text-xs text-slate-600">Primary color</label><Input type="color" value={settings.branding?.primary_color ?? "#1A6FD8"} onChange={(e) => patch("branding", "primary_color", e.target.value)} className="w-24 h-10" /></div>
        <Button onClick={() => save("branding")} disabled={busy}><Save className="w-4 h-4 mr-1" /> Save</Button>
      </Card></TabsContent>

      <TabsContent value="email"><Card className="p-5 bg-white border-slate-200 space-y-3">
        <div><label className="text-xs text-slate-600">From address</label><Input value={settings.email?.from_address ?? ""} onChange={(e) => patch("email", "from_address", e.target.value)} /></div>
        <div><label className="text-xs text-slate-600">Footer</label><Input value={settings.email?.footer ?? ""} onChange={(e) => patch("email", "footer", e.target.value)} /></div>
        <Button onClick={() => save("email")} disabled={busy}><Save className="w-4 h-4 mr-1" /> Save</Button>
      </Card></TabsContent>

      <TabsContent value="limits"><Card className="p-5 bg-white border-slate-200 space-y-3">
        {["free_tokens", "basic_tokens", "pro_tokens", "premium_tokens", "premium_plus_tokens", "max_tokens", "enterprise_tokens", "guest_tokens"].map((k) => (
          <div key={k}><label className="text-xs text-slate-600 capitalize">{k.replaceAll("_", " ")}</label><Input type="number" value={settings.limits?.[k] ?? 0} onChange={(e) => patch("limits", k, Number(e.target.value))} /></div>
        ))}
        <Button onClick={() => save("limits")} disabled={busy}><Save className="w-4 h-4 mr-1" /> Save</Button>
      </Card></TabsContent>

      <TabsContent value="integrations"><Card className="p-5 bg-white border-slate-200 space-y-3">
        <div className="flex items-center justify-between"><span className="text-sm">Google OAuth visible</span><Switch checked={!!settings.integrations?.google_oauth} onCheckedChange={(v) => patch("integrations", "google_oauth", v)} /></div>
        <div className="flex items-center justify-between"><span className="text-sm">GitHub OAuth visible</span><Switch checked={!!settings.integrations?.github_oauth} onCheckedChange={(v) => patch("integrations", "github_oauth", v)} /></div>
        <Button onClick={() => save("integrations")} disabled={busy}><Save className="w-4 h-4 mr-1" /> Save</Button>
      </Card></TabsContent>
    </Tabs>
  );
}
