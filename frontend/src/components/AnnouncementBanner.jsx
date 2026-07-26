import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Info, AlertTriangle, AlertOctagon } from "lucide-react";

const VARIANTS = {
  info:     { bg: "#1B3B36", fg: "#FFFFFF", Icon: Info },
  warning:  { bg: "#C48F38", fg: "#FFFFFF", Icon: AlertTriangle },
  critical: { bg: "#B0513A", fg: "#FFFFFF", Icon: AlertOctagon },
};

export function AnnouncementBanner() {
  const { settings } = useAuth();
  if (!settings?.announcement_enabled) return null;
  const text = settings.announcement_text;
  if (!text || !String(text).trim()) return null;
  const variant = VARIANTS[settings.announcement_variant] || VARIANTS.info;
  const { Icon } = variant;
  return (
    <div style={{ backgroundColor: variant.bg, color: variant.fg }} data-testid="announcement-banner">
      <div className="max-w-[1400px] mx-auto px-6 py-2.5 flex items-center gap-3">
        <Icon className="w-4 h-4 shrink-0" />
        <div className="text-sm">{text}</div>
      </div>
    </div>
  );
}
