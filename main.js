const Utils = {
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

// ===================== 加载依赖模块=====================
eval(file.readTextSync("detection.js"));
eval(file.readTextSync("calculate.js"));
const keyHook = new KeyMouseHook();
// 注册键盘事件来替代原有的状态检测
keyHook.OnKeyDown((keyCode) => {
    handleKeyboardStateDetection(keyCode);
});

/*/ T按键处理函数废案
async function handleTPress(keyCode) {
    // 只在录制状态下处理F和T按键
    if (!isRecording || isPaused) {
        return;
    }
    // 处理T键
    if (keyCode === 'T') {
        log.info("检测到T键按下，记录按键 T");
        processData.push("按键 T");
        await saveProcessData();
        log.info("已将'按键 T'添加到process.json");
    }
}
/*/

// 全局键盘状态处理函数
async function handleKeyboardStateDetection(keyCode) {
    // 直接处理功能键 F7-F10
    if (keyCode === SETTINGS.keyDialogue) {
        // 对话功能
        if (isRecording) {
            log.info(`检测到按下${SETTINGS.keyDialogue}键，触发保存路径 + 对话`);
            await recordFinalPosition();
            await handleDialogue();
        }
        return;
    }
    
    if (keyCode === SETTINGS.keyFight) {
        // 战斗功能
        if (isRecording) {
            log.info(`检测到按下${SETTINGS.keyFight}键，触发保存路径 + 战斗`);
            await recordFinalPosition();
            await handleFight();
        } else {
            // 非录制状态下，以传送点开始录制
            startPointType = "teleport";
            log.info(`检测到按下${SETTINGS.keyFight}键，起始点类型设置为"传送点"`);
            isRecording = true;
            lastEndType = null;
            globalThis.lastEndType = lastEndType;
            hasShownEndMessage = false;
            await startNewRecording();
            log.info("新录制段已开始，等待用户操作:");
            log.info(`- 按下${SETTINGS.keyDialogue}：保存路径 + 对话`);
            log.info(`- 按下${SETTINGS.keyFight}：保存路径 + 战斗`);
            log.info(`- 按下${SETTINGS.keyPause}：保存路径 + 暂停`);
            log.info(`- 按下${SETTINGS.keySave}：只保存路径`);
        }
        return;
    }
    
    if (keyCode === SETTINGS.keyPause) {
        // 暂停/恢复功能
        if (!isRecording) {
            // 非录制状态下，以当前位置开始录制
            startPointType = "path";
            log.info(`检测到按下${SETTINGS.keyPause}键，起始点类型设置为"当前位置"`);
            isRecording = true;
            lastEndType = null;
            globalThis.lastEndType = lastEndType;
            hasShownEndMessage = false;
            await startNewRecording();
            log.info("新录制段已开始，等待用户操作:");
            log.info(`- 按下${SETTINGS.keyDialogue}：保存路径 + 对话`);
            log.info(`- 按下${SETTINGS.keyFight}：保存路径 + 战斗`);
            log.info(`- 按下${SETTINGS.keyPause}：保存路径 + 暂停`);
            log.info(`- 按下${SETTINGS.keySave}：只保存路径`);
            return;
        }
        log.info(`检测到按下${SETTINGS.keyPause}键，触发保存路径 + 暂停`);
        await handlePause();
        return;
    }
    
    if (keyCode === SETTINGS.keySave) {
        // 保存功能
        if (isRecording) {
            log.info(`检测到按下${SETTINGS.keySave}键，触发只保存路径`);
            isRecording = false; // 先停止录制，防止继续记录
            await recordFinalPosition();
            await handleEndRecording();
        } else {
            log.warn(`当前未处于录制状态，无法保存`);
        }
        return;
    }
    
    // 处理其他界面按键（B/C/O/G/F2/F3/F4/J/M 等）- 用于剧情界面检测
    const stateMapping = {
        'B': ELEMENT_STATE.B,
        'C': ELEMENT_STATE.C,
        'O': ELEMENT_STATE.O,
        'G': ELEMENT_STATE.G,
        'F2': ELEMENT_STATE.F2,
        'F3': ELEMENT_STATE.F3,
        'F4': ELEMENT_STATE.F4,
        'J': ELEMENT_STATE.J,
        'M': ELEMENT_STATE.MAP,
        'Escape': ELEMENT_STATE.MAINUI
    };
    
    const targetState = stateMapping[keyCode];
    if (targetState !== undefined) {
        // 更新 UI 状态监控器
        if (uiStateMonitor) {
            uiStateMonitor.lastElementState = targetState;
        }
        // 触发状态变化检测
        await checkUIStateChange();
    }
}
// ===================== 基础常量定义（全局通用）=====================
const MOVE_STATE = {
    NORMAL: "normal",
    FLY: "fly",
    CLIMB: "climb",
    SWIM: "swim",
    UNKNOWN: "unknown"
};

const ELEMENT_STATE = {
    MAINUI: 0,
    B: 1,
    C: 2,
    O: 3,
    G: 4,
    F2: 5,
    F3: 6,
    F4: 7,
    J: 8,
    MAP: 9,
    UNKNOWN: -1,
    Story: -2
};

const MOVE_MODES = {
    WALK: "walk",
    DASH: "dash",
    FLY: "fly",
    CLIMB: "climb",
    SWIM: "swim",
    JUMP: "jump"
};

const OCR_REGIONS_1080P = {
    TASK_DESCRIPTION: { X: 73, Y: 245, WIDTH: 400, HEIGHT: 33 }, // 任务主描述（精准坐标）
    DIALOG_OPTION: { X: 1150, Y: 300, WIDTH: 400, HEIGHT: 420 }, // 右侧对话选项区
    NPC_NAME: { X: 40, Y: 260, WIDTH: 380, HEIGHT: 40 }, // 任务子描述（NPC相关）
    FIGHT_TARGET: { X: 850, Y: 50, WIDTH: 220, HEIGHT: 40 }, // 顶部战斗目标区
    MAIN_UI_TIP: { X: 40, Y: 310, WIDTH: 380, HEIGHT: 40 } // 任务追踪栏附加文本
};

const SETTINGS = {
    author: settings.author || "",
    questName: settings.questName,
    questLocation: settings.questLocation,
    runMode: settings.runMode || "录制模式",
    keyDialogue: settings.keyDialogue,
    keyFight: settings.keyFight,
    keyPause: settings.keyPause,
    keySave: settings.keySave,
    autoFight: settings.autoFight !== false,
    maxRecordingCycles: 72000,
    strategyScript: "w(5)",
    teleportThreshold: 20,
    enableTransmissionDetection: true,
    anomalyDetectionDistance: 1000
};

// ===================== 全局状态变量（记录录制过程数据）=====================
let trackData = {
    "info": {
        "name": `${SETTINGS.questName}`,
        "type": "collect",
        "author": SETTINGS.author,
        "version": settings.version,
        "description": settings.description,
        "map_name": "Teyvat",
        "bgi_version": "0.47.2"
    },
    "positions": []
};

let processData = [];
let isRecording = false;
let isPaused = false;
let currentTrackFile = 1;
let lastPosition = null;
let uiStateMonitor = null;
let lastEndType = null;
globalThis.lastEndType = lastEndType;
let justExitedMap = false;
let wasInMap = false;
let logmode = false;
let hasShownEndMessage = false; // 防止重复提示录制结束
let isProcessingStory = false; // 防止重复处理剧情界面
let startPointType = "teleport"; // 起始点类型，根据按键判断
if (!settings.logmode){
    logmode = true; // 详细日志模式
}

// ===================== 文本扫描结果写入工具（增加截图测试）=====================
async function scanTextAndWriteToProcess(ocrRegion, textType, isForce = false) {
    if (!isRecording || isPaused) {
        if (logmode) log.debug("录制未启动或已暂停，跳过文本扫描写入");
        return;
    }

    // 新增：保存扫描区域的测试截图，用于验证区域是否正确
	//注释了注释了天天报错(派蒙流口水)
	/*/
    try {
        const captureRegion = captureGameRegion();
        const testScreenshot = captureRegion.screenshot(
            ocrRegion.X, 
            ocrRegion.Y, 
            ocrRegion.WIDTH, 
            ocrRegion.HEIGHT
        );
        const screenshotPath = `test_${textType}.png`;
        testScreenshot.save(screenshotPath);
        log.info(`已保存【${textType}】区域的测试截图: ${screenshotPath}`);
    } catch (error) {
        log.error(`保存测试截图失败: ${error.message}`);
    }
	/*/

    if (logmode) log.info(`开始扫描【${textType}】，区域：X=${ocrRegion.X}, Y=${ocrRegion.Y}, 宽=${ocrRegion.WIDTH}, 高=${ocrRegion.HEIGHT}`);
    
    const ocrResults = await Utils.easyOCR(ocrRegion);
    let scanText = "";
    let textList = [];

    if (ocrResults.count > 0) {
        for (let i = 0; i < ocrResults.count; i++) {
            const text = ocrResults[i].text.trim();
            if (text) textList.push(text);
        }
        scanText = textList.join(" | ");
        if (logmode) log.info(`扫描到【${textType}】：${scanText}`);
    } else {
        log.warn(`未扫描到【${textType}】文本`);
        if (!isForce) return;
        scanText = `未识别到${textType}`;
    }

    let processCmd = `//${scanText}:`;
	globalThis.savenametext = `${scanText}`;
    processData.push(processCmd);
	if (globalThis.lastEndType == 'save'){
    await saveProcessData();
    if (logmode) log.info(`已将【${textType}】扫描结果写入 process.json`);
	}
}

// ===================== 基础工具函数（文件、路径处理）=====================
async function saveTrackData(filename = null) {
    if (!filename) {
        filename = `${SETTINGS.questName}-${currentTrackFile}.json`;
    }
    if (settings.autoname){
		savenumber = currentTrackFile
		// 清理文件名中的非法字符（括号、斜杠等）
		let safeName = globalThis.savenametext.replace(/[\\/:*?"<>|()（）]/g, "_");
		// 检查文件是否已存在，如果存在则添加序号
		let baseFilename = `${currentTrackFile}-${safeName}`;
		let finalFilename = baseFilename;
		let counter = 1;
		
		while (file.ReadTextSync(`process/${SETTINGS.questLocation}/${SETTINGS.questName}/${finalFilename}.json`)) {
			counter++;
			finalFilename = `${baseFilename}(${counter})`;
		}
		
		filename = `${finalFilename}.json`;
		currentTrackFile++; // 保存后立即递增编号
	}
    const filePath = `process/${SETTINGS.questLocation}/${SETTINGS.questName}/${filename}`;
    
    try {
        await ensureFolderExists(`process/${SETTINGS.questLocation}/${SETTINGS.questName}`);
        const success = file.WriteTextSync(filePath, JSON.stringify(trackData, null, 2));
        if (success) {
            if (logmode) log.info(`追踪数据已保存到：${filePath}`);
            return filename;
        } else {
            throw new Error("文件写入失败");
        }
    } catch (error) {
        log.error(`保存追踪数据失败: ${error}`);
        return null;
    }
}

async function saveProcessData() {
	const processPath = `process/${SETTINGS.questLocation}/${SETTINGS.questName}/process.json`;
	
	try {
		await ensureFolderExists(`process/${SETTINGS.questLocation}/${SETTINGS.questName}`);
		const processText = processData.join('\n');
		const success = file.WriteTextSync(processPath, processText);
		if (success) {
			if (logmode) log.info(`process.json 已保存到：${processPath}`);
			return true;
		} else {
			throw new Error("文件写入失败");
		}
	} catch (error) {
		log.error(`保存process.json失败: ${error}`);
		return false;
	}
}
async function ensureFolderExists(folderPath) {
    if (logmode) log.info(`确保文件夹存在：${folderPath}`);
}

async function recordFinalPosition() {
    await genshin.returnMainUi();
    const position = genshin.getPositionFromMap();
    trackData.positions.push({
        "id": trackData.positions.length + 1,
        "x": position.X,
        "y": position.Y,
        "action": "",
        "move_mode": "walk",
        "action_params": "",
        "type": "target",
        "state": "walk",
        "timestamp": Date.now()
    });
}

// ===================== 路径录制核心函数（坐标、状态记录）=====================
async function recordPosition() {
    if (!isRecording || isPaused) {
        if (logmode) log.debug("录制已停止或暂停，跳过位置记录");
        return true;
    }
    try {
        const position = genshin.getPositionFromMap();
        if (position.X === 0 && position.Y === 0) {
            log.warn("获取坐标失败，跳过此次记录");
            return;
        }

        const moveState = await checkAbnormalState();
        let dist = 0;
        if (lastPosition) {
            dist = distance(position, lastPosition);
        }

        if (dist < 1 && lastPosition) {
            // 位置未变化，跳过（不再输出日志）
            return;
        }

        let pointType = "path";
        let optimizeFlag = true;

        if (justExitedMap) {
            log.info(`刚从地图返回，检测首个点，距离: ${dist.toFixed(2)}`);
            if (dist > SETTINGS.teleportThreshold) {
                log.info("检测为传送点，获取精确坐标...");
                
                keyPress("M");
                await sleep(500);
                
                let bigMapPosition = null;
                let retryCount = 0;
                const maxRetries = 3;

                while (retryCount < maxRetries && !bigMapPosition) {
                    try {
                        bigMapPosition = genshin.getPositionFromBigMap();
                        if (bigMapPosition && bigMapPosition.X !== 0 && bigMapPosition.Y !== 0) {
                            log.info(`大地图精确坐标获取成功 (第${retryCount + 1}次尝试): X=${bigMapPosition.X.toFixed(3)}, Y=${bigMapPosition.Y.toFixed(3)}`);
                            position.X = bigMapPosition.X;
                            position.Y = bigMapPosition.Y;
                            break;
                        } else {
                            throw new Error("获取到无效坐标 (0,0)");
                        }
                    } catch (error) {
                        retryCount++;
                        log.warn(`第${retryCount}次获取大地图坐标失败: ${error.message}`);
                        if (retryCount < maxRetries) {
                            log.info(`等待200ms后进行第${retryCount + 1}次重试...`);
                            await sleep(200);
                        } else {
                            log.warn(`重试${maxRetries}次后仍然失败，使用原坐标`);
                        }
                    }
                }

                genshin.returnMainUi();
                await sleep(100);
                
                pointType = "teleport";
                optimizeFlag = false;
            } else {
                log.info("非传送点，记录为普通路径点");
            }
            justExitedMap = false;
        } else if (dist > SETTINGS.anomalyDetectionDistance && lastPosition) {
            log.warn(`检测到异常距离: ${dist.toFixed(2)} > ${SETTINGS.anomalyDetectionDistance}，忽略该点`);
            return;
        }

        const positionObj = {
            "id": trackData.positions.length + 1,
            "x": position.X,
            "y": position.Y,
            "action": "",
            "move_mode": "dash",
            "action_params": "",
            "type": pointType,
            "state": moveState,
            "timestamp": Date.now()
        };
        if (!optimizeFlag) {
            positionObj.optimize = false;
        }

        trackData.positions.push(positionObj);
        lastPosition = { x: position.X, y: position.Y };
        if (logmode) log.info(`已记录路径点 #${positionObj.id}，总计 ${trackData.positions.length} 个点，类型=${pointType}, 距离=${dist.toFixed(2)}`);
    } catch (error) {
        log.error(`recordPosition异常: ${error.message}`);
    }
    return true;
}

function optimizePathPoints() {
    if (logmode) log.info("优化路径点...");
    
    if (trackData.positions.length > 2) {
        const originalPoints = trackData.positions.map((p, index) => ({
            index: index,
            x: p.x,
            y: p.y,
            state: p.state
        }));
        const epsilon = 2.0;
        
        const pointsForRdp = originalPoints.map(p => ({ x: p.x, y: p.y }));
        const simplifiedPoints = rdp(pointsForRdp, epsilon);
        
        if (logmode) log.info(`路径点优化：从${originalPoints.length}个点简化为${simplifiedPoints.length}个点`);
        
        let keptIndices = simplifiedPoints.map(sp => {
            return originalPoints.findIndex(op => op.x === sp.x && op.y === sp.y);
        }).filter(idx => idx !== -1);

        const segments = [];
        let segStart = 0;
        for (let i = 1; i < originalPoints.length; i++) {
            if (originalPoints[i].state !== originalPoints[i - 1].state) {
                segments.push({ state: originalPoints[segStart].state, start: segStart, end: i - 1 });
                segStart = i;
            }
        }
        segments.push({ state: originalPoints[segStart].state, start: segStart, end: originalPoints.length - 1 });

        if (!keptIndices.includes(0)) keptIndices.push(0);
        if (!keptIndices.includes(originalPoints.length - 1)) keptIndices.push(originalPoints.length - 1);

        for (let idx = 0; idx < trackData.positions.length; idx++) {
            const pos = trackData.positions[idx];
            if (pos.type === "teleport" || pos.optimize === false) {
                if (!keptIndices.includes(idx)) {
                    keptIndices.push(idx);
                    if (logmode) log.debug(`强制保留传送点/不可优化点 #${idx + 1}`);
                }
            }
        }

        for (const seg of segments) {
            if (seg.state === MOVE_STATE.FLY || seg.state === MOVE_STATE.SWIM) {
                if (!keptIndices.includes(seg.start)) keptIndices.push(seg.start);
                if (!keptIndices.includes(seg.end)) keptIndices.push(seg.end);
            } else if (seg.state === MOVE_STATE.CLIMB) {
                if (!keptIndices.includes(seg.start)) keptIndices.push(seg.start);
                if (!keptIndices.includes(seg.end)) keptIndices.push(seg.end);
                keptIndices = keptIndices.filter(idx => !(idx > seg.start && idx < seg.end));
                trackData.positions[seg.start].__climb_points_count = seg.end - seg.start + 1;
            }
        }

        keptIndices = Array.from(new Set(keptIndices)).sort((a, b) => a - b);
        
        const newPositions = keptIndices.map(idx => ({ ...trackData.positions[idx] }));
        
        newPositions.forEach((pos, idx) => {
            pos.id = idx + 1;
        });

        trackData.positions = newPositions;
    }
}

function processMoveModes() {
    if (logmode) log.info("处理移动模式和动作...");
    
    const positions = trackData.positions;
    if (!positions || positions.length === 0) return;

    for (const pos of positions) {
        if (pos.optimize === false) continue;
        pos.action = "";
    }

    let i = 0;
    while (i < positions.length) {
        const currentState = positions[i].state;
        
        if (currentState === MOVE_STATE.FLY) {
            let end = i;
            while (end + 1 < positions.length && positions[end + 1].state === MOVE_STATE.FLY) end++;
            for (let k = i; k <= end; k++) positions[k].move_mode = MOVE_MODES.FLY;
            positions[end].action = "stop_flying";
            i = end + 1;
            continue;
        }

        if (currentState === MOVE_STATE.SWIM) {
            let end = i;
            while (end + 1 < positions.length && positions[end + 1].state === MOVE_STATE.SWIM) end++;
            for (let k = i; k <= end; k++) positions[k].move_mode = MOVE_MODES.SWIM;
            i = end + 1;
            continue;
        }

        if (currentState === MOVE_STATE.CLIMB) {
            let end = i;
            while (end + 1 < positions.length && positions[end + 1].state === MOVE_STATE.CLIMB) end++;
            const climbStart = i;
            const climbEnd = end;
            const climbPointsCount = positions[climbStart].__climb_points_count || (climbEnd - climbStart + 1);
            const climbDurationSeconds = climbPointsCount * 0.9;
            const climbMode = climbDurationSeconds < 15 ? MOVE_MODES.JUMP : MOVE_MODES.CLIMB;
            
            for (let k = climbStart; k <= climbEnd; k++) positions[k].move_mode = climbMode;
            
            if (climbMode === MOVE_MODES.CLIMB) {
                let backDistAccum = 0;
                for (let j = climbStart - 1; j >= 0; j--) {
                    const segDist = distance(
                        { x: positions[j + 1].x, y: positions[j + 1].y },
                        { x: positions[j].x, y: positions[j].y }
                    );
                    backDistAccum += segDist;
                    if (backDistAccum >= 15) break;
                    if (positions[j].move_mode === MOVE_MODES.DASH) {
                        positions[j].move_mode = MOVE_MODES.WALK;
                    }
                }
            }
            i = end + 1;
            continue;
        }

        i++;
    }

    for (let idx = 0; idx < positions.length; idx++) {
        if (!positions[idx].move_mode || positions[idx].move_mode === "") {
            if (idx === 0) {
                positions[idx].move_mode = MOVE_MODES.WALK;
                continue;
            }
            const prev = positions[idx - 1];
            const dist = distance({ x: positions[idx].x, y: positions[idx].y }, { x: prev.x, y: prev.y });
            positions[idx].move_mode = dist > 10 ? MOVE_MODES.DASH : MOVE_MODES.WALK;
        }
    }
}

async function processTrackData() {
    if (logmode) log.info("开始处理路径数据...");
    optimizePathPoints();
    processMoveModes();
    for (const pos of trackData.positions) {
        delete pos.state;
        delete pos.timestamp;
        delete pos.__climb_points_count;
    }
    if (logmode) log.info("路径数据处理完成");
}

// ===================== 功能触发处理函数（对话/战斗/暂停）=====================
async function handleDialogue() {
    if (!isRecording || isPaused) return;
    
    log.info("开始处理对话功能...");
    
    const filename = await saveCurrentPath();
    if (filename) {
        processData.push(`地图追踪 ${filename}`);
    }
    
    await genshin.returnMainUi();

    await scanTextAndWriteToProcess(OCR_REGIONS_1080P.TASK_DESCRIPTION, "任务主描述");
    const taskText = await Utils.easyOCROne(OCR_REGIONS_1080P.TASK_DESCRIPTION);
    let npcName = "";
    if (taskText) {
        const patterns = [/与(.+?)对话/, /向(.+?)打听/, /找到(.+?)(?=\s|$)/];
        for (const pattern of patterns) {
            const match = taskText.match(pattern);
            if (match && match[1]) {
                npcName = match[1].trim();
                break;
            }
        }
    }

    const dialogResults = await Utils.easyOCR(OCR_REGIONS_1080P.TASK_DESCRIPTION);
    if (npcName && dialogResults.count > 0) {
        for (let i = 0; i < dialogResults.count; i++) {
            let text = dialogResults[i].text;
            let res = dialogResults[i];
            if (text.includes(npcName)) {
                log.info(`点击包含NPC的选项: ${text}`);
                keyDown("VK_MENU");
                await sleep(500);
                click(res.x, res.y);
                leftButtonClick();
                keyUp("VK_MENU");
                break;
            }
        }
        processData.push(`对话 ${npcName}`);
        log.info(`已添加对话指令: 对话 ${npcName}`);
    } else {
        log.warn("未能提取到NPC名称，添加默认对话指令");
        processData.push("对话");
    }

    if (logmode) log.info("按下 F 键触发剧情");
    keyPress("F");
    await sleep(500);

    await saveProcessData();
    lastEndType = 'dialogue';
	globalThis.lastEndType = lastEndType;
    isRecording = false;
    
    await sleep(1000);
    if (logmode) log.info("开始自动剧情");
    await waitForMainUI();
}

async function handleFight() {
    if (!isRecording || isPaused) return;
    
    log.info("开始处理战斗");
    await genshin.returnMainUi();

    const filename = await saveCurrentPath();
    if (filename) {
        processData.push(`地图追踪 ${filename}`);
    }

    await scanTextAndWriteToProcess(OCR_REGIONS_1080P.TASK_DESCRIPTION, "战斗目标");

    processData.push(`战斗`);
    await saveProcessData();
    lastEndType = 'fight';
	globalThis.lastEndType = lastEndType;
    isRecording = false;
    
    if (SETTINGS.autoFight) {
        log.info("启动自动战斗");
        await dispatcher.runTask(new SoloTask("AutoFight"));
    } else {
        log.info("自动战斗已关闭，仅记录战斗指令");
        await waitForMainUI();
    }
}

async function handlePause() {
    if (isRecording) {
        const filename = await saveCurrentPath();
        if (filename) {
            processData.push(`地图追踪 ${filename}`);
            processData.push("暂停");
            await saveProcessData();
        }
        lastEndType = 'pause';
		globalThis.lastEndType = lastEndType;
        isRecording = false;
        log.info("录制已暂停");
    } else {
        isRecording = true;
        lastEndType = null;
		globalThis.lastEndType = lastEndType;
        log.info("录制已恢复");
        await startNewRecording();
        log.info("新录制段已开始，等待用户操作:");
        log.info(`- 按下${SETTINGS.keyDialogue}：保存路径+对话`);
        log.info(`- 按下${SETTINGS.keyFight}：保存路径+战斗`);
        log.info(`- 按下${SETTINGS.keyPause}：保存路径+暂停`);
        log.info(`- 按下${SETTINGS.keySave}：只保存路径`);
    }
}

async function handleEndRecording() {
    log.info("=== 开始处理结束录制 ===");
    const filename = await saveCurrentPath();
    if (filename) {
        processData.push(`地图追踪 ${filename}`);
    }
    await saveProcessData();
    lastEndType = 'save';
	globalThis.lastEndType = lastEndType;
    isRecording = false;
    log.info(`录制已结束，isRecording=${isRecording}，process.json 已生成`);
}

async function handleStoryInterface() {
    if (logmode) log.info("检测到剧情界面，处理特殊逻辑...");
    
    if (trackData.positions.length > 0) {
        const lastPos = trackData.positions[trackData.positions.length - 1];
        trackData.positions[trackData.positions.length - 1].action = "combat_script";
        trackData.positions[trackData.positions.length - 1].action_params = SETTINGS.strategyScript;
        trackData.positions[trackData.positions.length - 1].optimize = false;

        const filename = await saveCurrentPath();
        if (filename) {
            processData.push(`地图追踪 ${filename}`);
            processData.push("等待返回主界面");
            await saveProcessData();
        }
    }

    lastEndType = 'story';
	globalThis.lastEndType = lastEndType;
    isRecording = false;
    isProcessingStory = false; // 重置标志
    if (logmode) log.info("剧情界面处理完成，等待返回主界面...");
    
    // 等待返回主界面
    await waitForMainUI();
}

// ===================== 辅助函数（状态检测、等待）=====================
async function waitForMainUI() {
    if (logmode) log.info("等待返回主界面...");
    
    for (let i = 0; i < 1200; i++) {
        if (isInMainUI()) {
            log.info("已返回主界面");
            
            // 从对话/剧情返回后，不自动开始录制，等待用户手动选择
            if (lastEndType === 'dialogue' || lastEndType === 'story') {
                log.info(`从${lastEndType === 'dialogue' ? '对话' : '剧情'}返回主界面`);
                log.info(`按 ${SETTINGS.keyFight} 键：以"传送点"开始录制`);
                log.info(`按 ${SETTINGS.keyPause} 键：以"当前位置"开始录制`);
            }
            
            return;
        }
        await sleep(1000);
    }
    
    log.warn("等待返回主界面超时");
}

async function startNewRecording() {
    // 重新读取 process.json 以获取最新的文件编号
    const processPath = `process/${SETTINGS.questLocation}/${SETTINGS.questName}/process.json`;
    try {
        const existingContent = file.ReadTextSync(processPath);
        if (existingContent) {
            const processData = existingContent.split('\n').filter(line => line.trim() !== '');
            const maxTrackNumber = findMaxTrackNumber(processData);
            if (maxTrackNumber !== null) {
                currentTrackFile = maxTrackNumber + 1;
                log.info(`重新读取 process.json，找到最大追踪文件数字：${maxTrackNumber}，当前文件段为：${currentTrackFile}`);
            }
        }
    } catch (error) {
        log.warn(`读取 process.json 失败：${error.message}`);
    }
    
    const position = genshin.getPositionFromMap();
    
    // 使用按键判断的起始点类型
    const initialPointType = startPointType;
    const isFirstRecording = (currentTrackFile === 1);
    
    log.info(`起始点类型：${initialPointType === "path" ? "当前位置" : "传送点"}`);
    
    const initialState = await checkAbnormalState();
    
    trackData.positions.push({
        "id": trackData.positions.length + 1,
        "x": position.X,
        "y": position.Y,
        "action": "",
        "move_mode": "walk",
        "action_params": "",
        "type": initialPointType,
        "state": initialState,
        "timestamp": Date.now()
    });
    
    lastPosition = { x: position.X, y: position.Y };

    // 扫描任务追踪栏的主描述和子描述
    await scanTextAndWriteToProcess(OCR_REGIONS_1080P.TASK_DESCRIPTION, "任务主描述");

    if (isFirstRecording) {
        log.info(`第一次录制开始 (文件段${currentTrackFile})，坐标：X=${position.X}, Y=${position.Y}`);
    } else {
        log.info(`新录制段开始 (文件段${currentTrackFile})，坐标：X=${position.X}, Y=${position.Y}`);
    }
}

async function waitForPauseResumeTrigger() {
    log.info(`等待${SETTINGS.keyPause}界面触发开始录制...`);
    
    const pauseState = getElementStateByKey(SETTINGS.keyPause);
    
    while (true) {
        const currentState = await checkElementState();
        
        if (currentState === pauseState) {
            log.info(`检测到${SETTINGS.keyPause}界面，开始录制`);
            await handlePause();
            break;
        }
        
        await sleep(500);
    }
}

async function checkUIStateChange() {
    // 界面检测函数
    const currentState = await checkElementState();
    const changed = uiStateMonitor.lastElementState !== null && uiStateMonitor.lastElementState !== currentState;
    
    // 更新UI状态监控器
    uiStateMonitor.lastElementState = currentState;
    
    if (currentState === ELEMENT_STATE.MAP) {
        wasInMap = true;
    } else if (wasInMap && !justExitedMap) {
        justExitedMap = true;
        wasInMap = false;
            if (logmode) log.info("状态追踪：已离开地图界面，设置传送检测标志");
    }
    
    if (currentState === ELEMENT_STATE.MAINUI && isRecording) {
        await recordPosition();
    }
    
    // 剧情界面检测 - 优先处理，自动保存并等待返回
    if (currentState === ELEMENT_STATE.Story) {
        if (isRecording && !isProcessingStory) {
            isProcessingStory = true; // 设置标志，防止重复处理
            log.info("录制中检测到剧情界面，立即保存路径 + 等待返回主界面");
            await handleStoryInterface(); // 不再调用 recordFinalPosition()
        } else if (!isRecording) {
            log.info("非录制状态检测到剧情界面，等待返回主界面");
            await waitForMainUI();
        }
        return;
    }
    
    if (!changed) {
        // 界面状态未变化（不再输出日志）
        return;
    }

    const stateNames = {
        [ELEMENT_STATE.MAINUI]: "主界面",
        [ELEMENT_STATE.B]: "背包界面 (B键)",
        [ELEMENT_STATE.C]: "角色界面 (C键)",
        [ELEMENT_STATE.O]: "好友界面 (O键)",
        [ELEMENT_STATE.G]: "教程界面 (G键)",
        [ELEMENT_STATE.F2]: "联机界面 (F2键)",
        [ELEMENT_STATE.F3]: "祈愿界面 (F3键)",
        [ELEMENT_STATE.F4]: "纪行界面 (F4键)",
        [ELEMENT_STATE.J]: "任务界面 (J键)",
        [ELEMENT_STATE.MAP]: "地图界面",
        [ELEMENT_STATE.Story]: "剧情界面",
        [ELEMENT_STATE.UNKNOWN]: "未知界面"
    };
    
    const stateName = stateNames[currentState] || `未知状态 (${currentState})`;
    if (logmode) log.info(`界面状态变化 → ${stateName}`);
    
    // 剧情界面检测 - 自动保存并等待返回
    if (currentState === ELEMENT_STATE.Story) {
        if (isRecording) {
            log.info("录制中检测到剧情界面，保存路径 + 等待返回主界面");
            await recordFinalPosition();
            await handleStoryInterface();
        } else {
            log.info("非录制状态检测到剧情界面，等待返回主界面");
            await waitForMainUI();
        }
        return;
    }
    
    if (!isRecording) {
        // 非录制状态下，不做处理（功能键已在键盘回调中处理）
        if (logmode) log.debug("非录制状态，等待功能键触发");
        return;
    }
}

async function saveCurrentPath() {
    if (trackData.positions.length > 0) {
        trackData.info.name = `${SETTINGS.questName}-${currentTrackFile}`;
        await processTrackData();
        const filename = await saveTrackData();
        
        trackData.positions = [];
        lastPosition = null;
        
        currentTrackFile++;
        
        return filename;
    }
    return null;
}

async function initProcessData() {
    const processPath = `process/${SETTINGS.questLocation}/${SETTINGS.questName}/process.json`;
    let processData = [];
    
    try {
        const existingContent = file.ReadTextSync(processPath);
        
        if (existingContent) {
            processData = existingContent.split('\n').filter(line => line.trim() !== '');
            log.info(`已读取现有 process.json，共${processData.length}行`);
            
            const hasAuthor = processData.length > 0 && processData[0].startsWith('// 作者：');
            if (!hasAuthor) {
                processData.unshift(`// 作者：${SETTINGS.author}`);
            }
            
            const maxTrackNumber = findMaxTrackNumber(processData);
            if (maxTrackNumber !== null) {
                currentTrackFile = maxTrackNumber + 1;
                log.info(`找到最大追踪文件数字: ${maxTrackNumber}，下一个文件段为: ${currentTrackFile}`);
            } else {
                log.info("未找到地图追踪文件，从第 1 段开始");
                currentTrackFile = 1;
            }
            
            lastEndType = analyzeLastEndType(processData);
			globalThis.lastEndType = lastEndType;
            
        } else {
            processData = [`// 作者：${SETTINGS.author}`];
            currentTrackFile = 1;
            lastEndType = null;
			globalThis.lastEndType = lastEndType;
            log.info("创建新的 process.json 并初始化作者信息，从第 1 段开始录制");
        }
    } catch (error) {
        processData = [`// 作者：${SETTINGS.author}`];
        currentTrackFile = 1;
        lastEndType = null;
		globalThis.lastEndType = lastEndType;
        log.info("文件不存在，创建新的 process.json 并初始化作者信息，从第 1 段开始录制");
    }
    
    return processData;
}

function findMaxTrackNumber(processData) {
    let maxNumber = null;
    const trackPattern = /地图追踪\s+(?:([^\-]+)-(\d+)|(\d+)-[^\s]+)\.json/;
    
    for (const line of processData) {
        const match = line.match(trackPattern);
        if (match) {
            let currentNumber;
            // 处理两种匹配情况
            if (match[2]) {
                // 格式：任务名 - 数字
                currentNumber = parseInt(match[2]);
            } else if (match[3]) {
                // 格式：数字 - 任务名
                currentNumber = parseInt(match[3]);
            }
            
            if (currentNumber && (maxNumber === null || currentNumber > maxNumber)) {
                maxNumber = currentNumber;
            }
            log.debug(`找到追踪文件：${match[0]}, 数字：${currentNumber}`);
        }
    }
    
    return maxNumber;
}

function analyzeLastEndType(processData) {
    if (!processData || processData.length === 0) {
        return null;
    }
    
    for (let i = processData.length - 1; i >= 0; i--) {
        const line = processData[i].trim();
        
        if (!line || line.startsWith('//')) {
            continue;
        }
        
        if (line === '战斗') {
            if (logmode) log.info(`分析 process.json: 上次录制以战斗结束`);
            return 'fight';
        } else if (line.startsWith('对话')) {
            if (logmode) log.info(`分析 process.json: 上次录制以对话结束`);
            return 'dialogue';
        } else if (line === '暂停') {
            if (logmode) log.info(`分析 process.json: 上次录制以暂停结束`);
            return 'pause';
        } else if (line === '等待返回主界面') {
            if (logmode) log.info(`分析 process.json: 上次录制以剧情结束`);
            return 'story';
        } else if (line.startsWith('地图追踪')) {
            if (logmode) log.info(`分析 process.json: 上次录制以保存结束`);
            return 'save';
        }
    }
    
    if (logmode) log.info("分析 process.json: 未找到明确的结束类型，默认为保存结束");
    return 'save';
}

// ===================== 主逻辑（脚本入口）=====================
async function main() {
    try {
        if (logmode) log.info("=== 自动化剧情录制器（原神 1920×1080 适配版）===");
            
        log.info("启用自动剧情");
        dispatcher.AddTrigger(new RealtimeTimer("AutoSkip"));
        if (!settings.noSkip) {
            if (logmode) log.info("启用自动拾取");
            dispatcher.AddTrigger(new RealtimeTimer("AutoPick"));
        }
        if (!settings.noEat) {
            if (logmode) log.info("启用自动吃药");
            dispatcher.AddTrigger(new RealtimeTimer("AutoEat"));
        }

        uiStateMonitor = new UIStateMonitor();
        await genshin.returnMainUi();
        
        // 强制提示：确保任务追踪栏已开启
        log.info("=== 必须操作 ===");
        log.info("1. 按 J 打开任务界面，勾选目标任务的「追踪」按钮");
        log.info("2. 确认左侧已显示任务文本栏");
        log.info("=== 必须操作 ===");
        
        if (currentTrackFile === 1 && lastEndType === null) {
            log.info("全新录制，等待首次触发开始录制");
            log.info(`请按下 ${SETTINGS.keyPause} 键开始录制`);
        } else if (lastEndType === 'fight') {
            log.info(`继续录制 (文件段${currentTrackFile})，上次以战斗结束，等待触发`);
            log.info(`请按下 ${SETTINGS.keyPause} 键继续录制`);
        } else if (lastEndType === 'pause') {
            log.info(`继续录制 (文件段${currentTrackFile})，上次为暂停状态，等待恢复`);
            log.info(`请按下 ${SETTINGS.keyPause} 键恢复录制`);
        } else {
            log.info(`继续录制 (文件段${currentTrackFile})，等待触发开始新录制`);
            log.info(`请按下 ${SETTINGS.keyPause} 键开始新录制`);
        }
        
        // 显示当前按键配置
        log.info("=== 当前按键配置 ===");
        log.info(`对话功能键：${SETTINGS.keyDialogue}`);
        log.info(`战斗功能键：${SETTINGS.keyFight}`);
        log.info(`暂停功能键：${SETTINGS.keyPause}`);
        log.info(`保存功能键：${SETTINGS.keySave}`);
        log.info("==================");
        
        let cycleCount = 0;
        while (cycleCount < SETTINGS.maxRecordingCycles) {
            cycleCount++;
            
            if (cycleCount % 1000 === 0) {
                if (logmode) log.info(`系统运行进度：${cycleCount}/${SETTINGS.maxRecordingCycles} (${((cycleCount/SETTINGS.maxRecordingCycles)*100).toFixed(1)}%)`);
            }
            
            if (isRecording) {
                // 录制中持续记录位置点
                await recordPosition();
                await checkUIStateChange();
                if (SETTINGS.enableTransmissionDetection) {
                    await checkTeleportation();
                }
            } else {
                // 非录制状态，等待用户按键触发
                // 非录制状态，等待用户按键触发
                if (isInMainUI()) {
                    if (lastEndType === 'save') {
                        if (!hasShownEndMessage) {
                            log.info(`录制结束`);
                            log.info(`按 ${SETTINGS.keyFight} 键：以"传送点"开始录制`);
                            log.info(`按 ${SETTINGS.keyPause} 键：以"当前位置"开始录制`);
                            hasShownEndMessage = true;
                        }
                        // 不退出脚本，等待用户操作
                    } else if (lastEndType === null && !isRecording) {
                        // 首次启动或暂停后恢复，但没有开始录制
                        if (!hasShownEndMessage) {
                            log.info(`等待开始录制`);
                            log.info(`按 ${SETTINGS.keyFight} 键：以"传送点"开始录制`);
                            log.info(`按 ${SETTINGS.keyPause} 键：以"当前位置"开始录制`);
                            hasShownEndMessage = true;
                        }
                    } else {
                        hasShownEndMessage = false; // 重置标志
                    }
                    // 其他情况通过键鼠回调处理，无需额外等待
                } else {
                    // 不在主界面时的处理
                    await waitForMainUI();
                }
            }
            
            await sleep(100);
        }
        
        if (cycleCount >= SETTINGS.maxRecordingCycles) {
            log.warn(`系统已达到最大运行循环次数 (${SETTINGS.maxRecordingCycles})，自动结束`);
            if (isRecording && trackData.positions.length > 0) {
                const filename = await saveCurrentPath();
                if (filename) {
                    processData.push(`地图追踪 ${filename}`);
                    await saveProcessData();
                    if (logmode) log.info("当前路径已自动保存");
                }
            }
        }
    } catch (error) {
        log.error(`main 函数执行错误：${error.message}`);
    } finally {
        keyHook.dispose(); // 清除键鼠回调占用资源
        log.info("脚本结束，键鼠回调已释放");
    }
}

// ===================== UI 状态监控器类（独立模块）=====================

class UIStateMonitor {
    constructor() {
        this.lastElementState = null;
    }

    async checkStateChange() {
        const currentState = this.lastElementState;
        const changed = this.lastElementState !== null && this.lastElementState !== currentState;
        
            if (changed) {
            const stateNames = {
                [ELEMENT_STATE.MAINUI]: "主界面",
                [ELEMENT_STATE.B]: "背包界面",
                [ELEMENT_STATE.C]: "角色界面",
                [ELEMENT_STATE.O]: "好友界面",
                [ELEMENT_STATE.G]: "教程界面",
                [ELEMENT_STATE.F2]: "联机界面",
                [ELEMENT_STATE.F3]: "祈愿界面",
                [ELEMENT_STATE.F4]: "纪行界面",
                [ELEMENT_STATE.J]: "任务界面",
                [ELEMENT_STATE.Story]: "剧情界面",
                [ELEMENT_STATE.MAP]: "地图界面",
                [ELEMENT_STATE.UNKNOWN]: "未知界面"
            };
            
            const oldStateName = stateNames[this.lastElementState] || `未知(${this.lastElementState})`;
            const newStateName = stateNames[currentState] || `未知(${currentState})`;
            if (logmode) log.info(`UI 状态监控：${oldStateName} → ${newStateName}`);
        }
        
        this.lastElementState = currentState;
        return { currentState, changed };
    }

    isDialogueState(state) {
        return [ELEMENT_STATE.G, ELEMENT_STATE.J, ELEMENT_STATE.F2, ELEMENT_STATE.F3, ELEMENT_STATE.F4, ELEMENT_STATE.C, ELEMENT_STATE.B, ELEMENT_STATE.O].includes(state);
    }
}

// ===================== 兼容函数（保留原有逻辑调用）=====================
async function checkTeleportation() {
    return;
}

// ===================== 补充 startScript 函数（脚本入口）=====================
async function startScript() {
    try {
        // 初始化 process.json 数据
        processData = await initProcessData();
        
        // 显示启动信息
        if (logmode) log.info("=== 脚本启动配置 ===");
        const isFirstRecording = (currentTrackFile === 1);
        if (isFirstRecording) {
            if (logmode) log.info("当前状态：全新录制，从第 1 段开始");
        } else {
            if (logmode) log.info(`当前状态：继续录制，从第${currentTrackFile}段开始`);
        }
        
        if (lastEndType) {
            const endTypeNames = {
                'fight': '战斗',
                'dialogue': '对话',
                'pause': '暂停',
                'save': '保存',
                'story': '剧情'
            };
            if (logmode) log.info(`上次结束类型：${endTypeNames[lastEndType] || lastEndType}`);
        }
        
        if (logmode) log.info("=== 操作说明 ===");
        if (logmode) log.info(`- 首次启动时按${SETTINGS.keyPause}键：以"当前位置"开始录制`);
        if (logmode) log.info(`- 首次启动时按${SETTINGS.keyFight}键：以"传送点"开始录制`);
        if (logmode) log.info(`- 录制中打开${SETTINGS.keyDialogue}界面：保存路径 + 对话（自动扫描 NPC）`);
        if (logmode) log.info(`- 录制中打开${SETTINGS.keyFight}界面：保存路径 + 战斗（自动扫描目标）`);
        if (logmode) log.info(`- 录制中打开${SETTINGS.keySave}界面：仅保存路径并结束录制`);
        if (logmode) log.info("- 进入剧情界面：自动保存路径 + 等待返回主界面");
        if (logmode) log.info("=== 文本扫描说明 ===");
        if (logmode) log.info("- 启动录制时自动扫描：任务主描述、任务子描述");
        if (logmode) log.info("- 触发对话时自动扫描：任务主描述、NPC 名称、对话内容");
        if (logmode) log.info("- 触发战斗时自动扫描：战斗目标");
        if (logmode) log.info("- 扫描结果自动写入 process.json（// 文本扫描 -xxx 开头）");
        if (logmode) log.info("====================");
        
        // 启动主逻辑
        await main();
    } catch (error) {
        if (error.message === "A task was canceled") {
            log.warn("脚本被用户强制退出");
            log.warn("如需保存路径，请使用结束录制功能而非退出脚本");
        } else {
            log.error(`脚本执行出现错误：${error.message}`);
            log.error("请检查配置并重新运行脚本");
        }
        keyHook.dispose(); // 清除键鼠回调占用资源
        log.info("脚本异常结束，键鼠回调已释放");
    }
}

// ===================== 启动脚本 =====================
startScript();
