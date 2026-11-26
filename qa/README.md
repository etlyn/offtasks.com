# Offtasks Web acceptance suites

This product owns and maintains [manifest.json](manifest.json), the read-only
acceptance asset imported by the standalone E2E website. It currently contains
13 suites and 73 cases. The November 2026 planner redesign covers Board,
Calendar, Tags, Notes, Goals, search and the account panel. The Board cases cover
scheduling across Today, Tomorrow and Later and keep the existing Calendar and
Later case IDs.

When product behavior changes, update this manifest in the same pull request.
Keep app, suite, and case IDs stable; change an ID only for a new identity.
Use the common [Etlyn manifest schema](https://e2e.etlyn.com/schema/manifest.schema.json).
Do not store credentials, real customer data or executable scripts in manifests.

An E2E admin registers app ID `offtasks-web`, platform `web`, repository
`etlyn/offtasks.com`, branch `main`, path `qa/manifest.json`, then chooses
**Import latest**. The importer pins the branch to a commit and preserves older
runs. A local uncommitted change is not available to GitHub imports.

The original Gherkin files remain under `legacy/offtasks/web/features` for historical
reference and describe the earlier web planner. The JSON
manifest is authoritative for online testing. The optional
legacy runner can use `E2E_ROOT` set to this repository's `qa/legacy` directory.
Online run results live in E2E, never in this source repo.
