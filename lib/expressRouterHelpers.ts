import * as Express from 'express';
import * as ExpressRouterMiddlewareHelpers from './expressRouterMiddleware';
import * as ExpressRouterFunctionHelpers from './expressRouterFunctions';
import {
	TsResponse,
	isTsErrorResponse,
	getTsErrorResponse,
} from './typescript-helpers';

const _setResLocals = async ({
	res,
	routerFn,
	routerFnProps,
}: {
	res: Express.Response;
	routerFn: ExpressRouterFunctionHelpers.RouterFn;
	routerFnProps: ExpressRouterFunctionHelpers.RouterFnProps;
}): Promise<void> => {
	try {
		if (isTsErrorResponse(res.locals as TsResponse)) return;
		const routerFnResponse = await routerFn(routerFnProps);
		res.locals = { ...res.locals, ...routerFnResponse };
	} catch (msg) {
		res.locals = { ...res.locals, ...getTsErrorResponse() };
	}
};

export const getExpressRouter = ({
	apiObjectSpec,
}: Omit<ExpressRouterFunctionHelpers.RouterFnProps, 'res'>) => {
	const router = Express.Router();
	const _toRouterFn =
		(routerFn: ExpressRouterFunctionHelpers.RouterFn) =>
		(_: Express.Request, res: Express.Response, next: Express.NextFunction) => {
			return void (async () => {
				await _setResLocals({
					routerFn,
					routerFnProps: { apiObjectSpec, res },
					res,
				});
				return next();
			})();
		};
	router.get('/', _toRouterFn(ExpressRouterFunctionHelpers.retrieveAll));
	router.post(
		'/batchCreate',
		ExpressRouterMiddlewareHelpers.validateWrite({
			apiObjectSpec,
			op: 'create',
		}),
		_toRouterFn(ExpressRouterFunctionHelpers.batchCreate),
	);
	router.post(
		'/batchUpdate',
		ExpressRouterMiddlewareHelpers.validateWrite({
			apiObjectSpec,
			op: 'update',
		}),
		_toRouterFn(ExpressRouterFunctionHelpers.batchUpdate),
	);
	return router;
};
