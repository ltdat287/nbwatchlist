import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import Events from '../../Events';
import './styles.css';

export default class Item extends PureComponent {

  static propTypes = {
    className: PropTypes.string.isRequired,
    type: PropTypes.oneOf([ 'suggested', 'picked', 'watched' ]).isRequired,
    id: PropTypes.string.isRequired,
    draggingDisabled: PropTypes.bool,
    onRef: PropTypes.func,
    onMouseOver: PropTypes.func,
    onMouseOut: PropTypes.func
  };

  static defaultProps = {
    draggingDisabled: false,
    onRef: () => {},
  };

  state = {
    dragStartBounds: null,
    dragStartMouseEvent: null,
    dragMouseEvent: null
  };

  ref = null;
  dragPreviewRef = null;

  onMouseDown = e => {
    if (this.props.draggingDisabled || e.button > 0) {
      return;
    }

    e.preventDefault();

    this.setState({
      dragStartBounds: this.ref.getBoundingClientRect(),
      dragStartMouseEvent: e.nativeEvent,
      dragMouseEvent: e.nativeEvent
    });

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);

    Events.emit('item.drag.start', this.props);
    Events.emit('item.drag', this.props, e.nativeEvent);
  };

  onMouseUp = () => {
    this.endDrag();
  };

  onKeyDown = ({ keyCode }) => {
    if (keyCode === 27) {
      this.cancelDrag();
    }
  };

  onMouseMove = e => {
    this.setState({ dragMouseEvent: e });

    Events.emit('item.drag', this.props, e);
  };

  stopDrag() {
    this.setState({
      dragStartBounds: null,
      dragStartMouseEvent: null,
      dragMouseEvent: null
    });

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);
  }

  endDrag = () => {
    this.stopDrag();
    Events.emit('item.drag.end');
  };

  cancelDrag = () => {
    this.stopDrag();
    Events.emit('item.drag.cancel');
  };

  onRef = ref => {
    this.ref = ref;
    this.props.onRef(ref);
  };

  onDragPreviewRef = ref => {
    this.dragPreviewRef = ref;
  };

  render() {
    const { className, children } = this.props;

    return (
      <Fragment>
        <div
          className={classNames('Item', className, { dragging: this.state.dragStartBounds, draggingDisabled: this.props.draggingDisabled })}
          onMouseDown={this.onMouseDown}
          onMouseOver={this.props.onMouseOver}
          onMouseOut={this.props.onMouseOut}
          ref={this.onRef}
        >
          {children}
        </div>

        {this.state.dragStartBounds && (
          <div className={classNames('Item_dragPreview', className)} style={{
            width: `${this.state.dragStartBounds.width}px`,
            height: `${this.state.dragStartBounds.height}px`,
            left: `${this.state.dragMouseEvent.clientX + (this.state.dragStartBounds.left - this.state.dragStartMouseEvent.clientX)}px`,
            top: `${this.state.dragMouseEvent.clientY + (this.state.dragStartBounds.top - this.state.dragStartMouseEvent.clientY)}px`
          }} ref={this.onDragPreviewRef}>
            {children}
          </div>
        )}
      </Fragment>
    );
  }
}
