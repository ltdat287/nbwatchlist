import React, { PureComponent } from 'react';
import classNames from 'classnames';
import './styles.css';

export default class BrandedButton extends PureComponent {

  render() {
    const { children, className, ...otherProps } = this.props;

    return (
      <button className={classNames('BrandedButton', className)} {...otherProps}>
        {children}
      </button>
    );
  }
}
