// Canvas Text Animation State
let textAnim = {
    active: false,
    startTime: 0,
    words: [],
    currentY: 0,
    targetY: 0,
    totalShiftY: 0,
    blockStartY: 0
};

function playTextSequence() {
    let rawText1 = select('#textInput1').value();
    let rawText2 = select('#textInput2').value();
    
    textAnim.words = [];
    textAnim.active = true;
    textAnim.startTime = millis();
    
    let runningDelay = 0;
    const stagger = 100;
    const linePause = 300;
    let currentLineY = 0;
    
    let fontSize = constrain(width * 0.05, 32, 90); 

    const staticTracking = fontSize * -0.015; 

    function buildTextData(rawText, fontObj) {
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
                    currentLineWords.push(w);
                    currentLineWidth = wWidth;
                } else {
                    if (currentLineWidth + spaceWidth + wWidth > maxWidth) {
                        processLine(currentLineWords, currentLineWidth);
                        currentLineWords = [w];
                        currentLineWidth = wWidth;
                    } else {
                        currentLineWords.push(w);
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

            lineWords.forEach(w => {
                let chars = w.split('');
                let wordObj = {
                    chars: [],
                    startTimeOffset: runningDelay,
                    font: fontObj,
                    isSkandia: fontObj === fontSkandia 
                };
                
                chars.forEach((char, idx) => {
                    let charOffsetX = textWidth(w.substring(0, idx + 1)) - textWidth(char) + (idx * staticTracking); 
                    
                    wordObj.chars.push({
                        char: char,
                        targetX: currentX + charOffsetX,
                        targetY: currentLineY
                    });
                });
                
                let wWidth = textWidth(w) + (Math.max(0, w.length - 1) * staticTracking);
                currentX += wWidth + spaceWidth; 
                textAnim.words.push(wordObj);
                runningDelay += stagger;
            });
            
            currentLineY += fontSize * 1.1; 
        }
    }

    if (rawText1.trim()) buildTextData(rawText1, fontSkandia);
    if (rawText1.trim() && rawText2.trim()) runningDelay += linePause;
    if (rawText2.trim()) buildTextData(rawText2, fontSeason);

    if (textAnim.words.length > 0) {
        let maxOffsetTop = textAnim.words[textAnim.words.length - 1].chars[0].targetY;
        textAnim.totalShiftY = maxOffsetTop;
        textAnim.currentY = textAnim.totalShiftY; 
        textAnim.targetY = textAnim.totalShiftY;
        
        let totalHeight = currentLineY; 
        textAnim.blockStartY = (height - totalHeight) / 2 + (fontSize * 0.8); 
    }
}

function drawTextAnimation() {
    if (!textAnim.active || textAnim.words.length === 0) return;

    let t = millis() - textAnim.startTime;
    let fontSize = constrain(width * 0.05, 32, 90);
    let textColor = color(textHex);

    const dur = 800;            
    const slideDistance = 40;  
    const maxTracking = 5;      

    let lookaheadTime = 200; 
    let targetTime = t + lookaheadTime;
    let upcomingOffset = 0;

    for (let i = 0; i < textAnim.words.length; i++) {
        if (textAnim.words[i].startTimeOffset <= targetTime) {
            upcomingOffset = textAnim.words[i].chars[0].targetY;
        } else {
            break; 
        }
    }

    textAnim.targetY = textAnim.totalShiftY - upcomingOffset;
    
    // --- FASTER SCROLL EASING ---
    // Increased lerp factor from 0.12 to 0.25 for a quicker initial jump that settles smoothly
    textAnim.currentY += (textAnim.targetY - textAnim.currentY) * 0.25;

    push();
    textAlign(LEFT, BASELINE);
    textSize(fontSize);
    noStroke();

    textAnim.words.forEach(word => {
        let wordElapsed = t - word.startTimeOffset;
        
        if (wordElapsed >= 0) {
            let progress = constrain(wordElapsed / dur, 0, 1);
            let eased = 1 - Math.pow(1 - progress, 5); 

            textColor.setAlpha(255);
            fill(textColor);
            textFont(word.font);

            let slideX = slideDistance * (1 - eased);
            let tracking = word.isSkandia ? (maxTracking * 0.7) * (1 - eased) : maxTracking * (1 - eased);

            word.chars.forEach((charObj, idx) => {
                let cx = charObj.targetX + slideX + (idx * tracking);
                let cy = textAnim.blockStartY + charObj.targetY + textAnim.currentY;
                text(charObj.char, cx, cy);
            });
        }
    });
    pop();
}