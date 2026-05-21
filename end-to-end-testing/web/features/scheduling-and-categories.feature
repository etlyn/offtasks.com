@e2e @web @scheduling @categories
# Feature code: 6
Feature: Web scheduling and category lifecycle
    Task dates, board placement, priority, and category labels should stay consistent across create and edit flows.

    Background:
        Given the tester is signed in to the web app
        And the dashboard contains tasks that can be safely edited or removed

    # Scenario code: 6.1
    Scenario: Schedule tasks into Today, Tomorrow, Later, and backlog
        When the tester creates tasks with Today, Tomorrow, a future Later date, and no scheduled date
        Then each task should appear in the expected board column
        And the no-date task should remain in Later as backlog work

    # Scenario code: 6.2
    Scenario: Normalize a past scheduled date to Today
        When the tester creates or edits a task with a date before today
        And the tester saves the task
        Then the task should be corrected into Today
        And the saved task should not keep an impossible past target group

    # Scenario code: 6.3
    Scenario: Create and reuse a custom category from the task dialog
        When the tester opens the category selector in the task dialog
        And the tester searches for a category that does not exist
        And the tester adds that category to a task
        Then the category should be visible on the saved task
        When the tester opens another task dialog
        Then the custom category should be available for reuse

    # Scenario code: 6.4
    Scenario: Clear optional category and priority values while editing
        Given a task has a category label and non-default priority
        When the tester edits the task and clears the category and priority
        And the tester saves the change
        Then the board should show the task without the old label or priority marker

    # Scenario code: 6.5
    Scenario: Preserve category list after reload
        Given the tester has added a custom category through the task dialog
        When the tester reloads the dashboard
        Then the custom category should remain available in the category selector
        And tasks using that category should keep their label styling

    # Scenario code: 6.6
    Scenario: Keep priority ordering stable for equal priorities
        Given advanced mode is enabled
        And the current view contains multiple tasks with the same priority
        When the tester toggles priority sorting
        Then tasks should group by priority without losing any tasks
        And tasks with equal priority should remain readable and selectable