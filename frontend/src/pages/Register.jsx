import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CnicUploader from "@/components/CnicUploader";
import { toast } from "sonner";

export default function Register() {
  const { register, enums } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    name: "", email: "", password: "", cnic_or_pmdc: "", specialty: "Neurology", hospital: "", city: "", phone: "", cnic_card_data_url: "",
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.cnic_card_data_url) { setErr("Please upload a picture of your CNIC / PMDC card."); return; }
    setBusy(true); setErr("");
    const r = await register(form);
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    toast.success("Registration submitted — awaiting admin verification.");
    nav("/doctor");
  };

  return (
    <div className="App bg-[#FAFAFA] min-h-screen">
      <AppHeader />
      <div className="max-w-2xl mx-auto px-6 py-14">
        <div className="uppercase-label">Doctor registration</div>
        <h1 className="font-display text-4xl mt-2 text-[#172320]">Join the registry</h1>
        <p className="mt-2 text-sm text-[#5C6D68]">Your account will be reviewed by an administrator. You'll be able to sign in immediately but access to records unlocks after verification.</p>
        <div className="mt-3 text-xs text-[#5C6D68]">Not a clinician? <Link to="/register-data-collector" className="text-[#1B3B36] underline font-semibold">Register as a data collector →</Link></div>

        <form onSubmit={submit} className="mt-8 bg-white border border-[#E5E7E5] p-8 grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Full name" required>
            <Input value={form.name} onChange={(e)=>set("name", e.target.value)} required data-testid="reg-name" className="rounded-none focus-visible:ring-[#1B3B36]" />
          </Field>
          <Field label="CNIC / PMDC registration" required>
            <Input value={form.cnic_or_pmdc} onChange={(e)=>set("cnic_or_pmdc", e.target.value)} required data-testid="reg-cnic" className="rounded-none focus-visible:ring-[#1B3B36]" />
          </Field>
          <Field label="Email" required>
            <Input type="email" value={form.email} onChange={(e)=>set("email", e.target.value)} required data-testid="reg-email" className="rounded-none focus-visible:ring-[#1B3B36]" />
          </Field>
          <Field label="Password (min 6)" required>
            <Input type="password" value={form.password} onChange={(e)=>set("password", e.target.value)} required data-testid="reg-password" className="rounded-none focus-visible:ring-[#1B3B36]" />
          </Field>
          <Field label="Specialty">
            <Select value={form.specialty} onValueChange={(v)=>set("specialty", v)}>
              <SelectTrigger className="rounded-none" data-testid="reg-specialty"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(enums?.specialties || []).map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Hospital / Clinic" required>
            <Input value={form.hospital} onChange={(e)=>set("hospital", e.target.value)} required data-testid="reg-hospital" className="rounded-none focus-visible:ring-[#1B3B36]" />
          </Field>
          <Field label="City" required>
            <Input value={form.city} onChange={(e)=>set("city", e.target.value)} required data-testid="reg-city" className="rounded-none focus-visible:ring-[#1B3B36]" />
          </Field>
          <Field label="Phone" required>
            <Input value={form.phone} onChange={(e)=>set("phone", e.target.value)} required data-testid="reg-phone" placeholder="e.g. +92 300 1234567" className="rounded-none focus-visible:ring-[#1B3B36]" />
          </Field>

          <div className="md:col-span-2">
            <Label className="uppercase-label">CNIC / PMDC card picture<span className="text-[#B0513A]"> *</span></Label>
            <div className="mt-2">
              <CnicUploader
                value={form.cnic_card_data_url}
                onChange={(v)=>set("cnic_card_data_url", v)}
                label="CNIC / PMDC card"
                testId="reg-cnic-img"
              />
            </div>
          </div>

          {err && <div className="md:col-span-2 text-sm text-[#B0513A]" data-testid="reg-error">{err}</div>}
          <div className="md:col-span-2 flex items-center justify-between mt-2">
            <Link to="/login" className="text-sm text-[#5C6D68] underline">Already registered? Sign in.</Link>
            <Button type="submit" disabled={busy} className="btn-pine rounded-none px-6 h-11" data-testid="reg-submit">
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

