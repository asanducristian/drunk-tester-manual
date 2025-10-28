# Drunk Tester Manual

A CLI tool for recording and replaying browser interactions using Playwright.

## Installation

```bash
npm install -g drunk-tester
```

## Usage

### Record Tests

```bash
drunk-tester record --url "https://example.com"
```

This opens a browser and shows a recording overlay. Interact with the page and use the overlay buttons to control recording.

### Run Tests

```bash
drunk-tester run
```

Runs all recorded tests. Use `--headless false` to see the browser.

## Recording Controls

- **Finish BeforeEach**: End setup phase
- **Split Test**: Create new test (prompts for name)
- **Assert Text**: Click button, then click element to assert its text
- **Assert URL**: Click button, then enter expected URL
- **New Test Suite**: Save current suite and start fresh
- **Finish & Save**: Stop recording and save

## Videos on Failures

Playwright is configured to record videos and automatically keep them only for failed tests. Videos are saved in the `playwright-report/data/` directory with unique names for each failed test.

## Generated Tests

Tests are saved in `tests/` directory as Playwright test files. Each recording session creates one test suite with multiple tests.

## Requirements

- Node.js 14.0.0+
- Playwright browsers (installed automatically)

## License

ISC