@e2e @web @history @profile
# Feature code: 8
Feature: Web history and profile controls
    The profile menu and history sheet should expose account controls and completed-task context.

    Background:
        Given the tester is signed in to the web app
        And the account has at least one completed task

    # Scenario code: 8.1
    Scenario: Inspect profile menu account controls
        When the tester opens the profile menu
        Then the menu should show the user summary and completion count
        And the menu should expose actions for search, statistics, theme, and logout

    # Scenario code: 8.2
    Scenario: Toggle the web theme from the profile menu
        Given the profile menu is open
        When the tester switches the theme mode
        Then the app shell should update between light and dark appearance
        And the chosen theme should remain applied after refresh

    # Scenario code: 8.3
    Scenario: Review completed task history by relative date
        When the tester opens the task history sheet
        Then completed tasks should be grouped under relative date headings such as Today or Yesterday
        And each history item should still show its original board label such as Today, Tomorrow, or Later

    # Scenario code: 8.4
    Scenario: Sign out from the profile menu
        Given the profile menu is open
        When the tester logs out
        Then the current session should end
        And the app should return to the login route

    # Scenario code: 8.5
    Scenario: Review web settings sheet account and data controls
        When the tester opens the profile menu
        And the tester opens Settings
        Then the settings sheet should show the account email and Supabase sync status
        And the settings sheet should expose search, appearance, keyboard shortcut, about, and data sections

    # Scenario code: 8.6
    Scenario: Search all tasks from the settings sheet
        Given the settings sheet is open
        When the tester searches for a known task keyword
        Then matching open and completed tasks should appear in the settings results area
        And the tester should be able to complete or reopen a result from the sheet