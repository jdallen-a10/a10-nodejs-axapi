
var A10 = require('a10-nodejs-axapi');
Object.assign(A10.prototype, require('./node_modules/a10-nodejs-axapi/lib/a10_system.js'));

var opts = {
  DEBUG: 10,
  IPAddr: "192.168.20.201",
  User: "admin",
  Passwd: "a10"
}

var th = new A10(opts);

th.init().then((out) => {
  th.getHostname().then((hn) => {
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>" + hn);
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>" + th.version.version);
    console.log(">>>>>>>>" + JSON.stringify(th, null, "  "));
    th.getUptime().then((out) => {
      console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>" + out);
      th.getPlatform().then((out) => {
        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>" + out);
        th.logoff().then((out) => {
          console.log(out);
        }).catch((err) => {
          console.log(err);
        });
      }).catch((err) => {
        console.log(err);
      });
    }).catch((err) => {
      console.log(err);
    });
  }).catch((err) => {
    console.log(err);
  });
}).catch((err) => {
  console.log(err);
});
