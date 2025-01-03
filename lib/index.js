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
    const queue = [];

    zhWords.forEach((zhWord, index) => {
        const { value, type } = zhWord;
        const enWord = enWords[index] || "";
        let key = generateKey(enWord) || value;

        while(key in en && en[key] !== enWord) {
            key += '_'
        }

        zh[key] = value;
        en[key] = enWord;
        queue.push({
            key, 
            type,
            zh: value,
            en: enWord
        })
    });

    return { zh, en, queue };
};

async function process(options = {}) {
    const { dir, module = "module", apikey } = options;

    if (!dir) throw new Error("dir, apikey是必填参数")

    try {
        const zhWords = extract(dir);
        const { zh, en, queue } = await buildLanguagePacks(zhWords, apikey);

        replace(dir, { module, taskQueue: queue });

        fs.writeFileSync(`${module}.json`, JSON.stringify({ zh, en }));
        console.log(`文件已写入: ${module}.json`);
    } catch (error) {
        console.error('处理失败：', error);
    }
}

module.exports = { process, translate, extract, replace };