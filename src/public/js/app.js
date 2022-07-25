const socket = io();

const $call = document.getElementById("call");
const $welcome = document.getElementById("welcome");
const $my_face = document.getElementById("my_face");
const $mute_btn = document.getElementById("mute");
const $camera_btn = document.getElementById("camera");
const $cameras_select = document.getElementById("cameras");

let my_stream = null;
let is_mute = false;
let camera_on = false;
let room_name = null;
let my_peer_connection = null;
$call.hidden = true;

async function getCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices(); //이를 통해 유저의 모든 장치들을 얻을 수 있다.
        const cameras = devices.filter(
            (device) => device.kind === "videoinput"
        ); //모든 장치 중 카메라만 선별
        const current_camera = my_stream.getVideoTracks()[0];

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

    //$my_face에 stream src 넣어주기
    try {
        my_stream = await navigator.mediaDevices.getUserMedia(
            device_id ? camera_constrains : initial_constrains
        );
        $my_face.srcObject = my_stream;

        if (!device_id) {
            await getCameras();
        }
    } catch (e) {
        console.log(e);
    }
}

function handleMuteBtnClick() {
    my_stream.getAudioTracks().forEach((track) => {
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
    my_stream.getVideoTracks().forEach((track) => {
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

    //sender은 peer로 보내진 media stream track을 컨트롤하게 해준다.
    if (my_peer_connection) {
        const video_track = my_stream.getVideoTracks()[0];
        const video_sender = my_peer_connection
            .getSenders()
            .find((sender) => sender.track.kind === "video");
        video_sender.replaceTrack(video_track);
    }
}

$mute_btn.addEventListener("click", handleMuteBtnClick);
$camera_btn.addEventListener("click", handleCameraBtnClick);
$cameras_select.addEventListener("input", handleCameraChange);
$welcome_form = $welcome.querySelector("form");

async function initCall() {
    $welcome.hidden = true;
    $call.hidden = false;
    await getMedia();
    makeConnection();
}

async function handleWelcomeSubmit(event) {
    event.preventDefault();
    const $input = $welcome_form.querySelector("input");
    room_name = $input.value;
    initCall().then(() => {
        socket.emit("join_room", { room_name });
        $input.value = "";
    });
}

$welcome_form.addEventListener("submit", handleWelcomeSubmit);

socket.on("welcome", async () => {
    //누군가가 방에 입장할 때 이벤트 동작
    //offer 보내기
    const offer = await my_peer_connection.createOffer();
    my_peer_connection.setLocalDescription(offer);
    socket.emit("offer", { offer, room_name });
});

socket.on("offer", async ({ offer, room_name }) => {
    //리모트에 offer 저장
    my_peer_connection.setRemoteDescription(offer);

    //answer 보내기
    const answer = await my_peer_connection.createAnswer();
    my_peer_connection.setLocalDescription(answer);
    socket.emit("answer", { answer, room_name });
});

socket.on("answer", ({ answer, room_name }) => {
    //answer 받기
    my_peer_connection.setRemoteDescription(answer);
});

socket.on("ice", ({ ice, room_name }) => {
    //ice candidate 받기
    my_peer_connection.addIceCandidate(ice);
});

function makeConnection() {
    //RTC
    my_peer_connection = new RTCPeerConnection({
        iceServers: [
            {
                urls: [
                    //Google Stun (테스트용)
                    "stun:stun.l.google.com:19302",
                    "stun:stun1.l.google.com:19302",
                    "stun:stun2.l.google.com:19302",
                    "stun:stun3.l.google.com:19302",
                    "stun:stun4.l.google.com:19302",
                ],
            },
        ],
    }); //로컬과 원격 피어 간의 webRTC 연결을 담당하며, 연결 상태를 모니터링한다.
    my_peer_connection.addEventListener("icecandidate", handleIceCandidate); //ice candidate
    my_peer_connection.addEventListener("addstream", handleAddStream); //add stream
    my_stream
        .getTracks()
        .forEach((track) => my_peer_connection.addTrack(track, my_stream));
}

function handleIceCandidate(data) {
    //ice candidate 보내기
    socket.emit("ice", { ice: data.candidate, room_name });
}

function handleAddStream(data) {
    //받은 stream src를 peer_video에 넣어주기!
    const $peer_face = document.getElementById("peer_face");
    $peer_face.srcObject = data.stream;
}
