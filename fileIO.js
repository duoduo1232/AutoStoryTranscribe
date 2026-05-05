// ===================== 文件 IO 模块 =====================
// process.json 和路径追踪文件的读写、初始化、分析
// 依赖:constants.js (SETTINGS), state.js (trackData/processData/currentTrackFile/lastEndType/logmode)
// 由 main.js 通过 eval(file.readTextSync("fileIO.js")) 加载

async function saveTrackData(filename = null) {     //保存路径文件函数
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

async function saveProcessData() {            //保存路径文件函数
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

async function ensureFolderExists(folderPath) {            //确保文件夹存在函数
    if (logmode) log.info(`确保文件夹存在：${folderPath}`);
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
