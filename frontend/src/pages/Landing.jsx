import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrText } from "@/lib/api";
import { AppHeader } from "@/components/AppHeader";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { useAuth } from "@/contexts/AuthContext";
import { Search, ShieldCheck, Users, Database, ChartLine, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function Landing() {
  const { settings, lang, tf } = useAuth();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("doctors");
  const [docResults, setDocResults] = useState([]);
  const [patResults, setPatResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runSearch = async () => {
    setLoading(true); setError("");
    try {
      if (tab === "doctors") {
        const { data } = await api.get(`/public/doctors`, { params: { q } });
        setDocResults(data);
      } else {
        const { data } = await api.get(`/public/patients`, { params: { q } });
        setPatResults(data);
      }
    } catch (e) { setError(apiErrText(e)); }
    setLoading(false);
  };

  return (
    <div className="App bg-[#FAFAFA] min-h-screen">
      <AppHeader />
      <AnnouncementBanner />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[#E5E7E5]">
        <div className="absolute inset-0 grid-tick opacity-40 pointer-events-none" />
        <div className="max-w-[1400px] mx-auto px-6 pt-14 pb-16 grid grid-cols-1 lg:grid-cols-12 gap-10 relative">
          <div className="lg:col-span-8">
            <div className={`mb-5 ${lang==="ur" ? "font-urdu text-sm" : "uppercase-label"}`} dir={lang==="ur"?"rtl":"ltr"} data-testid="landing-tagline">{tf("hero_eyebrow") || "A national SSPE surveillance registry · Pakistan"}</div>
            <h1 className={`text-5xl sm:text-6xl lg:text-7xl leading-[0.95] text-[#172320] ${lang==="ur" ? "font-urdu text-right" : "font-display"}`} dir={lang==="ur"?"rtl":"ltr"}>
              {tf("hero_headline_1") || "Structured SSPE"}<br />
              {(() => {
                const line2 = tf("hero_headline_2") || "histories, unified for";
                const accent = settings?.hero_headline_accent || "unified";
                const accentColor = settings?.accent_color || "#C48F38";
                if (lang !== "ur" && accent && line2.toLowerCase().includes(accent.toLowerCase())) {
                  const idx = line2.toLowerCase().indexOf(accent.toLowerCase());
                  return (<>{line2.slice(0, idx)}<span style={{ color: accentColor }}>{line2.slice(idx, idx + accent.length)}</span>{line2.slice(idx + accent.length)}</>);
                }
                return line2;
              })()}<br />
              {tf("hero_headline_3") || "Pakistan's consultants."}
            </h1>
            <p className={`mt-6 max-w-2xl text-[#2C3B37] ${lang==="ur" ? "font-urdu text-lg leading-loose text-right" : "text-base md:text-lg leading-relaxed"}`} dir={lang==="ur"?"rtl":"ltr"}>
              {tf("hero_description") || "The National SSPE Registry Pakistan is a secure platform for verified SSPE clinicians to record, share, and research patient histories — with typed clinical fields, an SSPE intake protocol built on Dyken's Criteria, and cross-hospital edit governance."}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/register" className="btn-pine px-6 py-3 text-sm font-semibold inline-flex items-center gap-2" data-testid="cta-register">
                Register as Doctor <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/login" className="btn-outline-pine px-6 py-3 text-sm font-semibold" data-testid="cta-login">
                Sign in as Doctor
              </Link>
              <Link to="/admin/login" className="px-6 py-3 text-sm font-semibold text-[#5C6D68] hover:text-[#172320]" data-testid="cta-admin">
                Admin login →
              </Link>
            </div>

            {/* Search */}
            <div className="mt-12 bg-white border border-[#E5E7E5] rounded-md p-5">
              <div className="uppercase-label mb-3">Public directory search</div>
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="bg-[#F2F4F3]">
                  <TabsTrigger value="doctors" data-testid="tab-search-doctors">Doctors</TabsTrigger>
                  <TabsTrigger value="patients" data-testid="tab-search-patients">Patients (limited)</TabsTrigger>
                </TabsList>
                <div className="mt-4 flex gap-2">
                  <div className="flex-1 flex items-center border border-[#E5E7E5] bg-white px-3">
                    <Search className="w-4 h-4 text-[#5C6D68]" />
                    <Input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && runSearch()}
                      placeholder={tab === "doctors" ? "Name, specialty, hospital, city…" : "Patient name or record ID…"}
                      className="border-0 focus-visible:ring-0 shadow-none bg-transparent"
                      data-testid="landing-search-input"
                    />
                  </div>
                  <Button onClick={runSearch} className="btn-pine rounded-none px-6" data-testid="landing-search-btn">
                    {loading ? "Searching…" : "Search"}
                  </Button>
                </div>
                {error && <div className="mt-3 text-sm text-[#B0513A]">{error}</div>}
                <TabsContent value="doctors" className="mt-4">
                  <div className="divide-y divide-[#E5E7E5] border border-[#E5E7E5] max-h-[300px] overflow-auto">
                    {docResults.length === 0 && <div className="p-4 text-sm text-[#5C6D68]">No results yet. Try "Karachi" or "SSPE".</div>}
                    {docResults.map((d) => (
                      <div key={d.id} className="p-4 flex items-center justify-between row-hover" data-testid={`doctor-result-${d.id}`}>
                        <div>
                          <div className="font-semibold text-[#172320]">{d.name}</div>
                          <div className="text-sm text-[#5C6D68]">{d.specialty} · {d.hospital} · {d.city}</div>
                        </div>
                        {d.verified && (
                          <div className="flex items-center gap-1 uppercase-label text-[#2F6B4C]">
                            <ShieldCheck className="w-3.5 h-3.5" /> Verified
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="patients" className="mt-4">
                  <div className="divide-y divide-[#E5E7E5] border border-[#E5E7E5] max-h-[300px] overflow-auto">
                    {patResults.length === 0 && <div className="p-4 text-sm text-[#5C6D68]">No results yet. Clinical details are hidden — log in as a verified doctor to view records.</div>}
                    {patResults.map((p) => (
                      <div key={p.id} className="p-4 flex items-center justify-between row-hover" data-testid={`patient-result-${p.id}`}>
                        <div>
                          <div className="font-semibold text-[#172320]">{p.name}</div>
                          <div className="text-sm text-[#5C6D68]">{p.city} · {p.age} y · {p.gender}</div>
                        </div>
                        <div className="uppercase-label">Clinical details protected</div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
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
                    <span className="w-1.5 h-1.5 bg-[#C48F38]" /> {p}
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
        <div className={lang==="ur" ? "font-urdu text-right w-full" : ""} dir={lang==="ur"?"rtl":"ltr"}>© {new Date().getFullYear()} {tf("site_name") || "National SSPE Registry"} · {tf("footer_text") || "A national registry for SSPE surveillance & research"}</div>
        <div className="uppercase-label">SSPE Protocol v1 · Dyken's Criteria</div>
      </footer>
    </div>
  );
}
