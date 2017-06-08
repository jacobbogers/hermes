
import { HermesGraphQLConnector, AuthenticationError } from './hermes_connector';

//import { logger } from './logger';

export interface ServerInfo {
    serverTime: string;
}

export interface UserInfo {
    name: string;
    email: string;
    expire: string;
}

export interface AuthenticationResult {
    errors?: AuthenticationError[];
    data?: Partial<UserInfo>;
    serverInfo: ServerInfo;
}

//query
const currentUser = (...rest: any[]) => {

    let context = rest[2]; // 'obj' and 'args' are cannot be made optional

    if (context.errors) {
        return Promise.resolve<AuthenticationResult>({ errors: context.errors, serverInfo: { serverTime: new Date().toString() } });
    }

    let connector = context.connector as HermesGraphQLConnector;
    let { userName, userEmail } = connector.getUser();
    let expire = connector.getExpiredAsDate().toString();

    return Promise.resolve<AuthenticationResult>({
        data: {
            name: userName,
            email: userEmail,
            expire
        },
        serverInfo: {
            serverTime: new Date().toString()
        }
    });
};

const login = (obj: any, { password, email }: { password: string, email: string }, context: any) => {
    obj;
    if (context.errors) {
        return Promise.resolve<AuthenticationResult>({ errors: context.errors, serverInfo: { serverTime: new Date().toString() } });
    }
    let connector = context.connector as HermesGraphQLConnector;

    let errors = connector.authenticate(email, password);
    if (errors) {
        return Promise.resolve<AuthenticationResult>({ errors, serverInfo: { serverTime: new Date().toString() } });
    }

    return connector.save();
};

const logout = (...rest: any[]) => {
  
    let context = rest[2]; // 'obj' and 'args' are cannot be made optional

    if (context.errors) {
        return Promise.resolve<AuthenticationResult>({ errors: context.errors, serverInfo: { serverTime: new Date().toString() } });
    }


    if (context.errors) {
        return Promise.resolve<AuthenticationResult>({ errors: context.errors, serverInfo: { serverTime: new Date().toString() } });
    }

    let connector = context.connector as HermesGraphQLConnector;

    connector.clearUser();
    return connector.save();
};

export const resolvers = {
    Query: {
        currentUser
    },
    Mutation: {
        login,
        logout
    }
};
