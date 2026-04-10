@manual @web @authentication
Feature: Web authentication
    The web app should let a user sign in, register, and recover access without leaving the browser flow.

    Background:
        Given the tester knows which Supabase environment is connected to the web app
        And the tester has a valid browser session or test account ready

    Scenario: Sign in with a confirmed account
        Given the tester opens the login page
        When the tester enters a confirmed email address and valid password
        And the tester submits the sign in form
        Then the app should show the welcome back confirmation state
        And the tester should be redirected to the dashboard

    Scenario: Create a new account from the signup screen
        Given the tester is on the login page
        When the tester opens the create account flow
        And the tester enters a new email address and matching passwords
        And the tester submits the signup form
        Then the app should confirm that an account was created
        And the app should instruct the tester to confirm the email address before logging in

    Scenario: Request a password reset email from login
        Given the tester is on the login page
        When the tester enters an existing account email address
        And the tester triggers the forgot password action
        Then the app should confirm that a reset link was sent
        And no unexpected validation or transport error should appear

    Scenario: Complete the password reset screen from the email link
        Given the tester has opened the reset password page from a valid reset link
        When the tester enters matching replacement passwords
        And the tester saves the new password
        Then the app should confirm that the password was updated
        And the tester should be redirected back to the login screen