/**
 * TestLogger — pretty console output + a screenshot on every step, written to
 * ONE flat folder with fully-qualified filenames so specs and phases never
 * collide:  screenshots/<phase>__<spec>__<test>__<NN>-<label>.png
 *
 * <phase> comes from process.env.QIT_PHASE (the runner sets QIT_PHASE=free|pro).
 * Copy this file verbatim into tests/e2e/tests/test-logger.js.
 */
const c = {
    reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m', red: '\x1b[31m',
    green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m',
    cyan: '\x1b[36m', gray: '\x1b[90m', bgRed: '\x1b[41m', bgGreen: '\x1b[42m', bgYellow: '\x1b[43m',
};
const STEP_ICONS = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳'];
const stepIcon = (n) => (n >= 1 && n <= 20 ? STEP_ICONS[n - 1] : `(${n})`);

// One flat directory for ALL screenshots. Playwright runs from tests/e2e, so a
// relative path is stable; page.screenshot() creates the dir itself.
const SHOT_DIR = 'screenshots';

function slug(str) {
    return String(str)
        .toLowerCase()
        .replace(/\.spec\.js$/, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 60) || 'unnamed';
}

function formatDuration(ms) {
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

class TestLogger {
    constructor(file, testName, page = null) {
        this.file = file;
        this.testName = testName;
        this.phase = process.env.QIT_PHASE || 'free';
        this.startTime = 0;
        this.stepCount = 0;
        this.shotSeq = 0;
        this.page = page;
    }

    attach(page) { this.page = page; return this; }

    /**
     * Best-effort screenshot into the flat folder. Never throws — a shot taken
     * mid-navigation or against a closed page must not turn a passing test red.
     */
    async shot(label = 'shot', page = null) {
        const target = page || this.page;
        if (!target || (typeof target.isClosed === 'function' && target.isClosed())) return;
        this.shotSeq += 1;
        const seq = String(this.shotSeq).padStart(2, '0');
        const name = `${slug(this.phase)}__${slug(this.file)}__${slug(this.testName)}__${seq}-${slug(label)}.png`;
        try {
            await target.screenshot({ path: `${SHOT_DIR}/${name}`, fullPage: false, timeout: 5000 });
        } catch (e) { /* diagnostic only — swallow */ }
    }

    start() {
        this.startTime = Date.now();
        console.log(`\n${c.cyan}┌${'─'.repeat(70)}┐${c.reset}`);
        console.log(`${c.cyan}│${c.reset} ${c.bold}${this.file}${c.reset} ${c.dim}›${c.reset} ${c.bold}${this.testName}${c.reset}`);
        console.log(`${c.cyan}│${c.reset} ${c.gray}[phase: ${this.phase}]${c.reset}`);
        console.log(`${c.cyan}└${'─'.repeat(70)}┘${c.reset}\n`);
    }

    end(status) {
        const d = formatDuration(Date.now() - this.startTime);
        const map = {
            passed: `${c.bgGreen}${c.bold} ✔ PASSED ${c.reset}`,
            failed: `${c.bgRed}${c.bold} ✖ FAILED ${c.reset}`,
            skipped: `${c.bgYellow}${c.bold} ⊘ SKIPPED ${c.reset}`,
        };
        console.log(`\n${map[status]}  ${c.gray}(${d})${c.reset}\n`);
    }

    async step(n, description) {
        this.stepCount = n;
        console.log(`  ${c.cyan}${stepIcon(n)}${c.reset} ${description}`);
        await this.shot(`step-${String(n).padStart(2, '0')}-${description}`);
    }

    info(m) { console.log(`    ${c.blue}ℹ${c.reset} ${m}`); }
    success(m) { console.log(`    ${c.green}✔${c.reset} ${m}`); }
    warn(m) { console.log(`    ${c.yellow}⚠${c.reset} ${m}`); }
    error(m) { console.log(`    ${c.red}✖ ${m}${c.reset}`); }

    async snapshot(page, label = 'snapshot') {
        console.log(`\n  ${c.magenta}📸 ${label}${c.reset} ${c.gray}${page.url()}${c.reset}`);
        await this.shot(label, page);
    }
}

module.exports = { TestLogger };
