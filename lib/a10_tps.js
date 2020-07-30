//
//  a10_tps.js
//     A10 aXAPI TPS related API calls.
//  Extends the 'a10-ndoejs-axapi' base module -- can not be used standalone!
//
//  John D. Allen
//  Sr. Solution Engineer, A10 Networks Inc.
//  May 2019
//  Copyright (C) A10 Networks Inc., All Rights Reserved.
//
//--------------------------------------------------------------------

//var A10 = require('a10-nodejs-axapi');

module.exports = {

  //------------------[   getZoneList()   ]------------------------
  getZoneList: function() {
    if (this.debug > 8) { console.log("--->getZoneList()"); }
    return new Promise(function(resolve, reject) {
      this._restcall(this.authToken, "GET", "/ddos/dst/zone-list/", null).then((out) => {
        if (this.debug > 8) { console.log("<---getZoneList()"); }
        resolve(out);
      }).catch((err) => {
        reject('{ "code": 50, "msg": "Unable to get TPS Zone List: ' + err.message + '" }');
      });
    });
  }

}
