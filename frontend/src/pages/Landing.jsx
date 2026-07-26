import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrText } from "@/lib/api";
import { AppHeader } from "@/components/AppHeader";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { useAuth } from "@/contexts/AuthContext";
import { Search, ShieldCheck, Users, Database, ChartLine, ArrowRight, MapPin, Building2, Stethoscope, UserRound, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function Landing() {
  const { settings } = useAuth();
  const accentColor = settings?.accent_color || "#C48F38";

  // Directory state
  const [tab, setTab] = useState("doctors");
  const [q, setQ] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadDoctors = async (query = "") => {
    setLoading(true); setError("");
    try {
      const { data } = await api.get(`/public/doctors`, { params: query ? { q: query } : {} });
      setDoctors(data);
    } catch (e) { setError(apiErrText(e)); }
    setLoading(false);
  };
  const loadPatients = async (query = "") => {
    setLoading(true); setError("");
    try {
      const { data } = await api.get(`/public/patients`, { params: query ? { q: query } : {} });
      setPatients(data);
    } catch (e) { setError(apiErrText(e)); }
    setLoading(false);
  };

  // Prime the cards on mount, and reload whenever tab switches with a fresh query
  useEffect(() => { loadDoctors(""); loadPatients(""); }, []);

  const runSearch = () => {
    if (tab === "doctors") loadDoctors(q); else loadPatients(q);
  };

  // Live filter on each keystroke (debounced-lite via useEffect)
  useEffect(() => {
    const id = setTimeout(() => {
      if (tab === "doctors") loadDoctors(q); else loadPatients(q);
    }, 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line
  }, [q, tab]);

  const line2 = settings?.hero_headline_2 || "histories, unified for";
  const accentWord = settings?.hero_headline_accent || "unified";
  const line2Parts = (() => {
    if (!accentWord || !line2.toLowerCase().includes(accentWord.toLowerCase())) return [line2, "", ""];
    const idx = line2.toLowerCase().indexOf(accentWord.toLowerCase());
    return [line2.slice(0, idx), line2.slice(idx, idx + accentWord.length), line2.slice(idx + accentWord.length)];
  })();

  return (
    <div className="App bg-[#FAFAFA] min-h-screen">
      <AppHeader />
      <AnnouncementBanner />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[#E5E7E5]">
        <div className="absolute inset-0 grid-tick opacity-40 pointer-events-none" />
        <div className="max-w-[1400px] mx-auto px-6 pt-14 pb-16 grid grid-cols-1 lg:grid-cols-12 gap-10 relative">
          <div className="lg:col-span-8">
            <div className="uppercase-label mb-5" data-testid="landing-tagline">{settings?.hero_eyebrow || "A national SSPE surveillance registry · Pakistan"}</div>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[0.95] text-[#172320]">
              {settings?.hero_headline_1 || "Structured SSPE"}<br />
              {line2Parts[0]}<span style={{ color: accentColor }}>{line2Parts[1]}</span>{line2Parts[2]}<br />
              {settings?.hero_headline_3 || "Pakistan's consultants."}
            </h1>
            <p className="mt-6 max-w-2xl text-base md:text-lg text-[#2C3B37] leading-relaxed">
              {settings?.hero_description || "The National SSPE Registry Pakistan is a secure platform for verified SSPE clinicians to record, share, and research patient histories — with typed clinical fields, an SSPE intake protocol built on Dyken's Criteria, and cross-hospital edit governance."}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/register" className="btn-pine px-6 py-3 text-sm font-semibold inline-flex items-center gap-2" data-testid="cta-register">
                Register as Doctor <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/register-data-collector" className="btn-outline-pine px-6 py-3 text-sm font-semibold" data-testid="cta-register-dc">
                Register as Data Collector
              </Link>
              <Link to="/login" className="px-6 py-3 text-sm font-semibold text-[#172320] hover:bg-[#F2F4F3]" data-testid="cta-login">
                Sign in
              </Link>
              <Link to="/admin/login" className="px-6 py-3 text-sm font-semibold text-[#5C6D68] hover:text-[#172320]" data-testid="cta-admin">
                Admin login →
              </Link>
            </div>
          </div>

          {/* Right side stat panel */}
          <aside className="lg:col-span-4 flex flex-col gap-4">
            <div className="bg-[#1B3B36] text-white p-6">
              <div className="uppercase-label text-white/70">Dyken's Criteria</div>
              <div className="mt-4 font-display text-6xl leading-none">5<span className="text-white/40">/5</span></div>
              <div className="mt-3 text-sm text-white/80">Auto-computed diagnostic score from clinical presentation, EEG findings, measles antibody titers, histopathology, and MRI.</div>
            </div>
            <div className="bg-white border border-[#E5E7E5] p-6">
              <div className="uppercase-label">Regions</div>
              <div className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
                {["Punjab","Sindh","KPK","Balochistan","GB","AJK","ICT"].map(p => (
                  <div key={p} className="flex items-center gap-2 text-[#172320]">
                    <span className="w-1.5 h-1.5" style={{ backgroundColor: accentColor }} /> {p}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white border border-[#E5E7E5] p-6">
              <div className="uppercase-label">Governance</div>
              <ul className="mt-3 space-y-2 text-sm text-[#2C3B37]">
                <li className="flex gap-2"><ShieldCheck className="w-4 h-4 text-[#1B3B36] mt-0.5"/>Admin-verified doctors only</li>
                <li className="flex gap-2"><Users className="w-4 h-4 text-[#1B3B36] mt-0.5"/>Owner-approved edit access</li>
                <li className="flex gap-2"><Database className="w-4 h-4 text-[#1B3B36] mt-0.5"/>Full audit trail per record</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>

      {/* Public directory — searchable cards */}
      <section id="directory" className="border-b border-[#E5E7E5] bg-white">
        <div className="max-w-[1400px] mx-auto px-6 py-14">
          <div className="flex flex-wrap items-end justify-between gap-6 mb-8">
            <div>
              <div className="uppercase-label">Public directory</div>
              <h2 className="font-display text-3xl md:text-4xl text-[#172320] mt-1">Find a doctor or a patient record</h2>
              <p className="text-sm text-[#5C6D68] mt-2 max-w-2xl">Browse verified SSPE consultants across Pakistan and non-sensitive patient identifiers. Full clinical details unlock only after admin-approved doctor login.</p>
            </div>
            <Tabs value={tab} onValueChange={(v)=>{ setTab(v); setQ(""); }} className="shrink-0">
              <TabsList className="bg-[#F2F4F3] rounded-none">
                <TabsTrigger value="doctors" data-testid="tab-search-doctors" className="rounded-none">
                  <Stethoscope className="w-3.5 h-3.5 mr-1.5"/> Doctors
                </TabsTrigger>
                <TabsTrigger value="patients" data-testid="tab-search-patients" className="rounded-none">
                  <UserRound className="w-3.5 h-3.5 mr-1.5"/> Patients
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <div className="flex-1 min-w-[260px] flex items-center border border-[#E5E7E5] bg-white px-3">
              <Search className="w-4 h-4 text-[#5C6D68]" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                placeholder={tab === "doctors" ? "Search by name, specialty, hospital, or city…" : "Search patient by name or record ID…"}
                className="border-0 focus-visible:ring-0 shadow-none bg-transparent h-11"
                data-testid="landing-search-input"
              />
            </div>
            <Button onClick={runSearch} className="btn-pine rounded-none px-6 h-11" data-testid="landing-search-btn">
              {loading ? "Searching…" : "Search"}
            </Button>
          </div>
          {error && <div className="mb-4 text-sm text-[#B0513A]">{error}</div>}

          {tab === "doctors" && (
            <>
              <div className="uppercase-label mb-3">{doctors.length} {doctors.length === 1 ? "doctor" : "doctors"} found</div>
              {doctors.length === 0 && !loading ? (
                <EmptyState label={q ? `No verified doctors match "${q}"` : "No verified doctors yet. Doctors appear here once approved by an admin."}/>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {doctors.map((d) => (<DoctorCard key={d.id} d={d}/>))}
                </div>
              )}
            </>
          )}

          {tab === "patients" && (
            <>
              <div className="uppercase-label mb-3">{patients.length} {patients.length === 1 ? "record" : "records"} found</div>
              {patients.length === 0 && !loading ? (
                <EmptyState label={q ? `No patient records match "${q}"` : "No patient records yet."}/>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {patients.map((p) => (<PatientCard key={p.id} p={p}/>))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-[#E5E7E5]">
        <div className="max-w-[1400px] mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-px bg-[#E5E7E5]">
          {[
            { icon: Database, title: "Structured Intake", body: "8-section SSPE wizard with typed fields — ethnicity, province, symptoms with L/R laterality, vaccination doses, and diagnostic tests with file upload." },
            { icon: Users, title: "Cross-Hospital Sharing", body: "Every verified clinician can view any SSPE record for referrals and second opinions. Editing requires an approved request from the owning doctor." },
            { icon: ChartLine, title: "SSPE Research", body: "Filter across region, age, symptoms, Dyken's score, and measles vaccination status. Export de-identified CSVs for epidemiological studies." },
          ].map(({ icon: Icon, title, body }, i) => (
            <div key={i} className="bg-white p-8">
              <Icon className="w-6 h-6 text-[#1B3B36]" strokeWidth={2} />
              <div className="font-display text-xl mt-4 text-[#172320]">{title}</div>
              <p className="mt-2 text-sm text-[#2C3B37] leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="max-w-[1400px] mx-auto px-6 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-sm text-[#5C6D68]">
        <div>© {new Date().getFullYear()} {settings?.site_name || "National SSPE Registry"} · {settings?.footer_text || "A national registry for SSPE surveillance & research"}</div>
        <div className="uppercase-label">SSPE Protocol v1 · Dyken's Criteria</div>
      </footer>
    </div>
  );
}

function DoctorCard({ d }) {
  const initials = (d.name || "").replace(/^Dr\.\s*/i, "").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="group bg-white border border-[#E5E7E5] p-5 hover:border-[#1B3B36] transition-colors" data-testid={`doctor-card-${d.id}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-[#1B3B36] text-white font-display text-sm flex items-center justify-center shrink-0">{initials || "DR"}</div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[#172320] truncate">{d.name}</div>
          <div className="text-xs text-[#5C6D68] truncate">{d.specialty}</div>
        </div>
        {d.verified && (
          <div className="inline-flex items-center gap-1 uppercase-label text-[#2F6B4C] shrink-0" title="Verified by admin">
            <ShieldCheck className="w-3.5 h-3.5" /> Verified
          </div>
        )}
      </div>
      <div className="mt-4 space-y-1.5 text-sm text-[#2C3B37]">
        <div className="flex items-center gap-2"><Building2 className="w-3.5 h-3.5 text-[#5C6D68]"/>{d.hospital}</div>
        <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-[#5C6D68]"/>{d.city}</div>
      </div>
      <div className="mt-4 pt-3 border-t border-[#E5E7E5] flex items-center justify-between">
        <span className="uppercase-label">SSPE Consultant</span>
        <Link to="/login" className="text-xs font-semibold text-[#1B3B36] group-hover:underline inline-flex items-center gap-1" data-testid={`doctor-card-connect-${d.id}`}>
          Sign in to connect <ArrowRight className="w-3 h-3"/>
        </Link>
      </div>
    </div>
  );
}

function PatientCard({ p }) {
  return (
    <div className="bg-white border border-[#E5E7E5] p-5 hover:border-[#1B3B36] transition-colors" data-testid={`patient-card-${p.id}`}>
      <div className="uppercase-label">Patient</div>
      <div className="font-display text-lg text-[#172320] mt-1 truncate">{p.name}</div>
      <div className="mt-3 space-y-1.5 text-sm text-[#2C3B37]">
        <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-[#5C6D68]"/>{p.city || "—"}</div>
        <div className="flex items-center gap-2"><UserRound className="w-3.5 h-3.5 text-[#5C6D68]"/>{p.age ?? "—"} y · {p.gender || "—"}</div>
      </div>
      <div className="mt-4 pt-3 border-t border-[#E5E7E5] flex items-center gap-1.5 uppercase-label text-[#5C6D68]">
        <Lock className="w-3 h-3"/> Clinical details protected
      </div>
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="border border-dashed border-[#E5E7E5] bg-[#FAFAFA] p-10 text-center">
      <div className="text-sm text-[#5C6D68]">{label}</div>
    </div>
  );
}
