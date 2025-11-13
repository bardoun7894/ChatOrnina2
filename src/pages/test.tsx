import React, { useState } from 'react';
import AIAdvancedButton from '@/components/HomeChat/AIAdvancedButton';

export default function Test() {
  const [isActive, setIsActive] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Test Magical UI Effect
        </h1>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          Click the AI Advanced button in the top-right corner to see the magical UI effect with spreading stars and light bursts.
        </p>
        
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Current State
          </h2>
          <p className="text-gray-600 mb-4">
            AI Advanced Mode: <span className={`font-bold ${isActive ? 'text-purple-600' : 'text-gray-500'}`}>
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </p>
          <button
            onClick={() => setIsActive(!isActive)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Toggle State Programmatically
          </button>
        </div>
      </div>
      
      <AIAdvancedButton
        isActive={isActive}
        onToggle={() => setIsActive(!isActive)}
        className="right-14"
      />
    </div>
  );
}
