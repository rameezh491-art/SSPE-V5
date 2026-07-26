import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Login({ adminMode = false }) {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await login(email, password);
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    if (adminMode && r.user.role !== "admin") {
      setErr("This account is not an admin. Please use Doctor Login.");
      return;
    }
    toast.success(`Welcome back, ${r.user.name}`);
    if (r.user.role === "admin") nav("/admin");
    else if (r.user.role === "data_collector") nav("/data-collector");
    else nav("/doctor");
  };

  return (
    <div className="App bg-[#FAFAFA] min-h-screen">
      <AppHeader />
      <div className="max-w-md mx-auto px-6 py-16">
        <div className="uppercase-label">{adminMode ? "Admin access" : "Doctor access"}</div>
        <h1 className="font-display text-4xl mt-2 text-[#172320]">Sign in</h1>
        <p className="mt-2 text-sm text-[#5C6D68]">{adminMode ? "Administrator control panel." : "Access your patient records and research tools."}</p>

        <form onSubmit={submit} className="mt-8 space-y-5 bg-white border border-[#E5E7E5] p-8">
          <div>
            <Label className="uppercase-label" htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required data-testid="login-email"
              className="mt-2 rounded-none border-[#E5E7E5] focus-visible:ring-[#1B3B36]" />
          </div>
          <div>
            <Label className="uppercase-label" htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required data-testid="login-password"
              className="mt-2 rounded-none border-[#E5E7E5] focus-visible:ring-[#1B3B36]" />
          </div>
          {err && <div className="text-sm text-[#B0513A]" data-testid="login-error">{err}</div>}
          <Button type="submit" disabled={busy} className="w-full btn-pine rounded-none h-11" data-testid="login-submit">
            {busy ? "Signing in…" : "Sign in"}
          </Button>
          {!adminMode && (
            <div className="text-sm text-[#5C6D68]">New here? <Link to="/register" className="text-[#1B3B36] font-semibold underline">Register as a doctor</Link></div>
          )}
        </form>

        <div className="mt-6 p-4 bg-white border border-dashed border-[#E5E7E5] text-xs text-[#5C6D68]">
          <div className="uppercase-label mb-1">Demo credentials</div>
          {adminMode ? (
            <div>admin@neurohistory.pk / Admin@12345</div>
          ) : (
            <div>ayesha@neurohistory.pk / Doctor@123 &nbsp;·&nbsp; bilal@neurohistory.pk / Doctor@123</div>
          )}
        </div>
      </div>
    </div>
  );
}
