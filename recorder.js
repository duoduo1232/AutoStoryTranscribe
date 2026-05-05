// ===================== 录制核心模块 =====================
// OCR 扫描写入、路径点记录、新录制段开始、当前段保存
// 依赖:utils.js, constants.js, state.js, fileIO.js, detection.js (checkAbnormalState), calculate.js (distance)
// 由 main.js 通过 eval(file.readTextSync("recorder.js")) 加载

// ===================== 文本扫描结果写入工具（增加截图测试）=====================
async function scanTextAndWriteToProcess(ocrRegion, textType, isForce = false) {          //任务名称扫描函数
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
        scanText = "ciallo";    //Ciallo～(∠・ω< )⌒★
    }

    let processCmd = `//${scanText}:`;
	globalThis.savenametext = `${scanText}`;
    processData.push(processCmd);
	if (globalThis.lastEndType == 'save'){
    await saveProcessData();
    if (logmode) log.info(`已将【${textType}】扫描结果写入 process.json`);
	}
}

async function recordFinalPosition() {            //路径点处理函数
    // 从 settings 读取世界名称并提取英文
    const worldConfig = settings.worldName || "提瓦特大陆 (Teyvat)";
    const worldName = worldConfig.match(/\(([^)]+)\)/)?.[1] || "Teyvat";

    // 尝试多次获取坐标
    let position = null;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            position = genshin.getPositionFromMap(worldName, 900);
            if (position && (position.X !== 0 || position.Y !== 0)) {
                if (logmode) log.info(`第${attempt + 1}次获取最终坐标成功：X=${position.X}, Y=${position.Y}`);
                break;
            } else {
                if (logmode) log.warn(`第${attempt + 1}次获取到无效坐标 (0, 0)，等待重试...`);
                position = null;
                await sleep(500);
            }
        } catch (error) {
            if (logmode) log.error(`第${attempt + 1}次获取坐标失败：${error.message}`);
            position = null;
            await sleep(500);
        }
    }

    if (!position) {
        if (logmode) log.warn("多次尝试获取最终坐标失败，使用默认值 (0, 0)");
        position = { X: 0, Y: 0 };
    }

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
async function recordPosition() {         //路径点记录函数
    if (!isRecording || isPaused) {
        if (logmode) log.debug("录制已停止或暂停，跳过位置记录");
        return true;
    }
    try {
        // 从 settings 读取世界名称并提取英文
        const worldConfig = SETTINGS.worldName || "提瓦特大陆 (Teyvat)";
        const worldName = worldConfig.match(/\(([^)]+)\)/)?.[1] || "Teyvat";

        const position = genshin.getPositionFromMap(worldName, 900);
        if (!position || (position.X === 0 && position.Y === 0)) {
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

async function startNewRecording() {
    // 确保录制状态
    isRecording = true;

    // 从 settings 读取配置的世界名称
    const worldConfig = SETTINGS.worldName || "提瓦特大陆 (Teyvat)";
    // 从中文选项中提取英文世界名称
    const currentWorld = worldConfig.match(/\(([^)]+)\)/)?.[1] || "Teyvat";
    const mapPositionName = {
        'Teyvat': '提瓦特',
        'TheChasm': '层岩巨渊',
        'Enkanomiya': '渊下宫',
        'SeaOfBygoneEras': '旧日之海',
        'AncientSacredMountain': '远古圣山'
    };
    const worldName = mapPositionName[currentWorld] || '提瓦特';

    log.info(`当前使用世界：${worldName} (${currentWorld})`);

    // 更新 trackData 中的地图名称
    trackData.info.map_name = currentWorld;

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

    // 从 settings 读取世界名称并提取英文（用于坐标获取）
    const worldConfigForPos = settings.worldName || "提瓦特大陆 (Teyvat)";
    const worldNameForPos = worldConfigForPos.match(/\(([^)]+)\)/)?.[1] || "Teyvat";

    // 尝试多次获取坐标，防止初次识别失败
    let position = null;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            position = genshin.getPositionFromMap(worldNameForPos, 900);
            if (position && (position.X !== 0 || position.Y !== 0)) {
                log.info(`第${attempt + 1}次获取坐标成功：X=${position.X}, Y=${position.Y}`);
                break;
            } else {
                log.warn(`第${attempt + 1}次获取到无效坐标 (0, 0)，等待重试...`);
                position = null;
                await sleep(500);
            }
        } catch (error) {
            log.error(`第${attempt + 1}次获取坐标失败：${error.message}`);
            position = null;
            await sleep(500);
        }
    }

    // 如果还是获取不到坐标，使用最后一次尝试的结果（可能是 null 或 (0,0)）
    if (!position) {
        log.warn("多次尝试获取坐标失败，使用默认值 (0, 0)");
        position = { X: 0, Y: 0 };
    }

    // 使用按键判断的起始点类型
    const initialPointType = startPointType;
    const isFirstRecording = (currentTrackFile === 1) || false;

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

    // 输出录制开始日志
    if (isFirstRecording) {
        log.info(`第一次录制开始 (文件段${currentTrackFile})，坐标：X=${position.X}, Y=${position.Y}, 世界：${worldName}`);
    } else {
        log.info(`新录制段开始 (文件段${currentTrackFile})，坐标：X=${position.X}, Y=${position.Y}, 世界：${worldName}`);
    }

    // 扫描任务追踪栏的主描述和子描述
    await scanTextAndWriteToProcess(OCR_REGIONS_1080P.TASK_DESCRIPTION, "任务主描述");
}

async function saveCurrentPath() {
    if (trackData.positions.length > 0) {
        trackData.info.name = `${SETTINGS.questName}-${currentTrackFile}`;
        // await processTrackData();         //路径优化bug多注释了
        const filename = await saveTrackData();

        trackData.positions = [];
        lastPosition = null;

        currentTrackFile++;

        return filename;
    }
    return null;
}
