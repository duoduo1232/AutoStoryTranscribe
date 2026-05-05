// ===================== 路径优化模块 =====================
// 路径点简化(RDP)、移动模式判定、爬行/游泳/飞行分段
// 依赖:constants.js (MOVE_STATE/MOVE_MODES), state.js (trackData/logmode), calculate.js (rdp/distance)
// 由 main.js 通过 eval(file.readTextSync("pathOptimize.js")) 加载

function optimizePathPoints() {    //路径点优化函数（为下面路径函数调用的函数，目前没用）
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

function processMoveModes() {     //移动模式处理函数
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

async function processTrackData() {                //路径优化函数，bug挺多，目前没调用
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
