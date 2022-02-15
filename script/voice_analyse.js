

// クロスブラウザ定義
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;


//変数定義
const beforeStorageTime = 1.0;                  //収録開始前保存する時間
const afterStorageTime = 5.0;                   //収録開始後保存する時間上限

//時間系
let startTime;
let audioTime;


//音源保存用変数
let localMediaStream = null;
let localScriptProcessor = null;
let audioContext;                               //オーディオコンテキスト格納変数
let bufferSize = 1024;                          //音源データ用バッファサイズ
let bufferData = new Float32Array(bufferSize);  //音源データ用バッファ

let audioData = [];                             //バッファデータをPushしていくオブジェクト
let spectrums;                                  //周波数ごとのデータを保存する配列
let spectrumPeak;                               //周波数のピークの値
let N_spectrumPeak;                             //周波数のピークの値(正規化)
let volume;                                     //周波数のピークの値
let N_volume;                                   //周波数のピークの値(正規化)
let timeDomainArray;                            //時間領域ごとのデータを保存する配列
let audioDeltaTime;                             //オーディオ処理ごとのデルタタイム用変数

//状態管理
let isCollecting = false;                       //収音中
let isRecording = false;                        //収録中
let isPlaying = false;                          //再生中

//描画スイッチ
let isDrawRealTime = false;


//キャンバス要カラーマップ作製
const colorMap = generateColorMap({ r: 0, g: 0, b: 255 }, { r: 0, g: 255, b: 0 });

// キャンバス
//リアルタイム描画側
let canvasTimeline;
let canvasFrequency;
let canvasTimeDomain;
let canvasSpectrogram;
let canvas_S_Context;
//再生中描画する側
let A_canvasFrequency;
let A_canvasTimeDomain;
let A_canvasSpectrogram;
let A_canvas_S_Context;

let realTimeCanvas;

let audioAnalyser;


let dataIndex = 0;              //再生中dataListを順に見るためのIndex

let playingData = {};
let fsDivN;                     //周波数分解能(何ヘルツおきに点を配置するか) 

let startCollectingTime = 0;
let recTime = 0;

let animationBeforeTime = -1;
let animationCurrentTime = 0;
let drawDeltaTime = 0;
let audioLastTime = -1;

let data = {};
let frameData = {};
let dataList = [];
let raw = {
    PCM: [],            //(floatの配列)
    frequency: [],      //(Uintの配列)
    timeDomain: [],     //(Uintの配列)
    volume: 0.0,        //(float)
    pitch: 0.0,         //(float)
    sharpness: 0.0,     //(float)
    roughness: 0.0,     //(float)
};
let visual = {               //ビジュアル用に正規化
    volume: 0.0,        //(float)     【0－1】
    pitch: 0.0,         //(float)     【0－1】
    sharpness: 0.0,     //(float)     【0－1】
    roughness: 0.0,     //(float)     【0－1】     
};


// const getCanvases = () => {
//     canvasFrequency = document.querySelector('#CanvasRealTime');
//     canvasTimeline = document.querySelector('#canvasTimeline');    
//     canvasTimeDomain = document.querySelector('#canvasTimeDomain');
//     canvasSpectrogram = document.querySelector('#canvasSpectrogram');


//     canvas_S_Context = canvasSpectrogram.getContext('2d');
//     canvas_S_Context.fillStyle = colorMap[0];
//     canvas_S_Context.fillRect(0, 0, canvasSpectrogram.width, canvasSpectrogram.height);

//     A_canvasFrequency = document.querySelector('#CanvasRecMovie');
//     A_canvasTimeDomain = document.querySelector('#A_canvasTimeDomain');
//     A_canvasSpectrogram = document.querySelector('#A_canvasSpectrogram');
//     A_canvas_S_Context = A_canvasSpectrogram.getContext('2d');
//     A_canvas_S_Context.fillStyle = colorMap[0];
//     A_canvas_S_Context.fillRect(0, 0, A_canvasSpectrogram.width, A_canvasSpectrogram.height);
// };


//解析開始

const medias = {
    audio: true,
    video: false
};


const getPrepareRec = () => {
    if (typeof isRecording !== 'undefined') {
        playingData = {};
        return true;
    } else {
        return false;
    }
};
const startRecording = (
    {
        onReady = () => { },
        onProcess = () => { },
        onComplete = () => { },
    } = {}
) => {
    onRecCB.onProcess = onProcess;
    //console.log("startRecorging");
    if (!isRecording) {
        isRecording = true;
        deleteDataList();
        recTime = 0;
        isPlaying = false;

        //現在時刻，sampleRate，fsdivN，をDataに入れる．
        data.time = new Date();
        data.samplingRate = audioContext.sampleRate;
        data.fsDivN = fsDivN;
        console.log("data:     " + data.time);
    }
};

const stopRecording = () => {
    if (isRecording) {
        isRecording = false;
        startCollectingTime = 0;                             //時間をリセット
        data.dataList = dataList;
        archiveData(data);
        console.log("stopRecording");
        recTime = 0;
    }
}

const deleteDataList = () => {
    // playingData["dataList"] = [];
    // dataList = [];
}

//dataをJsonにする
const archiveData = (_data) => {
    let jsonData = JSON.stringify(_data);
    //exportText("jsonData.json",jsonData);
    createJsonDataFormat();
    decordeJsonDataList(jsonData);
    jsonData = {};
}

//受けとったJsonデータをオブジェクトにへんかんする．
const decordeJsonDataList = (jsonData) => {
    console.log("jsonData" + jsonData);
    playingData = JSON.parse(jsonData);
    //console.log("playingData[time]: " + playingData["time"]);
}


//再生ボタンを押下したときに実行される関数．
const playDataList = (_canvas) => {
    if (!isRecording) {
        if (!isPlaying) {
            isPlaying = true;
            dataIndex = -1;
            animateCanvases(_canvas);
        }
    } else {
        return;
    }
}

//再生ボタンを押下したときに実行される関数．
const stopDataList = () => {
    if (!isRecording) {
        if (isPlaying) {
            isPlaying = false;
            dataIndex = -1;
            //animateCanvases();
        }
    } else {
        return;
    }
}

// 録音バッファ作成（録音中自動で繰り返し呼び出される）
const onAudioProcess = (e) => {
    if (audioLastTime < 0) {
        audioLastTime = audioContext.currentTime;
        return;
    }
    if (!isCollecting) {
        return;
    }
    // 音声のバッファを作成，インプットデータを保存
    let input = e.inputBuffer.getChannelData(0);    //PCMデータ：信号の強度が格納されている.
    bufferData = new Float32Array(input);
    audioData.push(bufferData);                     //オーディオデータにバッファデータを積んでいく

    // FFT
    analyseVoice();
};


const startCollecting = () => {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    console.log("startCollecting");
    // サンプルレートを保持しておく
    isCollecting = true;
    const promise = navigator.mediaDevices.getUserMedia(medias);

    promise.then(sucsess)
    //.then(error);

    function sucsess(stream) {       //メディアアクセス要求が承認されたときに呼ばれる関数
        // 音声入力関連のノードの設定

        localMediaStream = stream;
        let scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);
        localScriptProcessor = scriptProcessor;
        let mediastreamsource = audioContext.createMediaStreamSource(stream);
        mediastreamsource.connect(scriptProcessor);
        scriptProcessor.onaudioprocess = onAudioProcess;
        scriptProcessor.connect(audioContext.destination);

        // 音声解析関連のノードの設定
        audioAnalyser = audioContext.createAnalyser();
        audioAnalyser.fftSize = 2048;
        //frequencyData = new Uint8Array(audioAnalyser.frequencyBinCount);
        //timeDomainData = new Uint8Array(audioAnalyser.fftSize);
        mediastreamsource.connect(audioAnalyser);
    };
    // function error(e) {
    //     alert(e);
    //     console.log(e);
    // };

    createJsonDataFormat();
    //addButtonEvent();
};



const createJsonDataFormat = () => {
    data = {
        time: "20220124195600",         //(String)
        samplingRate: 48000,            //(int)
        fsDivN: 0,                      //(float)
        dataList: [                     //(オブジェクトの配列)
            {
                deltaTime: 0,           //(float)
                raw: {
                    PCM: [],            //(floatの配列)
                    frequency: [],      //(Uintの配列)
                    timeDomain: [],     //(Uintの配列)
                    volume: 0.0,        //(float)
                    pitch: 0.0,         //(float)
                    sharpness: 0.0,     //(float)
                    roughness: 0.0,     //(float)
                },
                visual: {               //ビジュアル用に正規化
                    volume: 0.0,        //(float)     【0－1】
                    pitch: 0.0,         //(float)     【0－1】
                    sharpness: 0.0,     //(float)     【0－1】
                    roughness: 0.0,     //(float)     【0－1】     
                }
            }
        ],//rawDataList
    }

}

//音の生データ，FFTデータを1回の解析ごとに保存していく処理．
const createFrameDataObj = () => {

    //ビジュアル要データオブジェクトにデータを格納
    frameData = {};
    frameData.deltaTime = audioDeltaTime;

    raw = {};
    raw.PCM = Object.values(bufferData);
    raw.timeDomain = Object.values(timeDomainArray);
    //console.log("raw.timeDomain" + raw.timeDomain);

    raw.frequency = Object.values(spectrums);
    raw.pitch = spectrumPeak;
    raw.volume = volume;

    visual = {};
    visual.pitch = N_spectrumPeak;
    visual.volume = N_volume;

    frameData.raw = raw;
    frameData.visual = visual;
    createData();
}

//解析データをリストに積んでいく処理
const createData = () => {
    dataList.push(frameData);
    startCollectingTime += frameData.deltaTime;
    shiftFrameDataObjList();
    data.dataList = dataList;
}

//1秒分のデータが保存されたらリストからシフトしていく処理
const shiftFrameDataObjList = () => {
    if (startCollectingTime >= beforeStorageTime) {
        if (!isRecording) {
            dataList.shift();
        }
    }
    console.log("dataList.length" + dataList.length);
}


let realTimeCB = {};
let onRecCB = {};

//解析用処理
const analyseVoice = () => {
    fsDivN = audioContext.sampleRate / audioAnalyser.fftSize;           //周波数分解能

    //デルタタイムの算出
    calcAudioDeltaTime();

    let tracks = localMediaStream.getTracks();
    for (let i = 0; i < tracks.length; i++) {

        let constraints = tracks[i].getConstraints()

        // 音声トラックの制約
        if (tracks[i].kind == 'audio') {
        }
    }

    spectrums = new Uint8Array(audioAnalyser.frequencyBinCount);        //周波数領域の振幅データ格納用配列を生成
    audioAnalyser.getByteFrequencyData(spectrums);                      //周波数領域の振幅データを配列に格納：一瞬の値

    //timeDomainArray = new Float32Array(audioAnalyser.fftSize);        //時間領域の振幅データ格納用配列を生成
    timeDomainArray = new Uint8Array(audioAnalyser.fftSize);            //時間領域の振幅データ格納用配列を生成

    audioAnalyser.getByteTimeDomainData(timeDomainArray);               //時間領域の振幅データを配列に格納    

    createFrameDataObj();

    let dataIndex = data["dataList"].length - 1;
    console.log("dataIndex" + dataIndex);
    calcFrequencyPeak(data, dataIndex);

    countRecTime(audioDeltaTime,onRecCB);

    drawGraphs(realTimeCanvas, dataIndex, realTimeCB);
    judgeRecTime(afterStorageTime);
}
//オーディオ用のデルタ時間を計算
const calcAudioDeltaTime = () => {
    audioDeltaTime = audioContext.currentTime - audioLastTime;
    audioLastTime = audioContext.currentTime;
}

//リアルタイム描画開始用のスイッチ

const switchRealTime = (_canvas, {
    onReady = () => { },
    onProcess = () => { },
    onComplete = () => { },
}) => {
    realTimeCB.onReady = onReady;
    realTimeCB.onProcess = onProcess;
    realTimeCB.onComplete = onComplete;

    if (isDrawRealTime == false) {
        isDrawRealTime = true;
        console.log("isDrawRealTime" + isDrawRealTime);
        setTargetCanvas(_canvas);

    }
    else if (isDrawRealTime == true) {
        isDrawRealTime = false;
        console.log("isDrawRealTime" + isDrawRealTime);
    }
}

const setTargetCanvas = (_canvas) => {
    realTimeCanvas = _canvas;
}

const drawGraphs = (_canvas, _dataIndex, _realTimeCB) => {
    if (_canvas != null) {
        console.log("drawGraphs");
        if (isDrawRealTime == true) {


            drawSpectCanvas(data, _dataIndex, _canvas);
            _realTimeCB.onProcess(isDrawRealTime);
            console.log("isDrawRealTime:    " + isDrawRealTime)
        }
        else {
            _realTimeCB.onProcess(isDrawRealTime);

        }
    } else {
        console.log("not drawGraphs");
        return;
    }
}



//収録時間を計算
const countRecTime = (_deltaTime,_onRecCB) => {
    if (isRecording == true) {
        recTime += _deltaTime;
        _onRecCB.onProcess(recTime);
        console.log("recTime" + recTime);
    }
    else {
        return;
    }
}

//収録時間が上限に達したら収録を停止
const judgeRecTime = (_afterAtorageTime) => {
    if (recTime >= _afterAtorageTime) {
        console.log("recTime >= afterAtorageTime");
        stopRecording();
        recTime = 0;
    }
    else {
        return;
    }
}

const deletePlayingData = () => {
    if (Object.keys(playingData).length > 0) {
        if (isPlaying == true) {
            isPlaying = false;
        }
        playingData = {};
    }
}

// const getPlayingData = () => {
//     console.log("getPlayingData");
//     if (Object.keys(playingData).length > 0) {
//         numPlayingData = 1;
//         thumbnail = "thumbnail.png";
//     } else {
//         numPlayingData = 0;
//         thumbnail = "none";
//     }
// }

const getNumPlayingData = () => {
    let numPlayingData = -1;
    if (Object.keys(playingData).length > 0) {
        numPlayingData = 1;

        // thumbnail = "thumbnail.png";
    } else {
        numPlayingData = 0;
        // thumbnail = "none";
    }
    console.log("numPlayingData" + numPlayingData);
    return numPlayingData;
};
const getThumbnail = () => {
    let thumbnail = "";
    if (Object.keys(playingData).length > 0) {
        //numPlayingData = 1;
        thumbnail = "thumbnail.png";
    } else {
        // numPlayingData = 0;
        thumbnail = "none";
    }
    console.log("thumbnail :" + thumbnail);
    return thumbnail;
};



//アニメーション再生・ループ
const animateCanvases = (_canvas) => {
    let data = playingData;
    if (isPlaying) {
        if (dataIndex == -1) {
            dataIndex = 0;
            startTime = performance.now() / 1000;
            audioTime = data["dataList"][dataIndex].deltaTime;
        }

        let drawTime = (performance.now() / 1000) - startTime;

        //描画対象のデータのインデックスを次に進める条件
        if (audioTime <= drawTime) {
            let Time = audioTime;
            let processIndex = dataIndex;

            for (let i = dataIndex; i < data["dataList"].length - 1; i++) {
                Time += data["dataList"][i].deltaTime;

                //描画対象のデータのインデックスを決定する条件
                if (drawTime <= Time) {
                    processIndex = i;
                    break;
                }
            }
            dataIndex = processIndex;

            drawSpectCanvas(data, dataIndex, _canvas);
            //drawTimeDomainCanvas(data, dataIndex, A_canvasTimeDomain);
            //drawSpectrogram(data, dataIndex, A_canvasSpectrogram);


            dataIndex += 1;
            //ループする条件
            if (data["dataList"].length - 1 < dataIndex) {
                dataIndex = -1;
                console.log("loop");
                requestAnimationFrame(() => { animateCanvases(_canvas) });
                return;
            }
            audioTime = Time;
        }
    }
    else {
        return;
    }
    requestAnimationFrame(() => { animateCanvases(_canvas) });
}



//スペクトラムを描画
const drawSpectCanvas = (_data, _index, _canvas) => {
    let targetCanvas = _canvas;
    let targetCanvasContext = _canvas.getContext('2d');
    targetCanvasContext.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    targetCanvasContext.beginPath();


    let rawData = _data["dataList"][_index]["raw"];         //描画処理する対象
    let targetSpectDataList = rawData["frequency"];         //描画処理する対象の中の周波数データリスト

    for (let i = 0, len = targetSpectDataList.length; i < len; i++) {
        //canvasにおさまるように線を描画
        let x = (i / len) * targetCanvas.width;
        let y = (1 - (targetSpectDataList[i] / 255)) * targetCanvas.height;
        if (i === 0) {
            targetCanvasContext.moveTo(x, y);
        } else {
            targetCanvasContext.lineTo(x, y);
        }
        let f = Math.floor(i * fsDivN);                                     // index -> frequency;

        if ((f % 500) === 0) {                                              // 500 Hz単位にy軸の線とラベル出力
            let text = (f < 1000) ? (f + ' Hz') : ((f / 1000) + ' kHz');
            targetCanvasContext.fillRect(x, 0, 1, targetCanvas.height);     // Draw grid (X)
            targetCanvasContext.fillText(text, x, targetCanvas.height);     // Draw text (X)
        }
    }
    targetCanvasContext.stroke();

    // x軸の線とラベル出力
    let textYs = ['1.00', '0.50', '0.00'];
    for (var i = 0, len = textYs.length; i < len; i++) {
        let text = textYs[i];
        let gy = (1 - parseFloat(text)) * targetCanvas.height;
        // Draw grid (Y)
        targetCanvasContext.fillRect(0, gy, targetCanvas.width, 1);
        // Draw text (Y)
        targetCanvasContext.fillText(text, 0, gy);
    }
}

//波形データを描画
const drawTimeDomainCanvas = (_data, _index, _canvas) => {
    let targetCanvas = _canvas;
    let targetCanvasContext = _canvas.getContext('2d');
    targetCanvasContext.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    targetCanvasContext.beginPath();

    //描画処理する対象のvisData
    let rawData = _data["dataList"][_index]["raw"];

    //visDataの中の時間領域データリスト
    let targetTimeDomainDataList = rawData["timeDomain"];
    console.log(targetTimeDomainDataList);

    for (var i = 0, len = targetTimeDomainDataList.length; i < len; i++) {
        //canvasにおさまるように線を描画
        let x = (i / len) * targetCanvas.width;
        let y = (1 - (targetTimeDomainDataList[i] / 255)) * targetCanvas.height;
        if (i === 0) {
            targetCanvasContext.moveTo(x, y);
            console.log("x:    " + x);
            console.log("y:    " + y);
        } else {
            targetCanvasContext.lineTo(x, y);
        }
        var f = Math.floor(i * fsDivN);  // index -> frequency;
    }
    targetCanvasContext.stroke();
}

//スペクトログラムを描画
const drawSpectrogram = (_data, _index, _canvas) => {
    let targetCanvas = _canvas;
    let targetCanvasContext = _canvas.getContext('2d');
    //targetCanvasContext.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

    targetCanvasContext.beginPath();

    targetCanvasContext.drawImage(_canvas, -1, 0);

    //描画処理する対象のvisData
    let rawData = _data["dataList"][_index]["raw"];
    //visDataの中の周波数データリスト
    let targetSpectDataList = rawData["frequency"];

    let maxSpectrumIndex = targetSpectDataList.indexOf(Math.max(...targetSpectDataList));
    console.log("maxSpectrumIndex:          " + maxSpectrumIndex);
    console.log("maxSpectrumIndex.spectrum:          " + targetSpectDataList[maxSpectrumIndex]);


    for (let i = 0; i < targetCanvas.height; i++) {
        // 描画色指定
        if (i < targetSpectDataList.length) {
            targetCanvasContext.fillStyle = colorMap[targetSpectDataList[i]];
        } else {
            targetCanvasContext.fillStyle = colorMap[0];
        }
        if (i == maxSpectrumIndex) {
            targetCanvasContext.fillStyle = "rgb(255,0,0)";
            targetCanvasContext.fillRect(targetCanvas.width - 1, targetCanvas.height - 1 - i, 2, 2);
        } else {
            targetCanvasContext.fillRect(targetCanvas.width - 1, targetCanvas.height - 1 - i, 1, 1);
        }
    }
}

//周波数ピークを計算
const calcFrequencyPeak = (_data, _index) => {
    let rawData = _data["dataList"][_index]["raw"];
    let requencyList = rawData["frequency"];
    let spectrumPeakIndex = requencyList.indexOf(Math.max(...requencyList));
    spectrumPeak = fsDivN * spectrumPeakIndex;
    N_spectrumPeak = spectrumPeak / (audioContext.sampleRate / 2);

}


//振幅のピークを計算
const getDBPeak = (_dataList) => {
    let peak = -100;
    for (let i = 0, len = _dataList.length; i < len; i++) {
        const sample = _dataList[i];
        if (sample > peak) {
            peak = sample;
            volume = peak;
            N_volume = peak / 255;
        }
    }
    return peak;
}

const bars = [];
const drawRectangle = (_data, _index, _canvas) => {
    const ctx = _canvas.getContext('2d');
    ctx.clearRect(0, 0, _canvas.width, _canvas.height);
    ctx.beginPath();

    let rawData = _data["dataList"][_index]["raw"];
    let timeDomainList = rawData["timeDomain"];
    let peak = getDBPeak(timeDomainList);

    let barWidth = 2;
    //let x = canvas.width / dataList.length;
    let barHeight = (1 - (peak / 255)) * _canvas.height;
    ctx.fillStyle = 'rgb(0, 0, 0)';

    //ctx.fillRect(_canvas.width / 2, _canvas.height / 2, barWidth, -((_canvas.height / 2) - barHeight));

    let color = 'rgb(0, 0, 0)';
    if (isRecording) {
        color = 'rgb(0, 255, 0)';
    } else {
        color = 'rgb(0, 0, 0)';
    }

    let velocity = 1;

    console.log(color);
    pushBar(_canvas.width, _canvas.height / 2, barWidth, -((_canvas.height / 2) - barHeight), velocity, color);
    pushBar(_canvas.width, _canvas.height / 2, barWidth, ((_canvas.height / 2) - barHeight), velocity, color);

    bars.forEach((element) => element.move());
    bars.forEach((element) => element.render(ctx));
    bars.forEach((element) => {
        if (element.x < 0 - barWidth) {
            bars.shift();
        }
    });
    console.log("bars.length :   " + bars.length);
    console.log("y : " + barHeight);
}



const pushBar = (x, y, w, h, velocity, color) => {
    bars.push(new Rectangle(x, y, w, h, velocity, color));
}


class Rectangle {
    constructor(x, y, width, height, velocity, color) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.velocityX = velocity; // この速度で横に移動する。]
        this.color = color;
    }

    move() {
        this.x -= this.velocityX;
    }

    render(context) {
        context.beginPath();
        context.fillStyle = this.color; // 青色

        //context.fillStyle = 'rgb(0, 0, 0)'; // 青色
        context.rect(this.x, this.y, this.width, this.height);
        context.fill();
    }
}


// □■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■
/**
 * 周波数強度と色のマッピングの作成
 * @param {{r: Number, g: Number, b: Number}[]} dark - スペクトログラムの暗部色
 * @param {{r: Number, g: Number, b: Number}[]} light - スペクトログラムの明部色
 * @returns {String[]} - スタイルシート色設定文字列の配列
 */
// □■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■□■
function generateColorMap(dark, light) {
    const result = [];

    for (let i = 0; i < 256; i++) {
        let rate = i / (256 - 1);
        rate = rate * rate;

        let r, g, b;
        if (rate < 0.33) {
            const coef = (rate - 0) / (0.33 - 0);
            r = 0 + dark.r * coef;
            g = 0 + dark.g * coef;
            b = 0 + dark.b * coef;
        } else if (rate < 0.66) {
            const coef = (rate - 0.33) / (0.66 - 0.33);
            r = dark.r * (1 - coef) + light.r * coef;
            g = dark.g * (1 - coef) + light.g * coef;
            b = dark.b * (1 - coef) + light.b * coef;
        } else {
            const coef = (rate - 0.66) / (1 - 0.66);
            r = light.r * (1 - coef) + 255 * coef;
            g = light.g * (1 - coef) + 255 * coef;
            b = light.b * (1 - coef) + 255 * coef;
        }

        // 計算したRGB値をCSSの<color>データ型に変換
        result[i] = 'rgb(' + r + ', ' + g + ', ' + b + ')';
    }
    return result;
}

const exportText = (filename, value) => {
    let blob = new Blob([value], { type: "text/plan" });
    let link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
};


// 解析終了
const endRecording = function () {
    isCollecting = false;
    //audioDataをサーバに送信するなど終了処理
};