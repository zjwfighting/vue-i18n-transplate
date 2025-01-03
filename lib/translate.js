const fetch = require("node-fetch")

async function _translate(word, apikey) {
    let translated = []
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
        })
        const { tgt_list = [] } = await res.json()
        translated = tgt_list.map(item => item.tgt_text)
    } catch (e) {
        throw new Error(`未知错误：${e}`)
    } finally {
        return translated
    }
}


// 翻译
async function translate(words = [], apikey) {
    const MAX_TOKENS = 5000; //最大翻译字符数
    const MAX_LENGTH = 50; //最大翻译长度
    const MAX_CONCURRENT = 4; //每秒最大并发
    let wordsQueue = [], translatedQueue = [];

    try {
        let chunk = []
        for (let word of words) {
            if (chunk.length < MAX_LENGTH && (chunk.join("").length + word.length) < MAX_TOKENS) {
                chunk.push(word)
            } else {
                wordsQueue.push(chunk)
                chunk = [word]
            }
        }
        wordsQueue.push(chunk)

        const r = (chunk, i = 0) => {
            return new Promise((resolve, reject) => {
                // 控制并发
                setTimeout(() => {
                    _translate(chunk, apikey).then(res => {
                        resolve(res || [])
                    }).catch(e => {
                        reject(e)
                    })
                }, i * 1000 / MAX_CONCURRENT)
            })
        }

        const taskQueue = wordsQueue.map((chunk, i) => r(chunk, i))
        const translated = await Promise.all(taskQueue)

        translated.forEach(list => translatedQueue.push(...list))
    } catch (e) {
        console.log(`翻译失败：`, e)
    }

    return translatedQueue
}

module.exports = translate