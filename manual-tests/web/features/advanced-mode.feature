@manual @web @advanced-mode
Feature: Web advanced mode and filters
    Advanced controls should help a tester search, filter, and organize work without losing state.

    Background:
        Given the tester is signed in to the web app
        And the dashboard contains a mix of labels, priorities, and completed tasks

    Scenario: Enable advanced mode from the profile menu
        When the tester opens the profile menu
        And the tester enables Advanced Mode
        Then extra filtering controls should appear in quick view
        And the choice should persist after a page refresh

    Scenario: Search and filter quick view tasks
        Given advanced mode is enabled
        When the tester searches for a known task keyword
        And the tester filters by one or more category labels
        Then only matching tasks should remain visible in the task columns

    Scenario: Sort tasks by priority and clear filters
        Given advanced mode is enabled
        When the tester toggles the priority sort control
        Then tasks in the active view should reorder by priority
        When the tester clears the active filters
        Then the default unfiltered board should return

    Scenario: Use profile menu preferences that affect board visibility
        When the tester opens the profile menu
        And the tester toggles Hide Completed Tasks or Auto-move due tasks
        Then the board should update to reflect the new preference
        And the preference should still be applied after a reload