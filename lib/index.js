const fs = require('fs');
const translate = require('./translate');
const extract = require('./extract');
const replace = require('./replace');

const generateKey = (enWords) => {
    if (!enWords) return '';
    return enWords
        .split(/[\s\W_]+/g) // 使用更健壮的正则来分割单词
        .filter(item => item.trim())
        .slice(0, 3)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
};

const buildLanguagePacks = async (zhWords, apikey) => {
    // 去重，避免重复翻译和生成key
    const uniqueZhWordsMap = new Map();
    zhWords.forEach(word => {
        if (!uniqueZhWordsMap.has(word.value)) {
            uniqueZhWordsMap.set(word.value, word);
        }
    });
    const uniqueZhWords = Array.from(uniqueZhWordsMap.values());

    const enWords = await translate(uniqueZhWords.map(item => item.value), apikey);
    const zh = {};
    const en = {};
    const keyCount = {}; // 用于处理key冲突

    uniqueZhWords.forEach((zhWord, index) => {
        const { value, type } = zhWord; // 注意：这里的type可能不唯一，但替换逻辑是基于value，所以问题不大
        const enWord = enWords[index] || "";
        let baseKey = generateKey(enWord) || generateKey(value); // 如果英文翻译失败，用中文生成key
        let key = baseKey;

        // 更健壮的 key 冲突处理
        if (key in zh && zh[key] !== value) {
            keyCount[baseKey] = (keyCount[baseKey] || 0) + 1;
            key = `${baseKey}_${keyCount[baseKey]}`;
        } else {
             keyCount[baseKey] = 0;
        }

        zh[key] = value;
        en[key] = enWord;
        
        // 为原始提取的每一个中文词（包括重复的）创建任务
        // 这样做是为了让替换逻辑知道所有需要替换的位置
    });

    // 重新生成任务队列，确保每个原始中文词都有一个替换任务
    const finalTaskQueue = zhWords.map(word => {
        const enWord = en[Object.keys(zh).find(key => zh[key] === word.value)] || '';
        const key = Object.keys(zh).find(k => zh[k] === word.value);
        return {
            key,
            type: word.type,
            zh: word.value,
            en: enWord,
        };
    });


    return { zh, en, queue: finalTaskQueue };
};

async function process(options = {}) {
    const { dir, module = "module", apikey } = options;

    if (!dir || !apikey) throw new Error("dir, apikey 是必填参数");

    try {
        console.log('1. 开始提取中文...');
        const zhWords = extract(dir);
        console.log(`提取到 ${zhWords.length} 个中文字符串。`);

        console.log('2. 开始翻译并构建语言包...');
        const { zh, en, queue } = await buildLanguagePacks(zhWords, apikey);
        console.log('语言包构建完成。');

        console.log('3. 开始替换文件内容...');
        replace(dir, { module, taskQueue: queue });
        console.log('文件替换完成。');

        const langFilePath = `${module}.json`;
        fs.writeFileSync(langFilePath, JSON.stringify({ zh, en }, null, 2));
        console.log(`✅ 成功！语言包文件已写入: ${langFilePath}`);

    } catch (error) {
        console.error('处理失败：', error);
    }
}

module.exports = { process, translate, extract, replace };