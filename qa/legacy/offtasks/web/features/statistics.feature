@e2e @web @statistics
# Feature code: 7
Feature: Web statistics workspace
    The statistics tab should summarize wins, open issues, and task health in one place.

    Background:
        Given the tester is signed in to the web app
        And the account contains a mix of open, overdue, and completed tasks

    # Scenario code: 7.1
    Scenario: Open the statistics tab from the dashboard shell
        When the tester opens the statistics view from the header or profile menu
        Then the statistics workspace should replace the quick view content
        And the page should show summary cards for closed issues, open issues, and wins today

    # Scenario code: 7.2
    Scenario: Review recent wins and open issue spotlight content
        Given the statistics view is open
        When the tester scrolls through the analytics sections
        Then recent completed tasks should appear in the wins area
        And high priority or overdue open tasks should appear in the open issues sections

    # Scenario code: 7.3
    Scenario: Jump from statistics into task search
        Given the statistics view is open
        When the tester uses the search action inside statistics
        Then the app should return to a quick view context that supports task search
        And the tester should be able to locate a task without leaving the dashboard

    # Scenario code: 7.4
    Scenario: Open the compact stats sheet from the profile menu
        When the tester opens the profile menu
        And the tester opens the stats summary sheet
        Then the sheet should show completion totals for today, this week, and this month
        And category completion counts should match the current task data