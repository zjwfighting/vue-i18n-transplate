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
                            chineseTexts.push({ type: "PROP",  value: attrValue});
                        }
                    }

                    if(prop.exp) {
                        const attrValue = prop.exp.content;
                        if (attrValue && /[\u4e00-\u9fa5]/g.test(attrValue)) {
                            const matches = attrValue.match(/[\u4e00-\u9fa5]+/g) || [];
                            chineseTexts.push(...matches.map(item => ({ type: "PROP_COMPLEX", value: item })))
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
                chineseTexts.push({type: "TAG", value: node.content});
            }
        } else if (node.type === 5 /* NodeTypes.{{ variable }} */) {
            const content = node.content? node.content.content: "";
            if (content && /[\u4e00-\u9fa5]/g.test(content)) {
                const matches = content.match(/[\u4e00-\u9fa5]+/g) || [];
                chineseTexts.push(...matches.map(item => ({ type: "TAG_COMPLEX", value: item })));
            }
        }
    }

    traverse(ast.children[0]);
    return chineseTexts;
}

function extract(target) {
    const words = [];

    function processFile(filePath) {
        let batch = _extract(fs.readFileSync(filePath, 'utf-8'));
        batch.forEach(word => words.push({ ...word, value: word.value.trim()}));
    }

    function processDirectory(dirPath) {
        const files = fs.readdirSync(dirPath);
        files.forEach(file => {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            console.log("exact:", filePath)
            if (stats.isDirectory()) {
                processDirectory(filePath);
            } else if (stats.isFile() && path.extname(filePath) === ".vue") {
                processFile(filePath);
            }
        });
    }

    const stats = fs.statSync(target);

    console.log("exact:", target)
    if (stats.isDirectory()) {
        processDirectory(target);
    } else if (stats.isFile() && path.extname(target) === ".vue") {
        processFile(target);
    }

    return words;
}

module.exports = extract
