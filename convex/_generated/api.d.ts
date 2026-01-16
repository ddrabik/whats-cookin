/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as http from "../http.js";
import type * as myFunctions from "../myFunctions.js";
import type * as uploads_actions from "../uploads/actions.js";
import type * as uploads_constants from "../uploads/constants.js";
import type * as uploads_mutations from "../uploads/mutations.js";
import type * as uploads_queries from "../uploads/queries.js";
import type * as uploads_validation from "../uploads/validation.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  http: typeof http;
  myFunctions: typeof myFunctions;
  "uploads/actions": typeof uploads_actions;
  "uploads/constants": typeof uploads_constants;
  "uploads/mutations": typeof uploads_mutations;
  "uploads/queries": typeof uploads_queries;
  "uploads/validation": typeof uploads_validation;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
