'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { CheckCircle, XCircle, GitCommit, Upload } from 'lucide-react';

interface GitOperationStatusProps {
  isVisible: boolean;
  operation: 'commit' | 'push' | 'check';
  status: 'idle' | 'running' | 'success' | 'error';
  message?: string;
  onClose?: () => void;
}

export default function GitOperationStatus({
  isVisible,
  operation,
  status,
  message,
  onClose,
}: GitOperationStatusProps) {
  const [show, setShow] = useState(isVisible);

  useEffect(() => {
    setShow(isVisible);
  }, [isVisible]);

  useEffect(() => {
    if (status === 'success' || status === 'error') {
      const timer = setTimeout(() => {
        setShow(false);
        onClose?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, onClose]);

  if (!show) return null;

  const getOperationIcon = () => {
    switch (operation) {
      case 'commit':
        return <GitCommit size={16} />;
      case 'push':
        return <Upload size={16} />;
      case 'check':
        return <CheckCircle size={16} />;
      default:
        return <GitCommit size={16} />;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <LoadingSpinner size={16} />;
      case 'success':
        return <CheckCircle size={16} className='text-green-500' />;
      case 'error':
        return <XCircle size={16} className='text-red-500' />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return 'border-blue-200 bg-blue-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getOperationText = () => {
    switch (operation) {
      case 'commit':
        return 'Committing changes...';
      case 'push':
        return 'Pushing to remote...';
      case 'check':
        return 'Running checks...';
      default:
        return 'Git operation...';
    }
  };

  return (
    <div className='fixed top-4 right-4 z-50'>
      <div
        className={`
        flex items-center space-x-3 px-4 py-3 rounded-lg border shadow-lg
        ${getStatusColor()}
        transition-all duration-300 ease-in-out
        ${show ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}
      `}
      >
        <div className='flex items-center space-x-2'>
          {getOperationIcon()}
          <span className='text-sm font-medium text-gray-700'>
            {status === 'running'
              ? getOperationText()
              : operation.charAt(0).toUpperCase() + operation.slice(1)}
          </span>
        </div>

        <div className='flex items-center space-x-2'>
          {getStatusIcon()}
          {message && (
            <span className='text-xs text-gray-600 max-w-xs truncate'>
              {message}
            </span>
          )}
        </div>

        {status === 'success' || status === 'error' ? (
          <button
            onClick={() => {
              setShow(false);
              onClose?.();
            }}
            className='text-gray-400 hover:text-gray-600 transition-colors'
          >
            <XCircle size={14} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
