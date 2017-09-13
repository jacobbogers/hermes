'use strict';

import * as React from 'react';
import * as ReactDOM from 'react-dom';


import { App } from './App';


window.onload = () => {
    const node = document.querySelector('#app');
    ReactDOM.render(
        <App />,
        node
    );
};

