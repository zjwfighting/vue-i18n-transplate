const fs = require('fs');
const translate = require('./translate');
const extract = require('./extract');
const replace = require('./replace');

const generateKey = (enWords) => {
    if (!enWords) return '';
    return enWords
        .split(/[\s\W_]+/g)
        .filter(item => item.trim())
        .slice(0, 3)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
};

const buildLanguagePacks = async (zhWords, apikey, toLangs) => {
    const uniqueZhWordsMap = new Map();
    zhWords.forEach(word => {
        if (!uniqueZhWordsMap.has(word.value)) {
            uniqueZhWordsMap.set(word.value, word);
        }
    });
    const uniqueZhWords = Array.from(uniqueZhWordsMap.values());

    const translated = await translate(
        uniqueZhWords.map(item => item.value),
        apikey,
        { from: 'zh', to: toLangs }
    );

    // en 始终是第一个，用来生成 key
    const enWords = translated['en'] || [];

    const packs = { zh: {} };
    toLangs.forEach(lang => { packs[lang] = {}; });

    const keyCount = {};

    uniqueZhWords.forEach((zhWord, index) => {
        const { value } = zhWord;
        const enWord = enWords[index] || '';
        let baseKey = generateKey(enWord) || generateKey(value);
        let key = baseKey;

        if (key in packs.zh && packs.zh[key] !== value) {
            keyCount[baseKey] = (keyCount[baseKey] || 0) + 1;
            key = `${baseKey}_${keyCount[baseKey]}`;
        } else {
            keyCount[baseKey] = 0;
        }

        packs.zh[key] = value;
        toLangs.forEach(lang => {
            packs[lang][key] = (translated[lang] || [])[index] || '';
        });
    });

    const queue = zhWords.map(word => {
        const key = Object.keys(packs.zh).find(k => packs.zh[k] === word.value);
        return {
            key,
            type: word.type,
            zh: word.value,
        };
    });

    return { packs, queue };
};

async function process(options = {}) {
    const {
        dir,
        module: moduleName = 'module',
        apikey,
        to = [],  // 额外语言，如 ['ja', 'ko']
    } = options;

    if (!dir || !apikey) throw new Error('dir, apikey 是必填参数');

    // en 内置，去重后合并用户输入
    const extraLangs = (Array.isArray(to) ? to : [to]).filter(l => l && l !== 'en');
    const toLangs = ['en', ...extraLangs];

    try {
        console.log('1. 开始提取中文...');
        const zhWords = extract(dir);
        console.log(`提取到 ${zhWords.length} 个中文字符串。`);

        console.log(`2. 开始翻译（目标语言: ${toLangs.join(', ')}）...`);
        const { packs, queue } = await buildLanguagePacks(zhWords, apikey, toLangs);
        console.log('语言包构建完成。');

        console.log('3. 开始替换文件内容...');
        replace(dir, { module: moduleName, taskQueue: queue });
        console.log('文件替换完成。');

        const langFilePath = `${moduleName}.json`;
        fs.writeFileSync(langFilePath, JSON.stringify(packs, null, 2));
        console.log(`✅ 成功！语言包文件已写入: ${langFilePath}`);
        console.log(`   包含语言: zh, ${toLangs.join(', ')}`);

    } catch (error) {
        console.error('处理失败：', error);
    }
}

module.exports = { process, translate, extract, replace };