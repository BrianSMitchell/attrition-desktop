# Ship Production Progress UI Testing Guide

## Overview
This guide provides instructions for testing the newly implemented Ship Production Progress UI component.

## What was implemented:

### 1. ShipProductionProgress Component
- **Location**: `src/components/game/ShipProductionProgress.tsx`
- **Features**:
  - Real-time progress bars with countdown timers
  - ETA display (hours/minutes/seconds)
  - Quantity tracking (e.g., "Building Corvette 2/5")
  - Cancel functionality with confirmation
  - Production capacity display
  - Auto-refresh every second for smooth progress updates

### 2. Extended Units Service
- **Location**: `src/services/unitsService.ts`
- **New endpoints**:
  - `getProductionQueue(baseCoord)` - Get active production queue
  - `cancelProduction(itemId)` - Cancel a production item
- **New types**:
  - `UnitProductionItem` interface for queue items

### 3. Integration into BaseDetail
- **Location**: `src/components/game/BaseDetail.tsx`
- **Changes**:
  - Added production queue state management
  - Integrated ShipProductionProgress into Fleet panel
  - Added production queue refresh after unit submissions
  - Added production cancellation handler

## Testing Instructions

### Prerequisites
1. Ensure the backend supports the following endpoints:
   - `GET /game/units/queue?base={baseCoord}` - Returns production queue
   - `DELETE /game/units/queue/{itemId}` - Cancels production item

### Expected Backend Response Format

#### Production Queue Response
```json
{
  "success": true,
  "data": {
    "queue": [
      {
        "id": "prod_123",
        "unitKey": "corvette",
        "unitName": "Corvette",
        "quantity": 2,
        "totalQuantity": 5,
        "startedAt": "2025-01-12T18:00:00Z",
        "completesAt": "2025-01-12T19:30:00Z",
        "creditsCost": 15000,
        "baseCoord": "1.2.3.4"
      }
    ]
  }
}
```

### Test Scenarios

#### 1. Basic Functionality Test
1. Navigate to a base with shipyard capability
2. Go to the Fleet tab
3. Submit ship production (e.g., 3 Corvettes)
4. **Expected**: ShipProductionProgress component should appear showing:
   - Ship name and quantity (e.g., "Corvette (2/3)")
   - Progress bar starting at 0%
   - Countdown timer showing ETA
   - Cancel button

#### 2. Progress Updates Test
1. Wait and observe the progress component
2. **Expected**: 
   - Progress bar should update every second
   - Countdown timer should decrease in real-time
   - Progress bar fills proportionally to elapsed time

#### 3. Multiple Productions Test
1. Submit multiple different ship types
2. **Expected**:
   - Multiple progress cards should appear
   - Each shows independent progress
   - Queue count shows total items (e.g., "3 items in queue")

#### 4. Cancellation Test
1. Click the "Cancel" button on an active production
2. **Expected**:
   - Production should be cancelled
   - Progress card should disappear
   - Resources should be refunded (if backend supports)
   - Success message should appear

#### 5. Completion Test
1. Wait for a production to complete (or simulate completion)
2. **Expected**:
   - Progress bar reaches 100%
   - ETA changes to "Completed"
   - Progress bar color changes to green
   - Item eventually disappears from queue

#### 6. Error Handling Test
1. Test with network disconnection
2. Test cancelling non-existent items
3. **Expected**:
   - Graceful error handling
   - Non-fatal errors don't crash the component
   - Appropriate error messages

### Manual Testing Checklist

- [ ] Component appears in Fleet tab
- [ ] Progress bars animate smoothly
- [ ] Countdown timers update every second
- [ ] Multiple productions display correctly
- [ ] Cancel functionality works
- [ ] Completed items show green status
- [ ] Network errors are handled gracefully
- [ ] Production queue refreshes after submissions
- [ ] Component disappears when queue is empty

### Backend Requirements

For full functionality, the backend needs to implement:

1. **Production Queue Endpoint**: `GET /game/units/queue`
2. **Cancel Production Endpoint**: `DELETE /game/units/queue/{itemId}`
3. **Queue Updates**: When units are started, items should be added to queue
4. **Queue Cleanup**: Completed items should be removed from queue
5. **Real-time Updates**: Consider WebSocket updates for live progress

## Notes

- The UI assumes production time is calculated from credits cost and production capacity
- Progress is calculated client-side based on startedAt/completesAt timestamps  
- The component gracefully handles missing backend endpoints (shows empty state)
- All network calls are non-fatal and won't break the interface

## Visual Design

The component matches the existing structure construction UI:
- Similar styling and layout to active construction progress
- Empire gold colors for headers
- Gray/blue progress bars that turn green on completion
- Consistent spacing and typography with the game's design system