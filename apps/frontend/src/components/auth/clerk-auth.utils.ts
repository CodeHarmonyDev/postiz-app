'use client';

import { isClerkAPIResponseError } from '@clerk/nextjs/errors';
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';

const DEFAULT_AUTH_REDIRECT = '/launches';
const SSO_CALLBACK_PATH = '/auth/sso-callback';
const AUTH_COMPLETE_PATH = '/auth/complete';

export function readReturnUrl() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem('returnUrl');
}

export function consumeReturnUrl() {
  if (typeof window === 'undefined') {
    return DEFAULT_AUTH_REDIRECT;
  }

  const returnUrl = window.localStorage.getItem('returnUrl');
  window.localStorage.removeItem('returnUrl');
  return returnUrl || DEFAULT_AUTH_REDIRECT;
}

export function getAuthRedirectTarget() {
  return readReturnUrl() || DEFAULT_AUTH_REDIRECT;
}

export function getSsoRedirectUrl() {
  if (typeof window === 'undefined') {
    return SSO_CALLBACK_PATH;
  }

  return `${window.location.origin}${SSO_CALLBACK_PATH}`;
}

export function getAuthCompleteUrl() {
  return AUTH_COMPLETE_PATH;
}

export function setClerkFormError<T extends FieldValues>(
  form: UseFormReturn<T>,
  error: unknown,
  fieldMap: Partial<Record<string, Path<T>>>,
  fallbackField: Path<T>
) {
  if (hasClerkErrorMessage(error)) {
    form.setError(fallbackField, {
      type: 'manual',
      message: error.longMessage || error.message,
    });
    return;
  }

  if (!isClerkAPIResponseError(error)) {
    form.setError(fallbackField, {
      type: 'manual',
      message: 'Something went wrong. Please try again.',
    });
    return;
  }

  const apiError = error as {
    errors: Array<{
      code?: string;
      message?: string;
      longMessage?: string;
      meta?: { paramName?: string };
    }>;
  };
  const firstError = apiError.errors[0];
  const rawField = firstError?.meta?.paramName || '';
  const normalizedField = rawField.replace(/[_-]([a-z])/g, (_: string, letter: string) =>
    letter.toUpperCase()
  );
  const targetField =
    fieldMap[rawField] ||
    fieldMap[normalizedField] ||
    fieldMap[firstError?.code] ||
    fallbackField;

  form.setError(targetField, {
    type: 'manual',
    message:
      firstError?.longMessage ||
      firstError?.message ||
      'Something went wrong. Please try again.',
  });
}

function hasClerkErrorMessage(
  error: unknown
): error is { message: string; longMessage?: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  );
}
