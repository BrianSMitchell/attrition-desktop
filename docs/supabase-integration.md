# Supabase Integration Modules

## authSupabase.ts

### Overview
Handles user authentication and registration using Supabase as the backend database. Located in `packages/server/src/services/authSupabase.ts`.

### Exports

#### `registerSupabase(req: Request, res: Response): Promise<void>`

**Purpose**: Handles new user registration with automatic empire creation and starter planet assignment.

**Request Body**:
```typescript
{
  email: string;    // User's email address
  username: string; // Desired username
  password: string; // User's password (min 6 chars)
}
```

**Success Response** (201 Created):
```typescript
{
  success: true,
  data: {
    user: {
      id: string;
      email: string;
      username: string;
      gameProfile: {
        startingCoordinate: string;
        empireId: string;
      }
    },
    token: string;           // JWT access token
    refreshToken: string;    // JWT refresh token
    empire: {
      id: string;
      name: string;
      homeSystem: string;
    }
  },
  message: string;
}
```

**Database Operations**:
1. Inserts new user into 'users' table
2. Claims an unclaimed planet
3. Creates empire record
4. Creates colony record
5. Creates starter building
6. Updates user with empire reference

#### `loginSupabase(req: Request, res: Response): Promise<void>`

**Purpose**: Authenticates users and returns profile with empire details.

**Request Body**:
```typescript
{
  email: string;    // User's email
  password: string; // User's password
}
```

**Success Response** (200 OK):
```typescript
{
  success: true,
  data: {
    user: {
      id: string;
      email: string;
      username: string;
      gameProfile: {
        startingCoordinate: string | null;
        empireId: string | null;
      }
    },
    token: string;        // JWT access token
    refreshToken: string; // JWT refresh token
    empire: {            // null if user has no empire
      id: string;
      name: string;
      homeSystem: string;
      territories: string[];
      resources: {
        credits: number;
        energy: number;
      }
    } | null
  }
}
```

**Database Operations**:
1. Queries user record by email
2. Verifies password hash
3. Updates last_login timestamp
4. Fetches associated empire details

### Dependencies
- @supabase/supabase-js (via '../config/supabase')
- bcryptjs (password hashing)
- jsonwebtoken (token handling)
- express (Request/Response types)

## generateUniverseSupabase.ts

### Overview
Handles universe generation for the game, creating the galaxy structure with stars, planets, and asteroids. Located in `packages/server/src/scripts/generateUniverseSupabase.ts`.

### Exports

#### `generateUniverseSupabase(): Promise<void>`

**Purpose**: Generates universe structure and saves to Supabase database.

**Configuration**:
```typescript
{
  serverName: string;          // e.g., 'A'
  galaxyCount: number;         // e.g., 2
  regionCount: number;         // e.g., 100
  maxSystemsPerRegion: number; // e.g., 50
  minSystemsPerRegion: number; // e.g., 1
  maxBodiesPerSystem: number;  // e.g., 20
  minBodiesPerSystem: number;  // e.g., 1
  seed: string;               // e.g., 'alpha-universe-2024'
}
```

**Database Structure**:
- Generates locations table entries with:
  - Stars (type: 'star')
  - Planets (type: 'planet')
  - Asteroids (type: 'asteroid')

**Generated Data Fields**:
```typescript
{
  coord: string;           // Unique coordinate identifier
  type: 'star' | 'planet' | 'asteroid';
  orbit_position?: number; // For planets/asteroids
  terrain?: {
    type: string;
    baseline: any;
  };
  position_base?: any;
  star_applied?: {
    solarEnergyDelta: number;
    fertilityDelta: number;
    resourceDelta: {
      metal: number;
      gas: number;
      crystals: number;
    }
  };
  result?: any;
  owner_id: string | null;
  star_overhaul?: {     // For stars only
    kind: string;
    orbitModifiers: Array<{
      position: number;
      solarEnergyDelta: number;
      fertilityDelta: number;
      resourceDelta: {
        metal: number;
        gas: number;
        crystals: number;
      }
    }>;
  }
}
```

**Dependencies**:
- @supabase/supabase-js (via '../config/supabase')
- seedrandom (deterministic RNG)
- @game/shared utilities:
  - formatCoord
  - randomInt
  - pickStarKindFromCoord
  - getStarKindModifiers
  - pickTerrainFromCoord
  - computePlanetStats

### Usage
The generateUniverseSupabase script can be run directly (node generateUniverseSupabase.ts) or imported and called programmatically. It includes checks to prevent duplicate universe generation and provides progress logging during the generation process.

## Integration Points

Both modules rely on the Supabase client configured in '../config/supabase'. Key tables accessed:

1. users
   - Core user data
   - Authentication details
   - Game profile linkage

2. locations
   - Universe structure
   - Ownership tracking
   - Terrain and resource data

3. empires
   - Player empire data
   - Resource tracking
   - Territory management

4. colonies
   - Settlement data
   - Location linkage

5. buildings
   - Structure placement
   - Resource generation
   - Empire development