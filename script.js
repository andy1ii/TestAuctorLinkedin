let orbs = [];
let fontSkandia, fontSeason;

// --- BRAND PRESETS ---
const colorPresets = {
    auctorGreen:   { bg: '#E5EFE9', shape: '#005D30', text: '#FFFFFF' },
    auctorOrange:  { bg: '#FCEEE5', shape: '#E85D04', text: '#FFFFFF' },
    auctorBlue:    { bg: '#E5EDF6', shape: '#00509E', text: '#FFFFFF' }, 
    auctorRose:    { bg: '#F9E5EA', shape: '#C1121F', text: '#FFFFFF' },
    auctorYellow:  { bg: '#FDF6E3', shape: '#D4A373', text: '#FFFFFF' },
    auctorGraphite:{ bg: '#EBEBEB', shape: '#403D39', text: '#FFFFFF' }
};

// --- COMPREHENSIVE BRAND PALETTE ---
const brandPalette = [
    '#FFFFFF', '#F8F9FA', '#EBEBEB', '#CED4DA', '#6C757D', '#403D39', '#111111',
    '#E5EFE9', '#C2DFD0', '#88C4A6', '#4DA97C', '#005D30', '#003E20',
    '#FCEEE5', '#F8D3BB', '#F3A36F', '#ED7928', '#E85D04', '#A03D00',
    '#E5EDF6', '#C2D6EE', '#88B5DF', '#4D93CF', '#00509E', '#003366',
    '#F9E5EA', '#F0C2CC', '#E28A9E', '#D3516F', '#C1121F', '#820A13',
    '#FDF6E3', '#F9E9B9', '#F4D685', '#EFBF51', '#D4A373', '#966D42'
];

let bgHex = colorPresets.auctorGreen.bg;
let shapeHex = colorPresets.auctorGreen.shape;
let textHex = colorPresets.auctorGreen.text;

// Radial defaults
let bgInnerHex = '#FFFFFF';
let bgOuterHex = '#005D30';
let shapeInnerHex = '#FFFFFF';
let shapeOuterHex = '#005D30';
let bgSpread = 1.0;
let shapeSpread = 1.0;

let orbSpacing = 1.0;
let orbSize = 1.0;
let blurAmount = 35;
let currentLayout = 'venn';
let orbCount = 3; 
let renderStyle = 'radial'; 

let showText = true;

// --- THE MASTER LOOP CONSTANT ---
// Kept at 10 seconds so the text and master loop remain untouched
const LOOP_DURATION_MS = 10000; 

let customTime = 0;
let lastFrameTime = 0; 
let recordingTotalFrames = 0; 
let pendingRecord = false; // Prevents the stale first frame glitch

let textAnim = {
    active: false,
    startTime: 0,
    words: [],
    totalHeight: 0,
    blockStartY: 0,
    currentY: 0,      
    targetY: 0,       
    totalShiftY: 0,   
    lastT: 0,
    totalLines: 0     
};

function preload() {
    fontSkandia = loadFont('resources/SkandiaSN-Bold.otf');
    fontSeason = loadFont('resources/Season-AuctorDisplay.otf');
}

function setup() {
    let canvas = createCanvas(1920, 1080);
    canvas.id('export-canvas'); 
    canvas.parent('recording-container'); 
    
    // UPSCALE TO 2K/4K: Double pixel density for ultra-crisp internal rendering
    pixelDensity(2); 
    noStroke();

    // CREATE HIDDEN DOWNSCALE CANVAS
    let hiddenCanvas = document.createElement('canvas');
    hiddenCanvas.id = 'hidden-export-canvas';
    hiddenCanvas.width = 1920;
    hiddenCanvas.height = 1080;
    hiddenCanvas.style.display = 'none';
    document.body.appendChild(hiddenCanvas);

    if (typeof FPS !== 'undefined') {
        frameRate(FPS);
    }

    function resizeContainer() {
        let scale = Math.min(windowWidth / 1920, windowHeight / 1080);
        document.getElementById('recording-container').style.setProperty('--scale', scale);
    }
    window.addEventListener('resize', resizeContainer);
    resizeContainer();

    select('#blurSlider').value(blurAmount);
    
    select('#showTextToggle').changed(() => {
        showText = document.getElementById('showTextToggle').checked;
        document.getElementById('textInput1').disabled = !showText;
        document.getElementById('textInput2').disabled = !showText;
        
        customTime = 0;
        lastFrameTime = millis();
        initOrbs();
        if (showText) playTextSequence();
    });

    buildCustomPicker('bgPicker', bgHex, (color) => { bgHex = color; setCustomPreset(); });
    buildCustomPicker('shapePicker', shapeHex, (color) => { shapeHex = color; setCustomPreset(); });
    buildCustomPicker('textPicker', textHex, (color) => { textHex = color; setCustomPreset(); });

    buildCustomPicker('bgInnerPicker', bgInnerHex, (color) => { bgInnerHex = color; setCustomPreset(); });
    buildCustomPicker('bgOuterPicker', bgOuterHex, (color) => { bgOuterHex = color; setCustomPreset(); });
    buildCustomPicker('shapeInnerPicker', shapeInnerHex, (color) => { shapeInnerHex = color; setCustomPreset(); });
    buildCustomPicker('shapeOuterPicker', shapeOuterHex, (color) => { shapeOuterHex = color; setCustomPreset(); });

    document.addEventListener('click', () => {
        document.querySelectorAll('.dropdown-swatches').forEach(d => d.classList.remove('open'));
    });

    function setCustomPreset() { 
        select('#presetSelect').value('custom'); 
        if (showText) playTextSequence(); 
    }

    function updateRadialFromPreset(mode) {
        if (mode === 'custom' || !colorPresets[mode]) return;
        
        let pShape = color(colorPresets[mode].shape);
        
        bgInnerHex = '#FFFFFF';
        shapeInnerHex = '#FFFFFF';
        bgOuterHex = pShape.toString('#rrggbb');
        shapeOuterHex = pShape.toString('#rrggbb');
        
        updatePickerDisplays();
    }

    select('#presetSelect').changed(() => {
        let mode = select('#presetSelect').value();
        if (mode !== 'custom' && colorPresets[mode]) {
            bgHex = colorPresets[mode].bg;
            shapeHex = colorPresets[mode].shape;
            textHex = colorPresets[mode].text || '#FFFFFF';
            
            updateRadialFromPreset(mode);
            updatePickerDisplays();
            if (showText) playTextSequence(); 
        }
    });

    select('#renderStyleSelect').changed(() => {
        renderStyle = select('#renderStyleSelect').value();
        if (renderStyle === 'radial') {
            select('#radial-controls').style('display', 'block');
            select('#flat-controls').style('display', 'none');
        } else {
            select('#radial-controls').style('display', 'none');
            select('#flat-controls').style('display', 'block');
        }
    });

    select('#layoutSelect').changed(() => {
        currentLayout = select('#layoutSelect').value();
        select('#spacingSlider').value(1);
        select('#sizeSlider').value(1);
        select('#blurSlider').value(blurAmount);
        select('#countSlider').value(3);
        
        orbSpacing = 1.0;
        orbSize = 1.0;
        orbCount = 3;
        
        customTime = 0;
        lastFrameTime = millis();
        initOrbs();
        if (showText) playTextSequence();
    });

    select('#btn-replay').mousePressed(() => {
        if (typeof isRecording !== 'undefined' && isRecording) return; 
        if (pendingRecord) return;
        
        customTime = 0;
        lastFrameTime = millis();
        initOrbs();
        if (showText) playTextSequence();
    });
    
    // --- EXPORT LOGIC ---
    select('#btn-record').mousePressed(() => {
        if (typeof isRecording !== 'undefined' && isRecording) return; 
        if (pendingRecord) return; // Prevent double clicks
        
        pendingRecord = true; // Signals the draw loop to prime the first frame

        let btn = document.getElementById('btn-record');
        if (btn) {
            btn.style.setProperty('--progress', '0%');
            btn.innerText = 'Preparing...';
        }
    });
    
    select('#bgSpreadSlider').input(() => bgSpread = parseFloat(select('#bgSpreadSlider').value()) / 100);
    select('#shapeSpreadSlider').input(() => shapeSpread = parseFloat(select('#shapeSpreadSlider').value()) / 100);
    select('#spacingSlider').input(() => orbSpacing = parseFloat(select('#spacingSlider').value()));
    select('#sizeSlider').input(() => orbSize = parseFloat(select('#sizeSlider').value()));
    select('#blurSlider').input(() => blurAmount = parseFloat(select('#blurSlider').value()));
    select('#countSlider').input(() => { orbCount = parseInt(select('#countSlider').value()); initOrbs(); });

    lastFrameTime = millis();

    let presetDropdown = select('#presetSelect');
    if (presetDropdown) presetDropdown.value('auctorGreen');
    updateRadialFromPreset('auctorGreen');

    setTimeout(() => {
        initOrbs();
        if (showText) playTextSequence();
    }, 50);
}

// ... UI Pickers ...
function buildCustomPicker(pickerId, initialColor, callback) {
    let picker = document.getElementById(pickerId);
    if (!picker) return;
    let selectedBox = picker.querySelector('.selected-color');
    let dropdown = picker.querySelector('.dropdown-swatches');
    
    selectedBox.style.background = initialColor;
    selectedBox.addEventListener('click', (e) => {
        e.stopPropagation(); 
        document.querySelectorAll('.dropdown-swatches').forEach(d => {
            if (d !== dropdown) d.classList.remove('open');
        });
        dropdown.classList.toggle('open');
    });
    
    dropdown.innerHTML = ''; 
    brandPalette.forEach(color => {
        let s = document.createElement('div');
        s.className = 'swatch';
        s.style.background = color;
        s.addEventListener('click', (e) => {
            e.stopPropagation(); 
            selectedBox.style.background = color; 
            dropdown.classList.remove('open'); 
            callback(color); 
        });
        dropdown.appendChild(s);
    });
}

function updatePickerDisplays() {
    let bgPicker = document.querySelector('#bgPicker .selected-color');
    let shapePicker = document.querySelector('#shapePicker .selected-color');
    let textPicker = document.querySelector('#textPicker .selected-color');
    let bgInnerPicker = document.querySelector('#bgInnerPicker .selected-color');
    let bgOuterPicker = document.querySelector('#bgOuterPicker .selected-color');
    let shapeInnerPicker = document.querySelector('#shapeInnerPicker .selected-color');
    let shapeOuterPicker = document.querySelector('#shapeOuterPicker .selected-color');
    
    if (bgPicker) bgPicker.style.background = bgHex;
    if (shapePicker) shapePicker.style.background = shapeHex;
    if (textPicker) textPicker.style.background = textHex;
    if (bgInnerPicker) bgInnerPicker.style.background = bgInnerHex;
    if (bgOuterPicker) bgOuterPicker.style.background = bgOuterHex;
    if (shapeInnerPicker) shapeInnerPicker.style.background = shapeInnerHex;
    if (shapeOuterPicker) shapeOuterPicker.style.background = shapeOuterHex;
}

function draw() {
    let currentFPS = (typeof FPS !== 'undefined') ? FPS : 18;

    // --- TIME ORCHESTRATION ---
    if (pendingRecord) {
        // Force the time to zero so the first frame renders perfectly
        customTime = 0;
        initOrbs();
        if (showText) playTextSequence();
    } else if (typeof isRecording !== 'undefined' && isRecording) {
        let framesRecorded = frameCount - recordingStartFrame;
        customTime = framesRecorded * (1000 / currentFPS); 
        
        document.getElementById('main-area').style.opacity = '0.2';
        document.getElementById('controls').style.pointerEvents = 'none';
        document.getElementById('controls').style.opacity = '0.7';
    } else {
        let now = millis();
        let dt = now - lastFrameTime;
        let expectedFrameTime = 1000 / currentFPS;
        if (dt > expectedFrameTime * 2) dt = expectedFrameTime; 
        customTime += dt; 
        
        document.getElementById('main-area').style.opacity = '1';
        document.getElementById('controls').style.pointerEvents = 'auto';
        document.getElementById('controls').style.opacity = '1';
    }
    
    lastFrameTime = millis();
    blendMode(BLEND);

    // --- BACKGROUND RENDER ---
    if (renderStyle === 'radial') {
        let ctx = drawingContext;
        let cx = width / 2;
        let cy = height / 2;
        let maxRadius = Math.max(0.1, dist(0, 0, cx, cy) * bgSpread); 
        let grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius);
        grad.addColorStop(0, bgInnerHex);
        grad.addColorStop(1, bgOuterHex);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    } else {
        background(bgHex);
    }

    blendMode(MULTIPLY);
    drawingContext.filter = `blur(${blurAmount}px)`;

    // --- ORB RENDER ---
    for (let orb of orbs) {
        orb.update();

        if (renderStyle === 'radial') {
            let ctx = drawingContext;
            let cCore = color(shapeInnerHex);
            cCore.setAlpha(180); 
            let cEdge = color(shapeOuterHex);
            cEdge.setAlpha(180); 

            let gradRadius = Math.max(0.1, orb.currentRadius * shapeSpread);
            let grad = ctx.createRadialGradient(orb.currentX, orb.currentY, 0, orb.currentX, orb.currentY, gradRadius);
            grad.addColorStop(0, cCore.toString()); 
            grad.addColorStop(1, cEdge.toString()); 

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(orb.currentX, orb.currentY, orb.currentRadius, 0, TWO_PI);
            ctx.fill(); 
        } else {
            let c = color(shapeHex);
            c.setAlpha(180); 
            fill(c);
            circle(orb.currentX, orb.currentY, orb.currentRadius * 2); 
        }
    }
    
    drawingContext.filter = 'none'; 
    blendMode(BLEND); 

    // --- TEXT RENDER ---
    if (showText) {
        drawTextAnimation();
    }

    // --- EXPORT ORCHESTRATION ---
    if (pendingRecord) {
        // The canvas is now fully painted with the accurate t=0 frame!
        let hiddenCanvas = document.getElementById('hidden-export-canvas');
        if (hiddenCanvas) {
            hiddenCanvas.getContext('2d').drawImage(document.getElementById('export-canvas'), 0, 0, 1920, 1080);
        }

        // Calculate exact frames needed for a flawless loop
        recordingTotalFrames = Math.ceil((LOOP_DURATION_MS / 1000) * currentFPS);

        if (typeof startRecording === 'function') {
            startRecording(); // Start capturing the pristine frame
            recordingStartFrame = frameCount; 
        }
        pendingRecord = false;
        
    } else if (typeof isRecording !== 'undefined' && isRecording) {
        let framesRecorded = frameCount - recordingStartFrame;
        
        // SUPERSAMPLE DOWNSCALING
        let hiddenCanvas = document.getElementById('hidden-export-canvas');
        if (hiddenCanvas) {
            hiddenCanvas.getContext('2d').drawImage(document.getElementById('export-canvas'), 0, 0, 1920, 1080);
        }

        let btn = document.getElementById('btn-record');
        if (btn) {
            let pct = floor((framesRecorded / (recordingTotalFrames - 1)) * 100);
            pct = constrain(pct, 0, 100);
            btn.innerText = `Recording... ${pct}%`;
            btn.style.setProperty('--progress', `${pct}%`);
        }

        // Cut the tape exactly one frame before the loop repeats to prevent stuttering
        if (framesRecorded >= recordingTotalFrames - 1) { 
            if (typeof stopRecording === 'function') {
                stopRecording(); 
            }
        }
    }
}

// ... Animation Logic ...
function playTextSequence() {
    let rawText1 = select('#textInput1').value();
    let rawText2 = select('#textInput2').value();
    
    textAnim.words = [];
    textAnim.active = true;
    textAnim.startTime = customTime;
    textAnim.totalLines = 0; 
    
    let runningDelay = 400; 
    let globalLineIndex = 0; 
    
    const stagger = 100;
    const linePause = 300; 
    let currentLineY = 0;
    
    let fontSize = constrain(width * 0.05, 32, 90); 
    const staticTracking = fontSize * -0.015; 

    function buildTextData(rawText, fontObj) {
        if (!fontObj) return; 
        let paragraphs = rawText.split('\n');
        let isFirstLine = true;
        
        textSize(fontSize);
        textFont(fontObj);
        
        let maxWidth = min(width * 0.8, 1200); 
        let spaceWidth = textWidth(' ') + staticTracking;

        paragraphs.forEach(paraStr => {
            if (paraStr.trim() === '' && paragraphs.length > 1) return; 
            
            let words = paraStr.split(/\s+/).filter(w => w !== '');
            let currentLineWords = [];
            let currentLineWidth = 0;

            words.forEach(w => {
                let wWidth = textWidth(w) + (Math.max(0, w.length - 1) * staticTracking);
                
                if (currentLineWords.length === 0) {
                    currentLineWords.push({text: w, width: wWidth});
                    currentLineWidth = wWidth;
                } else {
                    if (currentLineWidth + spaceWidth + wWidth > maxWidth) {
                        processLine(currentLineWords, currentLineWidth);
                        currentLineWords = [{text: w, width: wWidth}];
                        currentLineWidth = wWidth;
                    } else {
                        currentLineWords.push({text: w, width: wWidth});
                        currentLineWidth += spaceWidth + wWidth;
                    }
                }
            });
            if (currentLineWords.length > 0) {
                processLine(currentLineWords, currentLineWidth);
            }
        });

        function processLine(lineWords, lineWidth) {
            if (!isFirstLine) runningDelay += linePause;
            isFirstLine = false;
            let startX = (width - lineWidth) / 2;
            let currentX = startX;

            lineWords.forEach(wObj => {
                let w = wObj.text;
                let chars = w.split('');
                let wordObj = {
                    chars: [],
                    startTimeOffset: runningDelay,
                    font: fontObj,
                    isSkandia: fontObj === fontSkandia,
                    lineIndex: globalLineIndex 
                };
                
                chars.forEach((char, idx) => {
                    let charOffsetX = textWidth(w.substring(0, idx + 1)) - textWidth(char) + (idx * staticTracking); 
                    wordObj.chars.push({ char: char, targetX: currentX + charOffsetX, targetY: currentLineY });
                });
                
                currentX += wObj.width + spaceWidth; 
                textAnim.words.push(wordObj);
                runningDelay += stagger;
            });
            currentLineY += fontSize * 1.1; 
            globalLineIndex++; 
        }
    }

    if (rawText1.trim()) buildTextData(rawText1, fontSkandia);
    if (rawText1.trim() && rawText2.trim()) runningDelay += linePause;
    if (rawText2.trim()) buildTextData(rawText2, fontSeason);

    if (textAnim.words.length > 0) {
        textAnim.totalLines = globalLineIndex;
        let maxOffsetTop = textAnim.words[textAnim.words.length - 1].chars[0].targetY;
        textAnim.totalShiftY = maxOffsetTop;
        textAnim.currentY = textAnim.totalShiftY; 
        textAnim.targetY = textAnim.totalShiftY;
        textAnim.lastT = 0; 
        textAnim.totalHeight = currentLineY; 
        textAnim.blockStartY = (height - textAnim.totalHeight) / 2 + (fontSize * 0.8); 
    }
}

function drawTextAnimation() {
    if (!textAnim.active || textAnim.words.length === 0) return;

    let TEXT_CYCLE_MS = LOOP_DURATION_MS / 2; 

    let t = customTime % TEXT_CYCLE_MS;
    let fontSize = constrain(width * 0.05, 32, 90);
    let textColor = color(textHex);

    const introDur = 800;            
    const slideDistance = 40;  
    let lookaheadTime = 200; 

    const outroDur = 250;     
    const outroStagger = 120; 
    const maxTracking = 5;      

    let targetTime = t + lookaheadTime;
    let upcomingOffset = 0;

    for (let i = 0; i < textAnim.words.length; i++) {
        if (textAnim.words[i].startTimeOffset <= targetTime) {
            upcomingOffset = textAnim.words[i].chars[0].targetY;
        } else {
            break; 
        }
    }

    if (t < textAnim.lastT) {
        textAnim.currentY = textAnim.totalShiftY;
    }
    textAnim.lastT = t;

    textAnim.targetY = textAnim.totalShiftY - upcomingOffset;
    textAnim.currentY += (textAnim.targetY - textAnim.currentY) * 0.15;

    let maskY = textAnim.blockStartY - fontSize * 1.1; 
    let maskH = textAnim.totalHeight + textAnim.totalShiftY + fontSize * 3;

    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(0, maskY, width, maskH);
    drawingContext.clip();

    push();
    textAlign(LEFT, BASELINE);
    textSize(fontSize);
    noStroke();

    textAnim.words.forEach(word => {
        let introElapsed = t - word.startTimeOffset;
        let introP = constrain(introElapsed / introDur, 0, 1);
        let introEased = 1 - Math.pow(1 - introP, 5); 

        let reverseLineIndex = (textAnim.totalLines - 1) - word.lineIndex;
        let outroBuffer = 1500; 
        let outroStart = TEXT_CYCLE_MS - outroBuffer + (reverseLineIndex * outroStagger); 
        
        let outroElapsed = t - outroStart;
        let outroP = constrain(outroElapsed / outroDur, 0, 1);
        let outroEased = Math.pow(outroP, 4); 

        if (introElapsed >= 0 && outroP < 1) {
            textColor.setAlpha(255);
            fill(textColor);
            textFont(word.font);

            let slideX = slideDistance * (1 - introEased);
            let tracking = word.isSkandia ? (maxTracking * 0.7) * (1 - introEased) : maxTracking * (1 - introEased);
            let maxDrop = fontSize * 0.25; 
            let offsetY = maxDrop * outroEased;

            word.chars.forEach((charObj, idx) => {
                let cx = charObj.targetX + slideX + (idx * tracking);
                let cy = textAnim.blockStartY + charObj.targetY + textAnim.currentY + offsetY;
                text(charObj.char, cx, cy);
            });
        }
    });
    pop();
    drawingContext.restore();
}

function initOrbs() {
    orbs = [];
    for (let i = 0; i < orbCount; i++) {
        orbs.push(new Orb(i));
    }
}

class Orb {
    constructor(index) {
        this.index = index;
        this.baseRadius = random(0.25, 0.4) * max(width, height);
        this.phaseOffset = random(TWO_PI);
        this.randomXOffset = random(-0.35, 0.35);
        this.randomYOffset = random(-0.35, 0.35);

        this.currentX = width / 2;
        this.currentY = height / 2;
        this.currentRadius = this.baseRadius;
    }

    update() {
        let time = (customTime / LOOP_DURATION_MS) * TWO_PI; 
        
        let cx = width / 2;
        let cy = height / 2;
        let scaledBaseRadius = this.baseRadius * orbSize;

        // Amplitudes drastically reduced to create a slow, ambient visual effect over the 10-second loop
        if (currentLayout === 'random') {
            let baseX = cx + (this.randomXOffset * width * orbSpacing);
            let baseY = cy + (this.randomYOffset * height * orbSpacing);
            let slideX = sin(time + this.phaseOffset) * 40 * orbSpacing;
            this.currentX = baseX + slideX;
            this.currentY = baseY;
            this.currentRadius = scaledBaseRadius;

        } else if (currentLayout === 'venn') {
            let angle = (TWO_PI / orbCount) * this.index;
            let spread = ((min(width, height) * 0.2)) * orbSpacing;
            let baseX = cx + cos(angle) * spread;
            let baseY = cy + sin(angle) * spread;
            let slideY = sin(time + this.phaseOffset) * 20 * orbSpacing;
            this.currentX = baseX;
            this.currentY = baseY + slideY;
            this.currentRadius = scaledBaseRadius * 0.8;

        } else if (currentLayout === 'verticalStack') {
            let spread = (this.baseRadius * 0.85) * orbSpacing; 
            let yOffset = 0;
            if (orbCount > 1) yOffset = map(this.index, 0, orbCount - 1, -spread, spread);
            let slideX = sin(time + this.phaseOffset) * 30 * orbSpacing;
            this.currentX = cx + slideX;
            this.currentY = cy + yOffset;
            this.currentRadius = scaledBaseRadius * 0.85;

        } else if (currentLayout === 'horizontalStack') {
            let spread = (this.baseRadius * 1.2) * orbSpacing; 
            let xOffset = 0;
            if (orbCount > 1) xOffset = map(this.index, 0, orbCount - 1, -spread, spread);
            let slideY = sin(time + this.phaseOffset) * 30 * orbSpacing;
            this.currentX = cx + xOffset;
            this.currentY = cy + slideY;
            this.currentRadius = scaledBaseRadius * 0.85;

        } else if (currentLayout === 'concentric') {
            let direction = (this.index % 2 === 0) ? 1 : -1;
            let depthMultiplier = (this.index + 1) / orbCount; 
            let slideX = sin(time + this.phaseOffset) * 40 * orbSpacing * direction * depthMultiplier;
            this.currentX = cx + slideX;
            this.currentY = cy;
            let stagger = 1 - ((this.index % orbCount) * (0.8 / orbCount));
            this.currentRadius = scaledBaseRadius * stagger;
        }
    }
}
