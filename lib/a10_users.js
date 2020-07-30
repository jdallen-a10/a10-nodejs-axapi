//
//  a10_users.js
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

  //------------------[   getAdminList()   ]------------------------
  getAdminList: function() {
    if (this.debug > 8) { console.log("--->getAdminList()"); }
    return new Promise(function(resolve, reject) {
      this._restcall(this.authToken, "GET", "/admin", null).then((out) => {
        if (this.debug > 8) { console.log("<---getAdminList()"); }
        resolve(out);
      }).catch((err) => {
        reject('{ "code": 60, "msg": "Unable to get Admin List: ' + err.message + '" }');
      });
    });
  }

}
