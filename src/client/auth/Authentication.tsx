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

export class Authentication extends React.Component<{}, { authState: AuthenticationState, email: string, password: string }>{


    private onSubmitLogin(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        e.stopPropagation();
        //TODO: do some ajax /graphQL stuff here 
    }

    private onSubmitReset(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        e.stopPropagation();
        //TODO: do some stuff here 
    }

    private changeFormState(newFormState: AuthenticationState) {
        this.setState({ authState: newFormState });
    }

    private updateEmail(e: React.ChangeEvent<HTMLInputElement>) {
        this.setState({ email: e.target.value });
    }

    private updatePassword(e: React.ChangeEvent<HTMLInputElement>) {
        this.setState({ password: e.target.value });
    }



    constructor() {
        super();
        let email = ''; //todo /fetch email from web-localStore when applicable
        let password = ''; //idem, fetch password or hash?? from localstore 
        this.state = { authState: AuthenticationState.HIDDEN, email, password };
    }

    render() {
        let classN = '';
        switch (this.state.authState) {
            case AuthenticationState.FORGOT:
                classN = styles('auth', 'active', 'forgot');
                break;
            case AuthenticationState.LOGIN:
                classN = styles('auth', 'active');
                break;
            default:
                classN = styles('auth');

                break;
        }

        return (<div className={classN}>
            <div className={styles('li-backdrop')}></div>
            <div className={styles('fp-backdrop')}></div>
            <div className={styles('auth-close')}><i className="fa fa-close"></i></div>
            {/* forgot passwordt */}
            <div className={styles('forgot-content')}>
                <form id="password-recovery" onSubmit={(e) => this.onSubmitReset(e)}>
                    <div className={styles('content-title', 'forgot-type')}>Password Recovery</div>
                    <input onChange={(e) => this.updateEmail(e)} name="email" type="email" required
                        className={styles('lpc-input')} placeholder="Your Registered Mail Address"></input>
                    <div className={styles('form-section-button')}>
                        <div>
                            <span
                                onClick={() => this.changeFormState(AuthenticationState.LOGIN)}
                                className={styles('back-to-login')}>Back to Sign In</span><br />
                            <a href="#">Register</a>
                        </div>
                        <button type="submit" className={styles('lpc-bt')} >Send e-Mail <i className="fa fa-angle-right"></i></button>
                    </div>
                </form>
            </div>
            {/* login content */}
            <div className={styles('login-content')}>
                <div className={styles('content-title', 'login-type')}>Sign In</div>
                <form id="try-login" onSubmit={(e) => this.onSubmitLogin(e)}>
                    <input onChange={(e) => this.updateEmail(e)}
                        name="email"
                        type="text"
                        required
                        pattern=".{3,20}" title="3 to 20 characters"
                        className={styles('lpc-input')}
                        placeholder="email"></input>
                    <input
                        onChange={(e) => this.updatePassword(e)}
                        name="password"
                        type="password"
                        required pattern=".{6,16}"
                        title="6 to 16 characters"
                        className={styles('lpc-input')}
                        placeholder="Password"></input>
                    <div className={styles('form-section-button')}>
                        <div>
                            <span
                                onClick={() => this.changeFormState(AuthenticationState.FORGOT)}
                                className={styles('forgot-password')}>Forgot Password</span><br />
                            <a href="#">Register</a>
                        </div>
                        <button type="submit" className={styles('lpc-bt')} >Sign In <i className="fa fa-angle-right"></i></button>
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

