import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import Trigger from 'rc-trigger';
import Events from '../../Events';
import ConfigPanel from './ConfigPanel';
import './styles.css';

export class PadColumnPlaceholder extends PureComponent {

  render() {
    return (
      <div className='PadColumnPlaceholder'>
        {this.props.children}
      </div>
    );
  }
}

export default class PadColumn extends PureComponent {

  static propTypes = {
    title: PropTypes.string.isRequired,
    itemType: PropTypes.oneOf([ 'suggested', 'picked', 'watched' ]).isRequired,
    onItemDrop: PropTypes.func.isRequired,
    emptyMessage: PropTypes.node,
    withConfigPanel: PropTypes.bool
  };

  static defaultProps = {
    withConfigPanel: false
  };

  state = {
    configPanelOpen: false,
    draggingItem: null
  };

  subscriptions = [];
  bodyRef = null;

  componentDidMount() {
    if (this.props.withConfigPanel) {
      window.addEventListener('keydown', this.onKeyDown);
    }

    this.subscriptions = [
      Events.subscribe('item.drag', this.onItemDrag),
      Events.subscribe('item.drag.end', this.onItemDragEnd),
      Events.subscribe('item.drag.cancel', this.onItemDragCancel)
    ];
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.onKeyDown);

    this.subscriptions.forEach(s => s.remove());
  }

  onItemDrag = (props, mouse) => {
    this.setState({ draggingItem: { props, mouse } });
  };

  onItemDragEnd = () => {
    if (this.isDropTarget()) {
      this.props.onItemDrop(this.state.draggingItem.props.id, this.state.draggingItem.props.type, this.props.itemType);
    }

    this.setState({ draggingItem: null });
  };

  onItemDragCancel = () => {
    this.setState({ draggingItem: null });
  };

  onKeyDown = ({ keyCode }) => {
    if (keyCode === 27) {
      this.setState({ configPanelOpen: false });
    }
  };

  onConfigPanelVisibleChange = visible => {
    this.setState({ configPanelOpen: visible });
  };

  onBodyRef = ref => {
    this.bodyRef = ref;
  };

  isDragSource() {
    return this.state.draggingItem && !this.isDragTarget();
  }

  isDragTarget() {
    return this.state.draggingItem && this.state.draggingItem.props.type !== this.props.itemType;
  }

  isDropTarget() {
    if (this.isDragTarget()) {
      const { left, right, top, bottom } = this.bodyRef.getBoundingClientRect();
      const { clientX, clientY } = this.state.draggingItem.mouse;
      return left <= clientX && right >= clientX && bottom >= clientY && top <= clientY;
    }

    return false;
  }

  render() {
    return (
      <section className='PadColumn'>
        <h2 className='PadColumn_title'>
          <span>{this.props.title}</span>
          {this.props.withConfigPanel && (
            <Trigger
              action='click'
              destroyPopupOnHide
              popupAlign={{ points: [ 'tl', 'bc' ], offset: [ -(30 + 3), 8 ] }}
              onPopupVisibleChange={this.onConfigPanelVisibleChange}
              popupVisible={this.state.configPanelOpen}
              zIndex={2}
              popup={<ConfigPanel />}
            >
              <span className={classNames('PadColumn_configButton', { active: this.state.configPanelOpen })}>
                &rsaquo;
              </span>
            </Trigger>
          )}
        </h2>
        <div className='PadColumn_body' ref={this.onBodyRef}>
          <div className='PadColumn_body_content'>
            {this.props.emptyMessage || this.props.children}
          </div>
          <div className={classNames('PadColumn_body_dragOverlay', {
            dragSource: this.isDragSource(),
            dragTarget: this.isDragTarget(),
            dropTarget: this.isDropTarget()
          })} />
        </div>
      </section>
    );
  }
}
