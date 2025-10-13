---
description: Guidelines for implementing complex React component architectures with multiple interconnected components, state management, and API integration
author: Cline Self-Improvement Protocol
version: 1.0
tags: ["react", "component-architecture", "state-management", "zustand", "api-integration", "complex-systems"]
globs: ["**/*.tsx", "**/*.ts", "src/components/**/*", "src/stores/**/*"]
---

# Complex React Component Architecture Guide

## Overview

This rule provides systematic guidelines for implementing complex React component architectures involving multiple interconnected components, sophisticated state management, and comprehensive API integration. Based on successful implementation of multi-component systems like base management interfaces.

## Hierarchical Component Architecture

### Component Hierarchy Pattern

**Recommended Structure:**
```
Store → Management → Overview/Detail → Card/Item
```

**Implementation Example:**
- `BaseStore` (Zustand store with persistence)
- `BaseManagement` (Main container with tab navigation)
- `BaseOverview` (All items view) / `BaseDetail` (Individual item view)
- `BaseCard` (Individual item summary)

**Key Principles:**
- Each level has a specific responsibility and data flow
- State flows down through props, actions flow up through callbacks
- Computed state is handled at the store level with getters
- API integration occurs at the Management level

### Data Flow Architecture

**State Management Pattern:**
```typescript
interface ComplexStore {
  // Core State
  selectedItemId: string | null;
  items: ItemData[];
  loading: boolean;
  error: string | null;
  
  // Actions
  setSelectedItem: (id: string | null) => void;
  setItems: (items: ItemData[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Computed Getters
  getSelectedItem: () => ItemData | null;
  getTotalStats: () => StatsData;
  getFilteredItems: (filter: FilterCriteria) => ItemData[];
}
```

**Component Prop Patterns:**
```typescript
// Management Level - Full store access
interface ManagementProps {
  empire: Empire;
  onUpdate: () => void;
}

// Overview/Detail Level - Specific data and callbacks
interface OverviewProps {
  items: ItemData[];
  empire: Empire;
  onItemSelect: (id: string) => void;
  onUpdate: () => void;
}

// Card Level - Individual item and minimal callbacks
interface CardProps {
  item: ItemData;
  onSelect: (id: string) => void;
  isSelected?: boolean;
}
```

## State Management Integration

### Zustand Store Design

**Store Structure Best Practices:**
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface StoreState {
  // Persistent State (user preferences)
  selectedItemId: string | null;
  viewMode: 'grid' | 'list';
  
  // Session State (API data)
  items: ItemData[];
  loading: boolean;
  error: string | null;
}

interface StoreActions {
  // State Setters
  setSelectedItem: (id: string | null) => void;
  setItems: (items: ItemData[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Computed Getters
  getSelectedItem: () => ItemData | null;
  getTotalProduction: () => ProductionRates;
}

const useStore = create<StoreState & StoreActions>()(
  persist(
    (set, get) => ({
      // Initial State
      selectedItemId: null,
      viewMode: 'grid',
      items: [],
      loading: false,
      error: null,
      
      // Actions
      setSelectedItem: (id) => set({ selectedItemId: id }),
      setItems: (items) => set({ items }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      
      // Computed Getters
      getSelectedItem: () => {
        const { selectedItemId, items } = get();
        return items.find(item => item._id === selectedItemId) || null;
      },
      
      getTotalProduction: () => {
        const { items } = get();
        return items.reduce((total, item) => ({
          metal: total.metal + item.productionRates.metalPerHour,
          energy: total.energy + item.productionRates.energyPerHour,
          research: total.research + item.productionRates.researchPerHour
        }), { metal: 0, energy: 0, research: 0 });
      }
    }),
    {
      name: 'store-storage',
      partialize: (state) => ({ 
        selectedItemId: state.selectedItemId,
        viewMode: state.viewMode 
      })
    }
  )
);
```

### Interface Design for Complex Systems

**Model/UI Interface Resolution:**
```typescript
// Resolve conflicts between database models and UI requirements
interface ItemData extends Omit<DatabaseModel, 'conflictingField'> {
  conflictingField: UIExpectedType;  // Override with UI-appropriate type
  computedField: ComputedType;       // Add UI-specific computed fields
  uiState: UIStateType;              // Add UI-specific state
}
```

**Utility Type Patterns:**
- Use `Omit<T, K>` to exclude problematic fields from base types
- Use `Pick<T, K>` to select only needed fields for specific components
- Create union types for component variants: `type ViewMode = 'overview' | 'detail'`
- Implement proper optional chaining for nested object access

## API Integration Architecture

### Authenticated API Instance Pattern

**API Service Setup:**
```typescript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const createAuthenticatedApi = () => {
  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request Interceptor - Add Auth Token
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth-storage');
    if (token) {
      try {
        const parsed = JSON.parse(token);
        if (parsed.state?.token) {
          config.headers.Authorization = `Bearer ${parsed.state.token}`;
        }
      } catch (error) {
        console.error('Error parsing auth token:', error);
      }
    }
    return config;
  });

  // Response Interceptor - Handle Auth Errors
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );

  return api;
};
```

### Data Fetching Patterns

**Multi-Step Data Fetching:**
```typescript
const fetchComplexData = async () => {
  if (!empire) return;
  
  setLoading(true);
  setError(null);
  
  try {
    // Step 1: Fetch primary data
    const primaryResponse = await api.get('/primary-endpoint');
    if (!primaryResponse.data.success) {
      throw new Error(primaryResponse.data.error || 'Failed to fetch primary data');
    }

    const primaryData = primaryResponse.data.data;
    
    // Step 2: Fetch related data in parallel
    const relatedDataPromises = primaryData.map(async (item: any) => {
      try {
        const relatedResponse = await api.get(`/related-endpoint/${item.id}`);
        const relatedData = relatedResponse.data.success ? relatedResponse.data.data : [];
        
        // Step 3: Calculate derived data
        const computedData = calculateDerivedData(relatedData);
        
        return {
          ...item,
          relatedData,
          computedData
        };
      } catch (error) {
        console.error(`Error fetching related data for ${item.id}:`, error);
        return null; // Handle partial failures gracefully
      }
    });

    // Step 4: Process results
    const results = await Promise.all(relatedDataPromises);
    const validResults = results.filter(result => result !== null);
    
    setItems(validResults);
    
    // Step 5: Auto-select first item if none selected
    if (!selectedItemId && validResults.length > 0) {
      setSelectedItem(validResults[0]._id);
    }
    
  } catch (err) {
    console.error('Error fetching complex data:', err);
    setError('Failed to load data. Please try again.');
  } finally {
    setLoading(false);
  }
};
```

## UI Component Patterns

### Tab-Based Navigation

**Management Component with Tabs:**
```typescript
const ManagementComponent: React.FC<ManagementProps> = ({ empire }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'detail'>('overview');
  const { selectedItem, getSelectedItem } = useStore();

  const handleTabChange = (tab: 'overview' | 'detail') => {
    setActiveTab(tab);
    if (tab === 'overview') {
      setSelectedItem(null);
    }
  };

  const selectedItemData = getSelectedItem();

  return (
    <div className="space-y-6">
      {/* Header with Navigation */}
      <div className="game-card">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-empire-gold">Management Interface</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              {items.length} {items.length === 1 ? 'Item' : 'Items'}
            </span>
            <button onClick={refreshData} className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
              Refresh
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-600">
          <button
            onClick={() => handleTabChange('overview')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            All Items Overview
          </button>
          <button
            onClick={() => handleTabChange('detail')}
            disabled={!selectedItemData}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'detail' && selectedItemData
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {selectedItemData ? `${selectedItemData.name}` : 'Select an Item'}
          </button>
        </div>
      </div>

      {/* Content Area */}
      {activeTab === 'overview' ? (
        <OverviewComponent 
          items={items}
          empire={empire}
          onItemSelect={handleItemSelect}
          onUpdate={refreshData}
        />
      ) : selectedItemData ? (
        <DetailComponent 
          item={selectedItemData}
          empire={empire}
          onUpdate={refreshData}
          onBack={() => handleTabChange('overview')}
        />
      ) : (
        <div className="game-card text-center">
          <p className="text-gray-400 mb-4">No item selected</p>
          <button onClick={() => handleTabChange('overview')} className="game-button">
            View All Items
          </button>
        </div>
      )}
    </div>
  );
};
```

### Loading and Error States

**Comprehensive State Handling:**
```typescript
const ComponentWithStates: React.FC<Props> = ({ data }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="game-card">
        <div className="text-center">
          <div className="text-red-400 mb-4">⚠️ {error}</div>
          <button onClick={retryOperation} className="game-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="game-card text-center">
        <p className="text-gray-400 mb-4">No data available</p>
        <button onClick={refreshData} className="game-button">
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Render actual content */}
    </div>
  );
};
```

## TypeScript Error Resolution

### Systematic Error Resolution Protocol

**Multi-Component Error Resolution:**
1. **Build Foundation First**: Always build shared packages before dependent packages
2. **Fix Interface Definitions**: Update shared interfaces before component signatures
3. **Update Component Signatures**: Fix each component function signature individually
4. **Remove Unused Parameters**: Clean up unused imports and parameters systematically
5. **Test After Each Component**: Build verification prevents error accumulation
6. **Verify Integration**: Test component interactions and data flow

**Common Error Patterns:**
```typescript
// Error: 'useAuthStore' is declared but its value is never read
// Solution: Remove unused import
import { useAuthStore } from '../../stores/authStore'; // Remove this line

// Error: Property 'onClose' does not exist on type 'ComponentProps'
// Solution: Update interface and component signature atomically
interface ComponentProps {
  empire: Empire;
  onUpdate: () => void;
  // Remove: onClose: () => void;
}

const Component: React.FC<ComponentProps> = ({ empire, onUpdate }) => {
  // Remove onClose from destructuring
};
```

## Performance Optimization

### Efficient Data Processing

**Parallel API Calls:**
```typescript
// Use Promise.all for independent API calls
const [territoriesResponse, buildingsResponse] = await Promise.all([
  api.get('/territories'),
  api.get('/buildings')
]);

// Handle partial failures gracefully
const results = await Promise.all(
  items.map(async (item) => {
    try {
      return await processItem(item);
    } catch (error) {
      console.error(`Error processing item ${item.id}:`, error);
      return null;
    }
  })
);
const validResults = results.filter(result => result !== null);
```

**Computed State Optimization:**
```typescript
// Use getters in Zustand for computed state
const getTotalProduction = () => {
  const { items } = get();
  return items.reduce((total, item) => ({
    metal: total.metal + (item.productionRates?.metalPerHour || 0),
    energy: total.energy + (item.productionRates?.energyPerHour || 0),
    research: total.research + (item.productionRates?.researchPerHour || 0)
  }), { metal: 0, energy: 0, research: 0 });
};
```

## Success Metrics

A successful complex React component architecture should achieve:
- ✅ Clear separation of concerns across component hierarchy
- ✅ Type-safe interfaces with zero compilation errors
- ✅ Efficient state management with proper data flow
- ✅ Robust API integration with error handling
- ✅ Responsive UI with proper loading and error states
- ✅ Scalable architecture supporting feature expansion
- ✅ Maintainable codebase with consistent patterns

## Common Pitfalls to Avoid

1. **Prop Drilling**: Use state management instead of passing props through multiple levels
2. **Interface Inconsistency**: Update all related components when changing interfaces
3. **Unhandled Loading States**: Always provide feedback during async operations
4. **Poor Error Boundaries**: Implement comprehensive error handling at appropriate levels
5. **Inefficient API Calls**: Use parallel processing and handle partial failures
6. **State Management Complexity**: Keep store interfaces simple and focused
7. **Component Responsibility Overlap**: Maintain clear separation of concerns
8. **TypeScript Error Accumulation**: Fix errors immediately after each component change

This rule ensures complex React component architectures are implemented systematically with proper state management, API integration, and TypeScript safety.

## Route-synced Tab State (URL query param)

Standardize tabbed Detail views so browser refresh/back/forward restore the active tab and deep links can target a specific tab.

Contract:
- Child (Detail) component props:
  - initialActivePanel?: 'overview' | 'fleet' | 'defense' | 'research' | 'structures' | 'trade'
  - onPanelChange?: (panel: same union) => void
- Container (Page) responsibilities:
  - Read ?tab=… from the URL (map aliases like fleets → fleet)
  - Pass initialActivePanel to the Detail
  - Implement onPanelChange to update ?tab=… in the URL (replace: true)

Child (Detail) implementation pattern:
```ts
interface DetailProps {
  initialActivePanel?: 'overview' | 'fleet' | 'defense' | 'research' | 'structures' | 'trade'
  onPanelChange?: (panel: 'overview' | 'fleet' | 'defense' | 'research' | 'structures' | 'trade') => void
}

const Detail: React.FC<DetailProps> = ({ initialActivePanel, onPanelChange }) => {
  const [activePanel, setActivePanel] =
    React.useState<'overview' | 'fleet' | 'defense' | 'research' | 'structures' | 'trade'>(initialActivePanel ?? 'overview')

  // Sync with route-provided initial panel (supports refresh/back/forward)
  React.useEffect(() => {
    if (initialActivePanel && initialActivePanel !== activePanel) {
      setActivePanel(initialActivePanel)
    }
  }, [initialActivePanel])

  // Example tab button
  return (
    <button onClick={() => { setActivePanel('structures'); onPanelChange?.('structures') }}>
      Structures
    </button>
  )
}
```

Container (Page) implementation pattern (React Router):
```ts
const Page: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const raw = searchParams.get('tab')
  const tabParam = raw === 'fleets' ? 'fleet' : raw
  const initialPanel =
    tabParam === 'overview' || tabParam === 'fleet' || tabParam === 'defense' ||
    tabParam === 'research' || tabParam === 'structures' || tabParam === 'trade'
      ? (tabParam as 'overview' | 'fleet' | 'defense' | 'research' | 'structures' | 'trade')
      : undefined

  const handlePanelChange = (panel: 'overview' | 'fleet' | 'defense' | 'research' | 'structures' | 'trade') => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', panel)
    navigate({ search: `?${next.toString()}` }, { replace: true })
  }

  return (
    <Detail
      initialActivePanel={initialPanel}
      onPanelChange={handlePanelChange}
    />
  )
}
```

Notes:
- Always call setActivePanel(panel) and then onPanelChange?.(panel) in the Detail’s tab handlers.
- Use replace: true to avoid polluting browser history for every tab click; back/forward should still work as the URL reflects the current tab state.
- Prefer a single source of truth for the active tab (Detail state), with URL kept in sync via onPanelChange and initialActivePanel.
