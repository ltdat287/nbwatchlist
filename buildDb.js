#!/usr/bin/env node

const request = require('superagent');
const _ = require('lodash');
const fs = require('fs');
const moment = require('moment');
const leftPad = require('left-pad');
const zeroFill = require('zero-fill');
const htmlParser = require('node-html-parser');

const minYear = 1900;
const tmdbKey = '9389b4f79115a7b779250d79c568c87c';

function pause() {
  return new Promise((resolve, reject) => setTimeout(resolve, 3000));
}

async function fetchTmdb(url, query) {
  let result;

  for (let i = 0; i < 10; i++) {
    result = await new Promise((resolve, reject) => {
      request
        .get(url)
        .query(query)
        .end((err, res) => {
          resolve(res ? res.body : '');
        });
    });

    if (result && result.status_code === 25) {
      await new Promise((resolve, reject) => setTimeout(resolve, 5000));
      continue;
    }

    if (result) {
      break;
    }
  }

  return result;
}

async function fetchItems(page, year, type) {
  const dateField = type === 'tv' ? 'first_air_date' : 'primary_release_date';

  const p = await fetchTmdb(`https://api.themoviedb.org/3/discover/${type}`, {
    api_key: tmdbKey,
    sort_by: `${dateField}.desc`,
    include_adult: false,
    page: page,
    [`${dateField}.lte`]: `${year}-12-31`,
    [`${dateField}.gte`]: `${year}-01-01`,
    'vote_count.gte': 5
  });

  if (!p.results) {
    console.log(p);
  }

  return p;
}

async function fetchItem(id, type) {
  return fetchTmdb(`https://api.themoviedb.org/3/${type}/${id}`, {
    api_key: tmdbKey
  });
}

async function fetchExternalIds(id, type) {
  return fetchTmdb(`https://api.themoviedb.org/3/${type}/${id}/external_ids`, {
    api_key: tmdbKey
  });
}

async function fetchItemVideos(id, type) {
  return fetchTmdb(`https://api.themoviedb.org/3/${type}/${id}/videos`, {
    api_key: tmdbKey
  });
}

async function fetchSeasonVideos(id, season) {
  return fetchTmdb(`https://api.themoviedb.org/3/tv/${id}/season/${season}/videos`, {
    api_key: tmdbKey
  });
}

async function fetchImdbPage(id) {
  let result;

  for (let i = 0; i < 10; i++) {
    result = await new Promise((resolve, reject) => {
      request
        .get(`https://www.imdb.com/title/${id}`)
        .end((err, res) => {
          resolve(res ? res.text : '');
        });
    });

    if (result) {
      break;
    }
  }

  return result;
}

async function searchRt(title) {
  let result;

  for (let i = 0; i < 10; i++) {
    result = await new Promise((resolve, reject) => {
      request
        .get(`https://www.rottentomatoes.com/api/private/v2.0/search`)
        .query({
          limit: 100,
          q: title
        })
        .end((err, res) => {
          resolve(res ? res.body : '');
        });
    });

    if (Object.keys(result).length === 0) {
      console.log(result);
      await new Promise((resolve, reject) => setTimeout(resolve, 5000));
      continue;
    }

    if (result) {
      break;
    }
  }

  return result;
}

async function fetchRtPage(path) {
  let result;

  for (let i = 0; i < 10; i++) {
    result = await new Promise((resolve, reject) => {
      request
        .get(`https://www.rottentomatoes.com${path}`)
        .end((err, res) => {
          resolve(res ? res.text : '');
        });
    });

    if (result) {
      break;
    }
  }

  return result;
}

function normalizeName(name) {
  return name.toLowerCase().replace(/[.,:\-/'"]+/g, '').replace(/[ ]+/g, ' ');
}

function areSameNames(name1, name2) {
  return normalizeName(name1) === normalizeName(name2);
}

(async function() {
  let items = [];

  // MOVIES

  for (let y = moment().year(); y >= minYear; y--) {
    console.log(`\nmovie ${y}`);

    const pageCount = (await fetchItems(1, y, 'movie')).total_pages;

    for (let i = 1; i <= pageCount; i++) {
      console.log(`${leftPad(i, 3)} / ${leftPad(pageCount, 3)}`);

      const page = (await fetchItems(i, y, 'movie'));
      const promises = [];

      await pause();

      for (let j = 0; j < page.results.length; j++) {
        promises.push((async function() {
          const { id, title, release_date, original_language } = page.results[j];

          if (original_language !== 'en') {
            return;
          }

          const tmdb = await fetchItem(id, 'movie');
          const videos = (await fetchItemVideos(id, 'movie')).results;
          const { imdb_id } = tmdb;

          // IMDB
          if (!imdb_id) {
            return;
          }

          let imdb;
          const imdbPage = await fetchImdbPage(imdb_id);
          const imdbGroups = imdbPage.match(/<script type="application\/ld\+json">(.+?)<\/script>/s);

          if (imdbGroups && imdbGroups.length > 1) {
            imdb = JSON.parse(imdbGroups[1]);
          }

          if (!imdb) {
            return;
          }

          // RT
          let rt;
          let rtAudienceVotes;
          let rtAudienceValue;
          let rtCriticsRating;
          let rtTopCriticsReviews;
          let discDate;
          let rtSearchResults = await searchRt(title);
          let rtSearchResult;

          if (rtSearchResults.movies) {
            rtSearchResults = rtSearchResults.movies.filter(({ url }) => url !== '/m/null');
          } else {
            console.log(title, rtSearchResults);
            rtSearchResults = [];
          }

          if (rtSearchResults.length === 1) {
            rtSearchResult = rtSearchResults[0];
          } else {
            const yearResults = rtSearchResults.filter(({ year }) => year === moment(release_date).year());
            const castResults = rtSearchResults.filter(({ castItems }) => castItems.some(({ name }) => imdbPage.includes(name)));
            const nameResults = rtSearchResults.filter(({ name }) => areSameNames(title, name));
            const yearNameResults = rtSearchResults
              .filter(({ year }) => year === moment(release_date).year())
              .filter(({ name }) => areSameNames(title, name));
            const yearCastNameResults = rtSearchResults
              .filter(({ year }) => year === moment(release_date).year())
              .filter(({ castItems }) => castItems.some(({ name }) => imdbPage.includes(name)))
              .filter(({ name }) => areSameNames(title, name));

            if (yearResults.length === 1) {
              rtSearchResult = yearResults[0];
            } else if (castResults.length === 1) {
              rtSearchResult = castResults[0];
            } else if (nameResults.length === 1) {
              rtSearchResult = nameResults[0];
            } else if (yearNameResults.length === 1) {
              rtSearchResult = yearNameResults[0];
            } else if ([ 1, 2 ].includes(yearCastNameResults.length)) {
              rtSearchResult = yearCastNameResults[0];
            } else {
              rtSearchResults = rtSearchResults.filter(({ castItems }) => castItems.length === 0 || castItems.some(({ name }) => imdbPage.includes(name)));

              if (rtSearchResults.length === 1) {
                rtSearchResult = rtSearchResults[0];
              } else {
                rtSearchResults = rtSearchResults.filter(({ year }) => !year || [ year - 2, year - 1, year, year + 1, year + 2 ].includes(moment(release_date).year()));

                if (rtSearchResults.length === 1) {
                  rtSearchResult = rtSearchResults[0];
                } else {
                  rtSearchResults = rtSearchResults.filter(({ name }) => areSameNames(title, name));

                  if (rtSearchResults.length === 1) {
                    rtSearchResult = rtSearchResults[0];
                  }
                }
              }
            }
          }

          if (rtSearchResult) {
            const rtPage = await fetchRtPage(rtSearchResult.url);
            const onDiscDateGroups = rtPage
              .substring(rtPage.indexOf('In Theaters:'), rtPage.indexOf('Studio:'))
              .match(/<li.*?>.+?On Disc\/Streaming:.+?<time datetime=".+?">(.+?)<\/time>.+?<\/li>/s);

            if (onDiscDateGroups && onDiscDateGroups.length > 1) {
              discDate = moment(onDiscDateGroups[1], 'MMM DD, YYYY');
            }

            /*const rtGroups = rtPage.match(/<script type="application\/ld\+json">(.+?)<\/script>/s);

            if (rtGroups && rtGroups.length > 1) {
              rt = rtGroups[1];
            }*/

            const rtAudienceVotesText = rtPage.substring(rtPage.indexOf('Audience Score'), rtPage.indexOf('</section>', rtPage.indexOf('Audience Score')));

            if (!rtAudienceVotesText.includes('Not Yet Available')) {
              const rtAudienceVotesGroups = rtAudienceVotesText.match(/<small.*?>(.+?)<\/small>/s);

              if (rtAudienceVotesGroups && rtAudienceVotesGroups.length > 1) {
                rtAudienceVotes = rtAudienceVotesGroups[1].replace(/,/g, '');
              }

              const rtAudienceValuePosition = rtPage.indexOf('Average Rating:', rtPage.indexOf('AUDIENCE SCORE'));
              const rtAudienceValueGroups = rtPage
                .substring(rtAudienceValuePosition, rtPage.indexOf('</div>', rtAudienceValuePosition))
                .match(/<span.*?>(.+?)\/5.+?<\/span>/s);

              if (rtAudienceValueGroups && rtAudienceValueGroups.length > 1) {
                rtAudienceValue = rtAudienceValueGroups[1];
              }
            }

            const rtCriticsRatingGroups = rtPage.match(/root.RottenTomatoes.context.scoreInfo = (.+?});/s);

            if (rtCriticsRatingGroups && rtCriticsRatingGroups.length > 1) {
              rtCriticsRating = JSON.parse(rtCriticsRatingGroups[1]);
            }

            const rtTopCriticsReviewsPage = await fetchRtPage(`${rtSearchResult.url}/reviews/?type=top_critics`);
            const rtTopCriticsReviewsHtml = htmlParser.parse(rtTopCriticsReviewsPage.substring(
              rtTopCriticsReviewsPage.indexOf('<section id="content"'),
              rtTopCriticsReviewsPage.indexOf('</section>', rtTopCriticsReviewsPage.indexOf('<section id="content"')) + '</section>'.length + 1));
            const rtTopCriticsAllReviews = rtTopCriticsReviewsHtml.querySelectorAll('.review_table_row').map(row => ({
              text: row.querySelector('.the_review').text,
              positive: !row.querySelector('.rotten')
            }));

            rtTopCriticsReviews = _(rtTopCriticsAllReviews.filter(({ positive }) => positive))
              .take(2)
              .concat(_(rtTopCriticsAllReviews.filter(({ positive }) => !positive)).take(2).value())
              .value();
          }

          // scores
          const scores = {
            /*tmdb: tmdb.vote_average > 0 ? {
              votes: tmdb.vote_count,
              value: tmdb.vote_average
            } : undefined,*/

            imdb: imdb.aggregateRating && parseFloat(imdb.aggregateRating.ratingValue) > 0 ? {
              votes: imdb.aggregateRating.ratingCount,
              value: parseFloat(imdb.aggregateRating.ratingValue)
            } : undefined,

            rtAudience: rtAudienceVotes ? {
              votes: parseInt(rtAudienceVotes),
              value: parseFloat(rtAudienceValue)
            } : undefined,

            rtAllCritics: rtCriticsRating ? {
              votes: rtCriticsRating.tomatometerAllCritics.numberOfReviews,
              value: rtCriticsRating.tomatometerAllCritics.avgScore
            } : undefined,

            rtTopCritics: rtCriticsRating ? {
              votes: rtCriticsRating.tomatometerTopCritics.numberOfReviews,
              value: rtCriticsRating.tomatometerTopCritics.avgScore
            } : undefined
          };

          if (!scores.imdb || scores.imdb.votes < 500
            ||
            scores.rtAudience && scores.rtAudience.votes < 100
            ||
            scores.rtAllCritics && scores.rtAllCritics.votes < 10
            ||
            scores.rtTopCritics && scores.rtTopCritics.votes < 2) {
            return;
          }

          // duration
          let duration = tmdb.runtime;

          if (!duration) {
            if (imdb && imdb.duration) {
              duration = moment.duration(imdb.duration).asMinutes();
            }

            if (!duration) {
              console.warn('No duration!');
              console.log(`${title} => ${release_date}`);
              return;
            }
          }

          let trailerKey;

          if (videos && videos.length > 0) {
            if (videos.every(({ type }) => type !== 'Trailer')) {
              trailerKey = videos[0].key;
            } else {
              trailerKey = videos.filter(({ type }) => type === 'Trailer').map(({ key }) => key)[0];
            }
          }

          let consensus;

          if (rtCriticsRating && rtCriticsRating.tomatometerAllCritics && rtCriticsRating.tomatometerAllCritics.consensus) {
            consensus = rtCriticsRating.tomatometerAllCritics.consensus.replace(/<em>/g, '').replace(/<\/em>/g, '');
          }

          return {
            id: id.toString(),
            imdbId: imdb_id.substring(2),
            rtId: rtSearchResult ? rtSearchResult.url.substring(rtSearchResult.url.lastIndexOf('/') + 1) : undefined,
            name: title,
            genres: tmdb.genres.map(({ name }) => name).map(name => name === 'Science Fiction' ? 'Sci-Fi' : name),
            summary: (tmdb.overview || imdb.description).replace(/&amp;/g, '&'),
            poster: tmdb.poster_path,
            trailerKey: trailerKey,
            date: release_date,
            discDate: discDate,
            duration: duration,
            scores: scores,
            critics: rtTopCriticsReviews || [],
            consensus: consensus
          };
        })());
      }

      items = items.concat((await Promise.all(promises)).filter(item => item));
    }
  }

  // TV

  for (let y = moment().year(); y >= minYear; y--) {
    console.log(`\ntv ${y}`);

    const pageCount = (await fetchItems(1, y, 'tv')).total_pages;

    for (let i = 1; i <= pageCount; i++) {
      console.log(`${leftPad(i, 3)} / ${leftPad(pageCount, 3)}`);

      const page = (await fetchItems(i, y, 'tv'));
      const promises = [];

      await pause();

      for (let j = 0; j < page.results.length; j++) {
        promises.push((async function() {
          const { id, name, original_language } = page.results[j];

          if (original_language !== 'en') {
            return;
          }

          const tmdb = await fetchItem(id, 'tv');
          const { imdb_id } = await fetchExternalIds(id, 'tv');
          const videos = (await fetchItemVideos(id, 'tv')).results;
          const { first_air_date, last_air_date, seasons } = tmdb;

          if (!seasons) {
            return;
          }

          // IMDB
          if (!imdb_id) {
            return;
          }

          let imdb;
          const imdbPage = await fetchImdbPage(imdb_id);
          const imdbGroups = imdbPage.match(/<script type="application\/ld\+json">(.+?)<\/script>/s);

          if (imdbGroups && imdbGroups.length > 1) {
            imdb = JSON.parse(imdbGroups[1]);
          }

          if (!imdb) {
            return;
          }

          // RT
          let rtSearchResults = await searchRt(name);
          let rtSearchResult;

          if (rtSearchResults.tvSeries) {
            rtSearchResults = rtSearchResults.tvSeries.filter(({ url }) => url !== '/tv/null');
          } else {
            console.log(name, rtSearchResults);
            rtSearchResults = [];
          }

          if (rtSearchResults.length === 1) {
            rtSearchResult = rtSearchResults[0];
          } else {
            const startYearResults = rtSearchResults.filter(({ startYear }) => startYear === moment(first_air_date).year());
            const endYearResults = rtSearchResults.filter(({ endYear }) => endYear === moment(last_air_date).year());
            const nameResults = rtSearchResults.filter(({ title }) => areSameNames(title, name));
            const startYearNameResults = rtSearchResults
              .filter(({ startYear }) => startYear === moment(first_air_date).year())
              .filter(({ title }) => areSameNames(title, name));

            if (startYearResults.length === 1) {
              rtSearchResult = startYearResults[0];
            } else if (endYearResults.length === 1) {
              rtSearchResult = endYearResults[0];
            } else if (nameResults.length === 1) {
              rtSearchResult = nameResults[0];
            } else if ([ 1, 2 ].includes(startYearNameResults.length)) {
              rtSearchResult = startYearNameResults[0];
            } else {
              rtSearchResults = rtSearchResults.filter(({ startYear }) => !startYear || [ startYear - 2, startYear - 1, startYear, startYear + 1, startYear + 2 ].includes(moment(first_air_date).year()));

              if (startYearResults.length === 1) {
                rtSearchResult = rtSearchResults[0];
              } else {
                rtSearchResults = rtSearchResults.filter(({ endYear }) => !endYear || [ endYear - 2, endYear - 1, endYear, endYear + 1, endYear + 2 ].includes(moment(last_air_date).year()));

                if (rtSearchResults.length === 1) {
                  rtSearchResult = rtSearchResults[0];
                } else {
                  rtSearchResults = rtSearchResults.filter(({ title }) => areSameNames(title, name));

                  if (rtSearchResults.length === 1) {
                    rtSearchResult = rtSearchResults[0];
                  }
                }
              }
            }
          }

          const seasonItems = [];

          for (let s = 0; s < seasons.length; s++) {
            let rt;
            let rtTopCriticsReviews;
            const season = seasons[s];
            const seasonVideos = (await fetchSeasonVideos(id, season.season_number)).results;

            if (season.season_number <= 0) {
              continue;
            }

            if (rtSearchResult) {
              const seasonUrl = `${rtSearchResult.url.replace('/s01', '')}/s${zeroFill(2, season.season_number)}`;
              const rtPage = await fetchRtPage(seasonUrl);
              const rtGroups = rtPage.match(/root.RottenTomatoes.context.result = (.+?});/s);

              if (rtGroups && rtGroups.length > 1) {
                rt = JSON.parse(rtGroups[1]);
              }

              const rtTopCriticsReviewsPage = await fetchRtPage(`${seasonUrl}/reviews/?type=top_critics`);
              const rtTopCriticsReviewsHtml = htmlParser.parse(rtTopCriticsReviewsPage.substring(
                rtTopCriticsReviewsPage.indexOf('<section id="content"'),
                rtTopCriticsReviewsPage.indexOf('</section>', rtTopCriticsReviewsPage.indexOf('<section id="content"')) + '</section>'.length + 1));
              const rtTopCriticsAllReviews = rtTopCriticsReviewsHtml.querySelectorAll('.review_table_row').map(row => ({
                text: row.querySelector('.the_review').text,
                positive: !row.querySelector('.rotten')
              }));

              rtTopCriticsReviews = _(rtTopCriticsAllReviews.filter(({ positive }) => positive))
                .take(2)
                .concat(_(rtTopCriticsAllReviews.filter(({ positive }) => !positive)).take(2).value())
                .value();
            }

            // scores
            const scores = {
              /*tmdb: tmdb.vote_average > 0 ? {
                votes: tmdb.vote_count,
                value: tmdb.vote_average
              } : undefined,*/

              imdb: imdb.aggregateRating && parseFloat(imdb.aggregateRating.ratingValue) > 0 ? {
                votes: imdb.aggregateRating.ratingCount,
                value: parseFloat(imdb.aggregateRating.ratingValue)
              } : undefined,

              rtAudience: rt && rt.seasonData && rt.seasonData.tvRatingSummary ? {
                votes: rt.seasonData.tvRatingSummary.numReviews,
                value: rt.seasonData.tvRatingSummary.averageRating
              } : undefined,

              rtAllCritics: rt && rt.seasonData && rt.seasonData.tomatometer ? {
                votes: rt.seasonData.tomatometer.numReviews,
                value: rt.seasonData.tomatometer.averageScore
              } : undefined,

              rtTopCritics: rt && rt.seasonData && rt.seasonData.topTomatometer && rt.seasonData.topTomatometer.numReviews && rt.seasonData.topTomatometer.averageScore !== null ? {
                votes: rt.seasonData.topTomatometer.numReviews,
                value: parseFloat(rt.seasonData.topTomatometer.averageScore)
              } : undefined
            };

            if (!scores.imdb || scores.imdb.votes < 500
              ||
              scores.rtAudience && scores.rtAudience.votes < 100
              ||
              scores.rtAllCritics && scores.rtAllCritics.votes < 10
              ||
              scores.rtTopCritics && scores.rtTopCritics.votes < 2) {
              continue;
            }

            let splitGenres = [];

            tmdb.genres.forEach(({ name }) => {
              splitGenres = splitGenres.concat(name.split(' & '));
            });

            let consensus;

            if (rt && rt.seasonData && rt.seasonData.tomatometer && rt.seasonData.tomatometer.consensus) {
              consensus = rt.seasonData.tomatometer.consensus.replace(/<em>/g, '').replace(/<\/em>/g, '');
            }

            let trailerKey;

            if (seasonVideos && seasonVideos.length > 0) {
              if (seasonVideos.every(({ type }) => type !== 'Trailer')) {
                trailerKey = seasonVideos[0].key;
              } else {
                trailerKey = seasonVideos.filter(({ type }) => type === 'Trailer').map(({ key }) => key)[0];
              }
            }

            if (!trailerKey && videos && videos.length > 0) {
               if (videos.every(({ type }) => type !== 'Trailer')) {
                trailerKey = videos[0].key;
              } else {
                trailerKey = videos.filter(({ type }) => type === 'Trailer').map(({ key }) => key)[0];
              }
            }

            seasonItems.push({
              id: `${id}_${season.season_number}`,
              imdbId: imdb_id.substring(2),
              rtId: rtSearchResult ? rtSearchResult.url.replace('/tv/', '').replace('/s01', '') : undefined,
              name: name,
              genres: splitGenres.map(name => name === 'Science Fiction' ? 'Sci-Fi' : name),
              summary: (season.overview || tmdb.overview || imdb.description).replace(/&amp;/g, '&'),
              poster: season.poster_path || tmdb.poster_path,
              trailerKey: trailerKey,
              date: season.air_date,
              season: season.season_number,
              episodes: season.episode_count,
              scores: scores,
              critics: rtTopCriticsReviews || [],
              consensus: consensus
            });
          }

          return seasonItems;
        })());
      }

      (await Promise.all(promises)).filter(seasonItems => seasonItems).forEach(seasonItems => {
        items = items.concat(seasonItems);
      });
    }
  }

  items = _(items).uniqBy('id').value();

  if (!fs.existsSync('db')){
    fs.mkdirSync('db');
  }

  fs.writeFileSync('db/_headers', '/*\n  Access-Control-Allow-Origin: *');

  for (let y = moment().year(); y >= minYear; y--) {
    const yearItems = [];

    items.forEach(item => {
      if (moment(item.date).year() === y) {
        yearItems.push(item);
      }
    });

    fs.writeFileSync(`db/${y}.json`, JSON.stringify(yearItems));
  }
})();
