import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { Parser, AstBuilder, GherkinClassicTokenMatcher } from '@cucumber/gherkin';
import { IdGenerator } from '@cucumber/messages';
import cucumberHtmlReporter from 'cucumber-html-reporter';
import { globSync } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const manualTestsRoot = path.resolve(repoRoot, 'manual-tests');
const reportsRoot = path.resolve(manualTestsRoot, 'reports');
const jsonReportDir = path.resolve(reportsRoot, 'json');
const htmlReportDir = path.resolve(reportsRoot, 'html');
const jsonReportPath = path.resolve(jsonReportDir, 'manual-run.json');
const htmlReportPath = path.resolve(htmlReportDir, 'index.html');

const STATUS_META = {
  passed: { symbol: 'PASS', summaryKey: 'passed' },
  failed: { symbol: 'FAIL', summaryKey: 'failed' },
  skipped: { symbol: 'SKIP', summaryKey: 'skipped' },
  pending: { symbol: 'PEND', summaryKey: 'pending' },
};

function printUsage() {
  console.log(`
Usage:
  node manual-tests/scripts/run-manual-gherkin.mjs list [--platform web|mobile]
  node manual-tests/scripts/run-manual-gherkin.mjs run [--platform web|mobile] [--feature slug]

Examples:
  yarn manual:test:list
  yarn manual:test:web
  yarn manual:test:web authentication
  yarn manual:test:mobile:feature task-composer
  yarn manual:test:all
`);
}

function parseArgs(argv) {
  const parsed = {
    command: 'run',
    platform: null,
    feature: null,
    defaultStatus: null,
    help: false,
  };

  const tokens = [...argv];
  if (tokens[0] && !tokens[0].startsWith('-')) {
    parsed.command = tokens.shift();
  }

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token === '--help' || token === '-h') {
      parsed.help = true;
      continue;
    }

    if (token === '--platform') {
      parsed.platform = tokens[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (token.startsWith('--platform=')) {
      parsed.platform = token.slice('--platform='.length);
      continue;
    }

    if (token === '--feature') {
      const nextToken = tokens[index + 1];
      if (nextToken && !nextToken.startsWith('-')) {
        parsed.feature = nextToken;
        index += 1;
      }
      continue;
    }

    if (token.startsWith('--feature=')) {
      parsed.feature = token.slice('--feature='.length);
      continue;
    }

    if (token === '--default-status') {
      parsed.defaultStatus = tokens[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (token.startsWith('--default-status=')) {
      parsed.defaultStatus = token.slice('--default-status='.length);
      continue;
    }

    if (!token.startsWith('-') && !parsed.feature) {
      parsed.feature = token;
    }
  }

  return parsed;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function resetDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
  ensureDir(dirPath);
}

function normalizeSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\.feature$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getFeatureFiles(platform) {
  const patterns = platform
    ? [path.join(manualTestsRoot, platform, 'features', '*.feature')]
    : [
        path.join(manualTestsRoot, 'web', 'features', '*.feature'),
        path.join(manualTestsRoot, 'mobile', 'features', '*.feature'),
      ];

  return patterns
    .flatMap(pattern => globSync(pattern).sort())
    .map(filePath => {
      const relativePath = path.relative(repoRoot, filePath);
      const inferredPlatform = relativePath.split(path.sep)[1];
      const slug = normalizeSlug(path.basename(filePath, '.feature'));
      return {
        filePath,
        relativePath,
        platform: inferredPlatform,
        slug,
      };
    });
}

function parseFeatureFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const parser = new Parser(
    new AstBuilder(IdGenerator.uuid()),
    new GherkinClassicTokenMatcher(),
  );
  const document = parser.parse(source);
  const feature = document.feature;

  if (!feature) {
    throw new Error(`No feature block found in ${filePath}`);
  }

  const backgroundSteps = [];
  const scenarios = [];

  for (const child of feature.children ?? []) {
    if (child.background) {
      backgroundSteps.push(
        ...child.background.steps.map(step => ({
          id: step.id,
          keyword: step.keyword.trim(),
          text: step.text,
          line: step.location?.line ?? 0,
          fromBackground: true,
        })),
      );
    }

    if (child.scenario) {
      const scenario = child.scenario;
      scenarios.push({
        id: scenario.id,
        name: scenario.name,
        description: (scenario.description ?? '').trim(),
        line: scenario.location?.line ?? 0,
        tags: (scenario.tags ?? []).map(tag => tag.name),
        steps: [
          ...backgroundSteps,
          ...scenario.steps.map(step => ({
            id: step.id,
            keyword: step.keyword.trim(),
            text: step.text,
            line: step.location?.line ?? 0,
            fromBackground: false,
          })),
        ],
      });
    }
  }

  return {
    name: feature.name,
    description: (feature.description ?? '').trim(),
    tags: (feature.tags ?? []).map(tag => tag.name),
    scenarios,
  };
}

function collectFeatureDocs(platform, featureFilter) {
  const allFiles = getFeatureFiles(platform);
  const normalizedFilter = featureFilter ? normalizeSlug(featureFilter) : null;
  const matchingFiles = normalizedFilter
    ? allFiles.filter(item => item.slug.includes(normalizedFilter))
    : allFiles;

  return matchingFiles.map(item => ({
    ...item,
    ...parseFeatureFile(item.filePath),
  }));
}

function listFeatures(platform, featureFilter) {
  const featureDocs = collectFeatureDocs(platform, featureFilter);

  if (featureDocs.length === 0) {
    console.log('No matching feature files found.');
    process.exitCode = 1;
    return;
  }

  for (const featureDoc of featureDocs) {
    console.log(`${featureDoc.platform}/${featureDoc.slug} :: ${featureDoc.name}`);
  }
}

async function promptForStep(rl, featureDoc, scenario, step, stepIndex, stepCount, defaultStatus) {
  if (defaultStatus) {
    return {
      status: defaultStatus,
      note: 'Applied automatically by --default-status.',
    };
  }

  const prefix = step.fromBackground ? '[background]' : '[step]';

  while (true) {
    const answer = (
      await rl.question(
        `${prefix} ${stepIndex}/${stepCount} ${step.keyword} ${step.text}\n[Enter]=pass | f=fail | s=skip | p=pending | q=quit\n> `,
      )
    )
      .trim()
      .toLowerCase();

    if (answer === '' || answer === 'p' || answer === 'pass') {
      return {
        status: 'passed',
        note: '',
      };
    }

    if (answer === 'f' || answer === 'fail') {
      const note = await rl.question('Failure note (optional): ');
      return {
        status: 'failed',
        note: note.trim(),
      };
    }

    if (answer === 's' || answer === 'skip') {
      const note = await rl.question('Skip reason (optional): ');
      return {
        status: 'skipped',
        note: note.trim(),
      };
    }

    if (answer === 'pending' || answer === 'n') {
      const note = await rl.question('Pending note (optional): ');
      return {
        status: 'pending',
        note: note.trim(),
      };
    }

    if (answer === 'q' || answer === 'quit') {
      const reason = await rl.question('Abort note (optional): ');
      throw new Error(`Manual session aborted in ${featureDoc.slug} / ${scenario.name}. ${reason.trim()}`.trim());
    }

    console.log('Use Enter, f, s, p, or q.');
  }
}

function toStepResult(step, status, note, relativePath) {
  const result = {
    status,
    duration: 0,
  };

  if (note) {
    result.error_message = note;
  }

  return {
    keyword: `${step.keyword} `,
    name: step.text,
    line: step.line,
    match: {
      location: relativePath,
    },
    result,
    output: note ? [note] : [],
  };
}

function buildScenarioStatus(stepResults) {
  if (stepResults.some(step => step.result.status === 'failed')) {
    return 'failed';
  }

  if (stepResults.some(step => step.result.status === 'pending')) {
    return 'pending';
  }

  if (stepResults.some(step => step.result.status === 'skipped')) {
    return 'skipped';
  }

  return 'passed';
}

function createEmptySummary() {
  return {
    passed: 0,
    failed: 0,
    skipped: 0,
    pending: 0,
  };
}

async function runManualSession(featureDocs, defaultStatus) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const summary = createEmptySummary();
  const cucumberFeatures = [];

  console.log(`Running ${featureDocs.length} manual feature file(s).`);
  if (defaultStatus) {
    console.log(`Applying ${defaultStatus} automatically to every step.`);
  } else {
    console.log('Press Enter after completing a step to mark it passed.');
  }

  try {
    for (const featureDoc of featureDocs) {
      console.log(`\n=== ${featureDoc.platform.toUpperCase()} :: ${featureDoc.name} ===`);
      console.log(featureDoc.relativePath);

      const elements = [];

      for (const scenario of featureDoc.scenarios) {
        console.log(`\nScenario: ${scenario.name}`);
        if (scenario.description) {
          console.log(scenario.description);
        }

        const stepResults = [];

        for (let index = 0; index < scenario.steps.length; index += 1) {
          const step = scenario.steps[index];
          const promptResult = await promptForStep(
            rl,
            featureDoc,
            scenario,
            step,
            index + 1,
            scenario.steps.length,
            defaultStatus,
          );

          stepResults.push(
            toStepResult(
              step,
              promptResult.status,
              promptResult.note,
              featureDoc.relativePath,
            ),
          );
        }

        const scenarioStatus = buildScenarioStatus(stepResults);
        summary[scenarioStatus] += 1;
        console.log(`${STATUS_META[scenarioStatus].symbol} ${scenario.name}`);

        elements.push({
          id: `${featureDoc.slug};${normalizeSlug(scenario.name)}`,
          keyword: 'Scenario',
          name: scenario.name,
          description: scenario.description,
          line: scenario.line,
          type: 'scenario',
          steps: stepResults,
          tags: scenario.tags.map(tagName => ({ name: tagName })),
        });
      }

      cucumberFeatures.push({
        uri: featureDoc.relativePath,
        id: featureDoc.slug,
        keyword: 'Feature',
        name: featureDoc.name,
        description: featureDoc.description,
        line: 1,
        tags: featureDoc.tags.map(tagName => ({ name: tagName })),
        elements,
      });
    }
  } finally {
    rl.close();
  }

  return {
    summary,
    cucumberFeatures,
  };
}

function writeJsonReport(cucumberFeatures) {
  resetDir(jsonReportDir);
  fs.writeFileSync(jsonReportPath, JSON.stringify(cucumberFeatures, null, 2));
  return jsonReportPath;
}

function generateHtmlReport(summary, featureDocs) {
  resetDir(htmlReportDir);

  const platforms = Array.from(new Set(featureDocs.map(item => item.platform)));
  const featureList = featureDocs.map(item => `${item.platform}/${item.slug}`).join(', ');

  cucumberHtmlReporter.generate({
    theme: 'bootstrap',
    jsonFile: jsonReportPath,
    output: htmlReportPath,
    reportSuiteAsScenarios: true,
    scenarioTimestamp: true,
    launchReport: false,
    name: 'Offtasks Manual Test Report',
    brandTitle: 'Offtasks Manual Test Report',
    title: 'Offtasks Manual Test Report',
    storeScreenshots: false,
    metadata: {
      browser: {
        name: platforms.includes('web') ? 'Manual browser session' : 'Not applicable',
        version: 'tester supplied',
      },
      device: platforms.includes('mobile')
        ? 'Manual mobile device or simulator'
        : 'Desktop browser',
      platform: {
        name: platforms.join(', '),
        version: process.platform,
      },
    },
    customData: {
      title: 'Run summary',
      data: [
        { label: 'Platforms', value: platforms.join(', ') },
        { label: 'Features', value: featureList },
        { label: 'Passed scenarios', value: String(summary.passed) },
        { label: 'Failed scenarios', value: String(summary.failed) },
        { label: 'Skipped scenarios', value: String(summary.skipped) },
        { label: 'Pending scenarios', value: String(summary.pending) },
        { label: 'Generated at', value: new Date().toLocaleString() },
      ],
    },
  });

  return htmlReportPath;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    return;
  }

  if (args.platform && !['web', 'mobile'].includes(args.platform)) {
    throw new Error(`Unsupported platform: ${args.platform}`);
  }

  if (
    args.defaultStatus &&
    !['passed', 'failed', 'skipped', 'pending'].includes(args.defaultStatus)
  ) {
    throw new Error(`Unsupported default status: ${args.defaultStatus}`);
  }

  if (args.command === 'list') {
    listFeatures(args.platform, args.feature);
    return;
  }

  if (args.command !== 'run') {
    throw new Error(`Unsupported command: ${args.command}`);
  }

  const featureDocs = collectFeatureDocs(args.platform, args.feature);
  if (featureDocs.length === 0) {
    throw new Error('No matching feature files found.');
  }

  ensureDir(reportsRoot);
  const { summary, cucumberFeatures } = await runManualSession(
    featureDocs,
    args.defaultStatus,
  );
  const jsonPath = writeJsonReport(cucumberFeatures);
  const htmlPath = generateHtmlReport(summary, featureDocs);

  console.log('\nReport generated successfully.');
  console.log(`JSON: ${path.relative(repoRoot, jsonPath)}`);
  console.log(`HTML: ${path.relative(repoRoot, htmlPath)}`);
  console.log(
    `Scenario totals -> passed: ${summary.passed}, failed: ${summary.failed}, skipped: ${summary.skipped}, pending: ${summary.pending}`,
  );

  if (summary.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});