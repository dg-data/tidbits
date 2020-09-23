---
title: "Displaying NBA boxscores with Vue.js"
date: 2020-06-02
published: true
tags: [vue.js, api]
toc: false
toc_sticky: true
classes: wide
---
This example shows how to fetch data from an API endpoint in Vue.js apps by using axios http library and display results. The API returns details about the NBA game selected which is presented in traditional box format. The app itself a single file component with
- HTML template
- JavaScript logic
- and CSS styling.

When webpack, which is a static module bundler for modern SPAs processes the app, it builds modules in one or more bundles with a single command to run the entire application. Below is the code in Vue.js.

### CSS styling
```vue
<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 15px;
}
td.right {
  text-align: right !important;
}
</style>
```
### JavaScript logic
The code uses Vue computed properties to output the teams' names, and the stats of the players who played, with the totals for both teams.
The first API endpoint used returns daily NBA games to choose from. In the app we can also select from all of the seasons' games with a four digit identification number. After that we need another API request to get the statistical details of the game chosen.
```js
const axios = require('axios')

export default {
  el: '#app',
  computed: {
    // team names

    home () {
      return this.results.g.hls.ta
    },
    visitor () {
      return this.results.g.vls.ta
    },
    // player stats if played

    hPlayers () {
      var self = this
      return typeof (this.results.g.hls.pstsg) !== 'undefined' ? self.results.g.hls.pstsg.filter(
        function (player) {
          return player.min !== 0
        }
      ) : null
    },
    vPlayers () {
      var self = this
      return typeof (this.results.g.vls.pstsg) !== 'undefined' ? self.results.g.vls.pstsg.filter(
        function (player) {
          return player.min !== 0
        }
      ) : null
    },
    // team totals

    hTotals () {
      return this.results.g.hls.tstsg
    },
    vTotals () {
      return this.results.g.vls.tstsg
    }
  },

  data: function () {
    return {
      results: null,
      season: 0, // year without century
      game: '0820', // four digit number padded with zeros
      success: true,
      columns: ['PLAYER', 'MIN', 'FGM', 'FGA', 'TPM', 'TPA', 'FTM', 'FTA',
        'REB', 'AST', 'STL', 'BLK', 'TOV', 'PTS'],
      aligned: [0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0], // 1 for aligned columns
      games: null,
      gameID: null // when selected from dropdown list
    }
  },

  mounted: function () {
    // get yesterday's games
    var url =
      'https://cors-anywhere.herokuapp.com/http://data.nba.net/v2015/json/mobile_teams/nba/' +
      new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().slice(0, 4) + '/scores/00_todays_scores.json'
    axios.get(url, { crossdomain: true })
      .then(response => {
        var g = []
        for (var game of response.data.gs.g) {
          g.push(JSON.parse('{"id":"' + game.gid + '","home":{"nickname":"' + game.h.tn + '"},"visitor":{"nickname":"' + game.v.tn + '"}}'))
        }
        response.data.sports_content = Object.assign({}, {
          games: {
            game: g
          }
        })
        this.games = typeof (response.data.sports_content.games.game) !== 'undefined'
          ? response.data.sports_content.games.game : []
      })
      .catch(error => {
        console.log(error)
      })
  },

  methods: {
    getGamedetail () {
      var day = new Date()
      // calculate start of the season
      var yy = parseInt(day.getFullYear()) - parseInt(day.getMonth() > 9 ? 0 : 1) - parseInt(this.season) - 2000
      var gameID = this.gameID > '' ? this.gameID : '004' + yy + '0' + this.game
      var url = 'https://cors-anywhere.herokuapp.com/http://data.nba.net/v2015/json/mobile_teams/nba/20' +
        yy + '/scores/gamedetail/' + gameID + '_gamedetail.json'
      axios.get(url, { crossdomain: true })
        .then(response => {
          this.results = response.data
          this.success = typeof (this.results.g.hls.pstsg) !== 'undefined'
        })
        .catch(error => {
          console.log(error)
          this.success = false
        })
    },

    // stat line from player (or total) object
    stats (player, teamtotal) {
      return player != null ? [
        player.ln != null ? player.fn + ' ' + player.ln : teamtotal,
        player.ln != null ? player.min + ':' + ('00' + player.sec).slice(-2) : 'TOTALS',
        player.fgm, player.fga, player.tpm, player.tpa, player.ftm, player.fta,
        String(player.reb).concat(player.oreb > 0 ? ' (' + player.oreb + ')' : ''),
        player.ast, player.stl, player.blk, player.tov, player.fgm * 2 + player.tpm + player.ftm] : []
    },

    filter (arr) {
      return arr.slice(1)
    }
  }
}
```
### HTML template
```vue
<template>
  <div id="app">
    <div class='ui centered card'>

      <div class='ui form'>
        <!-- selecting season and game -->
        <div class='field'>
          <label>Season</label>
          <select v-model="season">
            <option value="" disabled hidden>Select season</option>
            <option value="0"> Actual</option>
            <option value="1"> Previous</option>
          </select>
        </div>
        <div class='field'>
          <label>Game</label>
          <input type='text' v-model="game">
        </div>
        <div class='field'>
          <select v-model="gameID">
            <option value="null" disabled>Choose from recent games</option>
            <option v-for="game in games" :value="game.id" v-bind:key="game.id">
              {{game.home.nickname}} - {{game.visitor.nickname}}
            </option>
          </select>
        </div>
        <div class='ui two button attached buttons'>
          <button class='ui basic blue button' v-on:click="getGamedetail()">
            Get boxscore
          </button>
        </div>
      </div>

    </div>
    <div v-if="! success" class="ui bottom attached compact info message">
      <i class="icon warning red"></i>Error getting game details
    </div>

    <div v-if="results != null">
      <!-- showing the boxscore -->
      <p class="ui secondary inverted segment huge">{{ home }} - {{ visitor }}</p>

      <table class="ui compact table segment">
        <thead>
          <tr>
            <th v-bind:class="{ 'three wide': index == 0 }"
              v-for="(header, index) in columns" v-bind:key="index">
                {{ header }}
            </th>
          </tr>
        </thead>
        <!-- home players' stats -->
        <tr class="warning" v-for="player in hPlayers" v-bind:key="player.pid">
          <td v-bind:class="[aligned[index] == 1 ? 'right': '']"
            v-for="(data, index) in stats(player, home)" v-bind:key="index">
              {{ data }}
          </td>
        </tr>
        <tr class="active">
          <!-- home totals -->
          <td v-bind:class="[aligned[index] == 1 ? 'right' : '']"
            v-for="(data, index) in stats(hTotals, home)" v-bind:key="index">
              <b v-if="index == stats(hTotals, home).length - 1 || index == 0"> {{ data }} </b>
              <template v-else>
                {{ data }}
              </template>
          </td>
        </tr>
        <!-- visitor -->
        <tr class="warning" v-for="player in vPlayers" v-bind:key="player.pid">
          <td v-bind:class="[aligned[index] == 1 ? 'right': '']"
            v-for="(data, index) in stats(player, null)" v-bind:key="index">
            {{ data }}
          </td>
        </tr>
        <tr class="active">
          <td v-bind:class="[aligned[index] == 1 ? 'right': '']"
            v-for="(data, index) in stats(vTotals, visitor)" v-bind:key="index">
              <b v-if="index == stats(vTotals, visitor).length - 1 || index == 0"> {{ data }} </b>
              <template v-else>
                {{ data }}
              </template>
          </td>
        </tr>
      </table>

    </div>
  </div>
</template>
```
The application is ready to access at [Heroku](http://box-scores.herokuapp.com).
