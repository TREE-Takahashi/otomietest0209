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




//◆ app.js
const micOn = ({
    onReady = () => { },
    onComplete = () => { }
} = {}) => {

    //マイクをONにする処理
    // ・
    // ・
    // ・
    console.log("micOn");


    if (onReady && typeof onReady === "function") {
        console.log("onReady && typeof onReady ");
        onReady(true);
    }
    if (onComplete && typeof onComplete === "function") {
        onComplete(true);
    }
}




const drawRealTime = ({
    onReady = () => { },
    onProcess = () => { },
    onComplete = () => { },
} = {}) => {

    //リアルタイム描画する処理
    // ・
    // ・
    // ・
    console.log("drawRealTime");


    if (onReady && typeof onReady === "function") {
        onReady(true);
    }
    if (onProcess && typeof onProcess === "function") {
        onProcess(true);
    }
    if (onComplete && typeof onComplete === "function") {
        onComplete(true);
    }
}

const getArchive = ({
    onReady = () => { },
    getNum = () => { },
    getImage = () => { },
    onComplete = () => { },
} = {}) => {

    //収録データを取得する処理
    // ・
    // ・
    // ・
    let numImage = 0;
    if (onReady && typeof onReady === "function") {
        onReady(true);
    }
    if (onReady && typeof onReady === "function") {
        getNum(numImage);
    }
    if (onComplete && typeof onComplete === "function") {
        getImage("imageFile");
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

    if (onReady && typeof onReady === "function") {
        onReady(true);
    }
    if (onComplete && typeof onComplete === "function") {
        onComplete(true);
    }
}

const recording = ({
    onReady = () => { },
    onProcess = () => { },
    onComplete = () => { },
} = {}) => {
    //収録データを取得する処理
    // ・
    // ・
    // ・    
    console.log("recording");
    let recordingTime = 0;

    if (onReady && typeof onReady === "function") {
        onReady(true);
    }
    if (onProcess && typeof onProcess === "function") {
        onProcess(recordingTime);
    }
    if (onComplete && typeof onComplete === "function") {
        onComplete(true);
    }
}

const stopRec = ({
    onReady = () => { },
    onComplete = () => { },
}) => {

    //収録停止する処理
    // ・
    // ・
    // ・
    console.log("stopRec");

    if (onReady && typeof onReady === "function") {
        onReady(true);
    }
    if (onComplete && typeof onComplete === "function") {
        onComplete(true);
    }

}

const play = ({
    onReady = () => { },
    onProcess = () => { },
    onComplete = () => { },
}) => {

    //再生する処理
    // ・
    // ・
    // ・
    console.log("play");
    if (onReady && typeof onReady === "function") {
        onReady(true);
    }
    if (onProcess && typeof onProcess === "function") {
        onProcess(true);
    }

    if (onComplete && typeof onComplete === "function") {
        onComplete(true);
    }

}


const stopPlay = ({
    onReady = () => { },
    onComplete = () => { },
}) => {
    //再生停止する処理
    // ・
    // ・
    // ・

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
    if (onReady && typeof onReady === "function") {
        onReady(true);
    }

    if (onComplete && typeof onComplete === "function") {
        onComplete(true);
    }

}