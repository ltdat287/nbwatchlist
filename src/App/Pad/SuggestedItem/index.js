import React, { PureComponent, Fragment } from 'react';
import Align from 'rc-align';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import moment from 'moment';
import number from 'number-to-words';
import Item from '../Item';
import imdbLogo from '../../imdb.png';
import rtLogo from '../../rt.svg';
import rtSquareLogo from '../../rtSquare.svg';
import tmdbLogo from '../../tmdbSquare.svg';
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
    mouseOverLink: false
  };

  componentDidMount() {
    window.addEventListener('keydown', this.onKeyDown);
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.onKeyDown);
  }

  onKeyDown = ({ keyCode }) => {
    if (keyCode === 84 && this.state.tooltip && this.props.item.trailerKey) {
      localStorage.trailerShortcutPressed = true;
      this.props.onStartTrailer(this.props.item);
    }
  };

  onMouseOver = () => {
    this.setState({ tooltip: { point: 'c', yOffset: 0, aligned: false } });
  };

  onMouseOut = () => {
    this.setState({ tooltip: null });
  };

  onLinkMouseOver = () => {
    this.setState({ mouseOverLink: true });
  };

  onLinkMouseOut = () => {
    this.setState({ mouseOverLink: false });
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

  renderLink(href, originLabel, logo, name) {
    return (
      <a href={href} title={`Open — ${originLabel} — ${name}`} target='_blank' rel='noopener noreferrer' onMouseOver={this.onLinkMouseOver} onMouseOut={this.onLinkMouseOut}>
        <img alt='' src={logo} />
      </a>
    );
  }

  render() {
    const { meter, item: { id, imdbId, rtId, name, season, genres, date, summary, poster, trailerKey } } = this.props;
    const expandedTitle = [ name, season ? `(season ${number.toWords(season)})` : `(${moment(date).year()})` ].join(' ');

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
              {!localStorage.trailerShortcutPressed && trailerKey && <div className='SuggestedItem_tooltip_trailedNotice'>Press T to see trailer</div>}
            </div>
          </Align>
        )}
        <Item className='SuggestedItem' type='suggested' id={id} draggingDisabled={this.state.mouseOverLink} onRef={this.onRef} onMouseOver={this.onMouseOver} onMouseOut={this.onMouseOut}>
          <div className='SuggestedItem_box'>
            <Fragment>
              <h3 className='SuggestedItem_title' title={expandedTitle}>
                <span>{name}</span>
                {season && <span className='SuggestedItem_season'>{season}</span>}
              </h3>
              <div className='SuggestedItem_links'>
                {this.renderLink(`https://www.imdb.com/title/tt${imdbId}`,                                                      'IMDb',               imdbLogo,     expandedTitle)}
                {this.renderLink(`https://www.rottentomatoes.com/${season ? 'tv' : 'm'}/${rtId}${season ? `/s${season}` : ''}`, 'Rotten Tomatoes',    rtSquareLogo, expandedTitle)}
                {this.renderLink(`https://www.themoviedb.org/${season ? 'tv' : 'movie'}/${id}`,                                 'The Movie Database', tmdbLogo,     expandedTitle)}
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
