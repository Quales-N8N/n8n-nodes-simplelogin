/* eslint-disable n8n-nodes-base/node-param-operation-option-without-action,n8n-nodes-base/node-param-options-type-unsorted-items */
import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';
import { collectSimpleLoginPaginated, simpleLoginRequest } from './utils';

type SimpleLoginResource = 'alias' | 'mailbox' | 'account' | 'setting';

type AliasOperation =
	| 'list'
	| 'get'
	| 'createCustom'
	| 'createRandom'
	| 'update'
	| 'delete'
	| 'toggle';
type MailboxOperation = 'list' | 'create' | 'update' | 'delete';
type AccountOperation = 'getUserInfo' | 'updateUserInfo' | 'getStats' | 'createApiKey';
type SettingOperation = 'get' | 'update';

export class SimpleLogin implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SimpleLogin',
		name: 'simpleLogin',
		icon: 'file:simplelogin.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with the SimpleLogin API',
		defaults: {
			name: 'SimpleLogin',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'simpleLoginApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Alias', value: 'alias' },
					{ name: 'Mailbox', value: 'mailbox' },
					{ name: 'Account', value: 'account' },
					{ name: 'Setting', value: 'setting' },
				],
				default: 'alias',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['alias'] } },
				options: [
					{ name: 'List', value: 'list' },
					{ name: 'Get', value: 'get' },
					{ name: 'Create Custom', value: 'createCustom' },
					{ name: 'Create Random', value: 'createRandom' },
					{ name: 'Update', value: 'update' },
					{ name: 'Delete', value: 'delete' },
					{ name: 'Toggle', value: 'toggle' },
				],
				default: 'list',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['mailbox'] } },
				options: [
					{ name: 'List', value: 'list' },
					{ name: 'Create', value: 'create' },
					{ name: 'Update', value: 'update' },
					{ name: 'Delete', value: 'delete' },
				],
				default: 'list',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['account'] } },
				options: [
					{ name: 'Get User Info', value: 'getUserInfo' },
					{ name: 'Update User Info', value: 'updateUserInfo' },
					{ name: 'Get Stats', value: 'getStats' },
					{ name: 'Create API Key', value: 'createApiKey' },
				],
				default: 'getUserInfo',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['setting'] } },
				options: [
					{ name: 'Get', value: 'get' },
					{ name: 'Update', value: 'update' },
				],
				default: 'get',
			},
			{
				displayName: 'Alias ID',
				name: 'aliasId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['alias'],
						operation: ['get', 'update', 'delete', 'toggle'],
					},
				},
			},
			{
				displayName: 'Mailbox Name or ID',
				name: 'mailboxId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getMailboxIds' },
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				displayOptions: {
					show: {
						resource: ['mailbox'],
						operation: ['update', 'delete'],
					},
				},
			},
			{
				displayName: 'Hostname',
				name: 'hostname',
				type: 'string',
				default: '',
				description: 'Optional source hostname used by SimpleLogin recommendation logic',
				displayOptions: {
					show: {
						resource: ['alias'],
						operation: ['list', 'createCustom', 'createRandom'],
					},
				},
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				description: 'Whether to return all results or only up to a given limit',
				displayOptions: {
					show: {
						resource: ['alias'],
						operation: ['list'],
					},
				},
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 50,
				description: 'Max number of results to return',
				displayOptions: {
					show: {
						resource: ['alias'],
						operation: ['list'],
						returnAll: [false],
					},
				},
			},
			{
				displayName: 'Filter',
				name: 'statusFilter',
				type: 'options',
				default: 'none',
				options: [
					{ name: 'None', value: 'none' },
					{ name: 'Pinned', value: 'pinned' },
					{ name: 'Enabled', value: 'enabled' },
					{ name: 'Disabled', value: 'disabled' },
				],
				displayOptions: {
					show: {
						resource: ['alias'],
						operation: ['list'],
					},
				},
			},
			{
				displayName: 'Search Query',
				name: 'searchQuery',
				type: 'string',
				default: '',
				description:
					'Optional alias search text. When set, the node uses POST /api/v2/aliases with body.query.',
				displayOptions: {
					show: {
						resource: ['alias'],
						operation: ['list'],
					},
				},
			},
			{
				displayName: 'Alias Prefix',
				name: 'aliasPrefix',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['alias'],
						operation: ['createCustom'],
					},
				},
			},
			{
				displayName: 'Signed Suffix',
				name: 'signedSuffix',
				type: 'string',
				default: '',
				description: 'Value from GET /api/v5/alias/options suffixes.signed_suffix',
				displayOptions: {
					show: {
						resource: ['alias'],
						operation: ['createCustom'],
					},
				},
			},
			{
				displayName: 'Mailbox Names or IDs',
				name: 'mailboxIds',
				type: 'multiOptions',
				typeOptions: { loadOptionsMethod: 'getMailboxIds' },
				default: [],
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				displayOptions: {
					show: {
						resource: ['alias'],
						operation: ['createCustom'],
					},
				},
			},
			{
				displayName: 'Custom Alias Options',
				name: 'customAliasOptions',
				type: 'collection',
				default: {},
				displayOptions: {
					show: {
						resource: ['alias'],
						operation: ['createCustom'],
					},
				},
				options: [
					{ displayName: 'Name', name: 'name', type: 'string', default: '' },
					{ displayName: 'Note', name: 'note', type: 'string', default: '' },
				],
			},
			{
				displayName: 'Random Alias Mode',
				name: 'randomAliasMode',
				type: 'options',
				default: 'default',
				options: [
					{ name: 'Default (User Setting)', value: 'default' },
					{ name: 'UUID', value: 'uuid' },
					{ name: 'Word', value: 'word' },
				],
				displayOptions: {
					show: {
						resource: ['alias'],
						operation: ['createRandom'],
					},
				},
			},
			{
				displayName: 'Random Alias Options',
				name: 'randomAliasOptions',
				type: 'collection',
				default: {},
				displayOptions: {
					show: {
						resource: ['alias'],
						operation: ['createRandom'],
					},
				},
				options: [{ displayName: 'Note', name: 'note', type: 'string', default: '' }],
			},
			{
				displayName: 'Update Fields',
				name: 'aliasUpdateFields',
				type: 'collection',
				default: {},
				displayOptions: {
					show: {
						resource: ['alias'],
						operation: ['update'],
					},
				},
				options: [
					{ displayName: 'Disable PGP', name: 'disablePgp', type: 'boolean', default: false },
					{
						displayName: 'Mailbox Names or IDs',
						name: 'mailboxIds',
						type: 'multiOptions',
						typeOptions: { loadOptionsMethod: 'getMailboxIds' },
						default: [],
						description:
							'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
					},
					{ displayName: 'Name', name: 'name', type: 'string', default: '' },
					{ displayName: 'Note', name: 'note', type: 'string', default: '' },
					{ displayName: 'Pinned', name: 'pinned', type: 'boolean', default: false },
				],
			},
			{
				displayName: 'Mailbox Email',
				name: 'mailboxEmail',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['mailbox'],
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Update Fields',
				name: 'mailboxUpdateFields',
				type: 'collection',
				default: {},
				displayOptions: {
					show: {
						resource: ['mailbox'],
						operation: ['update'],
					},
				},
				options: [
					{ displayName: 'Default', name: 'default', type: 'boolean', default: false },
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						default: '',
						placeholder: 'name@email.com',
					},
					{
						displayName: 'Cancel Email Change',
						name: 'cancelEmailChange',
						type: 'boolean',
						default: false,
					},
				],
			},
			{
				displayName: 'Delete Options',
				name: 'mailboxDeleteOptions',
				type: 'collection',
				default: {},
				displayOptions: {
					show: {
						resource: ['mailbox'],
						operation: ['delete'],
					},
				},
				options: [
					{
						displayName: 'Transfer Aliases To',
						name: 'transferAliasesTo',
						type: 'number',
						default: -1,
						description:
							'Mailbox ID receiving aliases. Use -1 to delete aliases with the mailbox.',
					},
				],
			},
			{
				displayName: 'Device Name',
				name: 'deviceName',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['account'],
						operation: ['createApiKey'],
					},
				},
			},
			{
				displayName: 'Update Fields',
				name: 'accountUpdateFields',
				type: 'collection',
				default: {},
				displayOptions: {
					show: {
						resource: ['account'],
						operation: ['updateUserInfo'],
					},
				},
				options: [
					{ displayName: 'Name', name: 'name', type: 'string', default: '' },
					{
						displayName: 'Profile Picture (Base64)',
						name: 'profilePicture',
						type: 'string',
						default: '',
						description: 'Base64 image data',
					},
					{
						displayName: 'Remove Profile Picture',
						name: 'removeProfilePicture',
						type: 'boolean',
						default: false,
					},
				],
			},
			{
				displayName: 'Update Fields',
				name: 'settingUpdateFields',
				type: 'collection',
				default: {},
				displayOptions: {
					show: {
						resource: ['setting'],
						operation: ['update'],
					},
				},
				options: [
					{
						displayName: 'Alias Generator',
						name: 'aliasGenerator',
						type: 'options',
						options: [
							{ name: 'UUID', value: 'uuid' },
							{ name: 'Word', value: 'word' },
						],
						default: 'word',
					},
					{ displayName: 'Notification', name: 'notification', type: 'boolean', default: true },
					{
						displayName: 'Random Alias Default Domain',
						name: 'randomAliasDefaultDomain',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Random Alias Suffix',
						name: 'randomAliasSuffix',
						type: 'options',
						options: [
							{ name: 'Word', value: 'word' },
							{ name: 'Random String', value: 'random_string' },
						],
						default: 'word',
					},
					{
						displayName: 'Sender Format',
						name: 'senderFormat',
						type: 'options',
						options: [
							{ name: 'AT', value: 'AT' },
							{ name: 'A', value: 'A' },
							{ name: 'Name Only', value: 'NAME_ONLY' },
							{ name: 'AT Only', value: 'AT_ONLY' },
							{ name: 'No Name', value: 'NO_NAME' },
						],
						default: 'AT',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getMailboxIds(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const response = await simpleLoginRequest(this, {
					method: 'GET',
					url: '/api/v2/mailboxes',
				});
				const mailboxes = (response.mailboxes || []) as Array<{ id: number; email: string }>;
				return mailboxes.map((mailbox) => ({
					name: `${mailbox.email} (${mailbox.id})`,
					value: mailbox.id,
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as SimpleLoginResource;
				const operation = this.getNodeParameter('operation', i) as
					| AliasOperation
					| MailboxOperation
					| AccountOperation
					| SettingOperation;
				let responseData: any;

				if (resource === 'alias') {
					if (operation === 'list') {
						const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
						const limit = this.getNodeParameter('limit', i, 50) as number;
						const statusFilter = this.getNodeParameter('statusFilter', i, 'none') as string;
						const searchQuery = this.getNodeParameter('searchQuery', i, '') as string;
						const hostname = this.getNodeParameter('hostname', i, '') as string;

						const aliases = await collectSimpleLoginPaginated(async (pageId) => {
							const qs: Record<string, unknown> = { page_id: pageId };
							if (hostname) qs.hostname = hostname;
							if (statusFilter !== 'none') qs[statusFilter] = true;

							const usePost = searchQuery.trim().length > 0;
							const response = await simpleLoginRequest(this, {
								method: usePost ? 'POST' : 'GET',
								url: '/api/v2/aliases',
								qs,
								body: usePost ? { query: searchQuery } : undefined,
							});
							return (response.aliases || []) as unknown[];
						}, returnAll ? undefined : limit);

						responseData = { aliases };
					} else if (operation === 'get') {
						const aliasId = this.getNodeParameter('aliasId', i) as string;
						responseData = await simpleLoginRequest(this, {
							method: 'GET',
							url: `/api/aliases/${aliasId}`,
						});
					} else if (operation === 'createCustom') {
						const aliasPrefix = this.getNodeParameter('aliasPrefix', i) as string;
						const signedSuffix = this.getNodeParameter('signedSuffix', i) as string;
						const mailboxIds = this.getNodeParameter('mailboxIds', i, []) as number[];
						const customAliasOptions = this.getNodeParameter('customAliasOptions', i, {}) as {
							name?: string;
							note?: string;
						};
						const hostname = this.getNodeParameter('hostname', i, '') as string;

						if (mailboxIds.length === 0) {
							throw new NodeOperationError(this.getNode(), 'At least one mailbox ID is required', {
								itemIndex: i,
							});
						}

						const body: Record<string, unknown> = {
							alias_prefix: aliasPrefix,
							signed_suffix: signedSuffix,
							mailbox_ids: mailboxIds.map((id) => Number(id)),
						};
						if (customAliasOptions.name) body.name = customAliasOptions.name;
						if (customAliasOptions.note) body.note = customAliasOptions.note;

						const qs = hostname ? { hostname } : undefined;
						responseData = await simpleLoginRequest(this, {
							method: 'POST',
							url: '/api/v3/alias/custom/new',
							qs,
							body,
						});
					} else if (operation === 'createRandom') {
						const randomAliasMode = this.getNodeParameter('randomAliasMode', i, 'default') as string;
						const randomAliasOptions = this.getNodeParameter('randomAliasOptions', i, {}) as {
							note?: string;
						};
						const hostname = this.getNodeParameter('hostname', i, '') as string;

						const qs: Record<string, unknown> = {};
						if (randomAliasMode !== 'default') qs.mode = randomAliasMode;
						if (hostname) qs.hostname = hostname;

						const body: Record<string, unknown> = {};
						if (randomAliasOptions.note) body.note = randomAliasOptions.note;

						responseData = await simpleLoginRequest(this, {
							method: 'POST',
							url: '/api/alias/random/new',
							qs: Object.keys(qs).length ? qs : undefined,
							body: Object.keys(body).length ? body : undefined,
						});
					} else if (operation === 'update') {
						const aliasId = this.getNodeParameter('aliasId', i) as string;
						const updateFields = this.getNodeParameter('aliasUpdateFields', i, {}) as {
							name?: string;
							note?: string;
							disablePgp?: boolean;
							pinned?: boolean;
							mailboxIds?: number[];
						};

						const body: Record<string, unknown> = {};
						if (typeof updateFields.name !== 'undefined' && updateFields.name !== '') {
							body.name = updateFields.name;
						}
						if (typeof updateFields.note !== 'undefined' && updateFields.note !== '') {
							body.note = updateFields.note;
						}
						if (typeof updateFields.disablePgp !== 'undefined') {
							body.disable_pgp = updateFields.disablePgp;
						}
						if (typeof updateFields.pinned !== 'undefined') {
							body.pinned = updateFields.pinned;
						}
						if (updateFields.mailboxIds && updateFields.mailboxIds.length > 0) {
							body.mailbox_ids = updateFields.mailboxIds.map((id) => Number(id));
						}

						responseData = await simpleLoginRequest(this, {
							method: 'PATCH',
							url: `/api/aliases/${aliasId}`,
							body,
						});
					} else if (operation === 'delete') {
						const aliasId = this.getNodeParameter('aliasId', i) as string;
						responseData = await simpleLoginRequest(this, {
							method: 'DELETE',
							url: `/api/aliases/${aliasId}`,
						});
					} else if (operation === 'toggle') {
						const aliasId = this.getNodeParameter('aliasId', i) as string;
						responseData = await simpleLoginRequest(this, {
							method: 'POST',
							url: `/api/aliases/${aliasId}/toggle`,
						});
					}
				}

				if (resource === 'mailbox') {
					if (operation === 'list') {
						responseData = await simpleLoginRequest(this, {
							method: 'GET',
							url: '/api/v2/mailboxes',
						});
					} else if (operation === 'create') {
						const mailboxEmail = this.getNodeParameter('mailboxEmail', i) as string;
						responseData = await simpleLoginRequest(this, {
							method: 'POST',
							url: '/api/mailboxes',
							body: { email: mailboxEmail },
						});
					} else if (operation === 'update') {
						const mailboxId = this.getNodeParameter('mailboxId', i) as string;
						const updateFields = this.getNodeParameter('mailboxUpdateFields', i, {}) as {
							default?: boolean;
							email?: string;
							cancelEmailChange?: boolean;
						};

						const body: Record<string, unknown> = {};
						if (typeof updateFields.default !== 'undefined') body.default = updateFields.default;
						if (typeof updateFields.email !== 'undefined' && updateFields.email !== '') {
							body.email = updateFields.email;
						}
						if (typeof updateFields.cancelEmailChange !== 'undefined') {
							body.cancel_email_change = updateFields.cancelEmailChange;
						}

						responseData = await simpleLoginRequest(this, {
							method: 'PUT',
							url: `/api/mailboxes/${mailboxId}`,
							body,
						});
					} else if (operation === 'delete') {
						const mailboxId = this.getNodeParameter('mailboxId', i) as string;
						const mailboxDeleteOptions = this.getNodeParameter('mailboxDeleteOptions', i, {}) as {
							transferAliasesTo?: number;
						};

						const body: Record<string, unknown> = {};
						if (typeof mailboxDeleteOptions.transferAliasesTo !== 'undefined') {
							body.transfer_aliases_to = mailboxDeleteOptions.transferAliasesTo;
						}

						responseData = await simpleLoginRequest(this, {
							method: 'DELETE',
							url: `/api/mailboxes/${mailboxId}`,
							body: Object.keys(body).length ? body : undefined,
						});
					}
				}

				if (resource === 'account') {
					if (operation === 'getUserInfo') {
						responseData = await simpleLoginRequest(this, {
							method: 'GET',
							url: '/api/user_info',
						});
					} else if (operation === 'updateUserInfo') {
						const updateFields = this.getNodeParameter('accountUpdateFields', i, {}) as {
							name?: string;
							profilePicture?: string;
							removeProfilePicture?: boolean;
						};
						const body: Record<string, unknown> = {};

						if (typeof updateFields.name !== 'undefined' && updateFields.name !== '') {
							body.name = updateFields.name;
						}
						if (updateFields.removeProfilePicture) {
							body.profile_picture = null;
						} else if (
							typeof updateFields.profilePicture !== 'undefined' &&
							updateFields.profilePicture !== ''
						) {
							body.profile_picture = updateFields.profilePicture;
						}

						responseData = await simpleLoginRequest(this, {
							method: 'PATCH',
							url: '/api/user_info',
							body,
						});
					} else if (operation === 'getStats') {
						responseData = await simpleLoginRequest(this, {
							method: 'GET',
							url: '/api/stats',
						});
					} else if (operation === 'createApiKey') {
						const deviceName = this.getNodeParameter('deviceName', i) as string;
						responseData = await simpleLoginRequest(this, {
							method: 'POST',
							url: '/api/api_key',
							body: { device: deviceName },
						});
					}
				}

				if (resource === 'setting') {
					if (operation === 'get') {
						responseData = await simpleLoginRequest(this, {
							method: 'GET',
							url: '/api/setting',
						});
					} else if (operation === 'update') {
						const updateFields = this.getNodeParameter('settingUpdateFields', i, {}) as {
							aliasGenerator?: 'uuid' | 'word';
							notification?: boolean;
							randomAliasDefaultDomain?: string;
							senderFormat?: 'AT' | 'A' | 'NAME_ONLY' | 'AT_ONLY' | 'NO_NAME';
							randomAliasSuffix?: 'word' | 'random_string';
						};

						const body: Record<string, unknown> = {};
						if (typeof updateFields.aliasGenerator !== 'undefined') {
							body.alias_generator = updateFields.aliasGenerator;
						}
						if (typeof updateFields.notification !== 'undefined') {
							body.notification = updateFields.notification;
						}
						if (
							typeof updateFields.randomAliasDefaultDomain !== 'undefined' &&
							updateFields.randomAliasDefaultDomain !== ''
						) {
							body.random_alias_default_domain = updateFields.randomAliasDefaultDomain;
						}
						if (typeof updateFields.senderFormat !== 'undefined') {
							body.sender_format = updateFields.senderFormat;
						}
						if (typeof updateFields.randomAliasSuffix !== 'undefined') {
							body.random_alias_suffix = updateFields.randomAliasSuffix;
						}

						responseData = await simpleLoginRequest(this, {
							method: 'PATCH',
							url: '/api/setting',
							body,
						});
					}
				}

				if (typeof responseData === 'undefined') {
					throw new NodeOperationError(this.getNode(), 'Unsupported resource/operation combination', {
						itemIndex: i,
					});
				}

				returnData.push({ json: responseData });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: i,
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}

