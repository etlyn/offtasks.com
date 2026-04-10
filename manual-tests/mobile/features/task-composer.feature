@manual @mobile @task-composer
Feature: Mobile task composer and task lifecycle
    The mobile task composer should support creating, editing, completing, and deleting tasks.

    Background:
        Given the tester is signed in to the mobile app
        And the overview contains at least one editable task

    Scenario: Create a task from the active tab
        When the tester opens the task composer
        And the tester enters task content, a scheduled date, a priority, and an optional category label
        And the tester saves the task
        Then the new task should appear in the expected task group

    Scenario: Edit an existing task
        Given an existing task is visible in the list
        When the tester opens the task editor for that item
        And the tester changes the content, priority, date, or category
        And the tester saves the task
        Then the list should show the updated values

    Scenario: Complete and reopen a task
        Given an open task is visible in the list
        When the tester marks the task as completed
        Then the task should reflect a completed state and move according to the current rules
        When the tester restores or reopens the same task
        Then the task should return to an active state without duplicate entries

    Scenario: Delete a task from the mobile list
        Given an existing task is visible in the list
        When the tester deletes that task and confirms any warning dialog
        Then the task should disappear from the list after the next refresh