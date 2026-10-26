import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

// Optional local Chrome fixture check. This is not ChatGPT/host acceptance or
// authenticated staging: it uses the official bridge with synthetic records.
const playwrightPath = process.env.OFFTASK_PLAYWRIGHT_MODULE;
if (!playwrightPath)
  throw new Error(
    "Set OFFTASK_PLAYWRIGHT_MODULE to an installed playwright/index.mjs."
  );
const { chromium } = await import(playwrightPath);
const root = new URL("../", import.meta.url),
  html = await readFile(new URL("public/plan-widget.html", root));
const fixture = String.raw`
import{AppBridge,PostMessageTransport}from'@modelcontextprotocol/ext-apps/app-bridge';
const id='33333333-3333-4333-8333-333333333333',task='44444444-4444-4444-8444-444444444444';
const data={goal:{id,title:'Synthetic fixture <img src=x onerror=window.__PWNED__=1>',outcome:'A private, explicit implementation workflow',revision:'2',status:'active'},prd:{id:'document',revision:'3'},plan:{id,revision:'1',source_prd_revision:'3',summary:'A synthetic plan, not a real staging record.',items:[{id:'step',title:'Implement private tool workflow'}]},tasks:[{id:task,title:'Implement private tool workflow',status:'ready',work_stage:'ready',execution_target:'codex',revision:'1',eligible:true}]};
const result=value=>({content:[{type:'text',text:JSON.stringify(value)}],structuredContent:{schema_version:'1',fetched_at:new Date().toISOString(),ok:true,data:value}});
const frame=document.getElementById('app');const messages=!location.search.includes('no-message');
const bridge=new AppBridge(null,{name:'Local synthetic fixture',version:'1.0.0'},{serverTools:{},openLinks:{},...(messages?{message:{text:{}}}:{})});
window.fixture={calls:[],messages:[],nextUnauthorized:false,setTheme:theme=>bridge.setHostContext({theme}),stalePlan:()=>{data.plan.requirements_changed=true;return bridge.sendToolResult(result(data));},failure:()=>bridge.sendToolResult({content:[],isError:true,structuredContent:{ok:false,error:{code:'upstream_unavailable',message:'Fixture refresh unavailable'}}}),disconnect:()=>bridge.sendToolResult({content:[],isError:true,structuredContent:{ok:false,error:{code:'unauthenticated',message:'Reconnect fixture'}}})};
bridge.oncalltool=async({name})=>{window.fixture.calls.push(name);if(window.fixture.nextUnauthorized){window.fixture.nextUnauthorized=false;return{content:[],isError:true,structuredContent:{ok:false,error:{code:'unauthenticated',message:'Reconnect fixture'}}};}if(name==='get_task_context')return result({task:{...data.tasks[0],description:'Selected task',acceptance_criteria:['Tests pass; no background execution.']},goal:data.goal,recent_updates:[]});return result(data);};
bridge.onmessage=async value=>{window.fixture.messages.push(value);return{};};bridge.onopenlink=async()=>({});
bridge.oninitialized=async()=>{await bridge.sendToolInput({arguments:{project_id:'11111111-1111-4111-8111-111111111111',goal_id:id}});await bridge.sendToolResult(result(data));};
void bridge.connect(new PostMessageTransport(frame.contentWindow,frame.contentWindow)).then(()=>{frame.src='/widget';});
`;
const built = await build({
  stdin: {
    contents: fixture,
    resolveDir: fileURLToPath(root),
    sourcefile: "widget-host-fixture.ts",
    loader: "ts",
  },
  bundle: true,
  write: false,
  format: "iife",
  target: "es2022",
});
const harness = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font:12px system-ui;background:#eee}p{padding:12px;margin:0}iframe{display:block;width:100%;height:960px;border:0}</style></head><body><p>Local synthetic fixture — not a connected ChatGPT session</p><iframe id="app" title="Offtasks plan fixture"></iframe><script>${built.outputFiles[0].text.replaceAll(
  "</script",
  "<\\/script"
)}</script></body></html>`;
const server = createServer((req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.end(req.url === "/widget" ? html : harness);
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const base = `http://127.0.0.1:${server.address().port}`,
  browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
      viewport: { width: 720, height: 1000 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/*", (route) =>
    route.request().url().startsWith(base) ? route.continue() : route.abort()
  );
  await page.goto(base);
  const frame = page.frameLocator("#app");
  await frame.getByRole("heading", { name: /Synthetic fixture/ }).waitFor();
  assert.equal(await frame.locator("img").count(), 0);
  await frame.getByRole("button", { name: "Refresh", exact: true }).focus();
  assert.equal(
    await frame
      .locator("#refresh")
      .evaluate((n) => getComputedStyle(n).outlineStyle),
    "solid"
  );
  await frame
    .locator("body")
    .screenshot({ path: "/tmp/offtasks-widget-desktop.png" });
  await frame
    .getByRole("button", { name: /Implement private tool workflow/ })
    .click();
  await frame.getByText("Tests pass; no background execution.").waitFor();
  await frame.getByRole("button", { name: "Work on this" }).click();
  await frame
    .getByText("Added to the conversation. No background run was started.")
    .waitFor();
  assert.equal(await page.evaluate(() => window.fixture.messages.length), 1);
  assert.match(
    await page.evaluate(() => window.fixture.messages[0].content[0].text),
    /verify repository access/
  );
  const callsBeforeTheme = await page.evaluate(
    () => window.fixture.calls.length
  );
  await page.evaluate(() => window.fixture.setTheme("dark"));
  await frame
    .getByRole("heading", { name: "Implement private tool workflow" })
    .waitFor();
  assert.equal(await frame.locator("html").getAttribute("data-theme"), "dark");
  assert.equal(
    await page.evaluate(() => window.fixture.calls.length),
    callsBeforeTheme
  );
  await page.setViewportSize({ width: 390, height: 1000 });
  assert.equal(
    await frame.locator("html").evaluate((n) => n.scrollWidth <= n.clientWidth),
    true
  );
  await frame
    .locator("body")
    .screenshot({ path: "/tmp/offtasks-widget-narrow-dark.png" });
  await frame.getByRole("button", { name: "Back to plan" }).click();
  await page.evaluate(() => window.fixture.failure());
  await frame.getByText(/Fixture refresh unavailable/).waitFor();
  assert.equal(
    await frame.getByRole("heading", { name: /Synthetic fixture/ }).count(),
    1
  );
  await page.evaluate(() => (window.fixture.nextUnauthorized = true));
  await frame.getByRole("button", { name: "Refresh", exact: true }).click();
  await frame.getByText("Reconnect fixture").waitFor();
  assert.equal(
    await frame.getByRole("heading", { name: /Synthetic fixture/ }).count(),
    0
  );
  assert.equal(
    await frame
      .getByRole("button", { name: "Refresh", exact: true })
      .isDisabled(),
    false
  );
  await frame.getByRole("button", { name: "Refresh", exact: true }).click();
  await frame.getByRole("heading", { name: /Synthetic fixture/ }).waitFor();
  await page.evaluate(() => window.fixture.stalePlan());
  await frame
    .getByText("Requirements changed. Reconcile this plan before continuing.")
    .waitFor();
  await page.goto(base + "/?no-message");
  await frame.getByRole("heading", { name: /Synthetic fixture/ }).waitFor();
  await frame
    .getByRole("button", { name: /Implement private tool workflow/ })
    .click();
  await frame.getByRole("button", { name: "Work on this" }).click();
  await frame.getByLabel("Copy into your conversation").waitFor();
  assert.match(
    await frame.getByLabel("Copy into your conversation").inputValue(),
    /44444444/
  );
  assert.deepEqual(errors, []);
  assert.ok(
    (await page.evaluate(() => window.fixture.calls)).every((name) =>
      ["get_task_context", "render_plan_widget"].includes(name)
    )
  );
  console.log(
    JSON.stringify({
      surface: "local synthetic MCP Apps bridge fixture",
      chrome: true,
      desktop: true,
      narrowDark: true,
      escapedContent: true,
      keyboardFocus: true,
      messageHandoff: true,
      copyFallback: true,
      disconnectClearsPrivateData: true,
      zeroMutations: true,
      errors,
    })
  );
} finally {
  await browser.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
