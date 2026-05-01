import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SimpleLoginApi implements ICredentialType {
	name = 'simpleLoginApi';
	displayName = 'SimpleLogin API';
	documentationUrl = 'https://app.simplelogin.io/docs/';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
			description: 'SimpleLogin API key (sent via the Authentication header)',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://app.simplelogin.io',
			description:
				'Use the default for SimpleLogin Cloud, or set your self-hosted SimpleLogin instance URL',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authentication: '={{$credentials.apiKey}}',
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/user_info',
			method: 'GET',
		},
	};
}

