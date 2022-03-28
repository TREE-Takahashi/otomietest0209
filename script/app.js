

//◆ app.js
const micOn = ({
    onReady = () => { },
    onComplete = () => { }
} = {}) => {
    //マイクをONにする処理  
    startCollecting({ onReady, onComplete });
}

// drawRealTime(_canvas, { onReady, onProcess, onComplete });
// play(_canvas, { onReady, onProcess, onComplete });

const drawRealTime = (_canvas, _canvasTL, _canvasPB, {
    onReady = () => { },
    onProcess = () => { },
    onComplete = () => { },
} = {}) => {

    //リアルタイム描画する処理
    switchRealTime(_canvas, _canvasTL, { onReady, onProcess, onComplete });
    canvasPB = _canvasPB;
    canvasPBCtx = canvasPB.getContext("2d");
}

const getArchive = (_canvas, {
    onReady = () => { },
    getNum = () => { },
    getImage = () => { },
    onComplete = () => { },
} = {}) => {

    //収録データを取得する処理
    if (playingData !== null) {
        onReady(true);
        getNum(getNumPlayingData());
        if (thumbnail !== null) {
            getImage(thumbnail);
        }
        onComplete(true);
    }
}

const initRec = ({
    onReady = () => { },
    onComplete = () => { },
} = {}) => {
    initPlayingData({ onReady, onComplete });
}


const recording = ({
    onReady = () => { },
    onProcess = () => { },
    onComplete = () => { },
} = {}) => {
    //収録データを取得する処理
    startRecording({ onReady, onProcess, onComplete });

}

const stopRec = (_canvas, {
    onReady = () => { },
    onComplete = () => { },
    getRecTime = () => { },
}) => {
    stopRecording(_canvas, { onReady, onComplete });
    getRecTime(Date.now());

}

const play = (_canvas, {
    onReady = () => { },
    onProcess = () => { },
    onComplete = () => { },
}) => {

    playDataList(_canvas, { onReady, onProcess, onComplete });
}


const stopPlaying = ({
    onReady = () => { },
    onComplete = () => { },
}) => {
    //再生停止する処理
    stopDataList({ onReady, onComplete });
}

const restartPlaying = ({
    onReady = () => { },
    onComplete = () => { },
}) => {
    //再生停止する処理
    restartDataList({ onReady, onComplete });


}

const deleteData = ({
    onReady = () => { },
    onComplete = () => { },
}) => {
    deletePlayingData({ onReady, onComplete });
}

