'use strict';

const otomieVisual = new OtomieVisual();

// スクロールを禁止にする関数
function disableScroll(event) {
    event.preventDefault();
}
document.addEventListener('touchmove', disableScroll, { passive: false });
document.addEventListener('mousewheel', disableScroll, { passive: false });

// スプラッシュ画面
{
    // スプラッシュ画面 - アニメ終わりで非表示して次へ
    const splashImageGrp = document.querySelector('#SplashImageGrp');
    const splashWindow = document.querySelector('#SplashWindow');

    const splashNone = () => {
        splashWindow.classList.add('Displaynone');
    };
    splashImageGrp.addEventListener('animationend', splashNone);
}

// getArchiveステート判別用
let State = {
    isPrepared: 1,
    isRecorded: 2,
    isClickedReturn: 3,
    isClickedDelete: 4
};
let nowState = State.isPrepared;

// Howto画面

// Howto画面 - 画面クリックでスライド
const sliderContent = document.querySelectorAll('.SliderContent');

const conceptCard = document.getElementById('ConceptCard');
const clickedConceptCard = () => {
    sliderContent[0].classList.add('SlideHowtoAnim01');
    sliderContent[1].classList.add('SlideHowtoAnim01');
    sliderContent[2].classList.add('SlideHowtoAnim01');
};
conceptCard.addEventListener('touchstart', clickedConceptCard);

// Howto画面 - マイクの設定カードクリックで処理
const micOnCard = document.getElementById("MicOnCard");
// はじめましょうカードに移動関数
const changeStartCard = () => {
    sliderContent[0].classList.add('SlideHowtoAnim02');
    sliderContent[1].classList.add('SlideHowtoAnim02');
    sliderContent[2].classList.add('SlideHowtoAnim02');
}
// マイクの設定カード押された関数
const clickedMicOnCard = () => {
    micOn(micOnCallBack);
};
micOnCard.addEventListener('touchstart', clickedMicOnCard);

const canvasRealTime = document.getElementById('CanvasRealTime');
const visualRealTime = document.getElementById('VisualRealTime');
const canvasWaveFormRec = document.getElementById('CanvasWaveFormRec');

// micOnコールバック
const micOnCallBack = {
    onReady: (tf) => {
        if (tf == true) {
            console.log("UI通知-micOn-マイクアクセスが許可されました〇");
            drawRealTime(canvasRealTime, canvasWaveFormRec, canvasWaveFormPlay, drawRealTimeCallBack); //リアルタイム描画開始呼ぶ
            otomieVisual.setup(visualRealTime, 1024, 1024);
            otomieVisual.play();
        }
        else {
            console.log("UI通知-micOn-マイクアクセスが許可されませんでした×");
        }
    },
    onComplete: () => {
        console.log("onComplete");
    }
};
// drawRealTimeコールバック
const drawRealTimeCallBack = {
    onReady: (tf) => {
        if (tf == true) {
            console.log("UI通知-drawRealTime-リアルタイム描画が開始されました〇");
            changeStartCard(); //はじめましょうカードに移動関数呼ぶ
        }
        else {
            console.log("UI通知-drawRealTime-リアルタイム描画が開始されませんでした×");
        }
    }
};

// Howto画面 - はじめましょう画面クリックで非表示して次へ
const howToWindow = document.querySelector('#HowToWindow');
const startCard = document.getElementById("StartCard");
// はじめましょう画面がクリックされたら呼ぶ関数
const clickedStartCard = () => {
    getArchive(CanvasRecMovie, getArchiveCallBack);
};
// Howto画面非表示関数(収録画面に遷移)
const displayNoneStartCard = () => {
    howToWindow.classList.add('Displaynone');
};
// はじめましょう画面クリックイベント
startCard.addEventListener('touchstart', clickedStartCard);

//サムネイル画像
const thumbnailImage = document.getElementById('ThumbnailImage');
let thumbnailSrc; //サムネイル画像のデータ変数
// サムネイル画像を入れ替える関数
const changethumbnail = (thumbnailSrc) => {
    thumbnailImage.style.backgroundImage =  thumbnailSrc;
};
// getArchiveコールバック
const getArchiveCallBack = {
    getNum: (num) => {
        if (num <= 0) {
            console.log("UI通知-getArchive-保存されているデータがありません");
            if (nowState == State.isPrepared) { //準備完了なら
                displayNoneStartCard(); //Howto画面非表示関数
            } else if (nowState == State.isClickedDelete) { //削除ボタンが押されたら
                changeRecNow(); //収録状態にする
                toggleDeleteConfirm(); //削除確認ウインドウ閉じる
                nowState == State.isPrepared; //準備完了ステートに切替
            }
        }
        else {
            console.log("UI通知-getArchive-保存されているデータがあります");
            if (nowState == State.isRecorded) { // 収録停止してアイコン画像欲しいからgetArchive呼んだら
                stopRecFunc(); //UI周りを収録停止状態に変化させる
            } else if (nowState == State.isClickedReturn) { // 再生画面で戻るボタン押したら
                changeRecIcon(); // アイコン状態にする関数呼ぶ
                nowState == State.isRecorded; //収録完了ステートに切替
            }
        }
    },
    getImage: (thumbnailImg) => {
        console.log('UI通知-getArchive-サムネイル画像を入れます');
        CanvasRecMovie.style.backgroundImage =  "url(" + thumbnailImg + ")";
        thumbnailSrc =  "url(" + thumbnailImg + ")"; //サムネイル画像のデータ変数差し替え
        if (CanvasRecMovie.hasChildNodes() == true) { //子要素がいるなら
            console.log('UI通知-CanvasRecMovieは子要素持っている');
            CanvasRecMovie.firstChild.classList.add('Displaynone'); //CanvasRecMovieの子を見た目OFF
        }
    }
};

// 再生画面 - 状態(見た目)切り替え関数 ---↓↓↓↓↓↓↓↓↓↓↓↓---------------------------------------------------------
const recContainer = document.getElementById('RecContainer');
// - 収録状態 (撮影ボタン押されたら)
function changeRecNow() {
    // 収録初めて
    if (recContainer.classList.contains('RecNow') == true) {
        return;
    }
    // 収録されたものがある状態なら
    else if (recContainer.classList.contains('RecIcon') == true) {
        recContainer.classList.remove('RecIcon');
    }
    // ゴミ箱が押されたら
    else if (recContainer.classList.contains('RecPlayer') == true) {
        recContainer.classList.remove('RecPlayer');
    }
    recContainer.classList.add('RecNow');
}
// - 収録終了状態 (完全白フェード時)
function changeRecFinish() {
    recContainer.classList.remove('RecNow');
    recContainer.classList.add('RecFinish');
    console.log('RecFinish切替');
}
// - アイコン状態 (白フェード終了時)
function changeRecIcon() {
    // 収録終了時
    if (recContainer.classList.contains('RecFinish') == true) {
        recContainer.classList.remove('RecFinish');
        //　戻るボタン押されたら 
    } else if (recContainer.classList.contains('RecPlayer') == true) {
        recContainer.classList.remove('RecPlayer');
    }
    recContainer.classList.add('RecIcon');
}
// - 再生状態 (アイコン押されたら)
function changeRecPlayer() {
    recContainer.classList.remove('RecIcon');
    recContainer.classList.add('RecPlayer');
}
// 再生画面 - 状態切り替え関数 ---↑↑↑↑↑↑↑↑↑↑↑↑-------------------------------------------------------------



// 〇〇〇〇収録画面 - 収録ボタン関連処理 ---↓↓↓↓↓↓↓↓↓↓↓↓----------------------------------------------------
let isRecPlay = false;
const buttonStartRec = document.getElementById('ButtonStartRec');
// ボタン押されたら呼ばれる関数
const recClick = () => {
    if (!isRecPlay) { //収録中でないなら
        console.log('スタート押された');
        initRec(initRecCallBack);
    } else { //収録中なら
        console.log('ストップ押された');
        stopRec(CanvasRecMovie, stopRecCallBack); //収録停止
    }
}
buttonStartRec.addEventListener('touchstart', recClick);
// initRecコールバック
const initRecCallBack = {
    onReady: (tf) => {
        if (tf == true) {
            console.log("initRec-初期化が完了しました〇");
            recording(recordingCallBack); //収録開始
        }
        else {
            console.log("initRec-初期化が失敗しました×");
        }
    }
};
// UI側のカウント定義(渡ってきた数値を逆にするため)
const countUI = 5;
// recordingコールバック
const recordingCallBack = {
    onReady: (tf) => {
        if (tf == true) {
            console.log("UI通知-recording-収録が開始されました〇");
            startRecFunc(); //UI周りを収録中状態に変化させる
        }
        else {
            console.log("UI通知-recording-収録が開始されませんでした×");
        }
    },
    onProcess: (recCount) => {
        // 時間をテキストに入れる
        recCountText.textContent = Math.floor(countUI - recCount);
    },
    onComplete: (tf) => {
        if (tf == true) {
            console.log("UI通知-recording-収録時間が終了しました〇");
            recClick();
        } else {
            console.log("UI通知-recording-収録時間が終了できませんでした×");
        }
    }
};
// stopRecコールバック
const stopRecCallBack = {
    onReady: (tf) => {
        if (tf == true) {
            console.log("UI通知-stopRec-収録が停止されました〇");
            defenceClick(); //画面の操作を一旦受け付けない状態に
            changeRecBtnColor(); //収録ボタン色青に変更(おせるよーの見た目)
            nowState = State.isRecorded; //収録終了ステートに切替
            recCountText.textContent = '';
            getArchive(CanvasRecMovie, getArchiveCallBack); //再生画面にサムネイル画像入れるため
        }
        else {
            console.log("UI通知-stopRec-収録が停止できませんでした×");
        }
    }
};


// --- 収録ボタンのテキストに時間いれる[1]
const recCountText = document.getElementById('RecCountText');

// --- 収録ボタンの色変更関数[2]
const changeRecBtnColor = () => {
    buttonStartRec.classList.toggle('NormalRecBtn');
    buttonStartRec.classList.toggle('StartRecBtn');
}

// ----- 収録開始ボタンがおされたら呼ぶ処理まとめた関数
function startRecFunc() {
    changeRecBtnColor(); //収録ボタン色オレンジに変更
    changeRecNow(); //再生画面を収録状態にする
    isRecPlay = true; //収録中フラグON
}

// ----- 収録停止ボタンがおされたor0秒になったら呼ぶ関数
let isWhiteOut = false;
const whiteFadePanelOver = document.getElementById('WhiteFadePanelOver');
// 初期化関数
const initFadeAnim = () => {
    if (whiteFadePanelOver.classList.contains('FadeInWhiteOverAnim') == true) {
        whiteFadePanelOver.classList.remove('FadeInWhiteOverAnim');
    }
}
// ----- 収録停止ボタンがおされたら呼ぶ処理まとめた関数
function stopRecFunc() {
    initFadeAnim(); // 初期化関数
    whiteFadePanelOver.classList.add('FadeOutWhiteOverAnim'); // フェードアウトAnimクラス足す
    isRecPlay = false; //収録中フラグOFF
}
// 各フェードアニメーション終わったら呼ばれる
whiteFadePanelOver.addEventListener('animationend', () => {
    if (!isWhiteOut) { //完全真っ白
        isWhiteOut = true;
        changeRecFinish(); // 再生画面を収録終了状態にする
        whiteFadePanelOver.classList.remove('FadeOutWhiteOverAnim'); // フェードアウトAnimクラス除去
        whiteFadePanelOver.classList.add('FadeInWhiteOverAnim'); // フェードインAnimクラス足す
    } else { //真っ白明けたら
        isWhiteOut = false;
        changeRecIcon(); // 再生画面をアイコン状態にする     
    }
});
// 再生画面がアイコン状態になるアニメ終わったら呼ばれる
recContainer.addEventListener('transitionend', () => {
    if (recContainer.classList.contains('RecIcon') == true) {
        console.log('UI通知- 操作できない解除')
        removeDefenceClick(); // 画面操作を受け付けない処理を解除
        changethumbnail(thumbnailSrc); //サムネイル画像の中身入れ替える
        thumbnailImage.classList.remove('Displaynone'); //サムネイル画像を現す
    }
});
// 〇〇〇〇収録画面 - 収録ボタン関連処理 ---↑↑↑↑↑↑↑↑↑↑↑↑-----------------------------------------------------



// 〇〇〇〇再生画面 - アイコン押して再生画面状態に -------------------------------------------
const CanvasRecMovie = document.getElementById('CanvasRecMovie');
let isClickBtnBackToRecWindow = false; //戻るボタン押されたフラグ　押されたらtrue,再生画面に遷移してきたときfalse
const changePlayerWindowFunc = () => {
    console.log('UI通知-再生画面に切替');
    changeRecPlayer(); //再生画面を再生状態に
    defenceClick(); //クリック抑止
    thumbnailImage.classList.add('Displaynone'); //サムネイル画像を消す
};
CanvasRecMovie.addEventListener('touchstart', changePlayerWindowFunc);
// 再生画面が再生状態になるアニメ終わったら呼ばれる
recContainer.addEventListener('transitionend', () => {
    if (recContainer.classList.contains('RecPlayer') == true) {
        removeDefenceClick(); // 画面操作を受け付けない処理を解除
    }
});

// 〇〇〇〇再生画面 - 戻るボタン押してアイコン状態に -------------------------------------------
// 戻るボタン押された関数
let isSaveDataPlay = false; //再生中フラグ
const btnBackToRecWindow = document.getElementById('ButtonBackToRecWindow');
const clickedBackToRecWindowBtn = () => {
    nowState = State.isClickedReturn; //戻るボタン押されたステートに切替
    defenceClick(); //クリック抑止
    restartPlaying(restartPlayingCallBack); //再生位置をリセット&再生止める
};
// restartPlayingコールバック
const restartPlayingCallBack = {
    onComplete: (tf) => {
        if (tf == true) {
            console.log("UI通知-restartPlaying-再生位置リセット&再生停止が完了しました〇");
            if (!isSaveDataPlay) { //再生中でないなら
                getArchive(CanvasRecMovie, getArchiveCallBack); //アーカイブチェック
            } else { //再生中なら
                changeMovieBtnIcon(); //再生停止アイコン切替関数
                isSaveDataPlay = false; //再生中フラグOFF
                getArchive(CanvasRecMovie, getArchiveCallBack); //アーカイブチェック
            }
        } else {
            console.log("UI通知-restartPlaying-再生位置リセット&再生停止が完了できませんでした×");
        }
    }
};
btnBackToRecWindow.addEventListener('touchstart', clickedBackToRecWindowBtn);
// 〇〇〇〇再生画面 - 右下削除ボタン押してポップアップウインドウ表示・非表示 ------------------------------------------
const btnDeleteMovie = document.getElementById('ButtonDeleteMovie');
const deleteConfirmText = document.getElementById('DeleteConfirmText');
// --- 確認ポップアップウインドウ表示・非表示切替関数
const toggleDeleteConfirm = () => {
    deleteConfirmText.classList.toggle('InactivePopupWindow');
    deleteConfirmText.classList.toggle('ActivePopupWindow');
}
// --- 削除確認ボタン押したらまず呼ばれる関数
const clickedDeleteConfirmBtn = () => {
    nowState = State.isClickedDelete; //削除ボタン押されたステートに切替
    defenceClick(); //クリック抑止
    grayBackColor(); //抑止板を灰色に
    if (!isSaveDataPlay) { //再生中でないなら
        toggleDeleteConfirm(); //削除確認ウインドウ表示
    } else { //再生中なら
        stopPlaying(stopPlayingCallBack); //停止
    }
};
btnDeleteMovie.addEventListener('touchstart', clickedDeleteConfirmBtn);

// --- キャンセル押したら非表示
const cancelText = document.getElementById('CancelText');
// キャンセルボタン押されらまず呼ばれる関数
const clickedCancelText = () => {
    removeDefenceClick(); //クリック抑止解除
    removeGrayBackColor(); //抑止板灰色を解除
    toggleDeleteConfirm(); //ポップアップ非表示
}
cancelText.addEventListener('touchstart', clickedCancelText);
// 削除ボタン押されらまず呼ばれる関数
const clickedDeleteTextBtn = () => {
    deleteData(deleteDataCallBack);
};
// --- 削除押したら再生画面を収録状態にする
const deleteText = document.getElementById('DeleteText');
deleteText.addEventListener('touchstart', clickedDeleteTextBtn);

const deleteCompleteText = document.getElementById('DeleteCompleteText');
// deleteDataコールバック
const deleteDataCallBack = {
    onReady: (tf) => {
        if (tf == true) {
            console.log("UI通知-deleteData-削除が完了しました〇");
            deleteCompleteText.classList.remove('Displaynone'); //削除完了通知表示
            removeDefenceClick(); //クリック抑止解除
            removeGrayBackColor(); //抑止板灰色を解除
            getArchive(CanvasRecMovie, getArchiveCallBack); //アーカイブチェック
        }
        else {
            console.log("UI通知-deleteData-削除が完了できませんでした×");
        }
    }
};
deleteCompleteText.addEventListener('transitionend', () => {
    if (recContainer.classList.contains('Displaynone') == false) {
        deleteCompleteText.classList.add('Displaynone'); //サムネイル画像を現す
    }
});


// 〇〇〇〇再生画面 - 再生/停止ボタン押してアイコン切替 -------------------------------------------
const btnStartPlay = document.getElementById('ButtonStartPlay');
const changeMovieBtnIcon = () => {
    btnStartPlay.classList.toggle('PlayMovieBtn');
    btnStartPlay.classList.toggle('StopMovieBtn');
};

const canvasWaveFormPlay = document.getElementById('CanvasWaveFormPlay');
// 〇〇〇〇再生画面 - 再生/停止ボタン押されたらまず呼ばれる関数
const clickedPlayStopBtn = () => {
    if (!isSaveDataPlay) { //再生中でないなら
        play(CanvasRecMovie, playCallBack); //再生
    } else { //再生中なら
        stopPlaying(stopPlayingCallBack); //停止
    }
};
btnStartPlay.addEventListener('touchstart', clickedPlayStopBtn);
// playコールバック
const playCallBack = {
    onReady: (tf) => {
        if (tf == true) {
            console.log("UI通知-play-再生が開始されました〇");
            changeMovieBtnIcon(); //アイコン切替関数
            isSaveDataPlay = true; //再生中フラグON
            if (CanvasRecMovie.firstChild.classList.contains('Displaynone') == true) {
                CanvasRecMovie.firstChild.classList.remove('Displaynone'); //CanvasRecMovieの子を見た目ON
            }

        }
        else {
            console.log("UI通知-play-再生が開始できませんでした×");
        }
    }
};
// stopPlayingコールバック
const stopPlayingCallBack = {
    onReady: (tf) => {
        if (tf == true) {
            console.log("UI通知-stopPlaying-再生が停止されました〇");
            isSaveDataPlay = false; //再生中フラグOFF
            changeMovieBtnIcon(); //アイコン切替関数
            if (nowState == State.isClickedDelete) {
                toggleDeleteConfirm(); //削除確認ウインドウ表示
            }
        }
        else {
            console.log("UI通知-stopPlaying-再生が停止できませんでした×");
        }
    }
};

// 白フェード中等でクリックイベント抑止
const clickDefence = document.getElementById('ClickDefence');
const defenceClick = () => {
    clickDefence.classList.remove('Displaynone');
};
const removeDefenceClick = () => {
    clickDefence.classList.add('Displaynone');
};
// クリック抑止板を灰色にするだけの関数
const grayBackColor = () => {
    clickDefence.classList.add('GrayBackColor');
};
const removeGrayBackColor = () => {
    clickDefence.classList.remove('GrayBackColor');
};


// タッチ操作での拡大縮小禁止
function no_scaling() {
    document.addEventListener("touchmove", mobile_no_scroll, { passive: false });
}
no_scaling();
// 拡大縮小禁止
function mobile_no_scroll(event) {
    // ２本指での操作の場合
    if (event.touches.length >= 2) {
        // デフォルトの動作をさせない
        event.preventDefault();
    }
}


// テスト用
document.addEventListener('keypress', keypress_ivent);
// const recContainer = document.getElementById('RecContainer');
function keypress_ivent(e) {
    if (e.key === 'a' || e.key === 'A') {
        //Aキーが押された時の処理 //収録終了
        document.addEventListener('touchmove', disableScroll, { passive: false });
        document.addEventListener('mousewheel', disableScroll, { passive: false });
    }
    if (e.key === 'b' || e.key === 'B') {
        //Bキーが押された時の処理 //左下アイコンタップ
        openPlayWindow();
    }
    if (e.key === 'c' || e.key === 'C') {
        //Cキーが押された時の処理 //×アイコンタップ
        recContainer.classList.remove('RecPlayer');
        recContainer.classList.add('RecIcon');
    }
    if (e.key === 'd' || e.key === 'D') {
        console.log('あああああああああ');

    }
    return false;
}




// 呼ばれたタイミングでCanvasの子要素のcssを削除
//