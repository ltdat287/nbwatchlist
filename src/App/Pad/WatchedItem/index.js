import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import number from 'number-to-words';
import Item from '../Item';
import './styles.css';

export default class WatchedItem extends PureComponent {

  static propTypes = {
    item: PropTypes.object.isRequired
  };

  render() {
    const { id, name, season, date } = this.props.item;

    return (
      <Item className='WatchedItem' type='watched' id={id}>
        <h3 className='WatchedItem_title' title={[ name, season && season < 20 ? `(season ${number.toWords(season)})` : `(${moment(date).year()})` ].join(' ')}>
          <span>{name}</span>
          {season && <span className='WatchedItem_season'>{season}</span>}
        </h3>
      </Item>
    );
  }
}
