'use strict';
//vendor
import * as React from 'react';
import * as ReactDOM from 'react-dom';

//the app
import { App } from './App';


window.onload = () => {
    const node = document.querySelector('#app');
    ReactDOM.render(
        <App />
        , node
    );
};

