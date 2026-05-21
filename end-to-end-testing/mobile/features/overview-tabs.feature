@e2e @mobile @overview
# Feature code: 4
Feature: Mobile overview tabs
    The overview area should keep task groups separated between Today, Tomorrow, and Later.

    Background:
        Given the tester is signed in to the mobile app
        And the drawer navigator is available

    # Scenario code: 4.1
    Scenario: Open the default overview tab after sign in
        When the authenticated workspace loads
        Then the Overview section should open on the Today tab by default
        And the top bar should provide access to the navigation drawer and search

    # Scenario code: 4.2
    Scenario: Switch between Today, Tomorrow, and Later tabs
        Given the overview is visible
        When the tester switches between the Today, Tomorrow, and Later tabs
        Then the task list should update to the selected group without leaving the overview shell

    # Scenario code: 4.3
    Scenario: Refresh a tab manually
        Given the tester is viewing any overview tab
        When the tester performs a pull to refresh gesture
        Then the task list should refresh without crashing or clearing the screen layout

    # Scenario code: 4.4
    Scenario: Show the empty-state action in an empty tab
        Given the active overview tab has no visible tasks
        When the tab finishes loading
        Then the list should show the no-tasks empty state
        And the floating add action should remain available