const { parse: vueSfcParse } = require('@vue/compiler-sfc');
const { baseParse: vueTemplateParse } = require('@vue/compiler-core');
const { parse: babelParse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const fs = require('fs');
const path = require('path');

const SUPPORTED_EXTENSIONS = ['.vue', '.js', '.jsx', '.ts', '.tsx'];
const CHINESE_REGEX = /[\u4e00-\u9fa5]/;

function extractFromVueTemplate(templateContent) {
    if (!templateContent) return [];
    
    const ast = vueTemplateParse(templateContent);
    const texts = [];

    function traverseNode(node) {
        // 1. 元素节点属性
        if (node.type === 1 /* ELEMENT */) {
            if (node.props) {
                for (const prop of node.props) {
                    // 静态属性: title="你好"
                    if (prop.type === 6 /* ATTRIBUTE */ && prop.value && CHINESE_REGEX.test(prop.value.content)) {
                        texts.push({ type: "PROP", value: prop.value.content });
                    }
                    // 动态属性: :title="'你好' + world"
                    if (prop.type === 7 /* DIRECTIVE */ && prop.exp && prop.exp.content) {
                        const matches = prop.exp.content.match(/'([^']*)'|"([^"]*)"/g) || [];
                        matches.forEach(match => {
                            const value = match.slice(1, -1);
                            if (CHINESE_REGEX.test(value)) {
                                texts.push({ type: "PROP_COMPLEX", value });
                            }
                        });
                    }
                }
            }
        }
        // 2. 文本节点: <div>你好</div>
        else if (node.type === 2 /* TEXT */) {
            if (CHINESE_REGEX.test(node.content)) {
                texts.push({ type: "TAG", value: node.content.trim() });
            }
        }
        // 3. 插值: {{ '你好' }}
        else if (node.type === 5 /* INTERPOLATION */) {
            const content = node.content.content || "";
            if (CHINESE_REGEX.test(content)) {
                const matches = content.match(/'([^']*)'|"([^"]*)"/g) || [];
                matches.forEach(match => {
                    const value = match.slice(1, -1);
                    if (CHINESE_REGEX.test(value)) {
                        texts.push({ type: "TAG_COMPLEX", value });
                    }
                });
            }
        }

        if (node.children) {
            for (const child of node.children) {
                traverseNode(child);
            }
        }
    }

    traverseNode(ast);
    return texts.filter(t => t.value);
}

function extractFromScript(scriptContent) {
    if (!scriptContent) return [];

    try {
        const ast = babelParse(scriptContent, {
            sourceType: 'module',
            plugins: ['jsx', 'typescript'], // 支持TS和JSX
            comments: false, //  <--【关键修正】直接让解析器忽略注释
        });

        const texts = [];
        traverse(ast, {
            StringLiteral(path) {
                if (CHINESE_REGEX.test(path.node.value)) {
                    // 检查父节点是否为JSXAttribute，以区分普通字符串和JSX属性
                    const type = path.parentPath.isJSXAttribute() ? "JSX_ATTRIBUTE" : "STRING_LITERAL";
                    texts.push({ type, value: path.node.value });
                }
            },
            TemplateLiteral(path) {
                path.node.quasis.forEach(quasi => {
                    if (CHINESE_REGEX.test(quasi.value.raw)) {
                        // 提取模板字符串中的纯文本部分
                        const chineseParts = quasi.value.raw.match(/[\u4e00-\u9fa5][^\${]*/g) || [];
                        chineseParts.forEach(part => {
                           if(part.trim()){
                             texts.push({ type: "TEMPLATE_LITERAL", value: part.trim() });
                           }
                        })
                    }
                });
            },
            JSXText(path) {
                const value = path.node.value.trim();
                if (value && CHINESE_REGEX.test(value)) {
                    texts.push({ type: "JSX_TEXT", value });
                }
            },
        });

        return texts;
    } catch (e) {
        // 提供更详细的错误日志
        console.error(`Babel parsing error in a script block. Content might be invalid. Error: ${e.message}`);
        return [];
    }
}

function extract(targetPath) {
    const words = [];

    function processFile(filePath) {
        console.log(`  - 提取自: ${filePath}`);
        const content = fs.readFileSync(filePath, 'utf-8');
        const extension = path.extname(filePath);

        if (extension === '.vue') {
            const { descriptor } = vueSfcParse(content, { filename: filePath });
            words.push(...extractFromVueTemplate(descriptor.template && descriptor.template.content));
            if (descriptor.script) {
                words.push(...extractFromScript(descriptor.script.content));
            }
            if (descriptor.scriptSetup) {
                words.push(...extractFromScript(descriptor.scriptSetup.content));
            }
        } else if (SUPPORTED_EXTENSIONS.includes(extension)) {
            words.push(...extractFromScript(content));
        }
    }

    function traverseDir(dirPath) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            // 忽略 node_modules 和 dist 等目录
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

    const stats = fs.statSync(targetPath);
    if (stats.isDirectory()) {
        traverseDir(targetPath);
    } else if (stats.isFile() && SUPPORTED_EXTENSIONS.includes(path.extname(targetPath))) {
        processFile(targetPath);
    }

    // 过滤掉空的value
    return words.filter(word => word.value && word.value.trim());
}

module.exports = extract;