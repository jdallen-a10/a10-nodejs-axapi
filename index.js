//
//  index.js
//
//  aXAPI Module for A10 Networks Thunder
//
//  John D. Allen
//  Sr. Solution Engineer, A10 Networks Inc.
//  May 2019
//  Copyright (C) A10 Networks Inc., All Rights Reserved.
//
//--------------------------------------------------------------------
//  This library has 'sub-modules' that allow for specific parts of the
//  API to be loaded as needed.  The A10 aXAPI has thousands upon thousands
//  of API calls -- A module that supported all of them would be rather
//  large and most of the API calls would not be used.  This method allows for
//  using just the specific areas of the aXAPI API set that you need to do the
//  current job, without having load in a bunch of API calls that you will never
//  use.
//
//  I can't take credit for inventing how to do this, as I found this out
//  on the Internet, but never wrote down where....its been in my bag of
//  tricks for a while now.
//
//  Here's how you use this library.
//
//  var A10 = require('a10-nodejs-axapi');
//  Object.assign(A10.prototype, require('./node_modules/a10-nodejs-axapi/lib/a10_slb.js'));
//  Object.assign(A10.prototype, require('./node_modules/a10-nodejs-axapi/lib/a10_tps.js'));
//  ...
//  var opts = {
//     "IPAddr": ipaddr,
//     "User": "admin",
//     "Passwd": "a10"
//  };
//  var myThunder = new A10(opts);
//  myThunder.init().then((out) => {
//    myThunder.getHostname().then((hostname) => {
//       console.log("Hostname: " + hostname);
//    }).catch((err) => {
//       console.log(err.msg);
//    });
//  }).catch((err) => {
//    console.log(err.msg);
//  });
//
//  The base module is loaded in first, then the additional sections get
//  loaded into the A10 prototype object before the object is initialized.
//  These section files have function prototypes that get added to the
//  main A10 object as needed.
//
//  Keep in mind that the Object.assign function is only in versions of Node.JS
//  greater than 4.x
//
//--------------------------------------------------------------------

"use strict";

// https://github.com/axios/axios
var axios = require('axios');
var https = require('https');
var util = require('util');

const TIMEOUT = 10000;      // Timeout for a signle REST API call, in ms.
const MAXTIMEOUT = 12;      // timeout for Looping REST API calls, in seconds.
const SESSIONTIMEOUT = 30;  // Idle Timeout (in Seconds) for session before logout() is called.

//-----------------[   Module Variables   ]------------------
// var IPAddr = "0.0.0.0";     // IP Address of A10 Thunder we are connecting to.
// var User = "";              // Username to use for Admin access.
// var Passwd = "";            // Password of Admin user.
// var Version = "";           // A10 Thunder ACOS Version.
// var Hostname = "";          // A10 Thnder Hostname.
// var AuthToken = "";         // Auth Token returned by ACOS for use in subsequent API calls.
// var LoadedLibs = [];        // Array for the various library files to post if they are loaded.
// var DEBUG = 0;              // 1 = Debug on, 0 = Debug off, >1 = Debug levels

/**
 *  Constructor
 *  @param {object} opts - init parameters
 */
function A10(opts) {
  this.debug = opts.DEBUG || 0;
  this.ipaddr = opts.IPAddr || '0.0.0.0';
  this.user = opts.User || 'admin';
  this.passwd = opts.Passwd || 'a10';
  this.version = {
    major: "",
    minor: "",
    rev: "",
    patch: "",
    build: "",
    version: ""
  }
  this.hostname = "";
  this.authToken = "";
  this.loadedLibs = [];
  this.vertType = "";
}

var API = A10.prototype;

//-------------------[   Initialize Connection   ]----------------------
API.init = function() {
  if (this.debug > 8) { console.log("--->init()"); }
  return new Promise((resolve, reject) => {
    this._connect().then((out) => {
      // @TODO: Log connection here.
      this.getVersion().then((out) => {
        this.getHostname().then((out) => {
          if (this.debug > 8) { console.log("<---init()"); }
          resolve("OK");
        }).catch((err) => {
          reject(err);
        });
      }).catch((err) => {
        reject(err);
      });
    }).catch((err) => {
      reject(err);
    });
  });
}

//----------------------[   Connect()   ]--------------------------
API._connect = function() {
  if (this.debug > 8) { console.log("--->_connect()"); }
  return new Promise((resolve, reject) => {
    if (this.ipaddr === '0.0.0.0') {
      reject(JSON.parse('{ "code": 0, "msg": "IP Address was not set for Thunder" }'));
    }

    // Go get AuthToken for our session.
    this.authorize().then((authtok) => {
      if (this.debug > 8) { console.log("<---_connect()"); }
      resolve(authtok);
    }).catch((err) => {
      reject(err);
    });
  });
}

//------------------[   authorize()   ]-------------------------
API.authorize = function() {
  if (this.debug > 8) { console.log("--->authorize()"); }
  return new Promise((resolve, reject) => {
    var payl = {
      credentials: {
        username: this.user,
        password: this.passwd
      }
    };
    this._restcall(null, "POST", "/auth", payl).then((out) => {
      if (this.debug > 8) { console.log("<---authorize()"); }
      this.authToken = "A10 " + out.authresponse.signature;
      resolve(out.authresponse.signature);
    }).catch((err) => {
      reject(JSON.parse('{ "code": 1, "msg": "Unable to Authorize: [ ' + err.response.status + '] ' + err.message + '" }'));
    });
  });
}

//--------------------------------------------------------------------
// _restcall()
// This is the basic HTTPS RESTful API call to an A10 Thunder node.
// It makes use of a number of mondule variables to connect and execute
// various aXAPI calls.
//
// https://github.com/axios/axios
// https://appdividend.com/2018/08/30/getting-started-with-axios-tutorial-example/
//--------------------------------------------------------------------
API._restcall = function(authtok, type, url, payload) {
  return new Promise((resolve, reject) => {
    var options = {
      method: type,
      url: 'https://' + this.ipaddr + '/axapi/v3' + url,
      headers: { 'Content-Type': 'application/json' },
      timeout: TIMEOUT,
      httpsAgent: new https.Agent({rejectUnauthorized: false })
    }
    if (url == '/clideploy') {
      options.headers['Content-Type'] = 'text/plain';
    }
    if (authtok !== "" && authtok !== null) {
      options.headers['Authorization'] = authtok;
    }
    if (payload !== null) {
      options['data'] = payload;
    }

    // Make the HTTPS Call...
    if (this.debug > 8) { console.log("[----------------------------------------------------------]"); }
    if (this.debug > 8) { console.log('REQ>>\nOptions:' + util.inspect(options, {depth: null, colors: true})); }
    axios(options).then((res) => {
      // Success
      if (this.debug > 8) { console.log('STATUS: (' + res.status + ') ' + res.statusText); }
      if (this.debug > 8) { console.log('HEADERS: ' + JSON.stringify(res.headers, null, 3)); }
      if (this.debug > 8) { console.log('DATA: ' + JSON.stringify(res.data, null, 3)); }

      // return the data
      resolve(res.data);
    }).catch((err) => {
      if (this.debug > 8) { console.log('Error> [' + err.response.status + '] ' + err.message); }
      if (err.message == "Unauthorized") {
        //  No current AUTH Token is set, go set it and try again.
        this.authorize().then((authtok) => {
          // Global AuthToken is set in the authorize() function.
          this._restcall(this.authToken, type, url, payload).then((out) => {
            resolve(out);
          }).catch((err) => {
            reject(err);
          });
        });
      } else {
        if (this.debug > 8) { console.log('Error>> [' + err.response.status + '] ' + err.message); }
        reject(err);
      }
    });

  });
}

//------------------[   getHostname()   ]-----------------------
API.getHostname = function() {
  if (this.debug > 8) { console.log("--->getHostname()"); }
  return new Promise((resolve, reject) => {
    if (this.hostname !== "") {
      resolve(this.hostname);
    } else {
      this._restcall(this.authToken, "GET", "/hostname", null).then((out) => {
        this.hostname = out.hostname.value;
        if (this.debug > 8) { console.log("<---getHostname()"); }
        resolve(this.hostname);
      }).catch((err) => {
        //chk4AuthErr();
        reject(JSON.parse('{ "code": 2, "msg": "Unable to get Hostname: ' + err.message + '" }'));
      });
    }
  });
}

//------------------[   getVersion()   ]------------------------
API.getVersion = function() {
  if (this.debug > 8) { console.log("--->getVersion()"); }
  return new Promise((resolve, reject) => {
    if (this.version.version !== "") {
      resolve(this.version.version);
    } else {
      this._restcall(this.authToken, "GET", "/version/oper", null).then((out) => {
        var hd = out.version.oper["boot-from"];
        var v;
        if (hd == "HD_PRIMARY") {
          v = out.version.oper["hd-pri"];
        } else {
          v = out.version.oper["hd-sec"];
        }
        //
        // populate version struc
        var rr = v.split(".");
        this.version.major = rr[0];
        this.version.minor = rr[1];
        var gg = rr[2].split("-");
        this.version.rev = gg[0];
        this.version.patch = gg[1];
        this.version.build = rr[3];
        this.version.version = v;
        if (this.debug > 8) { console.log("<---getVersion()"); }
        resolve(this.version.version);
      }).catch((err) => {
        reject(JSON.parse('{ "code": 3, "msg": "Unable to get ACOS Version: ' + err.message + '" }'));
      });
    }
  });
}

//------------------[   isVirtual()   ]------------------------
API.isVirtual = function() {
  return new Promise((resolve, reject) => {
    this._restcall(this.authToken, "GET", "/version/oper", null).then((out) => {
      if (out.version.oper.hasOwnProperty("virtualization-type")) {
        var virt = out.version.oper["virtualization-type"];
        if (virt != "") {
          this.vertType = virt;
          resolve(true);
        } else {
          resolve(false);
        }
      } else {
        resolve(false);
      }
    }).catch((err) => {
      reject(JSON.parse('{ "code": 5, "msg": "Unable to get Virtualization Value: ' + err.message + '" }'));
    });
  });
}

//------------------[   getVirtType()   ]------------------------
API.getVirtType = function() {
  return new Promise((resolve, reject) => {
    this._restcall(this.authToken, "GET", "/version/oper", null).then((out) => {
      if (out.version.oper.hasOwnProperty("virtualization-type")) {
        var virt = out.version.oper["virtualization-type"];
        if (virt != "") {
          this.vertType = virt;
          resolve(virt);
        } else {
          reject(JSON.parse('{ "code": 7, "msg": "virtualization-type is blank" }'));
        }
      } else {
        reject(JSON.parse('{ "code": 8, "msg": "Thunder is NOT Virtual" }'));
      }
    }).catch((err) => {
      reject(JSON.parse('{ "code": 6, "msg": "Unable to get Virtualization Value: ' + err.message + '" }'));
    });
  });
}

//------------------[   whenReady()   ]-----------------------
API.whenReady = function() {
  return new Promise((resolve, reject) => {
    this._restcall(this.authToken, "GET", "/running-config", null).then((out) => {
      resolve('{ "status": "Ready" }');
    }).catch((err) => {
      console.log(err);
      reject();
      // @TODO Finsh whenReady()
      //If (err == {bad token}) {
      //  API.authorize().then((out) => {
      //    // s.b. g2g
      //  }).catch((err) => {
      //    // ??
      //  })
      //} else {
      //  // wait a bit and try again
      //  setTimeout(API.whenReady, 5000);
      //}
    });
  });
}

//------------------[   logoff()   ]-----------------------
API.logoff = function() {
  if (this.debug > 8) { console.log("--->logoff()"); }
  return new Promise((resolve, reject) => {
    this._restcall(this.authToken, "GET", "/logoff", null).then((out) => {
      this.authToken = "";
      if (this.debug > 8) { console.log("<---logoff(+)"); }
      resolve(out.response.status);
    }).catch((err) => {
      if (err.hasOwnProperty("response")) {
        if (err.response.status == 401) {
          // We have already timed out, so just resolve
          if (this.debug > 8) { console.log("<---logoff(=)"); }
          resolve(401);
        }
      } else {
        if (this.debug > 8) { console.log("<---logoff(-)"); }
        reject(JSON.parse('{ "code": 4, "msg": "Error terminating API session: ' + err.message + '" }'));
      }
    });
  });
}

//-----------------------------------------------------------------------------
// Utility Functions
//-----------------------------------------------------------------------------

API.isJSON = function(item) {
    item = typeof item !== "string"
        ? JSON.stringify(item)
        : item;

    try {
        item = JSON.parse(item);
    } catch (e) {
        return false;
    }

    if (typeof item === "object" && item !== null) {
        return true;
    }

    return false;
}


module.exports = A10;
