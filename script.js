// 复制微信号
function copyWechat() {
    const wechatId = 'daijw200409';
    const toast = document.getElementById('wechat-toast');
    const btn = document.getElementById('wechat-btn');
    const textEl = document.getElementById('wechat-id-text');

    navigator.clipboard.writeText(wechatId).then(() => {
        // 显示提示
        toast.classList.remove('hidden');
        // 按钮反馈
        textEl.textContent = '已复制 ✓';
        textEl.style.color = 'var(--color-vermilion)';

        setTimeout(() => {
            toast.classList.add('hidden');
            textEl.textContent = wechatId;
            textEl.style.color = 'var(--color-ink)';
        }, 2500);
    }).catch(() => {
        // 降级方案：创建临时 input
        const input = document.createElement('input');
        input.value = wechatId;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        toast.classList.remove('hidden');
        textEl.textContent = '已复制 ✓';
        setTimeout(() => {
            toast.classList.add('hidden');
            textEl.textContent = wechatId;
        }, 2500);
    });
}

// 照片展示切换
function togglePhoto(id) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    // 滚动渐入动画
    const scrolls = document.querySelectorAll('.scroll-reveal');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            }
        });
    }, { threshold: 0.1 });
    scrolls.forEach(el => observer.observe(el));

    // 平滑滚动
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({ top: targetElement.offsetTop - 80, behavior: 'smooth' });
                // 关闭移动端菜单
                document.getElementById('mobile-menu')?.classList.remove('open');
            }
        });
    });

    // 移动端菜单切换
    const menuToggle = document.getElementById('menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('open');
        });
    }
});

// 水墨晕染 — 延迟启动
function initInkWash() {
    const c = document.createElement('canvas');
    Object.assign(c.style, {
        position: 'fixed', inset: '0', width: '100%', height: '100%',
        zIndex: '1', pointerEvents: 'none',
        filter: 'blur(0.5px)'
    });
    document.body.prepend(c);
    const ctx = c.getContext('2d');

    let W, H;
    const resize = () => { W = c.width = innerWidth; H = c.height = innerHeight; };
    addEventListener('resize', resize);
    resize();

    // 鼠标轨迹历史（最多 30 个点）
    const trail = [];
    const MAX_TRAIL = 30;

    addEventListener('mousemove', e => {
        trail.push({ x: e.clientX, y: e.clientY, t: performance.now() });
        if (trail.length > MAX_TRAIL) trail.shift();
    });

    function frame(now) {
        ctx.clearRect(0, 0, W, H);

        // 快速清除旧点：仅保留 800ms 内的轨迹（鼠标静止时迅速消散）
        while (trail.length > 0 && now - trail[0].t > 800) trail.shift();
        if (trail.length < 2) { requestAnimationFrame(frame); return; }

        // 计算速度
        const speeds = trail.map((p, i) => {
            if (i === 0) return 0;
            const dt = now - trail[i - 1].t || 1;
            return Math.hypot(p.x - trail[i - 1].x, p.y - trail[i - 1].y) / dt;
        });

        // 多层笔触
        const layers = [
            { widthMul: 4,   alpha: 0.015 },
            { widthMul: 2,   alpha: 0.035 },
            { widthMul: 1,   alpha: 0.07  },
        ];

        for (const layer of layers) {
            ctx.beginPath();
            ctx.moveTo(trail[0].x, trail[0].y);

            for (let i = 1; i < trail.length - 1; i++) {
                const xc = (trail[i].x + trail[i + 1].x) / 2;
                const yc = (trail[i].y + trail[i + 1].y) / 2;
                ctx.quadraticCurveTo(trail[i].x, trail[i].y, xc, yc);
            }
            const last = trail[trail.length - 1];
            ctx.lineTo(last.x, last.y);

            const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
            const lineWidth = Math.max(1, Math.min(14, 10 / (avgSpeed * 2 + 0.5))) * layer.widthMul;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = `oklch(18% 0.025 260 / ${layer.alpha})`;
            ctx.stroke();
        }

        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}
if ('requestIdleCallback' in window) {
    requestIdleCallback(initInkWash, { timeout: 3000 });
} else {
    setTimeout(initInkWash, 2000);
}
