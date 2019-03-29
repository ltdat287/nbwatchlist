import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import number from 'number-to-words';
import Item from '../Item';
import './styles.css';

export default class PickedItem extends PureComponent {

  static propTypes = {
    item: PropTypes.object.isRequired
  };

  render() {
    const { id, name, season, episodes, date, genres, duration, poster } = this.props.item;

    return (
      <Item className='PickedItem' type='picked' id={id}>
        <img className='PickedItem_poster' alt={name} src={`https://image.tmdb.org/t/p/w200/${poster}`} />
        <div className='PickedItem_info'>
          <div className='PickedItem_info-flex'>
            <h3 className='PickedItem_title' title={[ name, season && season < 20 ? `(season ${number.toWords(season)})` : `(${moment(date).year()})` ].join(' ')}>
              <span>{name}</span>
              {season && <span className='PickedItem_season'>{season}</span>}
            </h3>
            <div className='PickedItem_label'>{season ? episodes : moment.utc(moment.duration(duration, 'minutes').as('milliseconds')).format('H:mm')}</div>
            <div className='PickedItem_genre'>{genres[0]}</div>
          </div>
        </div>
      </Item>
    );
  }
}
