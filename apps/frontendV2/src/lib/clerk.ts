import { isClerkAPIResponseError } from '@clerk/react/errors'

type FieldMap = Record<string, string>

function toCamelCase(value: string) {
  return value.replace(/[_-]([a-z])/g, (_match: string, letter: string) => letter.toUpperCase())
}

export function getClerkErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
) {
  if (typeof error === 'object' && error !== null) {
    if ('longMessage' in error && typeof error.longMessage === 'string') {
      return error.longMessage
    }

    if ('message' in error && typeof error.message === 'string') {
      return error.message
    }
  }

  if (isClerkAPIResponseError(error)) {
    return (
      error.errors[0]?.longMessage ||
      error.errors[0]?.message ||
      fallback
    )
  }

  return fallback
}

export function getClerkFieldError(
  error: unknown,
  fieldMap: FieldMap,
  fallbackField: string,
  fallbackMessage = 'Something went wrong. Please try again.'
) {
  if (!isClerkAPIResponseError(error)) {
    return {
      field: fallbackField,
      message: getClerkErrorMessage(error, fallbackMessage),
    }
  }

  const firstError = error.errors[0]
  const rawField = firstError?.meta?.paramName || ''
  const normalizedField = toCamelCase(rawField)
  const field =
    fieldMap[rawField] ||
    fieldMap[normalizedField] ||
    fieldMap[firstError?.code || ''] ||
    fallbackField

  return {
    field,
    message:
      firstError?.longMessage ||
      firstError?.message ||
      fallbackMessage,
  }
}
