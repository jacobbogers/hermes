
import { AuthenticationError, HermesGraphQLConnector } from './hermes_connector';

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
    const args = rest[1];
    const context = rest[2];
    if (context.errors) {
        return Promise.resolve<AuthenticationResult>({ errors: context.errors });
    }
    const email = (<string> args['email'] || '').trim();
    const connector = context.connector as HermesGraphQLConnector;
    const result: AuthenticationResult = {};

    const emailTest = connector.emailExist(email);
    result.user = { email: emailTest || email, state: emailTest ? 'email-unavailable' : 'email-available' };

    return Promise.resolve<AuthenticationResult>(result);
};


const isUserNameRegistered = (...rest: any[]) => {
    const args = rest[1];
    const context = rest[2];
    if (context.errors) {
        return Promise.resolve<AuthenticationResult>({ errors: context.errors });
    }
    const name = (<string> args['name'] || '').trim();

    const connector = context.connector as HermesGraphQLConnector;
    const result: AuthenticationResult = {};

    const nameTest = connector.userNameExist(name);
    result.user = { name: nameTest || name, state: nameTest ? 'name-unavailable' : 'name-available' };

    return Promise.resolve<AuthenticationResult>(result);
};


const currentUser = (...rest: any[]) => {

    const context = rest[2]; // 'obj' and 'args' are cannot be made optional

    if (context.errors) {
        return Promise.resolve<AuthenticationResult>({ errors: context.errors });
    }

    const connector = context.connector as HermesGraphQLConnector;
    const { userName, userEmail, userProps } = connector.getUser();

    //determne state
    const excludeStates: Constants[] = ['blacklisted', 'await-activation', 'no-acl'];
    //let includeStates: Constants[] = ['password'];
    const mustNotHave = excludeStates.filter(ps => ps in userProps);
    //let mustHave = includeStates.filter((ps) => !(ps in userProps));
    const state: Constants = (mustNotHave.length /*|| mustHave.length*/) ? mustNotHave[0] /*|| 'no-' + mustHave[0]*/ : 'ok';

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
    const connector = context.connector as HermesGraphQLConnector;

    const errors = connector.authenticate(email, password);
    if (errors) {
        return Promise.resolve<AuthenticationResult>({ errors });
    }
    return connector.save();
};


const serverInfo = () =>

    Promise.resolve({ serverTime: new Date().toString() });

const logout = (...rest: any[]) => {

    const context = rest[2]; // 'obj' and 'args' are cannot be made optional

    if (context.errors) {
        return Promise.resolve<AuthenticationResult>({ errors: context.errors });
    }

    const connector = context.connector as HermesGraphQLConnector;

    connector.clearUser();
    return connector.save();
};

const createUser = (...rest: any[]) => {
    const context = rest[2]; // 'obj' and 'args' are cannot be made optional

    if (context.errors) {
        return Promise.resolve<AuthenticationResult>({ errors: context.errors });
    }

    const { name, email, password }: { name: string, email: string, password: string } = rest[1];

    const connector = context.connector as HermesGraphQLConnector;
    const errors = connector.createUser(name, email, password);
    if (errors) {
        return Promise.resolve<AuthenticationResult>({ errors });
    }
    return connector.save();
};

const activate = (...rest: any[]) => {
    const context = rest[2];

    if (context.errors) {
        return Promise.resolve<AuthenticationResult>({ errors: context.errors });
    }
    const connector = context.connector as HermesGraphQLConnector;

    const { token, email }: { email: string, token: string } = rest[1];
    const errors = connector.activate(email, token);
    if (errors) {
        return Promise.resolve<AuthenticationResult>({ errors, user: { email } });
    }
    return connector.save();

};

const requestPasswordReset = (...rest: any[]) => {

    const context = rest[2];

    if (context.errors) {
        return Promise.resolve<AuthenticationResult>({ errors: context.errors });
    }

    const connector = context.connector as HermesGraphQLConnector;

    const { email }: { email: string } = rest[1];

    return connector.requestPasswordReset(email);
};

const resetPassword = (...rest: any[]) => {

    const context = rest[2];

    if (context.errors) {
        return Promise.resolve<AuthenticationResult>({ errors: context.errors });
    }

    const connector = context.connector as HermesGraphQLConnector;
    const { token, password }: { token: string, password: string } = rest[1];

    return connector.resetPassword(token, password);
};

const tokenStatus = (...rest: any[]) => {

    const context = rest[2];

    if (context.errors) {
        return Promise.resolve<AuthenticationResult>({ errors: context.errors });
    }

    const { token }: { token?: string } = rest[1];

    const connector = context.connector as HermesGraphQLConnector;

    return connector.getTokenInfo(token);
};

const reSendActivation = (...rest: any[]) => {

    const context = rest[2];

    if (context.errors) {
        return Promise.resolve<AuthenticationResult>({ errors: context.errors });
    }

    const { email }: { email?: string } = rest[1]; //if email is undefined then it is current user (we check if it is not user "anonymous")

    const connector = context.connector as HermesGraphQLConnector;
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
