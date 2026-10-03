import React from 'react';

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
  dismissible?: boolean;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  onDismiss,
  dismissible = true,
}) => {
  return (
    <div className="p-4 mb-4 bg-red-900/50 border border-red-800/50 text-red-400 rounded-lg flex items-center gap-3">
      <div className="flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
      </div>
      {dismissible && onDismiss ? (
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-red-200 flex-shrink-0 p-1 rounded"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ) : null}
    </div>
  );
};