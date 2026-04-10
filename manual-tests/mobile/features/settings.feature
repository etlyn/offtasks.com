@manual @mobile @settings
Feature: Mobile settings screen
    The settings screen should expose account, support, search, and sign-out controls.

    Background:
        Given the tester is signed in to the mobile app

    Scenario: Open settings and review account information
        When the tester opens the navigation drawer
        And the tester navigates to Settings
        Then the settings screen should show the signed-in email address
        And the screen should show a sync status connected to Supabase
        And the screen should display support contact and app version details

    Scenario: Search tasks from settings
        Given the settings screen is visible
        When the tester opens the settings search control
        And the tester enters a known task keyword
        Then matching tasks should appear in the settings search results area
        And closing search should clear the entered query

    Scenario: Sign out from settings
        Given the settings screen is visible
        When the tester presses Sign out
        Then the current session should be cleared
        And the app should return to the authentication screen