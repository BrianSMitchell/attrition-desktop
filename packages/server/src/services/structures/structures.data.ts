import { buildingsCatalog, BuildingSpec, defensesCatalog, DefenseSpec } from '@game/shared';

export interface ServerStructuresCatalog {
  buildings: BuildingSpec[];
  defenses: DefenseSpec[];
}

export const getStructuresCatalog = (): ServerStructuresCatalog => {
  return {
    buildings: Object.values(buildingsCatalog),
    defenses: Object.values(defensesCatalog),
  };
}

export const getDefensesCatalog = (): DefenseSpec[] => {
  return Object.values(defensesCatalog);
}
