// tslint:disable:typedef

import * as UID from 'uid-safe';
import { AuthenticationError } from '~graphql/AuthenticationError';
import { GraphQLStatusCodes } from '~graphql/GraphQLStatusCodes';
import { IAuthenticationResult } from '~graphql/interfaces';
import { ITokenProperties, IUserProperties } from '~hermes-props';
import { HermesStore } from '~lib/HermesStore';
import { deepClone, isNumber } from '~lib/utils';

const PASSWORD: GraphQLStatusCodes = 'password';
// R const BLACKLISTED: Constants = 'blacklisted';

export class HermesGraphQLConnector {
    private store: HermesStore;
    private session: Express.Session;
    private user: IUserProperties;
    private token: ITokenProperties;

    private constructor(
        store: HermesStore,
        session: Express.Session,
        user: IUserProperties,
        hermes: ITokenProperties
    ) {
        this.store = store;
        this.session = session;
        this.user = user;
        this.token = hermes;
    }

    public static createHermesGraphQLConnector(
        request?: Express.Request
    ): HermesGraphQLConnector | AuthenticationError[] {
        const session = request && request.session;
        const hermesStore =
            request &&
            (() => {
                const r = request as any;

                return r.sessionStore as HermesStore | undefined;
            })();
        const user =
            session && (session['_user'] as IUserProperties | undefined);
        const token =
            session && (session['_hermes'] as ITokenProperties | undefined);

        let errors: AuthenticationError[] = [];

        switch (true) {
            case !session: // Session middleware not functional
                errors = [
                    new AuthenticationError(
                        'err-session-object',
                        'internal error, express-session middleware may be offline'
                    )
                ];
                break;
            case !(hermesStore instanceof HermesStore):
                errors = [
                    new AuthenticationError(
                        'err-no-store-object',
                        'internal error, hermes-store offline'
                    )
                ];
                break;
            case !user:
                errors = [
                    new AuthenticationError(
                        'err-no-anon-user',
                        'anonymous user not associated with this session'
                    )
                ];
                break;
            case !token:
                errors = [
                    new AuthenticationError(
                        'err-no-hermes-token',
                        'this session is not associated with hermes'
                    )
                ];
                break;
            default:
                break;
        }
        if (errors.length) {
            return errors;
        }

        return new HermesGraphQLConnector(
            <HermesStore> hermesStore,
            <Express.Session> session,
            <IUserProperties> user,
            <ITokenProperties> token
        );
    }

    public async resendActivationEmail(
        email?: string
    ): Promise<IAuthenticationResult> {
        const sessUser = this.getUser();
        const eUser = email ? this.store.getUserByEmail(email) : undefined;
        const anon = this.store.getAnonymousUser();
        const errors: AuthenticationError[] = [];
        const rc: IAuthenticationResult = {};
        // Evaluate

        const evaluateUser = (user: IUserProperties) => {
            if (user.userId === anon.userId) {
                errors.push(
                    new AuthenticationError(
                        'user-anonymous',
                        'user anonymous cannot be activated'
                    )
                );
            } else {
                // Trigger resend email here, just acknowledge for now
                rc.user = {
                    email: user.userEmail,
                    state: 'await-activation'
                };
            }

            return errors.length === 0;
        };

        switch (true) {
            case eUser !== undefined:
                if (evaluateUser(<IUserProperties> eUser)) {
                    // Trigger resend, aka just create promise, return promise().then
                    // On resend fail, add to list of errors!
                }
                break;
            default:
                if (evaluateUser(sessUser)) {
                    // Trigger resend, if mailgun fails add to list of errors!
                }
                break;
        }

        // TODO prepend resend-activation email to the chain

        return Promise.resolve(rc);
    }

    public async getTokenInfo(
        tokenId?: string
    ): Promise<IAuthenticationResult> {
        // If token is undefined,
        // Then currentuser must have 'ADMIN' user property set
        const user = this.getUser();
        const errors: AuthenticationError[] = [];
        const roles: GraphQLStatusCodes = 'roles';
        const rc: IAuthenticationResult = {};
        if (user.userProps[roles] && tokenId === undefined) {
            const viewTokens: GraphQLStatusCodes = 'view_session_tokens';
            const hasRoleTokenView =
                user.userProps[roles]
                    .split(/\s*,\s*/)
                    .map(role => role.toLocaleLowerCase())
                    .indexOf(viewTokens) >= 0;
            if (!hasRoleTokenView) {
                errors.push(
                    new AuthenticationError(
                        'unsufficient-priviledges',
                        'User Not authorized'
                    )
                );
                rc.errors = errors;

                return Promise.resolve(rc);
            }
        }
        const id = tokenId || this.session.id;
        const token = this.store.getTokenById(id);
        if (token) {
            const revoked: string | undefined = token.tsRevoked
                ? new Date(token.tsRevoked).toISOString()
                : undefined;
            const issued: string = new Date(token.tsIssuance).toISOString();
            const expired: string = new Date(token.tsExpire).toISOString();
            rc.token = {
                expired,
                issued,
                purpose: token.purpose as any,
                revoked,
                tokenId: id
            };
        } else {
            errors.push(
                new AuthenticationError('token-invalid', 'Token is unknown')
            );
        }
        if (errors.length) {
            rc.errors = errors;
        }

        return Promise.resolve(rc);
    }

    public async resetPassword(
        token: string,
        password: string
    ): Promise<IAuthenticationResult> {
        const errors: AuthenticationError[] = [];
        const rstToken = this.store.getTokenById(token);
        const anonUser = this.store.getAnonymousUser();
        const userId = (rstToken && rstToken.fkUserId) || undefined;
        const user = userId ? this.store.getUserById(userId) : undefined;
        const revokeReason = ((rstToken && rstToken.revokeReason) || '').trim();
        let rc: IAuthenticationResult = {};

        if (rstToken === undefined) {
            errors.push(
                new AuthenticationError(
                    'token-not-found',
                    'this token wasnt found'
                )
            );
        }

        if (revokeReason) {
            errors.push(
                new AuthenticationError(
                    'token-invalid',
                    'this token has been processed'
                )
            );
        }

        if (userId === undefined) {
            // Get the user
            errors.push(
                new AuthenticationError(
                    'token-has-no-user',
                    'this token has user association'
                )
            );
        }

        if (userId === anonUser.userId) {
            errors.push(
                new AuthenticationError(
                    'user-anonymous',
                    'token is associated with an anonymous user'
                )
            );
        }

        const pw: GraphQLStatusCodes = 'password';
        let state: GraphQLStatusCodes;

        if (
            rstToken &&
            revokeReason === '' &&
            user &&
            userId &&
            userId !== anonUser.userId
        ) {
            user.userProps[pw] = password;
            rstToken.revokeReason = 'US';
            rstToken.tsRevoked = Date.now();
            // Can set password and revoke the token at the same time
            const up = this.store.updateUserProperties(user);
            const tp = this.store.updateToken(rstToken);

            return Promise.all([up, tp])
                .then(([u]) => {
                    state = 'ok-password-reset';
                    rc = {
                        errors,
                        user: {
                            email: u.userEmail,
                            state
                        }
                    };

                    return rc;
                })
                .catch(err => {
                    errors.push(
                        new AuthenticationError('err-auxiliary', err.toString())
                    );
                    state = 'err-password-reset';
                    rc = {
                        errors,
                        user: {
                            email: user && user.userEmail,
                            state
                        }
                    };

                    return rc;
                });
        }
        state = 'err-password-reset';
        rc = {
            errors,
            user: {
                state
            }
        };

        return Promise.resolve(rc);
    }

    public createUser(
        _name: string,
        _email: string,
        password: string
    ): AuthenticationError[] | undefined {
        const errors: AuthenticationError[] = [];

        if (!this.mustAuthenticate()) {
            // Cant continue
            errors.push(
                new AuthenticationError(
                    'user-logged-in',
                    'User must log out first'
                )
            );

            return errors;
        }

        const name = (_name || '').trim().toLocaleLowerCase();
        const email = (_email || '').trim().toLocaleLowerCase();

        if (name === '') {
            errors.push(
                new AuthenticationError(
                    'no-username',
                    'user should provide a "user name"'
                )
            );
        }

        if (email === '') {
            errors.push(
                new AuthenticationError(
                    'no-email',
                    'user should provide an email'
                )
            );
        }

        if (password === '') {
            errors.push(
                new AuthenticationError(
                    'no-password',
                    'user should provide a password'
                )
            );
        }

        const findName = this.userNameExist(name); // Normalize
        if (findName) {
            errors.push(
                new AuthenticationError(
                    'username-exist',
                    'username already in use'
                )
            );
        }

        const findEmail = this.emailExist(email);
        if (findEmail) {
            errors.push(
                new AuthenticationError('email-exist', 'email already in use')
            );
        }

        if (errors.length > 0) {
            return errors;
        }

        const authKey = UID.sync(18);
        console.log('authKey:', authKey);

        const newUser: IUserProperties = {
            userEmail: email,
            userId: -1, // Non existant user id
            userName: name,
            userProps: {
                'await-activation': `${authKey}:${Date.now()}`,
                password
            }
        };
        this.user = newUser;

        return undefined;
    }

    public hasSessionExpired(): boolean {
        const expires = this.getExpiredAsNumber();

        if (!expires || expires < Date.now()) {
            return true;
        }

        return false;
    }

    public ipAddr(): string {
        const req = this.session.req;

        return req && req.ip;
    }

    public isAnonymous(): boolean {
        return this.user.userName === this.store.getAnonymousUser().userName;
    }

    public isUserBlackListed(): boolean {
        const blacklisted: GraphQLStatusCodes = 'blacklisted';

        return !!this.user.userProps[blacklisted];
    }

    public getExpiredAsNumber(): number | undefined {
        let rc: number;
        switch (true) {
            // TODO: Did i forget to make expires "union type with number"????
            case isNumber(this.session.cookie.expires):
                rc = this.session.cookie.expires as any;
                break;
            case this.session.cookie.expires instanceof Date:
                rc = (this.session.cookie.expires as Date).getTime();
                break;
            default:
                // Last ditch attempt
                rc = new Date(this.session.cookie.expires as any).getTime();
                break;
        }

        return isNumber(rc) ? rc : undefined;
    }

    public getExpiredAsDate(): Date {
        const num = this.getExpiredAsNumber();
        if (num) {
            return new Date(num);
        }

        return new Date('x');
    }

    public mustAuthenticate(): boolean {
        return (
            this.isAnonymous() ||
            this.isUserBlackListed() ||
            this.hasSessionExpired()
        );
    }

    public authenticate(
        email: string,
        password: string
    ): AuthenticationError[] | undefined {
        // Check if already authenticated

        if (!this.mustAuthenticate()) {
            // Cant continue
            return [
                new AuthenticationError(
                    'user-logged-in',
                    'User must log out first'
                )
            ];
        }

        const errors: AuthenticationError[] = [];

        if (email === '') {
            errors.push(
                new AuthenticationError(
                    'auth-failed',
                    'user should provide an email'
                )
            );
        }

        if (password === '') {
            errors.push(
                new AuthenticationError(
                    'auth-failed',
                    'user should provide a password'
                )
            );
        }

        if (errors.length) {
            return errors;
        }
        // Potential User
        const pUser = this.store.getUserByEmail(email);

        if (!pUser) {
            return [
                new AuthenticationError(
                    'auth-failed',
                    'The Email and password combination are Unknown'
                )
            ];
        }

        const passw = pUser.userProps[PASSWORD] || '';
        if (passw.trim() !== password.trim()) {
            return [
                new AuthenticationError(
                    'auth-failed',
                    'The Email and password combination are Unknown'
                )
            ];
        }
        // Password is correct so..

        this.user = pUser;

        return undefined;
    }

    public emailExist(userEmail: string): string | undefined {
        const u = this.store.getUserByEmail(userEmail) || {
            userEmail: undefined
        };

        return u.userEmail;
    }

    public userNameExist(userName: string): string | undefined {
        const u = this.store.getUserByName(userName) || { userName: undefined };

        return u.userName;
    }

    public getUser(): IUserProperties {
        return deepClone(this.user);
    }

    public clearUser() {
        delete this.session['_user'];
        this.user = this.store.getAnonymousUser();
    }

    public activate(
        email: string,
        token: string
    ): AuthenticationError[] | undefined {
        // Is this user in activation state?
        const findUser = this.store.getUserByEmail(email);

        if (!findUser) {
            return [
                new AuthenticationError(
                    'no-user-found',
                    'User with this email doesnt exist'
                )
            ];
        }
        const fu = findUser;
        const awaitActivation: GraphQLStatusCodes = 'await-activation';
        if (!(awaitActivation in findUser.userProps)) {
            return [
                new AuthenticationError(
                    'user-already-activated',
                    'User has already been activated'
                )
            ];
        }
        // Check token
        const tokenParts = fu.userProps[awaitActivation].split(':');
        if (tokenParts[0] === token) {
            delete fu.userProps[awaitActivation];
        } else {
            return [
                new AuthenticationError(
                    'unmatched-activation-token',
                    'This token does not match the activation token'
                )
            ];
        }
        this.user = fu;
    }

    public async requestPasswordReset(
        _email: string
    ): Promise<IAuthenticationResult> {
        const email = _email.toLocaleLowerCase().trim();

        return this.store
            .requestResetPw(email, this.ipAddr())
            .then(() => {
                const state: GraphQLStatusCodes = 'pw-reset-requested';
                const rc: IAuthenticationResult = {
                    user: {
                        email,
                        state
                    }
                };

                return rc;
            })
            .catch(err => {
                const rc: IAuthenticationResult = {
                    errors: [
                        new AuthenticationError(
                            'err-password-reset',
                            err.toString()
                        )
                    ],
                    user: {
                        email
                    }
                };

                return rc;
            });
    }

    public async save(): Promise<IAuthenticationResult> {
        return new Promise<IAuthenticationResult>(resolve => {
            this.session['_user'] = this.user;
            this.session['_hermes'] = this.token;

            const usrName = this.user.userName;
            const usrEmail = this.user.userEmail;

            this.session.save(err => {
                if (err) {
                    resolve({
                        errors: [
                            new AuthenticationError(
                                'err-session-save',
                                'call to session.save failed'
                            ),
                            new AuthenticationError(
                                'err-auxiliary',
                                String(err)
                            )
                        ],
                        user: {
                            email: usrEmail,
                            name: usrName,
                            state: 'err-session-save'
                        }
                    });

                    return;
                }
                this.user = this.session['_user'];
                this.token = this.session['_hermes'];
                const { userName, userEmail, userProps } = this.getUser();

                // Post login checks
                const ACTIVATION: GraphQLStatusCodes = 'await-activation';
                const BLACKLISTED: GraphQLStatusCodes = 'blacklisted';
                const NO_ACL: GraphQLStatusCodes = 'no-acl';

                let state: GraphQLStatusCodes;
                switch (true) {
                    case BLACKLISTED in userProps:
                        state = BLACKLISTED;
                        break;
                    case ACTIVATION in userProps:
                        state = ACTIVATION;
                        break;
                    case NO_ACL in userProps:
                        state = NO_ACL;
                        break;
                    default:
                        state = 'ok';
                        break;
                }

                resolve({
                    user: {
                        email: userEmail,
                        name: userName,
                        state
                    }
                });

                return;
            });
        });
    }
}
