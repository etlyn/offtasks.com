# Offtasks ChatGPT review walkthrough

Status: **not recorded or run**. The public OAuth connection is not yet working,
and no dedicated reviewer account or hosted recording is available. Complete
those dependencies before using this as evidence for OpenAI review.

## Prepare

- Create a dedicated account containing sample data only; keep it usable for
  future reviews. Do not record the owner's personal account, credentials,
  authorization codes, or unrelated content.
- Add at least two open tasks, including a note-linked task, and a goal named
  **Weekly planning**. The task **Review the weekly plan** should not exist yet.
- Connect the exact version being submitted and verify that the reviewer can
  sign in independently. Provide credentials and steps only in the portal's
  reviewer-access fields, not in the ZIP or listing.

## Demonstrate

Record actual ChatGPT interactions and results, pausing long enough to read each
screen. Show the connected Offtasks widget and run these prompts in order:

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

Run the other negative cases in the package as well, including ambiguous task
selection and another user's private data. Record pass/fail evidence rather
than assuming the listed cases passed. Rehearse first, then verify playback and
the absence of secrets. Host the actual recording where OpenAI reviewers can
view it and add the verified URL in the review portal or package metadata.
