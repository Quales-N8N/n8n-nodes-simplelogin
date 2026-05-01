# n8n-nodes-simplelogin

This is an n8n community node for SimpleLogin.

[n8n](https://n8n.io/) is a workflow automation platform. This package adds a `SimpleLogin` node to manage aliases, mailboxes, account info, and settings through the SimpleLogin API.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Compatibility](#compatibility)  
[Usage](#usage)  
[Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) from the n8n docs.

## Operations

Supported resources and operations:

- Alias: `list`, `get`, `createCustom`, `createRandom`, `update`, `delete`, `toggle`
- Mailbox: `list`, `create`, `update`, `delete`
- Account: `getUserInfo`, `updateUserInfo`, `getStats`, `createApiKey`
- Setting: `get`, `update`

## Credentials

Create credentials of type `SimpleLogin API`.

- `API Key`: sent as `Authentication` header.
- `Base URL`: defaults to `https://app.simplelogin.io` and can be changed for self-hosted instances.

Credential test request: `GET /api/user_info`.

## Compatibility

- Works with n8n 1.x.
- Requires Node.js `>=20.15` for development/build.

## Usage

- Select a resource and operation in the `SimpleLogin` node.
- For alias listing, use `Return All` or `Limit`.
- Use `Mailbox Names or IDs` dynamic fields to select mailboxes from your account.

## Support / Contact

- Open an issue on your project repository.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [SimpleLogin API documentation](api.md)
