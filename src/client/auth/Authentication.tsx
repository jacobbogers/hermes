'use strict';

import * as React from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { cssAccessor } from '~lib/utils';

require('../fonts/myfont');

const styles = cssAccessor(require('./auth'));

export enum AuthenticationState {
  hidden = 10,
  login,
  forgot,
  register,
  invite
}

const isHidden = (state?: AuthenticationState): boolean =>
  state === AuthenticationState.hidden;

export interface IAuthStateProperties {
  email: string;
  password: string;
  password2: string;
  userName: string;
}

export interface IAuthenticationProperties {
  path?: string;
}

type AllProps = RouteComponentProps<any> & IAuthenticationProperties;

class InternalAuthentication extends React.Component<AllProps, IAuthStateProperties> {
  private goBack: string;
  private authState: AuthenticationState;
  private prevAuthState: AuthenticationState | undefined;


  public constructor(props: AllProps) {
    super(props);
    console.log('%c constructor', 'color:red');
    const email = ''; // Todo /fetch email from web-localStore when applicable
    const password = ''; // Idem, fetch password or hash?? from localstore
    const password2 = '';
    const userName = '';
    this.state = { email, password, password2, userName };
    const state = this.deriveStateFromLocation(this.props);
    this.goBack = '/';
    if (isHidden(state)) {
      this.goBack = this.props.location.pathname;
    }
    this.prevAuthState = undefined;
    this.authState = state;
  }

  public render() {
    const map = [];

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
      default:
        // Hidden
        console.log({ now: this.authState, prev: this.prevAuthState });
        if (this.authState === (this.prevAuthState || this.authState)) {
          classN = styles('auth');
        } else {
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
            break;
          }
        }
        break;
    }

    const email = this.state.email;
    const passw = this.state.password;
    const passw2 = this.state.password2;
    const userName = this.state.userName;

    return (
      <div
        onClick={e => e.stopPropagation()}
        className={classN}
        onTransitionEnd={e => {
          this.resetCSS(e);
        }}
      >
        <div className={styles('backdrop', 'login-bd')} />
        <div className={styles('backdrop', 'forgot-bd')} />
        <div className={styles('backdrop', 'register-bd')} />
        <div onClick={e => this.onClose(e)} className={styles('auth-close')}>
          <i className="fa fa-close" />
        </div>
        {/* registration */}
        <div className={styles('form', 'register-content')}>
          <div className={styles('content-title', 'register-type')}>
            Register
          </div>
          <form id="register-user" onSubmit={e => this.onSubmitRegister(e)}>
            <input
              tabIndex={tiR + 0}
              onChange={e => this.updateUserName(e)}
              value={userName}
              type="text"
              name="username"
              required
              className={styles('rc-input')}
              placeholder="Username"
            />
            <input
              tabIndex={tiR + 1}
              onChange={e => this.updateEmail(e)}
              value={email}
              type="email"
              required
              name="email"
              className={styles('rc-input')}
              placeholder="Email"
            />
            <input
              tabIndex={tiR + 2}
              onChange={e => this.updatePassword(e)}
              value={passw}
              type="password"
              required
              name="password"
              className={styles('rc-input')}
              placeholder="Password"
            />
            <input
              tabIndex={tiR + 3}
              onChange={e => this.updatePassword2(e)}
              value={passw2}
              type="password"
              required
              name="password2"
              className={styles('rc-input')}
              placeholder="Confirm Password"
            />
            <div className={styles('form-section-button')}>
              <div>
                <span
                  tabIndex={tiR + 4}
                  className={styles('slink')}
                  onClick={() =>
                    this.changeFormState(AuthenticationState.login)}
                >
                  Have an account ? Login
                </span>
              </div>
              <button tabIndex={tiR + 5} className={styles('lpc-bt')}>
                Register <i className="fa fa-angle-right" />
              </button>
            </div>
          </form>
        </div>
        {/* forgot password */}
        <div className={styles('form', 'forgot-content')}>
          <form id="password-recovery" onSubmit={e => this.onSubmitReset(e)}>
            <div className={styles('content-title', 'forgot-type')}>
              Password Recovery
            </div>
            <input
              tabIndex={tiF + 1}
              onChange={e => this.updateEmail(e)}
              name="email"
              type="email"
              required
              className={styles('lpc-input')}
              placeholder="Your Registered Mail Address"
              value={email}
            />
            <div className={styles('form-section-button')}>
              <div>
                <span
                  tabIndex={tiF + 2}
                  onClick={() =>
                    this.changeFormState(AuthenticationState.login)}
                  className={styles('slink')}
                >
                  Back to Sign In
                </span>
                <br />
                <span
                  tabIndex={tiF + 3}
                  className={styles('slink')}
                  onClick={() =>
                    this.changeFormState(AuthenticationState.register)}
                >
                  Register
                </span>
              </div>
              <button
                tabIndex={tiF + 4}
                type="submit"
                className={styles('lpc-bt')}
              >
                Send e-Mail <i className="fa fa-angle-right" />
              </button>
            </div>
          </form>
        </div>
        {/* login content */}
        <div className={styles('form', 'login-content')}>
          <div className={styles('content-title', 'login-type')}>Sign In</div>
          <form id="try-login" onSubmit={e => this.onSubmitLogin(e)}>
            <input
              tabIndex={tiL + 1}
              onChange={e => this.updateEmail(e)}
              name="email"
              type="text"
              required
              pattern=".{3,20}"
              title="3 to 20 characters"
              className={styles('lpc-input')}
              placeholder="Your Registered Mail Address"
              value={email}
            />
            <input
              tabIndex={tiL + 2}
              onChange={e => this.updatePassword(e)}
              name="password"
              type="password"
              required
              pattern=".{6,16}"
              title="6 to 16 characters"
              className={styles('lpc-input')}
              placeholder="Password"
              value={passw}
            />
            <div className={styles('form-section-button')}>
              <div>
                <span
                  tabIndex={tiL + 3}
                  onClick={() =>
                    this.changeFormState(AuthenticationState.forgot)}
                  className={styles('slink')}
                >
                  Forgot Password
                </span>
                <br />
                <span
                  tabIndex={tiL + 4}
                  className={styles('slink')}
                  onClick={() =>
                    this.changeFormState(AuthenticationState.register)}
                >
                  Register
                </span>
              </div>
              <button
                tabIndex={tiL + 5}
                type="submit"
                className={styles('lpc-bt')}
              >
                Sign In <i className="fa fa-angle-right" />
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  public componentDidUpdate() {
    console.log('%c componentDidUpdate', 'color:green');
    console.log('reverted:', this.revert());
  }

  public componentWillUpdate(nextProps: AllProps) {
    console.log('%c componentWillUpdate', 'color:green');
    // Console.log('componentWillUpdate:', { nextProps, state: [this.prevAuthState, this.authState] });
    this.deriveStateFromLocation(nextProps);
    if (isHidden(this.prevAuthState) && isHidden(this.authState)) {
      this.goBack = nextProps.location.pathname;
      console.log('componentWillUpdate goback set to:', this.goBack);
    }
  }

  public shouldComponentUpdate(
    nextProps: AllProps,
    nextState: IAuthStateProperties
  ) {
    const op = this.props;
    const np = nextProps;
    const os = this.state;
    const ns = nextState;
    let pc =
      op.path === np.path && op.location.pathname === np.location.pathname;
    const peekState = this.deriveStateFromLocation(nextProps, true);
    if (
      peekState === this.authState &&
      peekState === AuthenticationState.hidden
    ) {
      pc = true;
    }
    const s = { prev: this.prevAuthState, cur: this.authState, peekState };
    const sc =
      os.email === ns.email &&
      os.password === ns.password &&
      os.password2 === ns.password2 &&
      os.userName === ns.userName;
    const rc = !pc || !sc;

    console.log(
      '%c shouldComponentUpdate pc:%s, sc:%s',
      'color:red',
      pc,
      sc,
      { op, np },
      s
    );

    return rc;
  }

  private revert(): boolean {
    // Console.log({ hint: 'revert', back: this.goBack });
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
    // Console.log('%c deriveStateFromLocation', 'color:green', p.location.pathname);
    const cp = this.cleanPath();
    const path = p.location.pathname.replace(/\$/, '').toLocaleLowerCase();
    let rc = AuthenticationState.hidden;
    if (path.indexOf(cp) >= 0) {
      const last = path.match(/[^\/]+$/);

      if (last && last[0]) {
        const key = last[0].toLocaleLowerCase();
        const probe: AuthenticationState | undefined = AuthenticationState[
          key as any
        ] as any;
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
    // Console.log('deriveStateFromLocation: states:', { prevState: this.prevAuthState, state: this.authState });

    return rc;
  }

  private setHistory(s: AuthenticationState) {
    let cleanPrefix = (this.props.path || '').replace(/(^\/+|\/+$)/g, '');
    cleanPrefix = cleanPrefix && `/${cleanPrefix}`;
    let ru = `/${AuthenticationState[s]}`;
    if (isHidden(s)) {
      ru = '';
    }
    // Consoleconsole.log({ ru });

    return `${cleanPrefix}${ru}`;
  }

  private resetCSS(e: React.TransitionEvent<HTMLDivElement>) {

    if (isHidden(this.authState)) {
      ['active', 'leave', 'register', 'forgot'].forEach(_class => {
        e.currentTarget.classList.remove(styles(_class));
      });
      e.stopPropagation();
    }
  }

  private onClose(_e: React.MouseEvent<HTMLDivElement>) {
    this.changeFormState(AuthenticationState.hidden);
  }

  private onSubmitLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    console.log('onsubmit login');
    // TODO: do some ajax /graphQL stuff here
  }

  private onSubmitReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    console.log('onsubmit reset');
    // TODO: do some stuff here
  }

  private onSubmitRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    console.log('onsubmit register');
  }

  private changeFormState(newFormState: AuthenticationState) {
    // Console.log('%c changeFormState', 'color:orange', newFormState);
    this.setState({ email: '', password: '', password2: '', userName: '' });
    if (this.revert()) {
      return;
    }
    const url = this.setHistory(newFormState);
    // Console.log('new form url', url);
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

}

const Authentication = withRouter<IAuthenticationProperties>(InternalAuthentication);
export { Authentication };
