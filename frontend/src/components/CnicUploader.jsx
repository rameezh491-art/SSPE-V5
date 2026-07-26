import React, { useRef, useState } from "react";

/**
 * Uploads an image and returns a base64 data URL via onChange.
 * Props: value (data url), onChange(dataUrl), maxKB, label, testId
 */
export default function CnicUploader({ value, onChange, maxKB = 400, label = "ID card", testId = "cnic-upload" }) {
  const fileRef = useRef(null);
  const [error, setError] = useState("");

  const onFile = async (e) => {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxKB * 1024) { setError(`Image must be under ${maxKB} KB.`); return; }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <div className="flex items-start gap-4">
        <div className="w-28 h-20 border border-[#E5E7E5] bg-[#FAFAFA] flex items-center justify-center overflow-hidden">
          {value ? (
            <img src={value} alt={`${label} preview`} className="w-full h-full object-cover" data-testid={`${testId}-preview`}/>
          ) : (
            <div className="text-[10px] uppercase tracking-widest text-[#5C6D68]">No file</div>
          )}
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <button type="button" onClick={()=>fileRef.current?.click()} className="btn-outline-pine rounded-none px-4 py-2 text-sm font-semibold self-start" data-testid={`${testId}-btn`}>
            {value ? `Replace ${label}` : `Upload ${label}`}
          </button>
          <div className="text-xs text-[#5C6D68]">JPG or PNG · under {maxKB} KB · required.</div>
          {value && <button type="button" onClick={()=>onChange("")} className="text-xs text-[#B0513A] underline self-start" data-testid={`${testId}-clear`}>Remove</button>}
          {error && <div className="text-xs text-[#B0513A]">{error}</div>}
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="sr-only"/>
        </div>
      </div>
    </div>
  );
}
