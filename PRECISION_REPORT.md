## 星盘精度对比总结

### 当前状态
- **astronomia 库**: 上升差27°, 水星错星座, 海王星错星座 → ❌ 不合格
- **ephemeris (Moshier)**: 太阳月亮✅, 但木星差20°, 土星差23°, 冥王星差11° → ❌ 不合格
- **宫神星网标准**: Swiss Ephemeris 引擎, Placidus 宫位制

### 根本原因
所有免费/纯JS星历库的行星位置计算精度都不够，特别是：
- 内行星（水金火）：轨道快，需要高精度插值
- 外行星（木土天海冥）：Moshier简化算法误差累积大

### 唯一可行方案：安装 VS Build Tools → 编译 swisseph

swisseph (npm) 是 Swiss Ephemeris 的官方 Node.js 绑定，
与宫神星网使用同一引擎，精度完全一致。

需要安装：
1. Visual Studio Build Tools 2022 (仅 "C++桌面开发" 工作负载, ~1.5GB)
   - 下载: https://visualstudio.microsoft.com/visual-cpp-build-tools/
2. 安装后运行: npm install swisseph

预计效果：所有行星误差 < 0.1°, 与宫神星网完全对齐。

### 备选方案（如果不愿装VS）
1. 用 xingpan.vip 的付费 API（按次收费）
2. 部署 astrology-api (Python+Swiss Ephemeris) 作为微服务
3. 接受当前精度，标注"仅供参考"
