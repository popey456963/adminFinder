var fs = require('fs')
var request = require('request')
var _ = require('underscore')
var atob = require('atob')
var express = require('express')
var persistant = require('./data.json')
var staffInformation = require('./staff.json')

var app = express()

app.set('view engine', 'pug')
app.use(express.static('static'))

var positions = ["Senators", "Senior Admin", "admin", "Senior Moderator", "moderator", "Guardian", "Trial Moderator", "informer"]
var groupLayout = {}
var useLocal = true

for (i in positions) {
  groupLayout[positions[i]] = {}
}

function title(str) {
  return str.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  })
}

Array.prototype.unique = function() {
  var a = this.concat()
  for (var i = 0; i < a.length; ++i) {
    for (var j = i + 1; j < a.length; ++j) {
      if (a[i] === a[j])
        a.splice(j--, 1)
    }
  }
  return a
}

String.prototype.replaceAt = function(index, character) {
    return this.substr(0, index) + character + this.substr(index+character.length);
}

function formatDate(input) {
  var datePart = input.match(/\d+/g),
    year = datePart[0].substring(2), // get only two digits
    month = datePart[1],
    day = datePart[2]
  return year + '-' + month + '-' + day
}

function formatRank(rank) {
  var colours = {
    "Senators": "#6633ff",
    "Senior Admin": "#cc3333",
    "Admin": "#ff3333",
    "Senior Moderator": "#3333ff",
    "Moderator": "#3366ff",
    "Guardian": "#ff33ff",
    "Trial Moderator": "#3399ff",
    "Informer": "#33cc33"
  }
  return "<span style='color: " + colours[rank] + "'>" + rank + "</span>"
}

function resolveName(auth) {
  if (_.has(staffInformation, auth)) {
    return staffInformation[auth]
  } else {
    console.log("Adding passive check to: " + auth)
    passiveAddName(auth)
  }
}

function passiveAddName(auth) {
  console.log(auth)
  attempts = [auth, auth.replaceAt(6, "1"), auth.replaceAt(6, "1").replaceAt(8, "0"), 
              auth.replaceAt(6, "0"), auth.replaceAt(6, "0").replaceAt(8, "1"),
              auth.replaceAt(8, "0"), auth.replaceAt(8, "1")]
  for (attemptNo=0; attemptNo<attempts.length; attemptNo++) {
    request('https://clwo.eu/jailbreak/api/v1/accounts.php?key=*&value=' + attempts[attemptNo], function (error, response, body) {
      try {
        if (!error && response.statusCode == 200) {
          if (body.substring(0, 25).indexOf("<!DOCTYPE html>") == -1) {
            var json = JSON.parse(body).data
            if (String(JSON.stringify(json)) != "[]") {
              if (!_.has(staffInformation, auth)) {
                staffInformation[auth] = json[Object.keys(json)[0]]
                passiveAddPicture(auth, json[Object.keys(json)[0]]["SteamID64"])
                fs.writeFile("staff.json", JSON.stringify(staffInformation, null, 4))
                console.log("Added passive name: " + JSON.stringify(json))
              }
            }
          }
        }
      } catch(e) {
        console.log(e)
      }
    })
  }
}

function passiveAddPicture(auth, steamID) {
  console.log("Added passive picture: " + steamID)
  var key = atob("MjEyNzlCNzdFNjFCOTI3MEQ1MDVEODEyNDYzRDFDOTA=")
  var base = "http://api.steampowered.com"
  request(base + "/ISteamUser/GetPlayerSummaries/v0002/?key=" + key + "&steamids=" + steamID, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var profilePicture = JSON.parse(body)["response"]["players"][0]["avatarfull"]
      staffInformation[auth]["Picture"] = profilePicture
      fs.writeFile("staff.json", JSON.stringify(staffInformation, null, 4))
    }
  })
}

function resolveSteamID(auth) {
  var name, picture;
  if (_.has(staffInformation, auth[0])) {
    if (_.has(staffInformation[auth[0]], "Name")) {
      name = staffInformation[auth[0]]["Name"]
    } else {
      name = staffInformation[auth[0]]["SteamID2"]
    }
    if (_.has(staffInformation[auth[0]], "Picture")) {
      picture = staffInformation[auth[0]]["Picture"]
    } else {
      picture = "nothing.png"
    }

    auth.push(name)
    auth.push(picture)

    return auth
  } else {
    console.log("Adding passive check to: " + auth)
    passiveAddName(auth[0])
    return auth
  }
}

function checkAllProfiles() {
  for(i in staffInformation) {
    passiveAddPicture(i, staffInformation[i]['SteamID64'])
  }
}

// checkAllProfiles()

function update(callback) {
  simpleGroups = {}
  request('http://fastdl.sinisterheavens.com/admins.php', function(error, response, body) {
    var data = JSON.parse(body)
    for (i in groupLayout) {
      groupLayout[i] = {}
    }
    for (i = 0; i < data.data.length; i++) {
      simpleGroups[data.data[i]["authid"]] = data.data[i]['srv_group']
      if (positions.indexOf(data.data[i]['srv_group']) > -1) {
        groupLayout[data.data[i]['srv_group']][data.data[i]["authid"]] = resolveName(data.data[i]["authid"])
      }
    }
    callback(simpleGroups)
  })
}

update(function(simpleGroups) {
  var oldSimpleGroups = simpleGroups
  setInterval(function() {
    update(function(simpleGroups) {
      var differences = _.omit(simpleGroups, function(v, k) {
        return oldSimpleGroups[k] === v
      })
      var previous = []
      for (key in differences) {
        if (positions.indexOf(oldSimpleGroups[key]) < positions.indexOf(simpleGroups[key]) && positions.indexOf(simpleGroups[key]) != -1) {
          var msg = resolveSteamID([key, "demoted", title(oldSimpleGroups[key]), title(simpleGroups[key])])
        } else {
          var msg = resolveSteamID([key, "promoted", title(oldSimpleGroups[key]), title(simpleGroups[key])])
        }
        // console.log(msg)
        previous.push(msg)
      }
      var date = formatDate(new Date().toJSON().slice(0, 10))
      if (_.has(persistant, date)) {
        persistant[date] = persistant[date].concat(previous)
      } else {
        persistant[date] = previous
      }
      persistant[date] = persistant[date].unique()
      fs.writeFile("data.json", JSON.stringify(persistant, null, 4))
        // console.log(persistant)
      oldSimpleGroups = simpleGroups
        /*resolveAllNames(groupLayout, function(data) {
          groupLayout = data
        })*/
    })
  }, 3000)
})

app.get('/', function(req, res) {
  console.log("Someone tried to call the page")
    // console.log(groupLayout)
  res.render('index', {
    groups: groupLayout,
    changes: persistant,
    formatRank: formatRank,
    toTitleCase: function(str) {
      return str.replace(/\w\S*/g, function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      })
    }
  })
})

app.listen(3000, function() {
  console.log('Example app listening on port 3000!')
})