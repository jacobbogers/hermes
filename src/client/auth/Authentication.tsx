'use strict';

import * as React from 'react';

const _styles = require('./auth');

//work with imported styles in _style above
const styles = (...rest: string[]) => rest.map((itm) => _styles[itm]).join(' ');

export enum AuthenticationState {
    HIDDEN = 0,
    LOGIN = 1,
    FORGOT = 2,
    REGISTER = 3,
    INVITE = 4
}

export class Authentication extends React.Component<{}, { authState: AuthenticationState, email: string, password: string; password2: string; userName: string }>{


    private onClose(e: React.MouseEvent<HTMLDivElement>) {
        e;
        this.changeFormState(AuthenticationState.HIDDEN);
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
        this.setState({ authState: newFormState, email: '', password: '', password2: '', userName: '' });
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

    constructor() {
        super();
        let email = ''; //todo /fetch email from web-localStore when applicable
        let password = ''; //idem, fetch password or hash?? from localstore 
        let password2 = '';
        let userName = '';
        this.state = { authState: AuthenticationState.HIDDEN, email, password, password2, userName };
    }

    render() {
        let classN = '';
        let tiF = -10;
        let tiR = -10;
        let tiL = -10;
        switch (this.state.authState) {
            case AuthenticationState.REGISTER:
                classN = styles('auth', 'active', 'register');
                tiR = 1;
                break;
            case AuthenticationState.FORGOT:
                classN = styles('auth', 'active', 'forgot');
                tiF = 1;
                break;
            case AuthenticationState.LOGIN:
                classN = styles('auth', 'active');
                tiL = 1;
                break;
            default:
                classN = styles('auth');
                break;
        }

        let email = this.state.email;
        let passw = this.state.password;
        let passw2 = this.state.password2;
        let userName = this.state.userName;

        return (<div className={classN}>
            <div className={styles('backdrop', 'login-bd')}></div>
            <div className={styles('backdrop', 'forgot-bd')}></div>
            <div className={styles('backdrop', 'register-bd')}></div>
            <div onClick={(e) => this.onClose(e)} className={styles('auth-close')}><i className="fa fa-close"></i></div>
            {/* registration */}
            <div className={styles('register-content')}>
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
                        <div className={styles('login-links')}>
                            <span tabIndex={tiR + 4}
                                className={styles('slink')}
                                onClick={() => this.changeFormState(AuthenticationState.LOGIN)} >Have an account ? Login</span>
                        </div>
                        <button tabIndex={tiR + 5}
                            className={styles('lpc-bt')}>Register <i className="fa fa-angle-right"></i></button>
                    </div>
                </form>
            </div>
            {/* forgot password */}
            <div className={styles('forgot-content')}>
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
                                onClick={() => this.changeFormState(AuthenticationState.LOGIN)}
                                className={styles('slink')}>Back to Sign In</span><br />
                            <span tabIndex={tiF + 3}
                                className={styles('slink')}
                                onClick={() => this.changeFormState(AuthenticationState.REGISTER)} >Register</span>
                        </div>
                        <button tabIndex={tiF + 4} type="submit" className={styles('lpc-bt')} >Send e-Mail <i className="fa fa-angle-right"></i></button>
                    </div>
                </form>
            </div>
            {/* login content */}
            <div className={styles('login-content')}>
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
                                onClick={() => this.changeFormState(AuthenticationState.FORGOT)}
                                className={styles('slink')}>Forgot Password</span><br />
                            <span tabIndex={tiL + 4} className={styles('slink')} onClick={() => this.changeFormState(AuthenticationState.REGISTER)} >Register</span>
                        </div>
                        <button tabIndex={tiL + 5} type="submit" className={styles('lpc-bt')} >Sign In <i className="fa fa-angle-right"></i></button>
                    </div>
                </form>
            </div>
        </div >);
    }

    componentDidMount() {
        //force state change after 1 sec 
        setTimeout(() => {
            this.setState({ authState: AuthenticationState.LOGIN });
        }, 1000);

    }
}
