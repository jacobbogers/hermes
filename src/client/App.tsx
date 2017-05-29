'use strict';

import * as React from 'react';
import {Authentication } from './auth/Authentication';

//styles for app
const styles = require('./styles');

export class App extends React.Component<{}, {}> {

  constructor(props: any) {
    super(props);
  }

  render() {
   console.log('[render] App');
    return (<div className={styles.main}>
      <Authentication/>  
      {this.props.children}
    </div>);
  }
 
}


