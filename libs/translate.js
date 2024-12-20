const fetch = require("node-fetch")

async function _translate(word, apikey) {
    if (!word) return "";
    try {
        const res = await fetch(`http://api.niutrans.com/NiuTransServer/translation?from=zh&to=en&apikey=${apikey}&src_text=${encodeURIComponent(word)}`, {
            method: "POST"
        })
        const { tgt_text = "" } = await res.json()
        return tgt_text;
    } catch (e) {
        console.log(`翻译失败 ${word}：`, e)
        return word
    }
}

// 翻译
async function translate(words = [], apikey) {
    const MAX_TOKENS = 2000;
    let wordsQueue = [], translatedQueue = [];

    const translateFn = (word) => _translate(word, apikey)

    try {
        for (let word of words) {
            if (wordsQueue.join("").length < MAX_TOKENS) {
                wordsQueue.push(word)
            } else {
                const translated = await translateFn(JSON.stringify(wordsQueue))
                translatedQueue.push(...JSON.parse(translated))
                wordsQueue = [word]
            }
        }

        if (wordsQueue.length > 1) {
            const translated = await translateFn(JSON.stringify(wordsQueue))
            translatedQueue.push(...JSON.parse(translated))
        }
    } catch (e) {
        console.log(`翻译失败：`, e)
    }

    return translatedQueue
}

module.exports = translate
