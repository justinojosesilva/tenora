-- Create databases
CREATE DATABASE tenora_dev;
CREATE DATABASE tenora_test;

-- Create app user (CREATEDB for Prisma shadow DB, but NO BYPASSRLS — subject to RLS)
CREATE USER tenora_app WITH PASSWORD 'tenora123' CREATEDB;

-- Create migrator user (can bypass RLS to run migrations, needs CREATEDB for Prisma shadow DB)
CREATE USER tenora_migrator WITH PASSWORD 'migrator123' BYPASSRLS CREATEDB;

-- Grant connection privileges
GRANT CONNECT ON DATABASE tenora_dev TO tenora_app;
GRANT CONNECT ON DATABASE tenora_dev TO tenora_migrator;
GRANT CONNECT ON DATABASE tenora_test TO tenora_app;
GRANT CONNECT ON DATABASE tenora_test TO tenora_migrator;

-- Grant schema usage and table privileges for tenora_dev
\connect tenora_dev
GRANT USAGE ON SCHEMA public TO tenora_app;
GRANT USAGE ON SCHEMA public TO tenora_migrator;
GRANT ALL PRIVILEGES ON SCHEMA public TO tenora_migrator;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tenora_migrator;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO tenora_migrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO tenora_migrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO tenora_migrator;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tenora_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO tenora_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO tenora_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO tenora_app;

-- Grant schema usage and table privileges for tenora_test
\connect tenora_test
GRANT USAGE ON SCHEMA public TO tenora_app;
GRANT USAGE ON SCHEMA public TO tenora_migrator;
GRANT ALL PRIVILEGES ON SCHEMA public TO tenora_migrator;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tenora_migrator;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO tenora_migrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO tenora_migrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO tenora_migrator;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tenora_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO tenora_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO tenora_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO tenora_app;
