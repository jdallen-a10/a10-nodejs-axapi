#!/usr/bin/env node --no-warnings
//
//  cli.js  --  Interactive CLI interface to Thunder.
//
//  John D. Allen
//  Sr. Solution Engineer, A10 Networks Inc.
//  May 2019
//  Copyright (C) A10 Networks Inc., All Rights Reserved.
//
//--------------------------------------------------------------------

const VERSION = "0.1.6";
const CMDBUFSIZE = 2048;

var A10 = require('a10-nodejs-axapi');
Object.assign(A10.prototype, require('./node_modules/a10-nodejs-axapi/lib/a10_system.js'));

var readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});
var fs = require('fs');
var nodes = require('./thunder_nodes.json');
var hexdump = require('./hexdump.js');
var dir = require('./dir.js');
var argv = require('minimist')(process.argv.slice(2));
var config = require('./A10_Defaults.json');

if (argv.h != undefined) { config.IPAddr = argv.h; }
if (argv.host != undefined) { config.IPAddr = argv.host; }
if (argv.u != undefined) { config.User = argv.u; }
if (argv.user != undefined) { config.User = argv.user; }
if (argv.p != undefined) { config.Passwd = argv.p; }
if (argv.passwd != undefined) { config.Passwd = argv.passwd; }

if (argv.help != undefined) {
  console.log("Usage:");
  console.log("  -h | --host   => IP or FQDN of A10 Thunder.");
  console.log("  -u | --user   => Username with Admin privliages.");
  console.log("  -p | --passwd => Password for Username.");
  console.log("  --help        => This help page.\n");
  process.exit(0);
}

var opts = {
  IPAddr: config.IPAddr,
  User: config.User || "admin",
  Passwd: config.Passwd || "a10",
  DEBUG: config.DEBUG || 0
}

var a10;
var prompt = "";
var mprompt = "";
var line = "";
var hexflag = false;
var lines = "";
var chunk = "";
var out = "";
var csize = 0;

//-------------[ Print out Header and Start Procssing Loop ]---------------
open(opts).then((out) => {
  console.log("\n::A10 Thunder Command Processor:: -v" + VERSION);
  console.log("--Connected to: " + a10.Hostname() + " at " + opts.IPAddr + "    Enter '.help' for info.");
  console.log("==================================================================================");
  // Start processing ACOS Commands!
  processCmdline('');
});

//----------------------[  open()   ]----------------------------
function open(opts) {
  return new Promise(function(resolve, reject) {
    a10 = new A10(opts);
    a10.init().then((out) => {
      var hostname = a10.Hostname();
      prompt = hostname + "$ ";
      mlprompt = hostname + "(>>)$ ";
      //processCmdline('');
      resolve('OK');
    }).catch((err) => {
      if (err.indexOf("[503]") != -1) {
        console.log("Error: [503] Service Unavailable");
        console.log("--This error happens when there are too many aXAPI sessions running to open");
        console.log("--a new session. You can either wait for existing sessions to logoff or expire,");
        console.log("--or you can go onto the console and clear the sessions using the ");
        console.log("--'clear admin session all' command. ['show admin session' will list all the");
        console.log("--active sessions.]");
        process.exit(1);
      } else {
        console.log(err);
        console.log("[Open]Error: " + err.msg);
        process.exit(1);
      }
    });
  });
}

//----------------------[  processCmdline()   ]----------------------------
function processCmdline(mode) {
  if (mode == '') {     // Single-line Mode
    // Ask for input
    readline.question(prompt, (cmd) => {
      switch (cmd.split(' ')[0]) {
        //-------------[ NULL line ]---------------
        case '':
          processCmdline('');
          break;
        //-------------[ Multi-line ]---------------
        case '.':
          console.log(">>Multi-Line Mode::Enter single '.' to exit and send multi-line command");
          processCmdline('.');
          break;
        //-------------[ Show HELP page ]---------------
        case '.help':
          help();
          processCmdline('');
          break;
        //-------------[ Show ABOUT page ]---------------
        case '.about':
          about();
          processCmdline('');
          break;
        //-------------[ Quit ]---------------
        case '.quit':
          a10.logoff().then((out) => {
            // Should return 'OK'
            process.exit(0);
          }).catch((err) => {
            console.log("--Error on Thunder Logoff. Disconnting...");
            process.exit(2);
          });
          break;
        //-------------[ Show Connection Info ]---------------
        case '.?':
          showInfo();
          processCmdline('');
          break;
        //-------------[ Modify Debug Levels ]---------------
        case '.debug':
          var rr = cmd.split(' ');
          config.DEBUG = rr[1];
          a10.set("DEBUG", rr[1]);
          processCmdline('');
          break;
        //-------------[ Switch output to Hexdump ]---------------
        case '.hex':
          var rr = cmd.split(' ');
          if(rr[1] == "ON" || rr[1] == "on" || rr[1] == "On") {
            hexflag = true;
          } else {
            hexflag = false;
          }
          processCmdline('');
          break;
        //-------------[ Connect to different Thunder ]---------------
        case '.open':
          var rr = cmd.split(' ');
          if (rr[1] < 0 || rr[1] > nodes.nodes.length) {    // number in list?
            console.log("--Invalid Node Number");
            processCmdline('');
          } else {
            opts.IPAddr = nodes.nodes[rr[1]-1].addr;
            opts.User = nodes.nodes[rr[1]-1].user;
            opts.Passwd = nodes.nodes[rr[1]-1].passwd;
            open(opts).then((out) => {
              // Should return 'OK'
              console.log("==================================================================================");
              processCmdline('');
            });
          }
          break;
        //-------------[ Print list of defined Thunders ]---------------
        case '.list':
          console.log("=== List of Thunder Nodes ===");
          nodes.nodes.forEach((node,i) => {
            if (node.addr == opts.IPAddr) {    // current node is active...
              console.log("*" + (i+1).toString() + ": " + node.name + " (" + node.addr + ")");
            } else {
              console.log(" " + (i+1).toString() + ": " + node.name + " (" + node.addr + ")");
            }
          });
          processCmdline('');
          break;
        //-------------[ load in cmd file and send to Thunder ]---------------
        case '.load':
          var cmds;
          var rr = cmd.split(' ');
          var path = config.scriptDir + "/" + rr[1];
          try {
            cmds = fs.readFileSync(path, 'utf8');
            if (cmds.length < CMDBUFSIZE) {
              sendCmd2Thunder(cmds);
            } else {
              lines = cmds.split(/\n/);
              if (a10.DEBUG() > 8) { console.log("CMDS:\n" + cmds); }
              processCmdFile(0);
            }
          } catch(err) {
            console.log("--Unable to Load in Commands. " + err);
            processCmdline('');
          }
          break;
        //-------------[ Show scripts directory ]---------------
        case '.dir':
          var files = dir(config.scriptDir);
          if (files[0] == "ERROR") {
            console.log("--Error: Unable to read Scripts Directory.");
            processCmdline('');
          } else {
            console.log("-----[ Scripts Directory Listing ]-----")
            files.forEach((ff) => {
              console.log(ff);
            });
            processCmdline('');
          }
          break;
        //-------------[ Show scripts directory ]---------------
        case '.cat':
          var file;
          var rr = cmd.split(' ');
          var path = config.scriptDir + "/" + rr[1];
          try {
            file = fs.readFileSync(path, 'utf8');
            console.log("-------[ File: " + rr[1] + " ]--------");
            console.log(file);
            processCmdline('');
          } catch(err) {
            console.log("--Unable to List File " + rr[1]);
            console.log("--Error: " + err);
            processCmdline('');
          }
          break;
        //-------------[ Factory Reset of active Thunder ]---------------
        case '.wipe':
          readline.question("Are you sure? (Y/N)", (out) => {
            if (out == "y" || out == "Y") {
              console.log("== Wiping Configuration from Thunder ==");
              console.log("This takes a few minutes and forces the Thunder to reload.\n");
              a10.erase().then((out) => {
                console.log("== Thunder Config Reset to Factory Defaults ==");
                processCmdline('');
              }).catch((err) => {
                console.log("== Thunder Config Reset to Factory Defaults ==");
                console.log(err);
                processCmdline('');
              });
            } else {
              processCmdline('');
            }
          });
          break;
        //-------------[ Reboot active Thunder ]---------------
        case '.reboot':

          processCmdline('');
          break;
        //-------------[ No Command; just send to Thunder ]---------------
        default:
          sendCmd2Thunder(cmd);
      }
    });
  } else {        // Multi-line mode!

    readline.question(mlprompt, (out) => {
      if (out == '.') {       // End ML mode & submit
        if (config.DEBUG > 8) { console.log(">>" + line + "<<"); }
        sendCmd2Thunder(line);
        line = '';
      } else {
        line += out + '\n';
        processCmdline('.');
      }
    });
  }
}

//----------------------[  sendCmd2Thunder()   ]----------------------------
function sendCmd2Thunder(cmd) {
  a10.cli_deploy(cmd).then((out) => {
    if (config.DEBUG > 8) { console.log(">>" + out + "<<"); }
    out.replace(/\nDone\n.*$/, '\n');       // Chop off the 'Done' line that aXAPI adds for some silly reason!
    //setTimeout(function() { console.log(out); }, 100);      // don't print until .replace() is finished.
    if (hexflag) {
      console.log(hexdump(out));
    } else {
      console.log(out.replace(/\nDone\n.*$/, '\n'));
    }
    processCmdline('');
  }).catch((err) => {
    if (config.DEBUG > 8) { console.log(err); }
    if (err.msg.indexOf("[401]") != -1) {
      a10.authorize().then((out) => {
        // out = AuthToken
        sendCmd2Thunder(cmd);
        // in theory this call will now work and we don't have to call
        // processCmdLine() here.
      }).catch((err) => {
        console.log("Error: Unable to re-authorize. Quitting...");
        process.exit(1);
      });
    } else {
      console.log("--Error Returned: " + err.msg);
      processCmdline('');
    }
  });
}

//----------------------[  processCmdFile()   ]----------------------------
function processCmdFile(ptr) {
  // ptr => current line to process
  if (ptr +1 > lines.length) {
    // send out whats left
    // console.log(">>>>Finish " + csize.toString());
    // console.log(out);
    // console.log("<<<LastChunk>>>\n" + chunk);
    a10.cli_deploy(out).then((rtn) => {
      console.log(rtn);
      a10.cli_deploy(chunk).then((rtn) => {
        console.log(rtn);
        processCmdLine('');
      }).catch((err) => {
        console.log("--Error Returned: " + err.msg);
        processCmdline('');
      });
    }).catch((err) => {
      console.log("--Error Returned: " + err.msg);
      processCmdline('');
    });
    return;
  }
  var line = lines[ptr];
  if (line.startsWith('!') || line == '\n') {
    // break in the commands; check to see if we need to send
    if (csize > CMDBUFSIZE) {
      //current chunk makes 'out' too big, just send the current 'out'.
      a10.cli_deploy(out).then((rtn) => {
        console.log(rtn);
        // console.log(">>chunk send<<" + (csize - chunk.length).toString());
        // console.log(out);
        out = chunk + line + '\n';      // put current chunk into out
        chunk = "";
        csize = out.length;
        processCmdFile(ptr +1);
      }).catch((err) => {
        console.log("--Error Returned: " + err.msg);
        processCmdline('');
      });
    } else {
      // still under BUFSIZE; add chunk to out
      out += chunk + line + '\n';
      csize += line.length + 1;
      chunk = "";
      processCmdFile(ptr +1);
    }
  } else {
    chunk += line + '\n';
    csize += line.length + 1;
    processCmdFile(ptr +1);
  }
}

//----------------------[  showInfo()   ]----------------------------
function showInfo() {
  console.log("----------------------");
  console.log("  Hostname: " + a10.Hostname());
  console.log("   Address: " + opts.IPAddr);
  console.log("   Version: " + a10.Version());
  console.log(" AuthToken: " + a10.AuthToken());
  console.log("----------------------");
}


//----------------------[  abort()   ]----------------------------
function abort() {
  a10.logoff().then((out) => {
    // should return 'OK'
    process.exit(1);
  }).catch((err) => {
    console.log("--Error on Thunder Logoff. Disconnting...");
    process.exit(2);
  })
}

//----------------------[  help()   ]----------------------------
function help() {
  console.log("==================================================================================");
  console.log("::A10 Thunder Command Processor:: -v" + VERSION);
  console.log("--Connected to: " + a10.Hostname() + " at " + opts.IPAddr + "    Enter '.help' for info.");
  console.log("==================================================================================");
  console.log("Type any valid ACOS command and hit enter to send it to Thunder");
  console.log("  '.'  => Put Command Processor into Multi-Line Mode.  Multi-line commands can be");
  console.log("          enterted using this mode.");
  console.log("  .?   => Show Thunder connection information.");
  console.log(" .list => List predefined Thunder nodes (./thunder_nodes.json)");
  console.log(" .open => .open {# from .list command} - connect to listed Thunder.");
  console.log("  .hex => .hex (on|off) - hexdump the output from Thunder.");
  console.log("  .dir => Show scripts directory listing.");
  console.log(" .load => .load {ACOS Script filename} - Loads in ACOS command file and sends to Thunder.");
  console.log("  .cat => .cat {ACOS Script filename} - Prints out ACOS command file contents.");
  console.log(" .wipe => Clear configuration but retain MGMT port & User settings.")
  console.log(".reset => Does a Factory Reset on the active Thunder. Leaves MGMT IP alone.")
  console.log(" .help => Shows this text.");
  console.log(" .quit => Logoff Thunder and quit the program.");
  console.log("==================================================================================")
}

function about() {
  var out = "";
  out += "==================================================================================\n";
  out += "::A10 Thunder Command Processor:: -- About\n";
  out += "==================================================================================\n";
  out += "This program uses the aXAPI REST API to communcate and send commands to a\n";
  out += "connected A10 Thunder device. There is NO SSH session involved -- just API calls.\n";
  out += "\n";
  out += "Written by:\n";
  out += "\tJohn D. Allen\n";
  out += "\tSr. Solutions Engineer\n";
  out += "\tA10 Networks Inc.\n";
  out += "\tCopyright (C) 2019, All Rights Reserved\n";
  out += "\n";
  out += "May 2019 - Version:" + VERSION +"\n";
  out += "==================================================================================\n";
  console.log(out);
}
