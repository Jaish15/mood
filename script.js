// ================= ELEMENTS =================
const audio = document.getElementById("player");
const fileInput = document.getElementById("fileInput");
const uploadBox = document.getElementById("uploadBox");
const moodText = document.getElementById("mood");
const analyzing = document.getElementById("analyzing");
const songList = document.getElementById("songList");
const downloadBtn = document.getElementById("downloadPlaylist");
const volumeSlider = document.getElementById("volumeSlider");

const canvas = document.getElementById("frequencyWave");
const ctx = canvas.getContext("2d");
const particleCanvas = document.getElementById("particles");
const pctx = particleCanvas.getContext("2d");

// ================= AUDIO SETUP =================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioCtx.createAnalyser();
const source = audioCtx.createMediaElementSource(audio);
source.connect(analyser);
analyser.connect(audioCtx.destination);

analyser.fftSize = 256;
const dataArray = new Uint8Array(analyser.frequencyBinCount);

// ================= GLOBAL STATE =================
let currentRecommendedSongs = [];

// ================= RESIZE =================
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = 260;
  particleCanvas.width = window.innerWidth;
  particleCanvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

// ================= SONG DATA =================
const recommendationjs = {
  Love: [
    { name: "Aasai Oar Pulveli", file: "songs/Aasai-Oar-Pulveli.mp3" },
    { name: "Enna Sugam", file: "songs/Enna Sugam.mp3" },
    { name: "Kadhal Aasai", file: "songs/Kadhal-Aasai.mp3" },
    { name: "Uyirey", file: "songs/Uyirey.mp3" },
    { name: "Nenjam Ellam Kadhal", file: "songs/Nenjam-Ellam-Kadhal.mp3" },
    { name: "Mugai Mazhai", file: "songs/Mugai Mazhai.mp3" }
  ],
  Folk: [
    { name: "Thalapathy Kacheri", file: "songs/Thalapathy Kacheri.mp3" },
    { name: "Jalabulajangu", file: "songs/Jalabulajangu-MassTamilan.dev.mp3" },
    { name: "Chumma Kizhi", file: "songs/Chumma-Kizhi-MassTamilan.io.mp3" },
    { name: "Coolie Disco", file: "songs/Coolie Disco.mp3" },
    { name: "Chikitu", file: "songs/Chikitu.mp3" }
  ]
};

// ================= PARTICLES =================
const particles = Array.from({ length: 70 }, () => ({
  x: Math.random() * window.innerWidth,
  y: Math.random() * window.innerHeight,
  r: Math.random() * 3 + 1,
  speed: Math.random() * 0.6 + 0.2
}));

function drawParticles() {
  pctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
  particles.forEach(p => {
    p.y -= p.speed;
    if (p.y < 0) p.y = particleCanvas.height;
    pctx.beginPath();
    pctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    pctx.fillStyle = "rgba(255,150,255,0.3)";
    pctx.fill();
  });
  requestAnimationFrame(drawParticles);
}
drawParticles();

// ================= FILE UPLOAD =================
uploadBox.onclick = () => {
  fileInput.value = "";
  fileInput.click();
};

fileInput.onchange = () => {
  if (!fileInput.files.length) return;

  if (audioCtx.state === "suspended") audioCtx.resume();

  analyzing.style.display = "block";
  moodText.style.display = "none";

  setTimeout(processAudio, 400);
};

// ================= PROCESS AUDIO =================
function processAudio() {
  const reader = new FileReader();

  reader.onload = () => {
    audioCtx.decodeAudioData(reader.result, () => {
      const mood = detectMood();
      analyzing.style.display = "none";
      showMood(mood);
    });
  };

  reader.readAsArrayBuffer(fileInput.files[0]);
}

// ================= MOOD DETECTION =================
function detectMood() {
  const uploaded = fileInput.files[0].name.toLowerCase().replace(/[^a-z0-9]/g, "");

  for (const mood in recommendationjs) {
    for (const song of recommendationjs[mood]) {
      const clean = song.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (uploaded.includes(clean)) return mood;
    }
  }
  return "Love";
}

// ================= SHOW MOOD =================
function showMood(mood) {
  moodText.style.display = "block";
  moodText.textContent = mood === "Love" ? "❤️ Love" : "🌾 Folk";
  loadSongs(mood);
}

// ================= LOAD SONGS =================
function loadSongs(mood) {
  songList.innerHTML = "";

  const uploaded = fileInput.files[0].name.toLowerCase();
  currentRecommendedSongs = recommendationjs[mood]
    .filter(s => !uploaded.includes(s.file.toLowerCase()))
    .sort(() => 0.5 - Math.random())
    .slice(0, 3);

  currentRecommendedSongs.forEach(song => {
    const div = document.createElement("div");
    div.className = "song";
    div.textContent = "▶ " + song.name;

    div.onclick = async () => {
      if (audioCtx.state === "suspended") await audioCtx.resume();

      if (audio.src.includes(song.file)) {
        if (audio.paused) {
          audio.play();
          div.textContent = "⏸ " + song.name;
        } else {
          audio.pause();
          div.textContent = "▶ " + song.name;
        }
        return;
      }

      audio.src = song.file;
      audio.play();
      animate();

      document.querySelectorAll(".song").forEach(s => {
        s.classList.remove("active");
        s.textContent = "▶ " + s.textContent.replace("▶ ", "").replace("⏸ ", "");
      });

      div.classList.add("active");
      div.textContent = "⏸ " + song.name;
    };

    songList.appendChild(div);
  });
}

// ================= VISUALIZER =================
function animate() {
  requestAnimationFrame(animate);
  analyser.getByteFrequencyData(dataArray);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  let x = 0;

  for (let i = 0; i < dataArray.length; i++) {
    const h = dataArray[i];
    ctx.fillStyle = `hsl(${250 + h}, 85%, 60%)`;
    ctx.fillRect(x, canvas.height - h, 4, h);
    x += 6;
  }
}

// ================= DOWNLOAD =================
downloadBtn.onclick = async () => {
  if (!currentRecommendedSongs.length) return;

  const zip = new JSZip();
  const folder = zip.folder("MoodBeats Playlist");

  for (const song of currentRecommendedSongs) {
    const res = await fetch(song.file);
    const blob = await res.blob();
    folder.file(song.name + ".mp3", blob);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(zipBlob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "MoodBeats_Playlist.zip";
  a.click();
};

// ================= VOLUME =================
audio.volume = 0.8;
volumeSlider.oninput = () => {
  audio.volume = volumeSlider.value;
};

// ================= RESET =================
audio.onended = () => {
  document.querySelectorAll(".song").forEach(s => {
    s.classList.remove("active");
    s.textContent = s.textContent.replace("⏸ ", "▶ ");
  });
};
