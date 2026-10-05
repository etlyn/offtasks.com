@e2e @web @task-management
# Feature code: 3
Feature: Web task management
    The task dialog and board interactions should support the full task lifecycle.

    Background:
        Given the tester is signed in to the web app
        And the dashboard contains at least one editable task

    # Scenario code: 3.1
    Scenario: Create a task with category and priority
        When the tester opens the new task dialog
        And the tester enters task content
        And the tester selects a target group, priority, and optional category label
        And the tester saves the task
        Then the new task should appear in the expected board column
        And the selected label or category should be visible on the saved task

    # Scenario code: 3.2
    Scenario: Update an existing task
        Given an existing task is visible on the board
        When the tester edits the task content, priority, or category label
        And the tester saves the changes
        Then the updated task should reflect the new values on the board

    # Scenario code: 3.3
    Scenario: Toggle a task between open and completed
        Given an open task is visible on the board
        When the tester marks the task as completed
        Then the task should visually reflect the completed state
        When the tester reopens the same task
        Then the task should return to the open state without disappearing unexpectedly

    # Scenario code: 3.4
    Scenario: Delete a task from the board
        Given an existing task is visible on the board
        When the tester deletes the task and confirms the action if prompted
        Then the task should no longer appear in the board list after refresh

    # Scenario code: 3.5
    Scenario: Prevent saving an empty task
        When the tester opens the new task dialog
        And the tester leaves the task content blank
        Then the save action should remain unavailable
        And no empty task should be added to Today, Tomorrow, or Later

    # Scenario code: 3.6
    Scenario: Persist task edits after a browser reload
        Given an existing task is visible on the board
        When the tester changes its content, priority, date, or category label
        And the tester reloads the dashboard after the save completes
        Then the edited values should still be visible on the same task