var assert = require('assert');
var { extract, process } = require('../lib');
var path = require('path')

const exactedWords = extract(path.join(__dirname, "source"))

process({
    module: "test",
    directory: path.join(__dirname, "source"),
    output: path.join(__dirname, "source/output.json")
})