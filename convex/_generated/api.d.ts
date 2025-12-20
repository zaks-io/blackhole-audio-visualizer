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
import type * as model_playlists_public from "../model/playlists/public.js";
import type * as model_presets_public from "../model/presets/public.js";
import type * as model_recordings_public from "../model/recordings/public.js";
import type * as model_users_public from "../model/users/public.js";

import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";

declare const fullApi: ApiFromModules<{
  http: typeof http;
  "model/playlists/public": typeof model_playlists_public;
  "model/presets/public": typeof model_presets_public;
  "model/recordings/public": typeof model_recordings_public;
  "model/users/public": typeof model_users_public;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;

export declare const components: {};
