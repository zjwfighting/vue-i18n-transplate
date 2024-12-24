const fs = require('fs');
const path = require('path');

// 替换中文
function replaceChinese(target, options) {
    const { module = "default", lang = {} } = options;

    function processFile(filePath) {
        let content = fs.readFileSync(filePath, 'utf-8')

        for (const chinese in lang) {
            const { type, key } = lang[chinese]

            if (type === "TAG_COMPLEX") {
                // 替换标签内的组合类型 {{ "你好" + name }}
                const regex = new RegExp(`({{[\\W\\w]*)(['"]${chinese}['"])([\\W\\w]*}})`, 'g');
                content = content.replace(regex, (_, m1, _m2, m3) => {
                    return `${m1}$t("${module}.${key}")${m3}`
                });
            }

            if (type === "TAG") {
                // 替换标签内的中文
                const regex = new RegExp(`>(\\s*)(${chinese})(\\s*)<`, 'g');
                content = content.replace(regex, (_, m1, _m2, m3) => {
                    return `> ${m1}{{ $t("${module}.${key}") }} ${m3}<`
                });
            }

            if (type === "PROP_COMPLEX") {
                // 替换标签属性中的组合中文 :title="'你好' + world"
                const regex = new RegExp(`(\\s*:?[a-zA-Z-]+)="([\\W\\w]*)(['"]${chinese}['"])([\\W\\w]*)"`, 'g');
                content = content.replace(regex, (_, m1, m2, _m3, m4) => {
                    let attr = m1.trim();
                    return ` ${attr.charAt(0) === ':' ? attr : ':' + attr}="${m2}$t('${module}.${key}')${m4}"`
                });
            }

            if (type === "PROP") {
                // 替换标签属性中的中文
                const regex = new RegExp(`(\\s*:?[a-zA-Z-]+)="(${chinese})"`, 'g');
                content = content.replace(regex, (_, m1) => {
                    let attr = m1.trim();
                    return ` ${attr.charAt(0) === ':' ? attr : ':' + attr}="$t('${module}.${key}')"`
                });
            }
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
