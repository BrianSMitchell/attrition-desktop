import { DB_TABLES } from '../constants/database-fields';
import { HTTP_STATUS } from '../constants/response-formats';
import { ENV_VARS } from '@game/shared';

// Mock Supabase
import { DB_FIELDS } from '../../../constants/database-fields';
jest.mock('../config/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token',
            user: { id: 'test-user-id' }
          }
        },
        error: null
      })
    },
    from: jest.fn().mockImplementation((table) => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockReturnThis(),
      data: table === 'empires' ? { id: 'test-empire-id' } : {},
      error: null
    }))
  }
}));

describe('Game Routes', () => {
  let authToken: string;
  let userId: string;
  let empireId: string;
  let testBase: string;

  beforeAll(async () => {
    // Set up test auth token
    const { data: { session }, error } = await supabase.auth.signInWithPassword({
      email: process.env[ENV_VARS.TEST_USER_EMAIL] || 'test@example.com',
      password: process.env[ENV_VARS.TEST_USER_PASSWORD] || 'test123!',
    });

    if (error || !session) {
      throw new Error('Failed to authenticate test user');
    }

    authToken = session.access_token;
    userId = session.user.id;

    // Get or create test empire
    const { data: empire } = await supabase
      .from(DB_TABLES.EMPIRES)
      .select(DB_FIELDS.BUILDINGS.ID)
      .eq(DB_FIELDS.EMPIRES.USER_ID, userId)
      .single();

    if (empire) {
      empireId = empire.id;
    } else {
      const { data: newEmpire } = await supabase
        .from(DB_TABLES.EMPIRES)
        .insert({ user_id: userId, name: 'Test Empire' })
        .select()
        .single();

      if (!newEmpire) throw new Error('Failed to create test empire');
      empireId = newEmpire.id;
    }

    // Create test base
    testBase = 'A00:10:20:30';
    await supabase
      .from(DB_TABLES.LOCATIONS)
      .upsert({
        coord: testBase,
        owner: userId,
        owner_id: userId,
        result: { solarEnergy: 100, yields: { gas: 50 } }
      });

    // Add base to empire territories
    await supabase
      .from(DB_TABLES.EMPIRES)
      .update({ territories: [testBase] })
      .eq(DB_FIELDS.BUILDINGS.ID, empireId);
  });

  afterAll(async () => {
    // Clean up test base
    await supabase
      .from(DB_TABLES.LOCATIONS)
      .delete()
      .eq('coord', testBase);
  });

  describe('GET /tech/catalog', () => {
    it('returns technology list', async () => {
      const response = await request(app)
        .get('/api/game/tech/catalog')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.catalog)).toBe(true);
    });
  });

  describe('GET /structures/catalog', () => {
    it('returns buildings list', async () => {
      const response = await request(app)
        .get('/api/game/structures/catalog')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.catalog)).toBe(true);
    });
  });

  describe('GET /defenses/catalog', () => {
    it('returns defenses list', async () => {
      const response = await request(app)
        .get('/api/game/defenses/catalog')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.catalog)).toBe(true);
    });
  });

  describe('GET /units/catalog', () => {
    it('returns units list', async () => {
      const response = await request(app)
        .get('/api/game/units/catalog')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.catalog)).toBe(true);
    });
  });

describe('GET /bases/summary', () => {
    it('returns base summaries', async () => {
      const response = await request(app)
        .get('/api/game/bases/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.bases)).toBe(true);
      
      interface BaseInfo {
        baseId: string;
        location: string;
      }
      
      // Should find our test base
      const testBaseInfo = response.body.data.bases.find((b: BaseInfo) => b.location === testBase);
      expect(testBaseInfo).toBeDefined();
      expect(testBaseInfo.baseId).toBe(testBase);
    });
  });

  describe('GET /structures/queue', () => {
    it('returns queue for base', async () => {
      const response = await request(app)
        .get(`/api/game/structures/queue?base=${testBase}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.queue)).toBe(true);
    });

    it('requires authentication', async () => {
      const response = await request(app)
        .get(`/api/game/structures/queue?base=${testBase}`);

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });
  });

  describe('GET /tech/status', () => {
    it('returns tech status for base', async () => {
      const response = await request(app)
        .get(`/api/game/tech/status?base=${testBase}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBeDefined();
    });

    it('requires base parameter', async () => {
      const response = await request(app)
        .get('/api/game/tech/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body.success).toBe(false);
    });
  });
});

