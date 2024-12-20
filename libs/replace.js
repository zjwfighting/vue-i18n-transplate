const fs = require('fs');
const path = require('path');

// 替换中文
function replaceChinese(target, options) {
    const { module = "default", lang = {} } = options;

    function processFile(filePath) {
        let content = fs.readFileSync(filePath, 'utf-8');

        // 替换标签内的中文
        for (const chinese in lang) {
            const regex = new RegExp(`>(\\s*)(${chinese})(\\s*)<`, 'g');
            content = content.replace(regex, `> $1{{ $t("${module}.${lang[chinese]}") }} $3<`);
        }

        // 替换标签属性中的中文
        for (const chinese in lang) {
            const regex = new RegExp(`(\\s[a-zA-Z-]+)="(${chinese})"`, 'g');
            content = content.replace(regex, (_, m1) => {
                return ` :${m1.trim()}="$t('${module}.${lang[chinese]}')" `
            });
        }

        fs.writeFileSync(filePath, content);
    }


    const stats = fs.statSync(target);

    if (stats.isDirectory()) {
        const files = fs.readdirSync(target);
        files.forEach(file => {
            const filePath = path.join(target, file);
            replaceChinese(filePath, options); // Recursively process subdirectories
        });
    } else if (stats.isFile() && path.extname(target) === ".vue") {
        processFile(target);
    }
}

module.exports = replaceChinese;
