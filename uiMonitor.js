// ===================== UI 监测模块 =====================
// 主界面等待、界面状态变化检测、UIStateMonitor 类
// 依赖:constants.js (ELEMENT_STATE), state.js, detection.js (checkElementState/isInMainUI), recorder.js (recordPosition/recordFinalPosition), handlers.js (handleStoryInterface)
// 由 main.js 通过 eval(file.readTextSync("uiMonitor.js")) 加载
// 注:UIStateMonitor 用 var 赋值的方式声明,确保经 eval 加载后能被主脚本作用域访问(class 声明不会泄漏)

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

// 用 var 赋值方式,绕开 class 声明不泄漏的限制
var UIStateMonitor = class {
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
};
