

var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/gmail-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'gmail-nodejs-quickstart.json';

var gmail = google.gmail('v1');
var labelList = ['AA'];
var labelIds = [];  
var threadList = [];

// Load client secrets from a local file.
fs.readFile('client_secret_1028718643890-r7ojr2pfmmkemh5mcr0si59710fouui8.apps.googleusercontent.com.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the
  // Gmail API.
  authorize(JSON.parse(content), getLabels);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function getLabels(auth) {
  gmail.users.labels.list({auth: auth,userId: 'me'}, 
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
                if (labelList.indexOf(label.name) >= 0)
                    labelIds.push(label.id);
            }
        }

        if (labelIds.length) {
            getMessages(auth);
        }
    }
  );
}

function getThreads(auth) {
  for (var i in labelIds) {
    gmail.users.threads.list({
      auth: auth,
      userId: 'me',
      labelIds: labelIds[i]
    }, 
    function(err, response) {
      if (err) {
        console.log('The API returned an error: ' + err);
        return;
      }
      if (response.resultSizeEstimate) {
        var threads = response.threads;

        for (var i = 0; i < threads.length; i++) {
          threadList.push(threads[i].id);
        }
      }
    });
  }
  setTimeout(function() {
    getMessages(auth, threadList);
  }, 1000);
}

function getMessages(auth) {
  for (var i in labelIds) {
    gmail.users.messages.list({
      auth: auth,
      userId: 'me',
      labelIds: labelIds[i]
    }, 
    function(err, response) {
      if (err) {
        console.log('The API returned an error: ' + err);
        return;
      }
      if (response.resultSizeEstimate) {
        // console.log(response);
        var messages = response.messages;

        for (var i = 0; i < messages.length; i++) {
          getMessage(auth, messages[i].id);
        }
      }
    });
  } 
}

function getMessage(auth, id) {
  if (id) {
    var messageParts = {};
    var headers = {};
    var from;
    var body;

    gmail.users.messages.get({
      auth: auth,
      userId: 'me',
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
      from = parseEmailHeader(headers.From);

      if (messageParts['text/plain']) 
        body = new Buffer(messageParts['text/plain'], 'base64').toString("ascii");
      else if (messageParts['text/html']) 
        body = new Buffer(messageParts['text/html'], 'base64').toString("ascii");

      console.log(body);
    });
  }
}

function parseEmailHeader(str) {
  if (str.indexOf("<"))
    str = str.split("<")[1];
  var m = str.match(/[^>]+/);
  return m[0];
}