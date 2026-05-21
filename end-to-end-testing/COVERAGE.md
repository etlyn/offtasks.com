# End-to-End Coverage Report

Updated: May 21, 2026

## Summary

The end-to-end Gherkin suite now contains 22 feature files and 109 scenarios.

| Platform | Feature files | Scenarios | Coverage focus                                                                                                                                    |
| -------- | ------------: | --------: | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web      |            11 |        59 | Public site, auth, account deletion, dashboard, tasks, scheduling, categories, preferences, statistics, settings, sync, accessibility, resilience |
| Mobile   |            11 |        50 | Auth, account deletion, drawer, overview tabs, composer, scheduling, categories, search, statistics, persistence, widget bridge, loading, errors  |

## Source Surfaces Reviewed

| Platform | Source areas scanned                                                                                                                                                                      |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web      | `src/App.tsx`, `src/screens/*`, `src/components/*`, `src/components/public/*`, `src/lib/supabase.ts`, `src/utils/*`                                                                       |
| Mobile   | `mobile/App.tsx`, `mobile/src/navigation/*`, `mobile/src/features/*`, `mobile/src/components/*`, `mobile/src/providers/*`, `mobile/src/lib/*`, `mobile/src/hooks/*`, `mobile/src/utils/*` |

## Web Coverage Map

| Capability                                                                                                             | Covered by                                                                             |
| ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Public landing page, public calls to action, authenticated landing behavior                                            | `web/features/public-site.feature`                                                     |
| Privacy, terms, support, contact, contact validation, contact submit states, unknown-route fallback                    | `web/features/public-site.feature`                                                     |
| Login, signup without email confirmation, account deletion, forgot password, reset password happy paths                | `web/features/authentication.feature`                                                  |
| Auth form validation, invalid credentials, weak or mismatched passwords, invalid reset links                           | `web/features/auth-validation.feature`                                                 |
| Guest and protected route guards for `/app`, `/login`, `/signup`, `/forgot-password`, `/reset-password`                | `web/features/auth-validation.feature`, `web/features/authentication.feature`          |
| Quick view dashboard, Today/Tomorrow/Later columns, edit from board, first-task empty state                            | `web/features/quick-view.feature`                                                      |
| Keyboard quick add and dialog keyboard save behavior                                                                   | `web/features/quick-view.feature`, `web/features/accessibility-and-resilience.feature` |
| Task create, update, complete, reopen, delete, blank-submit prevention, persistence after reload                       | `web/features/task-management.feature`                                                 |
| Scheduled dates, backlog/Later handling, past-date normalization, custom categories, category reuse, priority ordering | `web/features/scheduling-and-categories.feature`                                       |
| Advanced Mode, search, category filters, priority sort, clear filters, Hide Completed Tasks, Auto-move due tasks       | `web/features/advanced-mode.feature`, `web/features/scheduling-and-categories.feature` |
| Statistics workspace, recent wins, open issue spotlight, statistics search handoff, compact stats sheet                | `web/features/statistics.feature`                                                      |
| Profile menu, completion count, theme, history sheet, settings sheet, settings task search, sign out                   | `web/features/history-and-profile.feature`, `web/features/settings-sync.feature`       |
| Web preference persistence, Supabase preference sync, web-to-mobile and mobile-to-web task sync                        | `web/features/settings-sync.feature`                                                   |
| Keyboard navigation, responsive/narrow viewport behavior, loading state, failed save recovery                          | `web/features/accessibility-and-resilience.feature`                                    |

## Mobile Coverage Map

| Capability                                                                                                           | Covered by                                                                                          |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Splash, auth hydration, authenticated shell loading                                                                  | `mobile/features/resilience-and-empty-states.feature`                                               |
| Sign in, signup without email confirmation, account deletion, forgot password happy paths                            | `mobile/features/authentication.feature`                                                            |
| Auth validation, invalid sign in, mismatched signup passwords, reset email requirement, loading duplicate prevention | `mobile/features/authentication-validation.feature`                                                 |
| Drawer profile summary, completion count, Statistics navigation, home reset, app version, logout                     | `mobile/features/drawer-preferences.feature`, `mobile/features/settings.feature`                    |
| Drawer preferences: Appearance, Hide Completed Tasks, Advanced Mode, Auto-move due tasks                             | `mobile/features/drawer-preferences.feature`, `mobile/features/sync-widget-and-persistence.feature` |
| Overview tabs for Today, Tomorrow, Later, top bar search, pull-to-refresh, empty tab action                          | `mobile/features/overview-tabs.feature`, `mobile/features/resilience-and-empty-states.feature`      |
| Task composer create/edit/complete/reopen/delete, blank-submit prevention, advanced long-press details               | `mobile/features/task-composer.feature`                                                             |
| Scheduling controls, custom Later date picker, date normalization, priority selection                                | `mobile/features/scheduling-and-categories.feature`, `mobile/features/task-composer.feature`        |
| Category create, select, clear, delete from reusable suggestions, existing-label preservation                        | `mobile/features/scheduling-and-categories.feature`                                                 |
| Search, advanced label filters, priority sort, Hide Completed Tasks in active list                                   | `mobile/features/search-and-filters.feature`                                                        |
| Statistics screen, open/closed tabs, metrics, overdue count, search, restore, edit, celebration feedback             | `mobile/features/statistics.feature`, `mobile/features/scheduling-and-categories.feature`           |
| Preference persistence, Supabase preference sync, app foreground task refresh, auto-move refresh                     | `mobile/features/sync-widget-and-persistence.feature`                                               |
| iOS widget task snapshot and theme publishing, widget state after sign out                                           | `mobile/features/sync-widget-and-persistence.feature`                                               |
| Failed task operations, bounded refresh spinner, no-match search/filter empty states                                 | `mobile/features/resilience-and-empty-states.feature`                                               |

## Feature Inventory

### Web

| Feature file                                        | Scenarios | Capability area                                            |
| --------------------------------------------------- | --------: | ---------------------------------------------------------- |
| `web/features/accessibility-and-resilience.feature` |         5 | Keyboard, responsive layout, loading, failed save recovery |
| `web/features/advanced-mode.feature`                |         5 | Advanced controls, filters, sort, preferences, auto-move   |
| `web/features/auth-validation.feature`              |         6 | Auth validation and route guards                           |
| `web/features/authentication.feature`               |         5 | Auth happy paths and account deletion                      |
| `web/features/history-and-profile.feature`          |         6 | Profile, theme, history, settings, search, logout          |
| `web/features/public-site.feature`                  |         6 | Landing, legal, support, contact, fallback routes          |
| `web/features/quick-view.feature`                   |         5 | Dashboard columns, edit, shortcut, empty state             |
| `web/features/scheduling-and-categories.feature`    |         6 | Dates, backlog, categories, priorities                     |
| `web/features/settings-sync.feature`                |         5 | Settings, persistence, cross-platform sync                 |
| `web/features/statistics.feature`                   |         4 | Statistics workspace and stats sheet                       |
| `web/features/task-management.feature`              |         6 | Task lifecycle and persistence                             |

### Mobile

| Feature file                                          | Scenarios | Capability area                                           |
| ----------------------------------------------------- | --------: | --------------------------------------------------------- |
| `mobile/features/authentication-validation.feature`   |         5 | Auth validation and error alerts                          |
| `mobile/features/authentication.feature`              |         4 | Auth happy paths and account deletion                     |
| `mobile/features/drawer-preferences.feature`          |         4 | Drawer navigation, preferences, version, logout           |
| `mobile/features/overview-tabs.feature`               |         4 | Today/Tomorrow/Later tabs, refresh, empty action          |
| `mobile/features/resilience-and-empty-states.feature` |         5 | Splash, loading, task errors, refresh guard, empty states |
| `mobile/features/scheduling-and-categories.feature`   |         6 | Dates, categories, priority, statistics edit path         |
| `mobile/features/search-and-filters.feature`          |         3 | Search, filters, sort, hide completed                     |
| `mobile/features/settings.feature`                    |         3 | Account identity, version, sign out from active controls  |
| `mobile/features/statistics.feature`                  |         4 | Statistics tabs, metrics, search, restore, celebration    |
| `mobile/features/sync-widget-and-persistence.feature` |         6 | Persistence, sync, foreground refresh, widget bridge      |
| `mobile/features/task-composer.feature`               |         6 | Composer and task lifecycle                               |

## Notes And Boundaries

- The suite covers active user-facing capabilities exposed by current routing/navigation.
- `mobile/src/features/settings/Settings.screen.tsx` exists in source, but the active `AppNavigator` exposes Dashboard and Statistics through the drawer. Mobile settings/account coverage is therefore written against the active drawer account controls.
- `src/components/UndoNotification.tsx` and legacy mobile drawer components exist in source but are not wired into the active user flow reviewed here. They should get E2E coverage if they become reachable.
- Cross-platform and widget scenarios require the same Supabase test account across clients. Widget scenarios require an iOS build with the native widget bridge available.
- Generated cucumber JSON/HTML execution reports are intentionally not stored as the coverage source of truth. Run `yarn e2e:test:all` or a platform-specific command to generate fresh execution output under `end-to-end-testing/reports/`.

## Runner Commands

- `yarn e2e:test:list`
- `yarn e2e:test:web`
- `yarn e2e:test:mobile`
- `yarn e2e:test:all`
- `yarn e2e:report:open`
- `yarn e2e:report:preview`
