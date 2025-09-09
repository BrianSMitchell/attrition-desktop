import React, { useMemo, useState } from 'react';
import { helpTopics, defaultTopicId, type HelpTopic, type HelpTopicId } from './helpData';
import { faqTopics, defaultFaqTopicId, type FaqTopic, type FaqTopicId } from './faqData';

type HelpTab = 'help' | 'faq' | 'ai' | 'settings';

const HelpPage: React.FC = () => {
  // Top-level tab state
  const [tab, setTab] = useState<HelpTab>('help');

  // Help tab state
  const [helpSelectedId, setHelpSelectedId] = useState<HelpTopicId>(defaultTopicId);

  // FAQ tab state
  const [faqSelectedId, setFaqSelectedId] = useState<FaqTopicId>(defaultFaqTopicId);

  // Compute Help view data
  const helpView = useMemo(() => {
    const main = helpTopics.filter((t) => (t.group ?? 'main') === 'main');
    const footer = helpTopics.filter((t) => t.group === 'footer');
    const found = helpTopics.find((t) => t.id === helpSelectedId) ?? helpTopics[0];
    return { mainTopics: main, footerTopics: footer, current: found as HelpTopic };
  }, [helpSelectedId]);

  // Compute FAQ view data (supporting optional group like help)
  const faqView = useMemo(() => {
    const main = faqTopics.filter((t) => (t.group ?? 'main') === 'main');
    const footer = faqTopics.filter((t) => t.group === 'footer');
    const found = faqTopics.find((t) => t.id === faqSelectedId) ?? faqTopics[0];
    return { mainTopics: main, footerTopics: footer, current: found as FaqTopic };
  }, [faqSelectedId]);

  // Tab button renderer
  const TabButton: React.FC<{ value: HelpTab; label: string }> = ({ value, label }) => (
    <button
      onClick={() => setTab(value)}
      className={`px-4 py-2 rounded-md text-sm font-semibold border border-gray-700 ${
        tab === value ? 'bg-gray-700 text-empire-gold' : 'text-gray-300 hover:text-white hover:bg-gray-700'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Top tabs */}
      <div className="flex gap-2">
        <TabButton value="help" label="Help" />
        <TabButton value="faq" label="FAQ" />
        <TabButton value="ai" label="AI Helper" />
        <TabButton value="settings" label="Settings" />
      </div>

      {/* Views */}
      {tab === 'help' && (
        <div className="flex gap-6">
          {/* Left navigation list */}
          <aside className="w-64 bg-gray-800 border border-gray-700 rounded-lg p-3 max-h-[72vh] overflow-auto">
            <h2 className="text-center text-empire-gold font-semibold mb-2">Help</h2>
            <nav className="space-y-1">
              {helpView.mainTopics.map((topic) => {
                const active = topic.id === helpSelectedId;
                return (
                  <button
                    key={topic.id}
                    onClick={() => setHelpSelectedId(topic.id)}
                    className={`w-full text-left px-3 py-2 rounded text-sm font-semibold ${
                      active ? 'bg-gray-700 text-empire-gold' : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    {topic.title}
                  </button>
                );
              })}
            </nav>

            {helpView.footerTopics.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-700 space-y-1">
                {helpView.footerTopics.map((topic) => {
                  const active = topic.id === helpSelectedId;
                  return (
                    <button
                      key={topic.id}
                      onClick={() => setHelpSelectedId(topic.id)}
                      className={`w-full text-left px-3 py-2 rounded text-sm font-semibold ${
                        active ? 'bg-gray-700 text-empire-gold' : 'text-gray-300 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      {topic.title}
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          {/* Main content panel */}
          <section className="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-6 min-h-[60vh]">
            <h1 className="text-2xl font-bold mb-4">{helpView.current.title}</h1>
            <div className="prose prose-invert max-w-none">{helpView.current.content}</div>
          </section>
        </div>
      )}

      {tab === 'faq' && (
        <div className="flex gap-6">
          {/* Left navigation list for FAQ */}
          <aside className="w-64 bg-gray-800 border border-gray-700 rounded-lg p-3 max-h-[72vh] overflow-auto">
            <h2 className="text-center text-empire-gold font-semibold mb-2">FAQ</h2>
            <nav className="space-y-1">
              {faqView.mainTopics.map((topic) => {
                const active = topic.id === faqSelectedId;
                return (
                  <button
                    key={topic.id}
                    onClick={() => setFaqSelectedId(topic.id)}
                    className={`w-full text-left px-3 py-2 rounded text-sm font-semibold ${
                      active ? 'bg-gray-700 text-empire-gold' : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    {topic.title}
                  </button>
                );
              })}
            </nav>

            {faqView.footerTopics.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-700 space-y-1">
                {faqView.footerTopics.map((topic) => {
                  const active = topic.id === faqSelectedId;
                  return (
                    <button
                      key={topic.id}
                      onClick={() => setFaqSelectedId(topic.id)}
                      className={`w-full text-left px-3 py-2 rounded text-sm font-semibold ${
                        active ? 'bg-gray-700 text-empire-gold' : 'text-gray-300 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      {topic.title}
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          {/* FAQ content panel */}
          <section className="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-6 min-h-[60vh]">
            <h1 className="text-2xl font-bold mb-4">{faqView.current.title}</h1>
            <div className="prose prose-invert max-w-none">
              {faqView.current.items.length === 0 ? (
                <p className="text-gray-400">Content coming soon.</p>
              ) : (
                <div className="space-y-6">
                  {faqView.current.items.map((it, idx) => (
                    <div key={idx} className="space-y-2">
                      <h3 className="text-lg font-semibold">{it.q}</h3>
                      <div className="space-y-2">{it.a}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {tab === 'ai' && (
        <section className="bg-gray-800 border border-gray-700 rounded-lg p-6 min-h-[40vh]">
          <h1 className="text-2xl font-bold mb-2">AI Helper</h1>
          <div className="prose prose-invert max-w-none">
            <p className="text-gray-300">
              An AI helper experience will be available here to answer questions, summarize topics, and
              guide new players. This section is a placeholder and will be implemented in a future update.
            </p>
          </div>
        </section>
      )}

      {tab === 'settings' && (
        <div className="space-y-6">
          <section className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h1 className="text-2xl font-bold mb-4">Application Settings</h1>
            <p className="text-gray-300 mb-6">
              Configure your Attrition desktop application preferences and settings.
            </p>
            
            <div className="space-y-6">
              <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-300 mb-3">🚀 Automatic Updates</h3>
                <div className="space-y-2 text-sm text-gray-300">
                  <p>
                    <strong>Updates are now managed by the Attrition Launcher.</strong>
                  </p>
                  <p>
                    The launcher automatically checks for updates every time you start the game and
                    ensures you always have the latest version before allowing you to play.
                  </p>
                  <p className="text-blue-300">
                    💡 <strong>No manual update checks needed!</strong> The launcher handles everything automatically.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default HelpPage;
