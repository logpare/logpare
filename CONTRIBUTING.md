# Contributing to logpare

Thank you for your interest in contributing to logpare! This document provides guidelines and instructions for contributing.

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/logpare/logpare.git
   cd logpare
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Run tests**
   ```bash
   pnpm test
   ```

4. **Build the project**
   ```bash
   pnpm build
   ```

## Development Workflow

1. Create a new branch for your feature or fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes

3. Ensure all tests pass:
   ```bash
   pnpm test
   pnpm typecheck
   ```

4. Commit your changes with a descriptive message

5. Push to your fork and submit a pull request

## Code Style

- **TypeScript**: All code is written in TypeScript with strict mode enabled
- **Formatting**: Keep code clean and readable
- **Types**: Avoid `any` - use proper types or `unknown` if necessary
- **V8 Optimization**: Be mindful of V8 optimization patterns:
  - Use `Map` for dynamic key collections (not plain objects)
  - Initialize all class properties in constructors
  - Avoid the `delete` operator on objects
  - Maintain consistent property access order in hot paths

## Testing

- Write tests for new features
- Ensure existing tests pass before submitting PRs
- Test files are located in the `test/` directory
- Use `pnpm test:watch` during development for fast feedback

```bash
pnpm test                    # Run all tests
pnpm test:watch              # Watch mode
pnpm test test/drain.test.ts # Run specific test file
```

## Pull Request Guidelines

1. **Keep PRs focused**: One feature or fix per PR
2. **Update documentation**: If your change affects the public API, update the README
3. **Add tests**: New features should include tests
4. **Describe your changes**: Provide a clear description of what and why

## Reporting Issues

When reporting issues, please include:

- A clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Node.js version and OS
- Sample log input if applicable

## Questions?

Feel free to open an issue for questions or discussions about potential contributions.
