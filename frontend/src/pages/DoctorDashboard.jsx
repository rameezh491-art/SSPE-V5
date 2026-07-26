import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, apiErrText } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { AppHeader } from "@/components/AppHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Search, Plus, Check, X, Download, FileText, Lock, ShieldCheck, Share2 } from "lucide-react";
import ShareAccessDialog from "@/components/ShareAccessDialog";

export default function DoctorDashboard() {
  const { user, enums } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState("mine");
  const [mine, setMine] = useState([]);
  const [all, setAll] = useState([]);
  const [q, setQ] = useState("");
  const [reqsIn, setReqsIn] = useState([]);
  const [reqsOut, setReqsOut] = useState([]);
  const [research, setResearch] = useState({ province: "", city: "", ethnicity: "", gender: "", age_min: "", age_max: "", symptoms_any: [], dykens_min: "", dykens_max: "", measles_vaccine_received: "" });
  const [researchResult, setResearchResult] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [dcRequests, setDcRequests] = useState([]);
  const [shareForDc, setShareForDc] = useState(null); // { collector_id, collector_name, request_id }

  const isVerified = user?.status === "verified";

  const loadPatients = async () => {
    try {
      const [{ data: m }, { data: a }] = await Promise.all([
        api.get("/patients", { params: { scope: "mine", q } }),
        api.get("/patients", { params: { scope: "all", q } }),
      ]);
      setMine(m); setAll(a);
    } catch (e) { toast.error(apiErrText(e)); }
  };
  const loadReqs = async () => {
    try {
      const [{ data: inc }, { data: out }] = await Promise.all([
        api.get("/edit-requests", { params: { direction: "incoming" } }),
        api.get("/edit-requests", { params: { direction: "outgoing" } }),
      ]);
      setReqsIn(inc); setReqsOut(out);
    } catch (e) { toast.error(apiErrText(e)); }
  };

  useEffect(() => { if (isVerified) { loadPatients(); loadReqs(); } /* eslint-disable-next-line */ }, [isVerified]);

  const requestEdit = async (patientId) => {
    try {
      await api.post("/edit-requests", { patient_id: patientId, message: "Please grant edit access." });
      toast.success("Edit access requested");
      loadReqs();
    } catch (e) { toast.error(apiErrText(e)); }
  };

  const approve = async (id) => { await api.post(`/edit-requests/${id}/approve`); toast.success("Approved"); loadReqs(); loadPatients(); };
  const deny = async (id) => { await api.post(`/edit-requests/${id}/deny`); toast("Denied"); loadReqs(); };

  const runResearch = async () => {
    try {
      const body = { ...research };
      ["age_min","age_max","dykens_min","dykens_max"].forEach(k => body[k] = body[k]===""?null:Number(body[k]));
      ["province","city","ethnicity","gender","measles_vaccine_received"].forEach(k => { if (!body[k]) body[k] = null; });
      const { data } = await api.post("/research/query", body);
      setResearchResult(data);
    } catch (e) { toast.error(apiErrText(e)); }
  };
  const exportResearch = async () => {
    try {
      const body = { ...research };
      ["age_min","age_max","dykens_min","dykens_max"].forEach(k => body[k] = body[k]===""?null:Number(body[k]));
      ["province","city","ethnicity","gender","measles_vaccine_received"].forEach(k => { if (!body[k]) body[k] = null; });
      const resp = await api.post("/research/export", body, { responseType: "blob" });
      const url = URL.createObjectURL(resp.data);
      const link = document.createElement("a"); link.href = url; link.download = "neurohistory_export.csv"; link.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error(apiErrText(e)); }
  };

  if (!isVerified) {
    return (
      <div className="App bg-[#FAFAFA] min-h-screen">
        <AppHeader />
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <Lock className="w-10 h-10 text-[#C48F38] mx-auto"/>
          <h1 className="font-display text-3xl mt-4 text-[#172320]">Account pending verification</h1>
          <p className="mt-3 text-[#5C6D68]">An administrator will review your credentials shortly. Once approved, you'll be able to create patient records and access the research tool.</p>
          <div className="mt-6 uppercase-label">Current status: <span className="text-[#B0513A]">{user?.status}</span></div>
        </div>
      </div>
    );
  }

  return (
    <div className="App bg-[#FAFAFA] min-h-screen">
      <AppHeader />
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="uppercase-label">Doctor dashboard</div>
            <h1 className="font-display text-4xl text-[#172320]">{user?.name?.split(" ").slice(-1)}'s workspace</h1>
            <p className="text-[#5C6D68] mt-1">{user?.specialty} · {user?.hospital} · {user?.city}</p>
          </div>
          <Button onClick={()=>nav("/doctor/patients/new")} className="btn-pine rounded-none h-11" data-testid="btn-new-patient">
            <Plus className="w-4 h-4 mr-2"/>New Patient History
          </Button>
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <Button onClick={()=>setShareOpen(true)} variant="outline" className="rounded-none btn-outline-pine" disabled={mine.length===0} data-testid="btn-share-access" title={mine.length===0?"Create a patient first":"Share edit access with another doctor"}>
            <Share2 className="w-4 h-4 mr-2"/>Share edit access
          </Button>
          <div className="text-xs text-[#5C6D68]">Proactively grant another verified doctor edit rights on all or specific patients you own.</div>
        </div>

        <ShareAccessDialog
          open={shareOpen}
          onOpenChange={(v)=>{ setShareOpen(v); if (!v) setShareForDc(null); }}
          myPatients={mine}
          presetTarget={shareForDc?.target}
          onGranted={async () => {
            if (shareForDc?.request_id) {
              try { await api.post(`/data-collector-requests/${shareForDc.request_id}/approve`); } catch {}
            }
            setShareForDc(null);
            loadPatients(); loadReqs();
          }}
        />

        <Tabs value={tab} onValueChange={setTab} className="mt-6">
          <TabsList className="bg-white border border-[#E5E7E5] rounded-none p-0">
            <TabsTrigger value="mine" data-testid="tab-mine">My Patients ({mine.length})</TabsTrigger>
            <TabsTrigger value="all" data-testid="tab-all">All Patients ({all.length})</TabsTrigger>
            <TabsTrigger value="requests" data-testid="tab-requests">Edit Requests {reqsIn.filter(r=>r.status==="pending").length ? <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-[#B0513A] text-white">{reqsIn.filter(r=>r.status==="pending").length}</span> : null}</TabsTrigger>
            <TabsTrigger value="research" data-testid="tab-research">Research / Filter</TabsTrigger>
          </TabsList>

          <TabsContent value="mine" className="mt-6">
            <SearchBar q={q} setQ={setQ} onSearch={loadPatients}/>
            <PatientsTable rows={mine} onRow={(p)=>nav(`/doctor/patients/${p.id}`)} onRequestEdit={requestEdit}/>
          </TabsContent>

          <TabsContent value="all" className="mt-6">
            <SearchBar q={q} setQ={setQ} onSearch={loadPatients}/>
            <PatientsTable rows={all} onRow={(p)=>nav(`/doctor/patients/${p.id}`)} onRequestEdit={requestEdit}/>
          </TabsContent>

          <TabsContent value="requests" className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white border border-[#E5E7E5]">
              <div className="p-4 border-b border-[#E5E7E5] flex items-center justify-between">
                <div className="font-display text-lg text-[#172320]">Incoming</div>
                <div className="uppercase-label">On records you own</div>
              </div>
              {reqsIn.length===0 && <div className="p-6 text-sm text-[#5C6D68]">No incoming requests.</div>}
              {reqsIn.map(r => (
                <div key={r.id} className="p-4 border-b border-[#E5E7E5]" data-testid={`req-in-${r.id}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-[#172320]">{r.requester_name} <span className="text-[#5C6D68] font-normal">· {r.requester_hospital}</span></div>
                      <div className="text-sm text-[#5C6D68]">wants edit access on <Link to={`/doctor/patients/${r.patient_id}`} className="underline text-[#1B3B36]">{r.patient_name}</Link></div>
                      {r.message && <div className="mt-1 text-sm text-[#2C3B37] italic">"{r.message}"</div>}
                    </div>
                    <StatusBadge status={r.status}/>
                  </div>
                  {r.status === "pending" && (
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={()=>approve(r.id)} className="btn-pine rounded-none" data-testid={`approve-${r.id}`}><Check className="w-3 h-3 mr-1"/>Approve</Button>
                      <Button size="sm" variant="outline" onClick={()=>deny(r.id)} className="rounded-none border-[#B0513A] text-[#B0513A] hover:bg-[#B0513A] hover:text-white" data-testid={`deny-${r.id}`}><X className="w-3 h-3 mr-1"/>Deny</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="bg-white border border-[#E5E7E5]">
              <div className="p-4 border-b border-[#E5E7E5] flex items-center justify-between">
                <div className="font-display text-lg text-[#172320]">Outgoing</div>
                <div className="uppercase-label">Requests you've sent</div>
              </div>
              {reqsOut.length===0 && <div className="p-6 text-sm text-[#5C6D68]">No outgoing requests.</div>}
              {reqsOut.map(r => (
                <div key={r.id} className="p-4 border-b border-[#E5E7E5]">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-[#172320]">{r.patient_name}</div>
                      <div className="text-sm text-[#5C6D68]">owner: {r.owner_name}</div>
                    </div>
                    <StatusBadge status={r.status}/>
                  </div>
                </div>
              ))}
            </div>

            {/* Data Collector requests */}
            <div className="bg-white border border-[#E5E7E5] lg:col-span-2">
              <div className="p-4 border-b border-[#E5E7E5] flex items-center justify-between">
                <div className="font-display text-lg text-[#172320]">Data collector requests</div>
                <div className="uppercase-label">Non-clinicians asking to enter data for you</div>
              </div>
              {dcRequests.length === 0 && <div className="p-6 text-sm text-[#5C6D68]">No data collector requests yet.</div>}
              {dcRequests.map(r => (
                <div key={r.id} className="p-4 border-b border-[#E5E7E5]" data-testid={`dc-req-in-${r.id}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-semibold text-[#172320]">{r.collector_name}</div>
                      <div className="text-sm text-[#5C6D68]">{r.collector_email} · {r.collector_phone}</div>
                      {r.message && <div className="mt-1 text-sm text-[#2C3B37] italic">"{r.message}"</div>}
                    </div>
                    <StatusBadge status={r.status}/>
                  </div>
                  {r.status === "pending" && (
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={()=>{ setShareForDc({ target: { id: r.collector_id, name: r.collector_name, specialty: "Data Collector", hospital: r.collector_email, city: r.collector_phone }, request_id: r.id }); setShareOpen(true); }} className="btn-pine rounded-none" data-testid={`dc-approve-${r.id}`}>
                        <Check className="w-3 h-3 mr-1"/>Approve &amp; choose patients
                      </Button>
                      <Button size="sm" variant="outline" onClick={async ()=>{ await api.post(`/data-collector-requests/${r.id}/deny`); toast("Denied"); loadReqs(); }} className="rounded-none border-[#B0513A] text-[#B0513A] hover:bg-[#B0513A] hover:text-white" data-testid={`dc-deny-${r.id}`}>
                        <X className="w-3 h-3 mr-1"/>Deny
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="research" className="mt-6">
            <div className="bg-white border border-[#E5E7E5] p-6">
              <div className="font-display text-xl text-[#172320]">Query the registry</div>
              <p className="text-sm text-[#5C6D68] mt-1">Filter across all patient records. Results shown are de-identified by default.</p>
              <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                <FL label="Province"><Select value={research.province||""} onValueChange={(v)=>setResearch(s=>({...s, province: v==="__all"?"":v}))}><SelectTrigger className="rounded-none" data-testid="r-province"><SelectValue placeholder="Any"/></SelectTrigger><SelectContent><SelectItem value="__all">Any</SelectItem>{enums?.provinces?.map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></FL>
                <FL label="City"><Input value={research.city} onChange={(e)=>setResearch(s=>({...s, city:e.target.value}))} className="rounded-none focus-visible:ring-[#1B3B36]"/></FL>
                <FL label="Ethnicity"><Select value={research.ethnicity||""} onValueChange={(v)=>setResearch(s=>({...s, ethnicity:v==="__all"?"":v}))}><SelectTrigger className="rounded-none"><SelectValue placeholder="Any"/></SelectTrigger><SelectContent><SelectItem value="__all">Any</SelectItem>{enums?.ethnicities?.map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></FL>
                <FL label="Gender"><Select value={research.gender||""} onValueChange={(v)=>setResearch(s=>({...s, gender:v==="__all"?"":v}))}><SelectTrigger className="rounded-none"><SelectValue placeholder="Any"/></SelectTrigger><SelectContent><SelectItem value="__all">Any</SelectItem>{enums?.genders?.map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></FL>
                <FL label="Min age"><Input type="number" value={research.age_min} onChange={(e)=>setResearch(s=>({...s, age_min:e.target.value}))} className="rounded-none focus-visible:ring-[#1B3B36]"/></FL>
                <FL label="Max age"><Input type="number" value={research.age_max} onChange={(e)=>setResearch(s=>({...s, age_max:e.target.value}))} className="rounded-none focus-visible:ring-[#1B3B36]"/></FL>
                <FL label="Dyken's min"><Input type="number" min="0" max="5" value={research.dykens_min} onChange={(e)=>setResearch(s=>({...s, dykens_min:e.target.value}))} className="rounded-none focus-visible:ring-[#1B3B36]"/></FL>
                <FL label="Dyken's max"><Input type="number" min="0" max="5" value={research.dykens_max} onChange={(e)=>setResearch(s=>({...s, dykens_max:e.target.value}))} className="rounded-none focus-visible:ring-[#1B3B36]"/></FL>
                <FL label="Measles vaccine"><Select value={research.measles_vaccine_received||""} onValueChange={(v)=>setResearch(s=>({...s, measles_vaccine_received:v==="__all"?"":v}))}><SelectTrigger className="rounded-none"><SelectValue placeholder="Any"/></SelectTrigger><SelectContent><SelectItem value="__all">Any</SelectItem>{["Yes","No","Unknown"].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></FL>
              </div>
              <div className="mt-5">
                <div className="uppercase-label">Symptoms (any of)</div>
                <div className="mt-2 flex flex-wrap gap-2 max-h-[140px] overflow-auto border border-[#E5E7E5] p-3">
                  {(enums?.symptoms || []).map(s => (
                    <label key={s} className={`text-xs px-2.5 py-1 border cursor-pointer ${(research.symptoms_any||[]).includes(s)?"bg-[#1B3B36] text-white border-[#1B3B36]":"bg-white border-[#E5E7E5]"}`}>
                      <input type="checkbox" className="sr-only" checked={(research.symptoms_any||[]).includes(s)} onChange={()=>setResearch(st => ({...st, symptoms_any: st.symptoms_any.includes(s) ? st.symptoms_any.filter(x=>x!==s) : [...st.symptoms_any, s]}))}/>{s}
                    </label>
                  ))}
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <Button onClick={runResearch} className="btn-pine rounded-none" data-testid="research-run">Run query</Button>
                <Button variant="outline" onClick={exportResearch} className="rounded-none btn-outline-pine" data-testid="research-export"><Download className="w-4 h-4 mr-2"/>Export CSV</Button>
              </div>
            </div>

            {researchResult && (
              <div className="mt-6 bg-white border border-[#E5E7E5]">
                <div className="p-4 border-b border-[#E5E7E5] flex items-center justify-between">
                  <div><span className="font-display text-lg">Results</span> <span className="uppercase-label ml-2">{researchResult.total} matches</span></div>
                </div>
                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(researchResult.by_province || {}).map(([prov, s]) => (
                    <div key={prov} className="border border-[#E5E7E5] p-3">
                      <div className="uppercase-label">{prov}</div>
                      <div className="font-display text-2xl text-[#172320]">{s.count}</div>
                      <div className="text-xs text-[#5C6D68]">avg Dyken's · {s.avg_dykens}</div>
                    </div>
                  ))}
                </div>
                <div className="overflow-auto">
                  <Table>
                    <TableHeader className="bg-[#F2F4F3]">
                      <TableRow>
                        <TableHead className="uppercase-label">ID</TableHead>
                        <TableHead className="uppercase-label">Age</TableHead>
                        <TableHead className="uppercase-label">Gender</TableHead>
                        <TableHead className="uppercase-label">Province</TableHead>
                        <TableHead className="uppercase-label">Ethnicity</TableHead>
                        <TableHead className="uppercase-label">Vaccine</TableHead>
                        <TableHead className="uppercase-label">Symptoms</TableHead>
                        <TableHead className="uppercase-label">Dyken's</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {researchResult.results.map(r => (
                        <TableRow key={r.id} className="row-hover cursor-pointer" onClick={()=>nav(`/doctor/patients/${r.id}`)}>
                          <TableCell className="font-mono text-xs">{r.id.slice(0,8)}</TableCell>
                          <TableCell>{r.age}</TableCell>
                          <TableCell>{r.gender}</TableCell>
                          <TableCell>{r.province}</TableCell>
                          <TableCell>{r.ethnicity}</TableCell>
                          <TableCell>{r.measles_vaccine_received}</TableCell>
                          <TableCell>{r.symptoms_count}</TableCell>
                          <TableCell><span className={`px-2 py-0.5 text-xs font-semibold ${r.dykens_score>=4?"bg-[#1B3B36] text-white":r.dykens_score===3?"bg-[#C48F38] text-white":"bg-[#E5E7E5]"}`}>{r.dykens_score}/5</span></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function FL({ label, children }) {
  return (<div><div className="uppercase-label mb-2">{label}</div>{children}</div>);
}

function StatusBadge({ status }) {
  const map = {
    pending: "bg-[#C48F38] text-white",
    approved: "bg-[#2F6B4C] text-white",
    denied: "bg-[#B0513A] text-white",
  };
  return <span className={`px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${map[status] || "bg-[#E5E7E5]"}`}>{status}</span>;
}

function SearchBar({ q, setQ, onSearch }) {
  return (
    <div className="flex gap-2 mb-4">
      <div className="flex-1 flex items-center border border-[#E5E7E5] bg-white px-3">
        <Search className="w-4 h-4 text-[#5C6D68]"/>
        <Input value={q} onChange={(e)=>setQ(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&onSearch()} placeholder="Search by name, city, or record ID…" className="border-0 focus-visible:ring-0 shadow-none bg-transparent" data-testid="patients-search"/>
      </div>
      <Button onClick={onSearch} className="btn-pine rounded-none">Search</Button>
    </div>
  );
}

function PatientsTable({ rows, onRow, onRequestEdit }) {
  if (rows.length === 0) return <div className="p-8 bg-white border border-[#E5E7E5] text-sm text-[#5C6D68]">No records found.</div>;
  return (
    <div className="overflow-auto bg-white border border-[#E5E7E5]">
      <Table>
        <TableHeader className="bg-[#F2F4F3]">
          <TableRow>
            <TableHead className="uppercase-label">Name</TableHead>
            <TableHead className="uppercase-label">Age</TableHead>
            <TableHead className="uppercase-label">Gender</TableHead>
            <TableHead className="uppercase-label">City</TableHead>
            <TableHead className="uppercase-label">Owner</TableHead>
            <TableHead className="uppercase-label">Dyken's</TableHead>
            <TableHead className="uppercase-label">Access</TableHead>
            <TableHead className="uppercase-label">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(p => (
            <TableRow key={p.id} className="row-hover" data-testid={`patient-row-${p.id}`}>
              <TableCell className="font-semibold cursor-pointer" onClick={()=>onRow(p)}>{p.section2?.full_name}</TableCell>
              <TableCell>{p.section2?.age}</TableCell>
              <TableCell>{p.section2?.gender}</TableCell>
              <TableCell>{p.section2?.city}</TableCell>
              <TableCell className="text-sm">{p.owner_name}</TableCell>
              <TableCell><span className={`px-2 py-0.5 text-xs font-semibold ${p.dykens_score>=4?"bg-[#1B3B36] text-white":p.dykens_score===3?"bg-[#C48F38] text-white":"bg-[#E5E7E5]"}`}>{p.dykens_score}/5</span></TableCell>
              <TableCell>{p.can_edit ? <span className="inline-flex items-center gap-1 text-[#2F6B4C] uppercase-label"><ShieldCheck className="w-3 h-3"/>{p.is_owner?"Owner":"Editor"}</span> : <span className="uppercase-label text-[#5C6D68]">View only</span>}</TableCell>
              <TableCell>
                {p.can_edit ? (
                  <Button size="sm" variant="outline" className="rounded-none btn-outline-pine" onClick={()=>onRow(p)}>Open</Button>
                ) : (
                  <Button size="sm" className="btn-pine rounded-none" onClick={()=>onRequestEdit(p.id)} data-testid={`req-edit-${p.id}`}>Request edit</Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
