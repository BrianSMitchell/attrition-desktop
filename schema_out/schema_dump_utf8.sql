


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."buildings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "location_coord" character varying(50) NOT NULL,
    "empire_id" "uuid" NOT NULL,
    "type" character varying(100) NOT NULL,
    "display_name" character varying(200),
    "catalog_key" character varying(100),
    "level" integer DEFAULT 1 NOT NULL,
    "construction_started" timestamp with time zone DEFAULT "now"() NOT NULL,
    "construction_completed" timestamp with time zone,
    "is_active" boolean DEFAULT false NOT NULL,
    "credits_cost" integer DEFAULT 0,
    "pending_upgrade" boolean DEFAULT false,
    "identity_key" character varying(255),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "buildings_level_check" CHECK (("level" >= 1)),
    CONSTRAINT "buildings_location_coord_check" CHECK ((("location_coord")::"text" ~ '^[A-Z]\d{2}:\d{2}:\d{2}:\d{2}$'::"text"))
);


ALTER TABLE "public"."buildings" OWNER TO "postgres";


COMMENT ON TABLE "public"."buildings" IS 'Buildings/structures on colonies';



CREATE TABLE IF NOT EXISTS "public"."colonies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empire_id" "uuid" NOT NULL,
    "location_coord" character varying(50) NOT NULL,
    "name" character varying(50) NOT NULL,
    "citizens" integer DEFAULT 0 NOT NULL,
    "last_citizen_update" timestamp with time zone,
    "citizen_remainder_milli" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "colonies_location_coord_check" CHECK ((("location_coord")::"text" ~ '^[A-Z]\d{2}:\d{2}:\d{2}:\d{2}$'::"text")),
    CONSTRAINT "colonies_name_check" CHECK (("length"(("name")::"text") >= 3))
);


ALTER TABLE "public"."colonies" OWNER TO "postgres";


COMMENT ON TABLE "public"."colonies" IS 'Player colonies on locations';



CREATE TABLE IF NOT EXISTS "public"."credit_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empire_id" "uuid" NOT NULL,
    "amount" integer NOT NULL,
    "balance_after" integer,
    "type" character varying(50) NOT NULL,
    "note" "text",
    "meta" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."credit_transactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."credit_transactions" IS 'Empire credit transaction history';



CREATE TABLE IF NOT EXISTS "public"."defense_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empire_id" "uuid" NOT NULL,
    "location_coord" character varying(50) NOT NULL,
    "defense_key" character varying(50) NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "started_at" timestamp with time zone,
    "completes_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "defense_queue_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "public"."defense_queue" OWNER TO "postgres";


COMMENT ON TABLE "public"."defense_queue" IS 'Defense production queue';



CREATE TABLE IF NOT EXISTS "public"."empires" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" character varying(50) NOT NULL,
    "home_system" character varying(50),
    "territories" "text"[] DEFAULT '{}'::"text"[],
    "base_count" integer DEFAULT 0 NOT NULL,
    "has_deleted_base" boolean DEFAULT false NOT NULL,
    "economy_per_hour" integer DEFAULT 0 NOT NULL,
    "credits" integer DEFAULT 0 NOT NULL,
    "energy" integer DEFAULT 0 NOT NULL,
    "last_resource_update" timestamp with time zone,
    "last_credit_payout" timestamp with time zone,
    "credits_remainder_milli" integer DEFAULT 0 NOT NULL,
    "tech_levels" "jsonb" DEFAULT '{}'::"jsonb",
    "next_fleet_number" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "empires_home_system_check" CHECK ((("home_system")::"text" ~ '^[A-Z]\d{2}:\d{2}:\d{2}:\d{2}$'::"text")),
    CONSTRAINT "empires_name_check" CHECK (("length"(("name")::"text") >= 1))
);


ALTER TABLE "public"."empires" OWNER TO "postgres";


COMMENT ON TABLE "public"."empires" IS 'Player empires with resources and territories';



CREATE TABLE IF NOT EXISTS "public"."fleet_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empire_id" "uuid" NOT NULL,
    "fleet_id" "uuid" NOT NULL,
    "origin_coord" character varying(50) NOT NULL,
    "destination_coord" character varying(50) NOT NULL,
    "units" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "size_credits" integer DEFAULT 0 NOT NULL,
    "departure_time" timestamp with time zone DEFAULT "now"() NOT NULL,
    "estimated_arrival_time" timestamp with time zone NOT NULL,
    "actual_arrival_time" timestamp with time zone,
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "travel_time_hours" real NOT NULL,
    "fleet_speed" real NOT NULL,
    "distance" real NOT NULL,
    "recall_time" timestamp with time zone,
    "recall_reason" character varying(500),
    "error_message" character varying(1000),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "fleet_movements_destination_coord_check" CHECK ((("destination_coord")::"text" ~ '^[A-Z]\d{2}:\d{2}:\d{2}:\d{2}$'::"text")),
    CONSTRAINT "fleet_movements_distance_check" CHECK (("distance" >= (0)::double precision)),
    CONSTRAINT "fleet_movements_fleet_speed_check" CHECK (("fleet_speed" >= (0)::double precision)),
    CONSTRAINT "fleet_movements_origin_coord_check" CHECK ((("origin_coord")::"text" ~ '^[A-Z]\d{2}:\d{2}:\d{2}:\d{2}$'::"text")),
    CONSTRAINT "fleet_movements_size_credits_check" CHECK (("size_credits" >= 0)),
    CONSTRAINT "fleet_movements_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'travelling'::character varying, 'arrived'::character varying, 'recalled'::character varying, 'failed'::character varying])::"text"[]))),
    CONSTRAINT "fleet_movements_travel_time_hours_check" CHECK (("travel_time_hours" >= (0)::double precision))
);


ALTER TABLE "public"."fleet_movements" OWNER TO "postgres";


COMMENT ON TABLE "public"."fleet_movements" IS 'Fleet movements between locations';



CREATE TABLE IF NOT EXISTS "public"."fleets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empire_id" "uuid" NOT NULL,
    "location_coord" character varying(50) NOT NULL,
    "name" character varying(100) NOT NULL,
    "units" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "size_credits" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "fleets_location_coord_check" CHECK ((("location_coord")::"text" ~ '^[A-Z]\d{2}:\d{2}:\d{2}:\d{2}$'::"text")),
    CONSTRAINT "fleets_name_check" CHECK (("length"(("name")::"text") >= 1)),
    CONSTRAINT "fleets_size_credits_check" CHECK (("size_credits" >= 0))
);


ALTER TABLE "public"."fleets" OWNER TO "postgres";


COMMENT ON TABLE "public"."fleets" IS 'Player fleets stationed at locations';



CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coord" character varying(50) NOT NULL,
    "type" character varying(20) NOT NULL,
    "orbit_position" integer,
    "terrain" "jsonb",
    "position_base" "jsonb",
    "star_applied" "jsonb",
    "result" "jsonb",
    "star_overhaul" "jsonb",
    "owner_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_coord_format" CHECK ((("coord")::"text" ~ '^[A-Z]\d{2}:\d{2}:\d{2}:\d{2}$'::"text")),
    CONSTRAINT "locations_coord_check" CHECK ((("coord")::"text" ~ '^[A-Z]\d{2}:\d{2}:\d{2}:\d{2}$'::"text")),
    CONSTRAINT "locations_orbit_position_check" CHECK ((("orbit_position" >= 1) AND ("orbit_position" <= 8))),
    CONSTRAINT "locations_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['planet'::character varying, 'asteroid'::character varying, 'star'::character varying])::"text"[])))
);


ALTER TABLE "public"."locations" OWNER TO "postgres";


COMMENT ON TABLE "public"."locations" IS 'Universe locations (planets, asteroids, stars)';



CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "from_user_id" "uuid" NOT NULL,
    "from_username" character varying(20) NOT NULL,
    "from_empire_name" character varying(50),
    "to_user_id" "uuid" NOT NULL,
    "to_username" character varying(20) NOT NULL,
    "to_empire_name" character varying(50),
    "subject" character varying(200) NOT NULL,
    "content" character varying(2000) NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."messages" IS 'Player-to-player messaging system';



CREATE TABLE IF NOT EXISTS "public"."research_projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empire_id" "uuid" NOT NULL,
    "type" character varying(20) NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" character varying(500) NOT NULL,
    "research_cost" integer NOT NULL,
    "research_progress" integer DEFAULT 0 NOT NULL,
    "is_completed" boolean DEFAULT false NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "benefits" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "research_projects_name_check" CHECK (("length"(("name")::"text") >= 3)),
    CONSTRAINT "research_projects_research_cost_check" CHECK (("research_cost" >= 1)),
    CONSTRAINT "research_projects_research_progress_check" CHECK (("research_progress" >= 0)),
    CONSTRAINT "research_projects_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['military'::character varying, 'economic'::character varying, 'exploration'::character varying])::"text"[])))
);


ALTER TABLE "public"."research_projects" OWNER TO "postgres";


COMMENT ON TABLE "public"."research_projects" IS 'Legacy research projects (deprecated)';



CREATE TABLE IF NOT EXISTS "public"."tech_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empire_id" "uuid" NOT NULL,
    "location_coord" character varying(50) NOT NULL,
    "tech_key" character varying(50) NOT NULL,
    "level" integer DEFAULT 1 NOT NULL,
    "identity_key" character varying(255) NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completes_at" timestamp with time zone,
    "charged" boolean DEFAULT false NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tech_queue_level_check" CHECK (("level" >= 1)),
    CONSTRAINT "tech_queue_location_coord_check" CHECK ((("location_coord")::"text" ~ '^[A-Z]\d{2}:\d{2}:\d{2}:\d{2}$'::"text")),
    CONSTRAINT "tech_queue_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "public"."tech_queue" OWNER TO "postgres";


COMMENT ON TABLE "public"."tech_queue" IS 'Technology research queue';



CREATE TABLE IF NOT EXISTS "public"."unit_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empire_id" "uuid" NOT NULL,
    "location_coord" character varying(50) NOT NULL,
    "unit_key" character varying(50) NOT NULL,
    "identity_key" character varying(255) NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completes_at" timestamp with time zone NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "unit_queue_location_coord_check" CHECK ((("location_coord")::"text" ~ '^[A-Z]\d{2}:\d{2}:\d{2}:\d{2}$'::"text")),
    CONSTRAINT "unit_queue_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "public"."unit_queue" OWNER TO "postgres";


COMMENT ON TABLE "public"."unit_queue" IS 'Unit production queue';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" character varying(255) NOT NULL,
    "username" character varying(20) NOT NULL,
    "password_hash" character varying(255) NOT NULL,
    "role" character varying(10) DEFAULT 'user'::character varying,
    "empire_id" "uuid",
    "credits" integer DEFAULT 100 NOT NULL,
    "experience" integer DEFAULT 0 NOT NULL,
    "starting_coordinate" character varying(50),
    "last_login" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "users_password_hash_check" CHECK (("length"(("password_hash")::"text") >= 6)),
    CONSTRAINT "users_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['user'::character varying, 'admin'::character varying])::"text"[]))),
    CONSTRAINT "users_starting_coordinate_check" CHECK ((("starting_coordinate")::"text" ~ '^[A-Z]\d{2}:\d{2}:\d{2}:\d{2}$'::"text")),
    CONSTRAINT "users_username_check" CHECK (("length"(("username")::"text") >= 3))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON TABLE "public"."users" IS 'User accounts and authentication';



ALTER TABLE ONLY "public"."buildings"
    ADD CONSTRAINT "buildings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."colonies"
    ADD CONSTRAINT "colonies_location_coord_key" UNIQUE ("location_coord");



ALTER TABLE ONLY "public"."colonies"
    ADD CONSTRAINT "colonies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credit_transactions"
    ADD CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."defense_queue"
    ADD CONSTRAINT "defense_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."empires"
    ADD CONSTRAINT "empires_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fleet_movements"
    ADD CONSTRAINT "fleet_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fleets"
    ADD CONSTRAINT "fleets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_coord_key" UNIQUE ("coord");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."research_projects"
    ADD CONSTRAINT "research_projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tech_queue"
    ADD CONSTRAINT "tech_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."unit_queue"
    ADD CONSTRAINT "unit_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_username_key" UNIQUE ("username");



CREATE INDEX "buildings_construction_completed_idx" ON "public"."buildings" USING "btree" ("construction_completed");



CREATE INDEX "buildings_empire_coord_active_idx" ON "public"."buildings" USING "btree" ("empire_id", "location_coord", "is_active");



CREATE INDEX "buildings_empire_coord_key_idx" ON "public"."buildings" USING "btree" ("empire_id", "location_coord", "catalog_key");



CREATE INDEX "idx_buildings_construction" ON "public"."buildings" USING "btree" ("construction_completed", "is_active");



CREATE INDEX "idx_buildings_empire_active" ON "public"."buildings" USING "btree" ("empire_id", "is_active");



CREATE INDEX "idx_buildings_empire_id" ON "public"."buildings" USING "btree" ("empire_id");



CREATE INDEX "idx_buildings_empire_location" ON "public"."buildings" USING "btree" ("empire_id", "location_coord");



CREATE INDEX "idx_colonies_empire_id" ON "public"."colonies" USING "btree" ("empire_id");



CREATE INDEX "idx_colonies_empire_location" ON "public"."colonies" USING "btree" ("empire_id", "location_coord");



CREATE INDEX "idx_colonies_name" ON "public"."colonies" USING "btree" ("name");



CREATE INDEX "idx_credit_transactions_empire_created" ON "public"."credit_transactions" USING "btree" ("empire_id", "created_at" DESC);



CREATE INDEX "idx_defense_queue_empire_id" ON "public"."defense_queue" USING "btree" ("empire_id");



CREATE INDEX "idx_defense_queue_empire_location_status" ON "public"."defense_queue" USING "btree" ("empire_id", "location_coord", "status");



CREATE INDEX "idx_defense_queue_location" ON "public"."defense_queue" USING "btree" ("location_coord");



CREATE INDEX "idx_defense_queue_status" ON "public"."defense_queue" USING "btree" ("status");



CREATE INDEX "idx_empires_credits" ON "public"."empires" USING "btree" ("credits" DESC);



CREATE INDEX "idx_empires_name" ON "public"."empires" USING "btree" ("name");



CREATE INDEX "idx_empires_user_id" ON "public"."empires" USING "btree" ("user_id");



CREATE INDEX "idx_fleet_movements_departure" ON "public"."fleet_movements" USING "btree" ("departure_time");



CREATE INDEX "idx_fleet_movements_destination" ON "public"."fleet_movements" USING "btree" ("destination_coord");



CREATE INDEX "idx_fleet_movements_empire_id" ON "public"."fleet_movements" USING "btree" ("empire_id");



CREATE INDEX "idx_fleet_movements_empire_status" ON "public"."fleet_movements" USING "btree" ("empire_id", "status");



CREATE INDEX "idx_fleet_movements_empire_status_arrival" ON "public"."fleet_movements" USING "btree" ("empire_id", "status", "estimated_arrival_time");



CREATE INDEX "idx_fleet_movements_fleet_id" ON "public"."fleet_movements" USING "btree" ("fleet_id");



CREATE INDEX "idx_fleet_movements_fleet_status" ON "public"."fleet_movements" USING "btree" ("fleet_id", "status");



CREATE INDEX "idx_fleet_movements_origin" ON "public"."fleet_movements" USING "btree" ("origin_coord");



CREATE INDEX "idx_fleet_movements_status" ON "public"."fleet_movements" USING "btree" ("status");



CREATE INDEX "idx_fleet_movements_status_arrival" ON "public"."fleet_movements" USING "btree" ("status", "estimated_arrival_time");



CREATE INDEX "idx_fleets_empire_id" ON "public"."fleets" USING "btree" ("empire_id");



CREATE INDEX "idx_fleets_empire_location" ON "public"."fleets" USING "btree" ("empire_id", "location_coord");



CREATE INDEX "idx_fleets_empire_name" ON "public"."fleets" USING "btree" ("empire_id", "name");



CREATE INDEX "idx_fleets_location" ON "public"."fleets" USING "btree" ("location_coord");



CREATE INDEX "idx_locations_coord" ON "public"."locations" USING "btree" ("coord");



CREATE INDEX "idx_locations_owner_id" ON "public"."locations" USING "btree" ("owner_id");



CREATE INDEX "idx_locations_owner_type" ON "public"."locations" USING "btree" ("owner_id", "type");



CREATE INDEX "idx_locations_type" ON "public"."locations" USING "btree" ("type");



CREATE INDEX "idx_messages_from_user" ON "public"."messages" USING "btree" ("from_user_id", "created_at" DESC);



CREATE INDEX "idx_messages_to_user" ON "public"."messages" USING "btree" ("to_user_id", "created_at" DESC);



CREATE INDEX "idx_messages_to_user_unread" ON "public"."messages" USING "btree" ("to_user_id", "is_read");



CREATE INDEX "idx_research_completed" ON "public"."research_projects" USING "btree" ("is_completed");



CREATE INDEX "idx_research_empire_completed" ON "public"."research_projects" USING "btree" ("empire_id", "is_completed");



CREATE INDEX "idx_research_empire_id" ON "public"."research_projects" USING "btree" ("empire_id");



CREATE INDEX "idx_research_empire_type" ON "public"."research_projects" USING "btree" ("empire_id", "type");



CREATE INDEX "idx_research_started" ON "public"."research_projects" USING "btree" ("started_at");



CREATE INDEX "idx_research_type" ON "public"."research_projects" USING "btree" ("type");



CREATE INDEX "idx_tech_queue_completes_status" ON "public"."tech_queue" USING "btree" ("completes_at", "status");



CREATE INDEX "idx_tech_queue_empire_tech_level_status" ON "public"."tech_queue" USING "btree" ("empire_id", "tech_key", "level", "status");



CREATE INDEX "idx_tech_queue_empire_tech_status" ON "public"."tech_queue" USING "btree" ("empire_id", "tech_key", "status");



CREATE INDEX "idx_unit_queue_completes_status" ON "public"."unit_queue" USING "btree" ("completes_at", "status");



CREATE INDEX "idx_unit_queue_empire_unit_status" ON "public"."unit_queue" USING "btree" ("empire_id", "unit_key", "status");



CREATE INDEX "idx_unit_queue_location_status" ON "public"."unit_queue" USING "btree" ("location_coord", "status");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_empire_id" ON "public"."users" USING "btree" ("empire_id");



CREATE INDEX "idx_users_username" ON "public"."users" USING "btree" ("username");



CREATE UNIQUE INDEX "uniq_empire_base_key" ON "public"."buildings" USING "btree" ("empire_id", "location_coord", "catalog_key") WHERE ("catalog_key" IS NOT NULL);



CREATE UNIQUE INDEX "uniq_tech_queue_identity" ON "public"."tech_queue" USING "btree" ("identity_key") WHERE (("status")::"text" = 'pending'::"text");



CREATE UNIQUE INDEX "uniq_unit_queue_identity" ON "public"."unit_queue" USING "btree" ("identity_key") WHERE (("status")::"text" = 'pending'::"text");



CREATE OR REPLACE TRIGGER "update_buildings_updated_at" BEFORE UPDATE ON "public"."buildings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_colonies_updated_at" BEFORE UPDATE ON "public"."colonies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_credit_transactions_updated_at" BEFORE UPDATE ON "public"."credit_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_defense_queue_updated_at" BEFORE UPDATE ON "public"."defense_queue" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_empires_updated_at" BEFORE UPDATE ON "public"."empires" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_fleet_movements_updated_at" BEFORE UPDATE ON "public"."fleet_movements" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_fleets_updated_at" BEFORE UPDATE ON "public"."fleets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_locations_updated_at" BEFORE UPDATE ON "public"."locations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_messages_updated_at" BEFORE UPDATE ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_research_projects_updated_at" BEFORE UPDATE ON "public"."research_projects" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tech_queue_updated_at" BEFORE UPDATE ON "public"."tech_queue" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_unit_queue_updated_at" BEFORE UPDATE ON "public"."unit_queue" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."buildings"
    ADD CONSTRAINT "buildings_empire_id_fkey" FOREIGN KEY ("empire_id") REFERENCES "public"."empires"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."colonies"
    ADD CONSTRAINT "colonies_empire_id_fkey" FOREIGN KEY ("empire_id") REFERENCES "public"."empires"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."credit_transactions"
    ADD CONSTRAINT "credit_transactions_empire_id_fkey" FOREIGN KEY ("empire_id") REFERENCES "public"."empires"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."defense_queue"
    ADD CONSTRAINT "defense_queue_empire_id_fkey" FOREIGN KEY ("empire_id") REFERENCES "public"."empires"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."empires"
    ADD CONSTRAINT "empires_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fleet_movements"
    ADD CONSTRAINT "fleet_movements_empire_id_fkey" FOREIGN KEY ("empire_id") REFERENCES "public"."empires"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fleet_movements"
    ADD CONSTRAINT "fleet_movements_fleet_id_fkey" FOREIGN KEY ("fleet_id") REFERENCES "public"."fleets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fleets"
    ADD CONSTRAINT "fleets_empire_id_fkey" FOREIGN KEY ("empire_id") REFERENCES "public"."empires"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."research_projects"
    ADD CONSTRAINT "research_projects_empire_id_fkey" FOREIGN KEY ("empire_id") REFERENCES "public"."empires"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tech_queue"
    ADD CONSTRAINT "tech_queue_empire_id_fkey" FOREIGN KEY ("empire_id") REFERENCES "public"."empires"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."unit_queue"
    ADD CONSTRAINT "unit_queue_empire_id_fkey" FOREIGN KEY ("empire_id") REFERENCES "public"."empires"("id") ON DELETE CASCADE;



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."buildings" TO "anon";
GRANT ALL ON TABLE "public"."buildings" TO "authenticated";
GRANT ALL ON TABLE "public"."buildings" TO "service_role";



GRANT ALL ON TABLE "public"."colonies" TO "anon";
GRANT ALL ON TABLE "public"."colonies" TO "authenticated";
GRANT ALL ON TABLE "public"."colonies" TO "service_role";



GRANT ALL ON TABLE "public"."credit_transactions" TO "anon";
GRANT ALL ON TABLE "public"."credit_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."credit_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."defense_queue" TO "anon";
GRANT ALL ON TABLE "public"."defense_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."defense_queue" TO "service_role";



GRANT ALL ON TABLE "public"."empires" TO "anon";
GRANT ALL ON TABLE "public"."empires" TO "authenticated";
GRANT ALL ON TABLE "public"."empires" TO "service_role";



GRANT ALL ON TABLE "public"."fleet_movements" TO "anon";
GRANT ALL ON TABLE "public"."fleet_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."fleet_movements" TO "service_role";



GRANT ALL ON TABLE "public"."fleets" TO "anon";
GRANT ALL ON TABLE "public"."fleets" TO "authenticated";
GRANT ALL ON TABLE "public"."fleets" TO "service_role";



GRANT ALL ON TABLE "public"."locations" TO "anon";
GRANT ALL ON TABLE "public"."locations" TO "authenticated";
GRANT ALL ON TABLE "public"."locations" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."research_projects" TO "anon";
GRANT ALL ON TABLE "public"."research_projects" TO "authenticated";
GRANT ALL ON TABLE "public"."research_projects" TO "service_role";



GRANT ALL ON TABLE "public"."tech_queue" TO "anon";
GRANT ALL ON TABLE "public"."tech_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."tech_queue" TO "service_role";



GRANT ALL ON TABLE "public"."unit_queue" TO "anon";
GRANT ALL ON TABLE "public"."unit_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."unit_queue" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







RESET ALL;
