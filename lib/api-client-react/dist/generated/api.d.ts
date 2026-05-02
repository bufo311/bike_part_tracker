import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import type { BikeComponent, BikeComponentInput, ErrorResponse, HealthStatus, Profile, ProfileInput } from "./api.schemas";
import { customFetch } from "../custom-fetch";
import type { ErrorType, BodyType } from "../custom-fetch";
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
/**
 * Returns server health status
 * @summary Health check
 */
export declare const getHealthCheckUrl: () => string;
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get rider profile
 */
export declare const getGetProfileUrl: () => string;
export declare const getProfile: (options?: RequestInit) => Promise<Profile>;
export declare const getGetProfileQueryKey: () => readonly ["/api/profile"];
export declare const getGetProfileQueryOptions: <TData = Awaited<ReturnType<typeof getProfile>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProfile>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getProfile>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetProfileQueryResult = NonNullable<Awaited<ReturnType<typeof getProfile>>>;
export type GetProfileQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get rider profile
 */
export declare function useGetProfile<TData = Awaited<ReturnType<typeof getProfile>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProfile>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create or update rider profile
 */
export declare const getUpsertProfileUrl: () => string;
export declare const upsertProfile: (profileInput: ProfileInput, options?: RequestInit) => Promise<Profile>;
export declare const getUpsertProfileMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof upsertProfile>>, TError, {
        data: BodyType<ProfileInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof upsertProfile>>, TError, {
    data: BodyType<ProfileInput>;
}, TContext>;
export type UpsertProfileMutationResult = NonNullable<Awaited<ReturnType<typeof upsertProfile>>>;
export type UpsertProfileMutationBody = BodyType<ProfileInput>;
export type UpsertProfileMutationError = ErrorType<unknown>;
/**
 * @summary Create or update rider profile
 */
export declare const useUpsertProfile: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof upsertProfile>>, TError, {
        data: BodyType<ProfileInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof upsertProfile>>, TError, {
    data: BodyType<ProfileInput>;
}, TContext>;
/**
 * @summary Get all bike components
 */
export declare const getGetComponentsUrl: () => string;
export declare const getComponents: (options?: RequestInit) => Promise<BikeComponent[]>;
export declare const getGetComponentsQueryKey: () => readonly ["/api/components"];
export declare const getGetComponentsQueryOptions: <TData = Awaited<ReturnType<typeof getComponents>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getComponents>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getComponents>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetComponentsQueryResult = NonNullable<Awaited<ReturnType<typeof getComponents>>>;
export type GetComponentsQueryError = ErrorType<unknown>;
/**
 * @summary Get all bike components
 */
export declare function useGetComponents<TData = Awaited<ReturnType<typeof getComponents>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getComponents>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Log a component installation
 */
export declare const getCreateComponentUrl: () => string;
export declare const createComponent: (bikeComponentInput: BikeComponentInput, options?: RequestInit) => Promise<BikeComponent>;
export declare const getCreateComponentMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createComponent>>, TError, {
        data: BodyType<BikeComponentInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createComponent>>, TError, {
    data: BodyType<BikeComponentInput>;
}, TContext>;
export type CreateComponentMutationResult = NonNullable<Awaited<ReturnType<typeof createComponent>>>;
export type CreateComponentMutationBody = BodyType<BikeComponentInput>;
export type CreateComponentMutationError = ErrorType<unknown>;
/**
 * @summary Log a component installation
 */
export declare const useCreateComponent: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createComponent>>, TError, {
        data: BodyType<BikeComponentInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createComponent>>, TError, {
    data: BodyType<BikeComponentInput>;
}, TContext>;
/**
 * @summary Get a specific component
 */
export declare const getGetComponentUrl: (id: number) => string;
export declare const getComponent: (id: number, options?: RequestInit) => Promise<BikeComponent>;
export declare const getGetComponentQueryKey: (id: number) => readonly [`/api/components/${number}`];
export declare const getGetComponentQueryOptions: <TData = Awaited<ReturnType<typeof getComponent>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getComponent>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getComponent>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetComponentQueryResult = NonNullable<Awaited<ReturnType<typeof getComponent>>>;
export type GetComponentQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get a specific component
 */
export declare function useGetComponent<TData = Awaited<ReturnType<typeof getComponent>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getComponent>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update a component
 */
export declare const getUpdateComponentUrl: (id: number) => string;
export declare const updateComponent: (id: number, bikeComponentInput: BikeComponentInput, options?: RequestInit) => Promise<BikeComponent>;
export declare const getUpdateComponentMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateComponent>>, TError, {
        id: number;
        data: BodyType<BikeComponentInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateComponent>>, TError, {
    id: number;
    data: BodyType<BikeComponentInput>;
}, TContext>;
export type UpdateComponentMutationResult = NonNullable<Awaited<ReturnType<typeof updateComponent>>>;
export type UpdateComponentMutationBody = BodyType<BikeComponentInput>;
export type UpdateComponentMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Update a component
 */
export declare const useUpdateComponent: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateComponent>>, TError, {
        id: number;
        data: BodyType<BikeComponentInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateComponent>>, TError, {
    id: number;
    data: BodyType<BikeComponentInput>;
}, TContext>;
/**
 * @summary Delete a component record
 */
export declare const getDeleteComponentUrl: (id: number) => string;
export declare const deleteComponent: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteComponentMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteComponent>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteComponent>>, TError, {
    id: number;
}, TContext>;
export type DeleteComponentMutationResult = NonNullable<Awaited<ReturnType<typeof deleteComponent>>>;
export type DeleteComponentMutationError = ErrorType<unknown>;
/**
 * @summary Delete a component record
 */
export declare const useDeleteComponent: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteComponent>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteComponent>>, TError, {
    id: number;
}, TContext>;
export {};
//# sourceMappingURL=api.d.ts.map