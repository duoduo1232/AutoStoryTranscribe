// 定义识别对象
const paimonMenuRo = RecognitionObject.TemplateMatch(
    file.ReadImageMatSync("assets/RecognitionObject/paimon_menu.png"),
    0,
    0,
    genshin.width / 3.0,
    genshin.width / 5.0
  );
  
// 判断是否在主界面的函数
function isInMainUI(){
    let captureRegion = captureGameRegion();
    let res = captureRegion.Find(paimonMenuRo);
    return !res.isEmpty();
  };

// 识别图像函数
async function recognizeImage(recognitionObject) {
  try {
    // 尝试识别图像
    let imageResult = captureGameRegion().find(recognitionObject);
    if (imageResult && imageResult.x !== 0 && imageResult.y !== 0 && imageResult.width !== 0 && imageResult.height !== 0) {
      return { success: true, x: imageResult.x, y: imageResult.y };
    }
  } catch (error) {
    log.error(`识别图像时发生异常: ${error.message}`);
  }
  return { success: false };
}

// 定义移动状态常量
const MOVE_STATE = {
    NORMAL: "normal",
    FLY: "fly",
    CLIMB: "climb",
    SWIM: "swim",
    UNKNOWN: "unknown"
};

// 枚举定义（放在合适位置）
const ELEMENT_STATE = {
  MAINUI:   0,
  B:      1,
  C:      2,
  O:      3,
  G:      4,
  F2:     5,
  F3:     6,
  F4:     7,
  J:      8,
  UNKNOWN:-1,
  Story:  -2
};

// 定义识别对象 - 用于检测运动状态
const SpaceRo = RecognitionObject.TemplateMatch(file.ReadImageMatSync("assets/RecognitionObject/Space.png"), 1683, 1027, 64, 25);
const SwimRo = RecognitionObject.TemplateMatch(file.ReadImageMatSync("assets/RecognitionObject/Swim.png"), 1811, 1027, 17, 23);
const ClimbRo = RecognitionObject.TemplateMatch(file.ReadImageMatSync("assets/RecognitionObject/Climb.png"), 1596, 1027, 29, 24);

// 检测运动状态
async function checkAbnormalState() {
  const spaceResult = await recognizeImage(SpaceRo);
  const swimResult = await recognizeImage(SwimRo);
  const climbResult = await recognizeImage(ClimbRo);

  if (isInMainUI()) {
    if (swimResult.success) {
      //log.info("检测到游泳状态");
      return MOVE_STATE.SWIM;
    } else if (climbResult.success) {
      //log.info("检测到攀爬状态");
      return MOVE_STATE.CLIMB;
    } else if (spaceResult.success) {
      //log.info("检测到飞行状态");
      return MOVE_STATE.FLY;
    } else {
      //log.info("检测到正常状态");
      return MOVE_STATE.NORMAL;
    }
  }
  log.info("检测状态失败");
  return MOVE_STATE.UNKNOWN;
}

// 定义识别对象 - 用于界面
const BRo = RecognitionObject.TemplateMatch(
  file.ReadImageMatSync("assets/RecognitionObject/B.png"),
  53, 26, 47, 44
);
const CRo = RecognitionObject.TemplateMatch(
  file.ReadImageMatSync("assets/RecognitionObject/C.png"),
  57, 993, 38, 32
);
const ORo = RecognitionObject.TemplateMatch(
  file.ReadImageMatSync("assets/RecognitionObject/O.png"),
  57, 30, 41, 33
);
const GRo = RecognitionObject.TemplateMatch(
  file.ReadImageMatSync("assets/RecognitionObject/G.png"),
  52, 22, 50, 54
);
const F2Ro = RecognitionObject.TemplateMatch(
  file.ReadImageMatSync("assets/RecognitionObject/F2.png"),
  160, 999, 109, 37
);
const F3Ro = RecognitionObject.TemplateMatch(
  file.ReadImageMatSync("assets/RecognitionObject/F3.png"),
  48, 19, 57, 57
);
const F4Ro = RecognitionObject.TemplateMatch(
  file.ReadImageMatSync("assets/RecognitionObject/F4.png"),
  49, 19, 56, 53
);
const JRo = RecognitionObject.TemplateMatch(
  file.ReadImageMatSync("assets/RecognitionObject/J.png"),
  58, 24, 37, 40
);
const StoryRo = RecognitionObject.TemplateMatch(
  file.ReadImageMatSync("assets/RecognitionObject/disabled_ui.png"),
  265, 37, 30, 22
);

// 检测界面
async function checkElementState() {
  if (!isInMainUI()) {
    const StoryResult  = await recognizeImage(StoryRo);
    if (StoryResult.success) {
      log.info("当前界面状态: 剧情界面 (Story)");
      return ELEMENT_STATE.Story;
    }
    
    const bResult  = await recognizeImage(BRo);
    const cResult  = await recognizeImage(CRo);
    const oResult  = await recognizeImage(ORo);
    const gResult  = await recognizeImage(GRo);
    const f2Result = await recognizeImage(F2Ro);
    const f3Result = await recognizeImage(F3Ro);
    const f4Result = await recognizeImage(F4Ro);
    const jResult  = await recognizeImage(JRo);
    
    if (bResult.success) {
      log.info("当前界面状态: 背包界面 (B键)");
      return ELEMENT_STATE.B;
    } else if (cResult.success) {
      log.info("当前界面状态: 角色界面 (C键)");
      return ELEMENT_STATE.C;
    } else if (oResult.success) {
      log.info("当前界面状态: 好友界面 (O键)");
      return ELEMENT_STATE.O;
    } else if (gResult.success) {
      log.info("当前界面状态: 教程界面 (G键)");
      return ELEMENT_STATE.G;
    } else if (f2Result.success) {
      log.info("当前界面状态: 联机界面 (F2键)");
      return ELEMENT_STATE.F2;
    } else if (f3Result.success) {
      log.info("当前界面状态: 祈愿界面 (F3键)");
      return ELEMENT_STATE.F3;
    } else if (f4Result.success) {
      log.info("当前界面状态: 纪行界面 (F4键)");
      return ELEMENT_STATE.F4;
    } else if (jResult.success) {
      log.info("当前界面状态: 任务界面 (J键)");
      return ELEMENT_STATE.J;
    } else {
      log.info("当前界面状态: 未知界面 (UNKNOWN)");
      return ELEMENT_STATE.UNKNOWN;
    }
  }
  //log.info("当前界面状态: 主界面 (MAINUI)");
  return ELEMENT_STATE.MAINUI;
}

// 新增：检测任务描述并提取NPC名称
async function extractNPCNameFromTask() {
  try {
    const taskRegion = { X: 75, Y: 240, WIDTH: 280, HEIGHT: 43 };
    const ocrResults = await Utils.easyOCR(taskRegion);
    
    if (ocrResults.count > 0) {
      for (let i = 0; i < ocrResults.count; i++) {
        const text = ocrResults[i].text;
        log.info(`任务区域识别文本: ${text}`);
        
        // 尝试提取NPC名称
        const npcName = extractNPCName(text);
        if (npcName) {
          log.info(`提取到NPC名称: ${npcName}`);
          return npcName;
        }
      }
    }
    
    log.warn("未能从任务描述中提取到NPC名称");
    return null;
  } catch (error) {
    log.error(`提取NPC名称时出错: ${error.message}`);
    return null;
  }
}

// 新增：从任务描述中提取NPC名称的函数
function extractNPCName(text) {
  if (!text) return null;
  
  const patterns = [
    /与(.+?)对话/,
    /与(.+?)一起/,
    /同(.+?)交谈/,
    /向(.+?)打听/,
    /向(.+?)回报/,
    /向(.+?)报告/,
    /给(.+?)听/,
    /陪同(.+?)\S+/,
    /找到(.+?)\S+/,
    /询问(.+?)\S+/,
    /拜访(.+?)\S+/,
    /寻找(.+?)\S+/,
    /告诉(.+?)\S+/,
    /带(.+?)去\S+/,
    /跟随(.+?)\S+/,
    /协助(.+?)\S+/,
    /请教(.+?)\S+/,
    /拜托(.+?)\S+/,
    /委托(.+?)\S+/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}

// 新增：OCR工具函数
async function easyOCR(region) {
  try {
    const locationOcrRo = RecognitionObject.Ocr(region.X, region.Y, region.WIDTH, region.HEIGHT);
    let captureRegion = captureGameRegion();
    let OCRresults = await captureRegion.findMulti(locationOcrRo);
    return OCRresults;
  } catch (error) {
    log.error("easyOCR识别出错: {error}", error.message);
    return { count: 0 };
  }
}

// 将easyOCR函数添加到Utils对象中
if (typeof Utils === 'undefined') {
  Utils = {};
}
Utils.easyOCR = easyOCR;

