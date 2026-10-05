@e2e @web @accessibility @resilience
# Feature code: 11
Feature: Web accessibility, loading, and resilience states
    The web app should remain usable with keyboard navigation, responsive layouts, loading states, and retryable errors.

    Background:
        Given the tester can run the web app in desktop and narrow browser viewports

    # Scenario code: 11.1
    Scenario: Navigate primary controls with the keyboard
        Given the tester is signed in to the web app
        When the tester tabs through the header, profile menu, task dialog, and settings sheet
        Then focus should move through interactive controls in a logical order
        And Escape should close open dialogs or sheets without saving unintended changes

    # Scenario code: 11.2
    Scenario: Save a task with the dialog keyboard shortcut
        Given the new task dialog is open
        And the tester has entered valid task content
        When the tester presses the dialog save shortcut
        Then the task should be saved once
        And the dialog should close without leaving duplicate entries

    # Scenario code: 11.3
    Scenario: Preserve layout on a narrow browser viewport
        Given the tester opens the dashboard on a mobile-width browser viewport
        When the quick view, profile sheet, task dialog, and settings sheet are opened
        Then controls and text should remain visible without overlapping
        And the tester should be able to create, edit, and close a task

    # Scenario code: 11.4
    Scenario: Keep the dashboard shell stable while tasks load
        Given the tester opens the protected dashboard with a slow task fetch
        When the app is loading tasks
        Then the header and loading or empty state should remain coherent
        And the app should not redirect away from the protected workspace for an authenticated user

    # Scenario code: 11.5
    Scenario: Recover from a failed task save attempt
        Given the tester is signed in and the task dialog is open
        When a task create or update request fails
        Then the app should leave the tester in a recoverable state
        And a subsequent successful save should refresh the board without duplicate tasks