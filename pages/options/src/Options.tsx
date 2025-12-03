import { useState, useEffect } from 'react';
import '@src/Options.css';
import { Button } from '@extension/ui';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { t } from '@extension/i18n';
import { FiSettings, FiCpu, FiClock } from 'react-icons/fi';
import { GeneralSettings } from './components/GeneralSettings';
import { ModelSettings } from './components/ModelSettings';
import { MemorySettings } from './components/MemorySettings';

type TabTypes = 'general' | 'models' | 'memories';

const TABS: { id: TabTypes; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { id: 'general', icon: FiSettings, label: t('options_tabs_general') },
  { id: 'models', icon: FiCpu, label: t('options_tabs_models') },
  { id: 'memories', icon: FiClock, label: 'Memories' },
];

const Options = () => {
  const [activeTab, setActiveTab] = useState<TabTypes>('models');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Check for dark mode preference
  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeMediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    darkModeMediaQuery.addEventListener('change', handleChange);
    return () => darkModeMediaQuery.removeEventListener('change', handleChange);
  }, []);

  const handleTabClick = (tabId: TabTypes) => {
    setActiveTab(tabId);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralSettings isDarkMode={isDarkMode} />;
      case 'models':
        return <ModelSettings isDarkMode={isDarkMode} />;
      case 'memories':
        return <MemorySettings isDarkMode={isDarkMode} />;
      default:
        return null;
    }
  };

  return (
    <div className={`flex h-screen min-w-[768px] overflow-hidden ${isDarkMode ? 'text-gray-200' : 'text-gray-200'}`}>
      {/* Vertical Navigation Bar - Fixed sidebar */}
      <nav className={`w-48 flex-shrink-0 backdrop-blur-sm h-full`} style={{ backgroundColor: '#242424' }}>
        <div className="px-4 pt-16">
          {/* Title removed per request */}
          <ul className="space-y-2">
            {TABS.map(item => (
              <li key={item.id}>
                <Button
                  variant="secondary"
                  onClick={() => handleTabClick(item.id)}
                  className={`flex w-full items-center space-x-2 rounded-lg px-4 py-2 text-left text-base border-0 shadow-none outline-none focus:ring-0 focus:outline-none focus:border-0 focus-visible:outline-none active:border-0 active:ring-0 active:shadow-none active:outline-none 
                    ${activeTab === item.id ? '!bg-[#343434] text-white' : '!bg-transparent text-gray-300 hover:text-white hover:!bg-[#343434]'}`}
                  style={{ boxShadow: 'none', border: 'none', outline: 'none', minWidth: '160px' }}>
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Main Content Area - Fixed, no scroll on outer container */}
      <main className={`flex-1 p-8 backdrop-blur-sm h-full overflow-hidden`} style={{ backgroundColor: '#242424' }}>
        <div className="mx-auto min-w-[512px] max-w-screen-lg h-full">{renderTabContent()}</div>
      </main>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Options, <div>Loading...</div>), <div>Error Occurred</div>);
