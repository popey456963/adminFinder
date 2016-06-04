var request = require('request')
var express = require('express')
var fs = require('fs')
var app = express()

function onlyUnique(value, index, self) { 
  return self.indexOf(value) === index;
}

function toTitleCase(str) {
  return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

app.get('/', function (req, res) {
  request('https://clwo.eu/jailbreak/api/v1/admins.php', function (error, response, body) {
    if (!error && response.statusCode == 200) {
      fs.readFile('./index.html', 'utf8', function (err,data) {
        // res.send(data.replace("{{DATA}}", body))
        var positions = ["root", "Senators", "Senior Admin", "admin", "Senior Moderator", "moderator", "Guardian", "informer"]

        var groups = {
          "root": [],
          "Senators": [],
          "Senior Admin": [],
          "admin": [],
          "Senior Moderator": [],
          "moderator": [],
          "Guardian": [],
          "informer": []
        }

        for (i=0; i<data.data.length; i++) {
          if (groups[data.data[i]['srv_group']]) {
            groups[data.data[i]['srv_group']].push([data.data[i]["user"], data.data[i]["authid"]])
          }
        }

        for (i=0; i<positions.length; i++) {
          document.getElementById("text").innerHTML += "<span class='c'><b>" + toTitleCase(positions[i]) + "</b></span><br />"
          for (j=0; j<groups[positions[i]].length; j++) {
            document.getElementById("text").innerHTML += "<span class='a'>" + groups[positions[i]][j][0] + "</span>, <span class='b'>" + groups[positions[i]][j][1] + "</span><br />"
          }
        }

        console.log(groups)
      })
    } else {
      res.send("Internal Error")
    }
  })
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});

