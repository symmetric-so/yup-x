import * as R from 'ramda';
import * as Express from 'express';
import { ValidationError } from 'yup';
import {
	ApiObjectSpec,
	BaseCreateBody,
	BaseUpdateOperation,
	WriteOperation,
} from './typescript-api-helpers';
import {
	isTsErrorResponse,
	TsResponse,
	getTsErrorResponse,
	getTsErrorFn,
} from './typescript-helpers/function-response-helpers';

const _validateCreateWrite =
	(apiObjectSpec: ApiObjectSpec) => (createWrite: BaseCreateBody) => {
		return apiObjectSpec.createParamsJsonSchema.validateSync(
			R.pick(apiObjectSpec.createParamsFieldEnum.arr, createWrite),
		);
	};
const _validateUpdateWrite =
	(apiObjectSpec: ApiObjectSpec) => (updateWrite: BaseUpdateOperation) => {
		const updateParams = R.pick(
			apiObjectSpec.updateParamsFieldEnum.arr,
			updateWrite.updateParams,
		);
		return {
			_id: updateWrite._id,
			updateParams: apiObjectSpec.updateParamsJsonSchema
				.pick(Object.keys(updateParams))
				.validateSync(updateParams),
		};
	};

type ValidateWriteProps = {
	apiObjectSpec: ApiObjectSpec;
	op: WriteOperation;
};
export const validateWrite =
	({ apiObjectSpec, op }: ValidateWriteProps) =>
	(req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
		if (isTsErrorResponse(res.locals as TsResponse)) return next();
		try {
			const createWrites = req.body as BaseCreateBody[];
			const updateWrites = req.body as BaseUpdateOperation[];
			const writes = op === 'create' ? createWrites : updateWrites;
			if (
				!Array.isArray(writes) ||
				writes.length === 0 ||
				writes.some(
					(write) =>
						(op === 'create'
							? Object.keys(write)
							: Object.keys((write as BaseUpdateOperation)?.updateParams)
						).length === 0,
				)
			)
				throw new Error();
			const validateCreateWrite = _validateCreateWrite(apiObjectSpec);
			const validateUpdateWrite = _validateUpdateWrite(apiObjectSpec);
			const validWrites =
				op === 'create'
					? createWrites.map(validateCreateWrite)
					: updateWrites.map(validateUpdateWrite);
			res.locals.validWrites = validWrites;
			return next();
		} catch (err) {
			const validationError = err as ValidationError;
			const msg =
				validationError instanceof ValidationError
					? validationError.message
					: JSON.stringify(validationError);
			res.locals = {
				...res.locals,
				...getTsErrorResponse(getTsErrorFn('request.invalid-params'), msg),
			};
			return next();
		}
	};
