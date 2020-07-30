//
//  a10_system.js
//     A10 aXAPI System related API calls.
//  Extends the 'a10-nodejs-axapi' base module -- can not be used standalone!
//
//  John D. Allen
//  Sr. Solution Engineer, A10 Networks Inc.
//  May 2019
//  Copyright (C) A10 Networks Inc., All Rights Reserved.
//
//--------------------------------------------------------------------

module.exports = {

  //------------------[   getUptime()   ]------------------------
  getUptime: function() {
    if (this.debug > 8) { console.log("--->getUptime()"); }
    return new Promise((resolve, reject) => {
      this._restcall(this.authToken, "GET", "/version/oper", null).then((out) => {
        if (this.debug > 8) { console.log("<---getUptime()"); }
        resolve(out.version.oper["up-time"]);
      }).catch((err) => {
        reject(JSON.parse('{ "code": 20, "msg": "Unable to get System Uptime: [' + err.response.status + '] ' + err.response.statusText + '" }'));
      });
    });
  },

  //------------------[   getPlatform()   ]------------------------
  getPlatform: function() {
    if (this.debug > 8) { console.log("--->getPlatform()"); }
    return new Promise((resolve, reject) => {
      this._restcall(this.authToken, "GET", "/version/oper", null).then((out) => {
        if (this.debug > 8) { console.log("<---getPlatform()"); }
        resolve(out.version.oper["hw-platform"]);
      }).catch((err) => {
        reject(JSON.parse('{ "code": 21, "msg": "Unable to get System Platform: [' + err.response.status + '] ' + err.response.statusText + '" }'));
      });
    });
  },

  //------------------[   getBootInfo()   ]------------------------
  getBootInfo: function() {
    if (this.debug > 8) { console.log("--->getBootInfo()"); }
    return new Promise(function(resolve, reject) {
      this._restcall(this.authToken, "GET", "/bootimage/oper", null).then((out) => {
        var rtn = {
          hd_default: out.bootimage.oper["hd-default"],
          hd_pri: out.bootimage.oper["hd-pri"],
          hd_sec: out.bootimage.oper["hd-sec"]
        };
        if (this.debug > 8) { console.log("<---getBootInfo()"); }
        resolve(rtn);
      }).catch((err) => {
        //chk4AuthErr();
        reject(JSON.parse('{ "code": 22, "msg": "Unable to get BootImage Info: [' + err.response.status + '] ' + err.response.statusText + '" }'));
      });
    });
  },

  //------------------[   getLastConfigSave()   ]------------------------
  getLastConfigSave: function() {
    if (this.debug > 8) { console.log("--->getLastConfigSave()"); }
    return new Promise(function(resolve, reject) {
      this._restcall(this.authToken, "GET", "/version/oper", null).then((out) => {
        if (this.debug > 8) { console.log("<---getLastConfigSave()"); }
        resolve(out.version.oper["last-config-save-time"]);
      }).catch((err) => {
        //chk4AuthErr();
        reject(JSON.parse('{ "code": 23, "msg": "Unable to get Last Config Save Time: [' + err.response.status + '] ' + err.response.statusText + '" }'));
      });
    });
  },

  //------------------[   getCtrlCPUs()   ]------------------------
  getCtrlCPUs: function() {
    if (this.debug > 8) { console.log("--->getCtrlCPUs()"); }
    return new Promise(function(resolve, reject) {
      this._restcall(this.authToken, "GET", "/version/oper", null).then((out) => {
        if (this.debug > 8) { console.log("<---getCtrlCPUs()"); }
        resolve(out.version.oper["nun-ctrl-cpus"]);
      }).catch((err) => {
        reject(JSON.parse('{ "code": 24, "msg": "Unable to get number of Control CPUs: [' + err.response.status + '] ' + err.response.statusText + '" }'));
      });
    });
  },

  //------------------[   getCPUinfo()   ]------------------------
  getCPUinfo: function() {
    if (this.debug > 8) { console.log("--->getCPUinfo()"); }
    return new Promise(function(resolve, reject) {
      this._restcall(this.authToken, "GET", "/system-cpu/oper", null).then((out) => {
        if (this.debug > 8) { console.log("<---getCPUinfo()"); }
        resolve(out);
      }).catch((err) => {
        reject(JSON.parse('{ "code": 25, "msg": "Unable to get CPU Info: [' + err.response.status + '] ' + err.response.statusText + '" }'));
      });
    });
  },

  //------------------[   getMemInfo()   ]------------------------
  getMemInfo: function() {
    if (this.debug > 8) { console.log("--->getMemInfo()"); }
    return new Promise(function(resolve, reject) {
      this._restcall(this.authToken, "GET", "/system-view/memory-view/oper", null).then((out) => {
        if (this.debug > 8) { console.log("<---getMemInfo()"); }
        resolve(out);
      }).catch((err) => {
        reject(JSON.parse('{ "code": 26, "msg": "Unable to get Memory Info: [' + err.response.status + '] ' + err.response.statusText + '" }'));
      });
    });
  },

  //------------------[   getHardwareInfo()   ]------------------------
  getHardwareInfo: function() {
    if (this.debug > 8) { console.log("--->getHardwareInfo()"); }
    return new Promise(function(resolve, reject) {
      this._restcall(this.authToken, "GET", "/system-view/hardware-view/oper", null).then((out) => {
        if (this.debug > 8) { console.log("<---getHardwareInfo()"); }
        resolve(out);
      }).catch((err) => {
        reject(JSON.parse('{ "code": 27, "msg": "Unable to get Hardware Info: [' + err.response.status + '] ' + err.response.statusText + '" }'));
      });
    });
  },

  //------------------[   cli_deploy()   ]------------------------
  cli_deploy: function(cmd) {
    if (this.debug > 8) { console.log("--->cli_deploy()"); }
    return new Promise(function(resolve, reject) {
      this._restcall(this.authToken, "POST", "/clideploy", cmd).then((out) => {
        if (this.debug > 8) { console.log("<---cli_deploy(+)"); }
        // Output from this command can be either text or JSON!!
        if (this.isJSON(out)) {
          resolve(out.response.status);
        } else {
          resolve(out);
        }
      }).catch((err) => {
  //console.log(err);
        if (this.debug > 8) { console.log("<---cli_deploy(-)"); }
        if (err.response.status == 400) {
          reject(JSON.parse('{ "code": 28, "msg": "Syntax Error in Command File. Spelling Mistake?" }'));
        } else {
          reject(JSON.parse('{ "code": 28, "msg": "Unable to execute CLI command: [' + err.response.status + '] ' + err.response.statusText + '" }'));
        }
      });
    });
  },

  //-------------[ erase() ]---------------
  erase: function() {
    if (this.debug > 8) { console.log("--->erase()"); }
    return new Promise(function(resolve, reject) {
      var payl = {
        "erase": {
          "preserve-management": 1,
		       "preserve-accounts": 1,
		       "reload": 1
        }
      };
      this._restcall(this.authToken, "POST", "/erase", payl).then((out) => {
        // This API call never returns -- it wipes the box then reboots!
        if (this.debug > 8) { console.log("<---erase(+)"); }
        resolve("OK");
      }).catch((err) => {
        // Usually this command gets a socket hang up error, which means the command worked.
        if (this.debug > 8) { console.log("<---erase(-)"); }
        if (err.hasOwnProperty("code")) {
          if (err.code == "ECONNRESET") {
            resolve("OK");
          } else {
            reject('{ "code": 29, "msg": "Error on Erase Command: ' + err.code + '" }');
          }
        }
      });
    });
  },

  //------------------[   writeMem()   ]------------------------
  writeMem: function() {
    if (this.debug > 8) { console.log("--->writeMem()"); }
    return new Promise(function(resolve, reject) {
      this._restcall(this.authToken, "GET", "/write/memory", null).then((out) => {
        if (this.debug > 8) { console.log("<---writeMemo()"); }
        resolve(out);
      }).catch((err) => {
        reject(JSON.parse('{ "code": 30, "msg": "Unable to write Memory: [' + err.response.status + '] ' + err.response.statusText + '" }'));
      });
    });
  }
}
