import React, { useEffect, useState, useRef } from "react";
import { api, apiErrText } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, RotateCcw, Save, ImageIcon } from "lucide-react";

const FIELDS = [
  { key: "site_name", label: "Site name", hint: "Main brand shown in the header and footer.", type: "text" },
  { key: "site_name_accent", label: "Accent word in site name", hint: "This word inside the site name will be highlighted in ochre (e.g. \"SSPE\").", type: "text" },
  { key: "tagline", label: "Header tagline", hint: "Small uppercase text below the site name in the header.", type: "text" },
  { key: "hero_eyebrow", label: "Landing eyebrow", hint: "Small label above the hero headline on the landing page.", type: "text" },
  { key: "hero_headline_1", label: "Hero headline · line 1", type: "text" },
  { key: "hero_headline_2", label: "Hero headline · line 2", type: "text" },
  { key: "hero_headline_accent", label: "Highlight word on line 2", hint: "This word inside line 2 will be highlighted in ochre.", type: "text" },
  { key: "hero_headline_3", label: "Hero headline · line 3", type: "text" },
  { key: "hero_description", label: "Hero description", hint: "Paragraph shown below the hero headline.", type: "textarea" },
  { key: "footer_text", label: "Footer text", type: "text" },
];

export default function SiteSettings() {
  const { settings, setSettings, refreshSettings } = useAuth();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { setForm(settings ? { ...settings } : null); }, [settings]);

  if (!form) return <div className="p-6 text-sm text-[#5C6D68]">Loading settings…</div>;

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await api.put("/settings/site", form);
      setSettings(data);
      setForm(data);
      toast.success("Site settings saved");
    } catch (e) { toast.error(apiErrText(e)); }
    setBusy(false);
  };

  const reset = async () => {
    if (!window.confirm("Reset all site settings to defaults? Your logo will also be cleared.")) return;
    setBusy(true);
    try {
      const { data } = await api.post("/settings/site/reset");
      setSettings(data);
      setForm(data);
      toast.success("Reset to defaults");
    } catch (e) { toast.error(apiErrText(e)); }
    setBusy(false);
  };

  const onLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 400 * 1024) {
      toast.error("Logo must be under 400 KB. Please compress or use a smaller image.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      set("logo_data_url", dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const clearLogo = () => set("logo_data_url", "");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form */}
      <div className="lg:col-span-2 bg-white border border-[#E5E7E5]">
        <div className="p-4 border-b border-[#E5E7E5] flex items-center justify-between">
          <div>
            <div className="font-display text-lg text-[#172320]">Branding &amp; content</div>
            <div className="uppercase-label">Applies across the header, landing page and footer</div>
          </div>
        </div>
        <div className="p-6 space-y-5">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <Label className="uppercase-label" htmlFor={`ss-${f.key}`}>{f.label}</Label>
              {f.hint && <div className="text-xs text-[#5C6D68] mt-1 mb-2">{f.hint}</div>}
              {f.type === "textarea" ? (
                <Textarea id={`ss-${f.key}`} rows={4} value={form[f.key] || ""} onChange={(e)=>set(f.key, e.target.value)} className="rounded-none focus-visible:ring-[#1B3B36] mt-1" data-testid={`ss-${f.key}`}/>
              ) : (
                <Input id={`ss-${f.key}`} value={form[f.key] || ""} onChange={(e)=>set(f.key, e.target.value)} className="rounded-none focus-visible:ring-[#1B3B36] mt-1" data-testid={`ss-${f.key}`}/>
              )}
            </div>
          ))}

          <div>
            <Label className="uppercase-label">Logo</Label>
            <div className="text-xs text-[#5C6D68] mt-1 mb-2">PNG or SVG under 400 KB. Displayed at 36px in the header. Leave empty to use the default mark.</div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 border border-[#E5E7E5] bg-[#FAFAFA] flex items-center justify-center overflow-hidden">
                {form.logo_data_url ? (
                  <img src={form.logo_data_url} alt="preview" className="w-full h-full object-contain" data-testid="ss-logo-preview"/>
                ) : (
                  <ImageIcon className="w-6 h-6 text-[#5C6D68]"/>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button type="button" onClick={()=>fileRef.current?.click()} className="btn-outline-pine rounded-none inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold" data-testid="ss-logo-upload">
                  <Upload className="w-4 h-4"/> {form.logo_data_url ? "Replace logo" : "Upload logo"}
                </button>
                {form.logo_data_url && (
                  <button type="button" onClick={clearLogo} className="text-xs text-[#B0513A] underline text-left" data-testid="ss-logo-clear">Remove logo</button>
                )}
                <input ref={fileRef} type="file" accept="image/*" onChange={onLogo} className="sr-only"/>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5E7E5] flex items-center justify-between">
            <Button variant="outline" onClick={reset} disabled={busy} className="rounded-none border-[#B0513A] text-[#B0513A] hover:bg-[#B0513A] hover:text-white" data-testid="ss-reset">
              <RotateCcw className="w-4 h-4 mr-2"/> Reset to defaults
            </Button>
            <Button onClick={save} disabled={busy} className="btn-pine rounded-none" data-testid="ss-save">
              <Save className="w-4 h-4 mr-2"/> {busy ? "Saving…" : "Save settings"}
            </Button>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white border border-[#E5E7E5]">
        <div className="p-4 border-b border-[#E5E7E5]">
          <div className="font-display text-lg text-[#172320]">Live preview</div>
          <div className="uppercase-label">Reflects unsaved changes</div>
        </div>
        <div className="p-5 space-y-6">
          <PreviewHeader form={form}/>
          <PreviewHero form={form}/>
          <PreviewFooter form={form}/>
        </div>
      </div>
    </div>
  );
}

function accentSplit(text, accent) {
  if (!accent || !text || !text.toLowerCase().includes(accent.toLowerCase())) return [text, "", ""];
  const idx = text.toLowerCase().indexOf(accent.toLowerCase());
  return [text.slice(0, idx), text.slice(idx, idx + accent.length), text.slice(idx + accent.length)];
}

function PreviewHeader({ form }) {
  const [a, b, c] = accentSplit(form.site_name || "", form.site_name_accent || "");
  return (
    <div className="border border-[#E5E7E5]">
      <div className="uppercase-label bg-[#F2F4F3] px-3 py-1.5">Header</div>
      <div className="p-4 flex items-center gap-3">
        {form.logo_data_url ? (
          <img src={form.logo_data_url} className="w-9 h-9 object-contain" alt=""/>
        ) : (
          <div className="w-8 h-8 bg-[#1B3B36]" />
        )}
        <div className="leading-none">
          <div className="font-display text-base text-[#172320]">{a}<span className="text-[#C48F38]">{b}</span>{c}</div>
          <div className="uppercase-label mt-0.5">{form.tagline}</div>
        </div>
      </div>
    </div>
  );
}

function PreviewHero({ form }) {
  const [a, b, c] = accentSplit(form.hero_headline_2 || "", form.hero_headline_accent || "");
  return (
    <div className="border border-[#E5E7E5]">
      <div className="uppercase-label bg-[#F2F4F3] px-3 py-1.5">Landing hero</div>
      <div className="p-4">
        <div className="uppercase-label mb-2">{form.hero_eyebrow}</div>
        <div className="font-display text-2xl leading-tight text-[#172320]">
          {form.hero_headline_1}<br/>
          {a}<span className="text-[#C48F38]">{b}</span>{c}<br/>
          {form.hero_headline_3}
        </div>
        <p className="mt-3 text-xs text-[#2C3B37] leading-relaxed">{form.hero_description}</p>
      </div>
    </div>
  );
}

function PreviewFooter({ form }) {
  return (
    <div className="border border-[#E5E7E5]">
      <div className="uppercase-label bg-[#F2F4F3] px-3 py-1.5">Footer</div>
      <div className="p-4 text-xs text-[#5C6D68]">© {new Date().getFullYear()} {form.site_name} · {form.footer_text}</div>
    </div>
  );
}
