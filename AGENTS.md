
# TideRent Development Rules

This project is for Tide UNLOCKED Challenge 2.

## Mandatory Tide MCP
- Use the official Tide Raziel MCP server when designing
  or implementing Tide security functionality.
- Consult its integration playbooks and security guidance.
- Do not invent Tide SDK methods, APIs, or capabilities.
- Report if the MCP server is unavailable.

## Core Security
- Use TideCloak for authentication.
- Evaluate Forseti for cryptographic bond authorisation.
- Prevent forged approvals and transaction modification.
- Clearly distinguish real Tide enforcement from mocks.

## Rental Bond Rules
- Renter and Landlord can negotiate bond refunds.
- Disagreements follow Victoria's legal pathways.
- RTBA remains the official bond authority.
- No real money transfers or government API integrations.

## Development
- Build and test incrementally.
- Never commit credentials or secrets.
- Explain important implementation decisions.
