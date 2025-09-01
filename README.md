# vue-i18n-translate

[![NPM Version](https://img.shields.io/npm/v/vue-i18n-translate.svg)](https://www.npmjs.com/package/vue-i18n-translate)
[![License](https://img.shields.io/npm/l/vue-i18n-translate.svg)](https://www.npmjs.com/package/vue-i18n-translate)
[![Downloads](https://img.shields.io/npm/dm/vue-i18n-translate.svg)](https://www.npmjs.com/package/vue-i18n-translate)

一个强大的 Vue.js 国际化（i18n）辅助工具，旨在自动化前端项目中繁琐的文本提取和翻译流程。它能一键扫描项目文件，提取中文文案，调用API进行翻译，生成标准语言包，并自动替换源代码中的硬编码文本为 `i18n` 函数调用。

## 解决了什么问题？

在对一个已有的 Vue 项目进行国际化改造时，开发者通常面临以下痛点：

*   **手动提取**: 需要逐个文件、逐行代码地寻找并复制中文文案。
*   **手动替换**: 将提取出的文案替换为 `$t('key')` 的形式，并为每个文案手动创建唯一的 `key`。
*   **手动翻译**: 将所有文案整理后，交给翻译人员或使用翻译工具，再将结果整理成语言包格式。
*   **效率低下且易出错**: 整个过程耗时耗力，容易遗漏或出错，且难以维护。

`vue-i18n-translate` 将上述流程完全自动化，让你专注于业务开发，而不是重复的体力劳动。

## 核心功能

*   **✅ 自动扫描**: 递归扫描指定目录下的 `.vue`, `.js`, `.ts` 文件。
*   **✅ 智能提取**: 准确识别并提取 HTML 模板、JavaScript 代码中的中文字符串。
*   **✅ 在地替换**: 将提取的中文文本自动替换为 `vue-i18n` 路径调用 (例如 `<span>你好</span>` -> `<span>{{ $t('module.ni_hao') }}</span>`)。
*   **✅ 自动翻译**: 集成 [小牛翻译 API](https://www.niutrans.com/)，自动将提取的文本翻译成英文或其他目标语言。
*   **✅ 语言包生成**: 将中英文（或其他语言）的键值对整理成标准的 JavaScript 模块，方便在项目中直接引入。
*   **✅ 高度可配置**: 支持自定义 i18n 路径前缀、输出文件路径等，以适应不同项目的规范。

## 工作流程

![Workflow Diagram](https://user-images.githubusercontent.com/13174245/158021389-72c67b3e-e14f-4a31-b8f4-656b2cfd2948.png)
*(这是一个示意图，你可以根据实际情况创建并替换)*

1.  **扫描文件**: 工具遍历你指定的目录（如 `src`）。
2.  **提取中文**: 从文件内容中匹配并抽离出所有中文字符串。
3.  **生成 Key**: 为每个独特的中文字符串生成一个唯一的、语义化的 key（通常基于拼音）。
4.  **调用翻译**: 将去重后的中文字符串列表发送到翻译 API。
5.  **替换代码**: 将源代码中的中文字符串替换为对应的 `$t('module.key')` 调用。
6.  **生成语言包**: 创建或更新一个 JS 文件，其中包含一个导出对象，内含 `zh` 和 `en`（或其他语言）的翻译键值对。

## 安装

```bash
npm install vue-i18n-translate 
# 或者
yarn add vue-i18n-translate
```

## 使用方法

推荐在你的项目根目录下创建一个脚本文件来执行此工具，例如 `scripts/translate.js`。

**1. 创建脚本文件**

在你的项目根目录创建 `scripts/translate.js` 文件：

```javascript
// scripts/translate.js

// 1. 引入插件
const I18nTranslate = require('vue-i18n-translate');

// 2. 配置选项
const options = {
  // [必填] 需要扫描的目录路径
  dir: './src', 

  // [必填] 小牛翻译的 apikey。请前往 https://www.niutrans.com/ 申请
  // 建议使用环境变量来保护你的 key: process.env.NIUTRANS_API_KEY
  apikey: "你的小牛翻译API_KEY",

  // [可选] 模块名称，将作为生成的文件名和 i18n key 的第一级路径
  // 默认为 'module'
  // 例如，设置为 'user'，则 key 为 'user.some_text'，生成文件为 'user.js'
  module: 'common',

  // [可选] 生成的语言包文件存放目录
  // 默认为 './locales'
  outputDir: './src/locales',
  
  // [可选] 目标翻译语言，默认为英文 'en'
  targetLang: 'en',
};

// 3. 开始执行
console.log('🚀 开始执行国际化转换...');
I18nTranslate.process(options);
console.log('✅ 转换完成！');

```

**2. 运行脚本**

在 `package.json` 的 `scripts` 中添加一个命令：

```json
"scripts": {
  "translate": "node scripts/translate.js"
}
```

然后执行：

```bash
npm run translate
```

## 示例：转换前后对比

假设你有以下 Vue 组件 `src/components/HelloWorld.vue`:

**转换前:**

```vue
<template>
  <div class="hello">
    <h1>{{ greeting }}</h1>
    <p>这是一个国际化示例项目。</p>
    <button @click="changeMessage">改变消息</button>
  </div>
</template>

<script>
export default {
  name: 'HelloWorld',
  data() {
    return {
      greeting: '你好，世界！'
    }
  },
  methods: {
    changeMessage() {
      alert('操作成功');
    }
  }
}
</script>
```

执行 `npm run translate` 后（假设 `module` 配置为 `hello`）：

**转换后 `src/components/HelloWorld.vue`:**

```vue
<template>
  <div class="hello">
    <h1>{{ $t('hello.ni_hao_shi_jie') }}</h1>
    <p>{{ $t('hello.zhe_shi_yi_ge_guo_ji_hua_shi_li_xiang_mu') }}</p>
    <button @click="changeMessage">{{ $t('hello.gai_bian_xiao_xi') }}</button>
  </div>
</template>

<script>
export default {
  name: 'HelloWorld',
  data() {
    return {
      greeting: this.$t('hello.ni_hao_shi_jie')
    }
  },
  methods: {
    changeMessage() {
      alert(this.$t('hello.cao_zuo_cheng_gong'));
    }
  }
}
</script>
```

**同时，会在 `./src/locales` 目录下生成 `hello.js` 文件:**

```javascript
// src/locales/hello.js
export default {
  zh: {
    'ni_hao_shi_jie': '你好，世界！',
    'zhe_shi_yi_ge_guo_ji_hua_shi_li_xiang_mu': '这是一个国际化示例项目。',
    'gai_bian_xiao_xi': '改变消息',
    'cao_zuo_cheng_gong': '操作成功'
  },
  en: {
    'ni_hao_shi_jie': 'Hello, world!',
    'zhe_shi_yi_ge_guo_ji_hua_shi_li_xiang_mu': 'This is an internationalization sample project.',
    'gai_bian_xiao_xi': 'Change Message',
    'cao_zuo_cheng_gong': 'Operation successful'
  }
};
```

## 与项目集成

你需要将生成的语言包整合到你的 `vue-i18n` 实例中。

例如，在你的 `main.js` 或专门的 i18n 配置文件中：

```javascript
import Vue from 'vue'
import VueI18n from 'vue-i18n'

// 引入生成的语言包
import commonMessages from './locales/common'
import helloMessages from './locales/hello'

Vue.use(VueI18n)

// 合并所有语言包
const messages = {
  zh: {
    ...commonMessages.zh,
    ...helloMessages.zh,
    // ...其他模块
  },
  en: {
    ...commonMessages.en,
    ...helloMessages.en,
    // ...其他模块
  }
}

const i18n = new VueI18n({
  locale: 'zh', // 设置地区
  messages, // 设置地区信息
})

new Vue({
  i18n,
  render: h => h(App)
}).$mount('#app')
```

## 注意事项

*   **代码备份**: 在执行此脚本前，强烈建议你使用 Git 等版本控制工具提交当前的代码，以防意外发生。
*   **API Key 安全**: 请勿将你的 `apikey` 硬编码并提交到公共仓库。推荐使用环境变量（如 `dotenv` 库）来管理敏感信息。
*   **动态字符串**: 工具无法处理由变量拼接而成的动态字符串，例如 `` `你好，${name}` ``。这类文本仍需手动处理。
*   **重复执行**: 工具在设计上是幂等的。重复执行时，它会跳过已经替换为 `$t()` 的文本，并仅处理新增的中文文案，将其追加到现有的语言包中。

## 贡献

欢迎提交 PR 和 Issue，为改进 `vue-i18n-translate` 贡献你的力量！

## License

[MIT](./LICENSE)