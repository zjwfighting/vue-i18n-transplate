const fs = require('fs');
const path = require('path');

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // '$&' 表示匹配到的子字符串
}

// 替换中文
function replaceChinese(target, options) {
    const { module = "default", taskQueue = [] } = options;

    function processFile(filePath) {
        let content = fs.readFileSync(filePath, 'utf-8')

        for (const task of taskQueue) {
            const { type, key, zh } = task
            const escZh = escapeRegExp(zh) //对正则中的特殊字符进行转义

            if (type === "TAG_COMPLEX") {
                // 替换标签内的组合类型 {{ "你好" + name }}
                const TAG_COMPLEX_PLUGINS = [
                    (c) => {
                        const regex = new RegExp(`({{[\\W\\w]*)(['"]${escZh}['"])([\\W\\w]*}})`, 'g');
                        return c.replace(regex, (_, m1, _m2, m3) => {
                            return `${m1}$t("${module}.${key}")${m3}`
                        });
                    },
                ]

                TAG_COMPLEX_PLUGINS.forEach(resolve => {
                    content = resolve(content)
                })
            }

            if (type === "TAG") {
                // 替换标签内的中文
                const TAG_PLUGINS = [
                    (c) => {
                        const regex = new RegExp(`(>[\\s\\n]*)(${escZh})([\\s\\n]*<)`, 'g');
                        return c.replace(regex, (_, m1, _m2, m3) => {
                            return `${m1}{{ $t("${module}.${key}") }} ${m3}`
                        });
                    },
                    (c) => {
                        const regex = new RegExp(`(>[\\s\\n]*)(${escZh})([\\s\\n]*{{)`, 'g');
                        return c.replace(regex, (_, m1, _m2, m3) => {
                            return `${m1}{{ $t("${module}.${key}") }} ${m3}`
                        });
                    },
                    (c) => {
                        const regex = new RegExp(`(}}[\\s\\n]*)(${escZh})([\\s\\n]*{{)`, 'g');
                        return c.replace(regex, (_, m1, _m2, m3) => {
                            return `${m1}{{ $t("${module}.${key}") }} ${m3}`
                        });
                    },
                    (c) => {
                        const regex = new RegExp(`(}}[\\s\\n]*)(${escZh})([\\s\\n]*<)`, 'g');
                        return c.replace(regex, (_, m1, _m2, m3) => {
                            return `${m1}{{ $t("${module}.${key}") }}${m3}`
                        });
                    }
                ]

                TAG_PLUGINS.forEach(resolve => {
                    content = resolve(content)
                })
            }

            if (type === "PROP_COMPLEX") {
                // 替换标签属性中的组合中文 :title="'你好' + world"
                const regex = new RegExp(`(\\s*:?[a-zA-Z-]+)="([\\W\\w]*)(['"]${escZh}['"])([\\W\\w]*)"`, 'g');
                content = content.replace(regex, (_, m1, m2, _m3, m4) => {
                    let attr = m1.trim();
                    return ` ${attr.charAt(0) === ':' ? attr : ':' + attr}="${m2}$t('${module}.${key}')${m4}"`
                });
            }

            if (type === "PROP") {
                // 替换标签属性中的中文
                const regex = new RegExp(`(\\s*:?[a-zA-Z-]+)="(${escZh})"`, 'g');
                content = content.replace(regex, (_, m1) => {
                    let attr = m1.trim();
                    return ` ${attr.charAt(0) === ':' ? attr : ':' + attr}="$t('${module}.${key}')"`
                });
            }

            if (type === "STRING_LITERAL") {
                const regex = new RegExp(`(<script>[\\W\\w]*)(["']${escZh}['"])([\\W\\w]*<\/script>)`, 'g');
                content = content.replace(regex, (_, m1, _m2, m3) => {
                    return `${m1}this.$t("${module}.${key}")${m3}`
                });
            }

            if (type === "TEMPLATE_LITERAL") {
                const regex = new RegExp(`(${'`'}[\\W\\w]*?)(${escZh})([\\W\\w]*?${'`'})`, 'g');
                content = content.replace(regex, (_, m1, _m2, m3) => {
                    return `${m1}\${this.$t("${module}.${key}")}${m3}`
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