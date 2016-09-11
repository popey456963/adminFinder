var request = require('request')
var fs = require('fs')
var express = require('express')
var SteamID = require('steamid')
var moment = require('moment')
var getIP = require('ipware')().get_ip;

var app = express()

app.set('view engine', 'pug')
app.use(express.static('static'))

var groups = ['informer', 'Trial Moderator', 'Guardian', 'moderator', 'Senior Moderator', 'admin', 'Senior Admin', 'Senators']
var groupNames = ['Informers', 'T. Mods', 'Guardians', 'Mods', 'S. Mods', 'Admins', 'S. Admins', 'Senators']
var groupNamess = ['Informer', 'T. Mod', 'Guardian', 'Mod', 'S. Mod', 'Admin', 'S. Admin', 'Senator']
var oldData = require('./admins.json')
var lockoutTime = 1111111115
var updates = {}
var profiles = []
var playtimes = []
var steam642 = []
var steam3 = []
var times = {}
var timeskeys = []
// profiles looks like [['steamid', 'url'], ['steamid', 'url']]

function toTitleCase(str) {
  return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()})
}

function numberEnding (number) {
    return (number > 1) ? 's' : '';
}

function toHuman(milliseconds) {
    // var current_time_milliseconds = new Date().getTime();
    var temp = Math.floor(milliseconds / 1000)
    var years = Math.floor(temp / 31536000)
    if (years) { return years + ' Year' + numberEnding(years) + ' Ago' }
    var months = Math.floor(temp / 2419200)
    if (months) { return months + ' Month' + numberEnding(months) + ' Ago' }
    var weeks = Math.floor(temp / 604800)
    if (weeks) { return weeks + ' Week' + numberEnding(weeks) + ' Ago' }
    var days = Math.floor(temp / 86400)
    if (days) { return days + ' Day' + numberEnding(days) + ' Ago' }
    var hours = Math.floor(temp / 3600)
    if (hours) { return hours + ' Hour' + numberEnding(hours) + ' Ago' }
    return 'Just Now'
}

function sortFunction(a, b) {
    if (a[0] === b[0]) {
        return 0;
    }
    else {
        return (a[0] < b[0]) ? -1 : 1;
    }
}

function colourRank(rank) {
  if (groups.indexOf(rank) > - 1) {
    rank = groupNamess[groups.indexOf(rank)]
  } else if (rank == "") {
    return "<span style='color: #000000'>Normal</span>"
  } else {
    // console.log(rank)
    return "<span style='color: #000000'>" + rank + "</span>"
  }
  var colours = {
    "Senator": "#6633ff",
    "S. Admin": "#cc3333",
    "Admin": "#ff3333",
    "S. Mod": "#3333ff",
    "Mod": "#3366ff",
    "Guardian": "#ff33ff",
    "T. Mod": "#3399ff",
    "Informer": "#33cc33"
  }
  return "<span style='color: " + colours[rank] + "'>" + rank + "</span>"
}

function formatPlayer(name) {
  return "<span>" + name + "</span>"
}

function ReverseObject(Obj){
    var TempArr = []
    var NewObj = {}
    for (var Key in Obj){
        TempArr.push(Key)
    }
    for (var i = TempArr.length-1; i >= 0; i--){
        NewObj[TempArr[i]] = Obj[TempArr[i]]
    }
    return NewObj
}

function getStaff(callback) {
  request('https://clwo.eu/jailbreak/api/v1/admins.php', function(error, response, body) {
    if (!error && response.statusCode == 200) { 
      var data = []
      try {
        data = JSON.parse(body)
      } catch(e) {
        console.log(e)
      }
      if (data == []) {
        callback(false)
      } else {
        callback(data)
      }
    }
  })
}

function parseStaff(data, callback) {
  var staff = {}
  for (var i = 0; i < data.length; i++) {
    var customName = null
    var profile = null
    var history = [[parseInt(new Date().getTime() / 1000), "", data[i].srv_group]]
    var playtime = 0
    var steam64 = null
    var steam3 = null
    if (oldData[data[i].authid]) {
      if (oldData[data[i].authid].customName) {
        customName = oldData[data[i].authid].customName
      }
      if (oldData[data[i].authid].steam64) {
        steam64 = oldData[data[i].authid].steam64
      } else {
        packupSteam(data[i].authid, function(newID) {
          passiveAddSteam64(data[i].authid, newID)
        })
      }
      if (oldData[data[i].authid].profile) {
        profile = oldData[data[i].authid].profile
      } else {
        if (oldData[data[i].authid].user != 'CONSOLE') {
          packupSteam(data[i].authid, function(newID) {
            passiveAddPicture(data[i].authid, newID)
          })
        }
      }
      if (oldData[data[i].authid].steam3) {
        steam3 = oldData[data[i].authid].steam3
      } else {
        packupSteam3(data[i].authid, function(newID) {
          passiveAddSteam3(data[i].authid, newID)
        })
      }
      /*
      if (oldData[data[i].authid].playtime) {
        playtime = oldData[data[i].authid].playtime
      } else {
        if (oldData[data[i].authid].user != 'CONSOLE') {
          console.log(data[i].authid)
          playtime = cachedAddPlaytime(data[i].authid)
          console.log(playtime)
        }
      }
      */
      if (oldData[data[i].authid].history) {
        history = oldData[data[i].authid].history
      }
    }
    staff[data[i].authid] = {
      user: data[i].user,
      group: data[i].srv_group,
      history: history,
      customName: customName,
      profile: profile,
      steam64: steam64,
      steam3: steam3
    }
  }
  callback(staff)
}

function packupSteam(steam, callback) {
  if (steam != "STEAM_ID_SERVER") {
    var sid = new SteamID(steam)
    callback(sid.getSteamID64())
  }
}

function packupSteam3(steam, callback) {
  if (steam != "STEAM_ID_SERVER") {
    var sid = new SteamID(steam)
    callback(sid.getSteam3RenderedID())
  }
}

function passiveAddSteam64(steamid, steam64) {
  steam642.push([steamid, steam64])
}

function passiveAddSteam3(steamid, steam64) {
  steam3.push([steamid, steam64])
}

function passiveAddPicture(auth, steamID) {
  // console.log('Added passive picture: ' + steamID)
  var key = '21279B77E61B9270D505D812463D1C90'
  var base = 'http://api.steampowered.com'
  var requestURL = base + '/ISteamUser/GetPlayerSummaries/v0002/?key=' + key + '&steamids=' + steamID
  request(requestURL, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      try {
        var profilePicture = JSON.parse(body).response.players[0].avatarfull
        profiles.push([auth, profilePicture])
      } catch(e) {
        console.log('Error Requesting Profile URL: ' + requestURL)
        throw e
      }
    }
  })
}

function passiveAddPlaytime(steamID) {
  console.log("Request Playtime for User: " + steamID.slice(10))
  var url = "https://clwo.eu/jailbreak/api/v1/playtime.php?parent=" + steamID.slice(10)
  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      try {
        var json = JSON.parse(body)
        if (json.data && json.data[steamID.slice(10)] && json.data[steamID.slice(10)].onteam) {
          var playTime = json.data[steamID.slice(10)].onteam
          playtimes.push([steamID, playTime])
        }
      } catch(e) {
        console.log('Error Requesting Playtime URL: ' + url)
        throw e
      }
    } else {
      console.log('Error Requesting Playtime URL: ' + url)
    }
  })
}

function passiveAddCachedPlaytime(steamID) {
  console.log("This was called")
  if (timeskeys.indexOf(steamID.slice(10)) > -1) {
    callback(times[steamID.slice(10)].onteam)
  }
}

function spotDifferences(staff, callback) {
  staff = interceptData(staff)
  if (oldData != {}) {
    var staffKeys = Object.keys(staff)
    for (var i = 0; i < staffKeys.length; i++) {
      if (oldData[staffKeys[i]] != undefined) {
        if (staff[staffKeys[i]]['user'] != oldData[staffKeys[i]]['user']) {
          console.log('Username updated from ' + oldData[staffKeys[i]]['user'] + ' to ' + staff[staffKeys[i]]['user'] + ' for user ' + oldData[staffKeys[i]]['user'])
        }
        if (staff[staffKeys[i]]['group'] != oldData[staffKeys[i]]['group']) {
          console.log('Group updated from ' + oldData[staffKeys[i]]['group'] + ' to ' + staff[staffKeys[i]]['group'] + ' for user ' + oldData[staffKeys[i]]['user'])
          staff[staffKeys[i]]['history'].push([parseInt(new Date().getTime() / 1000), oldData[staffKeys[i]]['group'], staff[staffKeys[i]]['group']])
        }
      } else {
        console.log(staff[staffKeys[i]]['user'] + ' has been added to the database.')
      }
    }
    oldData = staff
    saveStaff(staff)
  }
  else {
    oldData = staff
    saveStaff(staff)
  }
  callback()
}

function interceptData(staff) {
  for (var i = 0; i < profiles.length; i++) {
    staff[profiles[i][0]].profile = profiles[i][1]
  }
  for (var i = 0; i < playtimes.length; i++) {
    staff[playtimes[i][0]].playtime = playtimes[i][1]
  }
  for (var i = 0; i < steam642.length; i++) {
    staff[steam642[i][0]].steam64 = steam642[i][1]
  }
  for (var i = 0; i < steam3.length; i++) {
    staff[steam3[i][0]].steam3 = steam3[i][1]
  }
  profiles = []
  playtimes = []
  steam642 = []
  steam3 = [] 
  return staff
}

function saveStaff(staff) {
  fs.writeFile('./admins.json', JSON.stringify(staff, null, 4), function(err) {
    if(err) {
      return console.log(err)
    }
  })
}

function updatePlaytimes() {
  console.log("Updating Playtimes")
  var url = "https://clwo.eu/jailbreak/api/v1/playtime.php"
  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      try {
        times = JSON.parse(body).data
        timeskeys = Object.keys(times)
        console.log("Playtimes Updated")
      } catch(e) {
        console.log('Error Requesting Playtime URL: ' + url)
        throw e
      }
    } else {
      console.log('Error Requesting Playtime URL: ' + url)
    }
  })
}

function changeFormat() {
  var groupStructure = {}
  for (var i = 0; i < groups.length; i++) {
    groupStructure[groups[i]] = []
  }
  for (var player in oldData) {
    if (groups.indexOf(oldData[player].group) > -1) {
      var obj = {
        "user": oldData[player].user,
        "profile": oldData[player].profile,
        "steam64": oldData[player].steam64,
        "steam3": oldData[player].steam3,
        "steamid": player
      }
      if (oldData[player].customName) {
        obj.user = oldData[player].customName
      }
      groupStructure[oldData[player].group].push(obj)
    }
  }
  return groupStructure
}

function changeUpdate(sendBackEarly) {
  updates = {}
  for (var player in oldData) {
    var history = oldData[player].history
    for (var i = 0; i < history.length; i++) {
      if (history[i][0] > lockoutTime) {
        var changeLog = [player, "", history[i][1], history[i][2], oldData[player].profile, oldData[player].steam64]
        if (oldData[player].user) {
          changeLog[0] = oldData[player].user
        }
        if (oldData[player].customName) {
          changeLog[0] = oldData[player].customName
        }
        if (!history[i][3]) {
          if (groups.indexOf(history[i][1]) > groups.indexOf(history[i][2])) {
            changeLog[1] = "demoted"
          } else {
            changeLog[1] = "promoted"
          }
        } else {
          changeLog[1] = history[i][3]
        }
        if (updates[history[i][0]] == undefined) {
          updates[history[i][0]] = [changeLog]
        } else {
          updates[history[i][0]].push(changeLog)
        }
      }
    }
  }
  console.log(updates)
  updateArray = []
  for (var date in updates) {
    updateArray.push([date, updates[date]])
  }
  updateObject = {}
  updateArray.sort(sortFunction)
  if (!sendBackEarly) {
    for (var i = updateArray.length - 1; i >= 0; i--) {
      var humanTime = toHuman((new Date().getTime()) - updateArray[i][0] * 1000)
      if (updateObject[humanTime] == undefined) {
        updateObject[humanTime] = updateArray[i][1]
      } else {
        for (var j = 0; j < updateArray[i][1].length; j++) {
          updateObject[humanTime].push(updateArray[i][1][j])
        }
      }
    }
    return updateObject
  } else {
    return updateArray
  }
  
}

function mainScript() {
  getStaff(function(data) {
    parseStaff(data.data, function(staff) {
      spotDifferences(staff, function() {
        console.log('Spot Differences Finished')
      })
    })
  })
}

mainScript()
setInterval(mainScript, 360000)
updatePlaytimes()
setInterval(updatePlaytimes, 3600000)

app.get('/', function(req, res) {
  var ip = getIP(req).clientIp
  console.log("Someone tried to call the page: " + ip)
  res.render('index', {
    groups: changeFormat(),
    updates: changeUpdate(),
    groupNames: groupNames,
    groupCodes: groups,
    colourRank: colourRank,
    toTitleCase: toTitleCase,
    formatPlayer: formatPlayer
  })
})

app.get('/api/getUserData', function(req, res) {
  if (req.query.full == 1) {
    res.json(oldData)
  } else {
    res.json(changeFormat())
  }
})

app.get('/api/getUserChanges', function(req, res) {
  if (req.query.numerical == 1) {
    res.json(changeUpdate(true))
  } else {
    res.json(changeUpdate())
  }
})

app.listen(3000, function() {
  console.log('Example app listening on port 3000!')
})

