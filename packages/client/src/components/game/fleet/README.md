# Fleet Management System

This directory contains the enhanced fleet management system with integrated map-based destination selection and visual fleet display.

## Overview

The fleet system has been enhanced with the following capabilities:

1. **Visual Fleet Representation**: Fleets are displayed on the universe map at all zoom levels
2. **Map-Based Destination Selection**: Users can select fleet destinations by clicking on the map
3. **Manual Coordinate Input**: Traditional text-based coordinate entry is still available
4. **Integrated Fleet Management**: Complete fleet dispatch workflow with travel time estimation

## Components

### Core Components

#### `FleetDispatchForm.tsx`
Enhanced fleet dispatch form with dual input methods:
- **Map Selection Mode**: Visual destination picking with territory validation
- **Manual Input Mode**: Traditional coordinate text input
- **Travel Time Estimation**: Calculates estimated travel time based on distance
- **Validation**: Comprehensive input validation and error handling
- **Status Updates**: Real-time feedback during dispatch process

#### `FleetDestinationSelector.tsx`
Specialized component for map-based destination selection:
- **Interactive Map**: Embedded universe map for visual selection
- **Territory Information**: Shows territory ownership and accessibility
- **Coordinate Parsing**: Automatic coordinate formatting and validation
- **Navigation Controls**: Zoom and navigation through map levels
- **Selection Confirmation**: Multi-step confirmation process

#### `FleetMapOverlay.tsx`
Canvas overlay for displaying fleet positions and movements:
- **Multi-Zoom Support**: Renders fleets at universe, galaxy, region, and system levels
- **Fleet Positioning**: Accurate coordinate-based positioning
- **Movement Visualization**: Shows fleet routes and movement progress
- **Interactive Elements**: Click detection for fleet interaction
- **Status Indicators**: Visual indicators for fleet status (stationed, moving, combat)

#### `FleetManagementPage.tsx`
Complete fleet management interface:
- **Fleet List**: Sidebar showing all available fleets
- **Integrated Map**: Full universe map with fleet overlays
- **Dispatch Interface**: Modal-based fleet dispatch workflow
- **Status Management**: Real-time fleet status updates
- **Action Controls**: Fleet formation and management controls

### Enhanced Components

#### `UniverseMap.tsx`
Updated to include fleet visualization:
- **Fleet Data Integration**: Fetches and displays fleet information
- **Overlay Rendering**: Renders FleetMapOverlay when fleets are enabled
- **Fleet Loading States**: Shows loading indicators for fleet data
- **Click Handling**: Enhanced click handling for fleet interaction

## Features

### Map-Based Destination Selection

Users can now select fleet destinations using the interactive map:

1. **Toggle Selection Mode**: Switch between manual input and map selection
2. **Navigate Map**: Use zoom controls to navigate through universe levels
3. **Click to Select**: Click on any accessible coordinate to select destination
4. **Territory Validation**: System validates destination accessibility
5. **Confirmation**: Review and confirm destination before dispatch

### Visual Fleet Display

Fleets are displayed on the map with the following features:

- **Position Accuracy**: Fleets appear at their exact coordinates
- **Multi-Level Display**: Visible at appropriate zoom levels
- **Status Indicators**: Different colors/shapes for fleet status
- **Size Representation**: Fleet icons scale with fleet size
- **Movement Tracking**: Moving fleets show route and progress

### Travel Time Estimation

The system provides travel time estimates based on:

- **Distance Calculation**: 3D coordinate distance computation
- **Fleet Composition**: Unit types and speeds (when available)
- **Route Complexity**: Direct vs. complex routing
- **Real-time Updates**: Updates as destination changes

## Usage

### Basic Fleet Dispatch

```tsx
import FleetDispatchForm from './fleet/FleetDispatchForm';

<FleetDispatchForm
  fleet={selectedFleet}
  empire={empire}
  onDispatch={handleDispatch}
  onCancel={handleCancel}
  isDispatching={isLoading}
/>
```

### Map-Based Selection

```tsx
import FleetDestinationSelector from './fleet/FleetDestinationSelector';

<FleetDestinationSelector
  empire={empire}
  currentCoord={fleet.locationCoord}
  onDestinationSelect={setDestination}
/>
```

### Fleet Visualization

```tsx
import FleetMapOverlay from './fleet/FleetMapOverlay';

<FleetMapOverlay
  canvas={canvasRef.current}
  fleets={fleetsData}
  zoomLevel={currentZoom}
  selectedCoordinate={selectedCoord}
  canvasSize={canvasSize}
  onFleetClick={handleFleetClick}
/>
```

### Complete Management Interface

```tsx
import FleetManagementPage from './fleet/FleetManagementPage';

<FleetManagementPage empire={empire} />
```

## Integration Points

### Services Integration

The components are designed to integrate with the following services:

- **Fleet Service**: For fleet data and dispatch operations
- **Universe Service**: For coordinate validation and territory information
- **Empire Service**: For territory ownership and permissions

### Store Integration

Components integrate with the universe map store for:

- **Navigation State**: Current zoom level and selected coordinates
- **Viewport Management**: Map positioning and view state
- **Display Options**: Grid, territory, and fleet display toggles

## Development Notes

### Production API Integration

The implementation uses real API services:

- **Fleet Data**: Real-time fleet loading via `/game/fleets` endpoint
- **Fleet Dispatch**: Actual dispatch operations via `/game/fleets/:id/dispatch`
- **Travel Time Calculation**: Server-side calculation via `/game/fleets/:id/estimate-travel`
- **Status Updates**: Live status tracking via `/game/fleets/:id/status`
- **Fleet Details**: Complete fleet composition via `/game/fleets/:id`

### Future Enhancements

Planned improvements include:

1. **Advanced Routing**: Multi-hop routing through waypoints
2. **Fleet Groups**: Formation and group movement capabilities
3. **Combat Integration**: Battle initiation and resolution
4. **Resource Management**: Fuel and supply considerations
5. **Advanced Visualization**: 3D fleet representations and effects
6. **Real-time Updates**: WebSocket integration for live fleet movements

### Performance Considerations

- **Canvas Optimization**: Efficient rendering for large fleet counts
- **Data Caching**: Fleet position and status caching
- **Update Frequency**: Throttled updates for moving fleets
- **Memory Management**: Proper cleanup of canvas contexts and animations

## Testing

### Component Testing

Each component includes comprehensive testing for:

- **User Interactions**: Click handling and form submissions
- **State Management**: Component state updates and synchronization
- **Validation Logic**: Input validation and error handling
- **Integration Points**: Service call mocking and response handling

### Visual Testing

Map integration includes testing for:

- **Coordinate Accuracy**: Precise fleet positioning
- **Zoom Level Handling**: Proper display at all zoom levels
- **Canvas Performance**: Smooth rendering with multiple fleets
- **Click Detection**: Accurate fleet selection and interaction

## Styling

Components use Tailwind CSS with the following design system:

- **Color Scheme**: Dark theme with empire-specific colors
- **Typography**: Monospace fonts for coordinates and technical data
- **Animations**: Smooth transitions for state changes
- **Responsive Design**: Adapts to different screen sizes

The styling maintains consistency with the existing game interface while providing clear visual hierarchy for fleet-specific functionality.
