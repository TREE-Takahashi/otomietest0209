/**
□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■
◆UIManagere.js

const onReady = (tf) => {
    console.log("onReady");
    if (tf == true) {
        console.log("minOn success");
    }
    else {
        console.log("micOn not sucessed");
    }
}

const micOnTouched = () => {
    micOn({onReady});
}
□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■
 */



// window.addEventListener("load", () => {
//     getCanvases();

//     document.querySelector("#TitleWindow").addEventListener("click", micOn);
//     document.querySelector("#drawRealTime").addEventListener("click", ()=>{drawRealTime(canvasFrequency,{})});
//     console.log("canvasFrequency:   " + canvasFrequency);
//     document.querySelector("#getArchive").addEventListener("click", getArchive);
//     document.querySelector("#initRec").addEventListener("click", initRec);
//     document.querySelector("#recording").addEventListener("click", recording);
//     document.querySelector("#stopRec").addEventListener("click", stopRec);
//     document.querySelector("#play").addEventListener("click", ()=>{play(A_canvasFrequency,{})});
//     document.querySelector("#stopPlay").addEventListener("click", stopPlay);
//     document.querySelector("#deleteData").addEventListener("click", deleteData);

//     //document.querySelector("#ButtonOpenMovie").addEventListener("click", playDataList);

//     console.log("load finish");
// });

//◆ app.js
const micOn = ({
    onReady = () => { },
    onComplete = () => { }
} = {}) => {
    console.log("micON called");

    //マイクをONにする処理
    setCallBack(micOnCB,{onReady,onComplete});
    startCollecting(micOnCB);

    // if (onReady && typeof onReady === "function") {
    //     console.log("onReady && typeof onReady ");
    //     onReady(true);

    // }
    // if (onComplete && typeof onComplete === "function") {
    //     onComplete(true);
    // }
}

// drawRealTime(_canvas, { onReady, onProcess, onComplete });
// play(_canvas, { onReady, onProcess, onComplete });

const drawRealTime = (_canvas, {
    onReady = () => { },
    onProcess = () => { },
    onComplete = () => { },
} = {}) => {

    //リアルタイム描画する処理
    // ・
    // ・
    // ・
    setCallBack(drawReatTimeCB,{onReady,onProcess,onComplete});
    // setCallBack()
    switchRealTime(_canvas,drawReatTimeCB);
    //console.log("drawRealTime:   " + drawRealTime);
    
    // const otimieVisual = new OtomieVisual.OtomieVisual();
    // console.log("otimieVisual",otimieVisual);
    // otimieVisual.init(document.querySelector("#CanvasRealTime"), 640, 640);
    // otimieVisual.render();


    if (onReady && typeof onReady === "function") {
        onReady(true);
    }
    if (onProcess && typeof onProcess === "function") {
        onProcess(isDrawRealTime);

    }
    if (onComplete && typeof onComplete === "function") {
        onComplete(true);
    }
}



const getArchive = (_canvas,{
    onReady = () => { },
    getNum = () => { },
    getImage = () => { },
    onComplete = () => { },
} = {}) => {

    //収録データを取得する処理
    // ・
    // ・
    // ・
    console.log("サムネイル用キャンバスに描画");
    console.log("getArchive");


    if (onReady && typeof onReady === "function") {
        onReady(true);
    }
    if (onReady && typeof onReady === "function") {
        getNum(getNumPlayingData());
    }
    if (onComplete && typeof onComplete === "function") {
        getImage(getThumbnail());
    }
    if (onComplete && typeof onComplete === "function") {
        onComplete(true);
    }
}

const initRec = ({
    onReady = () => { },
    onComplete = () => { },
} = {}) => {

    //収録データを取得する処理
    // ・
    // ・
    // ・
    console.log("initRec");
    setCallBack(initRecCB,{onReady,onComplete});
    prepareRec(initRecCB);

}

let element;
const recording = ({
    onReady = () => { },
    onProcess = () => { },
    onComplete = () => { },
} = {}) => {
    //収録データを取得する処理
    // ・
    // ・
    // ・
    setCallBack(onRecCB,{onReady,onProcess,onComplete});

    //realTimeCB();
    startRecording();
    
    if (onReady && typeof onReady === "function") {
        onReady(true);
    }
    if (onProcess && typeof onProcess === "function") {
        // onProcess(recTime);
        // onProcess(1);
        // onProcess(2);
        // onProcess(3);
        // onProcess(4);
        // onProcess(5);
    }
    if (onComplete && typeof onComplete === "function") {
        onComplete(true);
    }
}




// //UIManager側
// const setRecTime = () => {
//     element = document.querySelector('#recTime');
//     element.value = recTime;
// };

// setInterval(setRecTime, 10);



const stopRec = ({
    onReady = () => { },
    onComplete = () => { },
}) => {

    //収録停止する処理
    // ・
    // ・
    // ・
    stopRecording();
    console.log("stopRec");

    if (onReady && typeof onReady === "function") {
        onReady(true);
    }
    if (onComplete && typeof onComplete === "function") {
        onComplete(true);
    }

}

const play = (_canvas, {
    onReady = () => { },
    onProcess = () => { },
    onComplete = () => { },
}) => {

    //再生する処理
    // ・
    // ・
    // ・
    console.log("play");
    playDataList(_canvas);
    if (onReady && typeof onReady === "function") {
        onReady(true);
    }
    if (onProcess && typeof onProcess === "function") {
        onProcess(isPlaying);
    }

    if (onComplete && typeof onComplete === "function") {
        onComplete(true);
    }

}


const stopPlaying = ({
    onReady = () => { },
    onComplete = () => { },
}) => {
    //再生停止する処理
    // ・
    // ・
    // ・
    stopDataList();
    console.log("stopPlay");
    if (onReady && typeof onReady === "function") {
        onReady(true);
    }

    if (onComplete && typeof onComplete === "function") {
        onComplete(true);
    }
}


const deleteData = ({
    onReady = () => { },
    onComplete = () => { },
}) => {

    //収録データを削除する処理
    // ・
    // ・
    // ・

    console.log("deleteData");
    deletePlayingData();
    if (onReady && typeof onReady === "function") {
        onReady(true);
    }

    if (onComplete && typeof onComplete === "function") {
        onComplete(true);
    }

}