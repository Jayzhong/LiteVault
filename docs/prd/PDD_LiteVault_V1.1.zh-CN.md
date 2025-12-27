---
title: "轻藏（LiteVault）V1 产品设计书（Web）"
version: "1.1"
status: "Draft"
last_updated: "2025-12-27"
owners:
  - Product: "TBD"
  - Design: "TBD"
  - Eng: "TBD"
---

## 目录
- [1. 产品概述](#1-产品概述)
- [2. 目标用户与核心场景](#2-目标用户与核心场景)
- [3. V1 价值主张与产品原则](#3-v1-价值主张与产品原则)
- [4. V1 功能范围（MVP）](#4-v1-功能范围mvp)
- [5. 信息架构与页面设计（IA + Pages）](#5-信息架构与页面设计ia--pages)
- [6. 核心交互流程（Flows）](#6-核心交互流程flows)
- [7. Settings 页（简单但可扩展）](#7-settings-页简单但可扩展)
- [8. 核心数据对象（产品视角）](#8-核心数据对象产品视角)
- [9. 后台能力与接口草案（供 TDD/后端对齐）](#9-后台能力与接口草案供-tdd后端对齐)
- [10. 非功能性需求（NFR）](#10-非功能性需求nfr)
- [11. 里程碑与交付物](#11-里程碑与交付物)
- [12. 风险、对策与取舍](#12-风险对策与取舍)
- [13. 开放问题清单](#13-开放问题清单)
- [14. 术语表](#14-术语表)

---

## 1. 产品概述

### 1.1 一句话简介
轻藏（LiteVault）是一款“轻量存入、随用找回”的个人知识收纳与检索工具：用户把文本存入后，系统自动生成 **title / summary / suggested tags**，用户在 **Pending review** 中确认后归档；之后可在 **Search** 得到带证据的综合回答。

### 1.2 核心闭环
1) Capture（存入）→ 2) AI Draft（自动生成草稿）→ 3) Review（用户确认）→ 4) Recall（搜索找回）→ 5) Library（沉淀归档）

### 1.3 平台与范围说明
- **当前只做 Web 前端 + 后台服务**（不做移动端）。
- V1 聚焦：文本内容的存入、确认、检索、时间线归档与基础设置。

---

## 2. 目标用户与核心场景

### 2.1 目标用户（V1）
- 需要高频“临时记录 + 未来找回”的知识工作者/工程师/产品经理/学生
- 讨厌“重型整理”与复杂结构，但希望在找回时更聪明、更可靠

### 2.2 核心场景
- 把会议要点/面试复盘/灵感/学习笔记“先放进去”，以后能用自然语言问出来
- 想在搜索结果里看到“答案 + 引用证据（Evidence）”，减少幻觉与不信任

---

## 3. V1 价值主张与产品原则

### 3.1 价值主张
- **存入轻**：一个输入框完成采集
- **整理省**：AI 先出草稿（title/summary/tags），人只做确认
- **找回准**：搜索输出综合回答 + 证据卡片（可回溯来源条目）
- **可控可撤销**：Pending review 可编辑、可丢弃、可再确认

### 3.2 产品原则（V1）
- 轻量优先：避免“Notion 化”
- 默认可解释：答案必须带 Evidence
- 人类最终确认：AI 只出草稿，归档前需用户 confirm
- 可逆：尽量提供 discard、撤回、编辑入口

---

## 4. V1 功能范围（MVP）

> MVP：以最小功能集合跑通“存入→确认→检索→归档”闭环。

### 4.1 V1 必做（Must Have）
**全局框架**
- 左侧边栏固定：Home / Search / Library / Settings
- 登录态（最简实现即可；具体方案由 TDD 决定）

**Home（存入 + Pending review）**
- 中央输入框：输入文本
- Save 按钮：提交到后台
- 后台异步生成：summary / title / suggested tags
- 页面下方 Pending review：以卡片列表展示待确认条目
- 卡片点击弹出详情 Modal：支持编辑、confirm & save、discard

**Search（找回）**
- 输入查询文本 + 搜索按钮
- 后台返回：
  - Synthesized Answer（综合回答）
  - Evidence（证据列表：引用到具体条目/片段）
- Evidence 可点击打开对应条目详情（Modal）

**Library（时间线归档）**
- 按时间倒序展示已归档条目卡片列表
- 卡片点击打开详情 Modal
- 基础过滤（建议 V1 至少做一个）：按 Tag 过滤 或 关键词筛选（两者择一优先）

**Tags（标签管理，V1 轻量版）**
- 条目确认时可增删 tags
- 基础 tag 管理：重命名、合并、删除（入口放 Settings，或 Library 顶部“Manage tags”）

**Settings（设置）**
- 一个简洁设置页（见第 7 节），V1 只做必要项与占位扩展

### 4.2 V1 可选（Nice to Have）
- 相似条目推荐（Related Items）
- Markdown/JSON 导出（备份与迁移）
- 站内快捷键（/ 搜索、Cmd+K 等）
- “最近确认过的 tags”提示（提升一致性）

### 4.3 V1 明确不做（Out of Scope）
- 多入口采集：浏览器剪藏、iOS 分享、邮件转发
- 团队协作、分享、公开链接
- 复杂知识图谱/项目空间/工作流
- 端到端加密（架构可预留，但 V1 不做）

---

## 5. 信息架构与页面设计（IA + Pages）

### 5.1 全局布局
- 左侧 Sidebar（固定、全站一致）
  - Home
  - Search
  - Library
  - Settings
- 主内容区：根据路由展示页面内容
- 通用组件：
  - Item Card（条目卡片）
  - Item Detail Modal（条目详情弹窗）
  - Tag Chip（标签样式统一）

### 5.2 页面：Home
**目标**：完成“存入 → 等待生成 → Pending review 展示 → 点击进入确认”
- 中央：输入框（支持多行）
- Save 按钮（主按钮）
- Pending review 区块（列表）
  - 卡片字段建议：title（或占位）、summary（截断）、suggested tags（chips）、生成状态（loading/done）

### 5.3 页面：Search
**目标**：用自然语言找回，返回“答案 + 证据”
- 顶部：查询输入框 + Search 按钮
- 中部：Synthesized Answer（可复制）
- 下部：Evidence 列表（每条指向一个条目/片段）
  - Evidence 点击：打开 Item Detail Modal，并高亮引用片段（若实现成本高，可先只定位到条目）

### 5.4 页面：Library
**目标**：时间线倒序浏览沉淀内容
- 顶部：过滤区（V1 至少一个）
  - Option A：Tag Filter（下拉/多选 chips）
  - Option B：关键词筛选（仅对 title/summary/content 轻量匹配）
- 主体：卡片列表（按创建/确认时间倒序）
- 点击卡片：打开 Item Detail Modal

### 5.5 页面：Settings
- 见第 7 节

---

## 6. 核心交互流程（Flows）

### Flow 1：存入（Home → Save）
1) 用户输入文本，点击 Save
2) 前端立即创建一条 Pending card（本地乐观 UI 或后端返回 pending 记录）
3) 后台异步生成 title/summary/suggested tags
4) Pending 卡片更新为可确认状态（done）

**关键点**
- Save 与生成解耦：避免用户等待
- 生成失败需可见：卡片显示失败状态，并提供 Retry（可选）

### Flow 2：确认（Pending card → Detail Modal → Confirm & Save / Discard）
1) 用户点击 Pending card，打开详情 Modal
2) 默认展示：原文、AI 生成的 title/summary/tags
3) 用户可编辑（点亮编辑态）
4) Confirm & Save：进入 Library（归档）
5) Discard：删除或标记为 discarded（策略由后端决定）

**确认态字段建议**
- title（可编辑）
- summary（可编辑）
- tags（可增删；支持自定义输入 + 回车创建）

### Flow 3：搜索（Search → Answer + Evidence）
1) 用户输入 query，点击 Search
2) 后台执行检索与综合（RAG/语义检索策略由 TDD 决定）
3) 前端展示：
   - Synthesized Answer
   - Evidence（条目引用列表）
4) 点击 Evidence：打开条目详情

### Flow 4：归档浏览（Library → Detail Modal）
1) 用户在 Library 浏览时间线
2) 点击卡片打开详情
3) 支持轻量编辑（可选）：修改 title/summary/tags（V1 可只读，后续再加编辑）

---

## 7. Settings 页（简单但可扩展）

> 目标：V1 不做复杂配置，但要给“账号/数据/偏好/标签管理”一个明确落点。

### 7.1 页面结构（建议：单页分组卡片）
**Section A：Account**
- Profile（只读或可编辑：昵称/邮箱占位）
- Logout（按钮）
- Delete account（危险按钮，V1 可只做占位+二次确认）

**Section B：Preferences**
- Default language（中文/英文，若暂不做就占位）
- Timezone（占位）
- AI drafting（开关，占位）：是否自动生成 tags（若你确定永远生成，也可不做）

**Section C：Data**
- Export my data（按钮，占位或 V1 直接输出 JSON/Markdown）
- Data retention（占位）

**Section D：Tags**
- Manage tags（跳转到 Tag 管理子页或弹窗）
  - 重命名 tag
  - 合并 tag（A→B）
  - 删除 tag（解除关联或级联策略由后端决定）

### 7.2 Tag 管理子页（V1 轻量方案）
- 顶部搜索框：筛选 tags
- 列表：tag 名称、关联条目数量
- 行内操作：Rename / Merge / Delete

---

## 8. 核心数据对象（产品视角）

### 8.1 Item（条目）
- id
- user_id
- raw_content（原文）
- title（可编辑）
- summary（可编辑）
- tags（多对多）
- status：pending_review | archived | discarded
- created_at（创建）
- updated_at（更新）
- confirmed_at（确认归档时间，可选）

### 8.2 Tag（标签）
- id
- user_id
- name（唯一：同一 user 下）
- created_at

### 8.3 Search（搜索记录，可选）
- query_text
- synthesized_answer
- evidence[]（引用到 item_id + snippet/score）

---

## 9. 后台能力与接口草案（供 TDD/后端对齐）

> 这里只做“产品所需能力”对齐，具体协议细节在 TDD 定稿。

### 9.1 Items
- POST /items
  - input: raw_content
  - output: item_id, status=pending_review
- GET /items?status=pending_review
- PATCH /items/{id}
  - update: title/summary/tags/status
- DELETE /items/{id}（或 PATCH status=discarded）

### 9.2 Library
- GET /library?sort=desc&tag=...&q=...&cursor=...

### 9.3 Search
- POST /search
  - input: query_text
  - output: synthesized_answer, evidence[{item_id, snippet, score}]

### 9.4 Tags
- GET /tags
- PATCH /tags/{id}（rename）
- POST /tags/merge（from_tag_id → to_tag_id）
- DELETE /tags/{id}

### 9.5 Enrichment（异步生成）
- 后台 Job：对 pending item 生成 title/summary/suggested tags
- 状态回传：轮询 / SSE / WebSocket（三选一；V1 可先轮询）

---

## 10. 非功能性需求（NFR）

### 10.1 性能与体验
- Save：前端应立即反馈（不阻塞等待生成）
- 生成：允许秒级到十几秒（视模型与队列）
- Search：目标 P95 < 2s（初期可放宽）

### 10.2 可靠性
- Save 幂等：前端重复提交不应产生重复条目（可用 idempotency key）
- 生成失败可重试：至少能显示失败并支持 retry（可选）

### 10.3 可观测性
- 关键事件埋点：save_clicked、enrichment_done、confirm_saved、search_submitted、evidence_opened
- 后台日志：item_id 贯穿链路

### 10.4 安全与隐私（V1 最低标准）
- HTTPS
- 基础鉴权
- 数据隔离：user_id 级别隔离

---

## 11. 里程碑与交付物

### Milestone 0：Repo 与工程脚手架（Walking Skeleton）
- 前端：路由 + Sidebar + 空页面
- 后端：health check + 鉴权占位
- 最小 CI（lint/test/build）

### Milestone 1：Home（Save + Pending 列表）
- POST /items
- GET pending items
- 前端 Pending 卡片渲染 + 状态刷新

### Milestone 2：Enrichment 异步链路
- 生成 title/summary/tags
- Pending 卡片自动更新

### Milestone 3：Review Modal（Confirm & Save / Discard）
- PATCH /items/{id}（确认/丢弃/编辑）
- 归档后在 Library 可见

### Milestone 4：Search（Answer + Evidence）
- POST /search
- 前端 Answer + Evidence 展示与跳转

### Milestone 5：Library（时间线 + 基础过滤）
- GET /library（分页）
- Tag filter 或关键词筛选（择一优先）

### Milestone 6：Settings + Tag 管理
- Settings 页 UI
- Tag 管理最小 CRUD（rename/merge/delete）

---

## 12. 风险、对策与取舍

- 风险：搜索“综合回答”质量不稳  
  - 对策：强制 Evidence；先把“引用正确”做扎实，再优化答案措辞
- 风险：异步生成链路复杂  
  - 对策：V1 用最简单的队列/轮询；不要一开始上实时推送
- 风险：Tag 管理做重  
  - 对策：V1 只做 rename/merge/delete + 统计数；不做层级/颜色体系

---

## 13. 开放问题清单
- 登录与账号体系：邮箱密码 / 第三方登录 / 仅本地单机？
- Evidence 的粒度：引用条目级 or 片段级？（片段级需要存 chunk/snippet）
- Library 的“时间”定义：created_at 还是 confirmed_at？
- Discard 策略：硬删除还是软删除？
- 搜索技术路线：关键词 + 向量检索混合？（由 TDD 定）

---

## 14. 术语表
- V1：第一版
- MVP：Minimum Viable Product，最小可用产品
- PDD：Product Design Doc，产品设计文档
- IA：Information Architecture，信息架构
- LLM：Large Language Model，大语言模型
- Pending review：待确认队列
- Evidence：证据引用（可回溯到条目/片段）
- RAG：Retrieval-Augmented Generation，检索增强生成