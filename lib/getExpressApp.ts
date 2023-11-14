import * as cors from 'cors';
import * as express from 'express';
import {
	allowDebugRequests,
	initResLocals,
	sendResponse,
	logResponse,
	validateOwner,
} from './expressMiddlewareHelpers';
import { getExpressRouter } from './expressRouterHelpers';
import { ApiObjectSpec } from './typescript-api-helpers';

export const getExpressApp = (apiSpecs: ApiObjectSpec[]) => {
	const corsPolicy = cors.default({ origin: true, optionsSuccessStatus: 200 });

	const app = express.default();
	app.use(express.json());
	app.use(allowDebugRequests());
	app.use(initResLocals());
	app.use(validateOwner());
	apiSpecs.forEach((apiObjectSpec) => {
		const { apiObjectBaseEndpoint } = apiObjectSpec;
		app.options(`*/v0/${apiObjectBaseEndpoint}`, corsPolicy);
		app.use(
			`*/v0/${apiObjectBaseEndpoint}`,
			getExpressRouter({ apiObjectSpec }),
		);
	});
	app.use(sendResponse());
	app.use(logResponse());

	return app;
};
