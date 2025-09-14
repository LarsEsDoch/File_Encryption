export function getFormattedTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

function secondsToDisplay(seconds) {
    if (!isFinite(seconds)) return 'centuries';
    if (seconds < 1) return 'less than a second';
    const units = [
        ['year', 365 * 24 * 3600],
        ['month', 30 * 24 * 3600],
        ['week', 7 * 24 * 3600],
        ['day', 24 * 3600],
        ['hour', 3600],
        ['minute', 60],
        ['second', 1]
    ];
    for (const [label, size] of units) {
        if (seconds >= size) {
            const v = Math.floor(seconds / size);
            return `${v} ${label}${v !== 1 ? 's' : ''}`;
        }
    }
    return 'less than a second';
}

const DEFAULT_ANCHORS = [
    { percent: 0,   seconds: 1 },
    { percent: 5,   seconds: 60 },               // 1 minute
    { percent: 15,  seconds: 3600 },             // 1 hour
    { percent: 30,  seconds: 24 * 3600 },        // 1 day
    { percent: 45,  seconds: 7 * 24 * 3600 },    // 1 week
    { percent: 60,  seconds: 30 * 24 * 3600 },   // ~1 month
    { percent: 75,  seconds: 365 * 24 * 3600 },  // 1 year
    { percent: 90,  seconds: 10 * 365 * 24 * 3600}, // 10 years
    { percent: 98,  seconds: 100 * 365 * 24 * 3600}, // 100 years
    { percent: 100, seconds: Infinity }
];

function percentFromAnchors(seconds, anchors = DEFAULT_ANCHORS) {
    if (!isFinite(seconds)) return 100;

    const a = anchors.slice().sort((x, y) => {
        const sx = x.seconds === Infinity ? Number.POSITIVE_INFINITY : x.seconds;
        const sy = y.seconds === Infinity ? Number.POSITIVE_INFINITY : y.seconds;
        return sx - sy;
    });

    const last = a[a.length - 1];
    const s = Math.max(0, seconds);

    if (s >= (last.seconds === Infinity ? Number.POSITIVE_INFINITY : last.seconds)) {
        return last.seconds === Infinity ? 100 : last.percent;
    }

    let left = a[0], right = a[1];
    for (let i = 0; i < a.length - 1; i++) {
        const a0 = a[i], a1 = a[i + 1];
        const s0 = a0.seconds === Infinity ? Number.POSITIVE_INFINITY : a0.seconds;
        const s1 = a1.seconds === Infinity ? Number.POSITIVE_INFINITY : a1.seconds;
        if (s >= s0 && s <= s1) {
            left = a0; right = a1; break;
        }
    }

    if (s === left.seconds) return left.percent;
    if (s === right.seconds) return right.percent;

    const sLeft = Math.max(1, left.seconds);
    const sRight = Math.max(1, right.seconds);
    const logLeft = Math.log10(sLeft);
    const logRight = Math.log10(sRight);
    const logS = Math.log10(Math.max(1, s));
    const denom = (logRight - logLeft) || 1e-9;
    const frac = (logS - logLeft) / denom;
    const pct = left.percent + frac * (right.percent - left.percent);
    return Math.round(Math.max(0, Math.min(100, pct)));
}

function deriveVerdict(percent, score) {
    if (percent < 10 || score <= 0) return 'very weak';
    if (percent < 30 || score === 1) return 'weak';
    if (percent < 60 || score === 2) return 'good';
    if (percent < 85 || score === 3) return 'strong';
    return 'extremely strong';
}

function cssClassFromVerdict(verdict) {
    switch (verdict) {
        case 'very weak': return 'very-weak';
        case 'weak': return 'weak';
        case 'good': return 'good';
        case 'strong': return 'strong';
        case 'extremely strong': return 'extremely-strong';
        default: return '';
    }
}

function looksLikeSequence(str) {
    const lower = str.toLowerCase();
    if (lower.length < 3) return false;

    for (let i = 0; i < lower.length - 2; i++) {
        const c1 = lower.charCodeAt(i);
        const c2 = lower.charCodeAt(i + 1);
        const c3 = lower.charCodeAt(i + 2);

        if (c2 === c1 + 1 && c3 === c2 + 1) return true;
        if (c2 === c1 - 1 && c3 === c2 - 1) return true;
    }

    return false;
}

function looksLikeKeyboardPattern(str) {
    const lower = str.toLowerCase();
    const keyboardRows = [
        "qwertyuiop",
        "asdfghjkl",
        "zxcvbnm",
        "1234567890"
    ];

    if (lower.length < 3) return false;

    for (const row of keyboardRows) {
        for (let i = 0; i < row.length - 2; i++) {
            const seq = row.slice(i, i + 3);
            if (lower.includes(seq)) return true;
            if (lower.includes([...seq].reverse().join(""))) return true;
        }
    }
    return false;
}

function customFeedback(password) {
    const suggestions = [];

    if (password.length < 8) {
        suggestions.push("Use at least 12 characters.");
    } else if (password.length < 12) {
        suggestions.push("Longer passwords are stronger. Aim for 12+ characters.");
    }

    if (!/[A-Z]/.test(password)) {
        suggestions.push("Add at least one uppercase letter.");
    }
    if (!/[a-z]/.test(password)) {
        suggestions.push("Add at least one lowercase letter.");
    }
    if (!/[0-9]/.test(password)) {
        suggestions.push("Include at least one number.");
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
        suggestions.push("Use special characters (e.g. !, $, %, &).");
    }

    if (/([a-zA-Z0-9])\1{2,}/.test(password)) {
        suggestions.push("Don't use repeated characters.");
    }

    if (looksLikeSequence(password)) {
        suggestions.push("Don't use predictable sequences.");
    }
    if (looksLikeKeyboardPattern(password)) {
        suggestions.push("Don't use simple keyboard patterns.");
    }

    return {
        suggestions
    };
}


export function evaluatePassword(password, opts = {}) {
    if (typeof password !== 'string') password = String(password || '');

    const zxcvbnFn = (typeof window !== 'undefined' && window.zxcvbn) || (typeof zxcvbn !== 'undefined' && zxcvbn);
    let res;
    try {
        res = zxcvbnFn(password);
    } catch (err) {
        return null
    }

    const times = res.crack_times_seconds || {};
    const displays = res.crack_times_display || {};

    const chosenSeconds =
        (typeof times.offline_slow_hashing_1e4_per_second === 'number' && times.offline_slow_hashing_1e4_per_second) ||
        (typeof times.offline_fast_hashing_1e10_per_second === 'number' && times.offline_fast_hashing_1e10_per_second) ||
        (typeof times.online_throttling_100_per_hour === 'number' && times.online_throttling_100_per_hour) ||
        0;

    const chosenDisplay =
        (displays.offline_slow_hashing_1e4_per_second) ||
        (displays.offline_fast_hashing_1e10_per_second) ||
        (displays.online_throttling_100_per_hour) ||
        secondsToDisplay(chosenSeconds);

    const anchors = Array.isArray(opts.anchors) ? opts.anchors : DEFAULT_ANCHORS;
    let percent;
    if (typeof chosenDisplay === 'string' && chosenDisplay.toLowerCase().includes('centuries')) {
        percent = 100;
    } else if (!isFinite(chosenSeconds)) {
        percent = 100;
    } else {
        percent = percentFromAnchors(chosenSeconds, anchors);
    }

    const score = Math.max(0, Math.min(4, (typeof res.score === 'number' ? res.score : 0)));
    const verdict = deriveVerdict(percent, score);
    const cssClass = cssClassFromVerdict(verdict);

    const status = (verdict === 'good' || verdict === 'strong' || verdict === 'extremely strong') ? 200 : 400;

    let message;
    if (status === 400) {
        message = customFeedback(password);
    } else {
        message = `Estimated time to crack: ${chosenDisplay}.`;
    }

    return {
        status,
        message,
        percent,
        percentText: `${percent}%`,
        verdict,
        cssClass,
        score,
        crack_times_display: chosenDisplay,
        raw: res
    };
}