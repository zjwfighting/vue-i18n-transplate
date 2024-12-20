var assert = require('assert');
var { extract, process } = require('../libs');
var path = require('path')

const exactedWords = extract(path.join(__dirname, "source"))

describe('#extract function', function () {
    it('should return ["你好~","你是谁？","我是","好的好的"]', function () {
        let words = ["你好~", "你是谁？", "我是", "好的好的"]
        words.forEach((key, index) => {
            assert.equal(key, exactedWords[index]);
        })
    });
});

process({
    module: "test",
    directory: path.join(__dirname, "source"),
    output: path.join(__dirname, "source/output.json")
})