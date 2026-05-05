// ===================== 常量与运行时配置模块 =====================
// 移动/界面/OCR 区域常量，以及从 settings 读取的运行时配置
// 由 main.js 通过 eval(file.readTextSync("constants.js")) 加载
// 依赖：运行时全局 settings 对象（由 BetterGI 注入）

// 注:用 var 而非 const,保证经 eval 加载后声明能泄漏到主脚本作用域
var MOVE_STATE = {
    NORMAL: "normal",
    FLY: "fly",
    CLIMB: "climb",
    SWIM: "swim",
    UNKNOWN: "unknown"
};

var ELEMENT_STATE = {
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

var MOVE_MODES = {
    WALK: "walk",
    DASH: "dash",
    FLY: "fly",
    CLIMB: "climb",
    SWIM: "swim",
    JUMP: "jump"
};

var OCR_REGIONS_1080P = {
    TASK_DESCRIPTION: { X: 73, Y: 245, WIDTH: 400, HEIGHT: 33 }, // 任务主描述（精准坐标）
    DIALOG_OPTION: { X: 1150, Y: 300, WIDTH: 400, HEIGHT: 420 }, // 右侧对话选项区
    NPC_NAME: { X: 40, Y: 260, WIDTH: 380, HEIGHT: 40 }, // 任务子描述（NPC相关）
    FIGHT_TARGET: { X: 850, Y: 50, WIDTH: 220, HEIGHT: 40 }, // 顶部战斗目标区
    MAIN_UI_TIP: { X: 40, Y: 310, WIDTH: 380, HEIGHT: 40 } // 任务追踪栏附加文本
};

var SETTINGS = {
    author: settings.author || "",
    questName: settings.questName,
    questLocation: settings.questLocation,
    runMode: settings.runMode || "录制模式",
    keyDialogue: settings.keyDialogue,
    keyFight: settings.keyFight,
    keyPause: settings.keyPause,
    keySave: settings.keySave,
    worldName: settings.worldName,
    autoFight: settings.autoFight !== false,
    maxRecordingCycles: 72000,
    strategyScript: "w(5)",
    teleportThreshold: 20,
    anomalyDetectionDistance: 1000
};
