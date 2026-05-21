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
const endToEndTestsRoot = path.resolve(repoRoot, 'end-to-end-testing');
const reportsRoot = path.resolve(endToEndTestsRoot, 'reports');
const jsonReportDir = path.resolve(reportsRoot, 'json');
const htmlReportDir = path.resolve(reportsRoot, 'html');
const jsonReportPath = path.resolve(jsonReportDir, 'e2e-run.json');
const htmlReportPath = path.resolve(htmlReportDir, 'index.html');
const supportsColor = process.stdout.isTTY && !process.env.NO_COLOR;

class SessionAbortError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SessionAbortError';
  }
}

const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  white: '\x1b[97m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bgBlue: '\x1b[44m',
  bgCyan: '\x1b[46m',
  bgGray: '\x1b[100m',
};

const style = (value, styleNames) => {
  const names = Array.isArray(styleNames) ? styleNames : [styleNames];
  const sequence = names.map(name => colors[name]).filter(Boolean).join('');

  if (!supportsColor || !sequence) {
    return value;
  }

  return `${sequence}${value}${colors.reset}`;
};

const paint = (value, colorName) => style(value, colorName);
const panel = (value, styleNames = ['bold', 'white', 'bgBlue']) => style(` ${value} `, styleNames);

const icons = {
  feature: '◆',
  prompt: '›',
  passed: '✓',
  failed: '✗',
  skipped: '↷',
  commented: '✎',
  next: '→',
  quit: '■',
  report: '▣',
  info: 'ⓘ',
  tests: '#',
};

const STATUS_META = {
  passed: { label: 'PASS', icon: icons.passed, color: 'green' },
  failed: { label: 'FAIL', icon: icons.failed, color: 'red' },
  skipped: { label: 'SKIP', icon: icons.skipped, color: 'yellow' },
  commented: { label: 'COMMENT', icon: icons.commented, color: 'cyan' },
  next: { label: 'NEXT', icon: icons.next, color: 'gray' },
};

const OUTCOME_ALIASES = {
  p: 'passed',
  pass: 'passed',
  passed: 'passed',
  f: 'failed',
  fail: 'failed',
  failed: 'failed',
  s: 'skipped',
  skip: 'skipped',
  skipped: 'skipped',
  c: 'commented',
  comment: 'commented',
  commented: 'commented',
  n: 'next',
  next: 'next',
  pending: 'commented',
};

const CUCUMBER_STATUS_BY_OUTCOME = {
  passed: 'passed',
  failed: 'failed',
  skipped: 'skipped',
  commented: 'pending',
  next: 'skipped',
};

const FEATURE_CODE_ORDER = [
  'authentication',
  'authentication-validation',
  'auth-validation',
  'task-composer',
  'task-management',
  'quick-view',
  'overview-tabs',
  'advanced-mode',
  'search-and-filters',
  'scheduling-and-categories',
  'statistics',
  'history-and-profile',
  'drawer-preferences',
  'settings',
  'settings-sync',
  'sync-widget-and-persistence',
  'public-site',
  'accessibility-and-resilience',
  'resilience-and-empty-states',
];

const normalizeOutcome = value => {
  if (!value) {
    return null;
  }

  return OUTCOME_ALIASES[String(value).trim().toLowerCase()] ?? null;
};

const formatOutcome = outcome => {
  const meta = STATUS_META[outcome];
  if (!meta) {
    return outcome.toUpperCase();
  }

  return paint(`${meta.icon} ${meta.label}`, meta.color);
};

function printUsage() {
  console.log(`
Usage:
  node end-to-end-testing/scripts/run-e2e-gherkin.mjs list [--platform web|mobile]
  node end-to-end-testing/scripts/run-e2e-gherkin.mjs run [--platform web|mobile] [--feature slug] [--strict]

Examples:
  yarn e2e:test:list
  yarn e2e:test:web
  yarn e2e:test:web authentication
  yarn e2e:test:mobile:feature task-composer
  yarn e2e:test:all
`);
}

function parseArgs(argv) {
  const parsed = {
    command: 'run',
    platform: null,
    feature: null,
    defaultStatus: null,
    strict: false,
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

    if (token === '--strict') {
      parsed.strict = true;
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
    ? [path.join(endToEndTestsRoot, platform, 'features', '*.feature')]
    : [
        path.join(endToEndTestsRoot, 'web', 'features', '*.feature'),
        path.join(endToEndTestsRoot, 'mobile', 'features', '*.feature'),
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

function getFeatureOrderRank(featureDoc) {
  const rank = FEATURE_CODE_ORDER.indexOf(featureDoc.slug);
  return rank === -1 ? FEATURE_CODE_ORDER.length : rank;
}

function sortFeatureDocs(featureDocs) {
  return [...featureDocs].sort((left, right) => {
    const rankDifference = getFeatureOrderRank(left) - getFeatureOrderRank(right);
    if (rankDifference !== 0) {
      return rankDifference;
    }

    const platformDifference = left.platform.localeCompare(right.platform);
    if (platformDifference !== 0) {
      return platformDifference;
    }

    return left.slug.localeCompare(right.slug);
  });
}

function withScenarioCodes(featureDocs) {
  return featureDocs.map((featureDoc, featureIndex) => {
    const featureCode = featureDoc.code ?? String(featureIndex + 1);

    return {
      ...featureDoc,
      code: featureCode,
      scenarios: featureDoc.scenarios.map((scenario, scenarioIndex) => ({
        ...scenario,
        code: scenario.code ?? `${featureCode}.${scenarioIndex + 1}`,
      })),
    };
  });
}

function collectCodeAnnotations(source) {
  const featureCodesByLine = new Map();
  const scenarioCodesByLine = new Map();
  const lines = source.split(/\r?\n/);
  let pendingAnnotation = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const annotationMatch = line.match(/^\s*#\s+(Feature|Scenario)\s+code:\s+(\d+(?:\.\d+)?)\s*$/i);

    if (annotationMatch) {
      pendingAnnotation = {
        kind: annotationMatch[1].toLowerCase(),
        code: annotationMatch[2],
      };
      continue;
    }

    if (pendingAnnotation?.kind === 'feature' && /^\s*Feature:/.test(line)) {
      featureCodesByLine.set(index + 1, pendingAnnotation.code);
      pendingAnnotation = null;
      continue;
    }

    if (pendingAnnotation?.kind === 'scenario' && /^\s*Scenario:/.test(line)) {
      scenarioCodesByLine.set(index + 1, pendingAnnotation.code);
      pendingAnnotation = null;
      continue;
    }

    if (line.trim() && !line.trim().startsWith('@') && !line.trim().startsWith('#')) {
      pendingAnnotation = null;
    }
  }

  return {
    featureCodesByLine,
    scenarioCodesByLine,
  };
}

function parseFeatureFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const codeAnnotations = collectCodeAnnotations(source);
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
        code: codeAnnotations.scenarioCodesByLine.get(scenario.location?.line ?? 0) ?? null,
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
    code: codeAnnotations.featureCodesByLine.get(feature.location?.line ?? 1) ?? null,
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

  return withScenarioCodes(
    sortFeatureDocs(
      matchingFiles.map(item => ({
        ...item,
        ...parseFeatureFile(item.filePath),
      })),
    ),
  );
}

function listFeatures(platform, featureFilter) {
  const featureDocs = collectFeatureDocs(platform, featureFilter);

  if (featureDocs.length === 0) {
    console.log('No matching feature files found.');
    process.exitCode = 1;
    return;
  }

  for (const featureDoc of featureDocs) {
    console.log(`${featureDoc.code} ${featureDoc.platform}/${featureDoc.slug} :: ${featureDoc.name} (${featureDoc.scenarios.length} scenario test(s))`);

    for (const scenario of featureDoc.scenarios) {
      console.log(`  ${scenario.code} ${scenario.name}`);
    }
  }
}

function countScenarios(featureDocs) {
  return featureDocs.reduce((total, featureDoc) => total + featureDoc.scenarios.length, 0);
}

function countSteps(featureDocs) {
  return featureDocs.reduce(
    (total, featureDoc) => total + featureDoc.scenarios.reduce(
      (scenarioTotal, scenario) => scenarioTotal + scenario.steps.length,
      0,
    ),
    0,
  );
}

async function promptForStep(rl, featureDoc, scenario, step, stepIndex, stepCount, scenarioIndex, scenarioCount, defaultStatus) {
  if (defaultStatus) {
    const outcome = normalizeOutcome(defaultStatus);

    return {
      outcome,
      note: `Applied automatically by --default-status=${defaultStatus}.`,
      abort: false,
    };
  }

  const prefix = step.fromBackground ? paint('[background]', 'magenta') : paint('[step]', 'blue');
  const question = panel(
    `Scenario ${scenario.code} • Test ${scenarioIndex}/${scenarioCount} • Step ${stepIndex}/${stepCount} • ${step.keyword} ${step.text}`,
  );
  const controls = [
    `${paint('[Enter]', 'bold')}=next`,
    `${paint('p', 'green')}=pass`,
    `${paint('f', 'red')}=fail`,
    `${paint('s', 'yellow')}=skip`,
    `${paint('c', 'cyan')}=comment`,
    `${paint('q', 'gray')}=quit`,
  ].join(' | ');

  while (true) {
    const answer = (
      await rl.question(
        `${prefix} ${paint(`${stepIndex}/${stepCount}`, 'gray')}\n${question}\n${controls}\n${paint(icons.prompt, 'cyan')} `,
      )
    )
      .trim()
      .toLowerCase();

    if (answer === '') {
      return {
        outcome: 'next',
        note: 'Advanced without recording a result.',
        abort: false,
      };
    }

    if (answer === 'p' || answer === 'pass') {
      return {
        outcome: 'passed',
        note: '',
        abort: false,
      };
    }

    if (answer === 'f' || answer === 'fail') {
      const note = await rl.question('Failure note (optional): ');
      return {
        outcome: 'failed',
        note: note.trim(),
        abort: false,
      };
    }

    if (answer === 's' || answer === 'skip') {
      const note = await rl.question('Skip reason (optional): ');
      return {
        outcome: 'skipped',
        note: note.trim(),
        abort: false,
      };
    }

    if (answer === 'c' || answer === 'comment') {
      const note = await rl.question('Comment (optional): ');
      return {
        outcome: 'commented',
        note: note.trim() || 'Comment added without details.',
        abort: false,
      };
    }

    if (answer === 'q' || answer === 'quit') {
      const note = `End-to-end session aborted in ${featureDoc.slug} / ${scenario.code} ${scenario.name}.`;
      return {
        outcome: 'skipped',
        note,
        abort: true,
      };
    }

    console.log(`${paint(icons.info, 'yellow')} Use Enter, p, f, s, c, or q.`);
  }
}

function toStepResult(step, outcome, note, relativePath) {
  const status = CUCUMBER_STATUS_BY_OUTCOME[outcome] ?? 'skipped';
  const outputNote = outcome === 'commented' ? `Comment: ${note}` : note;
  const result = {
    status,
    duration: 0,
  };

  if (outputNote) {
    result.error_message = outputNote;
  }

  return {
    keyword: `${step.keyword} `,
    name: step.text,
    line: step.line,
    match: {
      location: relativePath,
    },
    result,
    output: outputNote ? [outputNote] : [],
  };
}

function buildScenarioOutcome(stepOutcomes) {
  if (stepOutcomes.includes('failed')) {
    return 'failed';
  }

  if (stepOutcomes.includes('commented')) {
    return 'commented';
  }

  if (stepOutcomes.includes('skipped')) {
    return 'skipped';
  }

  if (stepOutcomes.includes('next')) {
    return 'next';
  }

  return 'passed';
}

function createEmptySummary() {
  return {
    passed: 0,
    failed: 0,
    skipped: 0,
    commented: 0,
    next: 0,
  };
}

function createScenarioElement(featureDoc, scenario, stepResults) {
  return {
    id: `${featureDoc.platform}-${featureDoc.code}-${featureDoc.slug};${scenario.code}-${normalizeSlug(scenario.name)}`,
    keyword: 'Scenario',
    name: `${scenario.code} ${scenario.name}`,
    description: scenario.description,
    line: scenario.line,
    type: 'scenario',
    steps: stepResults,
    tags: scenario.tags.map(tagName => ({ name: tagName })),
  };
}

function createFeatureElement(featureDoc, elements) {
  return {
    uri: featureDoc.relativePath,
    id: `${featureDoc.platform}-${featureDoc.code}-${featureDoc.slug}`,
    keyword: 'Feature',
    name: `${featureDoc.code} ${featureDoc.name}`,
    description: featureDoc.description,
    line: 1,
    tags: featureDoc.tags.map(tagName => ({ name: tagName })),
    elements,
  };
}

function writeReports(summary, featureDocs, cucumberFeatures, options = {}) {
  const jsonPath = writeJsonReport(cucumberFeatures);
  const htmlPath = generateHtmlReport(summary, featureDocs, options);

  return {
    jsonPath,
    htmlPath,
  };
}

async function runE2eSession(featureDocs, defaultStatus, onReportUpdate) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const summary = createEmptySummary();
  const cucumberFeatures = [];
  const totalFeatures = featureDocs.length;
  const totalScenarios = countScenarios(featureDocs);
  const totalSteps = countSteps(featureDocs);
  let scenarioIndex = 0;

  console.log(`${paint(icons.tests, 'cyan')} Running ${totalFeatures} feature file(s), ${totalScenarios} scenario test(s), ${totalSteps} step prompt(s).`);
  if (defaultStatus) {
    console.log(`${paint(icons.info, 'cyan')} Applying ${defaultStatus} automatically to every step.`);
  } else {
    console.log(`${paint(icons.next, 'gray')} Press Enter to move to the next step without recording a result.`);
    console.log(`${paint(icons.passed, 'green')} Use p to pass, ${paint(icons.failed, 'red')} f to fail, ${paint(icons.commented, 'cyan')} c to comment, ${paint(icons.skipped, 'yellow')} s to skip, ${paint(icons.quit, 'gray')} q to save a partial report and quit.`);
    console.log(`${paint(icons.report, 'cyan')} Reports refresh after each completed scenario.`);
  }

  try {
    for (const featureDoc of featureDocs) {
      console.log(`\n${paint(`${icons.feature} ${featureDoc.code} :: ${featureDoc.platform.toUpperCase()} :: ${featureDoc.name}`, 'bold')}`);
      console.log(paint(featureDoc.relativePath, 'gray'));

      const elements = [];
      const featureElement = createFeatureElement(featureDoc, elements);
      cucumberFeatures.push(featureElement);

      for (const scenario of featureDoc.scenarios) {
        scenarioIndex += 1;
        console.log(`\n${panel(`Scenario ${scenario.code} • Test ${scenarioIndex}/${totalScenarios}`, ['bold', 'white', 'bgCyan'])} ${scenario.name}`);
        console.log(`${paint(icons.info, 'gray')} ${scenario.steps.length} step prompt(s) in this scenario.`);
        if (scenario.description) {
          console.log(scenario.description);
        }

        const stepResults = [];
        const stepOutcomes = [];
        let abortNote = null;

        for (let index = 0; index < scenario.steps.length; index += 1) {
          const step = scenario.steps[index];
          const promptResult = await promptForStep(
            rl,
            featureDoc,
            scenario,
            step,
            index + 1,
            scenario.steps.length,
            scenarioIndex,
            totalScenarios,
            defaultStatus,
          );

          stepResults.push(
            toStepResult(
              step,
              promptResult.outcome,
              promptResult.note,
              featureDoc.relativePath,
            ),
          );
          stepOutcomes.push(promptResult.outcome);

          if (promptResult.abort) {
            abortNote = promptResult.note;

            for (let remainingIndex = index + 1; remainingIndex < scenario.steps.length; remainingIndex += 1) {
              stepResults.push(
                toStepResult(
                  scenario.steps[remainingIndex],
                  'skipped',
                  'Skipped after the end-to-end session was aborted.',
                  featureDoc.relativePath,
                ),
              );
              stepOutcomes.push('skipped');
            }

            break;
          }
        }

        const scenarioOutcome = buildScenarioOutcome(stepOutcomes);
        summary[scenarioOutcome] += 1;
        console.log(`${formatOutcome(scenarioOutcome)} [${scenario.code} | ${scenarioIndex}/${totalScenarios}] ${scenario.name}`);

        elements.push(createScenarioElement(featureDoc, scenario, stepResults));

        if (onReportUpdate) {
          onReportUpdate(summary, featureDocs, cucumberFeatures);
        }

        if (abortNote) {
          console.log('Partial report generated before quitting.');
          throw new SessionAbortError(abortNote);
        }
      }
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

function generateHtmlReport(summary, featureDocs, options = {}) {
  resetDir(htmlReportDir);

  const platforms = Array.from(new Set(featureDocs.map(item => item.platform)));
  const featureList = featureDocs.map(item => `${item.code} ${item.platform}/${item.slug}`).join(', ');

  const originalConsoleLog = console.log;

  if (options.silent) {
    console.log = () => undefined;
  }

  try {
    cucumberHtmlReporter.generate({
      theme: 'bootstrap',
      jsonFile: jsonReportPath,
      output: htmlReportPath,
      reportSuiteAsScenarios: true,
      scenarioTimestamp: true,
      launchReport: false,
      name: 'Offtasks End-to-End Test Report',
      brandTitle: 'Offtasks End-to-End Test Report',
      title: 'Offtasks End-to-End Test Report',
      storeScreenshots: false,
      metadata: {
        browser: {
          name: platforms.includes('web') ? 'Interactive browser session' : 'Not applicable',
          version: 'tester supplied',
        },
        device: platforms.includes('mobile')
          ? 'Interactive mobile device or simulator'
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
          { label: 'Commented scenarios', value: String(summary.commented) },
          { label: 'Next/no-result scenarios', value: String(summary.next) },
          { label: 'Generated at', value: new Date().toLocaleString() },
        ],
      },
    });
  } finally {
    console.log = originalConsoleLog;
  }

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
    !normalizeOutcome(args.defaultStatus)
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
  const { summary, cucumberFeatures } = await runE2eSession(
    featureDocs,
    args.defaultStatus,
    (nextSummary, nextFeatureDocs, nextCucumberFeatures) => {
      writeReports(nextSummary, nextFeatureDocs, nextCucumberFeatures, { silent: true });
    },
  );
  const { jsonPath, htmlPath } = writeReports(summary, featureDocs, cucumberFeatures);

  console.log(`\n${paint(`${icons.report} Report generated successfully.`, 'green')}`);
  console.log(`${paint('JSON:', 'bold')} ${path.relative(repoRoot, jsonPath)}`);
  console.log(`${paint('HTML:', 'bold')} ${path.relative(repoRoot, htmlPath)}`);
  console.log(
    `Scenario totals -> passed: ${summary.passed}, failed: ${summary.failed}, skipped: ${summary.skipped}, comments: ${summary.commented}, next: ${summary.next}`,
  );

  if (summary.failed > 0 || summary.commented > 0 || summary.skipped > 0 || summary.next > 0) {
    console.log(
      args.strict
        ? 'Strict mode enabled: returning a non-zero exit code because some scenarios were not passed.'
        : 'Recorded non-passing scenarios in the report. Use --strict to make them fail the command.',
    );
  }

  if (args.strict && (summary.failed > 0 || summary.commented > 0 || summary.skipped > 0 || summary.next > 0)) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});