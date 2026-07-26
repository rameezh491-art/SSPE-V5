import React, { useEffect, useMemo, useState } from "react";
import { api, apiErrText } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Search, Share2, Check, Users, Building2 } from "lucide-react";

/**
 * ShareAccessDialog
 * Props:
 *  - open, onOpenChange
 *  - myPatients: [{ id, section2: { full_name, city }, dykens_score, ... }]
 *  - onGranted: callback after successful grant
 */
export default function ShareAccessDialog({ open, onOpenChange, myPatients = [], onGranted }) {
  const [doctors, setDoctors] = useState([]);
  const [docQ, setDocQ] = useState("");
  const [targetId, setTargetId] = useState("");
  const [scope, setScope] = useState("all");
  const [selected, setSelected] = useState(new Set());
  const [patientQ, setPatientQ] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    // reset each time it opens
    setTargetId(""); setScope("all"); setSelected(new Set()); setDocQ(""); setPatientQ(""); setMessage("");
    (async () => {
      try {
        const { data } = await api.get("/doctors");
        setDoctors(data);
      } catch (e) { toast.error(apiErrText(e)); }
    })();
  }, [open]);

  const filteredDoctors = useMemo(() => {
    const q = docQ.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter(d =>
      (d.name || "").toLowerCase().includes(q) ||
      (d.specialty || "").toLowerCase().includes(q) ||
      (d.hospital || "").toLowerCase().includes(q) ||
      (d.city || "").toLowerCase().includes(q)
    );
  }, [doctors, docQ]);

  const filteredPatients = useMemo(() => {
    const q = patientQ.trim().toLowerCase();
    if (!q) return myPatients;
    return myPatients.filter(p =>
      (p.section2?.full_name || "").toLowerCase().includes(q) ||
      (p.section2?.city || "").toLowerCase().includes(q) ||
      (p.id || "").includes(q)
    );
  }, [myPatients, patientQ]);

  const target = doctors.find(d => d.id === targetId);
  const targetPreview = target ? `${target.name} — ${target.specialty} · ${target.hospital}, ${target.city}` : "";

  const toggleAllVisible = (on) => {
    const next = new Set(selected);
    filteredPatients.forEach(p => { if (on) next.add(p.id); else next.delete(p.id); });
    setSelected(next);
  };

  const toggleOne = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const submit = async () => {
    if (!targetId) { toast.error("Select a doctor to share with."); return; }
    if (scope === "selected" && selected.size === 0) { toast.error("Select at least one patient — or switch to 'All my patients'."); return; }
    setBusy(true);
    try {
      const body = {
        target_doctor_id: targetId,
        scope,
        message,
        ...(scope === "selected" ? { patient_ids: Array.from(selected) } : {}),
      };
      const { data } = await api.post("/patients/share-edit", body);
      if (data.granted > 0) {
        toast.success(`Granted edit access on ${data.granted} record${data.granted===1?"":"s"} to ${data.target.name}${data.already_had_access?` (${data.already_had_access} already had access)`:""}`);
      } else {
        toast(`${data.target.name} already had access to every selected record.`);
      }
      onGranted?.(data);
      onOpenChange(false);
    } catch (e) { toast.error(apiErrText(e)); }
    setBusy(false);
  };

  const totalCount = scope === "all" ? myPatients.length : selected.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-none border-[#E5E7E5]" data-testid="share-dialog">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1B3B36] flex items-center justify-center"><Share2 className="w-4 h-4 text-white"/></div>
            <div>
              <DialogTitle className="font-display text-2xl text-[#172320]">Share edit access</DialogTitle>
              <DialogDescription className="text-[#5C6D68]">Grant another verified doctor the ability to edit your patient records.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2 max-h-[65vh] overflow-y-auto pr-1">
          {/* Step 1 — Target */}
          <section>
            <Label className="uppercase-label">1 · Doctor to share with</Label>
            <div className="mt-2 flex items-center border border-[#E5E7E5] bg-white px-3">
              <Search className="w-4 h-4 text-[#5C6D68]"/>
              <Input value={docQ} onChange={(e)=>setDocQ(e.target.value)} placeholder="Search doctor by name, specialty, hospital, city…" className="border-0 focus-visible:ring-0 shadow-none bg-transparent h-10" data-testid="share-doctor-search"/>
            </div>
            <div className="mt-2 max-h-52 overflow-auto border border-[#E5E7E5]">
              {filteredDoctors.length === 0 && (
                <div className="p-4 text-sm text-[#5C6D68]">No doctors match your search.</div>
              )}
              {filteredDoctors.map(d => (
                <label key={d.id} className={`flex items-start gap-3 p-3 border-b border-[#E5E7E5] cursor-pointer ${targetId===d.id?"bg-[#F2F4F3]":"hover:bg-[#F9FAF9]"}`} data-testid={`share-doctor-${d.id}`}>
                  <RadioGroup value={targetId} onValueChange={setTargetId} className="mt-0.5">
                    <RadioGroupItem value={d.id} className="border-[#1B3B36] text-[#1B3B36]"/>
                  </RadioGroup>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[#172320]">{d.name}</div>
                    <div className="text-xs text-[#5C6D68] flex items-center gap-2 mt-0.5">
                      <span>{d.specialty}</span>
                      <span className="text-[#E5E7E5]">·</span>
                      <span className="inline-flex items-center gap-1"><Building2 className="w-3 h-3"/>{d.hospital}, {d.city}</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
            {target && (
              <div className="mt-2 text-xs text-[#2C3B37] flex items-center gap-1"><Check className="w-3.5 h-3.5 text-[#2F6B4C]"/>{targetPreview}</div>
            )}
          </section>

          {/* Step 2 — Scope */}
          <section>
            <Label className="uppercase-label">2 · Which patients?</Label>
            <RadioGroup value={scope} onValueChange={setScope} className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
              <ScopeOption value="all" title="All my patients" desc={`${myPatients.length} record${myPatients.length===1?"":"s"} you own`} selected={scope==="all"} testId="share-scope-all"/>
              <ScopeOption value="selected" title="Selected patients" desc="Pick specific records below" selected={scope==="selected"} testId="share-scope-selected"/>
            </RadioGroup>

            {scope === "selected" && (
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 flex items-center border border-[#E5E7E5] bg-white px-3">
                    <Search className="w-4 h-4 text-[#5C6D68]"/>
                    <Input value={patientQ} onChange={(e)=>setPatientQ(e.target.value)} placeholder="Filter your patients by name, city or ID…" className="border-0 focus-visible:ring-0 shadow-none bg-transparent h-10" data-testid="share-patient-search"/>
                  </div>
                  <Button type="button" variant="outline" onClick={()=>toggleAllVisible(true)} className="rounded-none btn-outline-pine h-10 text-xs" data-testid="share-select-visible">Select visible</Button>
                  <Button type="button" variant="outline" onClick={()=>toggleAllVisible(false)} className="rounded-none h-10 text-xs" data-testid="share-clear-visible">Clear visible</Button>
                </div>
                <div className="max-h-64 overflow-auto border border-[#E5E7E5]">
                  {filteredPatients.length === 0 && <div className="p-4 text-sm text-[#5C6D68]">No patients match.</div>}
                  {filteredPatients.map(p => (
                    <label key={p.id} className={`flex items-start gap-3 p-3 border-b border-[#E5E7E5] cursor-pointer ${selected.has(p.id)?"bg-[#F5F8F7]":"hover:bg-[#F9FAF9]"}`} data-testid={`share-patient-${p.id}`}>
                      <Checkbox checked={selected.has(p.id)} onCheckedChange={()=>toggleOne(p.id)} className="rounded-none data-[state=checked]:bg-[#1B3B36] data-[state=checked]:border-[#1B3B36] mt-0.5"/>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-[#172320]">{p.section2?.full_name}</div>
                        <div className="text-xs text-[#5C6D68]">{p.section2?.age} y · {p.section2?.gender} · {p.section2?.city} · Dyken's {p.dykens_score}/5</div>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="mt-2 uppercase-label">{selected.size} selected</div>
              </div>
            )}
          </section>

          {/* Step 3 — Message */}
          <section>
            <Label className="uppercase-label">3 · Note for the audit trail (optional)</Label>
            <Textarea rows={2} value={message} onChange={(e)=>setMessage(e.target.value)} placeholder="e.g. Please review these Karachi cases for a second opinion." className="rounded-none focus-visible:ring-[#1B3B36] mt-2" data-testid="share-message"/>
          </section>
        </div>

        <DialogFooter className="pt-4 border-t border-[#E5E7E5] flex items-center justify-between gap-3">
          <div className="text-xs text-[#5C6D68]">
            <Users className="w-3.5 h-3.5 inline mr-1"/>
            {target ? <>Granting edit on <strong className="text-[#172320]">{totalCount}</strong> record{totalCount===1?"":"s"} to <strong className="text-[#172320]">{target.name}</strong></> : <>Choose a doctor to continue.</>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={()=>onOpenChange(false)} className="rounded-none" data-testid="share-cancel">Cancel</Button>
            <Button onClick={submit} disabled={busy || !targetId} className="btn-pine rounded-none" data-testid="share-submit">
              <Share2 className="w-4 h-4 mr-2"/>{busy?"Sharing…":"Grant edit access"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScopeOption({ value, title, desc, selected, testId }) {
  return (
    <label className={`flex items-start gap-3 p-4 border cursor-pointer ${selected ? "border-[#1B3B36] bg-[#F5F8F7]" : "border-[#E5E7E5] bg-white hover:bg-[#F9FAF9]"}`} data-testid={testId}>
      <RadioGroupItem value={value} className="border-[#1B3B36] text-[#1B3B36] mt-1"/>
      <div>
        <div className="font-semibold text-[#172320]">{title}</div>
        <div className="text-xs text-[#5C6D68] mt-0.5">{desc}</div>
      </div>
    </label>
  );
}
