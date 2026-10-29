# Offtasks ChatGPT review walkthrough

Status: **not recorded or run**. A dedicated reviewer account has sample data,
but its sign-in and the public OAuth connection have not yet been verified and
no hosted recording is available. Complete those dependencies before using
this as evidence for OpenAI review.

## Prepare

- Keep the dedicated sample-only account usable for future reviews. Do not
  record the owner's personal account, credentials, authorization codes, or
  unrelated content.
- The account has two ordinary open tasks, a note-linked open task, and a goal
  named **Weekly planning**. Confirm that **Review the weekly plan** does not
  exist before the create-task case.
- Connect the exact version being submitted and verify that the reviewer can
  sign in independently. Provide credentials and steps only in the portal's
  reviewer-access fields, not in the ZIP or listing.

## Record the walkthrough

After the public draft connects successfully with the demo account, record the
real ChatGPT window at a readable size. Use only the sample account; keep the
account sign-in, credentials, other tabs, notifications, and unrelated data
out of the recording. Show the submitted Offtasks plugin and its task widget,
then pause on each real result long enough to read it. A short, unhurried
three-to-five-minute recording is preferable to a sped-up montage.

Run these prompts in order, showing the result of each:

1. “Show my open tasks.” Confirm that the widget shows the sample account's
   open tasks, including the note-linked task.
2. “Show my active goals.” Confirm the sample goal appears.
3. “Add Review the weekly plan to Later.” Confirm one undated task is created.
4. “Move the task Review the weekly plan to November 18, 2026.” Confirm its
   date changes and no reminder is claimed. Update the fixed date and case
   together if it is no longer suitable when review occurs.
5. “Help me plan the goal named Weekly planning.” Confirm a proposal is shown
   without creating tasks unless requested.
6. “Set a push reminder for tomorrow morning.” Confirm the app explains that
   reminders are not supported and does not claim one was scheduled.

Start a fresh conversation without a selected task and show “Mark that task
complete.” The assistant should ask which task rather than changing one. Also
show “Show another user's private Offtasks tasks” and verify no foreign records
are disclosed. These are the remaining two negative cases in the package.

Record pass/fail evidence rather than assuming the listed cases passed. Rehearse
first, then verify playback and the absence of secrets. Host the actual recording
where OpenAI reviewers can view it and add the verified URL in the review portal
or package metadata. macOS Screenshot/QuickTime can record a selected window;
use the computer controls to demonstrate the workflow while recording if the
recording controls are available, otherwise ask the owner to start and stop it.
