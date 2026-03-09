const fetch = require("node-fetch");

async function _translate(words, apikey, from, to) {
    try {
        const res = await fetch(`http://api.niutrans.com/NiuTransServer/translationArray`, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from, to, apikey, src_text: words })
        });

        if (!res.ok) {
            throw new Error(`翻译API请求失败: ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        if (data.error_code) {
            throw new Error(`翻译API错误: [${data.error_code}] ${data.error_msg}`);
        }

        return (data.tgt_list || []).map(item => item.tgt_text);

    } catch (e) {
        throw new Error(`翻译请求异常 (${to}): ${e.message}`);
    }
}

async function translate(words = [], apikey, options = {}) {
    if (words.length === 0) return {};

    const from = options.from || "zh";
    const toLangs = Array.isArray(options.to) ? options.to : [options.to || "en"];

    const MAX_TOKENS = 4800;
    const MAX_LENGTH = 50;
    const MAX_CONCURRENT = 4;

    // 分块
    const wordsQueue = [];
    let chunk = [];
    for (const word of words) {
        if (chunk.length >= MAX_LENGTH || (chunk.join("").length + word.length) >= MAX_TOKENS) {
            wordsQueue.push(chunk);
            chunk = [word];
        } else {
            chunk.push(word);
        }
    }
    if (chunk.length > 0) wordsQueue.push(chunk);

    // 所有语言的所有分块打平成一个任务队列
    const tasks = [];
    for (const lang of toLangs) {
        for (const c of wordsQueue) {
            tasks.push({ lang, chunk: c });
        }
    }

    // 全局限流执行
    const results = new Array(tasks.length);
    let cursor = 0;

    async function runNext() {
        while (cursor < tasks.length) {
            const idx = cursor++;
            const { lang, chunk } = tasks[idx];
            results[idx] = { lang, data: await _translate(chunk, apikey, from, lang) };
        }
    }

    // 启动 MAX_CONCURRENT 个 worker 并行消费
    const workers = Array.from(
        { length: Math.min(MAX_CONCURRENT, tasks.length) },
        () => runNext()
    );
    
    try {
        await Promise.all(workers);
    } catch (e) {
        console.error("翻译过程中发生严重错误，流程终止。");
        throw e;
    }

    // 按语言重组结果
    const langChunks = {};
    toLangs.forEach(lang => { langChunks[lang] = []; });

    for (const r of results) {
        langChunks[r.lang].push(r.data);
    }

    const output = {};
    for (const lang of toLangs) {
        output[lang] = langChunks[lang].flat();
    }

    return output;
}

module.exports = translate;