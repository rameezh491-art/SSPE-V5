import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import CnicUploader from "@/components/CnicUploader";
import { toast } from "sonner";
import { ClipboardList } from "lucide-react";

export default function DataCollectorRegister() {
  const { registerDataCollector } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", cnic: "", phone: "", id_card_data_url: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.id_card_data_url) { setErr("Please upload a picture of your CNIC / ID card."); return; }
    setBusy(true); setErr("");
    const r = await registerDataCollector(form);
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    toast.success("Registration submitted — awaiting admin verification.");
    nav("/data-collector");
  };

  return (
    <div className="App bg-[#FAFAFA] min-h-screen">
      <AppHeader />
      <div className="max-w-2xl mx-auto px-6 py-14">
        <div className="flex items-center gap-2 uppercase-label"><ClipboardList className="w-3.5 h-3.5"/>Data collector registration</div>
        <h1 className="font-display text-4xl mt-2 text-[#172320]">Help us capture SSPE data</h1>
        <p className="mt-2 text-sm text-[#5C6D68]">Anyone can register. Once verified by an admin, you can request access from a specific doctor to help enter and update their patient records.</p>
        <div className="mt-3 text-xs text-[#5C6D68]">Are you a clinician? <Link to="/register" className="text-[#1B3B36] underline font-semibold">Register as a doctor →</Link></div>

        <form onSubmit={submit} className="mt-8 bg-white border border-[#E5E7E5] p-8 grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Full name" required>
            <Input value={form.name} onChange={(e)=>set("name", e.target.value)} required data-testid="dc-reg-name" className="rounded-none focus-visible:ring-[#1B3B36]"/>
          </Field>
          <Field label="CNIC" required>
            <Input value={form.cnic} onChange={(e)=>set("cnic", e.target.value)} required data-testid="dc-reg-cnic" placeholder="42101-1234567-1" className="rounded-none focus-visible:ring-[#1B3B36]"/>
          </Field>
          <Field label="Email" required>
            <Input type="email" value={form.email} onChange={(e)=>set("email", e.target.value)} required data-testid="dc-reg-email" className="rounded-none focus-visible:ring-[#1B3B36]"/>
          </Field>
          <Field label="Password (min 6)" required>
            <Input type="password" value={form.password} onChange={(e)=>set("password", e.target.value)} required data-testid="dc-reg-password" className="rounded-none focus-visible:ring-[#1B3B36]"/>
          </Field>
          <Field label="Phone" required>
            <Input value={form.phone} onChange={(e)=>set("phone", e.target.value)} required data-testid="dc-reg-phone" placeholder="+92 300 1234567" className="rounded-none focus-visible:ring-[#1B3B36]"/>
          </Field>

          <div className="md:col-span-2">
            <Label className="uppercase-label">CNIC / ID card picture<span className="text-[#B0513A]"> *</span></Label>
            <div className="mt-2">
              <CnicUploader value={form.id_card_data_url} onChange={(v)=>set("id_card_data_url", v)} label="ID card" testId="dc-reg-idcard"/>
            </div>
          </div>

          {err && <div className="md:col-span-2 text-sm text-[#B0513A]" data-testid="dc-reg-error">{err}</div>}
          <div className="md:col-span-2 flex items-center justify-between mt-2">
            <Link to="/login" className="text-sm text-[#5C6D68] underline">Already registered? Sign in.</Link>
            <Button type="submit" disabled={busy} className="btn-pine rounded-none px-6 h-11" data-testid="dc-reg-submit">
              {busy ? "Submitting…" : "Create account"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <Label className="uppercase-label">{label}{required && <span className="text-[#B0513A]"> *</span>}</Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
