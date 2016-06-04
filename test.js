var players = require('./accounts.json').data

function resolveName(name) {
  console.log(name)
  for (i in players) {
    if (players[i].SteamID2 == name) {

      console.log("found")
      return [players[i].AccountID, name, players[i].SteamID3, players[i].SteamID64]
    }
  }
  return [null, null, null, null]
}

console.log(resolveName("STEAM_0:0:4224"))