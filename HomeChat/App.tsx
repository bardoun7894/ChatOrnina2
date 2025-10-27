import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="relative flex h-full rounded-3xl overflow-hidden shadow-sm bg-white">
      {/* Mobile Sidebar (Overlay) */}
      <div
        className={`fixed top-0 left-0 h-full z-40 transform transition-transform duration-300 ease-in-out lg:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } w-full max-w-xs sm:max-w-sm`}
        role="dialog"
        aria-modal="true"
      >
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        ></div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>
      
      <main className="flex-1 flex flex-col min-w-0">
        <Chat onMenuClick={() => setIsSidebarOpen(true)} />
      </main>
    </div>
  );
};

export default App;
