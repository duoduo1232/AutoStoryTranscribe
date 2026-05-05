// ===================== 全局状态模块 =====================
// 所有录制过程中需要跨模块共享的状态变量
// 依赖:constants.js (SETTINGS), settings 全局变量
// 注:用 var 而非 let,保证经 eval 加载后声明能泄漏到主脚本作用域
var trackData = {
    "info": {
        "name": `${SETTINGS.questName}`,
        "type": "collect",
        "author": SETTINGS.author,
        "version": settings.version,
        "description": settings.description,
        "map_name": (() => {
            // 从 settings 读取世界名称并提取英文
            const worldConfig = settings.worldName || "提瓦特大陆 (Teyvat)";
            return worldConfig.match(/\(([^)]+)\)/)?.[1] || "Teyvat";
        })(),
        "bgi_version": "0.47.2"
    },
    "positions": []
};

var processData = [];
var isRecording = false;
var isPaused = false;
var currentTrackFile = 1;
var lastPosition = null;
var uiStateMonitor = null;
var lastEndType = null;
globalThis.lastEndType = lastEndType;
var justExitedMap = false;
var wasInMap = false;
var logmode = false;
var hasShownEndMessage = false; // 防止重复提示录制结束
var isProcessingStory = false; // 防止重复处理剧情界面
var startPointType = "teleport"; // 起始点类型，根据按键判断
if (!settings.logmode){
    logmode = true; // 详细日志模式
}
