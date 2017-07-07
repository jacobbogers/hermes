'use strict';

//vendor
import * as React from 'react';
import { RouteComponentProps, withRouter } from 'react-router';


//app
const _styles = require('./auth');
//require('../fonts/junction');
require('../fonts/myfont');

//work with imported styles in _style above
const styles = (...rest: string[]) => rest.map((itm) => _styles[itm]).join(' ');

export enum AuthenticationState {
    hidden = 10,
    login,
    forgot,
    register,
    invite
}

const isHidden = (state?: AuthenticationState): boolean => { return state === AuthenticationState.hidden; };

export interface AuthStateProperties {
    email: string;
    password: string;
    password2: string;
    userName: string;
}

export interface AuthenticationProperties {
    path?: string;
}

type AllProps = RouteComponentProps<any> & AuthenticationProperties;

class Authentication extends React.Component<AllProps, AuthStateProperties>{

    private goBack: string;
    private authState: AuthenticationState;
    private prevAuthState: AuthenticationState | undefined;

    private revert(): boolean {
        //console.log({ hint: 'revert', back: this.goBack });
        if (isHidden(this.authState) && !isHidden(this.prevAuthState)) {
            this.props.history.push(this.goBack);
            return true;
        }
        return false;
    }

    private cleanPath() {
        let cleanPrefix = (this.props.path || '').replace(/(^\/+|\/+$)/g, '');
        cleanPrefix = cleanPrefix && `/${cleanPrefix}`;
        return cleanPrefix;
    }

    private deriveStateFromLocation(p: AllProps, peekOnly: boolean = false) {
        //console.log('%c deriveStateFromLocation', 'color:green', p.location.pathname);
        let cp = this.cleanPath();
        let path = p.location.pathname.replace(/\$/, '').toLocaleLowerCase();
        let rc = AuthenticationState.hidden;
        if (path.indexOf(cp) >= 0) {
            let last = path.match(/[^\/]+$/);

            if (last && last[0]) {
                let key = last[0].toLocaleLowerCase();
                let probe: AuthenticationState | undefined = (AuthenticationState[key as any]) as any;
                /* looks weird but TS is being stupid putting enum and a "typegaurd" in the same IF statement*/
                if (probe !== AuthenticationState.hidden) {
                    if (probe) {
                        rc = probe;
                    }
                }

            }
        }
        if (!peekOnly) {
            this.prevAuthState = this.authState;
            this.authState = rc;
        }
        //console.log('deriveStateFromLocation: states:', { prevState: this.prevAuthState, state: this.authState });
        return rc;
    }

    private setHistory(s: AuthenticationState) {
        let cleanPrefix = (this.props.path || '').replace(/(^\/+|\/+$)/g, '');
        cleanPrefix = cleanPrefix && `/${cleanPrefix}`;
        let ru = `/${AuthenticationState[s]}`;
        if (isHidden(s)) {
            ru = '';
        }
        //consoleconsole.log({ ru });
        return `${cleanPrefix}${ru}`;
    }

    private resetCSS(e: React.TransitionEvent<HTMLDivElement>) {
        e;
        if (isHidden(this.authState)) {

            ['active', 'leave', 'register', 'forgot'].forEach((_class) => {
                e.currentTarget.classList.remove(styles(_class));
            });
            e.stopPropagation();
        }
    }

    private onClose(e: React.MouseEvent<HTMLDivElement>) {
        e;
        this.changeFormState(AuthenticationState.hidden);
    }

    private onSubmitLogin(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        e.stopPropagation();
        console.log('onsubmit login');
        //TODO: do some ajax /graphQL stuff here 
    }

    private onSubmitReset(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        e.stopPropagation();
        console.log('onsubmit reset');
        //TODO: do some stuff here 
    }

    private onSubmitRegister(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        e.stopPropagation();
        console.log('onsubmit register');
    }

    private changeFormState(newFormState: AuthenticationState) {
        //console.log('%c changeFormState', 'color:orange', newFormState);
        this.setState({ email: '', password: '', password2: '', userName: '' });
        if (this.revert()) {
            return;
        }
        let url = this.setHistory(newFormState);
        //console.log('new form url', url);
        this.props.history.push(url);

    }

    private updateEmail(e: React.ChangeEvent<HTMLInputElement>) {
        console.log('email field changed');
        this.setState({ email: e.target.value });
    }

    private updatePassword(e: React.ChangeEvent<HTMLInputElement>) {
        console.log('password field changed');
        this.setState({ password: e.target.value });
    }

    private updatePassword2(e: React.ChangeEvent<HTMLInputElement>) {
        console.log('password2 field changed');
        this.setState({ password2: e.target.value });
    }

    private updateUserName(e: React.ChangeEvent<HTMLInputElement>) {
        console.log('userName field changed');
        this.setState({ userName: e.target.value });
    }

    constructor(props: AllProps) {
        super(props);
        console.log('%c constructor', 'color:red');
        let email = ''; //todo /fetch email from web-localStore when applicable
        let password = ''; //idem, fetch password or hash?? from localstore 
        let password2 = '';
        let userName = '';
        this.state = { email, password, password2, userName };
        let state = this.deriveStateFromLocation(this.props);
        this.goBack = '/';
        if (isHidden(state)) {
            this.goBack = this.props.location.pathname;
        }
        this.prevAuthState = undefined;
        this.authState = state;
    }

    render() {

        let map = [];

        map[AuthenticationState.register] = 'register';
        map[AuthenticationState.forgot] = 'forgot';


        console.log('%c render', 'color:green');
        let classN = '';
        let tiF = -10;
        let tiR = -10;
        let tiL = -10;
        let base = ['auth', 'active'];
        switch (this.authState) {
            case AuthenticationState.register:
                classN = styles(...base, 'register');
                tiR = 1;
                break;
            case AuthenticationState.forgot:
                classN = styles(...base, 'forgot');
                tiF = 1;
                break;
            case AuthenticationState.login:
                classN = styles(...base);
                tiL = 1;
                break;
            default: // hidden
                console.log({ now: this.authState, prev: this.prevAuthState });
                if (this.authState === (this.prevAuthState || this.authState)) {
                    classN = styles('auth');
                }
                else {
                    base = ['auth', 'active', 'leave'];
                    switch (this.prevAuthState) {
                        case AuthenticationState.login:
                            classN = styles(...base);
                            break;
                        case AuthenticationState.forgot:
                            classN = styles(...base, 'forgot');
                            break;
                        case AuthenticationState.register:
                            classN = styles(...base, 'register');
                            break;
                        default:
                    }
                }
                break;

        }


        let email = this.state.email;
        let passw = this.state.password;
        let passw2 = this.state.password2;
        let userName = this.state.userName;

        return (
            <div onClick={(e) => e.stopPropagation()} className={classN} onTransitionEnd={(e) => { this.resetCSS(e); }}>
                <div className={styles('backdrop', 'login-bd')}></div>
                <div className={styles('backdrop', 'forgot-bd')}></div>
                <div className={styles('backdrop', 'register-bd')}></div>
                <div onClick={(e) => this.onClose(e)} className={styles('auth-close')}><i className="fa fa-close"></i></div>
                {/* registration */}
                <div className={styles('form', 'register-content')}>
                    <div className={styles('content-title', 'register-type')}>Register</div>
                    <form id="register-user" onSubmit={(e) => this.onSubmitRegister(e)}>
                        <input
                            tabIndex={tiR + 0}
                            onChange={(e) => this.updateUserName(e)}
                            value={userName}
                            type="text"
                            name="username"
                            required
                            className={styles('rc-input')}
                            placeholder="Username" />
                        <input
                            tabIndex={tiR + 1}
                            onChange={(e) => this.updateEmail(e)}
                            value={email}
                            type="email"
                            required
                            name="email"
                            className={styles('rc-input')}
                            placeholder="Email"
                        />
                        <input
                            tabIndex={tiR + 2}
                            onChange={(e) => this.updatePassword(e)}
                            value={passw}
                            type="password"
                            required
                            name="password"
                            className={styles('rc-input')}
                            placeholder="Password" />
                        <input
                            tabIndex={tiR + 3}
                            onChange={(e) => this.updatePassword2(e)}
                            value={passw2}
                            type="password"
                            required
                            name="password2"
                            className={styles('rc-input')}
                            placeholder="Confirm Password" />
                        <div className={styles('form-section-button')}>
                            <div>
                                <span tabIndex={tiR + 4}
                                    className={styles('slink')}
                                    onClick={() => this.changeFormState(AuthenticationState.login)} >Have an account ? Login</span>
                            </div>
                            <button tabIndex={tiR + 5}
                                className={styles('lpc-bt')}>Register <i className="fa fa-angle-right"></i></button>
                        </div>
                    </form>
                </div>
                {/* forgot password */}
                <div className={styles('form', 'forgot-content')}>
                    <form id="password-recovery" onSubmit={(e) => this.onSubmitReset(e)}>
                        <div className={styles('content-title', 'forgot-type')}>Password Recovery</div>
                        <input tabIndex={tiF + 1}
                            onChange={(e) => this.updateEmail(e)}
                            name="email"
                            type="email"
                            required
                            className={styles('lpc-input')}
                            placeholder="Your Registered Mail Address"
                            value={email}></input>
                        <div className={styles('form-section-button')}>
                            <div>
                                <span tabIndex={tiF + 2}
                                    onClick={() => this.changeFormState(AuthenticationState.login)}
                                    className={styles('slink')}>Back to Sign In</span><br />
                                <span tabIndex={tiF + 3}
                                    className={styles('slink')}
                                    onClick={() => this.changeFormState(AuthenticationState.register)} >Register</span>
                            </div>
                            <button tabIndex={tiF + 4} type="submit" className={styles('lpc-bt')} >Send e-Mail <i className="fa fa-angle-right"></i></button>
                        </div>
                    </form>
                </div>
                {/* login content */}
                <div className={styles('form', 'login-content')}>
                    <div className={styles('content-title', 'login-type')}>Sign In</div>
                    <form id="try-login" onSubmit={(e) => this.onSubmitLogin(e)}>
                        <input tabIndex={tiL + 1} onChange={(e) => this.updateEmail(e)}
                            name="email"
                            type="text"
                            required
                            pattern=".{3,20}" title="3 to 20 characters"
                            className={styles('lpc-input')}
                            placeholder="Your Registered Mail Address" value={email}></input>
                        <input
                            tabIndex={tiL + 2}
                            onChange={(e) => this.updatePassword(e)}
                            name="password"
                            type="password"
                            required pattern=".{6,16}"
                            title="6 to 16 characters"
                            className={styles('lpc-input')}
                            placeholder="Password"
                            value={passw}></input>
                        <div className={styles('form-section-button')}>
                            <div>
                                <span
                                    tabIndex={tiL + 3}
                                    onClick={() => this.changeFormState(AuthenticationState.forgot)}
                                    className={styles('slink')}>Forgot Password</span><br />
                                <span tabIndex={tiL + 4} className={styles('slink')} onClick={() => this.changeFormState(AuthenticationState.register)} >Register</span>
                            </div>
                            <button tabIndex={tiL + 5} type="submit" className={styles('lpc-bt')} >Sign In <i className="fa fa-angle-right"></i></button>
                        </div>
                    </form>
                </div>
            </div >
        );
    }

    componentDidUpdate() {
        console.log('%c componentDidUpdate', 'color:green');
        console.log('reverted:', this.revert());
    }

    componentWillUpdate(nextProps: AllProps) {
        console.log('%c componentWillUpdate', 'color:green');
        //console.log('componentWillUpdate:', { nextProps, state: [this.prevAuthState, this.authState] });
        this.deriveStateFromLocation(nextProps);
        if (isHidden(this.prevAuthState) && isHidden(this.authState)) {
            this.goBack = nextProps.location.pathname;
            console.log('componentWillUpdate goback set to:', this.goBack);
        }
    }

    shouldComponentUpdate(nextProps: AllProps, nextState: AuthStateProperties) {

        let op = this.props;
        let np = nextProps;
        let os = this.state;
        let ns = nextState;
        let pc = op.path === np.path && op.location.pathname === np.location.pathname;
        let peekState = this.deriveStateFromLocation(nextProps, true);
        if (peekState === this.authState && peekState === AuthenticationState.hidden) {
            pc = true;
        }
        let s = { prev: this.prevAuthState, cur: this.authState, peekState };
        let sc = os.email === ns.email && os.password === ns.password && os.password2 === ns.password2 && os.userName === ns.userName;
        let rc = !pc || !sc;



        console.log('%c shouldComponentUpdate pc:%s, sc:%s', 'color:red', pc, sc, { op, np }, s);
        return rc;
    }
}

export default withRouter<AuthenticationProperties>(Authentication);
