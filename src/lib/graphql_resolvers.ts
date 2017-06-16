
import { HermesGraphQLConnector, AuthenticationError } from './hermes_connector';

//import { logger } from './logger';

import { Constants } from './property_names';

export interface ServerInfo {
    serverTime: string;
}

export interface UserInfo {
    name: string;
    email: string;
    state: Constants;
}

export interface TokenInfo {
    tokenId: string;
    purpose: string;
    revoked: string; // # UTC Date
    issued: string; // #UTC Date
    expired: string;  //#UTC Date
}

export interface AuthenticationResult {
    errors?: AuthenticationError[];
    user?: Partial<UserInfo>;
    token?: Partial<TokenInfo>;
}


//query
const isEmailRegistered = (...rest: any[]) => {
    let args = rest[1];
    let context = rest[2];
    if (context.errors) {
        return Promise.resolve<AuthenticationResult>({ errors: context.errors });
    }
    let email = (<string>args['email'] || '').trim();
    let connector = context.connector as HermesGraphQLConnector;
    let result: AuthenticationResult = {};

    let emailTest = connector.emailExist(email);
    result.user = { email: emailTest || email, state: emailTest ? 'email-unavailable' : 'email-available' };

    return Promise.resolve<AuthenticationResult>(result);
};


const isUserNameRegistered = (...rest: any[]) => {
    let args = rest[1];
    let context = rest[2];
    if (context.errors) {
        return Promise.resolve<AuthenticationResult>({ errors: context.errors });
    }
    let name = (<string>args['name'] || '').trim();

    let connector = context.connector as HermesGraphQLConnector;
    let result: AuthenticationResult = {};

    let nameTest = connector.userNameExist(name);
    result.user = { name: nameTest || name, state: nameTest ? 'name-unavailable' : 'name-available' };

    return Promise.resolve<AuthenticationResult>(result);
};


const currentUser = (...rest: any[]) => {

    let context = rest[2]; // 'obj' and 'args' are cannot be made optional

    if (context.errors) {
        return Promise.resolve<AuthenticationResult>({ errors: context.errors });
    }

    let connector = context.connector as HermesGraphQLConnector;
    let { userName, userEmail, userProps } = connector.getUser();

    //determne state
    let excludeStates: Constants[] = ['blacklisted', 'await-activation', 'no-acl'];
    //let includeStates: Constants[] = ['password'];
    let mustNotHave = excludeStates.filter((ps) => ps in userProps);
    //let mustHave = includeStates.filter((ps) => !(ps in userProps));
    let state: Constants = (mustNotHave.length /*|| mustHave.length*/) ? mustNotHave[0] /*|| 'no-' + mustHave[0]*/ : 'ok';

    return Promise.resolve<AuthenticationResult>({
        user: {
            name: userName,
            email: userEmail,
            state
        }
    });
};


const login = (obj: any, { password, email }: { password: string, email: string }, context: any) => {
    obj;
    if (context.errors) {
        return Promise.resolve<AuthenticationResult>({ errors: context.errors });
    }
    let connector = context.connector as HermesGraphQLConnector;

    let errors = connector.authenticate(email, password);
    if (errors) {
        return Promise.resolve<AuthenticationResult>({ errors });
    }
    return connector.save();
};


const serverInfo = () => {

    return Promise.resolve({ serverTime: new Date().toString() });
};

const logout = (...rest: any[]) => {

    let context = rest[2]; // 'obj' and 'args' are cannot be made optional

    if (context.errors) {
        return Promise.resolve<AuthenticationResult>({ errors: context.errors });
    }

    let connector = context.connector as HermesGraphQLConnector;

    connector.clearUser();
    return connector.save();
};

const createUser = (...rest: any[]) => {
    let context = rest[2]; // 'obj' and 'args' are cannot be made optional

    if (context.errors) {
        return Promise.resolve<AuthenticationResult>({ errors: context.errors });
    }

    let { name, email, password }: { name: string, email: string, password: string } = rest[1];

    let connector = context.connector as HermesGraphQLConnector;
    let errors = connector.createUser(name, email, password);
    if (errors) {
        return Promise.resolve<AuthenticationResult>({ errors: errors });
    }
    return connector.save();
};

const activate = (...rest: any[]) => {
    let context = rest[2];

    if (context.errors) {
        return Promise.resolve<AuthenticationResult>({ errors: context.errors });
    }
    let connector = context.connector as HermesGraphQLConnector;

    let { token, email }: { email: string, token: string } = rest[1];
    let errors = connector.activate(email, token);
    if (errors) {
        return Promise.resolve<AuthenticationResult>({ errors: errors, user: { email } });
    }
    return connector.save();

};

const requestPasswordReset = (...rest: any[]) => {

    let context = rest[2];

    if (context.errors) {
        return Promise.resolve<AuthenticationResult>({ errors: context.errors });
    }

    let connector = context.connector as HermesGraphQLConnector;

    let { email }: { email: string } = rest[1];

    return connector.requestPasswordReset(email);
};

const resetPassword = (...rest: any[]) => {

    let context = rest[2];

    if (context.errors) {
        return Promise.resolve<AuthenticationResult>({ errors: context.errors });
    }

    let connector = context.connector as HermesGraphQLConnector;
    let { token, password }: { token: string, password: string } = rest[1];

    return connector.resetPassword(token, password);
};

const tokenStatus = (...rest: any[]) => {

    let context = rest[2];

    if (context.errors) {
        return Promise.resolve<AuthenticationResult>({ errors: context.errors });
    }

    let { token }: { token?: string } = rest[1];

    let connector = context.connector as HermesGraphQLConnector;

    return connector.getTokenInfo(token);
};

const reSendActivation = (...rest: any[]) => {

    let context = rest[2];

    if (context.errors) {
        return Promise.resolve<AuthenticationResult>({ errors: context.errors });
    }

    let { email }: { email?: string } = rest[1]; //if email is undefined then it is current user (we check if it is not user "anonymous")

    let connector = context.connector as HermesGraphQLConnector;
    return connector.resendActivationEmail(email);
};


export const resolvers = {
    
    Query: {
        currentUser,
        isEmailRegistered,
        isUserNameRegistered,
        serverInfo,
        tokenStatus
    },

    Mutation: {
        login,
        logout,
        createUser,
        activate,
        requestPasswordReset,
        resetPassword,
        reSendActivation
    }

};
