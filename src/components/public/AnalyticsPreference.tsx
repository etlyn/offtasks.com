import { useState } from 'react';
import { readAnalyticsEnabled,setAnalyticsEnabled,privacySignalActive,analyticsConfigured } from '@/analytics';
export function AnalyticsPreference(){
 const [enabled,setEnabled]=useState(readAnalyticsEnabled);
 const blocked=privacySignalActive();
 if(!analyticsConfigured)return null;
 return <section className="my-6 rounded-2xl border border-[#d9ece6] bg-white p-5 text-sm">
  <label className="flex items-center gap-3"><input type="checkbox" checked={enabled && !blocked} disabled={blocked} onChange={e=>{setEnabled(e.target.checked);setAnalyticsEnabled(e.target.checked);}}/>Allow public website usage analytics</label>
  <p className="mt-2 text-[#64748b]">We measure public page visits, selected links and confirmed contact submissions without analytics cookies. Task content, account screens and form values are excluded. Your preference stays in this browser.{blocked ? ' Your browser privacy signal currently prevents collection.' : ''}</p>
 </section>;
}
