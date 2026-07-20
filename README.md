# Anwara Translator（Chrome / Edge MV3 扩展）

<p align="center">
  <img src="icon.png" alt="Anwara Translator icon" width="128" />
</p>

<p align="center">
  <a href="https://github.com/salimongo/Anwara-Translator">项目仓库</a> |
  <a href="https://github.com/salimongo/Anwara-Translator/issues">Issues</a> |
  <a href="https://github.com/salimongo/Anwara-Translator/releases">Releases</a>
</p>

English documentation: [README.en.md](README.en.md)

Anwara Translator 是一个 Chrome / Edge MV3 翻译扩展，支持文本、网页与选句翻译，并提供双语面板、历史记录、阅读区和结构化阅读页。默认使用浏览器内置 Translator API 与 Language Detector API 在本地翻译；也可由用户自行配置在线翻译或大模型接口。

## 下载与安装

- **[GitHub Releases](https://github.com/salimongo/Anwara-Translator/releases/)**：下载发布包。
- **Chrome / Edge 开发者模式**：打开扩展管理页，加载解压后的项目文件夹。
- **问题反馈**：提交到 [Issues](https://github.com/salimongo/Anwara-Translator/issues)。

## 特性
- 自动检测来源语言（LanguageDetector）
- 目标语言可选（默认中文）
- 使用浏览器内置 Translator API 本地翻译，隐私安全
- 首次使用自动下载模型，后续离线可用，响应更快
- 一键复制翻译结果
- 朗读翻译结果
- 支持自动/手动翻译当前网页
- 一比一还原Google原生网页翻译
- 选中任意文本即可自动翻译
- 选中文本后在选区边缘显示红点，悬停或点击红点展开译文面板，并保留复制按钮
- 翻译面板可通过顶部手柄拖动，位置按网站记忆，避免遮挡页面内容
- 保留译文中的段落、换行和缩进排版，避免多行内容粘成一块
- 划词面板支持固定、多开、拖动和调整大小，布局按网站记忆
- 成功翻译默认写入本地历史，可单独加入阅读区并批量清理
- 历史与阅读区支持搜索、翻译方式/站点筛选、仅展示用的重复合并、批量删除、日期删除和 8 秒撤销
- 同一条记录重复打开时复用已有阅读页，避免堆出一串重复标签页
- 独立阅读页支持页内搜索、阅读进度、断点续读、主题/字体/字号以及本地、在线、大模型重新翻译
- 未配置的在线或大模型重新翻译会明确禁用并提示前往设置，而不会发起失败请求
- 增加漂浮翻译开关
- ✨ **网址白名单功能**：开启自动翻译网页后，可跳过白名单内的网址。

## 翻译方式与数据边界

- **本地翻译**：使用浏览器 Translator API；模型可能在首次使用时由浏览器下载。
- **在线翻译 / 大模型翻译**：需要用户在“设置”中填写对应服务的 Key、端点、模型或账号凭证；选中的文本或网页内容会直接发送给所选服务商。
- 配置和历史记录仅保存在浏览器扩展本地存储中；仓库和发布包不包含用户 Key、Token 或个人翻译数据。

## 运行要求
- Chrome 或 Edge 版本：138+（支持 Translator 与 LanguageDetector）

## 安装与加载（开发者模式）
1. 打开 Chrome 地址栏：chrome://extensions
2. 打开右上角“开发者模式”开关
3. 点击“加载已解压的扩展程序”，选择本项目文件夹
4. 点击工具栏扩展图标，打开弹窗使用

## 插件截图

![插件截图](/image/translator.png)

![插件截图](/image/select.png)

## 常见问题（FAQ）
- 首次使用提示需要下载模型？
  - 正常现象。等待下载完成后即可离线使用。
- 提示语言冲突？
  - 某些来源/目标组合不可用，建议切换其他目标语言重试。
- 朗读没有声音？
  - 请确认系统音量与可用语音包（不同系统/浏览器对语音合成支持不同）。

## License
本项目采用 Apache License 2.0 开源协议。

## 多语言

扩展界面已首批支持中文与英文，并跟随浏览器语言自动选择。其他语言暂未迁移，后续按 [I18N.md](I18N.md) 的边界逐步添加。

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

## 隐私政策

Anwara Translator 不收集分析数据，也不向项目自有服务上传内容。本地翻译会留在浏览器内；历史、阅读区与服务配置保存在浏览器扩展本地存储中。

若你主动配置在线翻译或大模型服务，所选文本或网页内容会直接发送至该服务商，并受该服务商的隐私政策约束。请勿在未确认服务商数据政策前处理敏感内容。

你可以通过阅读源代码了解 [Anwara Translator](https://github.com/salimongo/Anwara-Translator/) 的具体行为，或自行审查扩展权限和服务配置。
