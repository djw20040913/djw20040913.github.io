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

    // ===== 挂绳卡片物理摆动 =====
    initLanyardPhysics();
});

function initLanyardPhysics() {
    const cards = document.querySelectorAll('.lanyard-card-wrapper');
    if (!cards.length) return;

    // 仅桌面端启用
    if (window.innerWidth < 768) return;

    const states = [];
    cards.forEach((card, i) => {
        states.push({
            el: card,
            angle: 0,
            velocity: (Math.random() - 0.5) * 0.5, // 初始微摆动
            isHovered: false,
        });
        card.classList.add('physics-active');
    });

    // 鼠标进入时施加推力
    cards.forEach((card, i) => {
        card.addEventListener('mouseenter', () => {
            states[i].isHovered = true;
            // 随机初始角速度（模拟被推了一下）
            states[i].velocity += (Math.random() - 0.5) * 4;
        });
        card.addEventListener('mouseleave', () => {
            states[i].isHovered = false;
        });
    });

    // 全局鼠标风力影响
    let lastMouseX = 0;
    let mouseVX = 0;
    document.addEventListener('mousemove', (e) => {
        mouseVX = e.clientX - lastMouseX;
        lastMouseX = e.clientX;

        // 对附近的卡片施加风力
        states.forEach((s) => {
            if (!s.isHovered) return;
            const rect = s.el.getBoundingClientRect();
            const cardCenterX = rect.left + rect.width / 2;
            const dist = Math.abs(e.clientX - cardCenterX);
            if (dist < 150) {
                const wind = mouseVX * 0.015 * (1 - dist / 150);
                s.velocity += wind;
            }
        });
    });

    // 物理动画循环
    const DAMPING = 0.97;
    const GRAVITY = 0.003;
    const HOVER_DAMPING = 0.985;
    const MAX_ANGLE = 15;

    function animate() {
        states.forEach((s) => {
            // 阻尼摆动物理模型
            s.velocity += -s.angle * GRAVITY;
            s.velocity *= s.isHovered ? HOVER_DAMPING : DAMPING;
            s.angle += s.velocity;

            // 限制最大角度
            if (s.angle > MAX_ANGLE) { s.angle = MAX_ANGLE; s.velocity *= -0.3; }
            if (s.angle < -MAX_ANGLE) { s.angle = -MAX_ANGLE; s.velocity *= -0.3; }

            s.el.style.transform = `rotate(${s.angle}deg)`;
        });
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
}

// WebGL 水墨流体模拟 — 延迟启动
function initFluidInk() {
    const container = document.createElement('div');
    Object.assign(container.style, {
        position: 'fixed', top: '0', left: '0',
        width: '100%', height: '100%',
        zIndex: '1', pointerEvents: 'none'
    });
    const canvas = document.createElement('canvas');
    Object.assign(canvas.style, { width: '100vw', height: '100vh', display: 'block' });
    container.appendChild(canvas);
    document.body.prepend(container);

    // --- 水墨风格参数 ---
    const config = {
        SIM_RESOLUTION: 128,
        DYE_RESOLUTION: 1440,
        DENSITY_DISSIPATION: 1.2,   // 墨迹消散速度（小=留更久，像墨渗宣纸）
        VELOCITY_DISSIPATION: 1.5,
        PRESSURE: 0.15,
        PRESSURE_ITERATIONS: 20,
        CURL: 1.5,                   // 漩涡强度（更小=墨在纸上自然晕开）
        SPLAT_RADIUS: 0.3,           // 稍大=更像墨滴扩散
        SPLAT_FORCE: 3500,
        SHADING: true,
        COLOR_UPDATE_SPEED: 0,       // 不自动换色
        BACK_COLOR: { r: 0.02, g: 0.02, b: 0.03 },
        TRANSPARENT: true,
        RAINBOW_MODE: false,
        COLOR: '#1a1a2e',            // 备用基色（generateColor 已改为调色盘取色）
        INK_INTENSITY: 0.35          // 墨色浓度系数（越大越浓）
    };

    function pointerPrototype() {
        this.id = -1; this.texcoordX = 0; this.texcoordY = 0;
        this.prevTexcoordX = 0; this.prevTexcoordY = 0;
        this.deltaX = 0; this.deltaY = 0;
        this.down = false; this.moved = false;
        this.color = [0, 0, 0];
    }
    let pointers = [new pointerPrototype()];

    const { gl, ext } = getWebGLContext(canvas);
    if (!ext.supportLinearFiltering) {
        config.DYE_RESOLUTION = 256;
        config.SHADING = false;
    }

    function getWebGLContext(canvas) {
        const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };
        let gl = canvas.getContext('webgl2', params);
        const isWebGL2 = !!gl;
        if (!isWebGL2) gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
        let halfFloat;
        let supportLinearFiltering;
        if (isWebGL2) {
            gl.getExtension('EXT_color_buffer_float');
            supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
        } else {
            halfFloat = gl.getExtension('OES_texture_half_float');
            supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');
        }
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        const halfFloatTexType = isWebGL2 ? gl.HALF_FLOAT : halfFloat && halfFloat.HALF_FLOAT_OES;
        let formatRGBA, formatRG, formatR;
        if (isWebGL2) {
            formatRGBA = getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, halfFloatTexType);
            formatRG = getSupportedFormat(gl, gl.RG16F, gl.RG, halfFloatTexType);
            formatR = getSupportedFormat(gl, gl.R16F, gl.RED, halfFloatTexType);
        } else {
            formatRGBA = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
            formatRG = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
            formatR = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
        }
        return { gl, ext: { formatRGBA, formatRG, formatR, halfFloatTexType, supportLinearFiltering } };
    }

    function getSupportedFormat(gl, internalFormat, format, type) {
        if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
            switch (internalFormat) {
                case gl.R16F: return getSupportedFormat(gl, gl.RG16F, gl.RG, type);
                case gl.RG16F: return getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type);
                default: return null;
            }
        }
        return { internalFormat, format };
    }

    function supportRenderTextureFormat(gl, internalFormat, format, type) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    }

    class Material {
        constructor(vs, fsSource) {
            this.vertexShader = vs; this.fragmentShaderSource = fsSource;
            this.programs = []; this.activeProgram = null; this.uniforms = [];
        }
        setKeywords(keywords) {
            let hash = 0;
            for (let i = 0; i < keywords.length; i++) hash += hashCode(keywords[i]);
            let program = this.programs[hash];
            if (!program) { program = createProgram(this.vertexShader, compileShader(gl.FRAGMENT_SHADER, this.fragmentShaderSource, keywords)); this.programs[hash] = program; }
            if (program === this.activeProgram) return;
            this.uniforms = getUniforms(program); this.activeProgram = program;
        }
        bind() { gl.useProgram(this.activeProgram); }
    }

    class Program {
        constructor(vs, fs) { this.uniforms = {}; this.program = createProgram(vs, fs); this.uniforms = getUniforms(this.program); }
        bind() { gl.useProgram(this.program); }
    }

    function createProgram(vs, fs) {
        const p = gl.createProgram();
        gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.trace(gl.getProgramInfoLog(p));
        return p;
    }
    function getUniforms(program) {
        const u = []; const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < count; i++) { u[gl.getActiveUniform(program, i).name] = gl.getUniformLocation(program, gl.getActiveUniform(program, i).name); }
        return u;
    }
    function compileShader(type, source, keywords) {
        source = addKeywords(source, keywords);
        const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.trace(gl.getShaderInfoLog(s));
        return s;
    }
    function addKeywords(source, keywords) {
        if (!keywords) return source;
        return keywords.map(k => '#define ' + k).join('\n') + '\n' + source;
    }

    const baseVertexShader = compileShader(gl.VERTEX_SHADER, `
        precision highp float;
        attribute vec2 aPosition;
        varying vec2 vUv, vL, vR, vT, vB;
        uniform vec2 texelSize;
        void main() {
            vUv = aPosition * 0.5 + 0.5;
            vL = vUv - vec2(texelSize.x, 0.0);
            vR = vUv + vec2(texelSize.x, 0.0);
            vT = vUv + vec2(0.0, texelSize.y);
            vB = vUv - vec2(0.0, texelSize.y);
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }
    `);

    const clearShader = compileShader(gl.FRAGMENT_SHADER, `
        precision mediump float; precision mediump sampler2D;
        varying highp vec2 vUv; uniform sampler2D uTexture; uniform float value;
        void main() { gl_FragColor = value * texture2D(uTexture, vUv); }
    `);

    const displayShaderSource = `
        precision highp float; precision highp sampler2D;
        varying vec2 vUv, vL, vR, vT, vB;
        uniform sampler2D uTexture, uDithering; uniform vec2 ditherScale, texelSize;
        vec3 linearToGamma(vec3 c) { c = max(c, vec3(0)); return max(1.055 * pow(c, vec3(0.416666667)) - 0.055, vec3(0)); }
        void main() {
            vec3 c = texture2D(uTexture, vUv).rgb;
            #ifdef SHADING
                vec3 lc = texture2D(uTexture, vL).rgb, rc = texture2D(uTexture, vR).rgb;
                vec3 tc = texture2D(uTexture, vT).rgb, bc = texture2D(uTexture, vB).rgb;
                float dx = length(rc) - length(lc), dy = length(tc) - length(bc);
                vec3 n = normalize(vec3(dx, dy, length(texelSize))), l = vec3(0.0, 0.0, 1.0);
                c *= clamp(dot(n, l) + 0.7, 0.7, 1.0);
            #endif
            gl_FragColor = vec4(c, min(1.0, max(c.r, max(c.g, c.b)) * 3.5));
        }
    `;

    const splatShader = compileShader(gl.FRAGMENT_SHADER, `
        precision highp float; precision highp sampler2D;
        varying vec2 vUv; uniform sampler2D uTarget;
        uniform float aspectRatio; uniform vec3 color; uniform vec2 point; uniform float radius;
        void main() {
            vec2 p = vUv - point.xy; p.x *= aspectRatio;
            gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + exp(-dot(p,p)/radius) * color, 1.0);
        }
    `);

    const advectionShader = compileShader(gl.FRAGMENT_SHADER, `
        precision highp float; precision highp sampler2D;
        varying vec2 vUv; uniform sampler2D uVelocity, uSource;
        uniform vec2 texelSize, dyeTexelSize; uniform float dt, dissipation;
        vec4 bilerp(sampler2D sam, vec2 uv, vec2 tsize) {
            vec2 st = uv / tsize - 0.5, iuv = floor(st), fuv = fract(st);
            return mix(mix(texture2D(sam,(iuv+vec2(0.5,0.5))*tsize), texture2D(sam,(iuv+vec2(1.5,0.5))*tsize), fuv.x),
                       mix(texture2D(sam,(iuv+vec2(0.5,1.5))*tsize), texture2D(sam,(iuv+vec2(1.5,1.5))*tsize), fuv.x), fuv.y);
        }
        void main() {
            #ifdef MANUAL_FILTERING
                vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
                gl_FragColor = bilerp(uSource, coord, dyeTexelSize) / (1.0 + dissipation * dt);
            #else
                vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
                gl_FragColor = texture2D(uSource, coord) / (1.0 + dissipation * dt);
            #endif
        }
    `, ext.supportLinearFiltering ? null : ['MANUAL_FILTERING']);

    const divergenceShader = compileShader(gl.FRAGMENT_SHADER, `
        precision mediump float; precision mediump sampler2D;
        varying highp vec2 vUv, vL, vR, vT, vB; uniform sampler2D uVelocity;
        void main() {
            float L = texture2D(uVelocity, vL).x, R = texture2D(uVelocity, vR).x;
            float T = texture2D(uVelocity, vT).y, B = texture2D(uVelocity, vB).y;
            vec2 C = texture2D(uVelocity, vUv).xy;
            if (vL.x < 0.0) L = -C.x; if (vR.x > 1.0) R = -C.x;
            if (vT.y > 1.0) T = -C.y; if (vB.y < 0.0) B = -C.y;
            gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
        }
    `);

    const curlShader = compileShader(gl.FRAGMENT_SHADER, `
        precision mediump float; precision mediump sampler2D;
        varying highp vec2 vUv, vL, vR, vT, vB; uniform sampler2D uVelocity;
        void main() {
            gl_FragColor = vec4(0.5 * (texture2D(uVelocity,vR).y - texture2D(uVelocity,vL).y - texture2D(uVelocity,vT).x + texture2D(uVelocity,vB).x), 0.0, 0.0, 1.0);
        }
    `);

    const vorticityShader = compileShader(gl.FRAGMENT_SHADER, `
        precision highp float; precision highp sampler2D;
        varying vec2 vUv, vL, vR, vT, vB;
        uniform sampler2D uVelocity, uCurl; uniform float curl, dt;
        void main() {
            float L = texture2D(uCurl,vL).x, R = texture2D(uCurl,vR).x;
            float T = texture2D(uCurl,vT).x, B = texture2D(uCurl,vB).x;
            float C = texture2D(uCurl,vUv).x;
            vec2 force = 0.5 * vec2(abs(T)-abs(B), abs(R)-abs(L));
            force /= length(force) + 0.0001; force *= curl * C; force.y *= -1.0;
            vec2 v = texture2D(uVelocity, vUv).xy + force * dt;
            gl_FragColor = vec4(min(max(v,-1000.0),1000.0), 0.0, 1.0);
        }
    `);

    const pressureShader = compileShader(gl.FRAGMENT_SHADER, `
        precision mediump float; precision mediump sampler2D;
        varying highp vec2 vUv, vL, vR, vT, vB;
        uniform sampler2D uPressure, uDivergence;
        void main() {
            gl_FragColor = vec4((texture2D(uPressure,vL).x + texture2D(uPressure,vR).x + texture2D(uPressure,vB).x + texture2D(uPressure,vT).x - texture2D(uDivergence,vUv).x) * 0.25, 0.0, 0.0, 1.0);
        }
    `);

    const gradientSubtractShader = compileShader(gl.FRAGMENT_SHADER, `
        precision mediump float; precision mediump sampler2D;
        varying highp vec2 vUv, vL, vR, vT, vB; uniform sampler2D uPressure, uVelocity;
        void main() { gl_FragColor = vec4(texture2D(uVelocity,vUv).xy - vec2(texture2D(uPressure,vR).x - texture2D(uPressure,vL).x, texture2D(uPressure,vT).x - texture2D(uPressure,vB).x), 0.0, 1.0); }
    `);

    const blit = (() => {
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,-1,1,1,1,1,-1]), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0,1,2,0,2,3]), gl.STATIC_DRAW);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(0);
        return (target, clear = false) => {
            if (target == null) { gl.viewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight); gl.bindFramebuffer(gl.FRAMEBUFFER,null); }
            else { gl.viewport(0,0,target.width,target.height); gl.bindFramebuffer(gl.FRAMEBUFFER,target.fbo); }
            if (clear) { gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT); }
            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
        };
    })();

    let dye, velocity, divergence, curl, pressure;
    const clearProgram = new Program(baseVertexShader, clearShader);
    const splatProgram = new Program(baseVertexShader, splatShader);
    const advectionProgram = new Program(baseVertexShader, advectionShader);
    const divergenceProgram = new Program(baseVertexShader, divergenceShader);
    const curlProgram = new Program(baseVertexShader, curlShader);
    const vorticityProgram = new Program(baseVertexShader, vorticityShader);
    const pressureProgram = new Program(baseVertexShader, pressureShader);
    const gradienSubtractProgram = new Program(baseVertexShader, gradientSubtractShader);
    const displayMaterial = new Material(baseVertexShader, displayShaderSource);

    function createFBO(w, h, internalFormat, format, type, param) {
        gl.activeTexture(gl.TEXTURE0);
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        gl.viewport(0, 0, w, h); gl.clear(gl.COLOR_BUFFER_BIT);
        return { texture, fbo, width: w, height: h, texelSizeX: 1/w, texelSizeY: 1/h, attach(id) { gl.activeTexture(gl.TEXTURE0+id); gl.bindTexture(gl.TEXTURE_2D, texture); return id; } };
    }
    function createDoubleFBO(w, h, internalFormat, format, type, param) {
        let f1 = createFBO(w,h,internalFormat,format,type,param), f2 = createFBO(w,h,internalFormat,format,type,param);
        return { width:w, height:h, texelSizeX:f1.texelSizeX, texelSizeY:f1.texelSizeY,
            get read(){return f1}, set read(v){f1=v}, get write(){return f2}, set write(v){f2=v},
            swap(){ let t=f1; f1=f2; f2=t; }
        };
    }
    function resizeFBO(target, w, h, iF, f, t, p) {
        const n = createFBO(w,h,iF,f,t,p);
        new Program(baseVertexShader, compileShader(gl.FRAGMENT_SHADER, `precision mediump float; precision mediump sampler2D; varying highp vec2 vUv; uniform sampler2D uTexture; void main(){gl_FragColor=texture2D(uTexture,vUv);}`)).bind();
        gl.uniform1i(gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), 'uTexture'), target.attach(0));
        blit(n); return n;
    }
    function resizeDoubleFBO(target, w, h, iF, f, t, p) {
        if (target.width===w && target.height===h) return target;
        target.read = resizeFBO(target.read,w,h,iF,f,t,p);
        target.write = createFBO(w,h,iF,f,t,p);
        target.width=w; target.height=h; target.texelSizeX=1/w; target.texelSizeY=1/h;
        return target;
    }

    function initFramebuffers() {
        const simRes = getResolution(config.SIM_RESOLUTION), dyeRes = getResolution(config.DYE_RESOLUTION);
        const texType = ext.halfFloatTexType, filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;
        const rgba = ext.formatRGBA, rg = ext.formatRG, r = ext.formatR;
        gl.disable(gl.BLEND);
        if (!dye) dye = createDoubleFBO(dyeRes.width,dyeRes.height,rgba.internalFormat,rgba.format,texType,filtering);
        else dye = resizeDoubleFBO(dye,dyeRes.width,dyeRes.height,rgba.internalFormat,rgba.format,texType,filtering);
        if (!velocity) velocity = createDoubleFBO(simRes.width,simRes.height,rg.internalFormat,rg.format,texType,filtering);
        else velocity = resizeDoubleFBO(velocity,simRes.width,simRes.height,rg.internalFormat,rg.format,texType,filtering);
        divergence = createFBO(simRes.width,simRes.height,r.internalFormat,r.format,texType,gl.NEAREST);
        curl = createFBO(simRes.width,simRes.height,r.internalFormat,r.format,texType,gl.NEAREST);
        pressure = createDoubleFBO(simRes.width,simRes.height,r.internalFormat,r.format,texType,gl.NEAREST);
    }

    function getResolution(res) {
        let ar = gl.drawingBufferWidth / gl.drawingBufferHeight;
        if (ar < 1) ar = 1/ar;
        const min = Math.round(res), max = Math.round(res*ar);
        return gl.drawingBufferWidth > gl.drawingBufferHeight ? {width:max,height:min} : {width:min,height:max};
    }
    function scaleByPixelRatio(input) { return Math.floor(input * (window.devicePixelRatio || 1)); }
    function hashCode(s) { let h=0; for(let i=0;i<s.length;i++){h=(h<<5)-h+s.charCodeAt(i);h|=0;} return h; }
    // 水墨画配色：浓墨、淡墨、焦墨、宿墨、暖褐、冷青灰
    const INK_PALETTE = [
        { r: 0.06, g: 0.05, b: 0.04 },  // 浓墨（近黑，微暖）
        { r: 0.10, g: 0.08, b: 0.06 },  // 重墨（深褐黑）
        { r: 0.14, g: 0.12, b: 0.10 },  // 中墨（暖灰褐）
        { r: 0.08, g: 0.09, b: 0.12 },  // 冷墨（青灰调）
        { r: 0.18, g: 0.15, b: 0.11 },  // 淡墨（浅赭）
        { r: 0.05, g: 0.06, b: 0.07 },  // 宿墨（冷青黑）
        { r: 0.12, g: 0.09, b: 0.06 },  // 焦墨（枯笔褐）
    ];

    function hexToRGB(hex) {
        let v = hex.replace('#',''); if(v.length===3) v=v[0]+v[0]+v[1]+v[1]+v[2]+v[2];
        return { r: parseInt(v.slice(0,2),16)/255, g: parseInt(v.slice(2,4),16)/255, b: parseInt(v.slice(4,6),16)/255 };
    }
    // 每次取色：从水墨调色盘中随机选一个基底色，再叠加微小随机偏移模拟墨色浓淡不均
    function generateColor() {
        const base = INK_PALETTE[Math.floor(Math.random() * INK_PALETTE.length)];
        const jitter = () => (Math.random() - 0.5) * 0.03;
        return {
            r: Math.max(0, base.r + jitter()),
            g: Math.max(0, base.g + jitter()),
            b: Math.max(0, base.b + jitter())
        };
    }
    function correctRadius(r) { let ar = canvas.width/canvas.height; if(ar>1) r*=ar; return r; }
    function correctDeltaX(d) { let ar=canvas.width/canvas.height; if(ar<1) d*=ar; return d; }
    function correctDeltaY(d) { let ar=canvas.width/canvas.height; if(ar>1) d/=ar; return d; }

    function splat(x, y, dx, dy, color) {
        splatProgram.bind();
        gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0));
        gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width/canvas.height);
        gl.uniform2f(splatProgram.uniforms.point, x, y);
        gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0.0);
        gl.uniform1f(splatProgram.uniforms.radius, correctRadius(config.SPLAT_RADIUS/100));
        blit(velocity.write); velocity.swap();
        gl.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0));
        gl.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b);
        blit(dye.write); dye.swap();
    }
    function splatPointer(p) {
        // 每次移动都重新取色，模拟毛笔蘸墨的浓淡变化
        p.color = generateColor();
        // 根据速度调整墨色浓度：快笔淡、慢笔浓（飞白效果）
        const speed = Math.sqrt(p.deltaX * p.deltaX + p.deltaY * p.deltaY);
        const intensity = Math.max(0.4, 1.0 - speed * 8);
        const c = { r: p.color.r * intensity, g: p.color.g * intensity, b: p.color.b * intensity };
        splat(p.texcoordX, p.texcoordY, p.deltaX*config.SPLAT_FORCE, p.deltaY*config.SPLAT_FORCE, c);
    }
    function clickSplat(p) {
        // 点击时产生浓墨溅射（焦墨效果），叠加多层深浅
        const c1 = generateColor();
        c1.r *= 2.5; c1.g *= 2.5; c1.b *= 2.5;
        splat(p.texcoordX, p.texcoordY, 8*(Math.random()-0.5), 25*(Math.random()-0.5), c1);
        // 第二层：偏移的淡墨飞溅
        const c2 = generateColor();
        c2.r *= 1.2; c2.g *= 1.2; c2.b *= 1.2;
        const ox = (Math.random()-0.5)*0.02, oy = (Math.random()-0.5)*0.02;
        splat(p.texcoordX+ox, p.texcoordY+oy, 15*(Math.random()-0.5), 20*(Math.random()-0.5), c2);
    }

    let lastUpdateTime = Date.now();
    function updateFrame() {
        const dt = Math.min((Date.now()-lastUpdateTime)/1000, 0.016666);
        lastUpdateTime = Date.now();
        const w = scaleByPixelRatio(canvas.clientWidth), h = scaleByPixelRatio(canvas.clientHeight);
        if (canvas.width !== w || canvas.height !== h) { canvas.width=w; canvas.height=h; initFramebuffers(); }
        pointers.forEach(p => { if(p.moved) { p.moved=false; splatPointer(p); } });

        gl.disable(gl.BLEND);
        curlProgram.bind();
        gl.uniform2f(curlProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0)); blit(curl);

        vorticityProgram.bind();
        gl.uniform2f(vorticityProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0));
        gl.uniform1i(vorticityProgram.uniforms.uCurl, curl.attach(1));
        gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL);
        gl.uniform1f(vorticityProgram.uniforms.dt, dt); blit(velocity.write); velocity.swap();

        divergenceProgram.bind();
        gl.uniform2f(divergenceProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0)); blit(divergence);

        clearProgram.bind();
        gl.uniform1i(clearProgram.uniforms.uTexture, pressure.read.attach(0));
        gl.uniform1f(clearProgram.uniforms.value, config.PRESSURE); blit(pressure.write); pressure.swap();

        pressureProgram.bind();
        gl.uniform2f(pressureProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence.attach(0));
        for (let i=0; i<config.PRESSURE_ITERATIONS; i++) { gl.uniform1i(pressureProgram.uniforms.uPressure, pressure.read.attach(1)); blit(pressure.write); pressure.swap(); }

        gradienSubtractProgram.bind();
        gl.uniform2f(gradienSubtractProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(gradienSubtractProgram.uniforms.uPressure, pressure.read.attach(0));
        gl.uniform1i(gradienSubtractProgram.uniforms.uVelocity, velocity.read.attach(1));
        blit(velocity.write); velocity.swap();

        advectionProgram.bind();
        gl.uniform2f(advectionProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        if (!ext.supportLinearFiltering) gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
        const vId = velocity.read.attach(0);
        gl.uniform1i(advectionProgram.uniforms.uVelocity, vId);
        gl.uniform1i(advectionProgram.uniforms.uSource, vId);
        gl.uniform1f(advectionProgram.uniforms.dt, dt);
        gl.uniform1f(advectionProgram.uniforms.dissipation, config.VELOCITY_DISSIPATION);
        blit(velocity.write); velocity.swap();

        if (!ext.supportLinearFiltering) gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
        gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
        gl.uniform1i(advectionProgram.uniforms.uSource, dye.read.attach(1));
        gl.uniform1f(advectionProgram.uniforms.dissipation, config.DENSITY_DISSIPATION);
        blit(dye.write); dye.swap();

        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.enable(gl.BLEND);
        displayMaterial.bind();
        if (config.SHADING) gl.uniform2f(displayMaterial.uniforms.texelSize, 1/gl.drawingBufferWidth, 1/gl.drawingBufferHeight);
        gl.uniform1i(displayMaterial.uniforms.uTexture, dye.read.attach(0));
        blit(null);

        requestAnimationFrame(updateFrame);
    }

    // 事件处理
    let firstMove = true;
    function handleMouseDown(e) {
        const p = pointers[0], px = scaleByPixelRatio(e.clientX), py = scaleByPixelRatio(e.clientY);
        p.id=-1; p.down=true; p.moved=false;
        p.texcoordX=px/canvas.width; p.texcoordY=1-py/canvas.height;
        p.prevTexcoordX=p.texcoordX; p.prevTexcoordY=p.texcoordY;
        p.deltaX=0; p.deltaY=0; p.color=generateColor();
        clickSplat(p);
    }
    function handleMouseMove(e) {
        const p = pointers[0], px = scaleByPixelRatio(e.clientX), py = scaleByPixelRatio(e.clientY);
        p.prevTexcoordX=p.texcoordX; p.prevTexcoordY=p.texcoordY;
        p.texcoordX=px/canvas.width; p.texcoordY=1-py/canvas.height;
        p.deltaX=correctDeltaX(p.texcoordX-p.prevTexcoordX); p.deltaY=correctDeltaY(p.texcoordY-p.prevTexcoordY);
        p.moved = Math.abs(p.deltaX)>0 || Math.abs(p.deltaY)>0;
        if (firstMove) { p.color=generateColor(); firstMove=false; }
    }
    function handleTouchStart(e) {
        for (const t of e.targetTouches) {
            const p = pointers[0], px = scaleByPixelRatio(t.clientX), py = scaleByPixelRatio(t.clientY);
            p.down=true; p.texcoordX=px/canvas.width; p.texcoordY=1-py/canvas.height;
            p.prevTexcoordX=p.texcoordX; p.prevTexcoordY=p.texcoordY; p.deltaX=0; p.deltaY=0; p.color=generateColor();
        }
    }
    function handleTouchMove(e) {
        const touches = e.targetTouches || e.changedTouches;
        for (const t of touches) {
            const p = pointers[0], px = scaleByPixelRatio(t.clientX), py = scaleByPixelRatio(t.clientY);
            p.prevTexcoordX=p.texcoordX; p.prevTexcoordY=p.texcoordY;
            p.texcoordX=px/canvas.width; p.texcoordY=1-py/canvas.height;
            p.deltaX=correctDeltaX(p.texcoordX-p.prevTexcoordX); p.deltaY=correctDeltaY(p.texcoordY-p.prevTexcoordY);
            p.moved=true;
        }
    }
    function handleTouchEnd(e) { for (const t of e.changedTouches) pointers[0].down=false; }

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove, false);
    window.addEventListener('touchend', handleTouchEnd);

    updateKeywords();
    initFramebuffers();
    requestAnimationFrame(updateFrame);

    function updateKeywords() {
        const kw = []; if (config.SHADING) kw.push('SHADING');
        displayMaterial.setKeywords(kw);
    }
}
if ('requestIdleCallback' in window) {
    requestIdleCallback(initFluidInk, { timeout: 3000 });
} else {
    setTimeout(initFluidInk, 2000);
}
