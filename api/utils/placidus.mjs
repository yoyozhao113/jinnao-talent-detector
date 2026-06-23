/**
 * Placidus 宫位制实现
 * 
 * 核心公式:
 * RA(x) = RA(MC) + k * SA(δ(x))
 * 其中 SA = arccos(-tan(φ)·tan(δ)) 为赤道半弧
 * k 值: 1/3, 2/3, 4/3, 5/3 分别对应四个中间宫头
 * 下半圈通过对称性求解: x + 180°
 * 
 * 用迭代法收敛（raDecToLon 从赤经+赤纬反算黄道经度）
 */

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const OBL = 23.4392911;
const OBL_R = OBL * DEG;

function norm(d) { return ((d % 360) + 360) % 360; }

function lonToRA(lonDeg) {
  let ra = Math.atan2(Math.sin(lonDeg * DEG) * Math.cos(OBL_R), Math.cos(lonDeg * DEG)) * RAD;
  return norm(ra);
}

function lonToDec(lonDeg) {
  return Math.asin(Math.sin(lonDeg * DEG) * Math.sin(OBL_R)) * RAD;
}

function raDecToLon(raDeg, decDeg) {
  let lon = Math.atan2(
    Math.sin(raDeg * DEG) * Math.cos(OBL_R) - Math.tan(decDeg * DEG) * Math.sin(OBL_R),
    Math.cos(raDeg * DEG)
  ) * RAD;
  return norm(lon);
}

function semiArc(decDeg, latDeg) {
  const v = -(Math.tan(latDeg * DEG) * Math.tan(decDeg * DEG));
  if (v < -1 || v > 1) return null;
  return Math.acos(v) * RAD;
}

/**
 * 迭代求解 Placidus 宫头
 * 给定 MC赤经、纬度、k因子，迭代求黄道经度
 */
function solveCusp(mcRA_deg, latDeg, k) {
  let lon = norm(mcRA_deg + k * 90);
  
  for (let iter = 0; iter < 300; iter++) {
    const dec = lonToDec(lon);
    const saVal = semiArc(dec, latDeg);
    if (saVal === null) return null;
    
    const targetRA = norm(mcRA_deg + k * saVal);
    const newLon = raDecToLon(targetRA, dec);
    
    let diff = norm(newLon - lon);
    if (diff > 180) diff -= 360;
    if (Math.abs(diff) < 0.005) return norm(lon);
    lon = norm(newLon);
  }
  return norm(lon);
}

/**
 * 计算 Placidus 12 宫头
 * @param {number} mcDeg - MC 黄道经度(度)
 * @param {number} ascDeg - ASC 黄道经度(度) 
 * @param {number} latDeg - 观测纬度(度)
 * @returns {number[]} 12个宫头黄道经度(度)
 */
export function calcPlacidusHouses(mcDeg, ascDeg, latDeg) {
  const mcRA = lonToRA(mcDeg);
  const icDeg = norm(mcDeg + 180);
  const dscDeg = norm(ascDeg + 180);
  
  const c11 = solveCusp(mcRA, latDeg, 1/3);
  const c12 = solveCusp(mcRA, latDeg, 2/3);
  const c2  = solveCusp(mcRA, latDeg, 4/3);
  const c3  = solveCusp(mcRA, latDeg, 5/3);
  
  const fb = (v, eq) => v !== null ? norm(v) : eq;
  
  const cusps = [
    ascDeg,                        // 1宫
    fb(c2, norm(ascDeg + 30)),     // 2宫
    fb(c3, norm(ascDeg + 60)),     // 3宫
    icDeg,                         // 4宫
    fb(c11 !== null ? norm(c11 + 180) : null, norm(icDeg + 30)),  // 5宫
    fb(c12 !== null ? norm(c12 + 180) : null, norm(icDeg + 60)),  // 6宫
    dscDeg,                        // 7宫
    fb(c2 !== null ? norm(c2 + 180) : null, norm(dscDeg + 30)),  // 8宫
    fb(c3 !== null ? norm(c3 + 180) : null, norm(dscDeg + 60)),  // 9宫
    mcDeg,                         // 10宫
    fb(c11, norm(mcDeg + 30)),     // 11宫
    fb(c12, norm(mcDeg + 60)),     // 12宫
  ];
  
  // 验证顺序（9宫→10宫允许跨0°）
  for (let i = 0; i < 11; i++) {
    if (i === 8) continue;
    if (cusps[i+1] <= cusps[i]) {
      return Array.from({length: 12}, (_, j) => norm(ascDeg + j * 30));
    }
  }
  
  return cusps;
}

export { norm };
