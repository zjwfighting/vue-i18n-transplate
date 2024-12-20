# vue-i18n-translate

[![NPM Version](https://img.shields.io/npm/v/vue-i18n-translate.svg)](https://www.npmjs.com/package/vue-i18n-translate)
[![License](https://img.shields.io/npm/l/vue-i18n-translate.svg)](https://www.npmjs.com/package/vue-i18n-translate)
[![Downloads](https://img.shields.io/npm/dm/vue-i18n-translate.svg)](https://www.npmjs.com/package/vue-i18n-translate)

一个 Vue.js i18n 辅助插件，用于批量扫描指定文件夹下的所有文件，将文件中的中文替换为 i18n 路径，并动态调用翻译接口。

## 功能

* 扫描指定目录下的 Vue 文件、JavaScript 文件以及其他支持的文件类型。
* 提取文件中的中文文本。
* 将提取的中文文本替换为 i18n 路径 (例如 `$t('message.hello')`)。
* 动态调用翻译接口，获取对应语言的翻译文本，并将翻译结果添加到 i18n 资源文件中。
* 支持自定义 i18n 路径生成规则。

## 安装

```bash
npm install vue-i18n-translate

// 引入插件
const I18nTranslate = require('vue-i18n-translate');

// 配置选项
const options = {
  directory: './src/components', //必填 要扫描的目录
  module: 'test', //必填 模块名称 {{ $t("module.path") }}
  // 必填：内置小牛翻译的apikey，单日免费赠送200000字符翻译额度，可以自己去官网申请
  apikey: "368f5036ec4c88c2afb9a0705d53c384",
  // 可选：翻译接口配置，
  api: async (txt: String): Promise<String>,
};

// 创建插件实例
I18nTranslate.process(options);