/* ══════════════════════════════════════════════
			   DOM 引用
			   ══════════════════════════════════════════════ */
const stage = document.querySelector('.stage');
const dots = document.querySelectorAll('.dot');
const slideTag = document.querySelector('.slide-tag');
const sumLayer = document.querySelector('.summary-inner');
const hmLayer = document.querySelector('.hm-layer');
const responseLayer = document.querySelector('.response-layer');
const callLayer = document.querySelector('.call-layer');
const themeToggle = document.getElementById('themeToggle');
const timerDisplay = document.getElementById('timerDisplay');
const qaPicker = document.getElementById('qaPicker');
const qaHint = document.getElementById('qaHint');
const pickerGrid = document.getElementById('pickerGrid');

const hourHand = document.querySelector('.hour-hand');
const minuteHand = document.querySelector('.minute-hand');
const secondHand = document.querySelector('.second-hand');

/* ══════════════════════════════════════════════
			   状态变量
			   ══════════════════════════════════════════════ */
const MAX_STATE = 5;
let state = 0;
let sumPhase = 'hm';
let hmPhase = 'hm';
let pickerActive = false;
let timerStarted = false;
let presentationStart = 0;

/* ══════════════════════════════════════════════
			   容器 class 切换
			   ══════════════════════════════════════════════ */
function setStageState(n) {
	for (let i = 0; i <= MAX_STATE; i++) {
		stage.classList.toggle('state-' + i, i === n);
	}
}

/* ══════════════════════════════════════════════
			   TIMER
			   ══════════════════════════════════════════════ */
let timerRaf = null;
let timerZeroing = false;
let timerFrozen = false;

function formatTime(s) {
	if (s < 0) s = 0;
	const m = Math.floor(s / 60);
	const ss = Math.floor(s % 60);
	const ms = Math.floor((s % 1) * 100);
	return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}:${String(ms).padStart(2,'0')}`;
}

function tickTimer() {
	if (state === 4 && hmPhase === 'hm' && !timerZeroing && !timerFrozen && timerStarted) {
		const e = (performance.now() - presentationStart) / 1000;
		timerDisplay.textContent = formatTime(e);
	}
	timerRaf = requestAnimationFrame(tickTimer);
}

function startTimerLoop() {
	if (timerRaf) return;
	timerRaf = requestAnimationFrame(tickTimer);
}

function stopTimerLoop() {
	if (timerRaf) {
		cancelAnimationFrame(timerRaf);
		timerRaf = null;
	}
}

function animateTimerToZero(duration = 800) {
	timerZeroing = true;
	const startValue = Math.max(0, (performance.now() - presentationStart) / 1000);
	const startTime = performance.now();

	function tick() {
		const t = Math.min((performance.now() - startTime) / duration, 1);
		const eased = 1 - Math.pow(1 - t, 3);
		const current = startValue * (1 - eased);
		timerDisplay.textContent = formatTime(Math.max(0, current));

		if (t < 1) {
			requestAnimationFrame(tick);
		} else {
			timerDisplay.textContent = formatTime(0);
			timerZeroing = false;
			timerFrozen = true;
		}
	}
	requestAnimationFrame(tick);
}

/* ══════════════════════════════════════════════
			   CLOCK HANDS
			   ══════════════════════════════════════════════ */
const INIT_HOUR = 305;
const INIT_MINUTE = 60;
const INIT_SECOND = 0;

let baseHour = INIT_HOUR;
let baseMinute = INIT_MINUTE;
let baseSecond = INIT_SECOND;

const SPEED_HOUR = 360 / (12 * 3600);
const SPEED_MINUTE = 360 / 3600;
const SPEED_SECOND = 360 / 60;

let elapsed = 0;
let startTime = 0;
let spinRaf = null;
let isSpinning = false;
let isResetting = false;
let frozen = false;

function updateHands() {
	hourHand.style.transform = `rotate(${baseHour   + elapsed * SPEED_HOUR}deg)`;
	minuteHand.style.transform = `rotate(${baseMinute + elapsed * SPEED_MINUTE}deg)`;
	secondHand.style.transform = `rotate(${baseSecond + elapsed * SPEED_SECOND}deg)`;
}

function spinLoop() {
	if (!isSpinning) return;
	elapsed = (performance.now() - startTime) / 1000;
	updateHands();
	spinRaf = requestAnimationFrame(spinLoop);
}

function startSpin() {
	if (isSpinning || isResetting || frozen) return;
	isSpinning = true;
	startTime = performance.now() - elapsed * 1000;
	spinRaf = requestAnimationFrame(spinLoop);
}

function stopSpin() {
	isSpinning = false;
	if (spinRaf) {
		cancelAnimationFrame(spinRaf);
		spinRaf = null;
	}
}

function animateHandsTo(targetHour, targetMinute, targetSecond, duration, onDone) {
	[hourHand, minuteHand, secondHand].forEach(el => {
		el.style.transition = `transform ${duration}ms cubic-bezier(.45, 0, .15, 1)`;
	});

	hourHand.style.transform = `rotate(${targetHour}deg)`;
	minuteHand.style.transform = `rotate(${targetMinute}deg)`;
	secondHand.style.transform = `rotate(${targetSecond}deg)`;

	setTimeout(() => {
		[hourHand, minuteHand, secondHand].forEach(el => {
			el.style.transition = 'none';
		});
		if (onDone) onDone();
		void hourHand.offsetWidth;
		[hourHand, minuteHand, secondHand].forEach(el => {
			el.style.transition = '';
		});
		isResetting = false;
	}, duration + 30);
}

function snapTo12(duration = 1100) {
	if (isResetting) return;
	stopSpin();
	isResetting = true;
	frozen = false;

	const curHour = baseHour + elapsed * SPEED_HOUR;
	const curMinute = baseMinute + elapsed * SPEED_MINUTE;
	const curSecond = baseSecond + elapsed * SPEED_SECOND;

	function toTwelve(cur) {
		return Math.ceil((cur + 5) / 360) * 360;
	}

	const targetHour = toTwelve(curHour) + 360;
	const targetMinute = toTwelve(curMinute);
	const targetSecond = toTwelve(curSecond);

	animateHandsTo(targetHour, targetMinute, targetSecond, duration, () => {
		baseHour = 0;
		baseMinute = 0;
		baseSecond = 0;
		elapsed = 0;
		updateHands();
		frozen = true;
	});
}

function resetHandsToInit(duration = 1400) {
    // 注意：这里不要写 let baseHour = INIT_HOUR; 直接使用全局变量
    if (isResetting) return;
    stopSpin();
    isResetting = true;
    frozen = false;

    const curHour = baseHour + elapsed * SPEED_HOUR;
    const curMinute = baseMinute + elapsed * SPEED_MINUTE;
    const curSecond = baseSecond + elapsed * SPEED_SECOND;

    function forwardTo(cur, init) {
        // 纯顺时针最短路径
        let delta = ((init - cur) % 360 + 360) % 360;
        return cur + delta;
    }

    const targetHour = forwardTo(curHour, INIT_HOUR);
    const targetMinute = forwardTo(curMinute, INIT_MINUTE);
    const targetSecond = forwardTo(curSecond, INIT_SECOND);

    animateHandsTo(targetHour, targetMinute, targetSecond, duration, () => {
        // 这里修改的是全局变量
        baseHour = INIT_HOUR;
        baseMinute = INIT_MINUTE;
        baseSecond = INIT_SECOND;
        elapsed = 0;
        updateHands();
    });
}

/* ══════════════════════════════════════════════
			   SUM PHASE
			   ══════════════════════════════════════════════ */
function setSumPhase(phase) {
	sumPhase = phase;

	sumLayer.classList.toggle('sumStart', phase !== 'hm');
}

/* ══════════════════════════════════════════════
			   HM PHASE
			   ══════════════════════════════════════════════ */
function setHmPhase(phase) {
	hmPhase = phase;

	hmLayer.classList.toggle('fade-out', phase !== 'hm');
	responseLayer.classList.toggle('visible', phase === 'response');
	callLayer.classList.toggle('visible', phase === 'call');

	if (phase === 'hm') {
		frozen = false;
		timerFrozen = false;
		if (!isSpinning && !isResetting) startSpin();
		if (timerStarted) {
			const e = (performance.now() - presentationStart) / 1000;
			timerDisplay.textContent = formatTime(e);
		}
	}
}

/* ══════════════════════════════════════════════
			   UI
			   ══════════════════════════════════════════════ */
function updateUI() {
	dots.forEach((d, i) => d.classList.toggle('active', i === state));
	slideTag.textContent = String(state + 1).padStart(2, '0') + ' / 06';
}

/* ══════════════════════════════════════════════
			   NAVIGATION
			   ══════════════════════════════════════════════ */
function go(s, phase) {
	const prev = state;
	state = s;
	setStageState(state);

	if (prev === 3 && state !== 3) {
		sumLayer.classList.remove('sumStart');
		sumPhase = 'hm';
	}

	// 离开 P4
	if (prev === 4 && state !== 4) {
		hmLayer.classList.remove('fade-out');
		responseLayer.classList.remove('visible');
		callLayer.classList.remove('visible');
		hmPhase = 'hm';
		stopTimerLoop();
		timerFrozen = false;
	}

	// 进入 P4
	if (state === 4 && prev !== 4) {
		stopTimerLoop();
		frozen = false;
		timerFrozen = false;

		if (phase === 'response' || phase === 'call') {
			baseHour = 0;
			baseMinute = 0;
			baseSecond = 0;
			elapsed = 0;
			updateHands();
			frozen = true;
			timerFrozen = true;
			timerDisplay.textContent = formatTime(0);
			setHmPhase(phase);
		} else {
			if (timerStarted) {
				const e = (performance.now() - presentationStart) / 1000;
				timerDisplay.textContent = formatTime(e);
			}
			startTimerLoop();
			setHmPhase('hm');
		}
	}

	// 进入 P3：开始旋转
	if (state === 3 && prev !== 3) {
		frozen = false;
		if (!isSpinning && !isResetting) startSpin();
	}

	// 回到封面：复位指针
	if (state === 0 && prev !== 0) {
		resetHandsToInit();
	    stopTimerLoop();
	    timerStarted = false;
	    presentationStart = 0;
	    timerZeroing = false;
	    timerFrozen = false;
	    timerDisplay.textContent = formatTime(0);
	}

	// 离开 Q&A：关闭 picker
	if (prev === 5 && state !== 5) {
		qaPicker.classList.remove('active');
		pickerActive = false;
		qaHint.classList.remove('hidden');
	}

	// 首次离开封面：启动计时
	if (prev === 0 && state !== 0 && !timerStarted) {
		timerStarted = true;
		presentationStart = performance.now();
	}

	updateUI();
}

/* ══════════════════════════════════════════════
			   FORWARD / BACK
			   ══════════════════════════════════════════════ */
function advance() {
	if (pickerActive) return;

	if (state === 3) {
		if (sumPhase === 'hm') {
			setSumPhase('placeholder');
			return;
		}
		go(4);
		return;
	}

	if (state === 4) {
		if (hmPhase === 'hm') {
			animateTimerToZero(800);
			snapTo12(1100);
			setHmPhase('response');
			return;
		}
		if (hmPhase === 'response') {
			setHmPhase('call');
			return;
		}
		go(5);
		return;
	}

	if (state === MAX_STATE) {
		if (!pickerActive) {
			pickerActive = true;
			qaPicker.classList.add('active');
			qaHint.classList.add('hidden');
		}
		return;
	}

	if (state < MAX_STATE) {
		go(state + 1);
	} else {
		go(0);
	}
}

function prevStep() {
	if (pickerActive) return;

	if (state === 4) {
		if (hmPhase === 'call') {
			setHmPhase('response');
			return;
		}
		if (hmPhase === 'response') {
			setHmPhase('hm');
			return;
		}
	}

	if (state === 5 && pickerActive) {
		pickerActive = false;
		qaPicker.classList.remove('active');
		qaHint.classList.remove('hidden');
		return;
	}

	go(Math.max(0, state - 1));
}

/* ══════════════════════════════════════════════
			   PICKER
			   ══════════════════════════════════════════════ */
function closePicker() {
	qaPicker.classList.remove('active');
	pickerActive = false;
	qaHint.classList.remove('hidden');
}

pickerGrid.addEventListener('click', (e) => {
	const card = e.target.closest('.picker-card');
	if (!card) return;
	e.stopPropagation();

	const target = parseInt(card.dataset.target, 10);
	const phase = card.dataset.phase || null;

	closePicker();
	go(target, phase);
});

/* 空白点击 → 回 Title */
qaPicker.addEventListener('click', (e) => {
	if (e.target.closest('.picker-card')) return;
	e.stopPropagation();
	closePicker();
	go(0);
});

/* ══════════════════════════════════════════════
			   MOUSE
			   ══════════════════════════════════════════════ */
document.addEventListener('click', () => {
	if (pickerActive) return;
	advance();
});

/* ══════════════════════════════════════════════
			   KEYBOARD / 激光笔
			   ══════════════════════════════════════════════ */
document.addEventListener('keydown', (e) => {
	const k = e.key;

	if (pickerActive) {
		if (k === 'PageDown' || k === 'ArrowDown' || k === ' ' ||
			k === 'Enter' || k === 'ArrowRight' || k === 'n' || k === 'N' ||
			k === 'End') {
			e.preventDefault();
			closePicker();
			go(0);
			return;
		}
		if (k === 'PageUp' || k === 'ArrowUp' || k === 'Escape' ||
			k === 'ArrowLeft' || k === 'Backspace' || k === 'p' || k === 'P') {
			e.preventDefault();
			closePicker();
			return;
		}
		if (k === 'Home') {
			e.preventDefault();
			closePicker();
			go(0);
			return;
		}
		return;
	}

	if (k === 'PageDown' || k === 'ArrowRight' || k === ' ' ||
		k === 'Enter' || k === 'ArrowDown' || k === 'n' || k === 'N') {
		e.preventDefault();
		advance();
		return;
	}

	if (k === 'PageUp' || k === 'ArrowLeft' ||
		k === 'Backspace' || k === 'ArrowUp' || k === 'p' || k === 'P') {
		e.preventDefault();
		prevStep();
		return;
	}

	if (k === 'Home') {
		e.preventDefault();
		go(0);
		return;
	}
	if (k === 'End') {
		e.preventDefault();
		go(5);
		return;
	}
	if (k === 'f' || k === 'F') {
		toggleFullscreen();
	}
});

/* ══════════════════════════════════════════════
			   全屏
			   ══════════════════════════════════════════════ */
function toggleFullscreen() {
	if (!document.fullscreenElement) {
		const el = document.documentElement;
		if (el.requestFullscreen) el.requestFullscreen();
		else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
	} else {
		if (document.exitFullscreen) document.exitFullscreen();
		else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
	}
}

/* ══════════════════════════════════════════════
			   THEME TOGGLE
			   ══════════════════════════════════════════════ */
themeToggle.addEventListener('click', (e) => {
	e.stopPropagation();
	const isLight = document.documentElement.getAttribute('data-theme') === 'light';
	document.documentElement.setAttribute('data-theme', isLight ? 'dark' : 'light');
});
themeToggle.addEventListener('mousedown', (e) => e.stopPropagation());

/* ══════════════════════════════════════════════
			   INIT
			   ══════════════════════════════════════════════ */
updateHands();
go(0);
const params = new URLSearchParams(location.search);
const output = document.getElementById('presenter');

if (params.toString() === '') {
	output.innerHTML = 'Author: Steven Shapin';
} else {
	output.innerHTML = `Presenter: ${params.get('l')} ${params.get('f')} · Author: Steven Shapin`;
}
