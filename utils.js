// ===================== 通用工具模块 =====================
// OCR 识别、文本清理、相似度匹配等纯函数工具
// 由 main.js 通过 eval(file.readTextSync("utils.js")) 加载
// 注:用 var 而非 const,保证经 eval 加载后声明能泄漏到主脚本作用域
var Utils = {
    /**
     * 核心文本扫描（OCR识别）函数
     * @param {Object} 识别区域 {X,Y,WIDTH,HEIGHT}（使用OCR_REGIONS_1080P预设）
     * @return {Object} 识别结果（count：识别到的文本数，数组：每个文本的内容、坐标）
     */
    easyOCR: async ({ X, Y, WIDTH, HEIGHT }) => {
        try {
            const locationOcrRo = RecognitionObject.Ocr(X, Y, WIDTH, HEIGHT);
            let captureRegion = captureGameRegion();
            let OCRresults = await captureRegion.findMulti(locationOcrRo);
            return OCRresults;
        } catch (error) {
            log.error("easyOCR识别出错: {error}", error.message);
            return { count: 0 };
        }
    },

    /**
     * 简化版文本扫描：仅返回第一个识别结果
     * @param {Object} 识别区域
     * @return {string} 第一个识别到的文本（空串表示未识别到）
     */
    easyOCROne: async (ocrdata) => {
        const results = await Utils.easyOCR(ocrdata);
        if (results.count > 0) {
            return results[0].text.trim();
        }
        return "";
    },

    /**
     * 文本清理：去除标点、特殊字符
     * @param {string} 原始文本
     * @return {string} 清理后的纯文本
     */
    cleanText: (text) => {
        if (!text) return "";
        return text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, "").trim();
    },

    /**
     * 文本相似度匹配（容错OCR识别误差）
     * @param {string} a 对比文本1
     * @param {string} b 对比文本2
     * @return {number} 相似度（0=完全不匹配，1=完全匹配）
     */
    similarity: (a, b) => {
        const s1 = Utils.cleanText(String(a || "")).toLowerCase();
        const s2 = Utils.cleanText(String(b || "")).toLowerCase();

        if (!s1 && !s2) return 1;
        if (!s1 || !s2) return 0;

        const dist = (() => {
            const n = s1.length;
            const m = s2.length;
            const d = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

            for (let i = 0; i <= n; i++) d[i][0] = i;
            for (let j = 0; j <= m; j++) d[0][j] = j;

            for (let i = 1; i <= n; i++) {
                for (let j = 1; j <= m; j++) {
                    const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
                    d[i][j] = Math.min(
                        d[i - 1][j] + 1,
                        d[i][j - 1] + 1,
                        d[i - 1][j - 1] + cost
                    );
                }
            }
            return d[n][m];
        })();

        const maxLen = Math.max(s1.length, s2.length);
        return 1 - dist / maxLen;
    }
};
