import React from 'react';
import { usePWA } from '../hooks/usePWA';
import { Download, X } from 'lucide-react';

const PWAInstallPrompt: React.FC = () => {
  const { isInstallable, installApp } = usePWA();
  const [showPrompt, setShowPrompt] = React.useState(false);

  React.useEffect(() => {
    if (isInstallable) {
      // Show prompt after 3 seconds
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable]);

  if (!isInstallable || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 md:left-auto md:right-4 md:max-w-sm">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <Download className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Install LuckyPick</h3>
          <p className="text-xs text-blue-100 mt-1">
            Add to your home screen for quick access and offline use
          </p>
          <div className="flex space-x-2 mt-3">
            <button
              onClick={installApp}
              className="bg-white text-blue-600 px-3 py-1 rounded text-xs font-medium hover:bg-blue-50 transition-colors"
            >
              Install
            </button>
            <button
              onClick={() => setShowPrompt(false)}
              className="text-blue-100 px-3 py-1 rounded text-xs hover:text-white transition-colors"
            >
              Later
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowPrompt(false)}
          className="flex-shrink-0 text-blue-200 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;