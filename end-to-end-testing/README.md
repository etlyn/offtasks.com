## End-to-End Gherkin Testing

This directory keeps the end-to-end test plan in Gherkin so web and mobile coverage stay readable and easy to run. The runner is still interactive, which makes it useful for manual release checks across browser sessions, simulators, and physical devices.

### Structure

- `web/features/` contains browser-focused feature files.
- `mobile/features/` contains React Native feature files.
- `scripts/run-e2e-gherkin.mjs` runs an interactive session in the terminal, writes cucumber JSON, and builds the HTML report with `cucumber-html-reporter`.
- `scripts/open-report.mjs` opens the latest generated HTML report.
- `scripts/preview-report.mjs` serves the generated report locally for browser preview.
- `COVERAGE.md` maps app capabilities to the feature files that cover them.

### How It Works

1. Pick a platform or a single feature file.
2. Each feature file stores searchable code comments, such as `# Feature code: 1` and `# Scenario code: 1.1`, directly above the matching Gherkin lines.
3. The runner shows the total feature, scenario test, and step counts before walking each scenario.
4. Each prompt shows the scenario code, current test number, total test count, and step count.
5. Press Enter to move to the next step without recording a result, or mark each step as passed, failed, skipped, or commented.
6. The runner writes cucumber-compatible JSON into `end-to-end-testing/reports/json/` after each completed scenario.
7. The HTML report is generated in `end-to-end-testing/reports/html/` after each completed scenario.

### Useful Commands

- `yarn e2e:test:list`
- `yarn e2e:test:all`
- `yarn e2e:test:web`
- `yarn e2e:test:web:feature authentication`
- `yarn e2e:test:mobile`
- `yarn e2e:test:mobile:feature drawer-preferences`
- `yarn e2e:report:open`
- `yarn e2e:report:preview`

The old `manual:*` commands remain as aliases for local habits and CI notes that still reference them.

You can also pass a feature filter to the broad scripts:

```bash
yarn e2e:test:web task-management
yarn e2e:test:mobile statistics
```

### Report Notes

- Each run rewrites `end-to-end-testing/reports/json/e2e-run.json` and `end-to-end-testing/reports/html/index.html` so the latest report is always the one you preview.
- Feature and scenario codes are included in the terminal, JSON, and HTML report names. Auth-related features are ordered first so the auth flow starts at code `1` for each platform.
- Search for a scenario code such as `1.1` in VS Code to jump to the corresponding `# Scenario code:` comment above the scenario.
- For a live report, run `yarn e2e:report:preview` in one terminal and keep it open at `http://localhost:4180`, then run `yarn e2e:test:*` in another terminal. The browser refreshes automatically after each completed scenario.
- The live preview can start before the first report exists; it shows a waiting page until the runner generates report data.
- Failed, skipped, commented, and next/no-result scenarios are recorded in the report but do not fail the interactive command by default.
- Add `--strict` when you want non-passing scenarios to return a non-zero exit code, such as in CI or release gating.
- If you need to stop mid-run, use `q` at a step prompt. The current and remaining uncompleted steps are marked skipped, and a partial report is written before the runner exits.
- Step controls are `Enter=next`, `p=pass`, `f=fail`, `s=skip`, `c=comment`, and `q=quit`.
- Step questions use background color highlighting in terminals that support ANSI colors. Set `NO_COLOR=1` to disable terminal styling.
- Comments are counted separately in the run summary and are stored in cucumber-compatible JSON as pending steps with comment output.
- `yarn e2e:test:list` lists the coded feature and scenario map and does not update reports.
- Use `yarn e2e:report:open` to open the static HTML file directly.
- Use `yarn e2e:report:preview` to serve the report locally at `http://localhost:4180`.

### Authoring Notes

- Keep one user-facing capability per feature file.
- Prefer scenario names that describe the outcome being checked.
- Use app terminology that already exists in the UI, such as `Today`, `Later`, `Statistics`, and `Hide Completed Tasks`.
- Keep steps concrete enough that a tester can execute them without reading the source.
