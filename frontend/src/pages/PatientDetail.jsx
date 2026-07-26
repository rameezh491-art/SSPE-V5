import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api, apiErrText } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Edit3, Send, ShieldCheck, Clock, FileText, User } from "lucide-react";

export default function PatientDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [p, setP] = useState(null);
  const [audit, setAudit] = useState([]);
  const [showAudit, setShowAudit] = useState(false);

  const load = async () => {
    try {
      const path = user?.role === "data_collector" ? `/data-collector/patients/${id}` : `/patients/${id}`;
      const { data } = await api.get(path);
      setP(data);
    } catch (e) { toast.error(apiErrText(e)); }
  };
  const loadAudit = async () => {
    try { const { data } = await api.get(`/patients/${id}/audit`); setAudit(data); setShowAudit(true); }
    catch (e) { toast.error(apiErrText(e)); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const requestEdit = async () => {
    try { await api.post("/edit-requests", { patient_id: id, message: "Requesting edit access." }); toast.success("Edit request sent to owner"); }
    catch (e) { toast.error(apiErrText(e)); }
  };

  if (!p) return <div className="App"><AppHeader/><div className="p-10 text-[#5C6D68]">Loading…</div></div>;

  const s = p.section2;
  const s4 = p.section4;
  const s5 = p.section5;

  return (
    <div className="App bg-[#FAFAFA] min-h-screen">
      <AppHeader />
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <button onClick={()=>nav(-1)} className="uppercase-label inline-flex items-center gap-1 hover:text-[#172320]"><ArrowLeft className="w-3 h-3"/>Back</button>

        <div className="mt-3 grid grid-cols-12 gap-8">
          <main className="col-span-12 lg:col-span-8">
            <div className="uppercase-label">Patient record</div>
            <h1 className="font-display text-4xl text-[#172320]" data-testid="patient-name">{s.full_name}</h1>
            <div className="mt-1 text-[#5C6D68] text-sm">{s.age} y · {s.gender} · {s.ethnicity} · {s.city}, {s.province}</div>

            <div className="mt-6 flex items-center gap-2 flex-wrap">
              {p.can_edit ? (
                <Button onClick={()=>nav(`/doctor/patients/${id}/edit`)} className="btn-pine rounded-none" data-testid="btn-edit-patient"><Edit3 className="w-4 h-4 mr-2"/>Edit</Button>
              ) : (
                <Button onClick={requestEdit} className="btn-pine rounded-none" data-testid="btn-request-edit"><Send className="w-4 h-4 mr-2"/>Request edit access</Button>
              )}
              {p.is_owner || user?.role === "admin" ? (
                <Button variant="outline" className="rounded-none btn-outline-pine" onClick={loadAudit}><Clock className="w-4 h-4 mr-2"/>Audit trail</Button>
              ) : null}
            </div>

            {/* Sections */}
            <div className="mt-8 space-y-6">
              <Card title="1 · Doctor &amp; Facility">
                <KV label="Doctor" value={p.section1.doctor_name}/>
                <KV label="Hospital" value={p.section1.hospital}/>
              </Card>
              <Card title="2 · Patient Information">
                <KV label="Full name" value={s.full_name}/>
                <KV label="Father" value={s.father_name}/>
                <KV label="Mother" value={s.mother_name}/>
                <KV label="Age" value={`${s.age} yrs`}/>
                <KV label="Gender" value={s.gender}/>
                <KV label="Ethnicity" value={s.ethnicity}/>
                <KV label="City / Province" value={`${s.city}, ${s.province}`}/>
                <KV label="Area" value={s.area}/>
                <KV label="Contact" value={s.contact}/>
              </Card>
              <Card title="3 · Family Information">
                <KV label="Parental status" value={p.section3.parental_status}/>
                <KV label="Lives with" value={(p.section3.lives_with||[]).join(", ")}/>
                <KV label="Mother's education" value={p.section3.mother_education}/>
                <KV label="Father's education" value={p.section3.father_education}/>
                <KV label="Mother's occupation" value={`${p.section3.mother_occupation} (${p.section3.mother_employment})`}/>
                <KV label="Father's occupation" value={`${p.section3.father_occupation} (${p.section3.father_employment})`}/>
                <KV label="Monthly income (PKR)" value={p.section3.monthly_income}/>
                <KV label="Household size" value={p.section3.household_size}/>
                <KV label="Siblings" value={`bio ${p.section3.siblings_biological} · step ${p.section3.siblings_step} · half ${p.section3.siblings_half} · adopted ${p.section3.siblings_adopted}`}/>
                <KV label="Sibling ages" value={(p.section3.sibling_ages||[]).join(", ")}/>
                <KV label="Healthcare access" value={p.section3.healthcare_access}/>
              </Card>
              <Card title="4 · Vaccination &amp; Measles">
                <KV label="Received measles vaccine" value={s4.measles_vaccine_received}/>
                <KV label="Doses" value={s4.doses}/>
                <KV label="Age at each dose" value={(s4.dose_ages||[]).join(", ")}/>
                <KV label="Age at measles infection" value={s4.measles_infection_age}/>
                <KV label="Family SSPE history" value={s4.family_sspe_history}/>
                <KV label="Siblings measles history" value={s4.siblings_measles_history}/>
                <KV label="Siblings vaccination status" value={s4.siblings_vaccination_status}/>
              </Card>
              <Card title="5 · Symptoms">
                <div className="col-span-2">
                  <div className="uppercase-label">Symptoms</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(s5.symptoms||[]).map(sy => <span key={sy} className="px-2 py-1 text-xs bg-[#F2F4F3] border border-[#E5E7E5]">{sy}{(s5.laterality||[]).find(x=>x.name===sy) ? ` (${(s5.laterality||[]).find(x=>x.name===sy).side})` : ""}</span>)}
                    {(s5.symptoms||[]).length === 0 && <span className="text-sm text-[#5C6D68]">None recorded</span>}
                  </div>
                </div>
                <KV label="First symptom" value={s5.first_symptom}/>
                <KV label="Duration (months)" value={s5.duration_measles_to_symptoms_months}/>
                <KV label="Previous consultation" value={s5.previous_consultation}/>
                <KV label="Previous treatments" value={s5.previous_treatments}/>
              </Card>
              <Card title="6 · Diagnostic Tests">
                <div className="col-span-2 space-y-2">
                  {Object.entries(p.section6).map(([k, t]) => (
                    <div key={k} className="border-b border-[#E5E7E5] pb-2">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-[#172320]">{k.replaceAll("_"," ").toUpperCase()}</div>
                        <span className={`uppercase-label ${t.performed?"text-[#2F6B4C]":"text-[#5C6D68]"}`}>{t.performed?"Performed":"Not performed"}</span>
                      </div>
                      {t.performed && t.findings && <div className="text-sm text-[#2C3B37] mt-1">{t.findings}</div>}
                      {t.file_id && (
                        <a href={`${process.env.REACT_APP_BACKEND_URL}/api/files/${t.file_id}/download`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-[#1B3B36] underline"><FileText className="w-3 h-3"/>View report</a>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
              <Card title="7 · Dyken's Criteria">
                {Object.entries({
                  "Clinical presentation": p.section7.clinical_presentation,
                  "EEG findings": p.section7.eeg_findings,
                  "Elevated measles antibody": p.section7.elevated_measles_antibody,
                  "Histopathology": p.section7.histopathology,
                  "MRI findings": p.section7.mri_findings,
                }).map(([k,v]) => (
                  <div key={k} className="flex items-center justify-between border-b border-[#E5E7E5] py-1.5">
                    <span className="text-sm text-[#172320]">{k}</span>
                    <span className={`uppercase-label ${v?"text-[#2F6B4C]":"text-[#5C6D68]"}`}>{v?"Yes":"No"}</span>
                  </div>
                ))}
              </Card>
              <Card title="8 · Perception">
                <KV label="Views on vaccination" value={p.section8.vaccination_views}/>
                <KV label="Barriers" value={(p.section8.barriers||[]).join(", ") + (p.section8.barriers_other?` · ${p.section8.barriers_other}`:"")}/>
                <KV label="Other observations" value={p.section8.other_observations}/>
              </Card>
            </div>

            {showAudit && (
              <div className="mt-8 bg-white border border-[#E5E7E5]">
                <div className="p-4 border-b border-[#E5E7E5] font-display text-lg">Audit trail</div>
                {audit.length === 0 && <div className="p-4 text-sm text-[#5C6D68]">No audit entries.</div>}
                <div className="divide-y divide-[#E5E7E5]">
                  {audit.map((a, i) => (
                    <div key={i} className="p-4 text-sm">
                      <span className="font-mono text-xs text-[#5C6D68]">{new Date(a.at).toLocaleString()}</span>{" "}
                      <span className="font-semibold text-[#172320]">{a.actor_name}</span>{" "}
                      <span className="text-[#5C6D68]">({a.actor_role})</span>{" "}
                      <span className="uppercase-label ml-2">{a.action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>

          {/* Sidebar */}
          <aside className="col-span-12 lg:col-span-4 space-y-4">
            <div className="bg-white border border-[#E5E7E5] p-5">
              <div className="uppercase-label">Dyken's score</div>
              <div className={`mt-3 font-display text-6xl leading-none ${p.dykens_score>=4?"text-[#1B3B36]":p.dykens_score===3?"text-[#C48F38]":"text-[#5C6D68]"}`}>{p.dykens_score}<span className="text-[#5C6D68] text-2xl">/5</span></div>
              <div className="text-sm text-[#5C6D68] mt-2">Auto-computed. {p.dykens_score>=4?"Strong SSPE indicators.":p.dykens_score===3?"Moderate — investigate further.":"Below diagnostic threshold."}</div>
            </div>
            <div className="bg-white border border-[#E5E7E5] p-5">
              <div className="uppercase-label mb-3">Ownership</div>
              <div className="flex items-center gap-2 text-sm"><User className="w-4 h-4 text-[#1B3B36]"/><span className="font-semibold text-[#172320]">{p.owner_name}</span></div>
              {(p.authorized_editors||[]).length > 0 && (
                <div className="mt-3">
                  <div className="uppercase-label">Authorized editors ({p.authorized_editors.length})</div>
                </div>
              )}
              <div className="mt-4 uppercase-label">Access</div>
              <div className="mt-2 text-sm">
                {p.can_edit ? (
                  <span className="inline-flex items-center gap-1 text-[#2F6B4C]"><ShieldCheck className="w-4 h-4"/>{p.is_owner?"You are the owner":"You have edit access"}</span>
                ) : (
                  <span className="text-[#5C6D68]">View only — request edit access to modify.</span>
                )}
              </div>
            </div>
            <div className="bg-white border border-[#E5E7E5] p-5 text-xs text-[#5C6D68] font-mono">
              <div className="uppercase-label mb-1">Record ID</div>
              <div className="break-all">{p.id}</div>
              <div className="uppercase-label mt-3">Created</div>
              <div>{new Date(p.created_at).toLocaleString()}</div>
              <div className="uppercase-label mt-3">Updated</div>
              <div>{new Date(p.updated_at).toLocaleString()}</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="bg-white border border-[#E5E7E5]">
      <div className="p-4 border-b border-[#E5E7E5] font-display text-lg text-[#172320]">{title}</div>
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">{children}</div>
    </div>
  );
}
function KV({ label, value }) {
  return (
    <div>
      <div className="uppercase-label">{label}</div>
      <div className="text-sm text-[#172320] mt-0.5">{value === "" || value == null ? <span className="text-[#5C6D68]">—</span> : value}</div>
    </div>
  );
}
