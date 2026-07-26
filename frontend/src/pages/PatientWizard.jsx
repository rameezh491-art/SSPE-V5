import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, apiErrText } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Upload, Check, X, ArrowLeft, ArrowRight, Save } from "lucide-react";

const SECTIONS = [
  { key: "section1", title: "Doctor & Facility" },
  { key: "section2", title: "Patient Information" },
  { key: "section3", title: "Family Information" },
  { key: "section4", title: "Vaccination & Measles" },
  { key: "section5", title: "Symptoms & Progression" },
  { key: "section6", title: "Diagnostic Tests" },
  { key: "section7", title: "Dyken's Criteria" },
  { key: "section8", title: "Perception & Notes" },
];

const emptyTest = { performed: false, findings: "", file_id: null };

const emptyRecord = {
  section1: { doctor_name: "", hospital: "" },
  section2: { full_name: "", father_name: "", mother_name: "", patient_cnic: "", father_cnic: "", mother_cnic: "", age: 0, gender: "Male", area: "", city: "", province: "Punjab", ethnicity: "Punjabi", contact: "" },
  section3: { parental_status: "Married", lives_with: [], lives_with_other: "", mother_education: "", father_education: "", mother_occupation: "", mother_employment: "", father_occupation: "", father_employment: "", monthly_income: null, household_size: null, siblings_biological: 0, siblings_step: 0, siblings_half: 0, siblings_adopted: 0, sibling_ages: [], healthcare_access: "", healthcare_access_other: "" },
  section4: { measles_vaccine_received: "Unknown", doses: 0, dose_ages: [], measles_infection_age: null, siblings_measles_history: "", siblings_vaccination_status: "", family_sspe_history: "No" },
  section5: { symptoms: [], laterality: [], other_symptom: "", duration_measles_to_symptoms_months: null, first_symptom: "", previous_consultation: "No", previous_treatments: "" },
  section6: { eeg: {...emptyTest}, csf_analysis: {...emptyTest}, serum_analysis: {...emptyTest}, mri: {...emptyTest}, ct_scan: {...emptyTest}, fundoscopy: {...emptyTest}, vep: {...emptyTest}, ssep: {...emptyTest}, metabolic_blood_tests: {...emptyTest}, infectious_panel: {...emptyTest}, autoimmune_encephalitis_panel: {...emptyTest} },
  section7: { clinical_presentation: false, eeg_findings: false, elevated_measles_antibody: false, histopathology: false, mri_findings: false },
  section8: { vaccination_views: "", barriers: [], barriers_other: "", other_observations: "" },
};

const BARRIERS = ["Cost", "Misinformation", "Access", "Religious concerns", "Lack of awareness"];

export default function PatientWizard() {
  const { id } = useParams();
  const { user, enums } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [rec, setRec] = useState(() => {
    const r = JSON.parse(JSON.stringify(emptyRecord));
    r.section1.doctor_name = user?.name || "";
    r.section1.hospital = user?.hospital || "";
    return r;
  });
  const [busy, setBusy] = useState(false);
  const [readOnly, setReadOnly] = useState(false);

  const isEditMode = !!id;

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const path = user?.role === "data_collector" ? `/data-collector/patients/${id}` : `/patients/${id}`;
        const { data } = await api.get(path);
        setRec(data);
        setReadOnly(!data.can_edit);
      } catch (e) { toast.error(apiErrText(e)); }
    })();
  }, [id]);

  const setSection = (key, patch) => setRec((s) => ({ ...s, [key]: { ...s[key], ...patch } }));

  const dykens = useMemo(() => {
    const s = rec.section7;
    return [s.clinical_presentation, s.eeg_findings, s.elevated_measles_antibody, s.histopathology, s.mri_findings].filter(Boolean).length;
  }, [rec.section7]);

  const dykensColor = dykens >= 4 ? "bg-[#1B3B36] text-white" : dykens === 3 ? "bg-[#C48F38] text-white" : "bg-[#E5E7E5] text-[#172320]";

  const save = async () => {
    setBusy(true);
    try {
      const body = { ...rec };
      // strip metadata fields
      delete body.id; delete body.owner_id; delete body.owner_name; delete body.authorized_editors;
      delete body.dykens_score; delete body.created_at; delete body.updated_at;
      delete body.can_edit; delete body.is_owner;
      if (isEditMode) {
        const path = user?.role === "data_collector" ? `/data-collector/patients/${id}` : `/patients/${id}`;
        const { data } = await api.put(path, body);
        toast.success("Record updated");
        nav(`/doctor/patients/${data.id}`);
      } else {
        const { data } = await api.post(`/patients`, body);
        toast.success("Patient record created");
        nav(`/doctor/patients/${data.id}`);
      }
    } catch (e) { toast.error(apiErrText(e)); }
    setBusy(false);
  };

  return (
    <div className="App bg-[#FAFAFA] min-h-screen">
      <AppHeader />
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <button onClick={() => nav(-1)} className="uppercase-label flex items-center gap-1 hover:text-[#172320]" data-testid="wizard-back">
          <ArrowLeft className="w-3 h-3" /> Back
        </button>
        <div className="mt-3 flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="uppercase-label">SSPE Intake Protocol</div>
            <h1 className="font-display text-3xl md:text-4xl text-[#172320]">{isEditMode ? "Edit Patient Record" : "New Patient History"}</h1>
          </div>
          <div className={`px-5 py-3 flex items-center gap-4 ${dykensColor}`} data-testid="dykens-score-badge">
            <div>
              <div className="uppercase-label" style={{ color: "inherit", opacity: 0.75 }}>Dyken's Score</div>
              <div className="font-display text-3xl leading-none">{dykens}<span className="opacity-50 text-xl">/5</span></div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-12 gap-8">
          {/* Stepper */}
          <aside className="col-span-12 md:col-span-3">
            <div className="md:sticky md:top-24">
              <div className="uppercase-label mb-3">Sections</div>
              <ol className="space-y-1">
                {SECTIONS.map((s, i) => (
                  <li key={s.key}>
                    <button onClick={() => setStep(i)} data-testid={`step-${i}`}
                      className={`w-full text-left px-3 py-2.5 text-sm border-l-2 transition-colors ${i === step ? "border-[#1B3B36] bg-white text-[#172320] font-semibold" : "border-transparent text-[#5C6D68] hover:bg-white hover:text-[#172320]"}`}>
                      <span className="font-mono text-xs mr-2">{String(i+1).padStart(2, "0")}</span>{s.title}
                    </button>
                  </li>
                ))}
              </ol>
              <div className="mt-6 flex flex-col gap-2">
                <Button disabled={busy || readOnly} onClick={save} className="btn-pine rounded-none h-11" data-testid="wizard-save">
                  <Save className="w-4 h-4 mr-2"/>{busy ? "Saving…" : (isEditMode ? "Save changes" : "Create record")}
                </Button>
                {readOnly && <div className="text-xs text-[#B0513A]">Read-only — request edit access from owner.</div>}
              </div>
            </div>
          </aside>

          {/* Form */}
          <main className="col-span-12 md:col-span-9">
            <div className="bg-white border border-[#E5E7E5] p-6 md:p-10 min-h-[400px]">
              {step === 0 && <Section1 v={rec.section1} set={(p)=>setSection("section1", p)} disabled={readOnly}/>}
              {step === 1 && <Section2 v={rec.section2} set={(p)=>setSection("section2", p)} enums={enums} disabled={readOnly}/>}
              {step === 2 && <Section3 v={rec.section3} set={(p)=>setSection("section3", p)} enums={enums} disabled={readOnly}/>}
              {step === 3 && <Section4 v={rec.section4} set={(p)=>setSection("section4", p)} enums={enums} disabled={readOnly}/>}
              {step === 4 && <Section5 v={rec.section5} set={(p)=>setSection("section5", p)} enums={enums} disabled={readOnly}/>}
              {step === 5 && <Section6 v={rec.section6} set={(p)=>setSection("section6", p)} disabled={readOnly}/>}
              {step === 6 && <Section7 v={rec.section7} set={(p)=>setSection("section7", p)} disabled={readOnly}/>}
              {step === 7 && <Section8 v={rec.section8} set={(p)=>setSection("section8", p)} disabled={readOnly}/>}
              <div className="mt-8 pt-6 border-t border-[#E5E7E5] flex items-center justify-between">
                <Button variant="outline" disabled={step === 0} onClick={()=>setStep(step-1)} className="rounded-none btn-outline-pine" data-testid="wizard-prev">
                  <ArrowLeft className="w-4 h-4 mr-1"/> Previous
                </Button>
                {step < SECTIONS.length - 1 ? (
                  <Button onClick={()=>setStep(step+1)} className="btn-pine rounded-none" data-testid="wizard-next">
                    Next <ArrowRight className="w-4 h-4 ml-1"/>
                  </Button>
                ) : (
                  <Button disabled={busy || readOnly} onClick={save} className="btn-pine rounded-none" data-testid="wizard-finish">
                    <Save className="w-4 h-4 mr-2"/>{isEditMode ? "Save changes" : "Create record"}
                  </Button>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

/* ---------- Reusable atoms ---------- */
function L({ children }) { return <div className="uppercase-label">{children}</div>; }
function Grid({ children, cols = 2 }) { return <div className={`grid grid-cols-1 md:grid-cols-${cols} gap-5`}>{children}</div>; }
function Field({ label, children }) { return (<div><L>{label}</L><div className="mt-2">{children}</div></div>); }
function TI(props) { return <Input {...props} className={`rounded-none focus-visible:ring-[#1B3B36] ${props.className||""}`}/>; }
function TA(props) { return <Textarea {...props} className={`rounded-none focus-visible:ring-[#1B3B36] ${props.className||""}`}/>; }
function Sel({ value, onChange, options, disabled }) {
  return (
    <Select value={value || ""} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="rounded-none"><SelectValue placeholder="Select…"/></SelectTrigger>
      <SelectContent>{(options || []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
    </Select>
  );
}
function YesNo({ value, onChange, options = ["Yes","No"], disabled }) {
  return (
    <RadioGroup value={value} onValueChange={onChange} className="flex gap-2" disabled={disabled}>
      {options.map(opt => (
        <label key={opt} className={`px-4 py-2 border cursor-pointer text-sm font-semibold ${value===opt ? "bg-[#1B3B36] text-white border-[#1B3B36]" : "bg-white border-[#E5E7E5] text-[#172320] hover:bg-[#F2F4F3]"}`}>
          <RadioGroupItem value={opt} className="sr-only" data-testid={`radio-${opt}`}/>{opt}
        </label>
      ))}
    </RadioGroup>
  );
}

/* ---------- Sections ---------- */
function Section1({ v, set, disabled }) {
  return (<div>
    <h2 className="font-display text-2xl text-[#172320]">Recording doctor &amp; facility</h2>
    <p className="text-sm text-[#5C6D68] mt-1">Auto-filled from your profile — edit if this consultation occurred at a different location.</p>
    <div className="mt-6"><Grid>
      <Field label="Name of doctor"><TI value={v.doctor_name} disabled={disabled} onChange={(e)=>set({doctor_name:e.target.value})} data-testid="s1-doctor-name"/></Field>
      <Field label="Hospital / clinic"><TI value={v.hospital} disabled={disabled} onChange={(e)=>set({hospital:e.target.value})} data-testid="s1-hospital"/></Field>
    </Grid></div>
  </div>);
}

function Section2({ v, set, enums, disabled }) {
  return (<div>
    <h2 className="font-display text-2xl text-[#172320]">Patient information</h2>
    <p className="text-sm text-[#5C6D68] mt-1">Demographics and identifiers.</p>
    <div className="mt-6 space-y-5">
      <Grid>
        <Field label="Full name"><TI value={v.full_name} disabled={disabled} onChange={(e)=>set({full_name:e.target.value})} data-testid="s2-name"/></Field>
        <Field label="Father's name"><TI value={v.father_name} disabled={disabled} onChange={(e)=>set({father_name:e.target.value})}/></Field>
      </Grid>
      <Grid>
        <Field label="Mother's name"><TI value={v.mother_name} disabled={disabled} onChange={(e)=>set({mother_name:e.target.value})}/></Field>
        <Field label="Contact number"><TI value={v.contact} disabled={disabled} onChange={(e)=>set({contact:e.target.value})}/></Field>
      </Grid>
      <Grid cols={3}>
        <Field label="Patient CNIC"><TI value={v.patient_cnic} disabled={disabled} onChange={(e)=>set({patient_cnic:e.target.value})}/></Field>
        <Field label="Father's CNIC"><TI value={v.father_cnic} disabled={disabled} onChange={(e)=>set({father_cnic:e.target.value})}/></Field>
        <Field label="Mother's CNIC"><TI value={v.mother_cnic} disabled={disabled} onChange={(e)=>set({mother_cnic:e.target.value})}/></Field>
      </Grid>
      <Grid cols={3}>
        <Field label="Age (years)"><TI type="number" min="0" value={v.age ?? ""} disabled={disabled} onChange={(e)=>set({age: Number(e.target.value)})} data-testid="s2-age"/></Field>
        <Field label="Gender"><Sel value={v.gender} onChange={(x)=>set({gender:x})} options={enums?.genders} disabled={disabled}/></Field>
        <Field label="Ethnicity"><Sel value={v.ethnicity} onChange={(x)=>set({ethnicity:x})} options={enums?.ethnicities} disabled={disabled}/></Field>
      </Grid>
      <Grid cols={3}>
        <Field label="Area / neighborhood"><TI value={v.area} disabled={disabled} onChange={(e)=>set({area:e.target.value})}/></Field>
        <Field label="City"><TI value={v.city} disabled={disabled} onChange={(e)=>set({city:e.target.value})} data-testid="s2-city"/></Field>
        <Field label="Province"><Sel value={v.province} onChange={(x)=>set({province:x})} options={enums?.provinces} disabled={disabled}/></Field>
      </Grid>
    </div>
  </div>);
}

function Section3({ v, set, enums, disabled }) {
  const toggleLive = (opt) => {
    const cur = v.lives_with || [];
    set({ lives_with: cur.includes(opt) ? cur.filter(x=>x!==opt) : [...cur, opt] });
  };
  const setSibAge = (idx, val) => {
    const arr = [...(v.sibling_ages || [])];
    arr[idx] = Number(val);
    set({ sibling_ages: arr });
  };
  return (<div>
    <h2 className="font-display text-2xl text-[#172320]">Family information</h2>
    <div className="mt-6 space-y-5">
      <Grid>
        <Field label="Parental status"><Sel value={v.parental_status} onChange={(x)=>set({parental_status:x})} options={enums?.parental_status} disabled={disabled}/></Field>
        <Field label="Access to healthcare"><Sel value={v.healthcare_access} onChange={(x)=>set({healthcare_access:x})} options={enums?.healthcare_access} disabled={disabled}/></Field>
      </Grid>
      <Field label="Who does the child currently live with? (multi-select)">
        <div className="flex flex-wrap gap-2 mt-1">
          {(enums?.lives_with || []).map(opt => (
            <label key={opt} className={`px-3 py-1.5 border text-sm cursor-pointer ${(v.lives_with||[]).includes(opt) ? "bg-[#1B3B36] text-white border-[#1B3B36]" : "bg-white border-[#E5E7E5] hover:bg-[#F2F4F3]"}`}>
              <input type="checkbox" checked={(v.lives_with||[]).includes(opt)} onChange={()=>toggleLive(opt)} className="sr-only"/>{opt}
            </label>
          ))}
        </div>
        {(v.lives_with||[]).includes("Other relative(s)") && (
          <TI className="mt-3" placeholder="Specify other relative(s)" value={v.lives_with_other} disabled={disabled} onChange={(e)=>set({lives_with_other:e.target.value})}/>
        )}
      </Field>
      <Grid>
        <Field label="Mother's education"><Sel value={v.mother_education} onChange={(x)=>set({mother_education:x})} options={enums?.education_levels} disabled={disabled}/></Field>
        <Field label="Father's education"><Sel value={v.father_education} onChange={(x)=>set({father_education:x})} options={enums?.education_levels} disabled={disabled}/></Field>
      </Grid>
      <Grid cols={4}>
        <Field label="Mother's occupation"><TI value={v.mother_occupation} disabled={disabled} onChange={(e)=>set({mother_occupation:e.target.value})}/></Field>
        <Field label="Mother's employment"><Sel value={v.mother_employment} onChange={(x)=>set({mother_employment:x})} options={enums?.employment_status} disabled={disabled}/></Field>
        <Field label="Father's occupation"><TI value={v.father_occupation} disabled={disabled} onChange={(e)=>set({father_occupation:e.target.value})}/></Field>
        <Field label="Father's employment"><Sel value={v.father_employment} onChange={(x)=>set({father_employment:x})} options={enums?.employment_status} disabled={disabled}/></Field>
      </Grid>
      <Grid cols={2}>
        <Field label="Monthly household income (PKR)"><TI type="number" value={v.monthly_income ?? ""} disabled={disabled} onChange={(e)=>set({monthly_income: e.target.value===""?null:Number(e.target.value)})}/></Field>
        <Field label="People in household"><TI type="number" value={v.household_size ?? ""} disabled={disabled} onChange={(e)=>set({household_size: e.target.value===""?null:Number(e.target.value)})}/></Field>
      </Grid>
      <div>
        <L>Siblings</L>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
          {[
            ["Biological","siblings_biological"],["Step","siblings_step"],["Half","siblings_half"],["Adopted","siblings_adopted"],
          ].map(([lbl,k]) => (
            <Field key={k} label={lbl}><TI type="number" min="0" value={v[k] ?? 0} disabled={disabled} onChange={(e)=>set({[k]: Number(e.target.value)})}/></Field>
          ))}
        </div>
        <div className="mt-4">
          <L>Sibling ages</L>
          <div className="flex flex-wrap gap-2 mt-2">
            {(v.sibling_ages || []).map((a,i) => (
              <input key={i} value={a} disabled={disabled} onChange={(e)=>setSibAge(i, e.target.value)} className="w-20 border border-[#E5E7E5] px-2 py-1.5 text-sm rounded-none"/>
            ))}
            <button type="button" disabled={disabled} onClick={()=>set({sibling_ages:[...(v.sibling_ages||[]),0]})} className="text-sm text-[#1B3B36] underline">+ Add age</button>
            {(v.sibling_ages||[]).length > 0 && (
              <button type="button" disabled={disabled} onClick={()=>set({sibling_ages:(v.sibling_ages||[]).slice(0,-1)})} className="text-sm text-[#B0513A] underline">– Remove last</button>
            )}
          </div>
        </div>
      </div>
      {v.healthcare_access === "Other" && (
        <Field label="Specify healthcare access"><TI value={v.healthcare_access_other} disabled={disabled} onChange={(e)=>set({healthcare_access_other:e.target.value})}/></Field>
      )}
    </div>
  </div>);
}

function Section4({ v, set, enums, disabled }) {
  const setDoseAge = (i, val) => {
    const arr = [...(v.dose_ages||[])]; arr[i] = Number(val); set({dose_ages: arr});
  };
  useEffect(() => {
    // ensure dose_ages length matches doses
    const cur = v.dose_ages || [];
    const need = Number(v.doses) || 0;
    if (cur.length !== need) {
      const next = cur.slice(0, need);
      while (next.length < need) next.push(0);
      set({ dose_ages: next });
    }
    // eslint-disable-next-line
  }, [v.doses]);
  return (<div>
    <h2 className="font-display text-2xl text-[#172320]">Vaccination &amp; measles history</h2>
    <div className="mt-6 space-y-5">
      <Grid>
        <Field label="Received measles vaccine?"><YesNo value={v.measles_vaccine_received} onChange={(x)=>set({measles_vaccine_received:x})} options={enums?.yes_no_unk || ["Yes","No","Unknown"]} disabled={disabled}/></Field>
        <Field label="Number of doses">
          <Sel value={String(v.doses||0)} onChange={(x)=>set({doses: Number(x)})} options={["0","1","2"]} disabled={disabled}/>
        </Field>
      </Grid>
      {(v.doses || 0) > 0 && (
        <div>
          <L>Age at each dose (years)</L>
          <div className="flex gap-3 mt-2">
            {Array.from({length: v.doses}).map((_,i) => (
              <div key={i}>
                <div className="uppercase-label">Dose {i+1}</div>
                <TI type="number" step="0.1" value={(v.dose_ages||[])[i] ?? ""} disabled={disabled} onChange={(e)=>setDoseAge(i, e.target.value)} className="w-28"/>
              </div>
            ))}
          </div>
        </div>
      )}
      <Grid>
        <Field label="Age at measles infection (years)"><TI type="number" step="0.1" value={v.measles_infection_age ?? ""} disabled={disabled} onChange={(e)=>set({measles_infection_age: e.target.value===""?null:Number(e.target.value)})}/></Field>
        <Field label="Family history of SSPE"><YesNo value={v.family_sspe_history} onChange={(x)=>set({family_sspe_history:x})} disabled={disabled}/></Field>
      </Grid>
      <Grid>
        <Field label="Siblings' measles history"><TA rows={2} value={v.siblings_measles_history} disabled={disabled} onChange={(e)=>set({siblings_measles_history:e.target.value})}/></Field>
        <Field label="Siblings' vaccination status"><TA rows={2} value={v.siblings_vaccination_status} disabled={disabled} onChange={(e)=>set({siblings_vaccination_status:e.target.value})}/></Field>
      </Grid>
    </div>
  </div>);
}

function Section5({ v, set, enums, disabled }) {
  const symptoms = enums?.symptoms || [];
  const lateralityList = enums?.laterality_symptoms || [];
  const toggle = (s) => {
    const cur = v.symptoms || [];
    set({ symptoms: cur.includes(s) ? cur.filter(x=>x!==s) : [...cur, s] });
  };
  const getSide = (name) => (v.laterality || []).find(x => x.name === name)?.side || "";
  const setSide = (name, side) => {
    const cur = v.laterality || [];
    const filtered = cur.filter(x => x.name !== name);
    set({ laterality: [...filtered, { name, side }] });
  };
  return (<div>
    <h2 className="font-display text-2xl text-[#172320]">Symptoms &amp; disease progression</h2>
    <p className="text-sm text-[#5C6D68] mt-1">Select all that apply. Laterality controls (L/R/Both) appear for arms and legs.</p>
    <div className="mt-6 space-y-6">
      <div>
        <L>Symptoms experienced</L>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-y-2">
          {symptoms.map(s => (
            <label key={s} className="flex items-start gap-2 text-sm cursor-pointer" data-testid={`sym-${s}`}>
              <Checkbox checked={(v.symptoms||[]).includes(s)} onCheckedChange={()=>toggle(s)} disabled={disabled} className="rounded-none data-[state=checked]:bg-[#1B3B36] data-[state=checked]:border-[#1B3B36] mt-0.5"/>
              <span className="text-[#172320]">{s}</span>
            </label>
          ))}
        </div>
      </div>
      {lateralityList.some(x => (v.symptoms||[]).includes(x)) && (
        <div className="border border-[#E5E7E5] p-4 bg-[#F9FAF9]">
          <L>Laterality</L>
          <div className="mt-3 space-y-3">
            {lateralityList.filter(x => (v.symptoms||[]).includes(x)).map(name => (
              <div key={name} className="flex items-center justify-between">
                <div className="text-sm text-[#172320]">{name}</div>
                <div className="flex gap-1">
                  {["L","R","Both"].map(side => (
                    <button key={side} type="button" disabled={disabled} onClick={()=>setSide(name, side)}
                      className={`px-3 py-1.5 text-xs font-semibold border ${getSide(name)===side ? "bg-[#1B3B36] text-white border-[#1B3B36]" : "bg-white text-[#172320] border-[#E5E7E5] hover:bg-[#F2F4F3]"}`}>
                      {side}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {(v.symptoms||[]).includes("Others") && (
        <Field label="Specify other symptom(s)"><TI value={v.other_symptom} disabled={disabled} onChange={(e)=>set({other_symptom:e.target.value})}/></Field>
      )}
      <Grid>
        <Field label="Months between measles &amp; symptom onset"><TI type="number" value={v.duration_measles_to_symptoms_months ?? ""} disabled={disabled} onChange={(e)=>set({duration_measles_to_symptoms_months: e.target.value===""?null:Number(e.target.value)})}/></Field>
        <Field label="First symptom observed"><TI value={v.first_symptom} disabled={disabled} onChange={(e)=>set({first_symptom:e.target.value})}/></Field>
      </Grid>
      <Grid>
        <Field label="Previously seen another doctor?"><YesNo value={v.previous_consultation} onChange={(x)=>set({previous_consultation:x})} disabled={disabled}/></Field>
        <Field label="Treatments previously prescribed"><TA rows={2} value={v.previous_treatments} disabled={disabled} onChange={(e)=>set({previous_treatments:e.target.value})}/></Field>
      </Grid>
    </div>
  </div>);
}

function TestRow({ testKey, label, v, setV, disabled }) {
  const [uploading, setUploading] = useState(false);
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/files/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setV({ file_id: data.id });
      toast.success("File uploaded");
    } catch (er) { toast.error(apiErrText(er)); }
    setUploading(false);
  };
  return (
    <div className="grid grid-cols-12 gap-3 items-start border-b border-[#E5E7E5] py-4">
      <div className="col-span-12 md:col-span-3">
        <div className="text-sm font-semibold text-[#172320]">{label}</div>
        <YesNo value={v.performed ? "Yes" : "No"} onChange={(x)=>setV({ performed: x==="Yes" })} disabled={disabled}/>
      </div>
      <div className="col-span-12 md:col-span-6">
        <L>Findings</L>
        <Textarea rows={2} value={v.findings || ""} disabled={disabled || !v.performed} onChange={(e)=>setV({ findings: e.target.value })} className="rounded-none focus-visible:ring-[#1B3B36] mt-1"/>
      </div>
      <div className="col-span-12 md:col-span-3">
        <L>Report file</L>
        {v.file_id ? (
          <div className="mt-1 text-sm flex items-center gap-2">
            <Check className="w-4 h-4 text-[#2F6B4C]"/> Uploaded
            <button type="button" disabled={disabled} onClick={()=>setV({file_id:null})} className="text-[#B0513A] underline text-xs">Remove</button>
          </div>
        ) : (
          <label className={`mt-1 inline-flex items-center gap-2 px-3 py-2 border border-[#E5E7E5] cursor-pointer text-sm hover:bg-[#F2F4F3] ${(disabled||!v.performed)?"opacity-50 pointer-events-none":""}`} data-testid={`upload-${testKey}`}>
            <Upload className="w-4 h-4"/>{uploading?"Uploading…":"Upload"}
            <input type="file" onChange={onFile} className="sr-only" disabled={disabled || !v.performed}/>
          </label>
        )}
      </div>
    </div>
  );
}

function Section6({ v, set, disabled }) {
  const tests = [
    ["eeg","EEG"], ["csf_analysis","CSF Analysis"], ["serum_analysis","Serum Analysis"],
    ["mri","MRI"], ["ct_scan","CT Scan"], ["fundoscopy","Fundoscopy"],
    ["vep","Visual Evoked Potentials (VEP)"], ["ssep","Somatosensory Evoked Potentials (SSEP)"],
    ["metabolic_blood_tests","Metabolic Blood Tests (Wilson's, lupus)"],
    ["infectious_panel","Infectious Panel (HIV, HSV, TB, toxo)"],
    ["autoimmune_encephalitis_panel","Autoimmune Encephalitis Panel"],
  ];
  return (<div>
    <h2 className="font-display text-2xl text-[#172320]">Diagnostic tests</h2>
    <p className="text-sm text-[#5C6D68] mt-1">Toggle "Yes" to record findings and attach a report (PDF/image up to 15 MB).</p>
    <div className="mt-6">
      {tests.map(([k, label]) => (
        <TestRow key={k} testKey={k} label={label} v={v[k] || emptyTest} setV={(patch)=>set({ [k]: { ...(v[k]||emptyTest), ...patch } })} disabled={disabled}/>
      ))}
    </div>
  </div>);
}

function Section7({ v, set, disabled }) {
  const items = [
    ["clinical_presentation", "Characteristic clinical presentation", "e.g. progressive cognitive decline, myoclonus"],
    ["eeg_findings", "Characteristic EEG findings", "e.g. periodic high-amplitude slow waves"],
    ["elevated_measles_antibody", "Elevated measles antibody titers", "in CSF or serum"],
    ["histopathology", "Typical histopathological findings", "if biopsy performed"],
    ["mri_findings", "Characteristic MRI findings", "e.g. white matter changes, cortical atrophy"],
  ];
  const score = items.filter(([k])=>v[k]).length;
  return (<div>
    <h2 className="font-display text-2xl text-[#172320]">Dyken's Criteria</h2>
    <p className="text-sm text-[#5C6D68] mt-1">Score is computed automatically. It updates in the sticky badge above.</p>
    <div className="mt-6 space-y-3">
      {items.map(([k, label, hint]) => (
        <label key={k} className={`flex items-start gap-4 border p-4 cursor-pointer ${v[k]?"border-[#1B3B36] bg-[#F5F8F7]":"border-[#E5E7E5] bg-white"}`}>
          <Checkbox checked={!!v[k]} onCheckedChange={(x)=>set({[k]: !!x})} disabled={disabled} data-testid={`dyken-${k}`} className="rounded-none data-[state=checked]:bg-[#1B3B36] data-[state=checked]:border-[#1B3B36] mt-1"/>
          <div>
            <div className="font-semibold text-[#172320]">{label}</div>
            <div className="text-sm text-[#5C6D68]">{hint}</div>
          </div>
        </label>
      ))}
      <div className={`mt-4 p-4 flex items-center justify-between ${score>=4?"bg-[#1B3B36] text-white":score===3?"bg-[#C48F38] text-white":"bg-[#F2F4F3] text-[#172320]"}`}>
        <div className="uppercase-label" style={{color:"inherit", opacity:0.75}}>Final Dyken's score</div>
        <div className="font-display text-3xl">{score}/5</div>
      </div>
    </div>
  </div>);
}

function Section8({ v, set, disabled }) {
  const toggle = (b) => {
    const cur = v.barriers || [];
    set({ barriers: cur.includes(b) ? cur.filter(x=>x!==b) : [...cur, b] });
  };
  return (<div>
    <h2 className="font-display text-2xl text-[#172320]">Perception about vaccination</h2>
    <div className="mt-6 space-y-5">
      <Field label="Parents' / caregivers' views on vaccination">
        <TA rows={3} value={v.vaccination_views} disabled={disabled} onChange={(e)=>set({vaccination_views:e.target.value})}/>
      </Field>
      <Field label="Barriers (multi-select)">
        <div className="flex flex-wrap gap-2">
          {BARRIERS.map(b => (
            <label key={b} className={`px-3 py-1.5 text-sm border cursor-pointer ${(v.barriers||[]).includes(b) ? "bg-[#1B3B36] text-white border-[#1B3B36]" : "bg-white border-[#E5E7E5] hover:bg-[#F2F4F3]"}`}>
              <input type="checkbox" checked={(v.barriers||[]).includes(b)} onChange={()=>toggle(b)} className="sr-only"/>{b}
            </label>
          ))}
        </div>
      </Field>
      <Field label="Other barriers"><TI value={v.barriers_other} disabled={disabled} onChange={(e)=>set({barriers_other:e.target.value})}/></Field>
      <Field label="Any other relevant information or observations">
        <TA rows={4} value={v.other_observations} disabled={disabled} onChange={(e)=>set({other_observations:e.target.value})}/>
      </Field>
    </div>
  </div>);
}
