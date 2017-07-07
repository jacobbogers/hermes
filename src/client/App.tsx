'use strict';

import * as React from 'react';

import {
  BrowserRouter as Router,
  //Route,
  //Redirect,
  Link
} from 'react-router-dom';

import Authentication from './auth/Authentication';

//styles for app
const styles = require('./styles');
require('./fonts/junction');

export class App extends React.Component<{}, {}> {

  constructor(props: any) {
    super(props);

  }

  render() {
    
    return (
      <Router>
        <div className={styles.main}>
          <div className={styles['test-panel']} >
             <Link className={styles['login-link']} to="/auth/login" >Log in</Link>
             <Link className={styles['login-link']} to="/auth/register" >Sign Up</Link>
          </div>
          <Authentication path="/auth" />;
       </div>
      </Router >
    );
  }


}


