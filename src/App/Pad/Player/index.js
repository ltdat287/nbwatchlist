import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import './styles.css';

const aspectRatio = 16 / 9;

export default class Player extends PureComponent {

  static propTypes = {
    item: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired
  };

  componentDidMount() {
    window.addEventListener('keydown', this.onKeyDown);
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.onKeyDown);
  }

  onKeyDown = ({ keyCode }) => {
    if (keyCode === 27) {
      this.props.onClose();
    }
  };

  render() {
    const { name, trailerKey } = this.props.item;
    const maxWidth = window.innerWidth - 300;
    const heightForMaxWidth = maxWidth / aspectRatio;
    const height = Math.min(window.innerHeight, heightForMaxWidth);
    const width = height / heightForMaxWidth * maxWidth;

    return (
      <div className='Player'>
        <button className='Player_closeButton' onClick={this.props.onClose}>╳</button>
        <iframe
          title={name}
          width={width}
          height={height}
          src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`}
          allow='autoplay; encrypted-media;'
          allowFullScreen
        />
      </div>
    );
  }
}
