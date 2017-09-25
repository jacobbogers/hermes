import * as React from 'react';

import {
  BrowserRouter as Router,
  Link
} from 'react-router-dom';

import { Authentication } from './auth/Authentication';


const styles = require('./styles');
require('./fonts/junction');
require('../lib/vendor/cdn/fetch.min.js');
require('../lib/vendor/cdn/graphiql.min.js');
require('../lib/vendor/cdn/react-dom.min.js');
require('../lib/vendor/cdn/react.min.js');
const a = require('../lib/vendor/cdn/graphiql.css');
console.log(a);
export class App extends React.Component {

  public constructor(props: any) {
    super(props);

  }

  public render() {

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

