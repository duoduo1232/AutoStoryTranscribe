// ===================== 功能触发处理模块 =====================
// 对话、战斗、暂停、结束录制、剧情界面的触发处理
// 依赖:utils.js, constants.js, state.js, fileIO.js, recorder.js, uiMonitor.js (waitForMainUI)
// 由 main.js 通过 eval(file.readTextSync("handlers.js")) 加载

async function handleDialogue() {      //对话处理函数
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

async function handleFight() {     //战斗处理函数
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

async function handlePause() {   //暂停处理函数
    if (isRecording) {
        const filename = await saveCurrentPath();
        if (filename) {
            processData.push(`地图追踪 ${filename}`);
            processData.push("暂停");
            await saveProcessData();
        }
        lastEndType = 'pause';
        isRecording = false;
        log.info("已保存暂停");
        log.info(`等待开始录制`);
        log.info(`按 ${SETTINGS.keyFight} 键：以"传送点"开始录制`);
        log.info(`按 ${SETTINGS.keyPause} 键：以"当前位置"开始录制`);
    } else {
        // 非录制状态下，以当前位置开始录制
        startPointType = "path";
        log.info(`检测到按下${SETTINGS.keyPause}键，起始点类型设置为"当前位置"`);
        isRecording = true;
        lastEndType = null;
        hasShownEndMessage = false;
        await startNewRecording();
        log.info("新录制段已开始，等待用户操作:");
        log.info(`- 按下${SETTINGS.keyDialogue}：保存路径 + 对话`);
        log.info(`- 按下${SETTINGS.keyFight}：保存路径 + 战斗`);
        log.info(`- 按下${SETTINGS.keyPause}：保存路径 + 暂停`);
        log.info(`- 按下${SETTINGS.keySave}：只保存路径`);
    }
}

async function handleEndRecording() { //结束录制处理函数
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

async function handleStoryInterface() {      //剧情界面处理函数
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
