import React, { PureComponent } from 'react';
import request from 'superagent';
import {
  TwitterShareButton, TwitterIcon,
  WhatsappShareButton, WhatsappIcon,
  TelegramShareButton, TelegramIcon,
  FacebookShareButton, FacebookShareCount, FacebookIcon,
  RedditShareButton, RedditShareCount, RedditIcon,
  VKShareButton, VKShareCount, VKIcon
} from 'react-share';
import humanFormat from 'human-format';
import BrandedButton from '../components/BrandedButton';
import Pad from './Pad';
import imdbLogo from './imdb.png';
import rtLogo from './rt.svg';
import tmdbLogo from './tmdbSquare.svg';
import './styles.css';

const appUrl = document.querySelector('link[rel="canonical"]').getAttribute('href');

export default class App extends PureComponent {

  state = {
    didCatch: false,
    hideSubscribeForm: true,//localStorage.hideSubscribeForm,
    showSubscribeConfirmation: false,
    email: ''
  };

  componentDidCatch() {
    this.setState({ didCatch: true });
  }

  componentDidUpdate() {
    localStorage.hideSubscribeForm = this.state.hideSubscribeForm || '';
  }

  onSubmit = e => {
    e.preventDefault();

    request
      .post('/')
      .type('form')
      .send({ 'form-name': 'subscribe', email: this.state.email })
      .end(() => {
        this.setState({ hideSubscribeForm: true, showSubscribeConfirmation: true });
        setTimeout(() => this.setState({ showSubscribeConfirmation: false }), 3000);
      });
  };

  onResetButtonPress = () => {
    localStorage.clear();
    window.location.reload();
  };

  onEmailChange = ({ currentTarget: { value } }) => {
    this.setState({ email: value });
  };

  onHideSubscribeFormButtonPress = () => {
    this.setState({ hideSubscribeForm: true });
  };

  render() {
    if (this.state.didCatch) {
      return (
        <div className='App errorPage'>
          <h1 className='App_title'>Oops, something went wrong!<br />Try refreshing.</h1>
          <BrandedButton className='App_resetButton' onClick={this.onResetButtonPress}>Not helping? Click here to reset the app</BrandedButton>
        </div>
      );
    }

    const shareButtonSize = 20;

    return (
      <div className='App'>
        <div className='App_alphaNotice'>an early alpha version</div>
        <div className='App_attribution'>
          <span className='App_attribution_poweredBy'>powered by</span>
          <a href='https://www.imdb.com' target='_blank' rel='noopener noreferrer' title='IMDb'>
            <img alt='' src={imdbLogo} />
          </a>
          <a href='https://www.rottentomatoes.com' target='_blank' rel='noopener noreferrer' title='Rotten Tomatoes'>
            <img alt='' src={rtLogo} />
          </a>
          <a href='https://www.themoviedb.org' target='_blank' rel='noopener noreferrer' title='The Movie Database'>
            <img alt='' src={tmdbLogo} />
          </a>
        </div>

        <h1 className='App_title'>No-Brainer Watchlist</h1>

        <div className='App_shareButtonsRow'>
          <div className='App_shareButtons'>
            {[
              [ 'Twitter',    TwitterShareButton,   TwitterIcon                       ],
              [ 'Whatsapp',   WhatsappShareButton,  WhatsappIcon                      ],
              [ 'Telegram',   TelegramShareButton,  TelegramIcon                      ],
              [ 'Facebook',   FacebookShareButton,  FacebookIcon, FacebookShareCount  ],
              [ 'Reddit',     RedditShareButton,    RedditIcon,   RedditShareCount    ],
              [ 'VKontakte',  VKShareButton,        VKIcon,       VKShareCount        ]
            ].map(([ label, button, icon, count ]) => (
              <div key={label} className='App_shareButtonBlock'>
                <div title={`Share on ${label}`}>
                  {React.createElement(button, { className: 'App_shareButton', url: appUrl }, [
                    React.createElement(icon, { key: '', size: shareButtonSize, round: true })
                  ])}
                  {count && React.createElement(count, { className: 'App_shareCount', url: appUrl },
                    number => humanFormat(number, { decimals: 0, separator: '' })
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {this.state.showSubscribeConfirmation && (
          <div className='App_subscribeConfirmation'>Thank you! You are subscribed.</div>
        )}

        {!this.state.hideSubscribeForm && (
          <form className='App_subscribe' onSubmit={this.onSubmit}>
            <h2>News, updates, future plans. No spam guaranteed!</h2>
            <input type='email' placeholder='type your email address' autoComplete='off' value={this.state.email} onChange={this.onEmailChange} required />
            <BrandedButton type='submit'>Subscribe</BrandedButton>
            <div className='App_subscribe_hideButtonContainer'>
              <button type='button' onClick={this.onHideSubscribeFormButtonPress}>no thanks</button>
            </div>
          </form>
        )}

        <Pad />

        <div className='App_contact'>Got questions or suggestions? <a href={[ 'mail', 'to', ':', 'nbwatchlist', '@', 'g', 'mail', '.', 'com' ].join('')}>Contact us</a>.</div>
      </div>
    );
  }
}
