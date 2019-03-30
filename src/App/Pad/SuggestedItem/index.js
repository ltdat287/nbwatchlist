import React, { PureComponent, Fragment } from 'react';
import Align from 'rc-align';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import moment from 'moment';
import number from 'number-to-words';
import Item from '../Item';
import Events from '../../Events';
import youtubeIcon from '../../youtube.svg';
import imdbLogo from '../../imdb.png';
import imdbIcon16 from '../../imdb16.png';
import imdbIcon32 from '../../imdb32.png';
import rtLogo from '../../rt.svg';
import rtIcon from '../../rtSquare.svg';
import tmdbIcon from '../../tmdbSquare.svg';
import './styles.css';

let mouseMoveEvent;
let modifierKeyPressed = false;

function hasModifier({ metaKey, altKey, ctrlKey, shiftKey }) {
  return metaKey || altKey || ctrlKey || shiftKey;
}

window.addEventListener('mousemove', e => {
  mouseMoveEvent = e;
});

window.addEventListener('keydown', e => {
  modifierKeyPressed = hasModifier(e);
});

[ 'keyup', 'blur' ].forEach(event => {
  window.addEventListener(event, () => {
    modifierKeyPressed = false;
  });
});

export default class SuggestedItem extends PureComponent {

  static propTypes = {
    meter: PropTypes.number.isRequired,
    item: PropTypes.object.isRequired,
    onStartTrailer: PropTypes.func.isRequired
  };

  state = {
    ref: null,
    tooltip: null,
    mouseOverButton: false
  };

  tooltipTimeoutId = null;
  subscriptions = [];

  componentDidMount() {
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('scroll', this.onScroll);

    this.subscriptions = [
      Events.subscribe('item.drag.start', this.onItemDragStart),
      Events.subscribe('suggestedItem.tooltip.start', this.onSuggestedItemTooltipStart)
    ];
  }

  componentWillUnmount() {
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('scroll', this.onScroll);

    this.subscriptions.forEach(s => s.remove());
    clearTimeout(this.tooltipTimeoutId);
  }

  onBlur = () => {
    this.hideTooltipIfNeeded();
  };

  onKeyDown = e => {
    if (this.state.tooltip && hasModifier(e)) {
      this.setState(state => ({ tooltip: { ...state.tooltip, showCritique: true } }));
    }
  };

  onKeyUp = () => {
    if (this.state.tooltip) {
      this.setState(state => ({ tooltip: { ...state.tooltip, showCritique: false } }));
    }
  };

  onScroll = () => {
    if (mouseMoveEvent) {
      if (this.state.tooltip) {
        this.onMouseOut(mouseMoveEvent);
      } else {
        this.onMouseOver(mouseMoveEvent);
      }
    }
  };

  onTrailerButtonPress = () => {
    this.props.onStartTrailer(this.props.item);
  };

  shouldShowTooltip({ clientX, clientY }) {
    let node = document.elementFromPoint(clientX, clientY);

    do {
      if (node === this.state.ref) {
        return true;
      }

      node = node && node.parentNode;
    } while (node);

    return false;
  }

  hideTooltipIfNeeded = () => {
    if (this.tooltipTimeoutId) {
      clearTimeout(this.tooltipTimeoutId);
      delete this.tooltipTimeoutId;
    }

    if (this.state.tooltip) {
      this.setState({ tooltip: null });
    }
  };

  onItemDragStart = () => {
    this.hideTooltipIfNeeded();
  };

  onSuggestedItemTooltipStart = item => {
    if (item !== this.props.item) {
      this.hideTooltipIfNeeded();
    }
  };

  onMouseOver = e => {
    if (this.shouldShowTooltip(e) && !this.state.tooltip) {
      clearTimeout(this.tooltipTimeoutId);
      this.setState({ tooltip: { point: 'c', yOffset: 0, aligned: false } });
      Events.emit('suggestedItem.tooltip.start', this.props.item);
    }
  };

  onMouseOut = e => {
    if (!this.shouldShowTooltip(e) && this.state.tooltip) {
      clearTimeout(this.tooltipTimeoutId);
      this.tooltipTimeoutId = setTimeout(this.hideTooltipIfNeeded, 100);
    }
  };

  onButtonMouseOver = () => {
    this.setState({ mouseOverButton: true });
  };

  onButtonMouseOut = () => {
    this.setState({ mouseOverButton: false });
  };

  onRef = ref => {
    this.setState({ ref: ref });
  };

  getRef = () => {
    return this.state.ref;
  };

  onTooltipAlign = ref => {
    if (this.state.tooltip.aligned) {
      return;
    }

    const { top, bottom } = ref.getBoundingClientRect();
    let [ point, yOffset ] = [ 'c', 0 ];

    if (top < 0) {
      [ point, yOffset ] = [ 't', -26 ];
    }

    if (bottom > window.innerHeight) {
      [ point, yOffset ] = [ 'b', 26 ];
    }

    this.setState({ tooltip: { point: point, yOffset: yOffset, aligned: true, showCritique: modifierKeyPressed } });
  };

  renderTooltip() {
    const { name, season, genres, date, summary, poster, scores, critics, consensus } = this.props.item;
    const summaryCompactingStep = 300;
    const summaryCompactingFactor = Math.max(0.0, Math.min(1.0, (summary.length - summaryCompactingStep) / summaryCompactingStep));

    return (
      <div className={classNames('SuggestedItem_tooltip', this.state.tooltip.point, { aligned: this.state.tooltip.aligned })}>
        {this.state.tooltip.showCritique ? (
          <div className='SuggestedItem_tooltip_critique'>
            {[
              [ 'Critics Consensus', consensus ? [ { text: consensus } ] : [] ],
              [ 'Positive Critique', critics.filter(({ positive }) => positive) ],
              [ 'Negative Critique', critics.filter(({ positive }) => !positive) ]
            ].map(([ title, items ]) => (
              <div key={title} className='SuggestedItem_tooltip_critique_section'>
                <h3>{title}</h3>
                {items.length === 0 && <div className='SuggestedItem_tooltip_critique_text'>Nothing yet</div>}
                {items.map(({ text }, i) => <div key={i} className='SuggestedItem_tooltip_critique_text'>{text}</div>)}
              </div>
            ))}
          </div>
        ) : (
          <Fragment>
            <div className='SuggestedItem_tooltip_scores'>
              {[
                [ imdbLogo, [
                  [ '', 'imdb' ]
                ] ],
                [ rtLogo, [
                  [ 'Audience',     'rtAudience'    ],
                  [ 'All Critics',  'rtAllCritics'  ],
                  [ 'Top Critics',  'rtTopCritics'  ]
                ] ],
              ].map(([ logo, scoreRows ], i) => (
                <div key={i} className={classNames('SuggestedItem_tooltip_scores_origin', { hidden: scoreRows.every(([ _, key ]) => !scores[key]) })}>
                  <img className='SuggestedItem_tooltip_scores_logo' alt='' src={logo} />
                  {scoreRows.filter(([ _, key ]) => scores[key]).map(([ name, key ]) => (
                    <div key={key} className='SuggestedItem_tooltip_scores_score'>
                      {name && <div className='SuggestedItem_tooltip_scores_score_name'>{name}</div>}
                      <div className='SuggestedItem_tooltip_scores_score_number'>{scores[key].value.toFixed(1)}</div>
                      <div className='SuggestedItem_tooltip_scores_score_votes'>{scores[key].votes}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <img className='SuggestedItem_tooltip_poster' alt={name} src={`https://image.tmdb.org/t/p/w${devicePixelRatio * 2}00/${poster}`} />
            <div className='SuggestedItem_tooltip_summary' style={{
              fontSize: 12 - Math.round(1.0 * summaryCompactingFactor * 10) / 10,
              lineHeight: 2 - Math.round(0.7 * summaryCompactingFactor * 10) / 10
            }}>
              {summary.length > summaryCompactingStep * 2 ? `${summary.substring(0, summaryCompactingStep * 2)}...` : summary}
            </div>
            <div className='SuggestedItem_tooltip_footerRow'>
              {genres.filter((_, i) => i < 3).map(genre => <span key={genre} className='SuggestedItem_tooltip_genre'>{genre}</span>)}
            </div>
            <div className='SuggestedItem_tooltip_footerRow'>
              {season && season < 20 && <span>season {number.toWords(season)}</span>}
              <span>{moment(date).year()}</span>
            </div>
          </Fragment>
        )}
      </div>
    );
  }

  render() {
    const { meter, item: { id, imdbId, rtId, name, season, date, trailerKey } } = this.props;

    return (
      <Fragment>
        {this.state.tooltip && (
          <Align align={{ points: [ `${this.state.tooltip.point}l`, 'cr' ], offset: [ 20, this.state.tooltip.yOffset ] }} onAlign={this.onTooltipAlign} target={this.getRef}>
            {this.renderTooltip()}
          </Align>
        )}
        <Item
          className={classNames('SuggestedItem', {
            hover: this.state.tooltip,
            noRt: !rtId,
            noTrailer: !trailerKey,
            safari: navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')
          })}
          type='suggested'
          id={id}
          draggingDisabled={this.state.mouseOverButton}
          onRef={this.onRef}
          onMouseOver={this.onMouseOver}
          onMouseOut={this.onMouseOut}
        >
          <div className='SuggestedItem_box'>
            <Fragment>
              <h3 className='SuggestedItem_title' title={[ name, season ? `(season ${number.toWords(season)})` : `(${moment(date).year()})` ].join(' ')}>
                <span>{name}</span>
                {season && <span className='SuggestedItem_season'>{season}</span>}
              </h3>
              <div className='SuggestedItem_links'>
                <img
                  alt=''
                  title='Show Trailer'
                  className='youtube'
                  src={youtubeIcon}
                  onClick={this.onTrailerButtonPress}
                  onMouseOver={this.onButtonMouseOver}
                  onMouseOut={this.onButtonMouseOut}
                />
                {[
                  [ `https://www.imdb.com/title/tt${imdbId}`,                                                       'IMDb',               window.devicePixelRatio < 2 ? imdbIcon16 : imdbIcon32 ],
                  [ `https://www.rottentomatoes.com/${season ? 'tv' : 'm'}/${rtId}${season ? `/s${season}` : ''}`,  'Rotten Tomatoes',    rtIcon ],
                  [ `https://www.themoviedb.org/${season ? 'tv' : 'movie'}/${id}`,                                  'The Movie Database', tmdbIcon ],
                ].map(([ href, label, icon ]) => (
                  <a key={label} href={href} title={`Open ${label}`} target='_blank' rel='noopener noreferrer' onMouseOver={this.onButtonMouseOver} onMouseOut={this.onButtonMouseOut}>
                    <img alt='' src={icon} />
                  </a>
                ))}
              </div>
              <div className='SuggestedItem_meter'>
                <div className='SuggestedItem_meter_line' style={{ width: `${meter * 100}%` }} />
              </div>
            </Fragment>
          </div>
        </Item>
      </Fragment>
    );
  }
}
