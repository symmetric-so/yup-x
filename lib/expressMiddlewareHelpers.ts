import * as util from 'util';
import * as R from 'ramda';
import * as Express from 'express';
import { TsResponse } from './typescript-helpers';

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
