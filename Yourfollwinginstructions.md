 Perform a full security audit of this entire codebase and create a new file named SecurityAudit.md at the project root.

Goal:
Generate a complete vulnerability report for the project with proper fixes and recommendations.

Instructions:
1. Scan the full codebase, including:
   - app/, pages/, components/, lib/, utils/, hooks/, middleware/, api routes
   - package.json, lockfiles, next.config.*, tsconfig, eslint config
   - auth/session logic
   - environment variable usage
   - database queries / ORM usage
   - file upload handling
   - external API calls
   - image/file rendering
   - redirects/navigation
   - markdown/html rendering
   - logging and error handling

2. Detect and document all possible vulnerabilities and risky patterns, including:
   - exposed secrets, keys, tokens, credentials
   - missing .gitignore protections for env files
   - insecure env variable exposure with NEXT_PUBLIC_*
   - XSS
   - CSRF
   - SQL injection / NoSQL injection
   - SSRF
   - open redirects
   - path traversal
   - insecure direct object references (IDOR)
   - missing auth / authorization checks
   - weak session or cookie settings
   - missing rate limiting
   - brute force risk on login/signup/reset endpoints
   - insecure password handling
   - unsafe file uploads
   - insecure image handling / downloadable sensitive assets
   - CORS misconfiguration
   - clickjacking
   - missing security headers
   - dependency vulnerabilities
   - prototype pollution risk from libraries
   - unsafe use of dangerouslySetInnerHTML / eval / innerHTML / new Function
   - sensitive information leakage in logs or errors
   - weak validation / sanitization
   - missing input schema validation
   - webhook verification issues
   - insecure third-party integrations
   - denial-of-service risk from heavy endpoints
   - missing audit trails for critical actions

3. Create SecurityAudit.md with this exact structure:

# Security Audit Report

## Project Overview
- Brief summary of app purpose and stack detected from the codebase

## Executive Summary
- Total issues found
- Count by severity: Critical / High / Medium / Low / Informational

## Severity Legend
- Critical
- High
- Medium
- Low
- Informational

## Findings Summary Table
| ID | Title | Severity | File/Area | Status | Short Fix |
|----|-------|----------|-----------|--------|-----------|

## Detailed Findings
For each issue found, include:
### [ID] Vulnerability Title
- Severity:
- Affected file(s):
- Description:
- Why it is risky:
- Evidence from code:
- Recommended fix:
- Safe code example:
- Remediation priority:
- Status: Open / Fixed / Manual Review Required

4. Add also these sections at the end:

## Dependency Audit
- List vulnerable/outdated packages
- Recommended upgrade versions
- Commands to audit and update safely

## Security Headers Recommendations
- Recommended headers for Next.js
- Example next.config or middleware snippet

## Authentication & Authorization Review
- Summary of auth strengths and weaknesses

## Environment Variables Review
- Which env vars are sensitive
- Which should never be exposed to client
- Safe handling recommendations

## File Upload / Media Handling Review
- Risks and mitigations

## API Security Review
- Route-level notes and protections needed

## Deployment Security Checklist
- HTTPS
- secure cookies
- secret rotation
- rate limiting
- monitoring/logging
- backup and recovery
- least privilege access

## Quick Wins
- List the easiest high-impact fixes

## Manual Review Items
- Anything that needs human decision

## Conclusion
- Overall security posture summary

5. Important requirements:
- Do not expose actual secret values in the report
- Mask any detected secrets
- Be specific with file names and code references
- If no issue is found in a category, explicitly write "No issue found"
- Prefer actionable fixes, not generic advice
- Keep recommendations compatible with Next.js best practices
- If possible, also apply low-risk fixes directly in code, but the main output must be SecurityAudit.md

6. After generating SecurityAudit.md, show me:
- a short summary of the top 5 most important issues
- whether any fixes were automatically applied
