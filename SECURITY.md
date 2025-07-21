# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Security Features

### Data Privacy
- **Local Storage Only**: All chat data is stored locally in your browser using Chrome's storage API
- **No External Transmission**: The extension never sends data to external servers
- **User Control**: Users can clear all stored data at any time through the popup interface
- **Automatic Cleanup**: Only the 10 most recent chats are retained to prevent storage bloat

### Input Sanitization
- All user input is sanitized to prevent XSS attacks
- Message content is validated before storage and injection
- File paths and URLs are validated before use

### Content Security Policy
- Strict CSP prevents execution of inline scripts
- Only self-hosted scripts are allowed to execute

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

### What to Report
- Potential data exposure vulnerabilities
- XSS or injection attack vectors
- Unauthorized data access scenarios
- Privacy-related security issues

### How to Report
1. **Do NOT** create a public GitHub issue for security vulnerabilities
2. Email security details to: [Your email or security contact]
3. Include:
   - Detailed description of the vulnerability
   - Steps to reproduce (if applicable)
   - Potential impact assessment
   - Suggested fix (if known)

### Response Timeline
- **24 hours**: Initial response acknowledging receipt
- **7 days**: Initial assessment and severity classification
- **30 days**: Target timeline for patch release (varies by severity)

## Security Best Practices for Users

### Safe Usage
- Only install the extension from trusted sources
- Regularly clear stored chat data if sharing devices
- Be aware that stored chats are accessible to other extensions with storage permissions

### Privacy Considerations
- The extension stores your chat conversations locally
- Chat titles and previews are visible in the popup interface
- Consider the sensitivity of information you transfer between AI platforms

## Technical Security Measures

### Permissions
The extension uses minimal permissions:
- `storage`: For saving chat history locally
- `activeTab`: For accessing current tab content
- Host permissions limited to ChatGPT and Claude domains only

### Code Security
- No use of `eval()` or similar dynamic code execution
- Input validation on all user-provided data
- Error handling prevents information leakage
- Debug logging disabled in production builds

### Browser Security
- Follows Chrome Extension Manifest V3 security requirements
- Uses modern JavaScript practices
- Implements proper error boundaries

## Known Limitations

- The extension cannot prevent other extensions from accessing stored data
- Browser-level security depends on Chrome's security model
- Local storage can be accessed by malicious software with system access

## Updates and Patching

- Security updates will be released as patch versions (e.g., 1.0.1)
- Users should keep the extension updated to the latest version
- Critical security updates will be communicated through the GitHub repository

## Compliance

This extension:
- Does not collect personal data for analytics
- Does not use tracking technologies
- Follows privacy-by-design principles
- Complies with Chrome Web Store policies