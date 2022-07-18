const socket = io();

const $my_face = document.getElementById("my_face");
const $mute_btn = document.getElementById("mute");
const $camera_btn = document.getElementById("camera");
const $cameras_select = document.getElementById("cameras");

let stream;
let is_mute = false;
let camera_on = false;

async function getCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices(); //이를 통해 유저의 모든 장치들을 얻을 수 있다.
        const cameras = devices.filter(
            (device) => device.kind === "videoinput"
        ); //모든 장치 중 카메라만 선별
        const current_camera = stream.getVideoTracks()[0];

        //카메라들의 정보를 select option에 넣어준다.
        cameras.forEach((camera) => {
            const $option = document.createElement("option");
            $option.value = camera.deviceId;
            $option.innerText = camera.label;
            if (current_camera.label === camera.label) {
                $option.selected = true;
            }
            $cameras_select.appendChild($option);
        });
    } catch (e) {
        console.log(e);
    }
}

async function getMedia(device_id) {
    const initial_constrains = {
        audio: true,
        video: { facingMode: "user" },
    };

    const camera_constrains = {
        audio: true,
        video: { deviceId: { exact: device_id } },
    };

    //$my_face에 미디어 넣어주기
    try {
        stream = await navigator.mediaDevices.getUserMedia(
            device_id ? camera_constrains : initial_constrains
        );
        $my_face.srcObject = stream;

        if (!device_id) {
            await getCameras();
        }
    } catch (e) {
        console.log(e);
    }
}

function handleMuteBtnClick() {
    stream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
    });

    if (is_mute) {
        $mute_btn.innerText = "UnMute";
        is_mute = false;
    } else {
        $mute_btn.textContent = "Mute";
        is_mute = true;
    }
}

function handleCameraBtnClick() {
    stream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
    });
    if (camera_on) {
        $camera_btn.textContent = "Camera Off";
        camera_on = false;
    } else {
        $camera_btn.textContent = "Camera On";
        camera_on = true;
    }
}

async function handleCameraChange() {
    await getMedia($cameras_select.value);
}

$mute_btn.addEventListener("click", handleMuteBtnClick);
$camera_btn.addEventListener("click", handleCameraBtnClick);
$cameras_select.addEventListener("input", handleCameraChange);

getMedia();
