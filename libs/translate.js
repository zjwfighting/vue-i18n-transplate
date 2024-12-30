const fetch = require("node-fetch")

async function _translate(word, apikey) {
    let translated = []
    try {
        const res = await fetch(`http://api.niutrans.com/NiuTransServer/translationArray`, {
            method: "POST",
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                from: "zh",
                to: "en",
                apikey: apikey,
                src_text: word
              }  )     
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
    const MAX_TOKENS = 5000;
    const MAX_LENGTH = 50;
    let wordsQueue = [], translatedQueue = [];

    const translateFn = (word) => _translate(word, apikey)

    try {
        for (let word of words) {
            if (wordsQueue.length < MAX_LENGTH && wordsQueue.join("").length < MAX_TOKENS) {
                wordsQueue.push(word)
            } else {
                const translated = await translateFn(wordsQueue)
                translatedQueue.push(...translated)
                wordsQueue = [word]
            }
        }

        if (wordsQueue.length > 0) {
            const translated = await translateFn(wordsQueue)
            translatedQueue.push(...translated)
        }
    } catch (e) {
        console.log(`翻译失败：`, e)
    }

    return translatedQueue
}

module.exports = translate