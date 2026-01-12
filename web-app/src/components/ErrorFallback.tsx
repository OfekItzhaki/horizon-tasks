import { FallbackProps } from 'react-error-boundary';

export default function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-lg w-full bg-white rounded-lg shadow p-6">
        <h1 className="text-xl font-semibold text-gray-900">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-gray-700">
          The app hit an unexpected error. You can try reloading the UI.
        </p>

        <pre className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-800 overflow-auto">
          {error?.message ?? String(error)}
        </pre>

        <div className="mt-4 flex gap-2">
          <button
            onClick={resetErrorBoundary}
            className="inline-flex justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex justify-center rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-300"
          >
            Reload page
          </button>
        </div>
      </div>
    </div>
  );
}

