CREATE USER bookbarter WITH
    ENCRYPTED PASSWORD 'bookbarter' -- choose better password))
    LOGIN
    NOSUPERUSER
    INHERIT
    NOCREATEDB
    NOCREATEROLE
    NOREPLICATION;

CREATE DATABASE bookbarter -- yes has same name as user
    WITH
    OWNER = postgres -- pick a user with create db rights
    ENCODING = 'UTF8'
    LC_COLLATE = 'C'
    LC_CTYPE = 'C'
    TABLESPACE = pg_default
    TEMPLATE = template0
    CONNECTION LIMIT = -1;

COMMENT ON DATABASE bookbarter
    IS 'The book barter app';

GRANT ALL ON DATABASE bookbarter TO bookbarter;
