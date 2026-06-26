// Global state variables read by script.js
let mediaRecorder;
let recordedChunks = [];
let isRecording = false;
let recordingStartFrame = 0;

// Export Settings
const FPS = 18; 

// This function is triggered by draw() in script.js once the first frame is perfectly primed
function startRecording() {
    if (isRecording) return; 

    let hiddenCanvas = document.getElementById('hidden-export-canvas');
    
    // 1. Capture the canvas stream at our target FPS
    let stream = hiddenCanvas.captureStream(FPS);
    
    // 2. Use the browser's Native MediaRecorder with an EXTREME Bitrate
    let options = { 
        mimeType: 'video/webm; codecs=vp9',
        videoBitsPerSecond: 25000000 
    };
    
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { 
            mimeType: 'video/webm',
            videoBitsPerSecond: 25000000 
        }; 
    }
    
    mediaRecorder = new MediaRecorder(stream, options);
    recordedChunks = [];

    // Push frame data to the file as it renders
    mediaRecorder.ondataavailable = function(e) {
        if (e.data.size > 0) {
            recordedChunks.push(e.data);
        }
    };

    mediaRecorder.onstop = function() {
        // Compile the WebM video instantly
        let blob = new Blob(recordedChunks, { type: 'video/webm' });
        let url = URL.createObjectURL(blob);
        
        // Trigger automatic browser download
        let a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'Auctor_Animation_1080p_HQ.webm';
        document.body.appendChild(a);
        a.click();
        
        // Clean up memory
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            recordedChunks = [];
        }, 100);

        // Reset the UI button
        let btn = document.getElementById('btn-record');
        if (btn) {
            btn.innerText = 'Start Recording';
            btn.style.setProperty('--progress', '0%');
        }
    };

    mediaRecorder.start();
    isRecording = true;
}

// This function is triggered by draw() in script.js when the final frame is rendered
function stopRecording() {
    if (!isRecording) return;
    isRecording = false;
    
    let btn = document.getElementById('btn-record');
    if (btn) btn.innerText = 'Processing...';

    // Instantly stop the recording! 
    // This cleanly slices the video at the exact frame needed, removing the frozen stutter at the end.
    mediaRecorder.stop();
}