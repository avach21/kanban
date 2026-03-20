# Cursor setup

## Context window = maximum amount of information an LLM can access in a single request

## Tools

MCP - heavier tool more integrated into external systems, takes up more context
Skills - lighter weight tool, takes up less context

## Implementation

Use Plan mode for everything medium or bigger in scope
Use Agent mode directly for small features/small bug fixes

Use GPT 5.4 to plan or implement directly
Use Composer 1 to build plan
Use Grok for dumb tasks (UI stuff)

New chat for every feature

Test cases to think about:

- Happy paths: valid data, functions as expected

- Empty path

- Unhappy path: invalid input, should throw a specific error
  dependency failures (ex. API calls)
  should do something specific/unique to the failure

Format for test names:
Example:
it ('should move the first card to the 100th position in a stack of 100 cards in a column when moveTask is used to move from 1 to 100')

GIVEN (current context of situation or system), WHEN (action), THEN (expected end result)

HOMEWORK:
E2E testing

- playwright library (industry standard to write E2E tests)

come up with 3-5 end to end test cases for the whole application, implement
