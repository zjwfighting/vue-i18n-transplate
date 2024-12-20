const fs = require('fs');
const translate = require('./translate');
const extract = require('./extract');
const replace = require('./replace');

const generateKey = (enWords) => {
    return enWords
        .split(/[\W]/g)
        .filter(item => item.trim())
        .slice(0, 3)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
};

const buildLanguagePacks = async (zhWords, api) => {
    const enWords = await translate(zhWords, api);
    const zh = {};
    const en = {};
    const map = {};

    zhWords.forEach((zhWord, index) => {
        const enWord = enWords[index] || "";
        const key = generateKey(enWord) || zhWord;

        zh[key] = zhWord;
        en[key] = enWord;
        map[zhWord] = key;
    });

    return { zh, en, map };
};

async function process(options = {}) {
    const { dir, module = "module", api } = options;

    if (!dir) throw new Error("dir是扫描目录，必填参数")

    try {
        const zhWords = extract(dir);
        const { zh, en, map } = await buildLanguagePacks(zhWords, api);

        replace(dir, { module, lang: map });

        fs.writeFileSync(`module.json`, JSON.stringify({ zh, en, map }));
        console.log(`文件已写入: ${output}`);
    } catch (error) {
        console.error('处理失败：', error); // Use console.error for errors
    }
}


module.exports = { process, translate, extract, replace };