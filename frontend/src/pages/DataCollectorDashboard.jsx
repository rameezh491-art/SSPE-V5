import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, apiErrText } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { AppHeader } from "@/components/AppHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Search, Lock, ShieldCheck, Send, Building2, MapPin, ClipboardList } from "lucide-react";

export default function DataCollectorDashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState("patients");
  const [patients, setPatients] = useState([]);
  const [q, setQ] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [doctorQ, setDoctorQ] = useState("");
  const [outgoing, setOutgoing] = useState([]);
  const [askOpen, setAskOpen] = useState(false);
  const [target, setTarget] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const isVerified = user?.status === "verified";

  const loadPatients = async () => {
    try {
      const { data } = await api.get("/data-collector/patients", { params: q ? { q } : {} });
      setPatients(data);
    } catch (e) { toast.error(apiErrText(e)); }
  };
  const loadDoctors = async () => {
    try {
      const { data } = await api.get("/doctors", { params: doctorQ ? { q: doctorQ } : {} });
      setDoctors(data);
    } catch (e) { toast.error(apiErrText(e)); }
  };
  const loadOutgoing = async () => {
    try {
      const { data } = await api.get("/data-collector-requests");
      setOutgoing(data);
    } catch (e) { toast.error(apiErrText(e)); }
  };

  useEffect(() => {
    if (!isVerified) return;
    loadPatients(); loadDoctors(); loadOutgoing();
    // eslint-disable-next-line
  }, [isVerified]);

  useEffect(() => { if (isVerified) loadPatients(); /* eslint-disable-next-line */ }, [q]);
  useEffect(() => { if (isVerified) loadDoctors(); /* eslint-disable-next-line */ }, [doctorQ]);

  const openAsk = (doctor) => { setTarget(doctor); setMessage(""); setAskOpen(true); };

  const submitAsk = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await api.post("/data-collector-requests", { doctor_id: target.id, message });
      toast.success(`Request sent to ${target.name}`);
      setAskOpen(false);
      loadOutgoing();
    } catch (e) { toast.error(apiErrText(e)); }
    setBusy(false);
  };

  if (!isVerified) {
    return (
      <div className="App bg-[#FAFAFA] min-h-screen">
        <AppHeader />
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <Lock className="w-10 h-10 text-[#C48F38] mx-auto"/>
          <h1 className="font-display text-3xl mt-4 text-[#172320]">Account pending verification</h1>
          <p className="mt-3 text-[#5C6D68]">An administrator will review your ID card and details shortly. Once approved you'll be able to request record access from doctors.</p>
          <div className="mt-6 uppercase-label">Current status: <span className="text-[#B0513A]">{user?.status}</span></div>
        </div>
      </div>
    );
  }

  return (
    <div className="App bg-[#FAFAFA] min-h-screen">
      <AppHeader />
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="uppercase-label flex items-center gap-2"><ClipboardList className="w-3.5 h-3.5"/>Data collector workspace</div>
        <h1 className="font-display text-4xl text-[#172320]">{user?.name?.split(" ").slice(-1)}'s workspace</h1>
        <p className="text-sm text-[#5C6D68] mt-1">Enter and update SSPE records for the doctors who have granted you access.</p>

        <Tabs value={tab} onValueChange={setTab} className="mt-6">
          <TabsList className="bg-white border border-[#E5E7E5] rounded-none">
            <TabsTrigger value="patients" data-testid="dc-tab-patients">My Granted Patients ({patients.length})</TabsTrigger>
            <TabsTrigger value="doctors" data-testid="dc-tab-doctors">Ask a Doctor</TabsTrigger>
            <TabsTrigger value="outgoing" data-testid="dc-tab-outgoing">My Requests ({outgoing.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="patients" className="mt-6">
            <div className="flex gap-2 mb-4">
              <div className="flex-1 flex items-center border border-[#E5E7E5] bg-white px-3">
                <Search className="w-4 h-4 text-[#5C6D68]"/>
                <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search by name, city or record ID…" className="border-0 focus-visible:ring-0 shadow-none bg-transparent" data-testid="dc-patients-search"/>
              </div>
            </div>
            {patients.length === 0 ? (
              <div className="p-8 bg-white border border-dashed border-[#E5E7E5] text-sm text-[#5C6D68] text-center">No patients granted yet. Head to <span className="font-semibold text-[#172320]">Ask a Doctor</span> to request access.</div>
            ) : (
              <div className="bg-white border border-[#E5E7E5] overflow-auto">
                <Table>
                  <TableHeader className="bg-[#F2F4F3]">
                    <TableRow>
                      <TableHead className="uppercase-label">Name</TableHead>
                      <TableHead className="uppercase-label">Age</TableHead>
                      <TableHead className="uppercase-label">City</TableHead>
                      <TableHead className="uppercase-label">Owner</TableHead>
                      <TableHead className="uppercase-label">Dyken's</TableHead>
                      <TableHead className="uppercase-label"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patients.map(p => (
                      <TableRow key={p.id} className="row-hover" data-testid={`dc-patient-row-${p.id}`}>
                        <TableCell className="font-semibold cursor-pointer" onClick={()=>nav(`/doctor/patients/${p.id}`)}>{p.section2?.full_name}</TableCell>
                        <TableCell>{p.section2?.age}</TableCell>
                        <TableCell>{p.section2?.city}</TableCell>
                        <TableCell className="text-sm">{p.owner_name}</TableCell>
                        <TableCell><span className={`px-2 py-0.5 text-xs font-semibold ${p.dykens_score>=4?"bg-[#1B3B36] text-white":p.dykens_score===3?"bg-[#C48F38] text-white":"bg-[#E5E7E5]"}`}>{p.dykens_score}/5</span></TableCell>
                        <TableCell><Button size="sm" className="btn-pine rounded-none h-8" onClick={()=>nav(`/doctor/patients/${p.id}/edit`)} data-testid={`dc-edit-${p.id}`}>Open &amp; edit</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="doctors" className="mt-6">
            <div className="flex gap-2 mb-4">
              <div className="flex-1 flex items-center border border-[#E5E7E5] bg-white px-3">
                <Search className="w-4 h-4 text-[#5C6D68]"/>
                <Input value={doctorQ} onChange={(e)=>setDoctorQ(e.target.value)} placeholder="Search by name, specialty, hospital, city…" className="border-0 focus-visible:ring-0 shadow-none bg-transparent" data-testid="dc-doctors-search"/>
              </div>
            </div>
            {doctors.length === 0 ? (
              <div className="p-8 bg-white border border-dashed border-[#E5E7E5] text-sm text-[#5C6D68] text-center">No matching doctors.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {doctors.map(d => (
                  <div key={d.id} className="bg-white border border-[#E5E7E5] p-5" data-testid={`dc-doctor-card-${d.id}`}>
                    <div className="font-semibold text-[#172320]">{d.name}</div>
                    <div className="text-xs text-[#5C6D68] mt-0.5">{d.specialty}</div>
                    <div className="mt-3 space-y-1.5 text-sm text-[#2C3B37]">
                      <div className="flex items-center gap-2"><Building2 className="w-3.5 h-3.5 text-[#5C6D68]"/>{d.hospital}</div>
                      <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-[#5C6D68]"/>{d.city}</div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#E5E7E5] flex justify-end">
                      <Button size="sm" onClick={()=>openAsk(d)} className="btn-pine rounded-none" data-testid={`dc-ask-${d.id}`}>
                        <Send className="w-3 h-3 mr-1.5"/>Request access
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="outgoing" className="mt-6">
            <div className="bg-white border border-[#E5E7E5]">
              {outgoing.length === 0 ? (
                <div className="p-6 text-sm text-[#5C6D68]">No requests yet.</div>
              ) : (
                outgoing.map(r => (
                  <div key={r.id} className="p-4 border-b border-[#E5E7E5] flex items-start justify-between" data-testid={`dc-req-${r.id}`}>
                    <div>
                      <div className="font-semibold text-[#172320]">To: {r.doctor_name}</div>
                      {r.message && <div className="text-sm text-[#2C3B37] italic mt-1">"{r.message}"</div>}
                      <div className="uppercase-label mt-2">Sent {new Date(r.created_at).toLocaleString()}</div>
                    </div>
                    <StatusPill status={r.status}/>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={askOpen} onOpenChange={setAskOpen}>
        <DialogContent className="rounded-none max-w-lg" data-testid="dc-ask-dialog">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-[#172320]">Request access from {target?.name}</DialogTitle>
            <DialogDescription className="text-[#5C6D68]">Tell the doctor what you'd like to work on. They'll pick which patients to grant you access to.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="text-xs text-[#5C6D68]">Doctor</div>
            <div className="text-sm text-[#172320] font-semibold">{target?.specialty} · {target?.hospital}, {target?.city}</div>
            <div>
              <div className="uppercase-label mb-1">Message (optional)</div>
              <Textarea rows={4} value={message} onChange={(e)=>setMessage(e.target.value)} placeholder="e.g. I'd like to help you enter your Karachi SSPE cases. Grant me access to all your patients." className="rounded-none focus-visible:ring-[#1B3B36]" data-testid="dc-ask-message"/>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setAskOpen(false)} className="rounded-none">Cancel</Button>
            <Button onClick={submitAsk} disabled={busy} className="btn-pine rounded-none" data-testid="dc-ask-submit">
              <Send className="w-4 h-4 mr-2"/>{busy?"Sending…":"Send request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    pending: "bg-[#C48F38] text-white",
    approved: "bg-[#2F6B4C] text-white",
    denied: "bg-[#B0513A] text-white",
  };
  return <span className={`px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${map[status]||"bg-[#E5E7E5]"}`}>{status}</span>;
}
