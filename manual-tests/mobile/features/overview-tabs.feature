@manual @mobile @overview
Feature: Mobile overview tabs
    The overview area should keep task groups separated between Today, Tomorrow, and Later.

    Background:
        Given the tester is signed in to the mobile app
        And the drawer navigator is available

    Scenario: Open the default overview tab after sign in
        When the authenticated workspace loads
        Then the Overview section should open on the Today tab by default
        And the top bar should provide access to the navigation drawer and search

    Scenario: Switch between Today, Tomorrow, and Later tabs
        Given the overview is visible
        When the tester switches between the Today, Tomorrow, and Later tabs
        Then the task list should update to the selected group without leaving the overview shell

    Scenario: Refresh a tab manually
        Given the tester is viewing any overview tab
        When the tester performs a pull to refresh gesture
        Then the task list should refresh without crashing or clearing the screen layout