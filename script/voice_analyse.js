// クロスブラウザ定義
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

const beforeStorageTime = 1.0;                  //収録開始前保存する時間
const afterStorageTime = 5.0;                   //収録開始後保存する時間上限

const pitchMax = 4000.0;                        //周波数クリッピング上限
const pitchMin = 27.0;                          //周波数クリッピング下限

//時間系
let startPlayTime = 0;
let startRecTime = 0;
let stopRecTime = 0;

let playBarWidth;
let playBarHeadPos;

//音源保存用変数
// let localMediaStream = null;
// let localScriptProcessor = null;
let audioCtx;                                   //オーディオコンテキスト格納変数
const bufferSize = 1024;                          //音源データ用バッファサイズ
let bufferData;                                 //音源データ用バッファ

let playAudioCtx;                               //再生用オーディオコンテキスト

let spectrums;                                  //周波数ごとのデータを保存する配列
let timeDomainArray;                            //時間領域ごとのデータを保存する配列

let sharpness = 0;

//状態管理
let isCollecting = false;                       //収音中
let isRecording = false;                        //収録中
let isPlaying = false;                          //再生中

//描画スイッチ
let isDrawRealTime = false;

let audioAnalyser;

let dataIndex = 0;                              //再生中dataListを順に見るためのIndex
let playingData = {};                           //再生用データ
let fsDivN;                                     //周波数分解能(何ヘルツおきに点を配置するか)

let startCollectingTime = 0;
let recTime = 0;

let audioLastTime = -1;

let data = {};
let dataList = [];

let thumbnail = null;

let playDeltaTime;
let progressBarContainer = [];

//app.jsからのコールバック一時保存用
let drawRealTimeCB = {};
let recordingCB = {};

let canvasTL;
let canvasTLCtx;
let canvasPB;
let canvasPBCtx;

//タイムライン描画用のパラメーター
let bars = [];
let playBars = [];
const dulation = 4;
const margin = 30;
const pd = 2;
const pw = 1;
const ph = 2;
const otomieVisual_Rec = new OtomieVisual();


let sampleArea = null
window.addEventListener("load", () => {
    sampleArea = document.querySelector('#sampleArea');
})


const startCollecting = (_micOnCB = {}) => {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    debugLog("startCollecting");
    // サンプルレートを保持しておく
    isCollecting = true;
    const promise = navigator.mediaDevices.getUserMedia(
        {
            audio: {
                sampleRate: { ideal: 48000 },
            },
            video: false
        }
    );

    promise.then(sucsess)
    .then(error);

    function sucsess(stream) {       //メディアアクセス要求が承認されたときに呼ばれる関数
        // 音声入力関連のノードの設定
        // localMediaStream = stream;
        let scriptProcessor = audioCtx.createScriptProcessor(bufferSize, 1, 1);
        // localScriptProcessor = scriptProcessor;
        let mediastreamsource = audioCtx.createMediaStreamSource(stream);
        mediastreamsource.connect(scriptProcessor);

        // 音声解析関連のノードの設定
        audioAnalyser = audioCtx.createAnalyser();
        audioAnalyser.fftSize = 2048;
        fsDivN = audioCtx.sampleRate / audioAnalyser.fftSize;           //周波数分解能

        scriptProcessor.onaudioprocess = onAudioProcess;

        scriptProcessor.connect(audioCtx.destination);

        //frequencyData = new Uint8Array(audioAnalyser.frequencyBinCount);
        //timeDomainData = new Uint8Array(audioAnalyser.fftSize);
        mediastreamsource.connect(audioAnalyser);

    };
    function error(e) {
        debugLog(e);
    };

    createJsonDataFormat();

    _micOnCB.onReady(true);
};

// 録音バッファ作成（録音中自動で繰り返し呼び出される）
const onAudioProcess = (e) => {
    if (audioLastTime < 0) {
        audioLastTime = audioCtx.currentTime;
        spectrums = new Uint8Array(audioAnalyser.frequencyBinCount);        //周波数領域の振幅データ格納用配列を生成
        timeDomainArray = new Uint8Array(audioAnalyser.fftSize);            //時間領域の振幅データ格納用配列を生成
        return;
    }
    if (!isCollecting) {
        return;
    }
    let input = e.inputBuffer.getChannelData(0);    //PCMデータ：信号の強度が格納されている.
    bufferData = new Float32Array(input);
    analyseVoice(spectrums, timeDomainArray);
    sampleArea.innerHTML = ((performance.memory.usedJSHeapSize) / 1000000).toFixed(0) + "MBytes";
};

//解析用処理
const analyseVoice = (_spectrums, _timeDomainArray) => {
    // fsDivN = audioCtx.sampleRate / audioAnalyser.fftSize;           //周波数分解能

    let audioDeltaTime = audioCtx.currentTime - audioLastTime;
    audioLastTime = audioCtx.currentTime;
    // let tracks = localMediaStream.getTracks();
    // for (let i = 0; i < tracks.length; i++) {

    //     let constraints = tracks[i].getConstraints()

    //     // 音声トラックの制約
    //     if (tracks[i].kind == 'audio') {
    //     }
    // }


    audioAnalyser.getByteFrequencyData(_spectrums);                      //周波数領域の振幅データを配列に格納：一瞬の値
    audioAnalyser.getByteTimeDomainData(_timeDomainArray);               //時間領域の振幅データを配列に格納
    let frameDataObj = createFrameDataObj(bufferData, _spectrums, _timeDomainArray, audioDeltaTime);                            //1フレーム分のデータ生成
    createData(frameDataObj);
    let dataIndex = data["dataList"].length - 1;

    drawRTGraphic(frameDataObj, drawRealTimeCB);
    drawRectangle(data, dataIndex, canvasTL);
    countRecTime(audioDeltaTime, recordingCB);
    judgeRecTime(recordingCB);
    frameDataObj = null;

}

//dataをJsonにする
const createJsonData = (_data) => {
    let jsonData = JSON.stringify(_data);
    return jsonData;
}

//受けとったJsonデータをオブジェクトにへんかんする．
const decordeJsonDataList = (_jsonData) => {
    playingData = JSON.parse(_jsonData);
    _jsonData = null;
}


const prepareRec = (_initRecCB) => {
    playingData = null;
    _initRecCB.onReady(true);
    _initRecCB.onComplete(true);
};

const startRecording = (_recordingCB) => {
    //debugLog("startRecorging");
    if (!isRecording) {
        startRecTime = performance.now() - (beforeStorageTime * 1000);
        recTime = 0;

        //現在時刻，sampleRate，fsdivN，をDataに入れる．
        data.time = new Date();
        data.samplingRate = audioCtx.sampleRate;
        data.fsDivN = fsDivN;

        //収録開始時のサムネイル取得
        let frameData = data["dataList"][data["dataList"].length - 1]["visual"];
        thumbnail = otomieVisual.takeScreenShot(frameData);

        //再生用のインデックスをリセット
        dataIndex = -1;

        _recordingCB.onReady(true);
        recordingCB = _recordingCB;
        isRecording = true;
        isPlaying = false;
        //recordingCB.onComplete(true);
    }
};

let PCMData;
const stopRecording = (_canvas, _stopRecCB) => {
    if (isRecording) {
        if (_canvas.hasChildNodes() == false) {
            otomieVisual_Rec.setup(_canvas, 1024, 1024);
        }
        isRecording = false;
        startCollectingTime = 0;                             //時間をリセット

        stopRecTime = performance.now();
        data.dataList = dataList;

        dataList = [];
        recTime = 0;
        let jsonData = {};
        jsonData = createJsonData(data);
        createJsonDataFormat();
        decordeJsonDataList(jsonData);

        initBars();
        //再生用のオーディオコンテキストを作る．
        playAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        showPlayBars(canvasPB);

        PCMData = getPCMData(playingData);

        _stopRecCB.onReady(true);
        _stopRecCB.onComplete(true);

    }
}

const initCanvasPB = (_canvasPB) => {
    canvasPB = _canvasPB;
    canvasPBCtx = canvasPB.getContext("2d");
}

//再生ボタンを押下したときに実行される関数．
const playDataList = (_canvas, callback) => {
    if (!isRecording) {
        if (playingData) {
            if (!isPlaying) {
                isPlaying = true;


                //◇収録データの再生を開始
                if (playAudioCtx.state !== "suspended") {
                    dataIndex = -1;
                    debugLog("playAudioCtx state", playAudioCtx.state);
                    console.log(PCMData);
                    playPCMData(PCMData);
                }
                else {
                    debugLog("playAudioCtx.resume");
                    debugLog("playAudioCtx", playAudioCtx);
                    playAudioCtx.resume();
                }

                otomieVisual_Rec.play();
                animateCanvases(_canvas, canvasPB, callback);
                callback.onReady(true);
            }
        }
    } else {
        return;
    }
}

const showPlayBars = (_canvas) => {
    playBars = playBars.filter(element => (element != ""));
    playBarWidth = playBars[playBars.length - 1].x - playBars[0].x;
    let canvasPB = _canvas;
    let canvasPBCtx = canvasPB.getContext("2d");
    let startPoint = _canvas.width - margin;
    let endPoint = margin;
    let timeLineCanvasWidth = startPoint - endPoint;
    let playBarsCenter = playBarWidth / 2;
    let timeLineCvsCenter = timeLineCanvasWidth / 2;
    let substitute = playBarsCenter - timeLineCvsCenter;
    //キャンバスの幅を算出→キャンバスの真ん中の値を算出
    //playBars真ん中―キャンバスの真ん中の値算出
    //playBarsの全要素を差分うごかす。

    canvasPBCtx.clearRect(0, 0, canvasPB.width, canvasPB.height);
    playBars.forEach((element) => {
        element.stop();
        element.x = element.x + substitute;
        element.render(canvasPBCtx);
    });

    // ctxTimeLine.clearRect(0, 0, CanvasWaveFormRec.width, CanvasWaveFormRec.height);
    playBarHeadPos = playBars[0].x;

}



const initBars = () => {
    let _bars = bars;
    for (let i = 0; i < _bars.length; i++) {
        playBars[i] = _bars[i];
    }
    _bars = null;
    playBars = playBars.filter((element) => {
        if (element.time >= startRecTime && element.time <= stopRecTime) {
            return true;
        }
    })
    canvasTLCtx.clearRect(0, 0, canvasTL.width, canvasTL.height);
    bars.splice(0);
    pushBar(canvasTL.width - margin, canvasTL.height / 2, 0, 0, getBarVelocity(), "rgb(0,0,0)", performance.now());
}

const playPCMData = (PCMdata) => {
    let _PCMdata = PCMdata
    let playDataSource = playAudioCtx.createBufferSource();
    // let PCMdata = getPCMData(playingData);
    let audioBuffer = playAudioCtx.createBuffer(1, _PCMdata.length, audioCtx.sampleRate);
    let gainNode = playAudioCtx.createGain();
    playDataSource.connect(gainNode);
    gainNode.gain.value = 3.4;
    audioBuffer.getChannelData(0).set(_PCMdata);
    playDataSource.buffer = audioBuffer;
    playDataSource.loop = false;                   //. ループ再生するか？
    playDataSource.loopStart = 0;                  //. オーディオ開始位置（秒単位）
    playDataSource.loopEnd = audioBuffer.duration; //. オーディオ終了位置（秒単位）
    playDataSource.playbackRate.value = 1.0;       //. 再生速度＆ピッチ
    // playDataSource.connect(playAudioCtx.destination);
    gainNode.connect(playAudioCtx.destination);
    playDataSource.start(0);
}



//収録データからPCMをgetする．
const getPCMData = (_playingData) => {
    let PCMData = [];
    let result = [];
    for (let i = 0; i < _playingData["dataList"].length - 1; i++) {
        PCMData.push(_playingData["dataList"][i]["raw"]["PCM"]);
    }
    PCMData.forEach(element => {
        result = result.concat(Object.values(element));
    });
    return result;
}


//再生ボタンを押下したときに実行される関数．
const stopDataList = (_stopPlayingCB) => {
    if (!isRecording) {
        if (isPlaying) {
            isPlaying = false;
            // dataIndex = -1;
            playAudioCtx.suspend();
            otomieVisual_Rec.stop();
            //◇収録データの再生を停止
            _stopPlayingCB.onReady(true);
            _stopPlayingCB.onComplete(true);
        }
    } else {
        return;
    }
}



const restartDataList = (_restartPlayingCB) => {
    if (!isRecording) {
        debugLog("restartDataList");
        isPlaying = false;
        dataIndex = -1;
        playAudioCtx.suspend();
        otomieVisual_Rec.stop();
        canvasPBCtx.clearRect(0, 0, canvasPB.width, canvasPB.height);
        playBars.forEach((element) => {
            // element.color = "rgb(0,0,0)";
            element.render(canvasPBCtx);
        });
        // progressBarContainer[0].render(canvasPBCtx);
        // progressBarContainer[0].x = (0 * playBarWidth) + playBarHeadPos;

        _restartPlayingCB.onReady(true);
        _restartPlayingCB.onComplete(true);
    } else {
        return;
    }
}

const createJsonDataFormat = () => {
    data = {
        time: "20220124195600",         //(String)
        samplingRate: 48000,            //(int)
        fsDivN: 0,                      //(float)
        dataList: [                     //(オブジェクトの配列)
            {
                deltaTime: 0,           //(float)
                timeStamp: 0,
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
                    hue: 0.0,
                    saturation: 0.0,
                    brightness: 0.0,
                    objectCount: 0.0,
                    objectShape: 0.0,
                    speed: 0.0,
                }
            }
        ],
    }
}

//1フレーム描画するためのデータを作る処理
const createFrameDataObj = (bufferData, spectrums, timeDomainArray, audioDeltaTime) => {

    let frameData = {};
    frameData.deltaTime = audioDeltaTime;
    frameData.timeStamp = performance.now();

    let raw = {};
    let visual = {};
    let frequency = Object.values(spectrums);
    let frequencyPeak = calcFrequencyPeak(frequency);
    let volumePeak = calcVolumePeak(timeDomainArray);
    let sharpness = calcSharpness(frequency);
    let roughness = 0;


    raw.PCM = Object.values(bufferData);
    raw.timeDomain = Object.values(timeDomainArray);
    raw.frequency = frequency;
    raw.pitch = frequencyPeak;
    raw.volume = volumePeak;

    // sharpness = Math.min(pitchMax, Math.max(sharpness, pitchMin));
    // sharpness = (sharpness - pitchMin) / (pitchMax - pitchMin);
    raw.sharpness = sharpness;
    raw.roughness = 0;



    visual.hue = 0;
    visual.saturation = 0;
    visual.brightness = 0;
    visual.objectCount = 0;
    visual.objectShape = 0;
    visual.speed = 0;

    // visual.pitch = N_spectrumPeak;

    let pitch = Math.min(pitchMax, Math.max(frequencyPeak, pitchMin));   //クリッピング
    pitch = (frequencyPeak - pitchMin) / (pitchMax - pitchMin);      //正規化
    sharpness = Math.min(pitchMax, Math.max(sharpness, pitchMin));

    sharpness = (sharpness - pitchMin) / (pitchMax - pitchMin);

    let volume = volumePeak / 255;

    visual.hue = calcHue(sharpness);
    visual.saturation = volumePeak / 255;
    visual.brightness = pitch;
    visual.objectCount = calcObjectCount(pitch, volume);
    visual.objectCount = pitch;
    visual.objectShape = pitch;
    visual.speed = pitch * 0.1;

    frameData.raw = raw;
    frameData.visual = visual;

    raw = null;
    visual = null;
    frequency = null;
    frequencyPeak = null;
    volumePeak = null;
    roughness = null;

    return frameData;

}

const calcHue = (_sharpness) => {
    let hue = 360 * (Math.abs(_sharpness - 0.5) * 2) / 360;
    return hue;
}

const calcObjectCount = (_pitch, _volume) => {
    let rate = (_pitch + -1 * _volume + 1) * 0.5;
    return rate;
}

//1フレーム描画用のデータをpushしていく処理
const createData = (_frameData) => {
    dataList.push(_frameData);
    startCollectingTime += _frameData.deltaTime;

    //1秒分のデータが保存されたらリストからシフトしていく処理
    if (startCollectingTime >= beforeStorageTime) {
        if (!isRecording) {
            dataList.shift();
        }
    }
    data.dataList = dataList;

}


//リアルタイム描画開始用のスイッチ
const switchRealTime = (_canvas, _canvasTL, _drawRealTimeCB) => {
    drawRealTimeCB = _drawRealTimeCB;

    if (isDrawRealTime == false) {

        isDrawRealTime = true;
        canvasTL = _canvasTL;
        canvasTLCtx = canvasTL.getContext("2d");
        pushBar(canvasTL.width - margin, canvasTL.height / 2, 0, 0, getBarVelocity(), 'rgb(0, 0, 0)', performance.now());

        drawEndBar();
        drawRealTimeCB.onReady(true);
        //◇リアルタイム描画開始処理
    }
    else if (isDrawRealTime == true) {
        isDrawRealTime = false;
    }
}

const drawRTGraphic = (_frameData, _drawRealTimeCB) => {
    if (isDrawRealTime == true) {

        if (!isPlaying) {

            otomieVisual.updateSoundData(_frameData["visual"]);
            _drawRealTimeCB.onProcess(isDrawRealTime);
        } else {
            _drawRealTimeCB.onProcess(isDrawRealTime);
        }
    }
    else {
        return;
    }
}

//収録時間を計算
const countRecTime = (_deltaTime, _recordingCB) => {
    if (isRecording == true) {
        recTime += _deltaTime;
        _recordingCB.onProcess(recTime);
    }
    else {
        return;
    }
}

//収録時間が上限に達したら収録を停止
const judgeRecTime = (_recordingCB) => {
    if (recTime >= afterStorageTime) {
        recTime = 0;
        _recordingCB.onComplete(true);
    }
    else {
        return;
    }
}

const deletePlayingData = (_deleteDataCB) => {
    if (playingData != null) {
        if (isPlaying == true) {
            isPlaying = false;
        }
        playingData = {};
        _deleteDataCB.onReady(true);
        _deleteDataCB.onComplete(true);

    }
}


const getNumPlayingData = () => {
    let numPlayingData = -1;
    if (Object.keys(playingData).length > 0) {
        numPlayingData = 1;

        // thumbnail = "thumbnail.png";
    } else {
        numPlayingData = 0;
        // thumbnail = "none";
    }
    debugLog("numPlayingData" + numPlayingData);
    return numPlayingData;
};



//アニメーション再生・ループ
const animateCanvases = (_canvas, _canvasPB, _callback) => {
    let data = playingData;
    let drawTime;

    if (isPlaying) {
        debugLog("isPlaying", isPlaying);

        if (dataIndex == -1) {
            dataIndex = 0;
            startPlayTime = performance.now() / 1000;
            lastDrawTime = 0;
            playDeltaTime = data["dataList"][dataIndex].deltaTime;

            //プログレスバーを生成．すでにプログレスバーのインスタンスは削除

            progressBarContainer.splice(0);
            progressBarContainer.push(new progressBar(playBarHeadPos, 0, 1, canvasPB.height));
            progressBarContainer[0].render(canvasPBCtx);
        }

        drawTime = (performance.now() / 1000) - startPlayTime;


        //描画対象のデータのインデックスを次に進める条件
        if (playDeltaTime <= drawTime) {
            let audioTotalTime = playDeltaTime;
            let processIndex = dataIndex;

            for (let i = dataIndex; i < data["dataList"].length - 1; i++) {
                audioTotalTime += data["dataList"][i].deltaTime;

                //描画対象のデータのインデックスを決定する条件
                if (drawTime <= audioTotalTime) {
                    processIndex = i;
                    break;
                }
            }
            // dataIndex = processIndex;
            _callback.onProcess(true);

            otomieVisual_Rec.updateSoundData(data["dataList"][dataIndex]["visual"]);

            dataIndex += 1;
            let n_index = dataIndex / (data["dataList"].length - 1);

            progressBarContainer[0].x = (n_index * playBarWidth) + playBarHeadPos;
            canvasPBCtx.clearRect(0, 0, canvasPB.width, canvasPB.height);
            playBars.forEach((element) => {
                // element.color = "rgb(0,0,0)";
                element.render(canvasPBCtx);
            });
            progressBarContainer[0].render(canvasPBCtx);

            //ループする条件
            if (data["dataList"].length - 1 < dataIndex) {
                dataIndex = -1;
                requestAnimationFrame(() => { animateCanvases(_canvas, _canvasPB, _callback) });
                //音声再生もループする．
                playPCMData(PCMData);
                return;
            }
            playDeltaTime = audioTotalTime;
        }
    }
    else {
        return;
    }
    requestAnimationFrame(() => { animateCanvases(_canvas, _canvasPB, _callback) });
}

//周波数ピークを計算
const calcFrequencyPeak = (_spectrums) => {
    let spectrumPeakIndex = _spectrums.indexOf(Math.max(..._spectrums));
    let spectrumPeak = fsDivN * spectrumPeakIndex;
    N_spectrumPeak = spectrumPeak / (audioCtx.sampleRate / 2);
    return spectrumPeak;
}


//振幅のピークを計算
const calcVolumePeak = (_timeDomain) => {
    let peak = -100;
    for (let i = 0, len = _timeDomain.length; i < len; i++) {
        const sample = _timeDomain[i];
        if (sample > peak) {
            peak = sample;
            volumePeak = peak;
            N_volumePeak = peak / 255;
            //volObj = { volume, N_volume };
        }
    }
    return peak;
}
const calcSharpness = (_frequency) => {
    let sharpness;
    let frequencyList = _frequency;
    let bunsi = 0;
    let bumbo = 0;

    frequencyList.forEach((element, index) => {
        bunsi += element * (index + 1);
        bumbo += element;
    })

    sharpness = bunsi / bumbo * fsDivN;
    return sharpness;

}

const getVolumePeak = (_data, _index) => {
    let peak = -100;
    let volume;
    let N_volume;
    let volObj = {};
    for (let i = 0, len = _data["dataList"][_index]["raw"]["timeDomain"].length; i < len; i++) {
        const sample = _data["dataList"][_index]["raw"]["timeDomain"][i];
        if (sample > peak) {
            peak = sample;
            volume = peak;
            N_volume = volume / 255;
            volObj = { volume, N_volume };
        }
    }
    return volObj;
    // return peak;
}
let endBar = [];
const drawEndBar = () => {
    const dashedNum = 20;
    const height = 15;
    const dashedDulation = height + 4;
    const width = 2;
    const leftBarPosX = margin - width;
    for (let i = 0; i < canvasTL.height; i++) {
        endBar.push(new EndBar(leftBarPosX, i * dashedDulation, width, height, "rgb(0,0,0)", 0));
    }
    endBar.push(new EndBar(canvasTL.width - margin, 0, width, canvasTL.height, "rgb(0,0,0)", 0));
};

const getBarVelocity = () => {
    let distance = canvasTL.width - margin - margin;
    let velocity;
    let audioFps = (audioCtx.sampleRate / bufferSize);
    velocity = distance / audioFps / (afterStorageTime + beforeStorageTime);
    return velocity;
}

const drawRectangle = (_data, _index, _canvas) => {
    const ctx = _canvas.getContext('2d');
    ctx.clearRect(0, 0, _canvas.width, _canvas.height);
    ctx.beginPath();

    let peak = getVolumePeak(_data, _index)["volume"];

    let barWidth = 1;
    //let x = canvas.width / dataList.length;
    let barHeight = (1 - (peak / 255)) * _canvas.height;
    ctx.fillStyle = 'rgb(0, 0, 0)';
    const velocity = getBarVelocity();

    //ctx.fillRect(_canvas.width / 2, _canvas.height / 2, barWidth, -((_canvas.height / 2) - barHeight));

    if (isRecording) {
        color = 'rgb(255, 84, 18)';
    } else {
        color = 'rgb(0, 0, 0)';
    }

    let startPoint = _canvas.width - margin;
    let endPoint = margin;

    if (bars[bars.length - 1].x < startPoint - dulation) {
        pushBar(startPoint, _canvas.height / 2, barWidth, ((_canvas.height / 2) - barHeight) * 0.9 + 1, velocity, color, performance.now());
    }

    //収録開始：青→青、新たにpushされるバーはオレンジ
    bars.forEach((element, index, array) => {
        element.move();
        if (!isRecording) {
            if ((performance.now() - element.time) / 1000 < beforeStorageTime) {
                element.color = 'rgb(0, 0, 255)';
            }
            else {
                element.color = 'rgb(0, 0, 0)';
            }
        }
        bars = bars.filter(element => (element.x >= endPoint + barWidth));
        element.render(ctx);
    });
    endBar.forEach((element) => {
        element.color = "rgb(0,0,0)";
        element.render(ctx);
    })
}

const pushBar = (x, y, w, h, velocity, color, time) => {
    bars.push(new Rectangle(x, y + h + pd, pw, ph, velocity, color, time));
    bars.push(new Rectangle(x, y, w, h, velocity, color, time));
    bars.push(new Rectangle(x, y, w, -h, velocity, color, time))
    bars.push(new Rectangle(x, y - h - pd, pw, -ph, velocity, color, time));
}

class progressBar {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.color = "rgb(0,0,0)";
    }
    render(context) {
        // context.clearRect(0,0,cvs.width,cvs.height);
        context.beginPath();
        context.fillStyle = this.color; // 青色
        context.rect(this.x, this.y, this.w, this.h);
        context.fill();
    }
}

class Rectangle {
    constructor(x, y, width, height, velocity, color, time) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.velocityX = velocity; // この速度で横に移動する。]
        this.color = color;
        this.time = time;
    }
    move() {
        this.x -= this.velocityX;
    }
    stop() {
        this.velocityX = 0;
    }
    render(context) {
        context.beginPath();
        context.fillStyle = this.color; // 青色
        //context.fillStyle = 'rgb(0, 0, 0)'; // 青色
        context.rect(this.x, this.y, this.width, this.height);
        context.fill();
    }
}

class EndBar extends Rectangle {
    constructor(x, y, width, height, color) {
        super(x, y, width, height, color);
    }
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
};

const debugLog = (text) => {
    //debugLog(text);
}