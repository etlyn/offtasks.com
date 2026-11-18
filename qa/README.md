# Offtasks Web acceptance suites

This product owns and maintains [manifest.json](manifest.json), the read-only
acceptance asset imported by the standalone E2E website. It currently contains
12 suites and 67 cases. The November 2026 planner redesign rewrote it around
Calendar, Later, Notes, Goals, search and the account panel; cases for the retired
Today/Tomorrow/Later board, Advanced Mode, categories, the history sheet and the
settings sheet were removed, and cases whose purpose is unchanged kept their IDs.

When product behavior changes, update this manifest in the same pull request.
Keep app, suite, and case IDs stable; change an ID only for a new identity.
Use the common [Etlyn manifest schema](https://e2e.etlyn.com/schema/manifest.schema.json).
Do not store credentials, real customer data or executable scripts in manifests.

An E2E admin registers app ID `offtasks-web`, platform `web`, repository
`etlyn/offtasks.com`, branch `main`, path `qa/manifest.json`, then chooses
**Import latest**. The importer pins the branch to a commit and preserves older
runs. A local uncommitted change is not available to GitHub imports.

The original Gherkin files remain under `legacy/offtasks/web/features` for historical
reference only: they describe the board that the redesign replaced. The JSON
manifest is authoritative for online testing. The optional
legacy runner can use `E2E_ROOT` set to this repository's `qa/legacy` directory.
Online run results live in E2E, never in this source repo.
