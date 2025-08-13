const fetch = require("node-fetch");

async function _translate(word, apikey) {
    try {
        const res = await fetch(`http://api.niutrans.com/NiuTransServer/translationArray`, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from: "zh",
                to: "en",
                apikey: apikey,
                src_text: word
            })
        });

        if (!res.ok) {
            // 处理HTTP错误状态
            throw new Error(`翻译API请求失败: ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        // 检查API返回的业务错误
        if (data.error_code) {
             throw new Error(`翻译API错误: [${data.error_code}] ${data.error_msg}`);
        }
        
        return (data.tgt_list || []).map(item => item.tgt_text);

    } catch (e) {
        // 将捕获到的错误继续向上抛出
        throw new Error(`翻译请求异常: ${e.message}`);
    }
}

// 翻译 (增加了更稳健的并发控制和错误处理)
async function translate(words = [], apikey) {
    if (words.length === 0) return [];

    const MAX_TOKENS = 4800; // API限制5000，保守一点
    const MAX_LENGTH = 50; 
    const MAX_CONCURRENT = 4; // 每秒最大并发
    let wordsQueue = [], translatedQueue = [];

    // 分块
    let chunk = [];
    for (let word of words) {
        if (chunk.length >= MAX_LENGTH || (chunk.join("").length + word.length) >= MAX_TOKENS) {
            wordsQueue.push(chunk);
            chunk = [word];
        } else {
            chunk.push(word);
        }
    }
    if (chunk.length > 0) {
        wordsQueue.push(chunk);
    }

    const allPromises = [];
    for (let i = 0; i < wordsQueue.length; i++) {
        const chunk = wordsQueue[i];
        // 使用延时来控制并发，避免瞬间请求过多
        const promise = new Promise((resolve, reject) => {
            setTimeout(() => {
                _translate(chunk, apikey).then(resolve).catch(reject);
            }, Math.floor(i / MAX_CONCURRENT) * 1000); 
        });
        allPromises.push(promise);
    }

    try {
        const translatedChunks = await Promise.all(allPromises);
        translatedChunks.forEach(list => translatedQueue.push(...list));
    } catch (e) {
        // 捕获到任何一个翻译请求的失败，就立即向上抛出，中断整个流程
        console.error("翻译过程中发生严重错误，流程终止。");
        throw e; 
    }

    return translatedQueue;
}

module.exports = translate;