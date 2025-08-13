var { extract, process } = require('../lib');
const path = require('path')

process({
    module: "test",
    dir: path.join(__dirname, "source"),
    output: path.join(__dirname, "source/output.json"),
    apikey: "368f5036ec4c88c2afb9a0705d53c384", //必填：小牛翻译的apikey，单日赠送200000字符翻译额度，可以自己去官网申请
})