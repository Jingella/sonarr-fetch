#!/usr/bin/env node

// Simple script to scan for a specific tv series, and queue missing episodes.

const Sonarr = require('sonarr-api');
const util = require('util');
const fs = require('fs');
const commander = require('commander');

const api_key = 'f5f92e029deb4af48fb1d48fbe020e8c';

var series_name = /bob.s burgers/i;

(function(){
  "use strict";
  var sonarr = new Sonarr({
    hostname: 'localhost',
    apiKey: api_key,
    port: 8081,
    urlBase: '/sonarr'
  });

  var seriesid;
  var queue;
  var episode_list;
  var max_queued;

  var readFile = util.promisify(fs.readFile);
  var writeFile = util.promisify(fs.writeFile);

  commander
    .version('0.1.0')
    .option('-m, --max [max]','Maximum number of episodes to queue',2)
    .parse(process.argv);

  if( commander.args.length ) {
    series_name = new RegExp(commander.args.pop(), "i");
  }

  max_queued = commander.max;

  readFile('episodes.json')
    .then(data=>{
      episode_list = JSON.parse(data);
    }).catch(err => {
      if( err.code != 'ENOENT' ) {
        console.log('err = ' + err.message);
      }
      episode_list = [];
    }).then(() => {
      return sonarr.get("series");
    }).then(function (series) {
      var wanted = series.find(item => item.title.match(series_name));
      if( wanted ) {
        //console.log('series = ' + JSON.stringify(wanted,0,4));
        seriesid = wanted.id;
        return sonarr.get("queue");
      } else
        throw new Error("Series not found: " + series_name);
    }).then(function(queued) {
      if( queued ) {
        queue = queued.filter(item => item.series.id === seriesid);
      }
      if( queue.length > max_queued ) {
        //console.log('queue = ' + JSON.stringify(queue,0,4));
        throw new Error('Items already queued for ' + series_name);
      }
      if( seriesid ) {
        return sonarr.get("episode", { seriesId: seriesid });
      }
    }).then(function (episodes) {
      var wanted;
      if( episodes ) {
        //console.log('episodes = '+JSON.stringify(episode_list));
        var today = new Date();
        wanted = episodes.filter(
          item => item.seasonNumber > 0 &&
          ! item.hasFile &&
          item.monitored &&
          ! queue.find(q=>q.episode.id === item.id) &&
          ! episode_list.find(e=>e === item.id) &&
          new Date(item.airDateUtc) < today
        ).shift();
        //console.log('episodes --' + JSON.stringify(wanted,0,4));
      }
      if( wanted ) {
        //console.log('wanted = '+JSON.stringify(wanted,0,4));
        return sonarr.post("command", {
          name: "EpisodeSearch",
          episodeIds : [
            wanted.id
          ]
        });
      }
    }).then(function (result) {
      //console.log('result -- ' + JSON.stringify(result,0,4));
      if ( result && result.status == 'queued' ) {
        episode_list = episode_list.concat(result.body.episodeIds);
        return writeFile('episodes.json', JSON.stringify(episode_list));
      }
    }).catch(err => {
      console.log("There was a error processing the request: " + err);
      //console.log(err.stack);
    });
})();
