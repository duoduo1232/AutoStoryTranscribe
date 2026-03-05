// 计算两点之间的距离
function distance(a, b) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

// 计算点到线段的距离
function pointLineDistance(point, start, end) {
    if (start.x === end.x && start.y === end.y) {
        return distance(point, start);
    } else {
        const n = Math.abs(
            (end.x - start.x) * (start.y - point.y) -
            (start.x - point.x) * (end.y - start.y)
        );
        const d = Math.sqrt(
            Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
        );
        return n / d;
    }
}

// RDP算法实现 - 简化路径点
function rdp(points, epsilon) {
    if (points.length <= 2) {
        return points;
    }

    let dmax = 0;
    let index = 0;

    for (let i = 1; i < points.length - 1; i++) {
        const d = pointLineDistance(points[i], points[0], points[points.length - 1]);
        if (d > dmax) {
            index = i;
            dmax = d;
        }
    }

    if (dmax >= epsilon) {
        const firstPart = rdp(points.slice(0, index + 1), epsilon);
        const secondPart = rdp(points.slice(index), epsilon);
        return [...firstPart.slice(0, -1), ...secondPart];
    } else {
        return [points[0], points[points.length - 1]];
    }
}