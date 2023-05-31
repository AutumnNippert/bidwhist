function print(message = "\n") {
    console.log(message);
    log(message)
}

function log(message = "\n", file = '.log') {
    const fs = require('fs');
    fs.appendFileSync(file, message + '\n');
}

module.exports = { print, log };