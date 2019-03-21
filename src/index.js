// IE
import 'core-js/es6/array';
import 'core-js/es6/object';
import 'core-js/es6/string';
import 'core-js/es7/array';
import 'core-js/es7/object';
import 'react-app-polyfill/ie9';

import 'rc-trigger/assets/index.css';
import 'reset-css';
import React from 'react';
import { render } from 'react-dom';
import App from './App';
import './styles.css';

render(<App />, document.getElementById('root'));
