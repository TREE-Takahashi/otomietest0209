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
let startCollectingTime = 0;                    //収録
let recTime = 0;                                //収録時間格納用変数
let audioLastTime = -1;

let playBarWidth;
let playBarHeadPos;

//音源保存用変数
let audioCtx;                                   //オーディオコンテキスト格納変数
const bufferSize = 1024;                          //音源データ用バッファサイズ
let playAudioCtx;                               //再生用オーディオコンテキスト

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

let data = {};
let dataList = [];

let thumbnail = null;

let playDeltaTime;
let progressBarContainer = [];

//app.jsからのコールバック一時保存用
let drawRealTimeCB = {};
let recordingCB = {};

//タイムラインキャンバス
let canvasTL;
let canvasTLCtx;

//再生中プログレスバーキャンバス
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
const otomieVisual_Play = new OtomieVisual();


const startCollecting = (_micOnCB) => {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    isCollecting = true;
    const promise = navigator.mediaDevices.getUserMedia(    //streamを取得する。
        {
            audio: {
                sampleRate: { ideal: 48000 },
            },
            video: false
        }
    );

    promise.then(success);
    // .then(error);

    function success(stream) {       //メディアアクセス要求が承認されたときに呼ばれる関数
        // 音声入力関連のノードの設定
        let scriptProcessor = audioCtx.createScriptProcessor(bufferSize, 1, 1);
        let mediastreamsource = audioCtx.createMediaStreamSource(stream);
        mediastreamsource.connect(scriptProcessor);

        // 音声解析関連のノードの設定
        audioAnalyser = audioCtx.createAnalyser();
        audioAnalyser.fftSize = 2048;
        fsDivN = audioCtx.sampleRate / audioAnalyser.fftSize;

        scriptProcessor.connect(audioCtx.destination);
        mediastreamsource.connect(audioAnalyser);
        createJsonDataFormat();
        scriptProcessor.onaudioprocess = onAudioProcess;
        _micOnCB.onReady(true);
    };
    // function error(e) {
    //     //debugLog(e);
    // };
};

// 録音バッファ作成（収音中自動で繰り返し呼び出される）
const onAudioProcess = (e) => {
    if (audioLastTime < 0) {
        audioLastTime = audioCtx.currentTime;
        return;
    }
    if (!isCollecting) {
        return;
    }
    let input = e.inputBuffer.getChannelData(0);                            //PCMデータ：信号の強度をfloat32Arrayを返す。

    analyseVoice(input);
    delete input;
};

//解析用処理
const analyseVoice = (_bufferData) => {
    let audioDeltaTime = audioCtx.currentTime - audioLastTime;               //デルタタイムを算出
    audioLastTime = audioCtx.currentTime;

    let _spectrums = new Uint8Array(audioAnalyser.frequencyBinCount);        //周波数領域の振幅データ格納用配列を生成
    let _timeDomainArray = new Uint8Array(audioAnalyser.fftSize);            //時間領域の振幅データ格納用配列を生成

    audioAnalyser.getByteFrequencyData(_spectrums);                          //周波数領域の振幅データを配列に格納
    audioAnalyser.getByteTimeDomainData(_timeDomainArray);                   //時間領域の振幅データを配列に格納
    let frameDataObj = createFrameDataObj(_bufferData,
        _spectrums,
        _timeDomainArray,
        audioDeltaTime);                   //1フレーム分のデータ生成

    createData(frameDataObj);   	//1フレーム分のデータを蓄積
    let dataIndex = data["dataList"].length - 1;

    drawRTGraphic(frameDataObj, drawRealTimeCB);    //グラフィック側にデータを渡す処理
    drawRectangle(data, dataIndex, canvasTL);       //タイムラインを表示する処理
    countRecTime(audioDeltaTime, recordingCB);      //収録時間をカウントしていく処理
    judgeRecTime(recordingCB);                      //収録時間が最大に達したかを判断する処理

    delete audioDeltaTime;
    delete _spectrums;
    delete _bufferData;
    delete _timeDomainArray;
    delete frameDataObj;
}

//dataをJsonにする
const createJsonData = (_data) => {
    let jsonData = JSON.stringify(_data);
    return jsonData;
}

//受けとったJsonデータをオブジェクトにへんかんする．
const decordeJsonDataList = (_jsonData) => {
    playingData = JSON.parse(_jsonData);
    // console.log(playingData["dataList"].length);
    delete _jsonData;
}

const initPlayingData = (_initRecCB) => {
    playingData = [];
    _initRecCB.onReady(true);
    _initRecCB.onComplete(true);
};

const startRecording = (_recordingCB) => {
    if (!isRecording) {
        isRecording = true;
        isPlaying = false;
        startRecTime = performance.now() - (beforeStorageTime * 1000);
        recTime = 0;

        //現在時刻，sampleRate，fsdivN，をDataに入れる．
        data.time = new Date();
        data.samplingRate = audioCtx.sampleRate;
        data.fsDivN = fsDivN;

        //再生用のインデックスをリセット
        dataIndex = -1;

        //受け取ったコールバックを外の変数に代入
        recordingCB = _recordingCB;
        recordingCB.onReady(true);
    }
};

let PCMData;
//UI側からの命令で収録をストップする
const stopRecording = (_canvas, _stopRecCB) => {
    if (isRecording) {
        if (_canvas.hasChildNodes() == false) {
            otomieVisual_Play.setup(_canvas, 1024, 1024);
        }
        isRecording = false;                                    //ステータスをfalse
        stopRecTime = performance.now();

        playingData = data;                                     //再生用のデータにコピー

        playAudioCtx = new (window.AudioContext || window.webkitAudioContext)();    //再生用のオーディオコンテキストを作る．
        PCMData = getPCMData(playingData);                      //再生用データから音再生用にPCMデータを取得する

        let frameData = data["dataList"][0]["visual"];          //0フレーム目のフレームデータ取得.
        thumbnail = otomieVisual.takeScreenShot(frameData);     //0フレーム目でのサムネイルを取得.

        startCollectingTime = 0;                                //時間をリセット              
        dataList = [];                                          //データリストをリセット    
        recTime = 0;                                            //収録時間をリセット
        createJsonDataFormat();                                 //蓄積データを初期化
        initTimeLineBars();                                     //画面内のタイムライン表示を削除・再スタートする
        showProgressBars(canvasPB);                             //再生用プログレスバーを表示

        _stopRecCB.onReady(true);
        _stopRecCB.onComplete(true);
    }
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
                    playPCMData(PCMData);
                }
                else {
                    playAudioCtx.resume();
                }
                otomieVisual_Play.play();
                animateCanvases(_canvas, canvasPB, callback);
                callback.onReady(true);
            }
        }
    } else {
        return;
    }
}

//再生用プログレスバーを表示
const showProgressBars = (_canvas) => {
    playBars = playBars.filter(element => (element != ""));
    playBarWidth = playBars[playBars.length - 1].x - playBars[0].x;
    let canvasPB = _canvas;
    let canvasPBCtx = canvasPB.getContext("2d");
    let startPoint = _canvas.width - margin;
    let endPoint = margin;
    let timeLineCanvasWidth = startPoint - endPoint;        //キャンバスの幅を算出
    let playBarsCenter = playBarWidth / 2;                  //→キャンバスの真ん中の値を算出
    let timeLineCvsCenter = timeLineCanvasWidth / 2;        //playBars真ん中の値算出
    let substitute = playBarsCenter - timeLineCvsCenter;    //キャンバスの真ん中の値算出

    canvasPBCtx.clearRect(0, 0, canvasPB.width, canvasPB.height);
    playBars.forEach((element) => {
        element.stop();
        element.x = element.x + substitute;                 //playBarsの全要素を差分うごかす。
        element.render(canvasPBCtx);
    });

    // ctxTimeLine.clearRect(0, 0, CanvasWaveFormRec.width, CanvasWaveFormRec.height);
    playBarHeadPos = playBars[0].x;
}

//画面内のタイムライン表示を削除・再スタートする
const initTimeLineBars = () => {
    let _bars = bars;
    for (let i = 0; i < _bars.length; i++) {
        playBars[i] = _bars[i];
    }
    delete _bars;
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
    gainNode.gain.value = 3.4;                          //　音量最大
    audioBuffer.getChannelData(0).set(_PCMdata);
    playDataSource.buffer = audioBuffer;
    playDataSource.loop = false;                        //. ループ再生するか？
    playDataSource.loopStart = 0;                       //. オーディオ開始位置（秒単位）
    playDataSource.loopEnd = audioBuffer.duration;      //. オーディオ終了位置（秒単位）
    playDataSource.playbackRate.value = 1.0;            //. 再生速度＆ピッチ
    gainNode.connect(playAudioCtx.destination);
    playDataSource.start(0);
}



//収録データからPCMをgetする．
const getPCMData = (_playingData) => {
    let PCMData = [];
    let result = [];
    let length = _playingData["dataList"].length - 1;
    // PCMData = _playingData;
    for (let i = 0; i < length; i++) {
        PCMData.push(_playingData["dataList"][i]["raw"]["PCM"]);
    }
    PCMData.forEach(element => {
        result = result.concat(Object.values(element));
    });
    delete PCMData;
    return result;
}


//再生ボタンを押下したときに実行される関数．
const stopDataList = (_stopPlayingCB) => {
    if (!isRecording) {
        if (isPlaying) {
            isPlaying = false;
            // dataIndex = -1;
            playAudioCtx.suspend();
            otomieVisual_Play.stop();
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
        isPlaying = false;
        dataIndex = -1;
        playAudioCtx.suspend();
        otomieVisual_Play.stop();
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
        time: "0000000000000",         //(Date)
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
    let pitch = calcFrequencyPeak(frequency);
    let volumePeak = calcVolumePeak(timeDomainArray);
    let sharpness = calcSharpness(frequency);
    let roughness = 0;


    raw.PCM = Object.values(bufferData);
    raw.timeDomain = Object.values(timeDomainArray);
    raw.frequency = frequency;
    raw.pitch = pitch;
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

    pitch = Math.min(pitchMax, Math.max(pitch, pitchMin));              //クリッピング
    pitch = (pitch - pitchMin) / (pitchMax - pitchMin);                 //正規化
    sharpness = Math.min(pitchMax, Math.max(sharpness, pitchMin));      //クリッピング
    sharpness = (sharpness - pitchMin) / (pitchMax - pitchMin);         //正規化


    let volume = volumePeak / 255;

    visual.hue = calcHue(sharpness);
    visual.saturation = volumePeak / 255;
    visual.brightness = pitch;
    visual.objectCount = calcObjectCount(pitch, volume);
    visual.objectShape = pitch;
    visual.speed = pitch * 0;

    frameData.raw = raw;
    frameData.visual = visual;

    delete raw;
    delete visual;
    delete frequency;
    delete frequencyPeak;
    delete volumePeak;
    delete roughness;
    return frameData;
}


// let count = 0;
// let value = 0;
// const conuntUP = () => {
//     count += 1.01;
//     value = count % 6;
//     value = value / 6;

//     // return value;
// }
// setInterval(conuntUP, 1000);

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
    if (!isRecording) {
        if (startCollectingTime >= beforeStorageTime) {

            dataList.shift();
        }
    }
    data.dataList = dataList;
}


//リアルタイム描画開始用のスイッチ
const switchRealTime = (_canvas, _canvasTL, _drawRealTimeCB) => {
    if (!isDrawRealTime) {
        isDrawRealTime = true;
        initTimeLineCanvas(_canvasTL, _drawRealTimeCB);      //タイムライン描画を初期化          
        drawRealTimeCB.onReady(true);                        //コールバック
    }
    else if (isDrawRealTime == true) {
        isDrawRealTime = false;
    }
}

//タイムライン描画を初期化
const initTimeLineCanvas = (_canvasTL, _drawRealTimeCB) => {
    drawRealTimeCB = _drawRealTimeCB;
    //タイムライン用のキャンバス
    canvasTL = _canvasTL;
    canvasTLCtx = canvasTL.getContext("2d");
    //タイムラインを表示
    pushBar(canvasTL.width - margin, canvasTL.height / 2, 0, 0, getBarVelocity(), 'rgb(0, 0, 0)', performance.now());
    drawSideBar();
}

const drawRTGraphic = (_frameData, _drawRealTimeCB) => {
    if (isDrawRealTime) {
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
    return numPlayingData;
};



//アニメーション再生・ループ
const animateCanvases = (_canvas, _canvasPB, _callback) => {
    let data = playingData;
    let drawTime;

    if (isPlaying) {
        //最初の走査
        if (dataIndex == -1) {
            dataIndex = 0;
            startPlayTime = performance.now() / 1000;
            lastDrawTime = 0;
            playDeltaTime = data["dataList"][dataIndex].deltaTime;
            initProgressBar();
        }

        //全体のうちの現在描画している時間
        drawTime = (performance.now() / 1000) - startPlayTime;

        //描画対象のデータのインデックスを次に進める条件
        if (playDeltaTime <= drawTime) {
            let audioTotalTime = playDeltaTime;
            let processIndex = dataIndex;


            for (let i = dataIndex; i < data["dataList"].length - 1; i++) {
                audioTotalTime += data["dataList"][i].deltaTime;

                //次のaudioDeltaTimeとの和と、描画している時間とを比較．
                if (drawTime <= audioTotalTime) {
                    processIndex = i;
                    break;
                }
            }
            //描画対象のデータのインデックスを決定する
            dataIndex = processIndex;
            console.log(dataIndex);
            _callback.onProcess(true);

            otomieVisual_Play.updateSoundData(data["dataList"][dataIndex]["visual"]);
            let n_index = dataIndex / (data["dataList"].length - 1);
            updateProgressBar(n_index);
            dataIndex += 1;

            //ループする条件
            if (data["dataList"].length - 1 < dataIndex) {
                dataIndex = -1;
                requestAnimationFrame(() => { animateCanvases(_canvas, _canvasPB, _callback) });
                playPCMData(PCMData);   //音声再生のループする．
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

//プログレスバーを初期位置に
const initProgressBar = () => {
    //プログレスバーを生成．すでにプログレスバーのインスタンスは削除
    progressBarContainer.splice(0);
    progressBarContainer.push(new progressBar(playBarHeadPos, 0, 1, canvasPB.height));
    progressBarContainer[0].render(canvasPBCtx);
}

//プログレスバーをアップデート
const updateProgressBar = (n_index) => {
    progressBarContainer[0].x = (n_index * playBarWidth) + playBarHeadPos;
    canvasPBCtx.clearRect(0, 0, canvasPB.width, canvasPB.height);
    playBars.forEach((element) => {
        element.render(canvasPBCtx);
    });
    progressBarContainer[0].render(canvasPBCtx);
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

let sideBar = [];
const drawSideBar = () => {
    const dashedNum = 20;
    const height = 15;
    const dashedDulation = height + 4;
    const width = 2;
    const leftBarPosX = margin - width;
    for (let i = 0; i < canvasTL.height; i++) {
        sideBar.push(new SideBar(leftBarPosX, i * dashedDulation, width, height, "rgb(0,0,0)", 0));
    }
    sideBar.push(new SideBar(canvasTL.width - margin, 0, width, canvasTL.height, "rgb(0,0,0)", 0));
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
    bars.forEach((element) => {
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
    sideBar.forEach((element) => {
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

class SideBar extends Rectangle {
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