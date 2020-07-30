//
//  a10_slb.js
//     A10 aXAPI related API calls for user ids.
//  Extends the 'a10-ndoejs-axapi' base module -- can not be used standalone!
//
//  John D. Allen
//  Sr. Solution Engineer, A10 Networks Inc.
//  May 2019
//  Copyright (C) A10 Networks Inc., All Rights Reserved.
//
//--------------------------------------------------------------------

module.exports = {

  //------------------[   getServerList()   ]------------------------
  getServerList: function() {
    if (this.debug > 8) { console.log("--->getServerList()"); }
    return new Promise(function(resolve, reject) {
      this._restcall(this.authToken, "GET", "/slb/server-list/", null).then((out) => {
        if (this.debug > 8) { console.log("<---getServerList()"); }
        resolve(out);
      }).catch((err) => {
        reject('{ "code": 70, "msg": "Unable to get Server List: ' + err.message + '" }');
      });
    });
  },

  //------------------[   getServiceGroupList()   ]------------------------
  getServiceGroupList: function() {
    if (this.debug > 8) { console.log("--->getServiceGroupList()"); }
    return new Promise(function(resolve, reject) {
      this._restcall(this.authToken, "GET", "/slb/server-list/", null).then((out) => {
        if (this.debug > 8) { console.log("<---getServiceGroupList()"); }
        resolve(out);
      }).catch((err) => {
        reject('{ "code": 71, "msg": "Unable to get Service Group List: ' + err.message + '" }');
      });
    });
  }

}
