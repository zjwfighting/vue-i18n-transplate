const { baseParse } = require('@vue/compiler-core');
const fs = require('fs');
const path = require('path');

// 提取template中的中文
function _extract(template) {
    const ast = baseParse(template);
    const chineseTexts = [];
    const chineseRegex = /[\u4e00-\u9fa5]/;

    function traverse(node) {
        if (node.type === 1 /* NodeTypes.ELEMENT */) {
            if (node.props && node.props.length) {
                for (const prop of node.props) {
                    if (prop.value) {
                        const attrValue = prop.value.content;
                        if (attrValue && chineseRegex.test(attrValue)) {
                            chineseTexts.push(attrValue);
                        }
                    }
                }
            }

            if (node.children && node.children.length) {
                for (const child of node.children) {
                    traverse(child)
                }
            }
        } else if (node.type === 2 /* NodeTypes.TEXT */) {
            if (node.content && chineseRegex.test(node.content)) {
                chineseTexts.push(node.content);
            }
        }
    }

    traverse(ast.children[0]);
    return chineseTexts;
}
function extract(target) {
    const words = new Set();

    function processFile(filePath) {
        let batch = _extract(fs.readFileSync(filePath, 'utf-8'));
        batch.forEach(word => words.add(word.trim()));
    }

    function processDirectory(dirPath) {
        const files = fs.readdirSync(dirPath);
        files.forEach(file => {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
                processDirectory(filePath);
            } else if (stats.isFile()) {
                processFile(filePath);
            }
        });
    }

    const stats = fs.statSync(target);

    if (stats.isDirectory()) {
        processDirectory(target);
    } else if (stats.isFile()) {
        processFile(target);
    } else {
        console.error("Invalid target. Must be a file or directory.");
    }

    return Array.from(words);
}

module.exports = extract