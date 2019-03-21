#!/usr/bin/env node

const request = require('superagent');
const fs = require('fs');
const moment = require('moment');
const leftPad = require('left-pad');

const minYear = 1900;
const tmdbKey = '9389b4f79115a7b779250d79c568c87c';

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

async function fetchItemVideos(id, type) {
  return fetchTmdb(`https://api.themoviedb.org/3/${type}/${id}/videos`, {
    api_key: tmdbKey
  });
}

async function searchImdb(title) {
  const encodedTitle = title.toLowerCase().replace(/ /g, '_').replace(/[^\w]+/g, '');
  let result;

  for (let i = 0; i < 10; i++) {
    result = await new Promise((resolve, reject) => {
      request
        .get(`https://v2.sg.media-imdb.com/suggests/${encodedTitle.charAt(0)}/${encodedTitle}.json`)
        .query({
          callback: `imdb$${encodedTitle}`,
          _: new Date().getTime()
        })
        .end((err, res) => {
          resolve(res ? res.body.toString('utf8') : '');
        });
    });

    if (result) {
      break;
    }
  }

  return result;
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

      await new Promise((resolve, reject) => setTimeout(resolve, 3000));

      for (let j = 0; j < page.results.length; j++) {
        promises.push((async function() {
          const { id, title, release_date, original_language } = page.results[j];

          if (original_language !== 'en') {
            return;
          }

          const tmdb = await fetchItem(id, 'movie');
          const videos = (await fetchItemVideos(id, 'movie')).results;
          const imdb_id = tmdb.imdb_id;

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
          let discDate;
          const rtSearchResults = (await searchRt(title))
            .movies
            .filter(({ name }) => name === title)
            .filter(({ year }) => year && (moment(release_date).year() === year || moment(release_date).year() === year - 1 || moment(release_date).year() === year + 1))
            .filter(({ url }) => url !== '/m/null')
            .filter(({ url }) => url.startsWith('/m/'));
          let rtSearchResult;

          if (rtSearchResults.length === 1) {
            rtSearchResult = rtSearchResults[0];
          } else if (rtSearchResults.length > 1) {
            rtSearchResult = rtSearchResults.find(({ castItems }) => castItems.every(({ name }) => imdbPage.includes(name)));
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

            const rtAudienceVotesGroups = rtPage
              .substring(rtPage.indexOf('Audience Score'), rtPage.indexOf('</section>', rtPage.indexOf('Audience Score')))
              .match(/<small.*?>(.+?)<\/small>/s);

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

            const rtCriticsRatingGroups = rtPage.match(/root.RottenTomatoes.context.scoreInfo = (.+?});/s);

            if (rtCriticsRatingGroups && rtCriticsRatingGroups.length > 1) {
              rtCriticsRating = JSON.parse(rtCriticsRatingGroups[1]);
            }
          }

          if (!rtAudienceVotes || !rtAudienceValue || !rtCriticsRating) {
            return;
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

            rtAudience: {
              votes: parseInt(rtAudienceVotes),
              value: parseFloat(rtAudienceValue)
            },

            rtAllCritics: {
              votes: rtCriticsRating.tomatometerAllCritics.numberOfReviews,
              value: rtCriticsRating.tomatometerAllCritics.avgScore
            },

            rtTopCritics: {
              votes: rtCriticsRating.tomatometerTopCritics.numberOfReviews,
              value: rtCriticsRating.tomatometerTopCritics.avgScore
            }
          };

          if (!scores.imdb || !scores.rtAudience || !scores.rtAllCritics || !scores.rtTopCritics
            ||
            scores.imdb.votes < 500 || scores.rtAudience.votes < 100 || scores.rtAllCritics.votes < 10 || scores.rtTopCritics.votes < 2) {
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

          return {
            id: id,
            imdbId: imdb_id.substring(2),
            rtId: rtSearchResult.url.substring(rtSearchResult.url.lastIndexOf('/') + 1),
            name: title,
            genres: tmdb.genres.map(({ name }) => name).map(name => name === 'Science Fiction' ? 'Sci-Fi' : name),
            summary: tmdb.overview || imdb.description,
            //consensus: (rtCriticsRating.tomatometerAllCritics.consensus || '').replace(/<em>/g, '').replace(/<\/em>/g, ''),
            poster: tmdb.poster_path,
            trailerKey: videos.length > 0 ? videos[videos.length - 1].key : undefined,
            date: release_date,
            disc: discDate && moment().isAfter(discDate),
            duration: duration,
            scores: scores
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

      await new Promise((resolve, reject) => setTimeout(resolve, 3000));

      for (let j = 0; j < page.results.length; j++) {
        promises.push((async function() {
          const { id, name, original_language } = page.results[j];

          if (original_language !== 'en') {
            return;
          }

          const tmdb = await fetchItem(id, 'tv');
          const videos = (await fetchItemVideos(id, 'tv')).results;
          const { first_air_date, last_air_date } = tmdb;

          // IMDB
          let imdb_id, imdb;
          const imdbSearchResultsJsonp = await searchImdb(name);
          const imdbSearchResults = JSON.parse(imdbSearchResultsJsonp.substring(imdbSearchResultsJsonp.indexOf('(') + 1, imdbSearchResultsJsonp.lastIndexOf(')')));

          if (imdbSearchResults.d) {
            const filteredImdbSearchResults = imdbSearchResults.d
              .filter(({ q }) => q && q.startsWith('TV'))
              .filter(({ l }) => l === name)
              .filter(({ y }) => y === moment(first_air_date).year() || y === moment(first_air_date).year() - 1 || y === moment(first_air_date).year() + 1);

            if (filteredImdbSearchResults.length === 1) {
              imdb_id = filteredImdbSearchResults[0].id;
            }
          }

          if (!imdb_id) {
            return;
          }

          const imdbPage = await fetchImdbPage(imdb_id);
          const imdbGroups = imdbPage.match(/<script type="application\/ld\+json">(.+?)<\/script>/s);

          if (imdbGroups && imdbGroups.length > 1) {
            imdb = JSON.parse(imdbGroups[1]);
          }

          if (!imdb) {
            return;
          }

          // RT
          const rtSearchResults = (await searchRt(name))
            .tvSeries
            .filter(({ title }) => title === name)
            .filter(({ startYear }) => startYear && (moment(first_air_date).year() === startYear || moment(first_air_date).year() === startYear - 1 || moment(first_air_date).year() === startYear + 1))
            .filter(({ endYear }) => !endYear || (moment(last_air_date).year() === endYear || moment(last_air_date).year() === endYear - 1 || moment(last_air_date).year() === endYear + 1))
            .filter(({ url }) => url !== '/tv/null')
            .filter(({ url }) => url.startsWith('/tv/'));
          let rtSearchResult;

          if (rtSearchResults.length === 1) {
            rtSearchResult = rtSearchResults[0];
          }

          if (rtSearchResult) {
            const seasonItems = [];

            for (let s = 0; s < tmdb.seasons.length; s++) {
              const season = tmdb.seasons[s];
              const rtPage = await fetchRtPage(rtSearchResult.url.replace('/s01', `/s${season.season_number}`));
              const rtGroups = rtPage.match(/root.RottenTomatoes.context.result = (.+?});/s);
              let rt;

              if (rtGroups && rtGroups.length > 1) {
                rt = JSON.parse(rtGroups[1]);
              }

              if (!rt) {
                continue;
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

                rtAudience: rt.seasonData.tvRatingSummary ? {
                  votes: rt.seasonData.tvRatingSummary.numReviews,
                  value: rt.seasonData.tvRatingSummary.averageRating
                } : undefined,

                rtAllCritics: {
                  votes: rt.seasonData.tomatometer.numReviews,
                  value: rt.seasonData.tomatometer.averageScore
                },

                rtTopCritics: {
                  votes: rt.seasonData.topTomatometer.numReviews,
                  value: parseFloat(rt.seasonData.topTomatometer.averageScore)
                }
              };

              if (!scores.imdb || !scores.rtAudience || !scores.rtAllCritics || !scores.rtTopCritics
                ||
                scores.imdb.votes < 500 || scores.rtAudience.votes < 100 || scores.rtAllCritics.votes < 10 || scores.rtTopCritics.votes < 2) {
                return;
              }

              let splitGenres = [];

              tmdb.genres.forEach(({ name }) => {
                splitGenres = splitGenres.concat(name.split(' & '));
              });

              seasonItems.push({
                id: id,
                imdbId: imdb_id.substring(2),
                rtId: rtSearchResult.url.replace('/tv/', '').replace('/s01', ''),
                name: name,
                genres: splitGenres,
                summary: season.overview || tmdb.overview || imdb.description,
                //consensus: (rt.seasonData.tomatometer.consensus || '').replace(/<em>/g, '').replace(/<\/em>/g, ''),
                poster: season.poster_path || tmdb.poster_path,
                trailerKey: videos.length > 0 ? videos[videos.length - 1].key : undefined,
                date: season.air_date,
                season: season.season_number,
                episodes: season.episode_count,
                scores: scores
              });
            }

            return seasonItems;
          }
        })());
      }

      (await Promise.all(promises)).filter(seasonItems => seasonItems).forEach(seasonItems => {
        items = items.concat(seasonItems);
      });
    }
  }

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
