@manual @mobile @authentication
Feature: Mobile authentication
    The mobile client should support sign in, sign up, and password reset from a single auth screen.

    Background:
        Given the tester is using a simulator or device connected to the configured Supabase project

    Scenario: Sign in with a valid account
        Given the tester is on the authentication screen in sign in mode
        When the tester enters a valid email address and password
        And the tester submits the form
        Then the app should open the authenticated workspace without showing an auth error alert

    Scenario: Create an account in sign up mode
        Given the tester is on the authentication screen
        When the tester switches to sign up mode
        And the tester enters a new email address and matching passwords
        And the tester submits the form
        Then the app should ask the tester to confirm the account from email
        And the form should return to sign in mode

    Scenario: Send a password reset email
        Given the tester is on the authentication screen in sign in mode
        When the tester enters an existing account email address
        And the tester triggers the forgot password action
        Then the app should confirm that a reset link was sent
        And no unexpected auth error alert should remain visible