# Testing Citizens Per Hour Functionality

The citizens per hour system in Attrition allows buildings to generate citizens over time, who then provide production bonuses to other capacities.

## Quick Test

Run the test script to verify the system is working:

```bash
node test-citizens-simple.js
```

This will check if the server is running and explain how the system works.

## How Citizens Per Hour Works

### 1. Citizen Generation Buildings

The following buildings generate citizens per hour based on their level:

| Building | Citizens/Hour per Level |
|----------|------------------------|
| Urban Structures | 3 |
| Command Centers | 1 |
| Orbital Base | 5 |
| Capital | 8 |
| Biosphere Modification | 10 |

**Example:** A Level 2 Urban Structures building generates 2 × 3 = 6 citizens per hour.

### 2. Citizen Accumulation

- Citizens accumulate automatically over time through the game loop
- The system uses "milli-citizens" to handle fractional generation precisely
- Updates typically occur every 1-5 minutes (configurable via `CITIZEN_PAYOUT_PERIOD_MINUTES`)

### 3. Production Bonuses

Citizens provide production bonuses to other capacities:
- **Bonus Rate:** +1% per 1,000 citizens
- **Applies to:** Construction, Production, and Research capacities
- **Example:** 10,000 citizens = +10% bonus to all production capacities

## Manual Testing Steps

### Step 1: Build Citizen-Generating Structures

1. Start the game: `pnpm dev`
2. Create or log into an empire
3. Build at least one of:
   - Urban Structures
   - Command Centers
   - Orbital Base
   - Capital buildings
   - Biosphere Modification

### Step 2: Check Initial State

1. Note your current citizen count in the base detail view
2. Check the base capacities to see expected citizens/hour generation
3. Look for the citizen generation rate in the UI

### Step 3: Wait and Verify

1. Wait 5-10 minutes for the game loop to run
2. Refresh or check the base again
3. Verify that your citizen count has increased
4. The increase should match roughly: `(citizens/hour) × (minutes elapsed) / 60`

### Step 4: Verify Production Bonuses

1. Build up several thousand citizens
2. Check your construction/production capacity breakdown
3. Look for "Citizens Bonus" entries showing percentage increases

## Troubleshooting

### Citizens Not Increasing

1. **Check Buildings**: Ensure you have citizen-generating buildings that are active (not paused)
2. **Wait Longer**: The game loop may take a few minutes to run
3. **Check Server Logs**: Look for any errors related to "BaseCitizenService" or citizen updates
4. **Verify Game Loop**: Make sure the game loop service is running properly

### Wrong Generation Rates

1. **Verify Building Levels**: Check that your buildings are the correct level
2. **Check Active Status**: Inactive buildings don't generate citizens
3. **Review Calculations**: Use the table above to calculate expected rates

### No Production Bonuses

1. **Citizen Count**: You need at least 1,000 citizens to see a 1% bonus
2. **Check Breakdown**: Look at capacity breakdown in the UI for "Citizens Bonus" entries
3. **Refresh Data**: Sometimes the UI needs a refresh to show updated bonuses

## Technical Details

### Code Components

- **BaseCitizenService**: Handles citizen accumulation over time
- **CapacityService**: Calculates citizen generation rates and applies bonuses
- **Game Loop**: Periodically calls citizen updates
- **Colony Model**: Stores citizen count and remainder data

### Key Files

- `packages/server/src/services/baseCitizenService.ts`
- `packages/server/src/services/capacityService.ts`
- `packages/server/src/services/gameLoopService.ts`

### Environment Variables

- `CITIZEN_PAYOUT_PERIOD_MINUTES`: How often to update citizens (default: 1 minute)

## Expected Behavior Summary

✅ **Working System Should:**
- Calculate correct citizen generation rates from buildings
- Update citizen counts automatically over time
- Handle fractional citizens with milli-remainder precision
- Apply production bonuses based on citizen population
- Show citizen counts and generation rates in the UI

❌ **Signs of Issues:**
- Citizen counts never increase despite having buildings
- Generation rates showing as 0 when buildings exist
- No production bonuses despite having many citizens
- Errors in server logs about citizen updates

## Advanced Testing

For more comprehensive testing, you can:

1. **Check Database**: Look at Colony documents to see `citizens`, `citizenRemainderMilli`, and `lastCitizenUpdate` fields
2. **Manual Service Calls**: Use Node.js to directly call `BaseCitizenService.updateEmpireBases()` for an empire
3. **API Testing**: Use the game's API endpoints to check capacity calculations
4. **Game Loop Monitoring**: Watch server logs for citizen update messages

The citizens per hour system is a core part of the game's economy and should be working reliably if you see citizens increasing over time and production bonuses being applied correctly.