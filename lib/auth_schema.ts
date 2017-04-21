

/**
 * 
 * create table auth.user (
   id bigserial,
   name varchar(30),-- nick no spaces	
   email varchar(120),
   constraint pk_user primary key (id)	
)
 */

export interface User {
    id: number;
    name: string;
    email: string;
    userProps: UserProps[];
    issuedKeys: IssuedKeys[];
}
/*
create table user_props (
   fk_user bigint,
   name varchar(30),
   value varchar(60),
   constraint user_props_user_fk FOREIGN KEY (fk_user) REFERENCES auth.user(id)
)*/
export interface UserProps {
    name: string;
    value: string;
    user: User; // link to owner
}

/*
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
*/

/**
 * Note a user can be connected to the backend with multiple tabs, in this case there will be more then on
 * key of puprose 'SESSION' 
 * 
 */
export type PURPOSE = 'SESSION'|'RESET-PASSWORD'|'ACTIVATE-ACCOUNT'|'INVITATION';

export interface IssuedKeys {
    sessionKey: string;
    propose: PURPOSE;
    ipAddr: string;
    timeStampIssuance: number;
    timeStampRevoked: number;
    timeStampLifespan: number;
    user: User; //link to owner
}


const user = new Map<number, User>();
const sessionKeys = new Map<string, IssuedKeys>();
const sessionKeysRevoked = new Map<string, IssuedKeys>();

user;
sessionKeys;
sessionKeysRevoked;