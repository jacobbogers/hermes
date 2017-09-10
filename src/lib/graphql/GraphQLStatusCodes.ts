
export interface IGraphQLStatusCodes {
    'ok': string;
    'ok-password-reset': string;
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
    'default_token': string;
    'user-logged-in': string;
    'no-user-found': string;
    'user-already-activated': string;
    'could-not-destroy-session': string;
    'could-not-activate-user': string;
    'unmatched-activation-token': string;
    'pw-reset-requested': string;
    'unsufficient-priviledges': string;

    // User roles
    'roles': string;
    'view_session_tokens': string;


    // Token issue purpose
    'rstp': string;
    'RE': string;
    'token-not-found': string;
    'token-invalid': string;
    'US': string;
    'token-has-no-user': string;
    'user-anonymous': string;


    // Field-entry
    'no-username': string;
    'no-email': string;
    'no-password': string;

    // Authentication and creation
    'username-exist': string;
    'email-exist': string;
    'auth-failed': string;

    // Sytem  infrastructure errors

    'err-password-reset': string;
    'err-auxiliary': string;
    'err-session-save': string;
    'err-session-object': string;
    'err-no-store-object': string;
    'err-no-anon-user': string;
    'err-no-hermes-token': string;

}

export type GraphQLStatusCodes = keyof IGraphQLStatusCodes;
