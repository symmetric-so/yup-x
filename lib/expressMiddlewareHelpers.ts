import * as util from 'util';
import * as R from 'ramda';
import * as Express from 'express';
import {
	TsResponse,
	getTsErrorFn,
	getTsErrorResponse,
} from './typescript-helpers';
import { createHash } from 'crypto';
import {
	AUTH_DATABASE_ID,
	AUTH_USER_API_KEY_COLLECTION_ID,
	AUTH_USER_COLLECTION_ID,
	AuthUser,
	AuthUserApiKey,
} from './typescript-api-helpers';
import { readFileSync } from 'fs';

export const allowDebugRequests =
	() =>
	(_: Express.Request, res: Express.Response, next: Express.NextFunction) => {
		res.setHeader('Access-Control-Allow-Origin', '*');
		return next();
	};
export const initResLocals =
	() =>
	(_: Express.Request, res: Express.Response, next: Express.NextFunction) => {
		res.locals = { ...res.locals, data: [], errors: [] };
		return next();
	};

const getUserByApiKeyFromLocalDb = async ({
	hashedApiKey,
	projectId = 'default',
}: {
	hashedApiKey: string;
	projectId?: string;
}): Promise<AuthUser> => {
	try {
		const EXPRESS_APP_LOCAL_RESOURCES_ROOT_DIRECTORY =
			process.env.EXPRESS_APP_LOCAL_RESOURCES_ROOT_DIRECTORY;

		if (projectId === undefined) {
			throw new Error('projectId is undefined');
		}
		if (EXPRESS_APP_LOCAL_RESOURCES_ROOT_DIRECTORY === undefined) {
			throw new Error(
				'EXPRESS_APP_LOCAL_RESOURCES_ROOT_DIRECTORY is undefined',
			);
		}
		const dbDir =
			EXPRESS_APP_LOCAL_RESOURCES_ROOT_DIRECTORY +
			'/' +
			projectId +
			'/databases/' +
			AUTH_DATABASE_ID;

		const apiKeysObjectCollectionFilePath =
			dbDir + '/' + AUTH_USER_API_KEY_COLLECTION_ID + '.json';
		const apiKeysObjectCollectionFileString = readFileSync(
			apiKeysObjectCollectionFilePath,
			'utf8',
		);
		const apiKeysObjectCollection: AuthUserApiKey[] = JSON.parse(
			apiKeysObjectCollectionFileString,
		) as AuthUserApiKey[];

		const apiKeysQuerySnapshot = apiKeysObjectCollection.filter(
			(apiKey) => apiKey.hashed_api_key === hashedApiKey,
		);

		if (apiKeysQuerySnapshot.length === 0) {
			throw new Error('request.unauthenticated');
		}

		const firstMatch = apiKeysQuerySnapshot[0];

		if (!firstMatch || firstMatch.revoked) {
			throw new Error('request.unauthenticated');
		}

		const { _ref_user } = firstMatch;

		const usersObjectCollectionFilePath =
			dbDir + '/' + AUTH_USER_COLLECTION_ID + '.json';

		const usersObjectCollectionFileString = readFileSync(
			usersObjectCollectionFilePath,
			'utf8',
		);

		const usersObjectCollection: AuthUser[] = JSON.parse(
			usersObjectCollectionFileString,
		) as AuthUser[];

		const usersQuerySnapshot = usersObjectCollection.filter(
			(user) => user._id === _ref_user,
		);

		const user = usersQuerySnapshot[0];

		if (!user || user._deleted) {
			throw new Error('request.unauthenticated');
		} else {
			return user;
		}
	} catch (err) {
		return Promise.reject(err);
	}
};

const getUserByApiKey = async ({
	hashedApiKey,
}: {
	hashedApiKey: string;
}): Promise<AuthUser> => {
	return getUserByApiKeyFromLocalDb({ hashedApiKey });
};

export const validateOwner =
	() =>
	(req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
		return void (async () => {
			try {
				const authHeader = req.get('Authorization');
				if (authHeader !== undefined) {
					const accessToken = authHeader.replace('Bearer ', '');
					const accessTokenRegex = /^sk-([a-zA-Z0-9]+)$/;
					if (!accessTokenRegex.test(accessToken)) {
						throw new Error('request.unauthenticated');
					}
					const hash = createHash('sha256');
					hash.update(accessToken);
					const hashedApiKey = hash.digest('hex');
					const user = await getUserByApiKey({
						hashedApiKey,
					});
					res.locals = {
						...res.locals,
						authenticatedUser: user,
					};
					return next();
				} else {
					throw new Error('request.unauthenticated');
				}
			} catch (err) {
				res.locals = {
					...res.locals,
					...getTsErrorResponse(getTsErrorFn('request.unauthenticated')),
				};
				return next();
			}
		})();
	};

const _toStatusCode = ({ errors }: Pick<TsResponse, 'errors'>) =>
	errors.length ? errors[0]?.status_code || '500' : '200';
export const sendResponse =
	() =>
	(_: Express.Request, res: Express.Response, next: Express.NextFunction) => {
		const response = R.pick(['data', 'errors'], res.locals) as TsResponse;
		res.status(parseInt(_toStatusCode(response))).json(response);
		return next();
	};

const _toExpressRequestLog = ({
	data,
	errors,
	req,
}: { req: Express.Request } & TsResponse) => {
	const log = {
		request: R.pick(
			[
				'baseUrl',
				'body',
				'cookies',
				'headers',
				'hostname',
				'httpVersion',
				'ip',
				'ips',
				'method',
				'originalUrl',
				'params',
				'path',
				'protocol',
				'query',
				'url',
			],
			req,
		),
		response: {
			data: data,
			errors: errors,
		},
		status_code: _toStatusCode({ errors }),
	} as const;

	if (log.request?.headers?.authorization) {
		// Mask the authorization header
		log.request.headers.authorization =
			log.request.headers.authorization.replace(
				/^(Bearer )(.+)$/,
				'$1**********',
			);
	}

	return log;
};
export const logResponse =
	() =>
	(req: Express.Request, res: Express.Response, _: Express.NextFunction) => {
		const resLocals = res.locals as TsResponse;
		const log = _toExpressRequestLog({ ...resLocals, req });
		const condensedLog = `${log.request.method} ${log.request.url} ${log.status_code}`;
		console.log(
			util.inspect(
				process.env.EXPRESS_APP_DEPLOYMENT_ENVIRONMENT ===
					'localhost_github_actions_workflow_run'
					? condensedLog
					: log,
				{ showHidden: false, depth: null, colors: true },
			),
		);
		return;
	};
