// tslint:disable:typedef
import { ITokenInfo, IUserInfo } from '~graphql';
import { GraphQLStatusCodes } from '~graphql/GraphQLStatusCodes';
import { IAuthenticationResult } from '~graphql/IAuthenticationResult';
import { AuthenticationError } from './AuthenticationError';
import { HermesGraphQLConnector } from './HermesGraphQLConnector';

export interface IAuthenticationResult {
  errors?: AuthenticationError[];
  user?: Partial<IUserInfo>;
  token?: Partial<ITokenInfo>;
}

// Query
const isEmailRegistered = async(...rest: any[]) => {
  const args = rest[1];
  const context = rest[2];
  if (context.errors) {
    return Promise.resolve<IAuthenticationResult>({ errors: context.errors });
  }
  const email = (<string> args['email'] || '').trim();
  const connector = context.connector as HermesGraphQLConnector;
  const result: IAuthenticationResult = {};

  const emailTest = connector.emailExist(email);
  result.user = {
    email: emailTest || email,
    state: emailTest ? 'email-unavailable' : 'email-available'
  };

  return Promise.resolve<IAuthenticationResult>(result);
};

const isUserNameRegistered = async(...rest: any[]) => {
  const args = rest[1];
  const context = rest[2];
  if (context.errors) {
    return Promise.resolve<IAuthenticationResult>({ errors: context.errors });
  }
  const name = (<string> args['name'] || '').trim();

  const connector = context.connector as HermesGraphQLConnector;
  const result: IAuthenticationResult = {};

  const nameTest = connector.userNameExist(name);
  result.user = {
    name: nameTest || name,
    state: nameTest ? 'name-unavailable' : 'name-available'
  };

  return Promise.resolve<IAuthenticationResult>(result);
};

const currentUser = async(...rest: any[]) => {
  const context = rest[2]; // 'obj' and 'args' are cannot be made optional

  if (context.errors) {
    return Promise.resolve<IAuthenticationResult>({ errors: context.errors });
  }

  const connector = context.connector as HermesGraphQLConnector;
  const { userName, userEmail, userProps } = connector.getUser();

  // Determne state
  const excludeStates: GraphQLStatusCodes[] = [
    'blacklisted',
    'await-activation',
    'no-acl'
  ];
  // Let includeStates: Constants[] = ['password'];
  const mustNotHave = excludeStates.filter(ps => ps in userProps);
  // Let mustHave = includeStates.filter((ps) => !(ps in userProps));
  const state: GraphQLStatusCodes = mustNotHave.length /*|| mustHave.length*/
    ? mustNotHave[0] /*|| 'no-' + mustHave[0]*/
    : 'ok';

  return Promise.resolve<IAuthenticationResult>({
    user: {
      email: userEmail,
      name: userName,
      state
    }
  });
};

const login =  async(
  obj: any,
  { password, email }: { password: string; email: string },
  context: any
) => {
  obj;
  if (context.errors) {
    return Promise.resolve<IAuthenticationResult>({ errors: context.errors });
  }
  const connector = context.connector as HermesGraphQLConnector;

  const errors = connector.authenticate(email, password);
  if (errors) {
    return Promise.resolve<IAuthenticationResult>({ errors });
  }

  return connector.save();
};

const serverInfo =  async() => Promise.resolve({ serverTime: new Date().toString() });

const logout =  async(...rest: any[]) => {
  const context = rest[2]; // 'obj' and 'args' are cannot be made optional

  if (context.errors) {
    return Promise.resolve<IAuthenticationResult>({ errors: context.errors });
  }

  const connector = context.connector as HermesGraphQLConnector;

  connector.clearUser();

  return connector.save();
};

const createUser =  async(...rest: any[]) => {
  const context = rest[2]; // 'obj' and 'args' are cannot be made optional

  if (context.errors) {
    return Promise.resolve<IAuthenticationResult>({ errors: context.errors });
  }

  const {
    name,
    email,
    password
  }: { name: string; email: string; password: string } = rest[1];

  const connector = context.connector as HermesGraphQLConnector;
  const errors = connector.createUser(name, email, password);
  if (errors) {
    return Promise.resolve<IAuthenticationResult>({ errors });
  }

  return connector.save();
};

const activate =  async(...rest: any[]) => {
  const context = rest[2];

  if (context.errors) {
    return Promise.resolve<IAuthenticationResult>({ errors: context.errors });
  }
  const connector = context.connector as HermesGraphQLConnector;

  const { token, email }: { email: string; token: string } = rest[1];
  const errors = connector.activate(email, token);
  if (errors) {
    return Promise.resolve<IAuthenticationResult>({ errors, user: { email } });
  }

  return connector.save();
};

const requestPasswordReset =  async(...rest: any[]) => {
  const context = rest[2];

  if (context.errors) {
    return Promise.resolve<IAuthenticationResult>({ errors: context.errors });
  }

  const connector = context.connector as HermesGraphQLConnector;

  const { email }: { email: string } = rest[1];

  return connector.requestPasswordReset(email);
};

const resetPassword =  async(...rest: any[]) => {
  const context = rest[2];

  if (context.errors) {
    return Promise.resolve<IAuthenticationResult>({ errors: context.errors });
  }

  const connector = context.connector as HermesGraphQLConnector;
  const { token, password }: { token: string; password: string } = rest[1];

  return connector.resetPassword(token, password);
};

const tokenStatus =  async(...rest: any[]) => {
  const context = rest[2];

  if (context.errors) {
    return Promise.resolve<IAuthenticationResult>({ errors: context.errors });
  }

  const { token }: { token?: string } = rest[1];

  const connector = context.connector as HermesGraphQLConnector;

  return connector.getTokenInfo(token);
};

const reSendActivation =  async(...rest: any[]) => {
  const context = rest[2];

  if (context.errors) {
    return Promise.resolve<IAuthenticationResult>({ errors: context.errors });
  }

  // If email is undefined then it is current user
  // (we check if it is not user "anonymous")
  const { email }: { email?: string } = rest[1];

  const connector = context.connector as HermesGraphQLConnector;

  return connector.resendActivationEmail(email);
};

export const resolvers = {

  Mutation: {
    activate,
    createUser,
    login,
    logout,
    requestPasswordReset,
    reSendActivation,
    resetPassword
  },

  Query: {
    currentUser,
    isEmailRegistered,
    isUserNameRegistered,
    serverInfo,
    tokenStatus
  }

};
