---
title: Usage Analytics 验收测试方案
date: 2026-08-09
category: reports
status: active
related: ["../reports/usage-analytics-completion-2026-08-09.md"]
---

# Usage Analytics 验收测试方案

> 基于真实数据 (10599 条、12 个 provider、跨天、多 status) 与现有基建 (后端 77 测试 + GUI 5 测试已过,但有盲区) 设计的 6 个可并行 Agent 测试包。

## 总览：三层 × 两包

| Agent 包 | 层 | 目标 | 预计时长 | 核心聚焦 (PR 1-3 引入的五类翻车点) |
|----------|-----|------|----------|--------------------------------------|
| **A1** | API | 跨端点过滤一致性 + status 大类 | 15 min | 过滤一致性、游标分页竞态 |
| **A2** | API | 缓存隔离 + 参数校验边界 | 15 min | 缓存隔离、格式化边界 |
| **B1** | GUI | 过滤联动 + 分页竞态 + 失败恢复 | 20 min | 过滤一致性、游标分页竞态、失败恢复 |
| **B2** | GUI | 格式化精度 + tooltip + locale 回归 | 20 min | 格式化边界、locale/i18n |
| **C1** | 数据 | 真实数据 E2E (本机 10100) | 25 min | 过滤一致性、数据真实性 |
| **C2** | 数据 | 截断/空集/极端值 | 15 min | 格式化边界、极端值处理 |

> **并行建议**：A1+A2 可由 1 Agent 跑 (纯 curl)；B1、B2 各需 1 Agent (需浏览器)；C1+C2 可由 1 Agent 跑。3 Agent 并行约 25 分钟；单 Agent 串行按 A1→A2→C1→C2→B1→B2 约 2 小时。

---

## 前置条件（所有包通用）

1. **服务运行中**：本机 `10100` 端口服务已启动 (PID 48290 已确认)
2. **真实数据**：`usage.jsonl` 含 10599 条记录，覆盖 12 个 provider、多天、多 status
3. **关键数据分布**（供构造场景参考）：
   - `openai`: 7495 条
   - `command-code`: 13572 条 (最多)
   - `claude-desktop` (surface): 123 条
   - `status=5xx`: 219 条
   - `status=200`: 最大精确码桶
   - `status=404`: 6 条 (少量非空集)
   - `totalTokens` 在 `command-code` 下达亿级

---

## Agent 包 A1：跨端点过滤一致性

### 目标
验证 **§9.3 核心承诺**：同一过滤下 `Summary` 请求数 = `趋势` = `明细表` 全量行数。

### 操作步骤

#### 场景 1：单 provider (openai, 7495 条)
```bash
# 端点 1: Summary
curl 'http://127.0.0.1:10100/api/usage?range=all&provider=openai'

# 端点 2: History (翻页直到 hasMore=false)
curl 'http://127.0.0.1:10100/api/request-history?provider=openai&limit=100'
# 记录 cursor，循环翻页累加 entries.length
```

#### 场景 2：status 大类 (status=5xx, 219 条)
```bash
curl 'http://127.0.0.1:10100/api/usage?range=all&status=5xx'
curl 'http://127.0.0.1:10100/api/request-history?status=5xx&limit=100'
```

#### 场景 3：组合过滤 (provider=openai&status=200)
```bash
curl 'http://127.0.0.1:10100/api/usage?range=all&provider=openai&status=200'
curl 'http://127.0.0.1:10100/api/request-history?provider=openai&status=200&limit=100'
```

#### 场景 4：双重时间过滤 (range=7d + from=<7天前时间戳>)
```bash
# 取 7 天前的毫秒时间戳
FROM_MS=$(($(date +%s) - 7*86400))000
curl "http://127.0.0.1:10100/api/usage?range=7d&from=${FROM_MS}"
curl "http://127.0.0.1:10100/api/request-history?range=7d&from=${FROM_MS}&limit=100"
```
> **关注点**：`range` 是否传给了 `request-history` (之前 P1 修复点)

#### 场景 5：切 surface (claude-desktop, 123 条)
```bash
curl 'http://127.0.0.1:10100/api/usage?range=all&surface=claude-desktop'
curl 'http://127.0.0.1:10100/api/request-history?surface=claude-desktop&limit=100'
```
> **关注点**：`surface` 是否传给了 `request-history` (P1 修复点)

### 验收标准
| filter | usage=N | history=M | pass/fail | 备注 |
|--------|---------|-----------|-----------|------|
| provider=openai | | | | |
| status=5xx | | | | |
| provider=openai&status=200 | | | | |
| range=7d&from=... | | | | 双重时间过滤 |
| surface=claude-desktop | | | | P1 修复验证 |

**每对数值必须完全相等**。若不等，记录差值和哪个端点多/少。

### 回报格式
```
filter=provider=openai | usage=7495 | history=7495 | pass
filter=status=5xx | usage=219 | history=219 | pass
...
```

---

## Agent 包 A2：缓存隔离 + 参数校验边界

### 目标
验证 PR 1 的缓存 key 扩展不串缓存，以及 status 大类/精确码的 400 边界。

### 操作步骤

#### 1. 缓存隔离验证 (连续打 4 个不同过滤，检查 filters 回显与 summary.requests)
```bash
curl 'http://127.0.0.1:10100/api/usage?range=all&provider=openai'
curl 'http://127.0.0.1:10100/api/usage?range=all&provider=anthropic'  # 无此 provider，应返回 0
curl 'http://127.0.0.1:10100/api/usage?range=all&status=200'
curl 'http://127.0.0.1:10100/api/usage?range=all&status=5xx'
```
**检查点**：每个返回的 `filters` 回显与 `summary.requests` 各不相同，互不污染。

#### 2. 参数校验边界 (每个期望 400 + error code)

| 请求 | 期望 error code | 说明 |
|------|----------------|------|
| `status=99` | `invalid_status` | 非标准码 |
| `status=600` | `invalid_status` | 超出 HTTP 范围 |
| `status=abc` | `invalid_status` | 非数字 |
| `status=6xx` | `invalid_status` | 正则只接 1-5xx |
| `from=2000&to=1000` | `invalid_range` | 时间倒序 |
| `limit=0` (request-history) | `invalid_limit` | 下界 |
| `limit=101` (request-history) | `invalid_limit` | 上界 |
| `cursor=garbage` | `invalid_cursor` | 非法 cursor |

#### 3. status 大类与精确码并存验证
```bash
curl 'http://127.0.0.1:10100/api/usage?range=all&status=2xx'
```
**检查点**：返回的 `filters.status` 应为字符串 `"2xx"`，不是数字 `200`。

### 验收标准
- 9 个边界全部返回 400 + 正确 error code
- 缓存隔离：4 个过滤的 `summary.requests` 值互不相同 (7495, 0, 10599中200的数量, 219)

---

## Agent 包 B1：GUI 过滤联动 + 分页竞态 + 失败恢复

### 目标
验证最容易翻车的人工交互层：过滤切换、游标分页、错误态恢复。

### 前置
- 本机能打开 GUI 浏览器：`http://127.0.0.1:10100`
- 若服务是 npm 旧版而非开发实例，需先切到开发实例 (§15.5)

### 操作步骤与验收

| # | 场景 | 操作 | 验收点 | 关键风险 |
|---|------|------|--------|----------|
| 1 | 默认 30d 基线 | 打开 Usage 页，记录 KPI 卡 Requests 数 | 有基线值 | - |
| 2 | **Provider 切换** | 切 Provider 下拉 → 选 `command-code` (13572 条) | **KPI、趋势图、Requests tab 同时刷新**；Requests tab 无旧 provider 残留行 | **P1 修复核心**：旧数据不残留 |
| 3 | **快速连切** | 快速切 `openai → nvidia → 回 openai`，最终停在 openai | 最终显示 openai 数据，**无 openai 标签 + nvidia 数据错配** | **P1 修复核心**：竞态条件 |
| 4 | Status 切换 | 切 status → `5xx` (219 条) | Requests tab 只显 5xx 行；KPI Requests = 219 | - |
| 5 | **分页 Load more** | 点 "Load more" 多次直到按钮消失 (hasMore=false) | 最终行数 = A1 的 request-history 全量对比一致 | 游标分页竞态 |
| 6 | **断网恢复** | DevTools → Network → Offline，切 Provider，观察错误态 + Retry；恢复网络点 Retry | 错误态显示、Retry 可点、恢复后数据正确 | 失败恢复 |
| 7 | **Surface 切换** | 切 surface (Codex/Claude/Grok) | Requests tab 跟着变 | **P1 修复点**：旧实现不传 surface |

### 验收标准
7 个场景全部通过。**场景 2、3、7 是 P1 修复的核心，必须验证旧数据不残留。**

---

## Agent 包 B2：格式化精度 + tooltip + locale 回归

### 目标
验证 PR 2 的数字格式化在真实大数字上的表现，以及 6 个 locale 的 i18n 回归。

### 操作步骤与验收

| # | 场景 | 操作 | 验收点 |
|---|------|------|--------|
| 1 | **格式化边界 - 大数字 tooltip** | Usage 页找 `command-code` 的 `totalTokens` (亿级)，hover KPI 卡 Total tokens | compact 显示 `128.39M` (2 位小数)；tooltip 显示精确整数 `128,394,822` (千分位) |
| 2 | **跨档边界 - 999,999** | 构造 999,999 附近的数 (DevTools console 改 state 或找真实近百万 provider) | 显示 `999.99K` **而非** `1000K` (PR 2 floor 截断修复点) |
| 3 | **CJK locale (zh)** | 切到中文 | 大数字显示 `1.23万` 风格；tooltip 仍是千分位整数 |
| 4 | **德语 locale (de)** | 切到德语 | 显示 `Mrd./Mio./Tsd.` 格式；小数点用逗号 `1,23 Mio.` |
| 5 | **ko / ja / ru** | 依次切韩语、日语、俄语 | Usage 页**无未翻译 key** (不出现 `usage.filter.xxx` 原文) |
| 6 | **Logs 页明细抽屉** | 打开 Logs 页，点任一请求看 token 列 | token 列用 `CompactNumber` (有 tooltip) |

### 验收标准
- 6 locale 全部正常，无未翻译 key
- 大数字 tooltip 精确 (千分位整数)
- 999,999 不跨档 (显示 999.99K)

---

## Agent 包 C1：真实数据 E2E (本机 10100)

### 目标
用真实运行的 10599 条数据做端到端验证，覆盖单元测试够不到的集成层。

### 操作步骤与验收

| 步骤 | 操作 | 验收点 |
|------|------|--------|
| 1 | 打开 `http://127.0.0.1:10100`，进 Usage 页，默认 30d | 记录默认 KPI：Requests、Total tokens、Cache reads。**截图留存** |
| 2 | 切 All range | KPI 变化应增大 (all > 30d) |
| 3 | 过滤 `provider=openai` | 记录 KPI；与 `curl /api/usage?range=all&provider=openai` JSON 对比，**必须一致** |
| 4 | 看 Requests tab，翻几页 | 取一个 `requestId` 去 Logs 页搜，行数据对得上 |
| 5 | 看趋势图，hover 各点 | tooltip 显示日期 + 精确 token 数；趋势方向与 KPI Total tokens 量级吻合 |
| 6 | 看 Providers/Models breakdown 表 | `shareRatio` 加起来 ≈ 100% (允许 other 桶) |

### 验收标准
- GUI 显示值 = API 返回值
- 趋势与 KPI 同源
- breakdown 占比自洽

---

## Agent 包 C2：截断 / 空集 / 极端值

### 目标
验证边界场景不崩溃。

### 操作步骤与验收

| # | 场景 | 操作 | 验收点 |
|---|------|------|--------|
| 1 | **空集 - 不存在 provider** | 过滤 `provider=nonexistent` | KPI 全 0；趋势图空白不崩；Requests tab 显示 EmptyState (不报错) |
| 2 | **空集 - 少量 status** | 过滤 `status=404` (6 条) | 有数据但很少；正常显示 |
| 3 | **截断提示** | 检查 30d 视图是否显示 `historyTruncated` 提示 (64MB 上限) | 记录是否出现 (10599 条可能未触发) |
| 4 | **极端时间** | 设 `from=0` (1970)、`to=9999999999999` (远未来) | 不崩、返回全集 |
| 5 | **大页码** | 连续翻 request-history 20+ 页 | 不重复、不丢行 |
| 6 | **同时多过滤** | `provider=openai&status=200&from=<3天前>&to=<今天>` | 交集正确 |

### 验收标准
6 场景全不崩溃；空集有合理 EmptyState；极端时间返回全集。

---

## 执行记录模板 (Agent 填写)

```markdown
## 执行记录：<包名> - <日期> - <执行者>

### 环境
- 服务版本/Commit:
- 数据版本 (usage.jsonl 行数):
- 浏览器 (GUI 包):

### 结果汇总
| 场景 | 实际结果 | 预期 | Pass/Fail | 备注/差值 |
|------|----------|------|-----------|-----------|
| ...  | ...      | ...  | ...       | ...       |

### 发现的问题
1. **P0 阻塞**: ...
2. **P1 缺陷**: ...
3. **P2 建议**: ...

### 截图/日志引用
- ...
```

---

## 关键修复点回溯 (供 Agent 理解上下文)

| PR | 修复点 | 相关测试包 |
|----|--------|------------|
| PR 1 | 缓存 key 扩展 (provider/status/surface/range)；request-history 传 surface/range | A1(场景4,5)、A2、B1(场景2,3,7)、B2 |
| PR 2 | CompactNumber floor 截断 (999,999→999.99K)；6 locale i18n | B2(场景2,3,4,5)、C1 |
| PR 3 | 状态码大类/精确码并存验证；参数校验 400 边界 | A2、B1(场景4) |

---

## 变更历史

| 版本 | 日期 | 变更 | 作者 |
|------|------|------|------|
| 1.0 | 2026-08-09 | 初版：基于 10599 条真实数据、PR 1-3 修复点设计 | - |
