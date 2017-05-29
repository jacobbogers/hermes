'use strict';
//vendor
import * as React from 'react';
import * as ReactDOM from 'react-dom';
/*import {
    // IndexRedirect, 
    RouterState,
    RedirectFunction,
    Router,
    Route,
    //browserHistory 
} from 'react-router';
*/

import * as rr from 'react-router';

//app
import { App } from './App';

const styles = require('./styles');

interface AuthInfo {
    isLoggedIn: boolean;
}

class EmptyComponent extends React.Component<{}, {}>{
    render() {
        return (<div>{window.location.pathname}</div>);
    }
}

window.onload = () => {
    let node = document.querySelector('body');

    //logged in?
    //gStore.dispatch(loadCredentialstoStore());

    let authInf: AuthInfo = {
        isLoggedIn: false
    };

    //dummy placeholder replace with real one later"


    const DudComponent = () => <div></div>;

    /* dont care if it user is authenticated or not authenticated */
    const pathAgnosticAuthentication = [
        '/failed-facebook-login',
        '/complete-password-reset',
        '/invitations',
        '/invitations/expired',
        '/reset-password',
        '/invalid'
    ];

    /* already protected by onEnter hooks*/
    /* const pathsNeedingAuthentication = [
     ];*/

    const pathNeedingingDeAuthentication = [
        '/login',
        '/register',
        '/invitations/request'
    ];

    const authOnEnter
        = (nextState: RouterState, replace: RedirectFunction, cb: Function) => {

            let pathN = nextState.location.pathname;

            // prevent infinite loops 
            if (pathAgnosticAuthentication.indexOf(pathN) >= 0) {
                cb();
                return;
            }

            let rc = authInf.isLoggedIn;

            // prevent infinite loops 
            if (pathNeedingingDeAuthentication.indexOf(pathN) >= 0) {
                if (rc) {
                    replace({
                        pathname: '/',
                        state: { nextPathname: pathN }
                    });
                }
                cb();
                return;
            }

            if (rc) {
                cb();
                return;
            }
            //if not logged in, always recheck  
            // clear out the credentials in the store
            if (!rc) {
                replace({
                    pathname: '/login',
                    state: { nextPathname: pathN }
                });
                cb();
                return;
            }
        };

    function goToInvalid(
        nextState: RouterState,
        replace: RedirectFunction
    ) {
        replace({
            pathname: '/invalid',
            state: { nextPathname: nextState.location.pathname }
        });
        return;
    }

    function createQueryValidation(props: string[]) {

        if (!props || !(props instanceof Array) || props.length === 0) {
            throw new Error('argument "props" needs to be an array of strings');
        }

        return (nextState: RouterState, replace: RedirectFunction) => {
            console.log(nextState.location);

            let loc = nextState.location;
            let search = loc.search;

            let qry = pocessQueryString(search);

            if (
                qry === undefined
                ||
                props.filter((prop) => {
                    return (prop in qry.hash);
                }).length !== props.length
            ) {
                goToInvalid(nextState, replace);
                return;
            }
            //all ok
        };
    }


    ReactDOM.render(

        <Router history={browserHistory} >

            <Route path="/" component={App}  >
                <IndexRedirect to="/welcome" />
                <Route path="/welcome" component={EmptyComponent} onEnter={authOnEnter} />
                {/* Nav Button paths */}
                <Route path="/jobs" component={PaneJob} onEnter={authOnEnter} >
                </Route>

                <Route path="/testc" component={PaneTest} />

                <Route path="/staff" component={EmptyComponent} onEnter={authOnEnter} />
                <Route path="/admin" component={EmptyComponent} onEnter={authOnEnter} />
                <Route path="/invoicing" component={EmptyComponent} onEnter={authOnEnter} />
                <Route path="/faq" component={EmptyComponent} onEnter={authOnEnter} />
                {/* forms  */}
                {/* authenticated needed for these forms */}

                {/* these paths must be reachable ONLY when NOT authentication */}
                <Route path="/login" components={{ login: Login }} onEnter={authOnEnter} />
                <Route path="/failed-facebook-login" component={NotifyFailLoginFaceBook} />
                <Route
                    path="/reset-password"
                    component={CompletePasswordReset}
                    onEnter={createQueryValidation(['email', 'token', 'expire'])} />
                {/*<Route path="/register-user" component={RegistrationForm} />*/}
                <Route
                    path="/invitations"
                    component={EmployerAcceptInvite}
                    onEnter={createQueryValidation(['email', 'token', 'expire'])}
                />
                <Route path="/invitations/expired" component={EmployerInvitationExpired} />
                <Route path="/invitations/invalid" component={EmptyComponent} />
                <Route path="/invitations/success" component={EmptyComponent} />
                <Route path="/invitations/request" component={RequestCompanyInvite} />
                <Route path="/invalid" component={EmptyComponent} />
                <Route path="/request-password-reset" component={RequestPasswordReset} />
                <Route path="/register" component={EmployerRegistrationForm} />
                <Route path="/dev-null" component={DudComponent} onEnter={authOnEnter} />
            </Route>
        </Router>

        , node
    );
};





