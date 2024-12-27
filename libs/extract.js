const { baseParse } = require('@vue/compiler-core');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default; 
const fs = require('fs');
const path = require('path');

// 提取中文
function _extract(stack) {
    let chinese = []
    const strategy = {
        "template": (template) => {
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
                                    chineseTexts.push({ type: "PROP", value: attrValue });
                                }
                            }

                            if (prop.exp) {
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
                        chineseTexts.push({ type: "TAG", value: node.content });
                    }
                } else if (node.type === 5 /* NodeTypes.{{ variable }} */) {
                    const content = node.content ? node.content.content : "";
                    if (content && /[\u4e00-\u9fa5]/g.test(content)) {
                        const matches = content.match(/[\u4e00-\u9fa5]+/g) || [];
                        chineseTexts.push(...matches.map(item => ({ type: "TAG_COMPLEX", value: item })));
                    }
                }
            }

            traverse(ast.children[0]);
            return chineseTexts;
        },
        "script": (scripts) => {
            function extractScriptChinese(scriptContent) {
                const ast = parse(scriptContent, {
                    sourceType: 'module', // 按照模块化方式解析
                });

                const chineseTexts = [];
                const chineseRegex = /[\u4e00-\u9fa5]+/g;

                traverse(ast, {
                    StringLiteral(path) {
                        const value = path.node.value;
                        const matches = value.match(chineseRegex);
                        if (matches) {
                            chineseTexts.push(...matches.map(item => ({ type: "STRING_LITERAL", value: item })));
                        }
                    },
                    TemplateLiteral(path) {
                        path.node.quasis.forEach(quasi => {
                            const value = quasi.value.raw;
                            const matches = value.match(chineseRegex);
                            if (matches) {
                                chineseTexts.push(...matches.map(item => ({ type: "TEMPLATE_LITERAL", value: item })));
                            }
                        });
                    },
                    // 处理 JSX 文本节点 (如果在 script 中使用了 JSX)
                    JSXText(path) {
                        const value = path.node.value.trim();
                        if (value && chineseRegex.test(value)) {
                            const matches = value.match(chineseRegex);
                            if (matches) {
                                chineseTexts.push(...matches.map(item => ({ type: "JSX_TEXT", value: item })));
                            }
                        }
                    },
                    // 排除注释内容
                    enter(path) {
                        if (path.node.leadingComments) {
                            for (const comment of path.node.leadingComments) {
                                const matches = comment.value.match(chineseRegex);
                                if (matches) {
                                    // 从 chineseTexts 中移除当前注释中匹配到的中文
                                    matches.forEach(match => {
                                        const index = chineseTexts.findIndex(item => item.value === match);
                                        if (index > -1) {
                                            chineseTexts.splice(index, 1);
                                        }
                                    });
                                }
                            }
                        }
                        if (path.node.trailingComments) {
                            for (const comment of path.node.trailingComments) {
                                const matches = comment.value.match(chineseRegex);
                                if (matches) {
                                    // 从 chineseTexts 中移除当前注释中匹配到的中文
                                    matches.forEach(match => {
                                        const index = chineseTexts.findIndex(item => item.value === match);
                                        if (index > -1) {
                                            chineseTexts.splice(index, 1);
                                        }
                                    });
                                }
                            }
                        }
                    },
                });

                return chineseTexts;
            }
            return extractScriptChinese(scripts)
        }
    }
    stack.forEach(task => chinese.push(...strategy[task.type](task.content)))

    return chinese
}

function extract(target) {
    const words = [];

    function processFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const templateRegex = /([\w\W]*)<template>([\w\W]*)<\/template>([\w\W]*)/g
        const scriptRegex = /([\w\W]*)<script>([\w\W]*)<\/script>([\w\W]*)/g

        const chineses = _extract([
            { type: "template", content: content.replace(templateRegex, (_, _m1,m2) => m2) },
            { type: "script", content: content.replace(scriptRegex, (_, _m1, m2) => m2) }
        ]);
        chineses.forEach(word => words.push({ ...word, value: word.value.trim() }));
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
