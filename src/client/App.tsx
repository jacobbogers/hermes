'use strict';

import * as React from 'react';

import {
  BrowserRouter as Router,
  //Route,
  Redirect,
  //Link
} from 'react-router-dom';

import Authentication from './auth/Authentication';

//styles for app
const styles = require('./styles');

export class App extends React.Component<{}, { showLogin: boolean }> {

  private toggleAuth() {
    this.setState({ showLogin: !this.state.showLogin });
  }

  constructor(props: any) {
    super(props);
    this.state = { showLogin: false };
  }

  render() {

    let redirect = this.state.showLogin && <Redirect push={true} to="/auth/login" />;
    return (
      <Router>
        <div className={styles.main} onClick={() => { this.toggleAuth(); }}>
          {redirect}
          <Authentication path="/auth" />;
       </div>
      </Router>
    );
  }


}


