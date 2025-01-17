import React, { PureComponent, Fragment } from 'react';
import _ from 'lodash';
import moment from 'moment';
import request from 'superagent';
import Events from '../Events';
import PadColumn, { PadColumnPlaceholder } from './PadColumn';
import SuggestedItem from './SuggestedItem';
import PickedItem from './PickedItem';
import WatchedItem from './WatchedItem';
import Player from './Player';
import { getConfigState } from './PadColumn/ConfigPanel';
import './styles.css';

function yearOf(date) {
  return moment(date).year();
}

function parseMaxYear(year) {
  return year === 'today' ? moment().year() : year;
}

const columnDefaults = {
  picked: [],
  watched: []
};

const itemLimitIncreaseStep = 50;
const itemLimitDefaults = {
  value: itemLimitIncreaseStep,
  bodyHeight: 0
};

export default class Pad extends PureComponent {

  state = {
    columns: localStorage.columns ? JSON.parse(localStorage.columns) : columnDefaults,
    config: getConfigState(),
    items: [],
    itemLimit: itemLimitDefaults,
    trailerItem: null
  };

  subscriptions = [];
  yearsFetched = [];

  componentDidMount() {
    window.addEventListener('scroll', this.onScroll);

    this.subscriptions = [
      Events.subscribe('config.state', this.onConfigStateChange)
    ];

    this.fetchYearsIfNeeded();
  }

  componentWillUnmount() {
    window.removeEventListener('scroll', this.onScroll);

    this.subscriptions.forEach(_ => _.remove());
  }

  componentDidUpdate() {
    this.fetchYearsIfNeeded();
  }

  fetchYearsIfNeeded() {
    const years = [];

    for (let year = this.state.config.year.min; year <= parseMaxYear(this.state.config.year.max); year++) {
      years.push(year);
    }

    
    _(this.state.columns.picked.map(({ year }) => year))
      .union(this.state.columns.watched.map(({ year }) => year))
      .union(_(years).sort().reverse().value())
      .uniq()
      .filter(year => !this.yearsFetched.includes(year))
      .forEach(this.fetchYear);
  }

  fetchYear = year => {
    this.yearsFetched.push(year);

    request
      .get(`https://nbwatchlist-db.netlify.app/${year}.json`)
      .end((err, { status, body }) => {
        if (status === 200) {
          this.setState(state => ({ ...state, items: state.items.concat(body) }));
        }
      });
  };

  onScroll = () => {
    const bodyHeight = document.body.scrollHeight;

    if (bodyHeight > this.state.itemLimit.bodyHeight && bodyHeight - (window.scrollY + window.innerHeight) < 4000) {
      this.setState(({ itemLimit: { value } }) => ({
        itemLimit: {
          value: value + itemLimitIncreaseStep,
          bodyHeight: bodyHeight
        }
      }));
    }
  };

  onItemDrop = (droppedId, sourceType, targetType) => {
    const item = this.state.items.find(({ id }) => id === droppedId);
    const columnItem = { id: droppedId, year: yearOf(item.date) };

    this.setState(state => ({
      columns: {
        ...state.columns,
        [sourceType]: sourceType === 'suggested' ? undefined : state.columns[sourceType].filter(({ id }) => id !== droppedId),
        [targetType]: targetType === 'suggested' ? undefined : state.columns[targetType].concat([ columnItem ])
      }
    }),
    () => localStorage.columns = JSON.stringify(this.state.columns));
  };

  onConfigStateChange = config => {
    this.setState({ config, itemLimit: itemLimitDefaults });
  };

  onPlayerClose = () => {
    this.setState({ trailerItem: null });
  };

  onStartTrailer = item => {
    this.setState({ trailerItem: item });
  };

  suggestedItems() {
    const { columns, config } = this.state;
    const items = _(this.state.items)
      .filter(({ season, discDate }) => !config.disc || season || (discDate && moment().isAfter(discDate)))
      .filter(({ season }) => config.medium === 'all' || (config.medium === 'movie' && !season) || (config.medium === 'tv' && season))
      .filter(({ genres }) => config.genres.include.condition !== 'one' || config.genres.exclude.every(genre => !genres.includes(genre)))
      .filter(({ genres }) => config.genres.include.condition !== 'one' || config.genres.include.list.some(genre => genres.includes(genre)))
      .filter(({ genres }) => config.genres.include.condition !== 'all' || (config.genres.include.list.length > 0 && config.genres.include.list.every(genre => genres.includes(genre))))
      .filter(({ scores }) => scores[config.score.origin] && scores[config.score.origin].value * 10 >= config.score.min)
      .filter(({ date }) => yearOf(date) >= config.year.min && yearOf(date) <= parseMaxYear(config.year.max))
      .filter(({ id }) => !columns.picked.some(columnItem => columnItem.id === id))
      .filter(({ id }) => !columns.watched.some(columnItem => columnItem.id === id));

    if (config.groupByYear) {
      const groupedItems = [];
      let lastYear;

      items
        .sortBy(
          ({ date }) => yearOf(date),
          ({ scores }) => scores[config.score.origin].value,
          ({ scores }) => scores[config.score.origin].votes)
        .reverse()
        .forEach(item => {
          const year = yearOf(item.date);

          if (year !== lastYear) {
            groupedItems.push({ divider: true, year: year });
            lastYear = year;
          }

          groupedItems.push(item);
        });

      return groupedItems;
    }

    return items
      .sortBy(
        ({ scores }) => scores[config.score.origin].value,
        ({ scores }) => scores[config.score.origin].votes)
      .reverse()
      .value();
  }

  renderEmptyMessage(message) {
    if (this.state.columns.picked.length === 0 && this.state.columns.watched.length === 0) {
      return message;
    }

    return null;
  }

  render() {
    return (
      <Fragment>
        {this.state.trailerItem && <Player item={this.state.trailerItem} onClose={this.onPlayerClose} />}
        <div className='Pad'>
          <PadColumn
            title='Suggested'
            itemType='suggested'
            onItemDrop={this.onItemDrop}
            withConfigPanel
          >
            {this.suggestedItems()
              .splice(0, this.state.itemLimit.value)
              .map(item => {
                if (item.divider) {
                  return <div key={`divider_${item.year}`} className='Pad_column_divider'>{item.year}</div>;
                }

                return (
                  <SuggestedItem
                    key={item.id}
                    meter={item.scores[this.state.config.score.origin].value / (this.state.config.score.max / 10)}
                    item={item}
                    onStartTrailer={this.onStartTrailer}
                  />
                );
              })}
          </PadColumn>
          <PadColumn
            title='Picked'
            itemType='picked'
            onItemDrop={this.onItemDrop}
            emptyMessage={this.renderEmptyMessage(
              <PadColumnPlaceholder>
                <div>drag</div>
                <div>from SUGGESTED</div>
                <div>and drop</div>
                <div>over here...</div>
              </PadColumnPlaceholder>
            )}
          >
            {_(this.state.items)
              .filter(({ id }) => this.state.columns.picked.some(columnItem => columnItem.id === id))
              .sortBy(({ scores }) => (scores[this.state.config.score.origin] || { value: 0 }).value)
              .reverse()
              .value()
              .map(item => <PickedItem key={item.id} item={item} />)}
          </PadColumn>
          <PadColumn
            title='Watched'
            itemType='watched'
            onItemDrop={this.onItemDrop}
            emptyMessage={this.renderEmptyMessage(
              <PadColumnPlaceholder>
                <div>&nbsp;</div>
                <div>&nbsp;</div>
                <div>&nbsp;</div>
                <div>...then here</div>
              </PadColumnPlaceholder>
            )}
          >
            {_(this.state.items)
              .filter(({ id }) => this.state.columns.watched.some(columnItem => columnItem.id === id))
              .sortBy(({ id }) => this.state.columns.watched.map(({ id }) => id).indexOf(id))
              .reverse()
              .value()
              .splice(0, this.state.itemLimit.value)
              .map(item => <WatchedItem key={item.id} item={item} />)}
          </PadColumn>
        </div>
      </Fragment>
    );
  }
}
