import React from 'react';
import { useModalStore } from '../../stores/modalStore';
import { Empire } from '@game/shared';
import Modal from '../ui/Modal';
import ResearchModal from './ResearchModal';
import GalaxyModal from './GalaxyModal';
import FleetModal from './FleetModal';
import GameInfoModal from './GameInfoModal';
import CapacityBreakdownModal from './CapacityBreakdownModal';
import EnergyBreakdownModal from './EnergyBreakdownModal';
import AreaBreakdownModal from './AreaBreakdownModal';
import PopulationBreakdownModal from './PopulationBreakdownModal';
import StructureLevelsModal from './StructureLevelsModal';
import { STRUCTURE_LEVEL_META } from './levelTables/structures';
import ResearchLevelsModal from './ResearchLevelsModal';
import { RESEARCH_LEVEL_META } from './levelTables/research';

interface ModalManagerProps {
  empire: Empire | null;
  onUpdate: () => void;
}

const ModalManager: React.FC<ModalManagerProps> = ({ empire, onUpdate }) => {
  const { isOpen, type, closeModal, data } = useModalStore();

  if (!isOpen || !type || !empire) {
    return null;
  }

  const getModalTitle = () => {
    switch (type) {
      case 'research':
        return '🔬 Research & Development';
      case 'galaxy':
        return '🗺️ Map';
      case 'fleet':
        return '🚀 Fleet Management';
      case 'game_info':
        return '📘 Game Info';
      case 'capacity_breakdown':
        return '📊 Capacity Breakdown';
      case 'energy_breakdown':
        return '⚡ Energy Breakdown';
      case 'area_breakdown':
        return '📐 Area Usage Breakdown';
      case 'population_breakdown':
        return '👥 Population Breakdown';
      case 'levels_table': {
        const sk = data?.structureKey as keyof typeof STRUCTURE_LEVEL_META | undefined;
        const title = sk && STRUCTURE_LEVEL_META[sk]?.title ? STRUCTURE_LEVEL_META[sk]?.title as string : 'Levels Table';
        return title;
      }
      case 'research_levels_table': {
        const tk = data?.techKey as keyof typeof RESEARCH_LEVEL_META | undefined;
        const title = tk && RESEARCH_LEVEL_META[tk]?.title ? (RESEARCH_LEVEL_META[tk]?.title as string) : 'Research Levels';
        return title;
      }
      default:
        return 'Game Interface';
    }
  };

  const getModalSize = () => {
    switch (type) {
      case 'research':
      case 'galaxy':
        return 'xl' as const;
      case 'fleet':
        return 'lg' as const;
      case 'game_info':
        return '2xl' as const;
      case 'capacity_breakdown':
        return 'lg' as const;
      case 'energy_breakdown':
      case 'area_breakdown':
      case 'population_breakdown':
        return 'lg' as const;
      case 'levels_table':
        return 'md' as const;
      case 'research_levels_table':
        return 'md' as const;
      default:
        return 'lg' as const;
    }
  };

  const renderModalContent = () => {
    switch (type) {
      case 'research':
        return (
          <ResearchModal
            empire={empire}
            onUpdate={onUpdate}
          />
        );
      case 'galaxy':
        return (
          <GalaxyModal
            empire={empire}
            onUpdate={onUpdate}
          />
        );
      case 'fleet':
        return (
          <FleetModal
            onUpdate={onUpdate}
          />
        );
      case 'game_info':
        return (
          <GameInfoModal
            empire={empire}
            onUpdate={onUpdate}
            initialTab={data?.initialTab}
          />
        );
      case 'capacity_breakdown':
        return (
          <CapacityBreakdownModal
            data={data}
          />
        );
      case 'energy_breakdown':
        return (
          <EnergyBreakdownModal
            data={data}
          />
        );
      case 'area_breakdown':
        return (
          <AreaBreakdownModal
            data={data}
          />
        );
      case 'population_breakdown':
        return (
          <PopulationBreakdownModal
            data={data}
          />
        );
      case 'levels_table':
        return (
          <StructureLevelsModal
            structureKey={data?.structureKey}
          />
        );
      case 'research_levels_table':
        return (
          <ResearchLevelsModal
            techKey={data?.techKey}
          />
        );
      default:
        return (
          <div className="text-center py-8">
            <p className="text-gray-400">Modal content not found.</p>
          </div>
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title={getModalTitle()}
      size={getModalSize()}
    >
      {renderModalContent()}
    </Modal>
  );
};

export default ModalManager;
