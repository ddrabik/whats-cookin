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
import type * as recipePipeline from "../recipePipeline.js";
import type * as recipes from "../recipes.js";
import type * as uploads_actions from "../uploads/actions.js";
import type * as uploads_constants from "../uploads/constants.js";
import type * as uploads_mutations from "../uploads/mutations.js";
import type * as uploads_queries from "../uploads/queries.js";
import type * as uploads_validation from "../uploads/validation.js";
import type * as vision_actions from "../vision/actions.js";
import type * as vision_constants from "../vision/constants.js";
import type * as vision_mutations from "../vision/mutations.js";
import type * as vision_queries from "../vision/queries.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  http: typeof http;
  recipePipeline: typeof recipePipeline;
  recipes: typeof recipes;
  "uploads/actions": typeof uploads_actions;
  "uploads/constants": typeof uploads_constants;
  "uploads/mutations": typeof uploads_mutations;
  "uploads/queries": typeof uploads_queries;
  "uploads/validation": typeof uploads_validation;
  "vision/actions": typeof vision_actions;
  "vision/constants": typeof vision_constants;
  "vision/mutations": typeof vision_mutations;
  "vision/queries": typeof vision_queries;
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
