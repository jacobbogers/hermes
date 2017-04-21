create schema auth 
create table auth.user (
   id bigserial,
   name varchar(30),-- nick no spaces	
   email varchar(120),
   constraint pk_user primary key (id)	
)
CREATE unique INDEX user_name_udx ON auth.user (name)
create unique index user_email_udx on auth.user (email)
create table user_props (
   fk_user bigint,
   name varchar(30),
   value varchar(60),
   constraint user_props_user_fk FOREIGN KEY (fk_user) REFERENCES auth.user(id)
)
create UNIQUE index user_props_user_udx on user_props(fk_user, name)
create index user_props_user_name_idx on user_props(name, fk_user)
create table issued_keys (
   fk_user bigint,
   session_key UUID,
   purpose varchar(5),   
   ip_addr inet,

   timestamp_issued bigint,  
   timestamp_revoked bigint,     
   timestamp_lifespan bigint,
   CONSTRAINT pk_issued_keys PRIMARY KEY (session_key),
   CONSTRAINT fk_issued_keys_user FOREIGN KEY (fk_user) REFERENCES auth.user(id)
)
CREATE UNIQUE index issued_keys_ses_usr_udx on issued_keys (session_key)
CREATE Index issued_keys_ses_usr_idx on issued_keys (fk_user, session_key) 
CREATE Index expired_keys on issued_keys (timestamp_issued)
create table session_props (
  fk_session bigint,
  name varchar(30),
  value varchar(60),
 CONSTRAINT session_props_session
   FOREIGN KEY (fk_session) REFERENCES auth.user(id)
)
CREATE UNIQUE INDEX session_props_name_udx ON session_props (name, fk_session)
CREATE INDEX session_props_fk_session ON session_props( fk_session, name);
