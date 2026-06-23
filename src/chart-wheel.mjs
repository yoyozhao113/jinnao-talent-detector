/**
 * 星盘图绘制器 v2 - Canvas 实现
 * 标准星盘画法：ASC 固定在左侧（9点钟方向），黄道带随出生时间旋转
 * 绘制全部10颗行星 + 上升点，标注符号、度数、宫位
 * ★ 新增：相位连线（合/刑/冲/拱/六合）+ 外圈刻度 + 相位图例
 */

const PLANET_SYMBOLS = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
  rising: 'Asc'
};

const PLANET_COLORS = {
  sun: '#f5af19', moon: '#c0bdd8', mercury: '#66bb6a', venus: '#e91e8c',
  mars: '#ff5252', jupiter: '#ffa726', saturn: '#78909c', uranus: '#4dd0e1',
  neptune: '#7c4dff', pluto: '#8d6e63'
};

const SIGN_COLORS = [
  '#ff6b6b','#ffa94d','#ffd43b','#a9e34b','#69db7c','#38d9a9',
  '#4dabf7','#748ffc','#9775fa','#da77f2','#f783ac','#e64980'
];

const SIGN_CHARS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];

/** 相位配置：角度、容许度、颜色、线宽 */
const ASPECT_CONFIG = {
  conjunction:   { angle: 0,   orb: 8, color: '#ff9800', label: '☌ 合相', dash: [] },
  sextile:       { angle: 60,  orb: 6, color: '#4caf50', label: '✡ 六合', dash: [3, 2] },
  square:        { angle: 90,  orb: 8, color: '#f44336', label: '□ 刑克', dash: [] },
  trine:         { angle: 120, orb: 8, color: '#2196f3', label: '△ 三合', dash: [] },
  opposition:    { angle: 180, orb: 8, color: '#e91e63', label: '☍ 对冲', dash: [] },
};

const PLANETS_CN = {sun:'太阳',moon:'月亮',mercury:'水星',venus:'金星',mars:'火星',jupiter:'木星',saturn:'土星',uranus:'天王星',neptune:'海王星',pluto:'冥王星'};

/** 黄道经度 → Canvas角度（弧度），使 ASC 固定在左侧180°(9点钟方向)
 * 正确映射：黄经逆时针增加 → Canvas顺时针增加，需反转方向
 * 验证：ASC→180°(左), MC→270°附近(顶), IC→90°附近(底), DSC→0°(右)
 */
function eclipticToCanvas(lon, ascLon) {
  const canvasDeg = ((180 - lon + ascLon) % 360 + 360) % 360;
  return canvasDeg * Math.PI / 180;
}

/** 角度差（0~180） */
function angleDiff(a1, a2) {
  let d = Math.abs(a1 - a2);
  if (d > 180) d = 360 - d;
  return d;
}

export function drawChartWheel(canvasId, chartData) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  const size = Math.min(420, window.innerWidth - 32);
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  ctx.scale(dpr, dpr);

  const cx = size / 2, cy = size / 2;
  const outerR = size / 2 - 10;

  // 取数据（兼容 basic 和 full 结构）
  const chart = chartData.basic || chartData;
  const planets = chart.planets || {};
  const houses = chart.houses || [];
  const aspects = chart.aspects || [];
  const ascLon = planets.rising ? planets.rising.longitude : (houses[0]?.cuspDeg || 0);

  // ====== 0. 背景圆 ======
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  ctx.beginPath();
  ctx.arc(cx, cy, outerR + 6, 0, Math.PI * 2);
  ctx.fill();

  // ====== 1. 外圈刻度（每5°一小格，每30°一大格） ======
  const tickOuterR = outerR + 4;
  for (let deg = 0; deg < 360; deg += 5) {
    const angle = eclipticToCanvas(deg, ascLon);
    const isMajor = (deg % 30 === 0);
    const tOut = tickOuterR;
    const tIn = isMajor ? tickOuterR - 6 : tickOuterR - 3;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * tOut, cy + Math.sin(angle) * tOut);
    ctx.lineTo(cx + Math.cos(angle) * tIn, cy + Math.sin(angle) * tIn);
    ctx.strokeStyle = isMajor ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)';
    ctx.lineWidth = isMajor ? 1 : 0.5;
    ctx.stroke();
  }

  // ====== 2. 外圈黄道带（12星座） ======
  const zodiacR = outerR;
  for (let i = 0; i < 12; i++) {
    const startLon = i * 30;
    const endLon = (i + 1) * 30;
    const startAngle = eclipticToCanvas(startLon, ascLon);
    const endAngle = eclipticToCanvas(endLon, ascLon);

    ctx.beginPath();
    ctx.arc(cx, cy, zodiacR, startAngle, endAngle);
    ctx.arc(cx, cy, zodiacR - 24, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = SIGN_COLORS[i] + '25';
    ctx.fill();
    ctx.strokeStyle = SIGN_COLORS[i] + '55';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // ====== 3. 宫位线 ======
  const houseInnerR = zodiacR - 24;
  const aspectOrbitR = houseInnerR - 20;  // 相位连线轨道
  const planetOrbitR = aspectOrbitR - 14; // 行星符号轨道
  const innerR = planetOrbitR - 18;

  for (let i = 0; i < 12; i++) {
    if (!houses[i]) continue;
    const cuspDeg = houses[i].cuspDeg;
    const angle = eclipticToCanvas(cuspDeg, ascLon);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * houseInnerR, cy + Math.sin(angle) * houseInnerR);
    ctx.lineTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
    const isAscMc = (i === 0 || i === 9);
    ctx.strokeStyle = isAscMc ? 'rgba(245,175,25,0.85)' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = isAscMc ? 1.5 : 0.7;
    ctx.stroke();

    // 宫号 — 放在宫头线内侧（靠近圆心方向），从 ASC 开始逆时针排列
    // 标准星盘：1宫从 ASC 线开始，数字放在宫内靠近内圈的位置
    if (houses[(i + 1) % 12]) {
      const nextDeg = houses[(i + 1) % 12].cuspDeg;
      // 放在宫头到宫中心之间的 30% 处（靠近宫头，不在正中心）
      let labelDeg = cuspDeg + (nextDeg - cuspDeg + 360) % 360 * 0.3;
      if (labelDeg >= 360) labelDeg -= 360;
      const labelAngle = eclipticToCanvas(labelDeg, ascLon);
      // 靠近内圈（圆心方向），比 innerR 更内收 6px
      const labelR = innerR - 6;
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), cx + Math.cos(labelAngle) * labelR, cy + Math.sin(labelAngle) * labelR);
    }
  }

  // ====== 4. 内圈装饰线 ======
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // ====== 5. 收集行星 & 计算位置 ======
  const drawOrder = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];
  const planetList = [];

  drawOrder.forEach(name => {
    const p = planets[name];
    if (!p || typeof p.longitude !== 'number') return;
    planetList.push({
      name,
      lon: p.longitude,
      symbol: PLANET_SYMBOLS[name] || '?',
      color: PLANET_COLORS[name] || '#ccc',
      sign: p.signEn || p.sign || '',
      deg: p.degree ?? 0,
      min: p.minute ?? 0,
      house: p.house ?? null,
    });
  });

  if (planets.rising?.longitude != null) {
    planetList.push({ name: 'rising', lon: planets.rising.longitude, symbol: 'Asc', color: '#f5af19', sign: '', deg: 0, min: 0, house: 1 });
  }

  planetList.sort((a, b) => a.lon - b.lon);

  // 智能偏移避免重叠
  const minSepDeg = 16;
  const positions = planetList.map(p => ({
    ...p,
    baseAngle: eclipticToCanvas(p.lon, ascLon),
    offset: 0,
  }));

  for (let pass = 0; pass < 4; pass++) {
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        let diff = positions[j].baseAngle - positions[i].baseAngle;
        while (diff < 0) diff += Math.PI * 2;
        while (diff > Math.PI * 2) diff -= Math.PI * 2;
        if (diff > Math.PI) continue;
        const diffDeg = diff * 180 / Math.PI;
        if (diffDeg < minSepDeg) {
          const push = ((minSepDeg - diffDeg) / 2) * Math.PI / 180;
          positions[i].offset -= push;
          positions[j].offset += push;
        }
      }
    }
  }

  // 构建经度→位置的查找表（用于相位连线端点）
  const posMap = new Map();
  positions.forEach(p => posMap.set(p.name, p));

  // ====== 6. ★ 相位连线（在行星层下方绘制） ======
  const drawnAspects = []; // 记录已绘制的相位，用于图例

  if (aspects && aspects.length > 0) {
    // 按重要性排序：刑/冲 > 合 > 三合/六合
    const aspectOrder = { square: 0, opposition: 1, conjunction: 2, trine: 3, sextile: 4 };
    const sortedAspects = [...aspects].sort((a, b) => {
      const ak = a.type || '';
      const bk = b.type || '';
      return (aspectOrder[ak] ?? 99) - (aspectOrder[bk] ?? 99);
    });

    sortedAspects.forEach(aspect => {
      const p1Name = aspect.planet1En;
      const p2Name = aspect.planet2En;
      if (!p1Name || !p2Name) return;
      const pos1 = posMap.get(p1Name);
      const pos2 = posMap.get(p2Name);
      if (!pos1 || !pos2) return;

      // 匹配相位类型获取样式
      let cfg = null;
      if (aspect.type === '合相') cfg = ASPECT_CONFIG.conjunction;
      else if (aspect.type === '六分相') cfg = ASPECT_CONFIG.sextile;
      else if (aspect.type === '四分相') cfg = ASPECT_CONFIG.square;
      else if (aspect.type === '三分相') cfg = ASPECT_CONFIG.trine;
      else if (aspect.type === '对分相') cfg = ASPECT_CONFIG.opposition;

      if (!cfg) return;

      const a1 = pos1.baseAngle + pos1.offset;
      const a2 = pos2.baseAngle + pos2.offset;

      // 绘制直线连线（在 aspectOrbitR 轨道上）
      const r = aspectOrbitR;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
      ctx.lineTo(cx + Math.cos(a2) * r, cy + Math.sin(a2) * r);

      ctx.strokeStyle = cfg.color + 'cc'; // 80% 不透明度
      ctx.lineWidth = 1.2;
      if (cfg.dash && cfg.dash.length > 0) {
        ctx.setLineDash(cfg.dash);
      } else {
        ctx.setLineDash([]);
      }
      ctx.stroke();
      ctx.setLineDash([]); // 重置

      drawnAspects.push({ ...aspect, _color: cfg.color });
    });
  }

  // ====== 7. 绘制行星符号 ======
  const drawR = planetOrbitR;
  positions.forEach(p => {
    const a = p.baseAngle + p.offset;
    const px = cx + Math.cos(a) * drawR;
    const py = cy + Math.sin(a) * drawR;

    // 行星背景光晕
    ctx.beginPath();
    ctx.arc(px, py, 9, 0, Math.PI * 2);
    ctx.fillStyle = p.color + '18';
    ctx.fill();

    // 行星符号
    ctx.fillStyle = p.color;
    ctx.font = p.name === 'rising' ? 'bold 12px sans-serif' : '20px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.symbol, px, py);

    // 度数小字
    if (p.name !== 'rising') {
      ctx.fillStyle = 'rgba(255,255,255,0.42)';
      ctx.font = '7px sans-serif';
      ctx.fillText(`${p.deg}°`, px, py + 12);
    }
  });

  // ====== 8. ASC / MC / IC / DSC 标签 ======
  ctx.fillStyle = '#f5af19';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // ASC — 左侧固定
  ctx.fillText('ASC', cx + Math.cos(Math.PI) * (innerR + 16), cy + Math.sin(Math.PI) * (innerR + 16));

  // MC
  if (houses[9]) {
    const mcAngle = eclipticToCanvas(houses[9].cuspDeg, ascLon);
    ctx.fillText('MC', cx + Math.cos(mcAngle) * (innerR + 16), cy + Math.sin(mcAngle) * (innerR + 16));
  }

  // IC
  if (houses[3]) {
    const icAngle = eclipticToCanvas(houses[3].cuspDeg, ascLon);
    ctx.fillStyle = 'rgba(245,175,25,0.35)';
    ctx.font = '8px sans-serif';
    ctx.fillText('IC', cx + Math.cos(icAngle) * (innerR + 13), cy + Math.sin(icAngle) * (innerR + 13));
  }

  // DESC
  if (houses[6]) {
    const descAngle = eclipticToCanvas(houses[6].cuspDeg, ascLon);
    ctx.fillStyle = 'rgba(245,175,25,0.35)';
    ctx.font = '8px sans-serif';
    ctx.fillText('DSC', cx + Math.cos(descAngle) * (innerR + 13), cy + Math.sin(descAngle) * (innerR + 13));
  }

  // ====== 9. 中心装饰 ======
  ctx.beginPath();
  ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(245,175,25,0.55)';
  ctx.fill();

  // ====== 10. 右下角相位小圆点 Badge（点击展开相位表） ======
  let badgeRect = null;
  if (drawnAspects.length > 0) {
    const badgeSize = 32;
    const bx = size - badgeSize - 6;
    const by = size - badgeSize - 6;

    // 外圈
    ctx.beginPath();
    ctx.arc(bx + badgeSize/2, by + badgeSize/2, badgeSize/2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 文本：☍ + 数量
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('☍' + drawnAspects.length, bx + badgeSize/2, by + badgeSize/2);

    badgeRect = { x: bx, y: by, w: badgeSize, h: badgeSize };

    // 将相位数据存到 canvas 元素上（供点击读取）
    canvas._aspects = drawnAspects;
  }

  // ====== 10.5 星座符号（最上层，确保不被遮挡） ======
  ctx.save();
  for (let i = 0; i < 12; i++) {
    const startLon = i * 30;
    const endLon = (i + 1) * 30;
    const midLon = (startLon + endLon) / 2;
    const midAngle = eclipticToCanvas(midLon, ascLon);
    // 先画黑色描边（3px），再画彩色填充 → 符号清晰突出
    ctx.font = '15px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.strokeText(SIGN_CHARS[i], cx + Math.cos(midAngle) * (zodiacR - 12), cy + Math.sin(midAngle) * (zodiacR - 12));
    ctx.fillStyle = SIGN_COLORS[i];
    ctx.fillText(SIGN_CHARS[i], cx + Math.cos(midAngle) * (zodiacR - 12), cy + Math.sin(midAngle) * (zodiacR - 12));
  }
  ctx.restore();

  // ====== 11. 返回绘制的相位列表（供外部生成图例） ======
  return { drawnAspects, planetCount: positions.length, badgeRect };
}

window.drawChartWheel = drawChartWheel;
