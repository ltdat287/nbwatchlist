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

  mouseOverEvent = null;
  tooltipTimeoutId = null;
  subscriptions = [];

  componentDidMount() {
    window.addEventListener('scroll', this.onScroll);

    this.subscriptions = [
      Events.subscribe('item.drag.start', this.onItemDragStart),
      Events.subscribe('suggestedItem.tooltip.start', this.onSuggestedItemTooltipStart),
      Events.subscribe('suggestedItem.tooltip.end', this.onSuggestedItemTooltipEnd)
    ];
  }

  componentWillUnmount() {
    window.removeEventListener('scroll', this.onScroll);

    this.subscriptions.forEach(s => s.remove());
    clearTimeout(this.tooltipTimeoutId);
  }

  onScroll = () => {
    if (this.mouseOverEvent) {
      this.onMouseOver(this.mouseOverEvent);
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

  onItemDragStart = () => {
    if (this.state.tooltip) {
      clearTimeout(this.tooltipTimeoutId);
      this.setState({ tooltip: null });
      Events.emit('suggestedItem.tooltip.end');
    }
  };

  onSuggestedItemTooltipStart = (item, e) => {
    if (item !== this.props.item && this.state.tooltip) {
      clearTimeout(this.tooltipTimeoutId);
      this.setState({ tooltip: null });
    }

    this.mouseOverEvent = e;
  };

  onSuggestedItemTooltipEnd = () => {
    this.mouseOverEvent = null;
  };

  onMouseOver = e => {
    if (this.shouldShowTooltip(e) && !this.state.tooltip) {
      clearTimeout(this.tooltipTimeoutId);
      this.setState({ tooltip: { point: 'c', yOffset: 0, aligned: false } });
      Events.emit('suggestedItem.tooltip.start', this.props.item, { ...e });
    }
  };

  onMouseOut = e => {
    if (!this.shouldShowTooltip(e) && this.state.tooltip) {
      clearTimeout(this.tooltipTimeoutId);
      this.tooltipTimeoutId = setTimeout(() => this.setState({ tooltip: null }), 100);
      Events.emit('suggestedItem.tooltip.end');
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

    this.setState({ tooltip: { point: point, yOffset: yOffset, aligned: true } });
  };

  renderTooltipScoreNumber(name, origin) {
    return (
      <div className='SuggestedItem_tooltip_scores_score'>
        {name && <div className='SuggestedItem_tooltip_scores_score_name'>{name}</div>}
        <div className='SuggestedItem_tooltip_scores_score_number'>{this.props.item.scores[origin].value.toFixed(1)}</div>
        <div className='SuggestedItem_tooltip_scores_score_votes'>{this.props.item.scores[origin].votes}</div>
      </div>
    );
  }

  renderLink(href, label, logo) {
    return (
      <a href={href} title={`Open ${label}`} target='_blank' rel='noopener noreferrer' onMouseOver={this.onButtonMouseOver} onMouseOut={this.onButtonMouseOut}>
        <img alt='' src={logo} />
      </a>
    );
  }

  render() {
    const { meter, item: { id, imdbId, rtId, name, season, genres, date, summary, poster, trailerKey } } = this.props;
    const expandedName = [ name, season ? `(season ${number.toWords(season)})` : `(${moment(date).year()})` ].join(' ');

    return (
      <Fragment>
        {this.state.tooltip && (
          <Align align={{ points: [ `${this.state.tooltip.point}l`, 'cr' ], offset: [ 20, this.state.tooltip.yOffset ] }} onAlign={this.onTooltipAlign} target={this.getRef}>
            <div className={classNames('SuggestedItem_tooltip', this.state.tooltip.point, { aligned: this.state.tooltip.aligned })}>
              <div className='SuggestedItem_tooltip_scores'>
                <div className='SuggestedItem_tooltip_scores_origin'>
                  <img className='SuggestedItem_tooltip_scores_logo' alt='IMDb' src={imdbLogo} />
                  {this.renderTooltipScoreNumber('', 'imdb')}
                </div>
                <div className='SuggestedItem_tooltip_scores_origin'>
                  <img className='SuggestedItem_tooltip_scores_logo' alt='RT' src={rtLogo} />
                  {this.renderTooltipScoreNumber('Audience', 'rtAudience')}
                  {this.renderTooltipScoreNumber('All Critics', 'rtAllCritics')}
                  {this.renderTooltipScoreNumber('Top Critics', 'rtTopCritics')}
                </div>
              </div>
              <img className='SuggestedItem_tooltip_poster' alt={name} src={`https://image.tmdb.org/t/p/w${devicePixelRatio * 2}00/${poster}`} />
              <div className='SuggestedItem_tooltip_text'>{summary}</div>
              <div className='SuggestedItem_tooltip_footerRow'>
                {genres.filter((_, i) => i < 3).map(genre => <span key={genre} className='SuggestedItem_tooltip_genre'>{genre}</span>)}
              </div>
              <div className='SuggestedItem_tooltip_footerRow'>
                {season && <span>season {number.toWords(season)}</span>}
                <span>{moment(date).year()}</span>
              </div>
            </div>
          </Align>
        )}
        <Item className={classNames('SuggestedItem', { hover: this.state.tooltip, safari: navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome') })}
          type='suggested'
          id={id}
          draggingDisabled={this.state.mouseOverButton}
          onRef={this.onRef}
          onMouseOver={this.onMouseOver}
          onMouseOut={this.onMouseOut}
        >
          <div className='SuggestedItem_box'>
            <Fragment>
              <h3 className='SuggestedItem_title' title={expandedName}>
                <span>{name}</span>
                {season && <span className='SuggestedItem_season'>{season}</span>}
              </h3>
              <div className='SuggestedItem_links'>
                <img
                  alt=''
                  title='Show Trailer'
                  className={classNames('youtube', { unavailable: !trailerKey })}
                  src={youtubeIcon}
                  onClick={this.onTrailerButtonPress}
                  onMouseOver={this.onButtonMouseOver}
                  onMouseOut={this.onButtonMouseOut}
                />
                {this.renderLink(`https://www.imdb.com/title/tt${imdbId}`,                                                      'IMDb',               window.devicePixelRatio < 2 ? imdbIcon16 : imdbIcon32)}
                {this.renderLink(`https://www.rottentomatoes.com/${season ? 'tv' : 'm'}/${rtId}${season ? `/s${season}` : ''}`, 'Rotten Tomatoes',    rtIcon)}
                {this.renderLink(`https://www.themoviedb.org/${season ? 'tv' : 'movie'}/${id}`,                                 'The Movie Database', tmdbIcon)}
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
