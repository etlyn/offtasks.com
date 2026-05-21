@e2e @web @authentication @validation
# Feature code: 2
Feature: Web authentication validation and route guards
    Authentication forms should block incomplete input, explain auth failures, and route users to the correct surface.

    Background:
        Given the tester knows which Supabase environment is connected to the web app

    # Scenario code: 2.1
    Scenario: Block sign in with missing fields
        Given the tester opens the login page
        When the tester submits the sign in form without an email address
        Then the app should ask for the email used with Offtasks
        When the tester enters an email address without a password
        Then the app should ask for a password before continuing

    # Scenario code: 2.2
    Scenario: Show a mapped auth error for invalid credentials
        Given the tester opens the login page
        When the tester enters an existing email address with an invalid password
        And the tester submits the sign in form
        Then the app should show a friendly authentication error
        And the tester should remain on the login page with the form usable

    # Scenario code: 2.3
    Scenario: Enforce signup password and confirmation rules
        Given the tester opens the signup page
        When the tester submits incomplete signup fields
        Then the app should ask the tester to fill in all fields
        When the tester enters a weak password or mismatched confirmation
        Then the password checklist or mismatch error should explain what to fix

    # Scenario code: 2.4
    Scenario: Reject password reset without an account email
        Given the tester opens the forgot password page
        When the tester submits the form without an email address
        Then the app should ask for the email tied to the Offtasks account
        And no reset email confirmation should appear

    # Scenario code: 2.5
    Scenario: Handle invalid or expired reset links
        Given the tester opens the reset password page without a valid recovery token
        When the tester attempts to save a new password
        Then the app should explain that the reset link is invalid or expired
        And the tester should be able to return to login and request a new link

    # Scenario code: 2.6
    Scenario: Apply guest and protected route guards
        Given the tester is signed out
        When the tester opens the protected /app route directly
        Then the app should redirect to the login page
        Given the tester is signed in
        When the tester opens login, signup, or forgot password directly
        Then the app should redirect to the protected dashboard