
//node
import * as util from 'util';

//vender
import * as UID from 'uid-safe';

//app
import { AuthenticationResult } from './graphql_resolvers';
import { HermesStore, TokenProperties, UserProperties } from './hermes_store';
import { Constants } from './property_names';
import { deepClone } from './utils';


const PASSWORD: Constants = 'password';
//const BLACKLISTED: Constants = 'blacklisted';

export class AuthenticationError {

    private context: Constants;
    private message: string;

    public constructor(context: Constants, message: string) {
        this.context = context;
        this.message = message;
    }

    public toString() {
        return util.format('%s, %s', this.context || '', this.message);
    }
    public value() {
        return [this.context, this.message];
    }
}

export class HermesGraphQLConnector {

    private store: HermesStore;
    private session: Express.Session;
    private user: UserProperties;
    private token: TokenProperties;

    private constructor(store: HermesStore, session: Express.Session, user: UserProperties, hermes: TokenProperties) {
        this.store = store;
        this.session = session;
        this.user = user;
        this.token = hermes;
    }

    public resendActivationEmail(email?: string): Promise<AuthenticationResult> {

        const sessUser = this.getUser();
        const eUser = email ? this.store.getUserByEmail(email) : undefined;
        const anon = this.store.getAnonymousUser();
        const errors: AuthenticationError[] = [];
        const rc: AuthenticationResult = {};
        //evaluate

        const evaluateUser = (user: UserProperties) => {
            if (user.userId === anon.userId) {
                errors.push(new AuthenticationError('user-anonymous', 'user anonymous cannot be activated'));
            }
            else {
                //trigger resend email here, just acknowledge for now
                rc.user = {
                    email: user.userEmail,
                    state: 'await-activation'
                };
            }
            return errors.length === 0;
        };

        switch (true) {
            case (eUser !== undefined):
                if (evaluateUser(<UserProperties> eUser)) {
                    //trigger resend, aka just create promise, return promise().then
                    //on resend fail, add to list of errors!
                }
                break;
            default:
                if (evaluateUser(sessUser)) {
                    //trigger resend, if mailgun fails add to list of errors!
                }
        }
        //TODO prepend resend-activation email to the chain
        return Promise.resolve(rc);
    }

    public getTokenInfo(tokenId?: string): Promise<AuthenticationResult> {
        //if token is undefined then currentuser must have 'ADMIN' user property set
        const user = this.getUser();
        const errors: AuthenticationError[] = [];
        const roles: Constants = 'roles';
        const rc: AuthenticationResult = {};
        if (user.userProps[roles] && tokenId === undefined) {
            const viewTokens: Constants = 'view_session_tokens';
            const hasRoleTokenView = user.userProps[roles].split(/\s*,\s*/).map(role => role.toLocaleLowerCase()).indexOf(viewTokens) >= 0;
            if (!hasRoleTokenView) {
                errors.push(new AuthenticationError('unsufficient-priviledges', 'User Not authorized'));
                rc.errors = errors;
                return Promise.resolve(rc);
            }
        }
        const id = tokenId || this.session.id;
        const token = this.store.getTokenById(id);
        if (token) {
            const revoked: string | undefined = token.tsRevoked ? new Date(token.tsRevoked).toISOString() : undefined;
            const issued: string = new Date(token.tsIssuance).toISOString();
            const expired: string = new Date(token.tsExpire).toISOString();
            rc.token = {
                tokenId: id,
                purpose: token.purpose as any,
                revoked,
                issued,
                expired
            };
        }
        else {
            errors.push(new AuthenticationError('token-invalid', 'Token is unknown'));
        }
        if (errors.length) {
            rc.errors = errors;
        }
        return Promise.resolve(rc);
    }

    public resetPassword(token: string, password: string): Promise<AuthenticationResult> {

        const errors: AuthenticationError[] = [];
        const rstToken = this.store.getTokenById(token);
        const anonUser = this.store.getAnonymousUser();
        const userId = rstToken && rstToken.fkUserId || undefined;
        const user = userId ? this.store.getUserById(userId) : undefined;
        const revokeReason = (rstToken && rstToken.revokeReason || '').trim();
        let rc: AuthenticationResult = {};

        if (rstToken === undefined) {
            errors.push(new AuthenticationError('token-not-found', 'this token wasnt found'));
        }

        if (revokeReason) {
            errors.push(new AuthenticationError('token-invalid', 'this token has been processed'));
        }

        if (userId === undefined) {
            //get the user
            errors.push(new AuthenticationError('token-has-no-user', 'this token has user association'));
        }

        if (userId === anonUser.userId) {
            errors.push(new AuthenticationError('user-anonymous', 'token is associated with an anonymous user'));
        }

        const pw: Constants = 'password';

        if (rstToken && revokeReason === '' && user && userId && userId !== anonUser.userId) {
            user.userProps[pw] = password;
            rstToken.revokeReason = 'US';
            rstToken.tsRevoked = Date.now();
            //can set password and revoke the token at the same time
            const up = this.store.updateUserProperties(user);
            const tp = this.store.updateToken(rstToken);
            return Promise.all([up, tp])
                .then(([u]) => {
                    const state: Constants = 'ok-password-reset';
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
                    errors.push(new AuthenticationError('err-auxiliary', err.toString()));
                    const state: Constants = 'err-password-reset';
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
        const state: Constants = 'err-password-reset';
        rc = {
            errors,
            user: {
                state
            }
        };
        return Promise.resolve(rc);
    }

    public createUser(name: string, email: string, password: string): AuthenticationError[] | undefined {

        const errors: AuthenticationError[] = [];

        if (!this.mustAuthenticate()) { // cant continue
            errors.push(new AuthenticationError('user-logged-in', 'User must log out first'));
            return errors;
        }

        name = (name || '').trim().toLocaleLowerCase();
        email = (email || '').trim().toLocaleLowerCase();


        if (name === '') {
            errors.push(new AuthenticationError('no-username', 'user should provide a "user name"'));
        }

        if (email === '') {
            errors.push(new AuthenticationError('no-email', 'user should provide an email'));
        }

        if (password === '') {
            errors.push(new AuthenticationError('no-password', 'user should provide a password'));
        }

        const findName = this.userNameExist(name); // normalize
        if (findName) {
            errors.push(new AuthenticationError('username-exist', 'username already in use'));
        }

        const findEmail = this.emailExist(email);
        if (findEmail) {
            errors.push(new AuthenticationError('email-exist', 'email already in use'));
        }

        if (errors.length > 0) {
            return errors;
        }

        const authKey = UID.sync(18);
        console.log('authKey:', authKey);

        const newUser: UserProperties = {
            userName: name,
            userEmail: email,
            userId: -1, //-1 doesnt exist as valid userId, because all in range [0,+inf)
            userProps: { 'password': password, 'await-activation': authKey + ':' + Date.now() }
        };
        this.user = newUser;
        return;
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
        const blacklisted: Constants = 'blacklisted';
        return !!(this.user.userProps[blacklisted]);
    }

    public getExpiredAsNumber(): number | undefined {
        let rc: number;
        switch (true) {
            case typeof this.session.cookie.expires === 'number':
                rc = (this.session.cookie.expires as any);
                break;
            case this.session.cookie.expires instanceof Date:
                rc = (this.session.cookie.expires as Date).getTime();
                break;
            default: // last ditch attempt
                rc = new Date(this.session.cookie.expires as any).getTime();
        }
        return Number.isNaN(rc) ? undefined : rc;
    }

    public getExpiredAsDate(): Date {
        const num = this.getExpiredAsNumber();
        if (num) {
            return new Date(num);
        }
        return new Date('x');
    }

    public mustAuthenticate(): boolean {
        return this.isAnonymous() || this.isUserBlackListed() || this.hasSessionExpired();
    }

    public authenticate(email: string, password: string): AuthenticationError[] | undefined {

        //check if already authenticated

        if (!this.mustAuthenticate()) { // cant continue
            return [new AuthenticationError('user-logged-in', 'User must log out first')];
        }

        const errors: AuthenticationError[] = [];

        if (email === '') {
            errors.push(new AuthenticationError('auth-failed', 'user should provide an email'));
        }

        if (password === '') {
            errors.push(new AuthenticationError('auth-failed', 'user should provide a password'));
        }

        if (errors.length) {
            return errors;
        }
        //potential User
        const pUser = this.store.getUserByEmail(email);

        if (!pUser) {
            return [new AuthenticationError('auth-failed', 'The Email and password combination are Unknown')];
        }

        const passw = pUser.userProps[PASSWORD] || '';
        if (passw.trim() !== password.trim()) {
            return [new AuthenticationError('auth-failed', 'The Email and password combination are Unknown')];
        }
        //password is correct so..

        this.user = pUser;
        return;
    }

    public emailExist(userEmail: string): string | undefined {
        const u = this.store.getUserByEmail(userEmail) || { userEmail: undefined };
        return u.userEmail;
    }

    public userNameExist(userName: string): string | undefined {
        const u = this.store.getUserByName(userName) || { userName: undefined };
        return u.userName;
    }

    public getUser(): UserProperties {
        return deepClone(this.user);
    }

    public clearUser() {
        delete this.session['_user'];
        this.user = this.store.getAnonymousUser();
    }

    public activate(email: string, token: string): AuthenticationError[] | undefined {
        //is this user in activation state?
        const findUser = this.store.getUserByEmail(email);

        if (!findUser) {
            return [new AuthenticationError('no-user-found', 'User with this email doesnt exist')];
        }
        const fu = findUser;
        const awaitActivation: Constants = 'await-activation';
        if (!(awaitActivation in findUser.userProps)) {
            return [new AuthenticationError('user-already-activated', 'User has already been activated')];
        }
        // check token
        const tokenParts = fu.userProps[awaitActivation].split(':');
        if (tokenParts[0] === token) {
            delete fu.userProps[awaitActivation];
        }
        else {
            return [new AuthenticationError('unmatched-activation-token', 'This token does not match the activation token')];
        }
        this.user = fu;
    }

    public requestPasswordReset(email: string): Promise<AuthenticationResult> {
        email = email.toLocaleLowerCase().trim();
        return this.store.requestResetPw(email, this.ipAddr())
            .then(() => {
                const pw_reset_state: Constants = 'pw-reset-requested';
                const rc: AuthenticationResult = {
                    user: {
                        email,
                        state: pw_reset_state
                    }
                };
                return rc;
            })
            .catch(err => {
                const rc: AuthenticationResult = {
                    errors: [new AuthenticationError('err-password-reset', err.toString())],
                    user: {
                        email
                    }
                };
                return rc;
            });
    }

    public save(): Promise<AuthenticationResult> {

        return new Promise<AuthenticationResult>(resolve => {
            this.session['_user'] = this.user;
            this.session['_hermes'] = this.token;

            const usrName = this.user.userName;
            const usrEmail = this.user.userEmail;

            this.session.save(err => {
                if (err) {
                    return resolve({
                        errors: [
                            new AuthenticationError('err-session-save', 'call to session.save failed'),
                            new AuthenticationError('err-auxiliary', String(err))
                        ],
                        user: {
                            name: usrName,
                            email: usrEmail,
                            state: 'err-session-save'
                        }
                    });
                }
                this.user = this.session['_user'];
                this.token = this.session['_hermes'];
                const { userName, userEmail, userProps } = this.getUser();

                //post login checks
                const ACTIVATION: Constants = 'await-activation';
                const BLACKLISTED: Constants = 'blacklisted';
                const NO_ACL: Constants = 'no-acl';

                let state: Constants;
                switch (true) {
                    case (BLACKLISTED in userProps):
                        state = BLACKLISTED;
                        break;
                    case (ACTIVATION in userProps):
                        state = ACTIVATION;
                        break;
                    case (NO_ACL in userProps):
                        state = NO_ACL;
                        break;
                    default:
                        state = 'ok';
                }
                return resolve({
                    user: {
                        name: userName,
                        email: userEmail,
                        state
                    }
                });
            });
        });
    }

    public static createHermesGraphQLConnector(request?: Express.Request): HermesGraphQLConnector | AuthenticationError[] {

        const session = request && request.session;
        const hermesStore = request && (() => {
            const r = request as any;
            return r.sessionStore as (HermesStore | undefined);
        })();
        const user = session && session['_user'] as (UserProperties | undefined);
        const token = session && session['_hermes'] as (TokenProperties | undefined);

        let errors: AuthenticationError[] = [];

        switch (true) {
            case !session: //session middleware not functional
                errors = [new AuthenticationError('err-session-object', 'internal error, express-session middleware may be offline')];
                break;
            case !(hermesStore instanceof HermesStore):
                errors = [new AuthenticationError('err-no-store-object', 'internal error, hermes-store offline')];
                break;
            case !user:
                errors = [new AuthenticationError('err-no-anon-user', 'anonymous user not associated with this session')];
                break;
            case !token:
                errors = [new AuthenticationError('err-no-hermes-token', 'this session is not associated with hermes')];
                break;
            default:
        }
        if (errors.length) {
            return errors;
        }
        return new HermesGraphQLConnector(<HermesStore> hermesStore, <Express.Session> session, <UserProperties> user, <TokenProperties> token);
    }


}
