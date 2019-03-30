import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import './styles.css';

export default class BrandedButton extends PureComponent {

  static propTypes = {
    className: PropTypes.string
  };

  render() {
    const { children, className, ...otherProps } = this.props;

    return (
      <button className={classNames('BrandedButton', className)} {...otherProps}>
        {children}
      </button>
    );
  }
}
