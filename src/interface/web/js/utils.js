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

let _lastLen = 0;
let _lastPercent = 0;

export function checkPasswordStrength(password) {
    const commonPasswords = [
        "123456","123456789","12345678","1234567","1234567890","000000",
        "password","password1","passwort","passwort1","qwerty","abc123",
        "111111","123123","letmein","welcome","monkey","dragon","football",
        "iloveyou","admin","login","starwars","pokemon","master","hello",
        "hallo","freedom","whatever","superman","sommer","winter","baseball",
        "shadow","696969","trustno1","princess","qwerty123","zaq1zaq1",
        "0000","121212","flower","hunde","katze","sunshine","lovely",
        "mustang","access","welcome1","password123","solo","solo123","ninja",
        "123qwe","qazwsx","654321","987654321","1q2w3e4r","abcd1234",
        "pass1234","guest","user","abc12345","football1","admin123","root",
        "secret","loveme","pizza","computer","desktop","internet",
        "p@ssword","p@ssw0rd","passw0rd","password!","letmein123","iloveyou1",
        "iloveyou123","letmein!","123456a","adminadmin","user123","welcome123",
        "abcd123","q1w2e3","zaq12wsx","root123","default","changeme",
        "111222","12121212","abcdef","abcdefg","qqqqqq","aaaaaa","asdfasdf",
        "abc123456","passw0rd1","pass12345","1234abcd","1qazxsw2","1q2w3e4r5t",
        "zaq12wsx34","lovely1","michael","jessica","charlie","daniel",
        "password2020","welcome2020","admin2020","pass123","1234567a","qwerty1",
        "superman1","batman","batman123","starwars1","starwars2","pokemon1",
        "dragon123","master123","hello123","freedom1","summer2020","winter2020",
        "soccer","hockey","baseball1","football2","love123","loveme1","secret1",
        "trustno1","welcome11","sunshine1","flower1","princess1","access123",
        "internet1","computer1","desktop1","letmein2020","guest123","user1",
        "admin1","root1","toor","qwert","1qaz2wsx","1qaz2wsx3edc","qweqwe",
        "asdfjkl;","asdfghjkl","zxcvbnm","zxcvbnm,./","passw0rd!","hello1",
        "goodbye","password2","password3"
    ];

    const keyboardPatterns = [
        "qwerty","qwertz","qwertyuiop","qwertyui","qwert","qwerty123","qwert1",
        "asdf","asdfgh","asdfghjkl","asdfjkl;","zxcvbn","zxcvbnm","zxcvbnm,./",
        "qaz","wsx","edc","1q2w3e","1qaz2wsx","qazwsx","qaz1","12345",
        "123456789","1234567890","09876","0987654321","poiuy","mnbvcx",
        "lkjhg","trewq","yxcv","asdf1234","zxcv1234","keyboard","pass",
        "qweasd","qwe123","1qazxsw2","1qazxsw2cde3","q1w2e3","1q2w3e4r",
        "1q2w3e4r5t","zaq12wsx","qazwsxedc","wsxedc","edc123","123qwe",
        "poiuytrewq","mnbvcxz","plmoknijb","poiuytre","qaz1xsw2","1qazxsw2",
        "1234qwer","qweasdzxc","qazwsx123","qazwsx1","qwe123asd","asdf123qwe",
        "zxcvbnm1","zxcvbnm2","123098","7890-=","-=0987","4567","2345",
        "0987","8765","54321","qwer1234","qwerasdf","asdfqwer","qazwsxedc",
        "zaq1xsw2cde3vfr4","1q2w3e4r5t6y","qwe!@#","qwe@123","asdf!@#",
        "zxc!@#","1!2@3#","!@#$%^","!@#$","qaz!@#","plmkoijnb"
    ];

    const MAX_LENGTH = 40;
    const MAX_VARIETY = 30;
    const MAX_UNPRED = 30;
    const AUTO_MAX = 28;

    const pw = password || "";
    const len = pw.length;
    const pwLower = pw.toLowerCase();

    const hasLower = /[a-z]/.test(pw);
    const hasUpper = /[A-Z]/.test(pw);
    const hasNumber = /[0-9]/.test(pw);
    const hasSpecial = /[^A-Za-z0-9]/.test(pw);
    const isOnlyDigits = /^\d+$/.test(pw);

    const isExactCommon = commonPasswords.includes(pwLower);
    const containsCommonSubstring = commonPasswords.some(c => c.length >= 4 && pwLower.includes(c));

    const feedback = [];

    let lengthScore = 0;
    if (len > 4) {
        const effective = Math.min(len, MAX_LENGTH);
        lengthScore = ((effective - 4) / (MAX_LENGTH - 4)) * MAX_LENGTH;
    } else {
        if (len === 0) feedback.push("Enter a password.");
        else feedback.push("Password is very short (less than 5 characters).");
    }
    lengthScore = Math.round(Math.max(0, Math.min(MAX_LENGTH, lengthScore)));

    const varietyBase = (hasLower ? 1 : 0) + (hasUpper ? 1 : 0) + (hasNumber ? 1 : 0) + (hasSpecial ? 1 : 0);
    const lengthFactorForVariety = Math.min(1, len / 18);
    let varietyScore = (varietyBase / 4) * MAX_VARIETY * lengthFactorForVariety;
    varietyScore = Math.round(Math.max(0, Math.min(MAX_VARIETY, varietyScore)));

    if (!hasLower) feedback.push("Add lowercase letters.");
    if (!hasUpper) feedback.push("Add uppercase letters.");
    if (!hasNumber) feedback.push("Add numbers.");
    if (!hasSpecial) feedback.push("Add special characters (e.g. !?#@).");

    let unpredictRaw = 0;
    const uniqueChars = new Set(pw).size;
    const uniqueRatio = len > 0 ? (uniqueChars / len) : 0;
    unpredictRaw += uniqueRatio * 28;

    const hasInterleave = /[a-zA-Z].*\d.*[a-zA-Z]/.test(pw) || /\d.*[a-zA-Z].*\d/.test(pw);
    if (hasInterleave && hasSpecial) unpredictRaw += 8;
    else if (hasInterleave) unpredictRaw += 4;

    if (isExactCommon) {
        unpredictRaw -= 30;
        feedback.push("Password is a commonly used password — do not use it.");
    }
    if (containsCommonSubstring) {
        if (len < 12) {
            unpredictRaw -= 16;
            feedback.push("Contains known words or patterns.");
        } else {
            unpredictRaw -= 6;
            feedback.push("Contains known words or patterns (longer form).");
        }
    }

    const wordNumberTrailingMatch = /^([A-Za-z]+)(\d+)([^A-Za-z0-9]*)$/.exec(pw);
    let applyWordNumberPenalty = false;
    let trailingDigitsLength = 0;
    if (wordNumberTrailingMatch) {
        const digits = wordNumberTrailingMatch[2].length;
        trailingDigitsLength = digits;
        const trailingOnlySpecials = /^[A-Za-z]+\d+[^A-Za-z0-9]*$/.test(pw);
        if (digits <= 6 && !hasInterleave) {
            unpredictRaw -= 22;
            feedback.push("Pattern 'word + short number' detected — highly predictable.");
            applyWordNumberPenalty = true;
        } else if (digits <= 12 && !hasInterleave) {
            unpredictRaw -= 18;
            feedback.push("Pattern 'word + medium number' detected — predictable.");
            applyWordNumberPenalty = true;
        } else if (digits <= 16 && !hasInterleave) {
            unpredictRaw -= 10;
            feedback.push("Pattern 'word + long number' detected — somewhat predictable.");
            applyWordNumberPenalty = true;
        } else if (digits <= 12 && trailingOnlySpecials && hasInterleave) {
            unpredictRaw -= 10;
            applyWordNumberPenalty = true;
        } else {
            unpredictRaw += Math.min(6, Math.floor((digits - 12) / 4));
        }
    }

    const badSeqs = ["0123","1234","2345","3456","4567","5678","6789","7890","8901","4321","3210","2109",
        "abcd","bcde","cdef","defg","efgh","fghi","ghij","hijk","ijkl","jklm","klmn","lmno",
        "mnop","nopq","opqr","pqrs","qrst","rstu","stuv","tuvw","uvwx","wxyz"];
    const hasBadSeq = badSeqs.some(s => pwLower.includes(s));
    if (hasBadSeq) {
        unpredictRaw -= (len < 16 ? 14 : 4);
        feedback.push("Simple sequences detected (e.g. '1234' or 'abcd').");
    }
    const hasKeyboard = keyboardPatterns.some(k => pwLower.includes(k));
    if (hasKeyboard) {
        unpredictRaw -= 12;
        feedback.push("Keyboard pattern detected (e.g. 'qwerty' or 'asdf').");
    }
    if (/(.)\1{5,}/.test(pw)) {
        unpredictRaw -= 20;
        feedback.push("Many repetitions of the same character found.");
    } else if (/(.)\1{3,}/.test(pw)) {
        unpredictRaw -= 6;
    }

    unpredictRaw = Math.max(-40, Math.min(40, unpredictRaw));
    const lenFactorUnpred = Math.min(1, len / 10);
    let unpredictability = Math.round((unpredictRaw + 40) * lenFactorUnpred);
    unpredictability = Math.round((unpredictability / 80) * MAX_UNPRED);
    unpredictability = Math.max(0, Math.min(MAX_UNPRED, unpredictability));

    if (applyWordNumberPenalty) {
        const penaltyFactor = 0.10;
        lengthScore = Math.round(lengthScore * penaltyFactor);
        varietyScore = Math.round(varietyScore * penaltyFactor);
        unpredictability = Math.min(unpredictability, Math.round(MAX_UNPRED * 0.10));
    }

    if (len >= AUTO_MAX && !isOnlyDigits && !isExactCommon && uniqueRatio >= 0.12) {
        lengthScore = MAX_LENGTH;
        varietyScore = MAX_VARIETY;
        unpredictability = MAX_UNPRED;
    }

    function tokenize(p) {
        const tokens = [];
        let i = 0;
        while (i < p.length) {
            const ch = p[i];
            if (/[A-Za-z]/.test(ch)) {
                let j = i; while (j < p.length && /[A-Za-z]/.test(p[j])) j++;
                tokens.push({type: "alpha", str: p.slice(i,j)}); i = j;
            } else if (/[0-9]/.test(ch)) {
                let j = i; while (j < p.length && /[0-9]/.test(p[j])) j++;
                tokens.push({type: "digits", str: p.slice(i,j)}); i = j;
            } else {
                let j = i; while (j < p.length && /[^A-Za-z0-9]/.test(p[j])) j++;
                tokens.push({type: "special", str: p.slice(i,j)}); i = j;
            }
        }
        return tokens;
    }

    function guessCountForToken(tok) {
        const s = tok.str;
        if (tok.type === "digits") {
            if (/^(19|20)\d{2}$/.test(s)) return 200;
            return Math.pow(10, s.length);
        }
        if (tok.type === "special") {
            return Math.pow(10, Math.min(4, s.length));
        }
        const lower = s.toLowerCase();
        if (commonPasswords.includes(lower)) return 1e3;
        if (keyboardPatterns.some(k => lower.includes(k))) return 1e3;
        let tokenCharset = 0;
        if (/[a-z]/.test(s)) tokenCharset += 26;
        if (/[A-Z]/.test(s)) tokenCharset += 26;
        if (/[0-9]/.test(s)) tokenCharset += 10;
        if (/[^A-Za-z0-9]/.test(s)) tokenCharset += 32;
        if (tokenCharset === 0) tokenCharset = 26;
        const guesses = Math.pow(tokenCharset, s.length);
        return Math.min(guesses, 1e8);
    }

    const tokens = tokenize(pw);
    let tokenGuesses = 1;
    for (const t of tokens) {
        const g = guessCountForToken(t);
        tokenGuesses = Math.min(tokenGuesses * g, Number.MAX_SAFE_INTEGER / 2);
    }

    let charsetSize = 0;
    if (hasLower) charsetSize += 26;
    if (hasUpper) charsetSize += 26;
    if (hasNumber) charsetSize += 10;
    if (hasSpecial) charsetSize += 32;
    if (charsetSize === 0) charsetSize = 1;
    const bruteForceGuesses = Math.min(Math.pow(charsetSize, Math.max(len,1)), Number.MAX_SAFE_INTEGER / 2);

    let estimatedGuesses = Math.max(1, Math.min(tokenGuesses, bruteForceGuesses));

    if (applyWordNumberPenalty && trailingDigitsLength > 0) {
        const cap = Math.pow(10, Math.min(trailingDigitsLength, 6)) * 1e3;
        estimatedGuesses = Math.min(estimatedGuesses, Math.max(1e4, Math.round(cap)));
    }

    const scenarioRates = {
        online_throttled: 10,
        assumed_rate: 1e4,
        offline_slow: 1e7,
        offline_fast: 1e10,
        supercluster: 1e12
    };

    function formatTimeReadable(seconds) {
        if (!isFinite(seconds) || seconds <= 0) return "less than 1 second";
        const s = Math.round(seconds);
        if (s < 60) return `${s} seconds`;
        if (s < 3600) return `${Math.round(s/60)} minutes`;
        if (s < 86400) return `${Math.round(s/3600)} hours`;
        if (s < 30*86400) return `${Math.round(s/86400)} days`;
        if (s < 365*86400) return `${Math.round(s/(30*86400))} months`;
        const years = s / (365*86400);
        if (years < 100) return `${Math.round(years)} years`;
        return `centuries`;
    }

    const timeToCrackScenarios = {};
    for (const [name, rate] of Object.entries(scenarioRates)) {
        const avgAttempts = Math.max(1, estimatedGuesses / 2);
        const seconds = avgAttempts / rate;
        timeToCrackScenarios[name] = {
            seconds,
            readable: formatTimeReadable(seconds)
        };
    }

    const preferredTime = timeToCrackScenarios.assumed_rate;

    let entropyBits = (() => {
        const epc = Math.log2(charsetSize);
        const uniquenessFactor = 0.5 + 0.5 * uniqueRatio;
        let eb = len * epc * uniquenessFactor;
        if (isExactCommon) eb = Math.max(1, eb * 0.05);
        if (containsCommonSubstring) eb -= (len < 12 ? 12 : 4);
        if (hasBadSeq) eb -= (len < 16 ? 10 : 3);
        if (hasKeyboard) eb -= 10;
        if (/(.)\1{5,}/.test(pw)) eb -= 16;
        if (/(.)\1{3,}/.test(pw)) eb -= 6;
        if (applyWordNumberPenalty) eb -= 18;
        if (applyWordNumberPenalty) {
            const extraReduction = Math.min(16, Math.round(trailingDigitsLength * 1.2));
            eb -= extraReduction;
        }
        return Math.max(0, Math.round(eb*10)/10);
    })();

    function percentFromSeconds(seconds) {
        if (!isFinite(seconds) || seconds <= 0) return 100;
        const log = Math.log10(seconds + 1);
        const normalized = Math.max(0, Math.min(1, log / 12));
        return Math.round(normalized * 100);
    }

    let percent = percentFromSeconds(preferredTime.seconds);
    if (len <= 5) percent = Math.min(percent, 10);

    if (len > _lastLen) {
        if (percent < _lastPercent) percent = _lastPercent;
        else { _lastLen = len; _lastPercent = percent; }
    } else {
        _lastLen = len; _lastPercent = percent;
    }

    let verdict, cssClass;
    if (percent < 40) { verdict = "Weak"; cssClass = "weak"; }
    else if (percent < 60) { verdict = "Medium"; cssClass = "medium"; }
    else if (percent < 80) { verdict = "Strong"; cssClass = "strong"; }
    else { verdict = "Extremely Strong"; cssClass = "extreme"; }

    if (feedback.length === 0) {
        if (percent < 40) feedback.push("Short or predictable — use longer passwords with special characters.");
        else if (percent < 60) feedback.push("Improve length or variety (uppercase/lowercase, numbers, special characters).");
        else if (percent < 80) feedback.push("Good password — adding more length or mixing characters makes it even better.");
        else feedback.push("Very strong — long and well mixed.");
    }

    const status = (verdict === "Weak") ? 400 : 200;
    const message = feedback.join(" ");

    return {
        status,
        message,
        percent,
        breakdown: {
            length: Math.round(lengthScore),
            variety: Math.round(varietyScore),
            unpredictability
        },
        verdict,
        cssClass,
        feedback,
        entropyBits,
        estimatedGuesses: Math.round(estimatedGuesses),
        timeToCrackScenarios,
        preferredTimeReadable: preferredTime.readable,
        preferredTimeSeconds: preferredTime.seconds
    };
}
