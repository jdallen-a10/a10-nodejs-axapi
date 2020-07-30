//
//  dir.js  --  return array of files in path
//
//  John D. Allen
//  Jan 2012
//

var fs = require('fs');

module.exports = function(path) {
  var files;
  try {
    files = fs.readdirSync(path)
    return files; 
  } catch(err) {
    return ["ERROR"];
  }
}
