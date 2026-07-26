import React, { useEffect, useState, useRef } from "react";
import { api, apiErrText } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Upload, RotateCcw, Save, ImageIcon, Palette, Megaphone } from "lucide-react";

const BRAND_FIELDS = [
  { key: "site_name", label: "Site name" },
  { key: "site_name_accent", label: "Accent word in site name", hint: "Word inside the site name that gets highlighted in the accent color." },
  { key: "tagline", label: "Header tagline" },
  { key: "hero_eyebrow", label: "Landing eyebrow" },
  { key: "hero_headline_1", label: "Hero headline · line 1" },
  { key: "hero_headline_2", label: "Hero headline · line 2" },
  { key: "hero_headline_accent", label: "Highlight word on line 2" },
  { key: "hero_headline_3", label: "Hero headline · line 3" },
  { key: "hero_description", label: "Hero description", multiline: true },
  { key: "footer_text", label: "Footer text" },
];

export default function SiteSettings() {
  const { settings, setSettings } = useAuth();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const logoRef = useRef(null);
  const faviconRef = useRef(null);

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
    if (!window.confirm("Reset all site settings to defaults? Logo, favicon and announcement banner will also be cleared.")) return;
    setBusy(true);
    try {
      const { data } = await api.post("/settings/site/reset");
      setSettings(data);
      setForm(data);
      toast.success("Reset to defaults");
    } catch (e) { toast.error(apiErrText(e)); }
    setBusy(false);
  };

  const uploadImage = (key, maxKB = 400) => async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxKB * 1024) { toast.error(`Image must be under ${maxKB} KB.`); return; }
    const reader = new FileReader();
    reader.onload = () => set(key, reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Panel title="Branding & content" subtitle="Applies across the header, landing page, and footer">
          {BRAND_FIELDS.map((f) => (
            <FormField key={f.key} field={f} value={form[f.key]} onChange={(v)=>set(f.key, v)}/>
          ))}
        </Panel>

        <Panel title="Appearance" subtitle="Logo, favicon, and accent color" icon={Palette}>
          <div>
            <Label className="uppercase-label">Logo</Label>
            <div className="text-xs text-[#5C6D68] mt-1 mb-2">PNG or SVG under 400 KB. Displayed at 36px in the header.</div>
            <ImagePicker inputRef={logoRef} url={form.logo_data_url} onFile={uploadImage("logo_data_url", 400)} onClear={()=>set("logo_data_url", "")} testId="ss-logo"/>
          </div>
          <div>
            <Label className="uppercase-label">Favicon</Label>
            <div className="text-xs text-[#5C6D68] mt-1 mb-2">PNG, SVG or ICO under 100 KB. Appears in the browser tab.</div>
            <ImagePicker inputRef={faviconRef} url={form.favicon_data_url} onFile={uploadImage("favicon_data_url", 100)} onClear={()=>set("favicon_data_url", "")} testId="ss-favicon"/>
          </div>
          <div>
            <Label className="uppercase-label">Accent color</Label>
            <div className="text-xs text-[#5C6D68] mt-1 mb-2">Used for highlighted words in the site name and hero headline.</div>
            <div className="flex items-center gap-3">
              <input type="color" value={form.accent_color || "#C48F38"} onChange={(e)=>set("accent_color", e.target.value)} className="h-11 w-16 border border-[#E5E7E5] cursor-pointer bg-white" data-testid="ss-accent-color"/>
              <Input value={form.accent_color || ""} onChange={(e)=>set("accent_color", e.target.value)} className="rounded-none w-40 focus-visible:ring-[#1B3B36] font-mono" placeholder="#C48F38"/>
              <div className="flex gap-1">
                {["#C48F38","#B0513A","#1B3B36","#2F6B4C","#4B3FA7","#7C3AED"].map(c => (
                  <button key={c} type="button" onClick={()=>set("accent_color", c)} title={c} className="w-8 h-8 border border-[#E5E7E5] hover:scale-110 transition-transform" style={{ backgroundColor: c }} data-testid={`swatch-${c}`}/>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Announcement banner" subtitle="Show a message at the top of the landing page" icon={Megaphone}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-[#172320]">Enable banner</div>
              <div className="text-xs text-[#5C6D68]">Turn on to display the announcement across public pages.</div>
            </div>
            <Switch checked={!!form.announcement_enabled} onCheckedChange={(v)=>set("announcement_enabled", !!v)} data-testid="ss-announce-enabled"/>
          </div>
          <div>
            <Label className="uppercase-label">Message</Label>
            <Textarea rows={2} value={form.announcement_text || ""} onChange={(e)=>set("announcement_text", e.target.value)} placeholder="e.g. Suspected SSPE cluster in Sindh — please prioritise reporting this month." className="rounded-none focus-visible:ring-[#1B3B36] mt-1" data-testid="ss-announce-text"/>
          </div>
          <div>
            <Label className="uppercase-label">Severity</Label>
            <div className="mt-2 flex gap-2">
              {[
                { v: "info", label: "Info", bg: "#1B3B36" },
                { v: "warning", label: "Warning", bg: "#C48F38" },
                { v: "critical", label: "Critical", bg: "#B0513A" },
              ].map(o => (
                <button key={o.v} type="button" onClick={()=>set("announcement_variant", o.v)}
                  className={`px-4 py-2 text-sm font-semibold border-2 ${form.announcement_variant===o.v?"border-[#172320]":"border-transparent"}`}
                  style={{ backgroundColor: o.bg, color: "#fff" }} data-testid={`ss-announce-${o.v}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </Panel>

        <div className="flex items-center justify-between bg-white border border-[#E5E7E5] p-4 sticky bottom-4">
          <Button variant="outline" onClick={reset} disabled={busy} className="rounded-none border-[#B0513A] text-[#B0513A] hover:bg-[#B0513A] hover:text-white" data-testid="ss-reset">
            <RotateCcw className="w-4 h-4 mr-2"/> Reset to defaults
          </Button>
          <Button onClick={save} disabled={busy} className="btn-pine rounded-none" data-testid="ss-save">
            <Save className="w-4 h-4 mr-2"/> {busy ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white border border-[#E5E7E5] sticky top-24">
          <div className="p-4 border-b border-[#E5E7E5]">
            <div className="font-display text-lg text-[#172320]">Live preview</div>
            <div className="uppercase-label">Reflects unsaved changes</div>
          </div>
          <div className="p-5 space-y-4">
            <PreviewAnnouncement form={form}/>
            <PreviewHeader form={form}/>
            <PreviewHero form={form}/>
            <PreviewFooter form={form}/>
          </div>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, icon: Icon, children }) {
  return (
    <div className="bg-white border border-[#E5E7E5]">
      <div className="p-4 border-b border-[#E5E7E5] flex items-center gap-3">
        {Icon && <Icon className="w-4 h-4 text-[#1B3B36]"/>}
        <div>
          <div className="font-display text-lg text-[#172320]">{title}</div>
          <div className="uppercase-label">{subtitle}</div>
        </div>
      </div>
      <div className="p-6 space-y-5">{children}</div>
    </div>
  );
}

function FormField({ field, value, onChange }) {
  return (
    <div>
      <Label className="uppercase-label">{field.label}</Label>
      {field.hint && <div className="text-xs text-[#5C6D68] mt-1 mb-1">{field.hint}</div>}
      {field.multiline ? (
        <Textarea rows={4} value={value || ""} onChange={(e)=>onChange(e.target.value)} className="rounded-none focus-visible:ring-[#1B3B36] mt-1" data-testid={`ss-${field.key}`}/>
      ) : (
        <Input value={value || ""} onChange={(e)=>onChange(e.target.value)} className="rounded-none focus-visible:ring-[#1B3B36] mt-1" data-testid={`ss-${field.key}`}/>
      )}
    </div>
  );
}

function ImagePicker({ inputRef, url, onFile, onClear, testId }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 border border-[#E5E7E5] bg-[#FAFAFA] flex items-center justify-center overflow-hidden">
        {url ? <img src={url} alt="preview" className="w-full h-full object-contain" data-testid={`${testId}-preview`}/> : <ImageIcon className="w-6 h-6 text-[#5C6D68]"/>}
      </div>
      <div className="flex flex-col gap-2">
        <button type="button" onClick={()=>inputRef.current?.click()} className="btn-outline-pine rounded-none inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold" data-testid={`${testId}-upload`}>
          <Upload className="w-4 h-4"/> {url ? "Replace" : "Upload"}
        </button>
        {url && <button type="button" onClick={onClear} className="text-xs text-[#B0513A] underline text-left" data-testid={`${testId}-clear`}>Remove</button>}
        <input ref={inputRef} type="file" accept="image/*" onChange={onFile} className="sr-only"/>
      </div>
    </div>
  );
}

function accentSplit(text, accent) {
  if (!accent || !text || !text.toLowerCase().includes(accent.toLowerCase())) return [text, "", ""];
  const idx = text.toLowerCase().indexOf(accent.toLowerCase());
  return [text.slice(0, idx), text.slice(idx, idx + accent.length), text.slice(idx + accent.length)];
}

function PreviewAnnouncement({ form }) {
  if (!form.announcement_enabled || !form.announcement_text) return null;
  const bg = form.announcement_variant === "critical" ? "#B0513A" : form.announcement_variant === "warning" ? "#C48F38" : "#1B3B36";
  return (
    <div style={{ backgroundColor: bg, color: "#fff" }} className="px-3 py-2 text-xs">{form.announcement_text}</div>
  );
}

function PreviewHeader({ form }) {
  const [a, b, c] = accentSplit(form.site_name || "", form.site_name_accent || "");
  const accentColor = form.accent_color || "#C48F38";
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
          <div className="font-display text-base text-[#172320]">{a}<span style={{ color: accentColor }}>{b}</span>{c}</div>
          <div className="uppercase-label mt-0.5">{form.tagline}</div>
        </div>
      </div>
    </div>
  );
}

function PreviewHero({ form }) {
  const [a, b, c] = accentSplit(form.hero_headline_2 || "", form.hero_headline_accent || "");
  const accentColor = form.accent_color || "#C48F38";
  return (
    <div className="border border-[#E5E7E5]">
      <div className="uppercase-label bg-[#F2F4F3] px-3 py-1.5">Landing hero</div>
      <div className="p-4">
        <div className="uppercase-label mb-2">{form.hero_eyebrow}</div>
        <div className="font-display text-2xl leading-tight text-[#172320]">
          {form.hero_headline_1}<br/>
          {a}<span style={{ color: accentColor }}>{b}</span>{c}<br/>
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
