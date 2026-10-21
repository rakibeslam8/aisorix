import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import { fetchAdminRoles, isAdminEmail } from "../lib/adminApi";

export default function AdminLogin() {
  const { user, signIn } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/admin/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // Auto-route if already an admin
  useEffect(() => {
    if (!user) return;
    (async () => {
      if (!isAdminEmail(user.email)) return;
      const roles = await fetchAdminRoles(user.id);
      if (roles.length) nav(redirect, { replace: true });
    })();
  }, [user, nav, redirect]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminEmail(email)) {
      toast.error("Admin portal is restricted to @aisorix.com emails");
      return;
    }
    setBusy(true);
    const { error } = await signIn(email.trim(), password);
    setBusy(false);
    if (error) {
      toast.error(error.message || "Invalid credentials");
      return;
    }
    nav(redirect, { replace: true });
  };

  return (
    <div data-admin-theme className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0A1628] via-[#0f1e36] to-[#0A1628] p-4">
      <Card className="w-full max-w-md p-8 bg-slate-900/80 border-slate-800 backdrop-blur shadow-2xl">
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1A6FD8] to-[#00B4D8] flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-white">AI Sorix Admin Portal</h1>
            <p className="text-xs text-slate-400 mt-1">Restricted access · @aisorix.com only</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@aisorix.com" required className="bg-slate-800 border-slate-700 text-white" />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-slate-800 border-slate-700 text-white" />
          </div>
          <Button type="submit" disabled={busy} className="w-full bg-gradient-to-r from-[#1A6FD8] to-[#00B4D8] hover:opacity-90">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign in to Admin"}
          </Button>
        </form>
        <div className="mt-6 text-center text-xs text-slate-500">
          <Link to="/" className="hover:text-slate-300">← Back to main app</Link>
        </div>
      </Card>
    </div>
  );
}
