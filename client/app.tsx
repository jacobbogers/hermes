import * as React from 'react';
import * as ReactDOM from 'react-dom';

const styles = require('./styles');

const App = () => (
    <div>
        <h1 className={styles.main}>Hello, World!</h1>
    </div>
);

ReactDOM.render(<App />, document.getElementById('app'));
