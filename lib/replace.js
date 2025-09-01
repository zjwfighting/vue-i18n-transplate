const fs = require('fs');
const path = require('path');

const SUPPORTED_EXTENSIONS = ['.vue', '.js', '.jsx', '.ts', '.tsx'];

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceInTarget(target, options) {
    const { module = "default", taskQueue = [] } = options;
    if (taskQueue.length === 0) return;

    function processFile(filePath) {
        let content = fs.readFileSync(filePath, 'utf-8');
        let previousContent;
        let changed = false;

        // 循环替换，直到没有内容再被改变为止，解决一次替换不完的问题
        do {
            previousContent = content;
            for (const task of taskQueue) {
                const { type, key, zh } = task;
                if (!key) continue; // 如果没有key，无法替换

                const escZh = escapeRegExp(zh);
                
                // Vue Template: >中文<
                if (type === "TAG") {
                    const regex = new RegExp(`(>|\\]\\s*>)(\\s*)(${escZh})(\\s*)(<|\\s*<\\/|\{\{)`, 'g');
                    content = content.replace(regex, (_, m1, m2, _m3, m4, m5) => {
                        return `${m1}${m2}{{ $t("${module}.${key}") }}${m4}${m5}`;
                    });
                }
                
                // Vue Template: {{ '中文' + ... }}
                if (type === "TAG_COMPLEX") {
                    const regex = new RegExp(`(['"])${escZh}\\1`, 'g');
                    content = content.replace(regex, `$t("${module}.${key}")`);
                }

                // Vue Template: title="中文"
                if (type === "PROP") {
                    const regex = new RegExp(`(\\s[a-zA-Z0-9\\-]+)=["'](${escZh})["']`, 'g');
                    content = content.replace(regex, (_, attr) => ` :${attr.trim()}="$t('${module}.${key}')"`);
                }

                // Vue Template: :title="'中文' + var"
                if (type === "PROP_COMPLEX") {
                    const regex = new RegExp(`(['"])${escZh}\\1`, 'g');
                    content = content.replace(regex, `$t('${module}.${key}')`);
                }

                // JS/TS: '中文' or "中文"
                if (type === "STRING_LITERAL") {
                    const regex = new RegExp(`(['"])${escZh}\\1(?!\\s*:)`, 'g'); // 排除CSS伪类等情况
                    content = content.replace(regex, `this.$t("${module}.${key}")`);
                }

                // JS/TS: `中文...`
                if (type === "TEMPLATE_LITERAL") {
                    const regex = new RegExp("`([^`]*)" + escZh + "([^`]*)`", 'g');
                    content = content.replace(regex, (_, m1, m2) => `\`${m1}\${this.$t("${module}.${key}")}${m2}\``);
                }

                // JSX: >中文<
                if (type === "JSX_TEXT") {
                    const regex = new RegExp(`>\\s*${escZh}\\s*<`, 'g');
                    content = content.replace(regex, `>{this.$t("${module}.${key}")}<`);
                }

                // JSX: attr="中文"
                if (type === "JSX_ATTRIBUTE") {
                     const regex = new RegExp(`([a-zA-Z0-9]+)=["']${escZh}["']`, 'g');
                     content = content.replace(regex, `$1={this.$t("${module}.${key}")}`);
                }
            }
            if (content !== previousContent) {
                changed = true;
            }
        } while (content !== previousContent);

        if (changed) {
            console.log(`  - 替换了: ${filePath}`);
            fs.writeFileSync(filePath, content, 'utf-8');
        }
    }

    function traverseDir(dirPath) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            if (['node_modules', 'dist', '.git', '.vscode'].includes(file)) continue;

            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
                traverseDir(filePath);
            } else if (stats.isFile() && SUPPORTED_EXTENSIONS.includes(path.extname(filePath))) {
                processFile(filePath);
            }
        }
    }
    
    const stats = fs.statSync(target);
    if (stats.isDirectory()) {
        traverseDir(target);
    } else if (stats.isFile() && SUPPORTED_EXTENSIONS.includes(path.extname(target))) {
        processFile(target);
    }
}

module.exports = replaceInTarget;