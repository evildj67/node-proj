var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var gmailAPI = require('../gmailAPI');

var gmail = google.gmail('v1');
var labelList = ['AA'];
var labelIds = [];  
var threadList = [];

var userId = 'agentassist@agentology.com';
var leadSources = {
    'AgentHero': [],
    'Boomtown': ['boomtown'],
    'Commissions Inc.': ['cincghq'],
    'Facebook': [],
    'Firepoint': ['firepoint'],
    'Follow Up Boss': ['followupboss'],
    'Gmail': [],
    'Google': [],
    'Homes.com': [],
    'Kunversion Zapier': ['zpr.io', 'zapiermail'],
    'Listing Booster': ['listingbooster'],
    'Perfect Storm': ['perfectstorm'],
    'Prime Seller Leads': ['primesellerleads'],
    'Properties Online': ['propertiesonline'],
    'RealtyNow': [],
    'Real Estate Pal': ['nhreventures'], 
    'Real Estate Webmasters': ['realestate-idaho', 'cityoftreesrealestate'],
    'RealGeeks': ['realgeeks','real-estate-request'],
    'Realtor.com': ['realtor.com'],
    'SmarterAgent': [],
    'TORCHx': ['archergrouprealty', 'loganstewartrealty'],
    'Tiger Leads': ['tigerleads'], 
    'Trulia': [],
    'Zillow': ['zillow'],
    'Zurple': []
}

// Load client secrets from a local file.
fs.readFile('client_secret_1028718643890-r7ojr2pfmmkemh5mcr0si59710fouui8.apps.googleusercontent.com.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the
  // Gmail API.
  gmailAPI.authorize(JSON.parse(content), getMessages);
});

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function getLabels(auth) {
  gmail.users.labels.list({
      auth: auth, 
      userId: userId
    }, 
    function(err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        var labels = response.labels;
        if (labels.length == 0) {
            console.log('No labels found.');
        } else {
            for (var i = 0; i < labels.length; i++) {
                var label = labels[i];
                console.log(label.id + " = " + label.name);
                // if (labelList.indexOf(label.name) >= 0)
                //     labelIds.push(label.id);
            }
        }

        // if (labelIds.length) {
        //     getMessages(auth);
        // }
    }
  );
}

function getThreads(auth) {
    gmail.users.threads.list({
        auth: auth,
        userId: userId,
        labelIds: 'Label_1'
    }, 
    function(err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        if (response.resultSizeEstimate) {
            var threads = response.threads;
            console.log(response);
            // for (var i = 0; i < threads.length; i++) {
            //     threadList.push(threads[i].id);
            // }
        }
        
    });
}

function showThreads(result) {
    console.log(result);
}

function getMessages(auth) {
    gmail.users.messages.list({
        auth: auth,
        userId: userId, 
        maxResults: 50, 
        labelIds: 'Label_1'
    }, 
    function(err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        if (response.resultSizeEstimate) {
            var messages = response.messages;

            for (var i = 0; i < messages.length; i++) {
                getMessage(auth, messages[i].id);
            }
        }
    });
}

function getMessage(auth, id) {
  if (id) {
    var messageParts = {};
    var headers = {};
    var from, to, cc, sfid;
    var body;

    gmail.users.messages.get({
      auth: auth,
      userId: userId,
      id: id
    }, 
    function(err, response) {
      if (err) {
        console.log('The API returned an error: ' + err);
        return;
      }
      for (var i in response.payload.parts) {
        messageParts[response.payload.parts[i].mimeType] = response.payload.parts[i].body.data;
      }
      for (var i in response.payload.headers) {
        headers[response.payload.headers[i].name] = response.payload.headers[i].value;
      }
      //console.log(headers.From);
      //from = parseEmailString(headers.From);
      to = parseEmailCSV(headers.To);
      cc = parseEmailCSV(headers.Cc);
      sfid = parseSfId(to, cc);

      if (messageParts['text/plain']) 
        body = new Buffer(messageParts['text/plain'], 'base64').toString("ascii");
      else if (messageParts['text/html']) 
        body = new Buffer(messageParts['text/html'], 'base64').toString("ascii");

        var leadSource = getLeadSource(headers);
        // if (!leadSource) {
        //     console.log(headers.Subject);
        //     console.log("---------------");
        // }
    // console.log("From: " + headers.From);
    // console.log('Received: ' + headers.Received);
    if (leadSource == 'TORCHx') {
        console.log(headers);
    }
    // console.log(leadSource);
    // console.log("SFID: " + sfid);
    console.log("---------------");
    });
  }
}

function parseEmailString(str) {
    if (str) {
        str = str.trim().toLowerCase();
        if (str.indexOf("<") >= 0)
            str = str.split("<")[1];
        var m = str.match(/[^>]+/);
        return m[0];
    }
    return null;
}

function parseEmailCSV(str) {
    var addresses = [];
    if (str) {
        var arr = str.split(',');
        for (var i in arr) {
            addresses.push(parseEmailString(arr[i]).toLowerCase());
        }
        return addresses.join(",");
    }
    return null;
}

function parseSfId(to, cc) {
    var email;
    var sfid = '';
    var tos, ccs;
    if (to) {
        tos = to.split(",");
        for (var i in tos) {
            email = tos[i].trim();
            if (email.indexOf("+") >= 0) {
                email = email.split("+")[1];
                email = email.split("@")[0];
                sfid = email;
            }
        }
    }

    if (!sfid.length && cc) {
        ccs = cc.split(",");
        for (var i in ccs) {
            email = ccs[i].trim();
            if (email.indexOf("+") >= 0) {
                email = email.split("+")[1];
                email = email.split("@")[0];
                sfid = email;
            }
        }
    }

    if (sfid)
        return sfid;
    return null;
}

function getLeadSource(headers) {
    for (var prop in leadSources) {
        if (leadSources[prop].length) {
            for (var i in leadSources[prop]) {
                for (var j in headers) {
                    if (headers[j].indexOf(leadSources[prop][i]) >= 0) {
                        //console.log(j, headers[j]);
                        return prop;
                    }
                }
            }
        }
    }
    return null;
}