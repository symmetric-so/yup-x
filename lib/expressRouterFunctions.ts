import * as Express from 'express';
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import {
	ApiObjectSpec,
	BaseApiObject,
	BaseCreateBody,
	BaseUpdateOperation,
} from './typescript-api-helpers';
import {
	TsResponse,
	isFile,
	getAlphabetizedObject,
	getTsErrorFn,
	toTsErrorResponse,
} from './typescript-helpers';

export type RouterFnStaticProps = {
	apiObjectSpec: ApiObjectSpec;
	projectId?: string;
};
export type RouterFnProps = RouterFnStaticProps & {
	res: Express.Response;
};
export type RouterFn = (routerFnProps: RouterFnProps) => Promise<TsResponse>;

const retrieveAllFromLocalDb: RouterFn = async ({
	apiObjectSpec,
	projectId = 'default',
	res,
}) => {
	typeof res;

	try {
		const EXPRESS_APP_LOCAL_RESOURCES_ROOT_DIRECTORY =
			process.env.EXPRESS_APP_LOCAL_RESOURCES_ROOT_DIRECTORY;

		if (EXPRESS_APP_LOCAL_RESOURCES_ROOT_DIRECTORY === undefined) {
			throw new Error(
				'EXPRESS_APP_LOCAL_RESOURCES_ROOT_DIRECTORY is undefined',
			);
		}
		const { apiObjectCollectionId, databaseId } = apiObjectSpec;
		const dbDir =
			EXPRESS_APP_LOCAL_RESOURCES_ROOT_DIRECTORY +
			'/' +
			projectId +
			'/databases/' +
			databaseId;
		mkdirSync(dbDir, { recursive: true });

		const apiObjectCollectionFilePath =
			dbDir + '/' + apiObjectCollectionId + '.json';

		if (!isFile(apiObjectCollectionFilePath)) {
			writeFileSync(apiObjectCollectionFilePath, '[]');
			return Promise.resolve(
				toTsErrorResponse(getTsErrorFn('collection.empty')),
			);
		}

		const apiObjectCollectionFileString = readFileSync(
			apiObjectCollectionFilePath,
			'utf8',
		);
		const apiObjectCollection: BaseApiObject[] = JSON.parse(
			apiObjectCollectionFileString,
		) as BaseApiObject[];
		if (apiObjectCollection.length === 0)
			return Promise.resolve(
				toTsErrorResponse(getTsErrorFn('collection.empty')),
			);
		return Promise.resolve({ data: apiObjectCollection, errors: [] });
	} catch (err) {
		console.error(err);
		throw err;
	}
};

export const retrieveAll: RouterFn = async (params) => {
	return retrieveAllFromLocalDb(params);
};

export const batchCreate: RouterFn = async ({
	apiObjectSpec,
	projectId = 'default',
	res,
}) => {
	try {
		const EXPRESS_APP_LOCAL_RESOURCES_ROOT_DIRECTORY =
			process.env.EXPRESS_APP_LOCAL_RESOURCES_ROOT_DIRECTORY;

		if (EXPRESS_APP_LOCAL_RESOURCES_ROOT_DIRECTORY === undefined) {
			throw new Error(
				'EXPRESS_APP_LOCAL_RESOURCES_ROOT_DIRECTORY is undefined',
			);
		}
		const { apiObjectCollectionId, databaseId } = apiObjectSpec;
		const validCreateWrites = res.locals.validWrites as BaseCreateBody[];
		const userId = (res.locals.userId as string) || 'default';
		const newApiObjects = validCreateWrites
			.map((createParams) =>
				apiObjectSpec.mergeCreateParams({
					_ref_user: userId,
					createParams,
				}),
			)
			.map(getAlphabetizedObject);

		const dbDir =
			EXPRESS_APP_LOCAL_RESOURCES_ROOT_DIRECTORY +
			'/' +
			projectId +
			'/databases/' +
			databaseId;
		mkdirSync(dbDir, { recursive: true });

		const apiObjectCollectionFilePath =
			dbDir + '/' + apiObjectCollectionId + '.json';

		if (!isFile(apiObjectCollectionFilePath)) {
			writeFileSync(apiObjectCollectionFilePath, '[]');
		}

		const apiObjectCollectionFileString = readFileSync(
			apiObjectCollectionFilePath,
			'utf8',
		);

		const apiObjectCollection: BaseApiObject[] = JSON.parse(
			apiObjectCollectionFileString,
		) as BaseApiObject[];

		writeFileSync(
			apiObjectCollectionFilePath,
			JSON.stringify([...apiObjectCollection, ...newApiObjects], null, 2),
		);

		return Promise.resolve({ data: newApiObjects, errors: [] });
	} catch (err) {
		console.error(err);
		throw err;
	}
};

export const batchUpdate: RouterFn = async ({
	apiObjectSpec,
	projectId = 'default',
	res,
}) => {
	try {
		const EXPRESS_APP_LOCAL_RESOURCES_ROOT_DIRECTORY =
			process.env.EXPRESS_APP_LOCAL_RESOURCES_ROOT_DIRECTORY;

		if (EXPRESS_APP_LOCAL_RESOURCES_ROOT_DIRECTORY === undefined) {
			throw new Error(
				'EXPRESS_APP_LOCAL_RESOURCES_ROOT_DIRECTORY is undefined',
			);
		}
		const validUpdateWrites = res.locals.validWrites as BaseUpdateOperation[];
		const { apiObjectCollectionId, databaseId } = apiObjectSpec;
		const dbDir =
			EXPRESS_APP_LOCAL_RESOURCES_ROOT_DIRECTORY +
			'/' +
			projectId +
			'/databases/' +
			databaseId;

		mkdirSync(dbDir, { recursive: true });

		const apiObjectCollectionFilePath =
			dbDir + '/' + apiObjectCollectionId + '.json';

		if (!isFile(apiObjectCollectionFilePath)) {
			writeFileSync(apiObjectCollectionFilePath, '[]');
		}

		const apiObjectCollectionFileString = readFileSync(
			apiObjectCollectionFilePath,
			'utf8',
		);

		const apiObjectCollection: BaseApiObject[] = JSON.parse(
			apiObjectCollectionFileString,
		) as BaseApiObject[];

		const modifiedApiObjects = await Promise.all(
			validUpdateWrites.map(async (updateOperation) => {
				const prevApiObjectIndex = apiObjectCollection.findIndex(
					(apiObject) => apiObject._id === updateOperation._id,
				);
				if (prevApiObjectIndex === -1) throw new Error();
				const prevApiObject = apiObjectCollection[prevApiObjectIndex];
				if (prevApiObject === undefined) throw new Error();
				const newApiObject = apiObjectSpec.mergeUpdateParams({
					prevApiObjectJson: prevApiObject,
					updateParams: updateOperation.updateParams,
				});
				apiObjectCollection[prevApiObjectIndex] = newApiObject;
				return Promise.resolve(newApiObject);
			}),
		);

		writeFileSync(
			apiObjectCollectionFilePath,
			JSON.stringify(apiObjectCollection, null, 2),
		);

		return Promise.resolve({ data: modifiedApiObjects, errors: [] });
	} catch (err) {
		console.error(err);
		throw err;
	}
};
