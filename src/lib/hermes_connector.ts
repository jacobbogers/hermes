
//node
import * as util from 'util';

//app
import { HermesStore, UserProperties, TokenProperties } from './hermes_store';
import { deepClone } from './utils';
import { AuthenticationResult } from './graphql_resolvers';

const BLACKLISTED = 'BLACKLISTED';
const LOGIN_PASSWORD_PROPERTY = 'password';

export class AuthenticationError {

    private context: string;
    private message: string;

    constructor(context: string, message: string) {
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

    public hasSessionExpired(): boolean {

        let expires = this.getExpiredAsNumber();

        if (!expires || expires < Date.now()) {
            return true;
        }
        return false;
    }

    public isAnonymous(): boolean {
        return this.user.userName === this.store.getAnonymousUser().userName;
    }

    public isUserBlackListed(): boolean {
        return !!(this.user.userProps[BLACKLISTED]);
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

        //potential User
        let pUser = this.store.getUserByEmail(email);
        if (!pUser) {
            return [new AuthenticationError('email-not-exist', 'The Email and password combination are Unknown')];
        }

        if (pUser.userProps[BLACKLISTED]) {
            this.session['_user'] = pUser; // valid user but blacklisted
            return [new AuthenticationError('email-black-listed', 'User is blacklisted')];
        }
        let passw = pUser.userProps[LOGIN_PASSWORD_PROPERTY] || '';
        if (passw.trim() !== password.trim()) {
            return [new AuthenticationError('invalid-login', 'The Email and password combination are Unknown')];
        }
        //password is correct so..
        this.session['_user'] = pUser;
        this.user = pUser;
        return;
    }

    public getUser(): UserProperties {
        return deepClone(this.user);
    }

    public clearUser() {
        delete this.session['_user'];
        this.user = this.store.getAnonymousUser();
    }

    public save(): Promise<AuthenticationResult> {

        return new Promise<AuthenticationResult>((resolve) => {
            this.session.save((err) => {
                if (err) {
                    return resolve({
                        errors: [
                            new AuthenticationError('session-save', 'call to session.save failed'),
                            new AuthenticationError('auxiliary', String(err))
                        ],
                        serverInfo: { serverTime: new Date().toString() }
                    });
                }
                let expire = this.getExpiredAsDate().toString();
                let { userName, userEmail } = this.getUser();
                return resolve({
                    serverInfo: {
                        serverTime: new Date().toString()
                    },
                    data: {
                        name: userName,
                        email: userEmail,
                        expire
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
                errors = [new AuthenticationError('no-session-object', 'internal error, express-session middleware may be offline')];
                break;
            case !(hermesStore instanceof HermesStore):
                errors = [new AuthenticationError('no-store-object', 'internal error, hermes-store offline')];
                break;
            case !user:
                errors = [new AuthenticationError('no-user', 'anonymous user not associated with this session')];
                break;
            case !token:
                errors = [new AuthenticationError('no-hermes-token', 'this session is not associated with hermes')];
                break;
            default:
        }
        if (errors.length) {
            return errors;
        }
        return new HermesGraphQLConnector(<HermesStore>hermesStore, <Express.Session>session, <UserProperties>user, <TokenProperties>token);
    }


}
