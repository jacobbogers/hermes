CREATE SCHEMA auth;
CREATE TABLE auth.user (
    id VARCHAR(120),
    name VARCHAR(30) NOT NULL,  --nick of user, other user attributes in "user_props" table
    email VARCHAR(120) NOT NULL, --unique
    CONSTRAINT pk_user PRIMARY KEY (id)
);
CREATE UNIQUE INDEX user_name_udx ON auth.user(UPPER(name));
CREATE UNIQUE INDEX user_email_udx ON auth.user(UPPER(email));
--
CREATE TABLE auth.user_props (
    fk_user_id VARCHAR(120),
    prop_name VARCHAR(30),
    prop_value VARCHAR(256) NOT NULL DEFAULT '',
    invisible CHAR(1) NOT NULL DEFAULT 'F',
    CONSTRAINT user_props_user_fk
        FOREIGN KEY (fk_user_id) REFERENCES auth.user(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX user_props_user_udx ON auth.user_props(fk_user_id, UPPER(prop_name));
CREATE INDEX user_props_user_name_idx ON auth.user_props(UPPER(prop_name), fk_user_id);
--
CREATE TABLE auth.session_cookies_template ( -- insert a dummy '0' value
    id VARCHAR(120),
    template_name VARCHAR(30) NOT NULL,
    cookie_name VARCHAR(30),
    path VARCHAR(128) NOT NULL DEFAULT '/',
    max_age BIGINT, -- in ms
    http_only CHAR(1) NOT NULL DEFAULT 'T',
    secure CHAR(1) NOT NULL DEFAULT 'T',
    domain VARCHAR(128),
    same_site CHAR(1) NOT NULL DEFAULT 'T',
    rolling CHAR(1) NTO NULL DEFAULT 'T',
    CONSTRAINT session_cookies_template_pk PRIMARY KEY (id)
);

CREATE UNIQUE INDEX sct_pk ON session_cookies_template(id);
CREATE UNIQUE INDEX sct_uix ON session_cookies_template(UPPER(template_name));
--
CREATE TABLE issued_user_tokens (
    id VARCHAR(64),                          -- token id
    fk_user_id VARCHAR(120),                       -- user id
    purpose CHAR(4) NOT NULL,                         -- CHAR-mnemonic for the purpose of issuing
    ip_addr VARCHAR2(100),                            -- ip@port of the user agent when this token was issued
    timestamp_issued BIGINT NOT NULL,        -- time of issuance
    timestamp_revoked BIGINT DEFAULT NULL,   -- if revoked, this is when!...
    revoke_reason CHAR(2) NOT NULL DEFAULT 'EX',                   -- if revoked, this is why! (MNEMONIC)
    timestamp_expire BIGINT NOT NULL,        -- timestamp when this token expires
    fk_cookie_template_id BIGINT DEFAULT 0,  -- more info if this token is a cookie-token, default 0 is a dud template
    CONSTRAINT pk_issued_token PRIMARY KEY (id),
    CONSTRAINT fk_issued_token_user FOREIGN KEY (fk_user_id) REFERENCES auth.user(id) ON DELETE CASCADE,
    CONSTRAINT fk_session_cookie_template FOREIGN KEY (fk_cookie_template_id) REFERENCES auth.session_cookies_template(id) ON DELETE CASCADE
);
CREATE INDEX issued_token_udx ON issued_user_tokens(id);
CREATE INDEX issued_token_user_idx ON issued_user_tokens(fk_user_id);
CREATE INDEX issued_tokens_expired_keys ON issued_user_tokens(timestamp_expire);
CREATE INDEX issued_tokens_revoked ON issued_user_tokens(timestamp_revoked);
--
CREATE TABLE session_props (
    fk_token_id VARCHAR(64),
    session_prop_name VARCHAR(30),
    session_prop_value VARCHAR(120),
    invisible CHAR(1) NOT NULL DEFAULT 'F',
    CONSTRAINT pk_session_props PRIMARY KEY (fk_token_id, UPPER(session_prop_name)),
    CONSTRAINT fk_token_id FOREIGN KEY (fk_token_id) REFERENCES auth.issued_user_tokens(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX session_props_idx ON auth.session_props(fk_token_id, UPPER(session_prop_name));
