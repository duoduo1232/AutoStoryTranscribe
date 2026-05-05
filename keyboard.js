// ===================== 键盘路由模块 =====================
// 按键 → 功能触发 / 录制切换 / 界面状态更新 的路由
// 依赖:constants.js (SETTINGS/ELEMENT_STATE), state.js, recorder.js (recordFinalPosition/startNewRecording), handlers.js, uiMonitor.js (checkUIStateChange)
// 由 main.js 通过 eval(file.readTextSync("keyboard.js")) 加载

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
