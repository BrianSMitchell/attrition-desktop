import React, { useState, useEffect } from 'react';
import { Empire, ResearchProject } from '@game/shared';
import { gameApi } from '../../stores/services/gameApi';

interface ResearchTemplate {
  type: 'military' | 'economic' | 'exploration';
  name: string;
  description: string;
  researchCost: number;
  benefits: {
    resourceBonus?: {
      creditsPerHour?: number;
    };
    buildingUnlock?: string[];
    shipUnlock?: string[];
    other?: string[];
  };
}

interface ResearchModalProps {
  empire: Empire;
  onUpdate: () => void;
}

const ResearchModal: React.FC<ResearchModalProps> = ({ empire, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'available' | 'active' | 'completed'>('available');
  const [researchProjects, setResearchProjects] = useState<ResearchProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Predefined research templates
  const researchTemplates: ResearchTemplate[] = [
    // Military Research
    {
      type: 'military',
      name: 'Advanced Weaponry',
      description: 'Develop more powerful weapons for your defense stations and fleets.',
      researchCost: 500,
      benefits: {
        other: ['Increases defense station effectiveness by 25%', 'Unlocks advanced weapon systems']
      }
    },
    {
      type: 'military',
      name: 'Shield Technology',
      description: 'Research protective shield systems for buildings and ships.',
      researchCost: 750,
      benefits: {
        other: ['Reduces building damage by 20%', 'Unlocks shield generators']
      }
    },
    {
      type: 'military',
      name: 'Tactical Systems',
      description: 'Improve command and control systems for better military coordination.',
      researchCost: 1000,
      benefits: {
        other: ['Increases fleet coordination', 'Unlocks advanced military buildings']
      }
    },

    // Economic Research
    {
      type: 'economic',
      name: 'Mining Efficiency',
      description: 'Improve mining techniques to extract more resources from deposits.',
      researchCost: 300,
      benefits: {
        resourceBonus: {
          creditsPerHour: 10
        },
        other: ['Increases all mine production by 20%']
      }
    },
    {
      type: 'economic',
      name: 'Energy Optimization',
      description: 'Develop more efficient energy production and distribution systems.',
      researchCost: 400,
      benefits: {
        resourceBonus: {
          creditsPerHour: 15
        },
        other: ['Increases all energy plant production by 20%']
      }
    },
    {
      type: 'economic',
      name: 'Industrial Automation',
      description: 'Automate production processes to increase factory output.',
      researchCost: 600,
      benefits: {
        other: ['Increases factory production by 30%', 'Reduces construction time by 10%']
      }
    },
    {
      type: 'economic',
      name: 'Trade Networks',
      description: 'Establish efficient trade routes to boost economic growth.',
      researchCost: 800,
      benefits: {
        other: ['Increases credit generation by 25%', 'Unlocks trade buildings']
      }
    },

    // Exploration Research
    {
      type: 'exploration',
      name: 'Advanced Sensors',
      description: 'Develop better scanning technology to explore the galaxy more effectively.',
      researchCost: 350,
      benefits: {
        other: ['Reveals more information about locations', 'Increases exploration range']
      }
    },
    {
      type: 'exploration',
      name: 'Faster-Than-Light Travel',
      description: 'Research improved propulsion systems for faster interstellar travel.',
      researchCost: 1200,
      benefits: {
        other: ['Reduces fleet travel time by 50%', 'Unlocks advanced ship designs']
      }
    },
    {
      type: 'exploration',
      name: 'Xenobiology',
      description: 'Study alien life forms and ecosystems for scientific advancement.',
      researchCost: 500,
      benefits: {
        resourceBonus: {
          creditsPerHour: 20
        },
        other: ['Increases research lab efficiency by 25%']
      }
    },
    {
      type: 'exploration',
      name: 'Terraforming Technology',
      description: 'Develop the ability to transform hostile worlds into habitable colonies.',
      researchCost: 1500,
      benefits: {
        other: ['Unlocks terraforming equipment', 'Increases colony growth rate']
      }
    }
  ];

  // Fetch research projects
  const fetchResearchProjects = async () => {
    try {
      const response = await gameApi.getResearchProjects();
      if (response.success && response.data) {
        setResearchProjects(response.data.researchProjects || []);
      } else {
        setError(response.error || 'Failed to load research projects');
      }
    } catch (err) {
      console.error('Error fetching research projects:', err);
      setError('Failed to load research projects');
    }
  };

  // Start research project
  const handleStartResearch = async (template: ResearchTemplate) => {
    if (empire.resources.credits < template.researchCost) {
      setError('Insufficient credits');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const projectData = {
        type: template.type,
        name: template.name,
        description: template.description,
        researchCost: template.researchCost
      };

      const response = await gameApi.startResearchProject(projectData);

      if (response.success) {
        await fetchResearchProjects();
        onUpdate(); // Update dashboard
        setActiveTab('active');
      } else {
        setError(response.error || 'Failed to start research');
      }
    } catch (err: any) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get research type icon
  const getResearchIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      military: '⚔️',
      economic: '💰',
      exploration: '🚀'
    };
    return icons[type] || '🔬';
  };

  // Get research type color
  const getResearchColor = (type: string) => {
    const colors: { [key: string]: string } = {
      military: 'text-red-400',
      economic: 'text-yellow-400',
      exploration: 'text-blue-400'
    };
    return colors[type] || 'text-purple-400';
  };

  // Check if research is already completed or in progress
  const isResearchAvailable = (template: ResearchTemplate) => {
    return !researchProjects.some(project => 
      project.name === template.name && (project.isCompleted || !project.isCompleted)
    );
  };

  // Calculate research progress percentage
  const getResearchProgress = (project: ResearchProject) => {
    return Math.min(100, (project.researchProgress / project.researchCost) * 100);
  };

  // Estimate completion time
  const estimateCompletionTime = (project: ResearchProject) => {
    const remaining = project.researchCost - project.researchProgress;
    // For now, use a default research rate until we implement the new capacity system
    const researchPerHour = 10; // Default research production

    if (researchPerHour <= 0) return 'Never (no research production)';

    const hoursRemaining = remaining / researchPerHour;

    if (hoursRemaining < 1) return 'Less than 1 hour';
    if (hoursRemaining < 24) return `${Math.ceil(hoursRemaining)} hours`;

    const daysRemaining = Math.ceil(hoursRemaining / 24);
    return `${daysRemaining} days`;
  };

  useEffect(() => {
    fetchResearchProjects();
    // Fetch fresh research data every 60 seconds for real-time updates
    const fetchId = setInterval(() => {
      fetchResearchProjects();
    }, 60000);
    return () => clearInterval(fetchId);
  }, []);

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-700 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('available')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'available'
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:text-white hover:bg-gray-600'
          }`}
        >
          🔬 Available
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'active'
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:text-white hover:bg-gray-600'
          }`}
        >
          ⏳ In Progress
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'completed'
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:text-white hover:bg-gray-600'
          }`}
        >
          ✅ Completed
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200">
          {error}
        </div>
      )}

      {/* Research Funding Display */}
      <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Available Credits for Research:</span>
          <span className="text-yellow-400 font-mono text-lg">
            💰 {empire.resources.credits.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-gray-400 text-sm">Research funded by credits</span>
          <span className="text-blue-400 text-sm">
            Pay per project
          </span>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'available' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Available Research Projects</h3>
          
          {/* Research Categories */}
          {['military', 'economic', 'exploration'].map((category) => (
            <div key={category} className="space-y-3">
              <h4 className={`font-medium capitalize flex items-center gap-2 ${getResearchColor(category)}`}>
                {getResearchIcon(category)} {category} Research
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {researchTemplates
                  .filter(template => template.type === category && isResearchAvailable(template))
                  .map((template) => {
                    const canAfford = empire.resources.credits >= template.researchCost;

                    return (
                      <div
                        key={template.name}
                        className={`p-4 rounded-lg border ${
                          canAfford ? 'border-gray-600 bg-gray-700' : 'border-red-600 bg-red-900/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-white flex items-center gap-2">
                            {getResearchIcon(template.type)} {template.name}
                          </h5>
                          <span className={`text-xs px-2 py-1 rounded ${
                            canAfford ? 'bg-yellow-600 text-white' : 'bg-red-600 text-white'
                          }`}>
                            💰 {template.researchCost.toLocaleString()}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-400 mb-3">{template.description}</p>
                        
                        <div className="space-y-2">
                          <div className="text-xs">
                            <span className="text-gray-400">Benefits:</span>
                            <ul className="mt-1 space-y-1">
                              {template.benefits.resourceBonus && (
                                <li className="text-green-400">
                                  {template.benefits.resourceBonus.creditsPerHour && `+${template.benefits.resourceBonus.creditsPerHour} Credits/hour`}
                                </li>
                              )}
                              {template.benefits.other?.map((benefit, index) => (
                                <li key={index} className="text-blue-400">• {benefit}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleStartResearch(template)}
                          disabled={!canAfford || loading}
                          className={`w-full mt-3 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                            canAfford
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {loading ? 'Starting Research...' : 'Fund Research'}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'active' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Active Research Projects</h3>
          {researchProjects.filter(p => !p.isCompleted).length === 0 ? (
            <p className="text-gray-400">No active research projects. Start a new research project to see progress here!</p>
          ) : (
            <div className="space-y-3">
              {researchProjects.filter(p => !p.isCompleted).map((project) => {
                const progress = getResearchProgress(project);
                const estimatedTime = estimateCompletionTime(project);

                return (
                  <div key={project._id} className="p-4 bg-gray-700 rounded-lg border border-gray-600">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-white flex items-center gap-2">
                        {getResearchIcon(project.type)} {project.name}
                      </h4>
                      <span className={`text-xs px-2 py-1 rounded ${getResearchColor(project.type)} bg-gray-800`}>
                        {project.type}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-400 mb-3">{project.description}</p>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Progress:</span>
                        <span className="text-white">
                          {project.researchProgress.toLocaleString()} / {project.researchCost.toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="w-full bg-gray-600 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>{progress.toFixed(1)}% complete</span>
                        <span>ETA: {estimatedTime}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'completed' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Completed Research</h3>
          {researchProjects.filter(p => p.isCompleted).length === 0 ? (
            <p className="text-gray-400">No completed research yet. Complete research projects to see them here!</p>
          ) : (
            <div className="space-y-3">
              {researchProjects.filter(p => p.isCompleted).map((project) => (
                <div key={project._id} className="p-4 bg-green-900/20 rounded-lg border border-green-600">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-white flex items-center gap-2">
                      ✅ {getResearchIcon(project.type)} {project.name}
                    </h4>
                    <span className="text-xs text-green-400">
                      Completed {project.completedAt ? new Date(project.completedAt).toLocaleDateString() : 'Recently'}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-400 mb-2">{project.description}</p>
                  
                  <div className="text-xs text-green-400">
                    ✨ Research benefits are now active across your empire!
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResearchModal;
