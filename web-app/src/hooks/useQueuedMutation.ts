import { useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

/**
 * Hook that wraps React Query mutations to queue them asynchronously
 * and prevent UI blocking when multiple mutations are triggered rapidly.
 * 
 * Key features:
 * 1. Optimistic updates happen IMMEDIATELY (synchronously) - UI updates instantly
 * 2. API calls are queued using setTimeout(0) to yield to event loop
 * 3. Multiple rapid clicks all apply optimistic updates immediately
 * 4. No button disabling - UI always remains responsive
 */
export function useQueuedMutation<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown
>(
  options: UseMutationOptions<TData, TError, TVariables, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> {
  const mutation = useMutation(options);
  // Track pending mutations to prevent duplicate API calls for same action
  const pendingRef = useRef<Map<string, boolean>>(new Map());

  const queuedMutate = useCallback(
    (variables: TVariables, mutateOptions?: Parameters<typeof mutation.mutate>[1]) => {
      // STEP 1: Apply optimistic update IMMEDIATELY (synchronously)
      // This MUST happen before any async work to ensure UI updates instantly
      let context: TContext | undefined;
      if (options.onMutate) {
        try {
          const result = (options.onMutate as (v: TVariables) => TContext | Promise<TContext>)(variables);
          // Handle both sync and async onMutate
          if (result && typeof result === 'object' && 'then' in result) {
            // It's a promise - resolve it but don't wait
            (result as Promise<TContext>)
              .then((ctx) => {
                context = ctx;
              })
              .catch(() => {
                // Ignore errors in onMutate promise
              });
          } else {
            context = result as TContext;
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn('onMutate error:', error);
          }
        }
      }

      // STEP 2: Queue the actual API call using setTimeout(0)
      // This yields to the event loop, allowing UI to remain responsive
      // Multiple rapid clicks will all queue their API calls without blocking
      const mutationKey = JSON.stringify(variables);
      
      // Prevent duplicate API calls for the exact same mutation
      if (pendingRef.current.has(mutationKey)) {
        return; // Already queued, skip
      }
      
      pendingRef.current.set(mutationKey, true);

      // Use setTimeout(0) instead of queueMicrotask for better browser compatibility
      // and to ensure it runs in the next event loop tick
      setTimeout(() => {
        mutation.mutate(
          variables,
          {
            ...mutateOptions,
            onError: (error: TError, vars: TVariables, ctx: TContext | undefined, mutation?: unknown) => {
              const errorContext = ctx ?? context;
              (mutateOptions?.onError as ((e: TError, v: TVariables, c: TContext | undefined, m?: unknown) => void) | undefined)?.(error, vars, errorContext, mutation);
              (options.onError as ((e: TError, v: TVariables, c: TContext | undefined, m?: unknown) => void) | undefined)?.(error, vars, errorContext, mutation);
              pendingRef.current.delete(mutationKey);
            },
            onSuccess: (data: TData, vars: TVariables, ctx: TContext | undefined, mutation?: unknown) => {
              const successContext = ctx ?? context;
              (mutateOptions?.onSuccess as ((d: TData, v: TVariables, c: TContext | undefined, m?: unknown) => void) | undefined)?.(data, vars, successContext, mutation);
              (options.onSuccess as ((d: TData, v: TVariables, c: TContext | undefined, m?: unknown) => void) | undefined)?.(data, vars, successContext, mutation);
              pendingRef.current.delete(mutationKey);
            },
            onSettled: (data: TData | undefined, error: TError | null, vars: TVariables, ctx: TContext | undefined, mutation?: unknown) => {
              const settledContext = ctx ?? context;
              (mutateOptions?.onSettled as ((d: TData | undefined, e: TError | null, v: TVariables, c: TContext | undefined, m?: unknown) => void) | undefined)?.(data, error, vars, settledContext, mutation);
              (options.onSettled as ((d: TData | undefined, e: TError | null, v: TVariables, c: TContext | undefined, m?: unknown) => void) | undefined)?.(data, error, vars, settledContext, mutation);
              pendingRef.current.delete(mutationKey);
            },
          }
        );
      }, 0);
    },
    [mutation, options]
  );

  return {
    ...mutation,
    mutate: queuedMutate,
    mutateAsync: mutation.mutateAsync,
  } as UseMutationResult<TData, TError, TVariables, TContext>;
}
