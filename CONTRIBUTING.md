# Contributing to Twirl

Thank you for your interest in contributing to Twirl! This document provides guidelines for contributing to the project.

## Code of Conduct

This project adheres to a code of conduct based on respect and inclusivity. Please be respectful in all interactions.

## Security

**IMPORTANT**: This extension handles sensitive user data (chat conversations). Please follow these security guidelines:

### Privacy & Data Handling
- Never log actual chat content in production code
- All debug logging should use the `log()` method which respects the `debug` flag
- Sanitize all user input before processing
- Limit data storage to essential information only

### Content Security
- Always sanitize strings before DOM insertion
- Validate all data from storage before use
- Use proper error handling for all async operations

## Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/twirl.git`
3. Enable Developer Mode in Chrome Extensions
4. Load the unpacked extension from the project directory
5. Make your changes
6. Test thoroughly on both ChatGPT and Claude

## Development Guidelines

### Code Style
- Use clear, descriptive variable names
- Add comments for complex logic
- Follow existing code patterns
- Keep functions focused and small

### Testing
- Test on both `chatgpt.com` and `claude.ai`
- Test with various conversation lengths
- Verify the popup interface works correctly
- Test extension reload scenarios

### Debugging
- Set `this.debug = true` in content scripts for verbose logging
- Use browser developer tools for troubleshooting
- Check the Extensions page for error messages

## File Structure

```
twirl/
├── src/
│   ├── content/          # Content scripts for websites
│   └── popup/           # Extension popup interface
├── assets/              # Icons and static assets
├── tests/               # Test utilities
└── docs/               # Documentation
```

## Submitting Changes

1. Create a feature branch: `git checkout -b feature-name`
2. Make your changes
3. Test thoroughly
4. Commit with clear messages
5. Push to your fork
6. Create a Pull Request

### Pull Request Guidelines
- Describe what your changes do
- Include screenshots for UI changes
- List any breaking changes
- Verify all tests pass

## Reporting Issues

When reporting bugs:
- Include browser version and OS
- Describe steps to reproduce
- Include any console errors
- Never include actual chat content in bug reports

## Features Requests

We welcome feature requests! Please:
- Check if the feature already exists
- Describe the use case clearly
- Consider privacy implications
- Suggest implementation approaches if possible

## Privacy Considerations

This extension:
- Stores data locally only (no external servers)
- Does not transmit data outside the browser
- Provides user control over data deletion
- Follows Chrome extension best practices

When contributing, maintain these privacy standards.