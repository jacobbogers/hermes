create schema auth 
create table auth.user (
   id bigserial, 
   name varchar(30) NOT NULL,  --nick of user, other user attributes in "user_props" table	
   email varchar(120) NOT NULL, --unique
   constraint pk_user primary key (id) 
) 
create unique index user_name_udx on auth.user(upper(name))
create unique index user_email_udx on auth.user (upper(email))  
--
create table user_props (  
   fk_user_id bigint,  
   prop_name varchar(30),  
   prop_value varchar(60),  
   invisible boolean default false,
   constraint user_props_user_fk 
     FOREIGN KEY (fk_user_id) REFERENCES auth.user(id) on delete cascade 
)
create UNIQUE index user_props_user_udx on auth.user_props(fk_user_id, prop_name)  
create index user_props_user_name_idx on auth.user_props(prop_name, fk_user_id)  
--
create table session_cookies_template ( -- insert a dummy '0' value
  id bigint,
  template_name varchar(30) not null,
  cookie_name varchar(30), 
  path varchar(128) default '/',
  max_age bigint, -- in ms
  http_only boolean default TRUE,
  secure boolean,
  domain varchar(128),
  same_site boolean,
  rolling boolean,
 CONSTRAINT session_cookies_template_pk PRIMARY KEY (id)
)
create unique index sct_pk on session_cookies_template(id)
create unique index sct_uix on session_cookies_template(template_name)
--
create table issued_user_tokens (  
   id varchar(64), -- token id
   fk_user_id bigint, --user id
   purpose CHAR(4), --CHAR-mnemonic for the purpose of issueing 
   ip_addr inet, -- ip@port of the user agent when this token was issued
   timestamp_issued bigint NOT NULL,  --time of issuance
   timestamp_revoked bigint default null,  -- if revoked, this is when!...     
   revoke_reason CHAR(2), -- if revoked, this is why! (MNEMONIC)
   timestamp_expire bigint NOT NULL, -- timestamp when this token expires
   fk_cookie_template_id bigint DEFAULT 0, --more info if this token is a cookie-token, default 0 is a dud template
   CONSTRAINT pk_issued_token PRIMARY KEY (id),
   CONSTRAINT fk_issued_token_user FOREIGN KEY (fk_user_id) REFERENCES auth.user(id) on delete cascade,
   CONSTRAINT fk_session_cookie_template FOREIGN KEY (fk_cookie_template_id) REFERENCES auth.session_cookies_template(id) on delete cascade 
)
CREATE index issued_token_udx on issued_user_tokens(id)
CREATE Index issued_token_user_idx on issued_user_tokens(fk_user_id) 
CREATE Index issued_tokens_expired_keys on issued_user_tokens(timestamp_expire)
create index issued_tokens_revoked on issued_user_tokens(timestamp_revoked)
--
create table session_props (
   fk_token_id varchar(64),
   session_prop_name varchar(30),
   session_prop_value varchar(120),
   invisible boolean default false,
   CONSTRAINT pk_session_props PRIMARY KEY (fk_token_id, session_prop_name),
   CONSTRAINT fk_token_id FOREIGN KEY (fk_token_id) REFERENCES auth.issued_user_tokens(id) on delete cascade
)
CREATE UNIQUE INDEX session_props_idx ON auth.session_props( fk_token_id, session_prop_name)
