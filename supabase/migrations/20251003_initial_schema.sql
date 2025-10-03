-- Attrition Game Database Schema
-- Initial Migration: Convert MongoDB schemas to PostgreSQL

-- Note: gen_random_uuid() is available by default in PostgreSQL 13+

-- ======================
-- Users Table
-- ======================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(20) UNIQUE NOT NULL CHECK (LENGTH(username) >= 3),
    password_hash VARCHAR(255) NOT NULL CHECK (LENGTH(password_hash) >= 6),
    role VARCHAR(10) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    
    -- Game Profile
    empire_id UUID,
    credits INTEGER DEFAULT 100 NOT NULL,
    experience INTEGER DEFAULT 0 NOT NULL,
    starting_coordinate VARCHAR(50) CHECK (starting_coordinate ~ '^[A-Z]\d{2}:\d{2}:\d{2}:\d{2}$'),
    
    last_login TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_empire_id ON users(empire_id);

-- ======================
-- Empires Table
-- ======================
CREATE TABLE empires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL CHECK (LENGTH(name) >= 1),
    home_system VARCHAR(50) CHECK (home_system ~ '^[A-Z]\d{2}:\d{2}:\d{2}:\d{2}$'),
    territories TEXT[] DEFAULT '{}',
    base_count INTEGER DEFAULT 0 NOT NULL,
    has_deleted_base BOOLEAN DEFAULT FALSE NOT NULL,
    economy_per_hour INTEGER DEFAULT 0 NOT NULL,
    
    -- Resources
    credits INTEGER DEFAULT 0 NOT NULL,
    energy INTEGER DEFAULT 0 NOT NULL,
    
    -- Timestamps for resource updates
    last_resource_update TIMESTAMPTZ,
    last_credit_payout TIMESTAMPTZ,
    credits_remainder_milli INTEGER DEFAULT 0 NOT NULL,
    
    -- Tech levels stored as JSONB
    tech_levels JSONB DEFAULT '{}',
    
    next_fleet_number INTEGER DEFAULT 1 NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_empires_user_id ON empires(user_id);
CREATE INDEX idx_empires_name ON empires(name);
CREATE INDEX idx_empires_credits ON empires(credits DESC);

-- ======================
-- Locations Table
-- ======================
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coord VARCHAR(50) UNIQUE NOT NULL CHECK (coord ~ '^[A-Z]\d{2}:\d{2}:\d{2}:\d{2}$'),
    type VARCHAR(20) NOT NULL CHECK (type IN ('planet', 'asteroid', 'star')),
    
    -- Optional fields for planets/asteroids
    orbit_position INTEGER CHECK (orbit_position BETWEEN 1 AND 8),
    terrain JSONB,
    position_base JSONB,
    star_applied JSONB,
    result JSONB,
    
    -- For stars (body 0)
    star_overhaul JSONB,
    
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT chk_coord_format CHECK (
        coord ~ '^[A-Z]\d{2}:\d{2}:\d{2}:\d{2}$'
    )
);

CREATE INDEX idx_locations_coord ON locations(coord);
CREATE INDEX idx_locations_owner_id ON locations(owner_id);
CREATE INDEX idx_locations_type ON locations(type);
CREATE INDEX idx_locations_owner_type ON locations(owner_id, type);

-- ======================
-- Colonies Table
-- ======================
CREATE TABLE colonies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empire_id UUID NOT NULL REFERENCES empires(id) ON DELETE CASCADE,
    location_coord VARCHAR(50) UNIQUE NOT NULL CHECK (location_coord ~ '^[A-Z]\d{2}:\d{2}:\d{2}:\d{2}$'),
    name VARCHAR(50) NOT NULL CHECK (LENGTH(name) >= 3),
    
    -- Citizens system
    citizens INTEGER DEFAULT 0 NOT NULL,
    last_citizen_update TIMESTAMPTZ,
    citizen_remainder_milli INTEGER DEFAULT 0 NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_colonies_empire_id ON colonies(empire_id);
CREATE INDEX idx_colonies_name ON colonies(name);
CREATE INDEX idx_colonies_empire_location ON colonies(empire_id, location_coord);

-- ======================
-- Buildings Table
-- ======================
CREATE TABLE buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_coord VARCHAR(50) NOT NULL CHECK (location_coord ~ '^[A-Z]\d{2}:\d{2}:\d{2}:\d{2}$'),
    empire_id UUID NOT NULL REFERENCES empires(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    display_name VARCHAR(200),
    catalog_key VARCHAR(100),
    level INTEGER DEFAULT 1 NOT NULL CHECK (level >= 1),
    construction_started TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    construction_completed TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT FALSE NOT NULL,
    credits_cost INTEGER DEFAULT 0,
    pending_upgrade BOOLEAN DEFAULT FALSE,
    identity_key VARCHAR(255),
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_buildings_empire_id ON buildings(empire_id);
CREATE INDEX idx_buildings_empire_location ON buildings(empire_id, location_coord);
CREATE INDEX idx_buildings_empire_active ON buildings(empire_id, is_active);
CREATE INDEX idx_buildings_construction ON buildings(construction_completed, is_active);

-- Unique constraint for catalogKey (only when present)
CREATE UNIQUE INDEX uniq_empire_base_key ON buildings(empire_id, location_coord, catalog_key) 
WHERE catalog_key IS NOT NULL;

-- ======================
-- Fleets Table
-- ======================
CREATE TABLE fleets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empire_id UUID NOT NULL REFERENCES empires(id) ON DELETE CASCADE,
    location_coord VARCHAR(50) NOT NULL CHECK (location_coord ~ '^[A-Z]\d{2}:\d{2}:\d{2}:\d{2}$'),
    name VARCHAR(100) NOT NULL CHECK (LENGTH(name) >= 1),
    units JSONB DEFAULT '[]' NOT NULL,
    size_credits INTEGER DEFAULT 0 NOT NULL CHECK (size_credits >= 0),
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_fleets_empire_id ON fleets(empire_id);
CREATE INDEX idx_fleets_location ON fleets(location_coord);
CREATE INDEX idx_fleets_empire_location ON fleets(empire_id, location_coord);
CREATE INDEX idx_fleets_empire_name ON fleets(empire_id, name);

-- ======================
-- Fleet Movements Table
-- ======================
CREATE TABLE fleet_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empire_id UUID NOT NULL REFERENCES empires(id) ON DELETE CASCADE,
    fleet_id UUID NOT NULL REFERENCES fleets(id) ON DELETE CASCADE,
    
    origin_coord VARCHAR(50) NOT NULL CHECK (origin_coord ~ '^[A-Z]\d{2}:\d{2}:\d{2}:\d{2}$'),
    destination_coord VARCHAR(50) NOT NULL CHECK (destination_coord ~ '^[A-Z]\d{2}:\d{2}:\d{2}:\d{2}$'),
    
    units JSONB NOT NULL DEFAULT '[]',
    size_credits INTEGER DEFAULT 0 NOT NULL CHECK (size_credits >= 0),
    
    departure_time TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    estimated_arrival_time TIMESTAMPTZ NOT NULL,
    actual_arrival_time TIMESTAMPTZ,
    
    status VARCHAR(20) DEFAULT 'pending' NOT NULL 
        CHECK (status IN ('pending', 'travelling', 'arrived', 'recalled', 'failed')),
    
    travel_time_hours REAL NOT NULL CHECK (travel_time_hours >= 0),
    fleet_speed REAL NOT NULL CHECK (fleet_speed >= 0),
    distance REAL NOT NULL CHECK (distance >= 0),
    
    recall_time TIMESTAMPTZ,
    recall_reason VARCHAR(500),
    error_message VARCHAR(1000),
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_fleet_movements_empire_id ON fleet_movements(empire_id);
CREATE INDEX idx_fleet_movements_fleet_id ON fleet_movements(fleet_id);
CREATE INDEX idx_fleet_movements_origin ON fleet_movements(origin_coord);
CREATE INDEX idx_fleet_movements_destination ON fleet_movements(destination_coord);
CREATE INDEX idx_fleet_movements_status ON fleet_movements(status);
CREATE INDEX idx_fleet_movements_empire_status ON fleet_movements(empire_id, status);
CREATE INDEX idx_fleet_movements_fleet_status ON fleet_movements(fleet_id, status);
CREATE INDEX idx_fleet_movements_status_arrival ON fleet_movements(status, estimated_arrival_time);
CREATE INDEX idx_fleet_movements_departure ON fleet_movements(departure_time);
CREATE INDEX idx_fleet_movements_empire_status_arrival ON fleet_movements(empire_id, status, estimated_arrival_time);

-- ======================
-- Messages Table
-- ======================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_username VARCHAR(20) NOT NULL,
    from_empire_name VARCHAR(50),
    
    to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_username VARCHAR(20) NOT NULL,
    to_empire_name VARCHAR(50),
    
    subject VARCHAR(200) NOT NULL,
    content VARCHAR(2000) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_messages_to_user ON messages(to_user_id, created_at DESC);
CREATE INDEX idx_messages_from_user ON messages(from_user_id, created_at DESC);
CREATE INDEX idx_messages_to_user_unread ON messages(to_user_id, is_read);

-- ======================
-- Research Projects Table
-- ======================
CREATE TABLE research_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empire_id UUID NOT NULL REFERENCES empires(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('military', 'economic', 'exploration')),
    name VARCHAR(100) NOT NULL CHECK (LENGTH(name) >= 3),
    description VARCHAR(500) NOT NULL,
    research_cost INTEGER NOT NULL CHECK (research_cost >= 1),
    research_progress INTEGER DEFAULT 0 NOT NULL CHECK (research_progress >= 0),
    is_completed BOOLEAN DEFAULT FALSE NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ,
    benefits JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_research_empire_id ON research_projects(empire_id);
CREATE INDEX idx_research_type ON research_projects(type);
CREATE INDEX idx_research_completed ON research_projects(is_completed);
CREATE INDEX idx_research_started ON research_projects(started_at);
CREATE INDEX idx_research_empire_type ON research_projects(empire_id, type);
CREATE INDEX idx_research_empire_completed ON research_projects(empire_id, is_completed);

-- ======================
-- Tech Queue Table
-- ======================
CREATE TABLE tech_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empire_id UUID NOT NULL REFERENCES empires(id) ON DELETE CASCADE,
    location_coord VARCHAR(50) NOT NULL CHECK (location_coord ~ '^[A-Z]\d{2}:\d{2}:\d{2}:\d{2}$'),
    tech_key VARCHAR(50) NOT NULL,
    level INTEGER DEFAULT 1 NOT NULL CHECK (level >= 1),
    identity_key VARCHAR(255) NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completes_at TIMESTAMPTZ,
    charged BOOLEAN DEFAULT FALSE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL 
        CHECK (status IN ('pending', 'completed', 'cancelled')),
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_tech_queue_empire_tech_status ON tech_queue(empire_id, tech_key, status);
CREATE INDEX idx_tech_queue_empire_tech_level_status ON tech_queue(empire_id, tech_key, level, status);
CREATE INDEX idx_tech_queue_completes_status ON tech_queue(completes_at, status);

-- Unique constraint for queue idempotency (only for pending items)
CREATE UNIQUE INDEX uniq_tech_queue_identity ON tech_queue(identity_key) 
WHERE status = 'pending';

-- ======================
-- Unit Queue Table
-- ======================
CREATE TABLE unit_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empire_id UUID NOT NULL REFERENCES empires(id) ON DELETE CASCADE,
    location_coord VARCHAR(50) NOT NULL CHECK (location_coord ~ '^[A-Z]\d{2}:\d{2}:\d{2}:\d{2}$'),
    unit_key VARCHAR(50) NOT NULL,
    identity_key VARCHAR(255) NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completes_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL 
        CHECK (status IN ('pending', 'completed', 'cancelled')),
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_unit_queue_empire_unit_status ON unit_queue(empire_id, unit_key, status);
CREATE INDEX idx_unit_queue_completes_status ON unit_queue(completes_at, status);
CREATE INDEX idx_unit_queue_location_status ON unit_queue(location_coord, status);

-- Unique constraint for queue idempotency (only for pending items)
CREATE UNIQUE INDEX uniq_unit_queue_identity ON unit_queue(identity_key) 
WHERE status = 'pending';

-- ======================
-- Defense Queue Table
-- ======================
CREATE TABLE defense_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empire_id UUID NOT NULL REFERENCES empires(id) ON DELETE CASCADE,
    location_coord VARCHAR(50) NOT NULL,
    defense_key VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL 
        CHECK (status IN ('pending', 'completed', 'cancelled')),
    started_at TIMESTAMPTZ,
    completes_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_defense_queue_empire_id ON defense_queue(empire_id);
CREATE INDEX idx_defense_queue_location ON defense_queue(location_coord);
CREATE INDEX idx_defense_queue_status ON defense_queue(status);
CREATE INDEX idx_defense_queue_empire_location_status ON defense_queue(empire_id, location_coord, status);

-- ======================
-- Credit Transactions Table
-- ======================
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empire_id UUID NOT NULL REFERENCES empires(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    balance_after INTEGER,
    type VARCHAR(50) NOT NULL,
    note TEXT,
    meta JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_credit_transactions_empire_created ON credit_transactions(empire_id, created_at DESC);

-- ======================
-- Update Triggers
-- ======================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_empires_updated_at BEFORE UPDATE ON empires 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_colonies_updated_at BEFORE UPDATE ON colonies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_buildings_updated_at BEFORE UPDATE ON buildings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fleets_updated_at BEFORE UPDATE ON fleets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fleet_movements_updated_at BEFORE UPDATE ON fleet_movements 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_research_projects_updated_at BEFORE UPDATE ON research_projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tech_queue_updated_at BEFORE UPDATE ON tech_queue 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_unit_queue_updated_at BEFORE UPDATE ON unit_queue 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_defense_queue_updated_at BEFORE UPDATE ON defense_queue 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_transactions_updated_at BEFORE UPDATE ON credit_transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ======================
-- Comments
-- ======================

COMMENT ON TABLE users IS 'User accounts and authentication';
COMMENT ON TABLE empires IS 'Player empires with resources and territories';
COMMENT ON TABLE locations IS 'Universe locations (planets, asteroids, stars)';
COMMENT ON TABLE colonies IS 'Player colonies on locations';
COMMENT ON TABLE buildings IS 'Buildings/structures on colonies';
COMMENT ON TABLE fleets IS 'Player fleets stationed at locations';
COMMENT ON TABLE fleet_movements IS 'Fleet movements between locations';
COMMENT ON TABLE messages IS 'Player-to-player messaging system';
COMMENT ON TABLE research_projects IS 'Legacy research projects (deprecated)';
COMMENT ON TABLE tech_queue IS 'Technology research queue';
COMMENT ON TABLE unit_queue IS 'Unit production queue';
COMMENT ON TABLE defense_queue IS 'Defense production queue';
COMMENT ON TABLE credit_transactions IS 'Empire credit transaction history';
