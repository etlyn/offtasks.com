@manual @web @task-management
Feature: Web task management
    The task dialog and board interactions should support the full task lifecycle.

    Background:
        Given the tester is signed in to the web app
        And the dashboard contains at least one editable task

    Scenario: Create a task with category and priority
        When the tester opens the new task dialog
        And the tester enters task content
        And the tester selects a target group, priority, and optional category label
        And the tester saves the task
        Then the new task should appear in the expected board column
        And the selected label or category should be visible on the saved task

    Scenario: Update an existing task
        Given an existing task is visible on the board
        When the tester edits the task content, priority, or category label
        And the tester saves the changes
        Then the updated task should reflect the new values on the board

    Scenario: Toggle a task between open and completed
        Given an open task is visible on the board
        When the tester marks the task as completed
        Then the task should visually reflect the completed state
        When the tester reopens the same task
        Then the task should return to the open state without disappearing unexpectedly

    Scenario: Delete a task from the board
        Given an existing task is visible on the board
        When the tester deletes the task and confirms the action if prompted
        Then the task should no longer appear in the board list after refresh