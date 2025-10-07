--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (Debian 16.9-1.pgdg120+1)
-- Dumped by pg_dump version 16.9 (Debian 16.9-1.pgdg120+1)

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

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _FleetBattles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."_FleetBattles" (
    "A" uuid NOT NULL,
    "B" uuid NOT NULL
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: battles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.battles (
    id uuid NOT NULL,
    "locationId" uuid NOT NULL,
    status character varying(50) DEFAULT 'ongoing'::character varying NOT NULL,
    "attackerIds" uuid[],
    "defenderIds" uuid[],
    "winnerId" uuid,
    "battleLog" jsonb,
    casualties jsonb,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone
);


--
-- Name: building_prerequisites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.building_prerequisites (
    "buildingTypeId" uuid NOT NULL,
    "prerequisiteId" uuid NOT NULL
);


--
-- Name: building_technology_requirements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.building_technology_requirements (
    "buildingTypeId" uuid NOT NULL,
    "technologyId" uuid NOT NULL
);


--
-- Name: building_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.building_types (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text NOT NULL,
    "creditsCost" integer DEFAULT 0 NOT NULL,
    "energyCost" integer DEFAULT 0 NOT NULL,
    "materialsCost" integer DEFAULT 0 NOT NULL,
    "populationCost" integer DEFAULT 0 NOT NULL,
    "buildTime" integer NOT NULL,
    "creditsPerTick" integer DEFAULT 0 NOT NULL,
    "energyPerTick" integer DEFAULT 0 NOT NULL,
    "materialsPerTick" integer DEFAULT 0 NOT NULL,
    "populationPerTick" integer DEFAULT 0 NOT NULL,
    "researchPerTick" integer DEFAULT 0 NOT NULL,
    "maxLevel" integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    branch character varying(50) DEFAULT 'general'::character varying NOT NULL,
    effects jsonb,
    "maintenanceCosts" jsonb,
    rarity character varying(50) DEFAULT 'common'::character varying NOT NULL,
    synergies jsonb,
    tier character varying(50) DEFAULT 'basic'::character varying NOT NULL,
    "requiredPlayerLevel" integer DEFAULT 1 NOT NULL
);


--
-- Name: construction_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.construction_queue (
    id uuid NOT NULL,
    "playerId" uuid NOT NULL,
    "buildingTypeId" uuid NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completesAt" timestamp(3) without time zone NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    "creditsSpent" integer NOT NULL,
    "energySpent" integer NOT NULL,
    "materialsSpent" integer NOT NULL,
    "populationSpent" integer NOT NULL
);


--
-- Name: debris_fields; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.debris_fields (
    id uuid NOT NULL,
    "locationId" uuid NOT NULL,
    "battleId" uuid,
    credits integer DEFAULT 0 NOT NULL,
    energy integer DEFAULT 0 NOT NULL,
    materials integer DEFAULT 0 NOT NULL,
    population integer DEFAULT 0 NOT NULL,
    "shipWrecks" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "decaysAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: fleet_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fleet_movements (
    id uuid NOT NULL,
    "fleetId" uuid NOT NULL,
    "fromId" uuid,
    "toId" uuid NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "arrivesAt" timestamp(3) without time zone NOT NULL,
    completed boolean DEFAULT false NOT NULL
);


--
-- Name: fleets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fleets (
    id uuid NOT NULL,
    "playerId" uuid NOT NULL,
    name character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'docked'::character varying NOT NULL,
    "locationId" uuid,
    "missionType" character varying(50),
    "targetId" uuid,
    "missionData" jsonb,
    "movementRange" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: galaxy_nodes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.galaxy_nodes (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    x integer NOT NULL,
    y integer NOT NULL,
    z integer DEFAULT 0 NOT NULL,
    resources jsonb,
    hazards jsonb,
    structures jsonb,
    "discoveredBy" uuid,
    "discoveredAt" timestamp(3) without time zone,
    "controlledBy" uuid,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "migratedToSpatialObjectId" uuid
);


--
-- Name: player_bases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_bases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    player_id uuid NOT NULL,
    astro_id uuid NOT NULL,
    base_name character varying(255) NOT NULL,
    is_home_base boolean DEFAULT false,
    established_at timestamp without time zone DEFAULT now() NOT NULL,
    last_activity timestamp without time zone DEFAULT now() NOT NULL,
    protection_expires timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT player_bases_map CHECK (true)
);


--
-- Name: player_buildings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_buildings (
    id uuid NOT NULL,
    "playerId" uuid NOT NULL,
    "buildingTypeId" uuid NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    "constructedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: player_home_systems; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_home_systems (
    id uuid NOT NULL,
    "playerId" uuid NOT NULL,
    "homeSystemId" uuid NOT NULL,
    "homePlanetId" uuid NOT NULL,
    "homeColonyId" uuid NOT NULL,
    "protectionExpiry" timestamp(3) without time zone,
    "spawnRegion" character varying(50) NOT NULL,
    "startingCredits" integer DEFAULT 1000 NOT NULL,
    "startingEnergy" integer DEFAULT 100 NOT NULL,
    "startingMaterials" integer DEFAULT 50 NOT NULL,
    "startingPopulation" integer DEFAULT 10 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: player_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_profiles (
    "playerId" uuid NOT NULL,
    name character varying(255) NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    "lastLoginAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "economyScore" integer DEFAULT 0 NOT NULL,
    "fleetScore" integer DEFAULT 0 NOT NULL,
    "levelUpdatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "nextLevelAt" integer DEFAULT 2200 NOT NULL,
    "technologyScore" integer DEFAULT 0 NOT NULL
);


--
-- Name: player_resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_resources (
    "playerId" uuid NOT NULL,
    credits integer DEFAULT 1000 NOT NULL,
    energy integer DEFAULT 100 NOT NULL,
    materials integer DEFAULT 50 NOT NULL,
    population integer DEFAULT 10 NOT NULL,
    "researchPoints" integer DEFAULT 0 NOT NULL,
    "lastTickAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "creditsPerTick" integer DEFAULT 0 NOT NULL,
    "energyPerTick" integer DEFAULT 0 NOT NULL,
    "materialsPerTick" integer DEFAULT 0 NOT NULL,
    "populationPerTick" integer DEFAULT 0 NOT NULL,
    "researchPerTick" integer DEFAULT 0 NOT NULL
);


--
-- Name: player_technologies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_technologies (
    "playerId" uuid NOT NULL,
    "technologyId" uuid NOT NULL,
    "researchedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastUpgradedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    level integer DEFAULT 1 NOT NULL
);


--
-- Name: players; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.players (
    id uuid NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ship_technology_requirements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ship_technology_requirements (
    "shipTypeId" uuid NOT NULL,
    "technologyId" uuid NOT NULL
);


--
-- Name: ship_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ship_types (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text NOT NULL,
    category character varying(50) NOT NULL,
    "creditsCost" integer DEFAULT 0 NOT NULL,
    "energyCost" integer DEFAULT 0 NOT NULL,
    "materialsCost" integer DEFAULT 0 NOT NULL,
    "populationCost" integer DEFAULT 0 NOT NULL,
    "buildTime" integer NOT NULL,
    "hullPoints" integer DEFAULT 100 NOT NULL,
    "attackPower" integer DEFAULT 10 NOT NULL,
    defense integer DEFAULT 5 NOT NULL,
    speed integer DEFAULT 1 NOT NULL,
    "cargoCapacity" integer DEFAULT 0 NOT NULL,
    "maintenanceCosts" jsonb,
    abilities jsonb,
    effectiveness jsonb,
    tier character varying(50) DEFAULT 'basic'::character varying NOT NULL,
    branch character varying(50) DEFAULT 'general'::character varying NOT NULL,
    rarity character varying(50) DEFAULT 'common'::character varying NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "requiredPlayerLevel" integer DEFAULT 1 NOT NULL
);


--
-- Name: ships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ships (
    id uuid NOT NULL,
    "playerId" uuid NOT NULL,
    "shipTypeId" uuid NOT NULL,
    "fleetId" uuid,
    name character varying(255),
    "currentHull" integer NOT NULL,
    experience integer DEFAULT 0 NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    status character varying(50) DEFAULT 'docked'::character varying NOT NULL,
    "locationId" uuid,
    "cargoCredits" integer DEFAULT 0 NOT NULL,
    "cargoEnergy" integer DEFAULT 0 NOT NULL,
    "cargoMaterials" integer DEFAULT 0 NOT NULL,
    "cargoPopulation" integer DEFAULT 0 NOT NULL,
    "constructedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: shipyard_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipyard_queue (
    id uuid NOT NULL,
    "playerId" uuid NOT NULL,
    "shipTypeId" uuid NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completesAt" timestamp(3) without time zone NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    "creditsSpent" integer NOT NULL,
    "energySpent" integer NOT NULL,
    "materialsSpent" integer NOT NULL,
    "populationSpent" integer NOT NULL
);


--
-- Name: spatial_objects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.spatial_objects (
    id uuid NOT NULL,
    "objectType" character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    "universeX" integer,
    "universeY" integer,
    "universeZ" integer,
    "galaxyX" integer,
    "galaxyY" integer,
    "galaxyZ" integer,
    "systemX" integer,
    "systemY" integer,
    "systemZ" integer,
    "planetX" double precision,
    "planetY" double precision,
    "parentId" uuid,
    "ownerId" uuid,
    "claimedAt" timestamp(3) without time zone,
    "lastActivity" timestamp(3) without time zone,
    properties jsonb,
    "discoveredBy" uuid,
    "discoveredAt" timestamp(3) without time zone,
    "isExplorable" boolean DEFAULT false NOT NULL,
    "strategicValue" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: technologies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.technologies (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text NOT NULL,
    "researchCost" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    branch character varying(50) DEFAULT 'general'::character varying NOT NULL,
    effects jsonb,
    rarity character varying(50) DEFAULT 'common'::character varying NOT NULL,
    tier character varying(50) DEFAULT 'basic'::character varying NOT NULL,
    "requiredPlayerLevel" integer DEFAULT 1 NOT NULL,
    "maxLevel" integer DEFAULT 10 NOT NULL
);


--
-- Name: technology_prerequisites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.technology_prerequisites (
    "technologyId" uuid NOT NULL,
    "prerequisiteId" uuid NOT NULL
);


--
-- Name: universe_objects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.universe_objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    object_type character varying(50) NOT NULL,
    galaxy_id integer,
    sector_x integer,
    sector_y integer,
    system_id integer,
    ring_id integer,
    astro_id integer,
    name character varying(255) NOT NULL,
    astro_type character varying(50),
    fertility integer DEFAULT 0,
    area integer DEFAULT 0,
    solar_energy integer DEFAULT 0,
    metal_bonus integer DEFAULT 0,
    gas_bonus integer DEFAULT 0,
    crystal_bonus integer DEFAULT 0,
    owner_id uuid,
    base_id uuid,
    claimed_at timestamp without time zone,
    discovered_by uuid[],
    is_colonizable boolean DEFAULT false,
    is_gateway boolean DEFAULT false,
    properties jsonb,
    parent_id uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT area_range CHECK (((area >= 0) AND (area <= 100))),
    CONSTRAINT astro_id_range CHECK (((astro_id >= 1) AND (astro_id <= 15))),
    CONSTRAINT crystal_bonus_range CHECK (((crystal_bonus >= 0) AND (crystal_bonus <= 100))),
    CONSTRAINT fertility_range CHECK (((fertility >= 0) AND (fertility <= 100))),
    CONSTRAINT galaxy_id_range CHECK (((galaxy_id >= 0) AND (galaxy_id <= 9))),
    CONSTRAINT gas_bonus_range CHECK (((gas_bonus >= 0) AND (gas_bonus <= 100))),
    CONSTRAINT metal_bonus_range CHECK (((metal_bonus >= 0) AND (metal_bonus <= 100))),
    CONSTRAINT ring_id_range CHECK (((ring_id >= 1) AND (ring_id <= 5))),
    CONSTRAINT sector_x_range CHECK (((sector_x >= 0) AND (sector_x <= 99))),
    CONSTRAINT sector_y_range CHECK (((sector_y >= 0) AND (sector_y <= 99))),
    CONSTRAINT solar_energy_range CHECK (((solar_energy >= 0) AND (solar_energy <= 100))),
    CONSTRAINT system_id_range CHECK (((system_id >= 0) AND (system_id <= 99))),
    CONSTRAINT universe_objects_map CHECK (true)
);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: battles battles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.battles
    ADD CONSTRAINT battles_pkey PRIMARY KEY (id);


--
-- Name: building_prerequisites building_prerequisites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.building_prerequisites
    ADD CONSTRAINT building_prerequisites_pkey PRIMARY KEY ("buildingTypeId", "prerequisiteId");


--
-- Name: building_technology_requirements building_technology_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.building_technology_requirements
    ADD CONSTRAINT building_technology_requirements_pkey PRIMARY KEY ("buildingTypeId", "technologyId");


--
-- Name: building_types building_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.building_types
    ADD CONSTRAINT building_types_pkey PRIMARY KEY (id);


--
-- Name: construction_queue construction_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.construction_queue
    ADD CONSTRAINT construction_queue_pkey PRIMARY KEY (id);


--
-- Name: debris_fields debris_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debris_fields
    ADD CONSTRAINT debris_fields_pkey PRIMARY KEY (id);


--
-- Name: fleet_movements fleet_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fleet_movements
    ADD CONSTRAINT fleet_movements_pkey PRIMARY KEY (id);


--
-- Name: fleets fleets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fleets
    ADD CONSTRAINT fleets_pkey PRIMARY KEY (id);


--
-- Name: galaxy_nodes galaxy_nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.galaxy_nodes
    ADD CONSTRAINT galaxy_nodes_pkey PRIMARY KEY (id);


--
-- Name: player_bases player_bases_astro_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_bases
    ADD CONSTRAINT player_bases_astro_unique UNIQUE (astro_id);


--
-- Name: player_bases player_bases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_bases
    ADD CONSTRAINT player_bases_pkey PRIMARY KEY (id);


--
-- Name: player_buildings player_buildings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_buildings
    ADD CONSTRAINT player_buildings_pkey PRIMARY KEY (id);


--
-- Name: player_home_systems player_home_systems_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_home_systems
    ADD CONSTRAINT player_home_systems_pkey PRIMARY KEY (id);


--
-- Name: player_technologies player_technologies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_technologies
    ADD CONSTRAINT player_technologies_pkey PRIMARY KEY ("playerId", "technologyId");


--
-- Name: players players_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_pkey PRIMARY KEY (id);


--
-- Name: ship_technology_requirements ship_technology_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ship_technology_requirements
    ADD CONSTRAINT ship_technology_requirements_pkey PRIMARY KEY ("shipTypeId", "technologyId");


--
-- Name: ship_types ship_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ship_types
    ADD CONSTRAINT ship_types_pkey PRIMARY KEY (id);


--
-- Name: ships ships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ships
    ADD CONSTRAINT ships_pkey PRIMARY KEY (id);


--
-- Name: shipyard_queue shipyard_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipyard_queue
    ADD CONSTRAINT shipyard_queue_pkey PRIMARY KEY (id);


--
-- Name: spatial_objects spatial_objects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spatial_objects
    ADD CONSTRAINT spatial_objects_pkey PRIMARY KEY (id);


--
-- Name: technologies technologies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.technologies
    ADD CONSTRAINT technologies_pkey PRIMARY KEY (id);


--
-- Name: technology_prerequisites technology_prerequisites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.technology_prerequisites
    ADD CONSTRAINT technology_prerequisites_pkey PRIMARY KEY ("technologyId", "prerequisiteId");


--
-- Name: universe_objects universe_objects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.universe_objects
    ADD CONSTRAINT universe_objects_pkey PRIMARY KEY (id);


--
-- Name: _FleetBattles_AB_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "_FleetBattles_AB_unique" ON public."_FleetBattles" USING btree ("A", "B");


--
-- Name: _FleetBattles_B_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "_FleetBattles_B_index" ON public."_FleetBattles" USING btree ("B");


--
-- Name: building_types_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX building_types_name_key ON public.building_types USING btree (name);


--
-- Name: player_bases_astro_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX player_bases_astro_id_idx ON public.player_bases USING btree (astro_id);


--
-- Name: player_bases_home_base_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX player_bases_home_base_idx ON public.player_bases USING btree (is_home_base);


--
-- Name: player_bases_player_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX player_bases_player_id_idx ON public.player_bases USING btree (player_id);


--
-- Name: player_home_systems_playerId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "player_home_systems_playerId_key" ON public.player_home_systems USING btree ("playerId");


--
-- Name: player_profiles_playerId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "player_profiles_playerId_key" ON public.player_profiles USING btree ("playerId");


--
-- Name: player_resources_playerId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "player_resources_playerId_key" ON public.player_resources USING btree ("playerId");


--
-- Name: ship_types_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ship_types_name_key ON public.ship_types USING btree (name);


--
-- Name: spatial_objects_discoveredBy_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "spatial_objects_discoveredBy_idx" ON public.spatial_objects USING btree ("discoveredBy");


--
-- Name: spatial_objects_galaxyX_galaxyY_galaxyZ_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "spatial_objects_galaxyX_galaxyY_galaxyZ_idx" ON public.spatial_objects USING btree ("galaxyX", "galaxyY", "galaxyZ");


--
-- Name: spatial_objects_objectType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "spatial_objects_objectType_idx" ON public.spatial_objects USING btree ("objectType");


--
-- Name: spatial_objects_ownerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "spatial_objects_ownerId_idx" ON public.spatial_objects USING btree ("ownerId");


--
-- Name: spatial_objects_parentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "spatial_objects_parentId_idx" ON public.spatial_objects USING btree ("parentId");


--
-- Name: spatial_objects_systemX_systemY_systemZ_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "spatial_objects_systemX_systemY_systemZ_idx" ON public.spatial_objects USING btree ("systemX", "systemY", "systemZ");


--
-- Name: spatial_objects_universeX_universeY_universeZ_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "spatial_objects_universeX_universeY_universeZ_idx" ON public.spatial_objects USING btree ("universeX", "universeY", "universeZ");


--
-- Name: technologies_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX technologies_name_key ON public.technologies USING btree (name);


--
-- Name: universe_objects_colonizable_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX universe_objects_colonizable_idx ON public.universe_objects USING btree (is_colonizable);


--
-- Name: universe_objects_galaxy_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX universe_objects_galaxy_id_idx ON public.universe_objects USING btree (galaxy_id);


--
-- Name: universe_objects_owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX universe_objects_owner_idx ON public.universe_objects USING btree (owner_id);


--
-- Name: universe_objects_parent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX universe_objects_parent_idx ON public.universe_objects USING btree (parent_id);


--
-- Name: universe_objects_sector_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX universe_objects_sector_idx ON public.universe_objects USING btree (galaxy_id, sector_x, sector_y);


--
-- Name: universe_objects_system_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX universe_objects_system_idx ON public.universe_objects USING btree (galaxy_id, sector_x, sector_y, system_id);


--
-- Name: universe_objects_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX universe_objects_type_idx ON public.universe_objects USING btree (object_type);


--
-- Name: _FleetBattles _FleetBattles_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_FleetBattles"
    ADD CONSTRAINT "_FleetBattles_A_fkey" FOREIGN KEY ("A") REFERENCES public.battles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _FleetBattles _FleetBattles_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_FleetBattles"
    ADD CONSTRAINT "_FleetBattles_B_fkey" FOREIGN KEY ("B") REFERENCES public.fleets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: battles battles_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.battles
    ADD CONSTRAINT "battles_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public.galaxy_nodes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: building_prerequisites building_prerequisites_buildingTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.building_prerequisites
    ADD CONSTRAINT "building_prerequisites_buildingTypeId_fkey" FOREIGN KEY ("buildingTypeId") REFERENCES public.building_types(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: building_prerequisites building_prerequisites_prerequisiteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.building_prerequisites
    ADD CONSTRAINT "building_prerequisites_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES public.building_types(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: building_technology_requirements building_technology_requirements_buildingTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.building_technology_requirements
    ADD CONSTRAINT "building_technology_requirements_buildingTypeId_fkey" FOREIGN KEY ("buildingTypeId") REFERENCES public.building_types(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: building_technology_requirements building_technology_requirements_technologyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.building_technology_requirements
    ADD CONSTRAINT "building_technology_requirements_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES public.technologies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: construction_queue construction_queue_buildingTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.construction_queue
    ADD CONSTRAINT "construction_queue_buildingTypeId_fkey" FOREIGN KEY ("buildingTypeId") REFERENCES public.building_types(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: construction_queue construction_queue_playerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.construction_queue
    ADD CONSTRAINT "construction_queue_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: debris_fields debris_fields_battleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debris_fields
    ADD CONSTRAINT "debris_fields_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES public.battles(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: debris_fields debris_fields_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debris_fields
    ADD CONSTRAINT "debris_fields_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public.galaxy_nodes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: fleet_movements fleet_movements_fleetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fleet_movements
    ADD CONSTRAINT "fleet_movements_fleetId_fkey" FOREIGN KEY ("fleetId") REFERENCES public.fleets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: fleet_movements fleet_movements_fromId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fleet_movements
    ADD CONSTRAINT "fleet_movements_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES public.galaxy_nodes(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: fleet_movements fleet_movements_toId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fleet_movements
    ADD CONSTRAINT "fleet_movements_toId_fkey" FOREIGN KEY ("toId") REFERENCES public.galaxy_nodes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: fleets fleets_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fleets
    ADD CONSTRAINT "fleets_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public.galaxy_nodes(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: fleets fleets_playerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fleets
    ADD CONSTRAINT "fleets_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: galaxy_nodes galaxy_nodes_controlledBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.galaxy_nodes
    ADD CONSTRAINT "galaxy_nodes_controlledBy_fkey" FOREIGN KEY ("controlledBy") REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: galaxy_nodes galaxy_nodes_discoveredBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.galaxy_nodes
    ADD CONSTRAINT "galaxy_nodes_discoveredBy_fkey" FOREIGN KEY ("discoveredBy") REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: player_bases player_bases_astro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_bases
    ADD CONSTRAINT player_bases_astro_id_fkey FOREIGN KEY (astro_id) REFERENCES public.universe_objects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: player_bases player_bases_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_bases
    ADD CONSTRAINT player_bases_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: player_buildings player_buildings_buildingTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_buildings
    ADD CONSTRAINT "player_buildings_buildingTypeId_fkey" FOREIGN KEY ("buildingTypeId") REFERENCES public.building_types(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: player_buildings player_buildings_playerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_buildings
    ADD CONSTRAINT "player_buildings_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: player_home_systems player_home_systems_homeSystemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_home_systems
    ADD CONSTRAINT "player_home_systems_homeSystemId_fkey" FOREIGN KEY ("homeSystemId") REFERENCES public.spatial_objects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: player_home_systems player_home_systems_playerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_home_systems
    ADD CONSTRAINT "player_home_systems_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: player_profiles player_profiles_playerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_profiles
    ADD CONSTRAINT "player_profiles_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: player_resources player_resources_playerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_resources
    ADD CONSTRAINT "player_resources_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: player_technologies player_technologies_playerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_technologies
    ADD CONSTRAINT "player_technologies_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: player_technologies player_technologies_technologyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_technologies
    ADD CONSTRAINT "player_technologies_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES public.technologies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ship_technology_requirements ship_technology_requirements_shipTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ship_technology_requirements
    ADD CONSTRAINT "ship_technology_requirements_shipTypeId_fkey" FOREIGN KEY ("shipTypeId") REFERENCES public.ship_types(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ship_technology_requirements ship_technology_requirements_technologyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ship_technology_requirements
    ADD CONSTRAINT "ship_technology_requirements_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES public.technologies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ships ships_fleetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ships
    ADD CONSTRAINT "ships_fleetId_fkey" FOREIGN KEY ("fleetId") REFERENCES public.fleets(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ships ships_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ships
    ADD CONSTRAINT "ships_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public.galaxy_nodes(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ships ships_playerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ships
    ADD CONSTRAINT "ships_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ships ships_shipTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ships
    ADD CONSTRAINT "ships_shipTypeId_fkey" FOREIGN KEY ("shipTypeId") REFERENCES public.ship_types(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: shipyard_queue shipyard_queue_playerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipyard_queue
    ADD CONSTRAINT "shipyard_queue_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: shipyard_queue shipyard_queue_shipTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipyard_queue
    ADD CONSTRAINT "shipyard_queue_shipTypeId_fkey" FOREIGN KEY ("shipTypeId") REFERENCES public.ship_types(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: spatial_objects spatial_objects_discoveredBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spatial_objects
    ADD CONSTRAINT "spatial_objects_discoveredBy_fkey" FOREIGN KEY ("discoveredBy") REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: spatial_objects spatial_objects_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spatial_objects
    ADD CONSTRAINT "spatial_objects_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: spatial_objects spatial_objects_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spatial_objects
    ADD CONSTRAINT "spatial_objects_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public.spatial_objects(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: technology_prerequisites technology_prerequisites_prerequisiteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.technology_prerequisites
    ADD CONSTRAINT "technology_prerequisites_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES public.technologies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: technology_prerequisites technology_prerequisites_technologyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.technology_prerequisites
    ADD CONSTRAINT "technology_prerequisites_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES public.technologies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: universe_objects universe_objects_base_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.universe_objects
    ADD CONSTRAINT universe_objects_base_id_fkey FOREIGN KEY (base_id) REFERENCES public.player_bases(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: universe_objects universe_objects_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.universe_objects
    ADD CONSTRAINT universe_objects_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: universe_objects universe_objects_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.universe_objects
    ADD CONSTRAINT universe_objects_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.universe_objects(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

