import React from 'react';

const LoadingState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[500px] border rounded-lg p-8">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-600 mb-4"></div>
      <h3 className="text-lg font-medium mb-2">Loading your optimized resume...</h3>
      <p className="text-sm text-gray-500">Please wait while we fetch your data</p>
    </div>
  );
};

export default LoadingState;