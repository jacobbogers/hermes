

export interface GlobalPropsEnum {
    'ok': string;
    'await-activation': string;
    'blacklisted': string;
    'no-acl': string;
    'password-reset': string;
    'name-available': string;
    'email-available': string;
    'name-unavailable': string;
    'email-unavailable': string;
    'password': string;
    'stkn': string;
    'anonymous': string;
    'default_cookie': string;
    'user-logged-in': string;
    
    //field-entry
    'no-username': string;
    'no-email': string;
    'no-password': string;
    
    //authentication and creation
    'username-exist': string;
    'email-exist': string;
    'auth-failed': string;
    
    //sytem  infrastructure errors
    'err-auxiliary': string;
    'err-session-save': string;
    'err-session-object': string;
    'err-no-store-object': string;
    'err-no-anon-user': string;
    'err-no-hermes-token': string;

}

export type Constants = keyof GlobalPropsEnum;
