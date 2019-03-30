import React, { PureComponent } from 'react';
import classNames from 'classnames';
import _ from 'lodash';
import moment from 'moment';
import Events from '../../../Events';
import './styles.css';

function getScoreDefaults(origin) {
  const defaults = {
    imdb: {
      min: 80,
      max: 100
    },
    rtAudience: {
      min: 40,
      max: 50
    },
    rtAllCritics: {
      min: 70,
      max: 100
    },
    rtTopCritics: {
      min: 65,
      max: 100
    }
  };
  
  return {
    origin,
    ...defaults[origin]
  };
}

const allGenres = [
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Family',
  'Fantasy',
  'History',
  'Horror',
  'Kids',
  'Music',
  'Musical',
  'Mystery',
  'News',
  'Politics',
  'Reality',
  'Romance',
  'Sci-Fi',
  'Soap',
  'TV Movie',
  'Talk',
  'Thriller',
  'War',
  'Western'
];

const defaults = {
  medium: 'all',
  score: getScoreDefaults('imdb'),
  year: {
    max: 'today',
    min: moment().year() - 5
  },
  genres: {
    include: {
      condition: 'one',
      list: allGenres
    },
    exclude: [
      'Documentary',
      'History',
      'Musical',
      'News',
      'Reality',
      'Soap',
      'Talk'
    ]
  },
  disc: false,
  groupByYear: true
};

let primaryState = localStorage.config ? JSON.parse(localStorage.config) : defaults;

export function getConfigState() {
  return primaryState;
}

export default class ConfigPanel extends PureComponent {

  state = primaryState;

  subscriptions = [];

  componentDidMount() {
    this.subscriptions = [
      Events.subscribe('config.state', this.onStateChange)
    ];
  }

  componentWillUnmount() {
    this.subscriptions.forEach(s => s.remove());
  }

  onStateChange = state => {
    this.setState(state);
    primaryState = state;
    localStorage.config = JSON.stringify(state);
  };

  onInputChange = ({ currentTarget: { name, value, checked } }) => {
    const newState = _.cloneDeep(this.state);

    switch (name) {
      case 'medium':
        newState.medium = value;
        break;
      case 'score.origin':
        newState.score = getScoreDefaults(value);
        break;
      case 'score.min':
        newState.score.min = parseInt(value);
        break;
      case 'year.max':
        if (value === 'today') {
          newState.year.max = value;
        } else {
          newState.year.max = parseInt(value);
          newState.year.min = Math.min(newState.year.min, newState.year.max);
        }
        break;
      case 'year.min':
        newState.year.min = parseInt(value);

        if (newState.year.max !== 'today') {
          newState.year.max = Math.max(newState.year.max, newState.year.min);
        }
        break;
      case 'genres.include.condition':
        newState.genres.include.condition = value;
        break;
      case 'genres.include.selectAll':
        newState.genres.include.list = allGenres;
        break;
      case 'genres.include.selectNone':
        newState.genres.include.list = [];
        break;
      case 'genres.include':
        newState.genres.include.list = checked ? newState.genres.include.list.concat([ value ]) : newState.genres.include.list.filter(genre => genre !== value);
        break;
      case 'genres.exclude.selectAll':
        newState.genres.exclude = allGenres;
        break;
      case 'genres.exclude.selectNone':
        newState.genres.exclude = [];
        break;
      case 'genres.exclude':
        newState.genres.exclude = checked ? newState.genres.exclude.concat([ value ]) : newState.genres.exclude.filter(genre => genre !== value);
        break;
      case 'disc':
        newState.disc = checked;
        break;
      case 'groupByYear':
        newState.groupByYear = checked;
        break;
      default:
        break;
    }

    Events.emit('config.state', newState);
  };

  scoreSteps() {
    const steps = [];

    for (let step = 0; step <= this.state.score.max; step += 1) {
      steps.push(step);
    }

    return _(steps).reverse().value();
  }

  yearSteps(includeToday) {
    let steps = [];

    for (let step = 1900; step <= moment().year(); step += 1) {
      steps.push(step);
    }

    steps = _(steps).reverse().value();

    if (includeToday) {
      steps.unshift('today');
    }

    return steps;
  }

  render() {
    return (
      <div className='ConfigPanel'>
        <section className='ConfigPanel_section'>
          <h2>Suggest</h2>

          <div>
            {[
              [ 'movie',  'Movies'    ],
              [ 'tv',     'TV series' ],
              [ 'all',    'Both'      ]
            ].map(([ id, label ]) => (
              <div key={id}>
                <label>
                  <input type='radio' name='medium' value={id} checked={this.state.medium === id} onChange={this.onInputChange} />{label}
                </label>
              </div>
            ))}

            {this.state.medium === 'movie' && <h3>Released Between</h3>}
            {this.state.medium === 'tv' && <h3>Aired Between</h3>}
            {this.state.medium === 'all' && <h3>Released/Aired Between</h3>}
            <div className='ConfigPanel_yearRanges'>
              <select name='year.max' value={this.state.year.max} onChange={this.onInputChange}>
                {this.yearSteps(true).map(year => <option key={year} value={year}>{year}</option>)}
              </select>
              <div> and </div>
              <select name='year.min' value={this.state.year.min} onChange={this.onInputChange}>
                {this.yearSteps().map(year => <option key={year} value={year}>{year}</option>)}
              </select>
            </div>
          </div>

          <h2>Meter</h2>

          <div>
            <h3>Based on</h3>
            {[
              [ 'imdb',         'IMDb'              ],
              [ 'rtAudience',   'RT (Audience)'     ],
              [ 'rtAllCritics', 'RT (All Critics)'  ],
              [ 'rtTopCritics', 'RT (Top Critics)'  ]
            ].map(([ id, label ]) => (
              <div key={id}>
                <label>
                  <input type='radio' name='score.origin' value={id} checked={this.state.score.origin === id} onChange={this.onInputChange} />{label}
                </label>
              </div>
            ))}

            <h3>Don't Suggest Below</h3>
            <div>
              <select name='score.min' value={this.state.score.min} onChange={this.onInputChange}>
                {this.scoreSteps().map(score => <option key={score} value={score}>{(score / 10).toFixed(1)}</option>)}
              </select>
            </div>
          </div>

          <h2>Preferences</h2>

          <div>
            <div>
              <label>
                <input type='checkbox' name='groupByYear' checked={this.state.groupByYear} onChange={this.onInputChange} />
                <span>Group suggestions by year</span>
              </label>
            </div>
            {this.state.medium !== 'tv' && (
              <div>
                <label>
                  <input type='checkbox' name='disc' checked={this.state.disc} onChange={this.onInputChange} />
                  <span>Suggest a movie only if it's &nbsp;&nbsp;&nbsp;&nbsp; out on disc/streaming</span>
                </label>
              </div>
            )}
          </div>
        </section>

        <section className='ConfigPanel_section'>
          {this.state.genres.include.condition === 'one' && <h2>Included Genres</h2>}
          {this.state.genres.include.condition === 'all' && <h2>Genres</h2>}

          <div>
            <h3>Select</h3>
            <div className='ConfigPanel_selectGenres'>
              <button type='button' name='genres.include.selectAll' className='ConfigPanel_selectAll' onClick={this.onInputChange}>All</button>
              <button type='button' name='genres.include.selectNone' onClick={this.onInputChange}>None</button>
            </div>
            {allGenres.map(genre => {
              const disabled = this.state.genres.include.condition === 'one' && this.state.genres.exclude.includes(genre);

              return (
                <div key={genre}>
                  <label className={classNames({ disabled: disabled })}>
                    <input
                      type='checkbox'
                      name='genres.include'
                      value={genre}
                      checked={this.state.genres.include.list.includes(genre) && !disabled}
                      disabled={disabled}
                      onChange={this.onInputChange}
                    />
                    {genre}
                  </label>
                </div>
              );
            })}

            <h3>Suggest With</h3>
            <div>
              <label>
                <input type='radio' name='genres.include.condition' value='one' checked={this.state.genres.include.condition === 'one'} onChange={this.onInputChange} />At least one of the above
              </label>
            </div>
            <div>
              <label>
                <input type='radio' name='genres.include.condition' value='all' checked={this.state.genres.include.condition === 'all'} onChange={this.onInputChange} />All of the above
              </label>
            </div>
          </div>
        </section>

        {this.state.genres.include.condition === 'one' && (
          <section className='ConfigPanel_section'>
            <h2>Excluded Genres</h2>

            <div>
              <h3>Select</h3>
              <div className='ConfigPanel_selectGenres'>
                <button type='button' name='genres.exclude.selectAll' className='ConfigPanel_selectAll' onClick={this.onInputChange}>All</button>
                <button type='button' name='genres.exclude.selectNone' onClick={this.onInputChange}>None</button>
              </div>
              {allGenres.map(genre => (
                <div key={genre} className='ConfigPanel_genre'>
                  <label>
                    <input type='checkbox' name='genres.exclude' value={genre} checked={this.state.genres.exclude.includes(genre)} onChange={this.onInputChange} />{genre}
                  </label>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }
}
