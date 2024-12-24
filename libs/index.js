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

const buildLanguagePacks = async (zhWords, apikey) => {
    const enWords = await translate(zhWords.map(item => item.value), apikey);
    const zh = {};
    const en = {};
    const map = {};

    zhWords.forEach((zhWord, index) => {
        const { value, type } = zhWord;
        const enWord = enWords[index] || "";
        const key = generateKey(enWord) || value;

        zh[key] = value;
        en[key] = enWord;
        map[value] = { key, type };
    });

    return { zh, en, map };
};

async function process(options = {}) {
    const { dir, module = "module", apikey } = options;

    if (!dir) throw new Error("dir, apikey是必填参数")

    try {
        const zhWords = extract(dir);
        const { zh, en, map } = await buildLanguagePacks(zhWords, apikey);

        replace(dir, { module, lang: map });

        fs.writeFileSync(`${module}.json`, JSON.stringify({ zh, en, map }));
        console.log(`文件已写入: ${module}.json`);
    } catch (error) {
        console.error('处理失败：', error);
    }
}

module.exports = { process, translate, extract, replace };
