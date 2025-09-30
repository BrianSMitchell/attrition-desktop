# Energy Balance Test Plan

## Test Scenarios

### 1. No Construction Active
**Expected**: Header energy balance should match breakdown modal balance exactly

**Steps**:
1. Navigate to a base with no active construction
2. Note the energy balance in the header
3. Click "View breakdown" link
4. Verify the balance shown in the modal matches the header

### 2. Energy-Consuming Structure Under Construction
**Expected**: Header should show projected balance (current - reserved), breakdown should show reserved section

**Steps**:
1. Start construction of an energy-consuming structure (e.g., Metal Refinery)
2. Note the energy balance drops in the header immediately
3. Open energy breakdown modal
4. Verify:
   - Current balance shows produced - consumed
   - Reserved section shows the structure being built
   - Header shows current balance minus reserved

### 3. Energy-Producing Structure Under Construction  
**Expected**: No change in energy balance until construction completes

**Steps**:
1. Start construction of an energy-producing structure (e.g., Solar Plant)
2. Verify energy balance in header doesn't change
3. Open breakdown modal - no reserved section should appear
4. Wait for construction to complete
5. Verify energy balance increases once active

### 4. Multiple Constructions Queued
**Expected**: Only the active construction should reserve energy

**Steps**:
1. Queue multiple energy-consuming structures
2. Verify only the first one (actively building) reserves energy
3. As each completes, verify the next one starts reserving

## Manual Verification Commands

Run these to verify the fixes are working:

```bash
# Check for any stale pendingUpgrade flags
cd packages/server
npx tsx src/scripts/checkPendingUpgrades.ts

# Run validation to clean up any issues
npx tsx src/scripts/addBuildingValidation.ts
```

## Expected Results After Fix

1. **Idle State**: Energy balance header = Energy breakdown balance
2. **Construction Active**: 
   - Header shows: Current Balance - Reserved Energy
   - Breakdown shows: Current Balance + Reserved section
3. **No phantom -2 energy** when nothing is under construction