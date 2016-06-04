var fs = require('fs')
var request = require('request')
var sync_request = require('sync-request')
var _ = require('underscore')
var persistant = require('./data.json')
var express = require('express');
var app = express()
var players = require('./accounts.json').data
app.set('view engine', 'pug');

var useLocal = true

if (!useLocal) {
  var players = JSON.parse(sync_request('GET', 'https://clwo.eu/jailbreak/api/v1/accounts.php').getBody()).data
}

var positions = ["root", "Senators", "Senior Admin", "admin", "Senior Moderator", "moderator", "Guardian", "Trial Moderator", "informer"]
var groupLayout = {}

for (i in positions) {
  groupLayout[positions[i]] = {}
}


function title(str) {
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

Array.prototype.unique = function() {
    var a = this.concat();
    for(var i=0; i<a.length; ++i) {
        for(var j=i+1; j<a.length; ++j) {
            if(a[i] === a[j])
                a.splice(j--, 1);
        }
    }

    return a;
}

function formatDate(input) {
  var datePart = input.match(/\d+/g),
  year = datePart[0].substring(2), // get only two digits
  month = datePart[1], day = datePart[2];
  return year+'-'+month+'-'+day;
}

function resolveName(name) {
  for (i in players) {
    if (players[i].SteamID2 == name) {
      return [players[i].AccountID, name, players[i].SteamID3, players[i].SteamID64]
    }
  }
  return [null, null, null, null]
}

function update(callback) {
  simpleGroups = {}
  request('https://clwo.eu/jailbreak/api/v1/admins.php', function (error, response, body) {
    var data = JSON.parse(body)
    for (i in groupLayout) {
      groupLayout[i] = {}
    }
    for (i=0; i<data.data.length; i++) {
      simpleGroups[data.data[i]["user"]] = data.data[i]['srv_group']
      if (positions.indexOf(data.data[i]['srv_group']) > -1) {
        // groupLayout[data.data[i]['srv_group']][data.data[i]["user"]] = resolveName(data.data[i]["authid"])
        groupLayout[data.data[i]['srv_group']][data.data[i]["user"]] = data.data[i]["authid"]
      }
    }
    callback(simpleGroups)
  })
}

update(function(simpleGroups) {
  var oldSimpleGroups = simpleGroups
  setInterval(function(){ 
    update(function(simpleGroups) {
      try {
        var differences = _.omit(simpleGroups, function(v,k) { return oldSimpleGroups[k] === v; })
        var previous = []
        for (key in differences) {
          if (positions.indexOf(oldSimpleGroups[key]) < positions.indexOf(simpleGroups[key]) && positions.indexOf(simpleGroups[key]) != -1) {
            var msg = key + " was demoted from " + title(oldSimpleGroups[key]) + " to " + title(simpleGroups[key])
          } else {
            var msg = key + " was promoted from " + title(oldSimpleGroups[key]) + " to " + title(simpleGroups[key])
          }
          console.log(msg)
          previous.push(msg)
        }
        var date = formatDate(new Date().toJSON().slice(0,10))
        if (_.has(persistant, date)) {
          persistant[date] = persistant[date].concat(previous)
        } else {
          persistant[date] = previous
        }
        persistant[date] = persistant[date].unique()
        fs.writeFile("data.json", JSON.stringify(persistant))
        console.log(persistant)
        oldSimpleGroups = simpleGroups
      } catch(e) {
        var x = "x";
      }
    })
  }, 5000)
})

app.get('/', function (req, res) {
  console.log(groupLayout)
  res.render('index', { 
    groups: groupLayout,
    changes: persistant,
    toTitleCase: function(str) {
      return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    }
  });
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});