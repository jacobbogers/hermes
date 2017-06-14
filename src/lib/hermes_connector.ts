
//node
import * as util from 'util';

//vender
import * as UID from 'uid-safe';

//app
import { HermesStore, UserProperties, TokenProperties } from './hermes_store';
import { deepClone } from './utils';
import { AuthenticationResult } from './graphql_resolvers';
import { Constants } from './property_names';


const PASSWORD: Constants = 'password';
//const BLACKLISTED: Constants = 'blacklisted';

export class AuthenticationError {

    private context: Constants;
    private message: string;

    constructor(context: Constants, message: string) {
        this.context = context;
        this.message = message;
    }

    toString() {
        return util.format('%s, %s', this.context || '', this.message);
    }
    value() {
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

    public resetPassword(token: string, password: string): Promise<AuthenticationResult> {

        let errors: AuthenticationError[] = [];
        let rstToken = this.store.getTokenById(token);
        let anonUser = this.store.getAnonymousUser();
        let userId = rstToken && rstToken.fkUserId || undefined;
        let user = userId ? this.store.getUserById(userId) : undefined;
        let revokeReason = (rstToken && rstToken.revokeReason || '').trim();
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
            let up = this.store.updateUserProperties(user);
            let tp = this.store.updateToken(rstToken);
            return Promise.all([up, tp])
                .then(([u]) => {
                    let state: Constants = 'ok-password-reset';
                    rc = {
                        errors,
                        data: {
                            email: u.userEmail,
                            state
                        }
                    };
                    return rc;
                })
                .catch((err) => {
                    errors.push(new AuthenticationError('err-auxiliary', err.toString()));
                    let state: Constants = 'err-password-reset';
                    rc = {
                        errors,
                        data: {
                            email: user && user.userEmail,
                            state
                        }
                    };
                    return rc;
                });

        }
        let state: Constants = 'err-password-reset';
        rc = {
            errors,
            data: {
                state
            }
        };
        return Promise.resolve(rc);
    }

    public createUser(name: string, email: string, password: string): AuthenticationError[] | undefined {

        let errors: AuthenticationError[] = [];

        if (this.mustAuthenticate() === false) { // cant continue 
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

        let findName = this.userNameExist(name); // normalize
        if (findName) {
            errors.push(new AuthenticationError('username-exist', 'username already in use'));
        }

        let findEmail = this.emailExist(email);
        if (findEmail) {
            errors.push(new AuthenticationError('email-exist', 'email already in use'));
        }

        if (errors.length > 0) {
            return errors;
        }

        let authKey = UID.sync(18);
        console.log('authKey:', authKey);

        let newUser: UserProperties = {
            userName: name,
            userEmail: email,
            userId: -1, //-1 doesnt exist as valid userId, because all in range [0,+inf)
            userProps: { password: password, 'await-activation': authKey + ':' + Date.now() }
        };
        this.user = newUser;
        return;
    }

    public hasSessionExpired(): boolean {

        let expires = this.getExpiredAsNumber();

        if (!expires || expires < Date.now()) {
            return true;
        }
        return false;
    }

    public ipAddr(): string {
        let req = this.session.req as any;
        return req && req.ip;
    }

    public isAnonymous(): boolean {
        return this.user.userName === this.store.getAnonymousUser().userName;
    }

    public isUserBlackListed(): boolean {
        let blacklisted: Constants = 'blacklisted';
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
        let num = this.getExpiredAsNumber();
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

        if (this.mustAuthenticate() === false) { // cant continue 
            return [new AuthenticationError('user-logged-in', 'User must log out first')];
        }

        let errors: AuthenticationError[] = [];

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
        let pUser = this.store.getUserByEmail(email);

        if (!pUser) {
            return [new AuthenticationError('auth-failed', 'The Email and password combination are Unknown')];
        }

        let passw = pUser.userProps[PASSWORD] || '';
        if (passw.trim() !== password.trim()) {
            return [new AuthenticationError('auth-failed', 'The Email and password combination are Unknown')];
        }
        //password is correct so..

        this.user = pUser;
        return;
    }

    public emailExist(userEmail: string): string | undefined {
        let u = this.store.getUserByEmail(userEmail) || { userEmail: undefined };
        return u.userEmail;
    }

    public userNameExist(userName: string): string | undefined {
        let u = this.store.getUserByName(userName) || { userName: undefined };
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
        let findUser = this.store.getUserByEmail(email);

        if (!findUser) {
            return [new AuthenticationError('no-user-found', 'User with this email doesnt exist')];
        }
        let fu = findUser;
        const awaitActivation: Constants = 'await-activation';
        if (!(awaitActivation in findUser.userProps)) {
            return [new AuthenticationError('user-already-activated', 'User has already been activated')];
        }
        // check token
        let tokenParts = fu.userProps[awaitActivation].split(':');
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
                let pw_reset_state: Constants = 'pw-reset-requested';
                let rc: AuthenticationResult = {
                    data: {
                        email,
                        state: pw_reset_state
                    }
                };
                return rc;
            })
            .catch((err) => {
                let rc: AuthenticationResult = {
                    errors: [new AuthenticationError('err-password-reset', err.toString())],
                    data: {
                        email,
                    }
                };
                return rc;
            });
    }

    public save(): Promise<AuthenticationResult> {

        return new Promise<AuthenticationResult>((resolve) => {
            this.session['_user'] = this.user;
            this.session['_hermes'] = this.token;

            let usrName = this.user.userName;
            let usrEmail = this.user.userEmail;

            this.session.save((err) => {
                if (err) {
                    return resolve({
                        errors: [
                            new AuthenticationError('err-session-save', 'call to session.save failed'),
                            new AuthenticationError('err-auxiliary', String(err))
                        ],
                        data: {
                            name: usrName,
                            email: usrEmail,
                            state: 'err-session-save'
                        }
                    });
                }
                this.user = this.session['_user'];
                this.token = this.session['_hermes'];
                let { userName, userEmail, userProps } = this.getUser();

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
                    data: {
                        name: userName,
                        email: userEmail,
                        state
                    }
                });
            });
        });
    }

    public static createHermesGraphQLConnector(request?: Express.Request): HermesGraphQLConnector | AuthenticationError[] {

        let session = request && request.session;
        let hermesStore = request && request.sessionStore as (HermesStore | undefined);
        let user = session && session['_user'] as (UserProperties | undefined);
        let token = session && session['_hermes'] as (TokenProperties | undefined);

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
        return new HermesGraphQLConnector(<HermesStore>hermesStore, <Express.Session>session, <UserProperties>user, <TokenProperties>token);
    }


}
