# 哈基米共鸣算法 (Hachimi Resonance Model) v1.0

## 1. 核心理念

本算法旨在解决“时光胶囊”中的核心问题：**如何在不侵犯隐私的前提下，让真正触动过用户的内容以最合适的节奏重新出现？**

模型基于三个核心支柱：
1.  **能量积累 (Energy)**：内容的内在价值与用户互动强度的总和。
2.  **时间衰变 (Decay)**：基于概率冷却的动态屏蔽机制。
3.  **反馈调节 (Feedback)**：基于用户在胶囊内真实行为的自适应进化。

---

## 2. 数学模型

每条内容的最终“共鸣权重” $W$ 计算公式如下：

$$W = E_{\text{total}} \times C_{\text{cooling}} \times I_{\text{immunity}}$$

### 2.1 能量积累 (Energy, $E$)

$$E_{\text{total}} = E_{\text{base}} + E_{\text{manual}} + E_{\text{interaction}} + E_{\text{consumption}}$$

| 维度 | 因子 | 权重值 | 说明 |
| :--- | :--- | :--- | :--- |
| **基础** | Base | +1 | 保证所有内容都有非零概率 |
| **意志** | Manual Score | `(Score - 5) * 5` | 11分=+30, 9分=+20, 7分=+10 |
| **高能互动** | **Copy** | **+5** | 最高级肯定 (去重) |
| | Share | +15 | 强烈传播意愿 |
| | Triple | +15 | B站三连 |
| | Coin | +5 | 真金白银 (已调低) |
| **中能互动** | Favorite/Star | +8 | 收藏意愿 |
| | Comment/Danmaku | +8 | 表达欲 |
| | Open Comment | **+4** | 深度好奇 (已调高) |
| **基础互动** | Upvote | +5 | 赞同 |
| | Like | +3 | 喜欢 |
| **被动消费** | Read > 30s | +5 | 深度阅读 |
| | Play > 90% | +8 | 完播 |
| | Play > 50% | +3 | 半播 |

### 2.2 时间衰变 (Decay, $C$)

采用“动态概率冷却”机制，而非硬性屏蔽。

$$C = 1 - e^{-\frac{T_{\text{gap}}}{K}}$$

*   $T_{\text{gap}}$: 当前时间 - 上次露脸时间 (`lastShownAt`)。若无 `lastShownAt`，则 $C=1$。
*   $K$ (冷却系数): 与能量 $E$ 成反比。能量越高，冷却越快。
    *   $$K = \frac{24 \text{ hours}}{E_{\text{total}}}$$
    *   *示例*：
        *   普通内容 ($E=1$): $K=24h$。约 24 小时后恢复 63% 概率。
        *   高分内容 ($E=50$): $K=0.5h$。约 30 分钟后恢复 63% 概率。

### 2.3 反馈调节 (Immunity, $I$)

解决“视而不见”的内容。

$$I = \frac{1}{1 + (\text{ShowCount} - \text{ClickCount} \times 3)}$$

*   `ShowCount`: 在时光胶囊露脸总次数。
*   `ClickCount`: 在时光胶囊内被点击(打开/复制)的总次数。
*   **逻辑**：
    *   每次露脸，分母+1，权重微降。
    *   每次点击，分母-3，权重回升。
    *   若长期不点，$I$ 趋向 0，内容逐渐“隐形”。

---

## 3. 性能优化：分层采样 (Stratified Sampling)

为了应对海量数据（10w+条）场景，算法不进行全量实时计算，而是采用 **“分层索引采样”** 策略。

### 3.1 采样池定义
利用 IndexedDB 的 `by-score` 索引：
*   **高分池 (High Pool)**: `score >= 7`。
*   **普通池 (Normal Pool)**: `score < 7`。

### 3.2 采样流程
每次刷新时：
1.  **快速盲抽**：
    *   从 **高分池** 随机抽取 50 个 ID。
    *   从 **普通池** 随机抽取 50 个 ID。
    *   *注*：此步骤仅操作索引 Key，不加载 Value，耗时极低。
2.  **批量加载**：
    *   仅从数据库读取这 100 条完整数据。
3.  **精细计算**：
    *   对这 100 条数据应用上述 $W$ 公式。
4.  **加权选择**：
    *   根据 $W$ 权重，使用加权随机算法选出最终 3 条。

---

## 4. 维护指南

*   **参数调整**：所有权重常量定义在 `src/dashboard/utils/algorithm.ts`。
*   **数据结构**：依赖 `ContentMetadata` 中的 `lastShownAt`, `capsuleShowCount`, `capsuleClickCount`, `capsuleHoverCount`。
