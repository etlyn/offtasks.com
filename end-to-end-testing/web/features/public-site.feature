@e2e @web @public-site
# Feature code: 10
Feature: Web public site and legal routes
    The public web experience should introduce Offtasks, link visitors into auth, and support legal or support requests.

    Background:
        Given the tester is using a desktop or mobile browser

    # Scenario code: 10.1
    Scenario: Review the public landing page calls to action
        Given the tester opens the public home page
        When the landing page finishes rendering
        Then the page should show the Offtasks value proposition and feature list
        And the primary action should lead a signed-out visitor to signup
        And the sign in action should lead to login

    # Scenario code: 10.2
    Scenario: Open the workspace from the landing page when already signed in
        Given the tester has an authenticated web session
        When the tester opens the public home page
        Then the primary action should offer to open the workspace
        When the tester follows that action
        Then the protected dashboard should load without an extra login step

    # Scenario code: 10.3
    Scenario: Navigate privacy, terms, support, and contact routes
        Given the tester opens the public home page
        When the tester follows the footer or direct links for Privacy, Terms, Support, and Contact
        Then each legal or support page should render the expected title and updated date
        And each page should provide a path back to the home page

    # Scenario code: 10.4
    Scenario: Validate the support contact form
        Given the tester opens the support contact form
        When the tester submits the form with a missing name, email, or message
        Then the form should show a validation error
        And no success state should be shown

    # Scenario code: 10.5
    Scenario: Submit a support contact message
        Given the tester opens the support contact form
        When the tester enters a name, email, and support message
        And the tester submits the form
        Then the form should show the sending state while the request is in flight
        And the form should either show Message sent or a retryable submit error

    # Scenario code: 10.6
    Scenario: Redirect unknown public routes to the landing page
        Given the tester opens an unknown public route
        When the app router handles the route
        Then the tester should land on the public home page
        And the browser should not show the protected dashboard unless the route is /app