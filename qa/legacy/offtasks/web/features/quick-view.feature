@e2e @web @quick-view
# Feature code: 4
Feature: Web quick view dashboard
    The quick view should keep the active task board readable across Today, Tomorrow, and Later.

    Background:
        Given the tester is signed in to the web app
        And the dashboard is open on the quick view tab

    # Scenario code: 4.1
    Scenario: Load the protected dashboard workspace
        When the page finishes loading
        Then the header should render without redirecting back to login
        And the quick view should show task columns for Today, Tomorrow, and Later

    # Scenario code: 4.2
    Scenario: Review task placement across the board
        Given there are tasks scheduled for Today, Tomorrow, and Later
        When the tester reviews the board columns
        Then each task should appear in the correct column for its target group
        And completed items should follow the current completed visibility setting

    # Scenario code: 4.3
    Scenario: Open a task for editing from the board
        Given at least one task is visible in quick view
        When the tester opens the edit action for that task
        Then the task dialog should open with the current task values prefilled
        And the tester should be able to cancel without mutating the task

    # Scenario code: 4.4
    Scenario: Use the keyboard shortcut for fast task entry
        Given the tester is focused outside any input field
        When the tester presses the quick add shortcut for a new task
        Then the task dialog should open in create mode
        And the default target group should be Today

    # Scenario code: 4.5
    Scenario: Show the first-task empty state for a new account
        Given the signed-in account has no tasks
        When the dashboard finishes loading
        Then the app should show the no-tasks empty state
        And the empty-state action should open a new Today task dialog