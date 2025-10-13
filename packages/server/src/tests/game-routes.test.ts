import { DB_TABLES } from '../constants/database-fields';
import { DB_TABLES } from '../constants/database-fields';
import { HTTP_STATUS } from '../constants/response-formats';

import { DB_FIELDS } from '../../../constants/database-fields';
describe('Game Routes', () => {
  let authToken: string;
  let userId: string;
  let empireId: string;

  beforeAll(async () => {
    // Set up test user and empire
    const { data: { user }, error } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'test123!',
    });
    
    if (error || !user) throw new Error('Failed to create test user');
    userId = user.id;

    // Create test empire
    const { data: empire } = await supabase
      .from(DB_TABLES.EMPIRES)
      .insert({ user_id: userId, name: 'Test Empire' })
      .select()
      .single();
    
    if (!empire) throw new Error('Failed to create test empire');
    empireId = empire.id;

    // Update user with empire reference
    await supabase
      .from(DB_TABLES.USERS)
      .update({ empire_id: empireId })
      .eq(DB_FIELDS.BUILDINGS.ID, userId);
  });

  afterAll(async () => {
    // Cleanup test data
    await supabase.from(DB_TABLES.EMPIRES).delete().eq(DB_FIELDS.BUILDINGS.ID, empireId);
    await supabase.auth.admin.deleteUser(userId);
  });

  // Test /dashboard endpoint
  test('GET /dashboard returns dashboard data', async () => {
    const response = await request(app)
      .get('/game/dashboard')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.success).toBe(true);
    // Add more specific assertions based on expected dashboard structure
  });

  // Test /tech/catalog endpoint
  test('GET /tech/catalog returns technology list', async () => {
    const response = await request(app)
      .get('/game/tech/catalog')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data.catalog)).toBe(true);
  });

  // Test /structures/catalog endpoint
  test('GET /structures/catalog returns buildings list', async () => {
    const response = await request(app)
      .get('/game/structures/catalog')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data.catalog)).toBe(true);
  });

  // Test /units/catalog endpoint
  test('GET /units/catalog returns units list', async () => {
    const response = await request(app)
      .get('/game/units/catalog')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data.catalog)).toBe(true);
  });

  // Test /defenses/catalog endpoint
  test('GET /defenses/catalog returns defenses list', async () => {
    const response = await request(app)
      .get('/game/defenses/catalog')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data.catalog)).toBe(true);
  });

  // Test base-specific routes
  describe('Base-specific routes', () => {
    let testBaseCoord: string;

    beforeAll(async () => {
      // Create a test base/location
      testBaseCoord = 'A00:10:20:30';
      await supabase
        .from(DB_TABLES.LOCATIONS)
        .insert({
          coord: testBaseCoord,
          owner: userId,
          owner_id: userId,
          result: { solarEnergy: 100, yields: { gas: 50 } }
        });

      // Add this location to empire territories
      await supabase
        .from(DB_TABLES.EMPIRES)
        .update({ territories: [testBaseCoord] })
        .eq(DB_FIELDS.BUILDINGS.ID, empireId);
    });

    afterAll(async () => {
      await supabase.from(DB_TABLES.LOCATIONS).delete().eq('coord', testBaseCoord);
    });

    test('GET /structures/queue returns queue for base', async () => {
      const response = await request(app)
        .get(`/game/structures/queue?base=${testBaseCoord}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.queue)).toBe(true);
    });

    test('GET /bases/summary returns base info', async () => {
      const response = await request(app)
        .get('/game/bases/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.bases)).toBe(true);
      expect(response.body.data.bases.length).toBeGreaterThan(0);
      expect(response.body.data.bases[0].location).toBe(testBaseCoord);
    });
  });
});

