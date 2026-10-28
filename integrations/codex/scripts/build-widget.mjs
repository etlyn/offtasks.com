import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = new URL("../", import.meta.url);
const result = await build({
  entryPoints: [fileURLToPath(new URL("src/widget-app.ts", root))],
  bundle: true,
  write: false,
  format: "iife",
  target: "es2022",
  minify: true,
});
const script = result.outputFiles[0].text.replaceAll("</script", "<\\/script");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Offtasks plan</title><style>
:root{color-scheme:light dark;--bg:#fff;--text:#0f172a;--secondary:#4b5563;--accent:#152d25;--edge:rgba(21,45,37,.10);--soft:rgba(21,45,37,.04)}
@media(prefers-color-scheme:dark){:root{--bg:#101916;--text:#f4f6fb;--secondary:#b5c1bb;--accent:#d8f3e5;--edge:rgba(216,243,229,.15);--soft:rgba(216,243,229,.06)}}
:root[data-theme=light]{--bg:#fff;--text:#0f172a;--secondary:#4b5563;--accent:#152d25;--edge:rgba(21,45,37,.10);--soft:rgba(21,45,37,.04)}
:root[data-theme=dark]{--bg:#101916;--text:#f4f6fb;--secondary:#b5c1bb;--accent:#d8f3e5;--edge:rgba(216,243,229,.15);--soft:rgba(216,243,229,.06)}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 -apple-system,BlinkMacSystemFont,Inter,system-ui,sans-serif}main{padding:20px;max-width:720px;margin:0 auto}header,.row,.actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}header{justify-content:space-between}h1{font-size:20px;line-height:1.4;margin:0;font-weight:600}h2{font-size:16px;font-weight:500;margin:0 0 8px}h3{font-size:14px;font-weight:500;margin:0}p{margin:8px 0;white-space:pre-wrap;overflow-wrap:anywhere}small,.muted{font-size:12px;color:var(--secondary)}section{margin-top:20px}button,select,textarea{font:inherit;color:inherit;border:1px solid var(--edge);border-radius:12px;background:var(--soft);min-height:44px;max-width:100%;padding:8px 12px;transition:background-color .24s ease-in-out,opacity .24s ease-in-out}button{cursor:pointer}button:hover{background:var(--edge)}button:focus-visible,select:focus-visible,textarea:focus-visible{outline:2px solid var(--accent);outline-offset:2px}button:disabled{opacity:.5;cursor:default}.link{background:none;border:none;color:var(--accent);padding-left:0;padding-right:0}.task{display:block;text-align:left;border:0;border-radius:0;border-bottom:1px solid var(--edge);background:none;width:100%;padding:12px 0}.badge{display:inline-block;font-size:12px;color:var(--secondary);border:1px solid var(--edge);border-radius:6px;padding:1px 6px;margin:4px 6px 4px 0}.notice{background:var(--soft);border-radius:12px;padding:12px}ol,ul{padding-left:22px}li{margin:8px 0;overflow-wrap:anywhere}textarea{display:block;width:100%;min-height:92px;font-size:16px}#status{min-height:18px}details{margin-top:8px}summary{cursor:pointer;min-height:44px;display:flex;align-items:center}a{color:var(--accent)}@media(max-width:380px){main{padding:16px}.actions{gap:8px}header>.actions{width:100%}}@media(prefers-reduced-motion:reduce){*{transition:none!important}}
</style></head><body><main><header><h1>offtasks.</h1><div class="actions"><button id="refresh" type="button">Refresh</button><button id="open" type="button" class="link">Open in Offtasks</button></div></header><p id="status" class="muted" role="status" aria-live="polite">Connecting to Offtasks…</p><div id="content"></div><section id="handoff" hidden><label for="instruction">Copy into your conversation</label><textarea id="instruction" readonly></textarea></section></main><script>${script}</script></body></html>`;
await mkdir(new URL("public/", root), { recursive: true });
await writeFile(new URL("public/plan-widget.html", root), html);

const tasksResult = await build({
  entryPoints: [fileURLToPath(new URL("src/tasks-widget-app.ts", root))],
  bundle: true,
  write: false,
  format: "iife",
  target: "es2022",
  minify: true,
});
const tasksScript = tasksResult.outputFiles[0].text.replaceAll("</script", "<\\/script");
const tasksHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Offtasks tasks</title><style>
:root{color-scheme:light dark;--bg:#fff;--text:#171e1a;--secondary:#65736b;--accent:#285a43;--accent-contrast:#fff;--edge:rgba(26,48,37,.11);--soft:rgba(26,48,37,.055)}
@media(prefers-color-scheme:dark){:root{--bg:#121815;--text:#f0f4f1;--secondary:#a3b1a8;--accent:#a8d7bb;--accent-contrast:#14251b;--edge:rgba(226,242,231,.14);--soft:rgba(226,242,231,.07)}}
:root[data-theme=light]{--bg:#fff;--text:#171e1a;--secondary:#65736b;--accent:#285a43;--accent-contrast:#fff;--edge:rgba(26,48,37,.11);--soft:rgba(26,48,37,.055)}
:root[data-theme=dark]{--bg:#121815;--text:#f0f4f1;--secondary:#a3b1a8;--accent:#a8d7bb;--accent-contrast:#14251b;--edge:rgba(226,242,231,.14);--soft:rgba(226,242,231,.07)}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.45 -apple-system,BlinkMacSystemFont,Inter,system-ui,sans-serif}main{max-width:720px;padding:16px 20px;margin:0 auto}header{display:flex;align-items:center;justify-content:space-between;gap:12px}h1{font-size:17px;letter-spacing:-.35px;line-height:1.3;font-weight:650;margin:0}h1 span{color:var(--accent)}h2{font-size:14px;font-weight:600;margin:18px 0 2px}button,textarea{font:inherit}button{color:inherit;cursor:pointer;min-height:44px;border:0;background:transparent;border-radius:11px;transition:background-color .25s ease-in-out,opacity .25s ease-in-out}button:focus-visible,textarea:focus-visible{outline:2px solid var(--accent);outline-offset:2px}button:disabled{opacity:.45;cursor:default}.refresh{color:var(--secondary);padding:0 7px}.task-list{list-style:none;padding:0;margin:0}.task{display:flex;align-items:flex-start;gap:12px;min-height:56px;padding:12px 0;border-bottom:1px solid var(--edge)}.check{flex:none;margin-top:2px;width:18px;height:18px;border:1.5px solid var(--accent);border-radius:5px}.check.done{background:var(--accent);color:var(--accent-contrast);font-size:13px;line-height:15px;text-align:center}.detail{display:flex;min-width:0;flex-direction:column;gap:2px}.title{overflow-wrap:anywhere;font-weight:500}.title.complete{color:var(--secondary);text-decoration:line-through}.meta,.empty,#status{font-size:12px;color:var(--secondary)}.empty{padding:8px 0}.more{padding:0;color:var(--accent)}.actions{display:flex;justify-content:flex-start;margin-top:12px}.plan{padding:0 14px;background:var(--soft);font-weight:600;color:var(--accent)}#status:not(:empty){margin:8px 0 0}#handoff{margin-top:12px;font-size:12px;color:var(--secondary)}textarea{display:block;margin-top:6px;width:100%;min-height:88px;padding:10px;border:1px solid var(--edge);border-radius:10px;color:var(--text);background:var(--soft)}@media(max-width:380px){main{padding:14px 16px}}@media(prefers-reduced-motion:reduce){*{transition:none!important}}
</style></head><body><main><header><h1>offtasks<span>.</span></h1><button id="refresh" class="refresh" type="button" aria-label="Refresh tasks" disabled>Refresh</button></header><h2>Your tasks</h2><p id="status" role="status" aria-live="polite">Loading tasks…</p><div id="tasks"></div><div class="actions"><button id="plan" class="plan" type="button" disabled>Plan with ChatGPT</button></div><section id="handoff" hidden><label for="instruction">Copy into your conversation</label><textarea id="instruction" readonly></textarea></section></main><script>${tasksScript}</script></body></html>`;
await writeFile(new URL("public/tasks-widget.html", root), tasksHtml);
