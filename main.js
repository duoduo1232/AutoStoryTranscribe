// ===================== 加载依赖模块 =====================
// 加载顺序说明:
//   1. utils / constants    —— 常量与工具(被后续模块使用)
//   2. detection / calculate —— BetterGI 原有图像识别 / 几何计算模块
//   3. state                —— 全局状态变量(依赖 SETTINGS)
//   4. fileIO / pathOptimize / recorder / uiMonitor / handlers / keyboard —— 业务函数,互相 hoisting,顺序相对自由
// 注:所有模块顶层声明统一使用 var / function / 赋值式 class,确保经 eval 加载后能泄漏到主脚本作用域
eval(file.readTextSync("utils.js"));
eval(file.readTextSync("constants.js"));
eval(file.readTextSync("detection.js"));
eval(file.readTextSync("calculate.js"));
eval(file.readTextSync("state.js"));
eval(file.readTextSync("fileIO.js"));
eval(file.readTextSync("pathOptimize.js"));
eval(file.readTextSync("recorder.js"));
eval(file.readTextSync("uiMonitor.js"));
eval(file.readTextSync("handlers.js"));
eval(file.readTextSync("keyboard.js"));

const keyHook = new KeyMouseHook();
// 注册键盘事件来替代原有的状态检测
keyHook.OnKeyDown((keyCode) => {
    handleKeyboardStateDetection(keyCode);
});

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
            log.info(`等待开始录制`);
            log.info(`按 ${SETTINGS.keyFight} 键：以"传送点"开始录制`);
            log.info(`按 ${SETTINGS.keyPause} 键：以"当前位置"开始录制`);
        } else if (lastEndType === 'fight') {
            log.info(`继续录制 (文件段${currentTrackFile})，上次以战斗结束，等待触发`);
            log.info(`等待开始录制`);
            log.info(`按 ${SETTINGS.keyFight} 键：以"传送点"开始录制`);
            log.info(`按 ${SETTINGS.keyPause} 键：以"当前位置"开始录制`);
        } else if (lastEndType === 'pause') {
            log.info(`等待开始录制`);
            log.info(`按 ${SETTINGS.keyFight} 键：以"传送点"开始录制`);
            log.info(`按 ${SETTINGS.keyPause} 键：以"当前位置"开始录制`);
        } else {
            log.info(`等待开始录制`);
            log.info(`按 ${SETTINGS.keyFight} 键：以"传送点"开始录制`);
            log.info(`按 ${SETTINGS.keyPause} 键：以"当前位置"开始录制`);
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
            } else {
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
