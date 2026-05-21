@e2e @web @settings @sync
# Feature code: 9
Feature: Web settings, persistence, and cross-platform sync
    Web preferences and task data should persist locally, sync through Supabase, and reflect changes made by mobile.

    Background:
        Given the tester is signed in to the web app with a reusable test account

    # Scenario code: 9.1
    Scenario: Review settings sheet account, about, and data sections
        When the tester opens the profile menu
        And the tester opens Settings
        Then the settings sheet should show the account email and Supabase sync status
        And the sheet should show appearance, keyboard shortcut, about, and data information

    # Scenario code: 9.2
    Scenario: Search and update tasks from settings
        Given the settings sheet is open
        When the tester searches for a known task keyword
        Then matching tasks should appear in the settings search results
        When the tester completes or reopens a matching result
        Then the same state should be reflected on the dashboard after the sheet closes

    # Scenario code: 9.3
    Scenario: Persist web preferences across reload and sign-in cycles
        When the tester changes theme, Advanced Mode, Hide Completed Tasks, and Auto-move due tasks
        And the tester reloads the page
        Then each preference should still be applied
        When the tester signs out and signs back in with the same account
        Then synced preferences should be restored from Supabase

    # Scenario code: 9.4
    Scenario: Reflect a mobile-created task on the web dashboard
        Given the tester creates a uniquely named task in the mobile app with the same account
        When the tester refreshes the web dashboard
        Then the mobile-created task should appear in the matching Today, Tomorrow, or Later column
        And its priority, date, completion state, and category should match mobile

    # Scenario code: 9.5
    Scenario: Reflect a web edit in the mobile app
        Given a shared task is visible on web and mobile
        When the tester edits the task content, date, priority, category, or completion state on web
        And the tester refreshes the mobile app
        Then mobile should show the web edit without creating a duplicate task