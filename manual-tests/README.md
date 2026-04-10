## Manual Gherkin Testing

This directory keeps the manual test plan in Gherkin so web and mobile coverage stay readable and easy to run.

### Structure

- `web/features/` contains browser-focused feature files.
- `mobile/features/` contains React Native feature files.
- `scripts/run-manual-gherkin.mjs` runs a manual session in the terminal, writes cucumber JSON, and builds the HTML report with `cucumber-html-reporter`.
- `scripts/open-report.mjs` opens the latest generated HTML report.
- `scripts/preview-report.mjs` serves the generated report locally for browser preview.

### How It Works

1. Pick a platform or a single feature file.
2. The runner walks every scenario step in the terminal.
3. Mark each step as passed, failed, skipped, or pending.
4. The runner writes cucumber-compatible JSON into `manual-tests/reports/json/`.
5. The HTML report is generated in `manual-tests/reports/html/`.

### Useful Commands

- `yarn manual:test:list`
- `yarn manual:test:all`
- `yarn manual:test:web`
- `yarn manual:test:web:feature authentication`
- `yarn manual:test:mobile`
- `yarn manual:test:mobile:feature drawer-preferences`
- `yarn manual:report:open`
- `yarn manual:report:preview`

You can also pass a feature filter to the broad scripts:

```bash
yarn manual:test:web task-management
yarn manual:test:mobile statistics
```

### Report Notes

- Each run rewrites `manual-tests/reports/json/manual-run.json` and `manual-tests/reports/html/index.html` so the latest report is always the one you preview.
- Use `yarn manual:report:open` to open the static HTML file directly.
- Use `yarn manual:report:preview` to serve the report locally at `http://localhost:4180`.

### Authoring Notes

- Keep one user-facing capability per feature file.
- Prefer scenario names that describe the outcome being checked.
- Use app terminology that already exists in the UI, such as `Today`, `Later`, `Statistics`, and `Hide Completed Tasks`.
- Keep steps concrete enough that a tester can execute them without reading the source.
