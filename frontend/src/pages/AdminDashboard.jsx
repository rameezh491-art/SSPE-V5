import React, { useEffect, useState } from "react";
import { api, apiErrText } from "@/lib/api";
import { AppHeader } from "@/components/AppHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { toast } from "sonner";
import { Search, Check, X, ShieldOff, ShieldCheck, RefreshCcw, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SiteSettings from "@/pages/SiteSettings";

export default function AdminDashboard() {
  const nav = useNavigate();
  const [tab, setTab] = useState("doctors");
  const [stats, setStats] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const loadStats = async () => { try { const { data } = await api.get("/admin/stats"); setStats(data); } catch (e) { toast.error(apiErrText(e)); } };
  const loadDoctors = async () => { try { const { data } = await api.get("/admin/doctors", { params: { q, status: status||undefined } }); setDoctors(data); } catch (e) { toast.error(apiErrText(e)); } };
  const loadPatients = async () => { try { const { data } = await api.get("/admin/patients", { params: { q } }); setPatients(data); } catch (e) { toast.error(apiErrText(e)); } };

  useEffect(() => { loadStats(); loadDoctors(); loadPatients(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { loadDoctors(); /* eslint-disable-next-line */ }, [status]);

  const act = async (path, msg) => { try { await api.post(path); toast.success(msg); loadDoctors(); loadStats(); } catch (e) { toast.error(apiErrText(e)); } };

  return (
    <div className="App bg-[#FAFAFA] min-h-screen">
      <AppHeader />
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="uppercase-label">Admin control panel</div>
        <h1 className="font-display text-4xl text-[#172320]">Platform governance</h1>

        {stats && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-px bg-[#E5E7E5] border border-[#E5E7E5]">
            <Stat label="Pending doctors" value={stats.doctors_pending} accent="text-[#C48F38]"/>
            <Stat label="Verified doctors" value={stats.doctors_verified} accent="text-[#2F6B4C]"/>
            <Stat label="Suspended" value={stats.doctors_suspended} accent="text-[#B0513A]"/>
            <Stat label="Patient records" value={stats.total_patients} accent="text-[#1B3B36]"/>
            <Stat label="Pending edit reqs" value={stats.pending_edit_requests} accent="text-[#1B3B36]"/>
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab} className="mt-8">
          <TabsList className="bg-white border border-[#E5E7E5] rounded-none">
            <TabsTrigger value="doctors" data-testid="admin-tab-doctors">Doctors</TabsTrigger>
            <TabsTrigger value="patients" data-testid="admin-tab-patients">Patient Records</TabsTrigger>
            <TabsTrigger value="settings" data-testid="admin-tab-settings"><Settings className="w-3.5 h-3.5 mr-1.5"/>Site Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="doctors" className="mt-6">
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="flex-1 min-w-[220px] flex items-center border border-[#E5E7E5] bg-white px-3">
                <Search className="w-4 h-4 text-[#5C6D68]"/>
                <Input value={q} onChange={(e)=>setQ(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&loadDoctors()} placeholder="Name, email, hospital, city…" className="border-0 focus-visible:ring-0 shadow-none bg-transparent" data-testid="admin-search-doctors"/>
              </div>
              <div className="flex gap-1">
                {["","pending","verified","suspended","rejected"].map(s => (
                  <button key={s} onClick={()=>setStatus(s)} className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider border ${status===s?"bg-[#1B3B36] text-white border-[#1B3B36]":"bg-white border-[#E5E7E5] text-[#172320] hover:bg-[#F2F4F3]"}`}>
                    {s || "All"}
                  </button>
                ))}
              </div>
              <Button onClick={loadDoctors} variant="outline" className="rounded-none btn-outline-pine"><RefreshCcw className="w-4 h-4 mr-1"/>Refresh</Button>
            </div>
            <div className="bg-white border border-[#E5E7E5] overflow-auto">
              <Table>
                <TableHeader className="bg-[#F2F4F3]">
                  <TableRow>
                    <TableHead className="uppercase-label">Name</TableHead>
                    <TableHead className="uppercase-label">Email</TableHead>
                    <TableHead className="uppercase-label">Specialty</TableHead>
                    <TableHead className="uppercase-label">Hospital</TableHead>
                    <TableHead className="uppercase-label">City</TableHead>
                    <TableHead className="uppercase-label">Status</TableHead>
                    <TableHead className="uppercase-label">Records</TableHead>
                    <TableHead className="uppercase-label">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doctors.map(d => (
                    <TableRow key={d.id} className="row-hover" data-testid={`admin-doc-row-${d.id}`}>
                      <TableCell className="font-semibold">{d.name}<div className="text-xs text-[#5C6D68] font-normal">{d.cnic_or_pmdc}</div></TableCell>
                      <TableCell className="text-sm">{d.email}</TableCell>
                      <TableCell>{d.specialty}</TableCell>
                      <TableCell>{d.hospital}</TableCell>
                      <TableCell>{d.city}</TableCell>
                      <TableCell><StatusPill status={d.status}/></TableCell>
                      <TableCell>{d.records_created}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {d.status === "pending" && <>
                            <Button size="sm" className="btn-pine rounded-none h-7" onClick={()=>act(`/admin/doctors/${d.id}/verify`, `${d.name} verified`)} data-testid={`verify-${d.id}`}><Check className="w-3 h-3 mr-1"/>Verify</Button>
                            <Button size="sm" variant="outline" className="rounded-none h-7 border-[#B0513A] text-[#B0513A] hover:bg-[#B0513A] hover:text-white" onClick={()=>act(`/admin/doctors/${d.id}/reject`, `${d.name} rejected`)}><X className="w-3 h-3 mr-1"/>Reject</Button>
                          </>}
                          {d.status === "verified" && (
                            <Button size="sm" variant="outline" className="rounded-none h-7 border-[#B0513A] text-[#B0513A] hover:bg-[#B0513A] hover:text-white" onClick={()=>act(`/admin/doctors/${d.id}/suspend`, `${d.name} suspended`)}><ShieldOff className="w-3 h-3 mr-1"/>Suspend</Button>
                          )}
                          {(d.status === "suspended" || d.status === "rejected") && (
                            <Button size="sm" className="btn-pine rounded-none h-7" onClick={()=>act(`/admin/doctors/${d.id}/reactivate`, `${d.name} reactivated`)}><ShieldCheck className="w-3 h-3 mr-1"/>Reactivate</Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="patients" className="mt-6">
            <div className="flex gap-2 mb-4">
              <div className="flex-1 flex items-center border border-[#E5E7E5] bg-white px-3">
                <Search className="w-4 h-4 text-[#5C6D68]"/>
                <Input value={q} onChange={(e)=>setQ(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&loadPatients()} placeholder="Search patients…" className="border-0 focus-visible:ring-0 shadow-none bg-transparent"/>
              </div>
              <Button onClick={loadPatients} className="btn-pine rounded-none">Search</Button>
            </div>
            <div className="bg-white border border-[#E5E7E5] overflow-auto">
              <Table>
                <TableHeader className="bg-[#F2F4F3]">
                  <TableRow>
                    <TableHead className="uppercase-label">Name</TableHead>
                    <TableHead className="uppercase-label">City</TableHead>
                    <TableHead className="uppercase-label">Age/Sex</TableHead>
                    <TableHead className="uppercase-label">Owner</TableHead>
                    <TableHead className="uppercase-label">Editors</TableHead>
                    <TableHead className="uppercase-label">Dyken's</TableHead>
                    <TableHead className="uppercase-label"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map(p => (
                    <TableRow key={p.id} className="row-hover">
                      <TableCell className="font-semibold cursor-pointer" onClick={()=>nav(`/doctor/patients/${p.id}`)}>{p.section2?.full_name}</TableCell>
                      <TableCell>{p.section2?.city}</TableCell>
                      <TableCell>{p.section2?.age} · {p.section2?.gender}</TableCell>
                      <TableCell className="text-sm">{p.owner_name}</TableCell>
                      <TableCell className="text-sm">
                        {(p.editors_detail||[]).length === 0 ? <span className="text-[#5C6D68]">—</span> : (
                          <div className="flex flex-wrap gap-1">
                            {p.editors_detail.map(e => (
                              <span key={e.id} className="px-2 py-0.5 text-xs bg-[#F2F4F3] border border-[#E5E7E5]">{e.name}</span>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell><span className={`px-2 py-0.5 text-xs font-semibold ${p.dykens_score>=4?"bg-[#1B3B36] text-white":p.dykens_score===3?"bg-[#C48F38] text-white":"bg-[#E5E7E5]"}`}>{p.dykens_score}/5</span></TableCell>
                      <TableCell><Button size="sm" variant="outline" className="rounded-none btn-outline-pine h-7" onClick={()=>nav(`/doctor/patients/${p.id}`)}>Open</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <SiteSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="bg-white p-5">
      <div className="uppercase-label">{label}</div>
      <div className={`font-display text-4xl mt-2 ${accent}`}>{value}</div>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    pending: "bg-[#C48F38] text-white",
    verified: "bg-[#2F6B4C] text-white",
    suspended: "bg-[#B0513A] text-white",
    rejected: "bg-[#5C6D68] text-white",
    active: "bg-[#1B3B36] text-white",
  };
  return <span className={`px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${map[status]||"bg-[#E5E7E5]"}`}>{status}</span>;
}
