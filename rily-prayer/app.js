const $ = (selector) => document.querySelector(selector);
const prayerNames = [
  {key:"Fajr", name:"Subuh", icon:"☼"},
  {key:"Dhuhr", name:"Dzuhur", icon:"☀"},
  {key:"Asr", name:"Ashar", icon:"◒"},
  {key:"Maghrib", name:"Maghrib", icon:"☾"},
  {key:"Isha", name:"Isya", icon:"✦"}
];
const state = {
  city: localStorage.getItem("rp-city") || "Jakarta",
  country: localStorage.getItem("rp-country") || "Indonesia",
  method: localStorage.getItem("rp-method") || "20",
  timings: null, nextPrayer: null, countdownTimer: null, alarmEnabled: false,
  qibla: null, latitude: -6.2088, longitude: 106.8456
};
const hijriFormatter = new Intl.DateTimeFormat("id-ID-u-ca-islamic", {day:"numeric",month:"long",year:"numeric"});
const dateFormatter = new Intl.DateTimeFormat("id-ID", {weekday:"long",day:"numeric",month:"long",year:"numeric"});
const timeFmt = new Intl.DateTimeFormat("id-ID", {hour:"2-digit",minute:"2-digit",hour12:false});
const todayKey = () => new Date().toLocaleDateString("en-CA");
function toast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("show"),3000)}
function getLocalDateKey(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`}
function parseTime(time, dateOffset=0){const [h,m]=String(time).split(" ")[0].split(":").map(Number);const d=new Date();d.setDate(d.getDate()+dateOffset);d.setHours(h||0,m||0,0,0);return d}
function cleanTime(value){return String(value||"--:--").split(" ")[0]}
function updateDateLabels(){
  const now=new Date();
  $("#todayLabel").textContent=now.toLocaleDateString("id-ID",{weekday:"long"}).toUpperCase();
  $("#gregorianDate").textContent=dateFormatter.format(now);
  try{$("#hijriDate").textContent=hijriFormatter.format(now)+" H"}catch{$("#hijriDate").textContent="Kalender Hijriah"}
  $("#footerYear").textContent=now.getFullYear();
}
async function fetchPrayerTimes(){
  $("#refreshBtn").textContent="Memuat…";
  $("#scheduleNote").textContent="Mengambil jadwal sholat terbaru…";
  const now=new Date(); const date=`${String(now.getDate()).padStart(2,"0")}-${String(now.getMonth()+1).padStart(2,"0")}-${now.getFullYear()}`;
  const url=`https://api.aladhan.com/v1/timingsByCity/${date}?city=${encodeURIComponent(state.city)}&country=${encodeURIComponent(state.country)}&method=${encodeURIComponent(state.method)}`;
  try{
    const response=await fetch(url,{cache:"no-store"});
    if(!response.ok)throw new Error("Layanan jadwal tidak merespons.");
    const json=await response.json();
    if(json.code!==200||!json.data?.timings)throw new Error("Jadwal tidak ditemukan untuk kota tersebut.");
    state.timings=json.data.timings;
    if(json.data.meta?.latitude)state.latitude=Number(json.data.meta.latitude);
    if(json.data.meta?.longitude)state.longitude=Number(json.data.meta.longitude);
    $("#currentLocation").textContent=`${state.city}, ${state.country}`;
    $("#scheduleNote").textContent=`Jadwal ${state.city} menggunakan metode ${json.data.meta?.method?.name||"pilihanmu"}. Waktu dapat berbeda dari jadwal resmi setempat.`;
    renderPrayerCards(); calculateQibla(); updateCountdown();
  }catch(error){
    $("#scheduleNote").textContent="Jadwal online belum bisa dimuat. Periksa koneksi internet dan nama kota, lalu coba perbarui.";
    $("#prayerGrid").innerHTML=`<div class="panel" style="grid-column:1/-1"><strong>Jadwal belum tersedia.</strong><p class="muted" style="margin-top:7px;font-size:11px">${escapeHTML(error.message)} Kamu tetap bisa mencoba tombol “Perbarui jadwal”.</p></div>`;
    $("#nextPrayerName").textContent="Jadwal belum tersedia";$("#countdown").textContent="--:--:--";$("#nextPrayerSub").textContent="Periksa koneksi internet atau pilihan kota.";
    toast("Jadwal sholat gagal dimuat.");
  }finally{$("#refreshBtn").textContent="↻ Perbarui jadwal"}
}
function escapeHTML(str){return String(str).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function renderPrayerCards(){
  if(!state.timings)return;
  $("#prayerGrid").innerHTML=prayerNames.map(p=>`<article class="prayer-card" id="card-${p.key}"><div class="prayer-symbol">${p.icon}</div><div class="prayer-name">${p.name}</div><div class="prayer-time">${cleanTime(state.timings[p.key])}</div></article>`).join("");
}
function getNextPrayer(){
  if(!state.timings)return null;
  const now=new Date();
  for(const p of prayerNames){const at=parseTime(state.timings[p.key]);if(at>now)return {...p,at,tomorrow:false}}
  const fajr=parseTime(state.timings.Fajr,1);
  return {...prayerNames[0],at:fajr,tomorrow:true};
}
function updateCountdown(){
  if(!state.timings)return;
  const next=getNextPrayer();if(!next)return;
  state.nextPrayer=next;
  const ms=Math.max(0,next.at-new Date());const total=Math.floor(ms/1000);
  const hours=String(Math.floor(total/3600)).padStart(2,"0"),minutes=String(Math.floor(total%3600/60)).padStart(2,"0"),seconds=String(total%60).padStart(2,"0");
  $("#countdown").textContent=`${hours}:${minutes}:${seconds}`;
  $("#nextPrayerName").textContent=next.name;
  $("#nextPrayerSub").textContent=`${next.tomorrow?"Besok":"Hari ini"} pukul ${cleanTime(state.timings[next.key])} · ${state.city}`;
  document.querySelectorAll(".prayer-card").forEach(el=>el.classList.remove("active"));
  const active=$("#card-"+next.key);if(active)active.classList.add("active");
  if(state.alarmEnabled&&total===0){playAlarm();notifyPrayer(next.name)}
}
function playAlarm(){
  try{
    const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;
    const ctx=new Ctx();
    [0,0.5,1].forEach((delay,i)=>{const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type="sine";osc.frequency.value=[660,784,660][i];gain.gain.setValueAtTime(.0001,ctx.currentTime+delay);gain.gain.exponentialRampToValueAtTime(.18,ctx.currentTime+delay+.05);gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+delay+.42);osc.connect(gain);gain.connect(ctx.destination);osc.start(ctx.currentTime+delay);osc.stop(ctx.currentTime+delay+.45)});
  }catch(e){console.warn("Audio tidak tersedia",e)}
}
async function enableNotifications(){
  if(!("Notification" in window)){toast("Browser ini tidak mendukung notifikasi.");return false}
  try{const permission=await Notification.requestPermission();if(permission==="granted"){toast("Notifikasi diizinkan. Biarkan halaman tetap terbuka agar pengingat bekerja.");return true}toast("Izin notifikasi belum diberikan.");return false}catch{toast("Tidak bisa meminta izin notifikasi.");return false}
}
function notifyPrayer(name){
  if("Notification" in window&&Notification.permission==="granted"){new Notification("Waktu sholat telah tiba",{body:`Sekarang waktu ${name}. Semoga ibadahmu dimudahkan.`,tag:"rily-prayer-"+name})}
  playAlarm();toast(`Waktu ${name} telah tiba.`);
}
function calculateQibla(){
  const kaabaLat=21.4225*Math.PI/180,kaabaLon=39.8262*Math.PI/180,lat=state.latitude*Math.PI/180,lon=state.longitude*Math.PI/180;
  const dLon=kaabaLon-lon;
  const y=Math.sin(dLon),x=Math.cos(lat)*Math.tan(kaabaLat)-Math.sin(lat)*Math.cos(dLon);
  let bearing=Math.atan2(y,x)*180/Math.PI;bearing=(bearing+360)%360;state.qibla=bearing;
  $("#qiblaDegree").textContent=`${Math.round(bearing)}°`;
  $("#qiblaDirection").textContent=`${bearing<90?"Timur laut":bearing<180?"Tenggara":bearing<270?"Barat daya":"Barat laut"} · arah kiblat`;
  $("#needle").style.transform=`translate(-50%,-50%) rotate(${bearing}deg)`;
}
function getStats(){try{return JSON.parse(localStorage.getItem("rp-stats")||"{}")}catch{return {}}}
function saveStats(data){localStorage.setItem("rp-stats",JSON.stringify(data))}
function renderStats(){
  const stats=getStats(),today=getLocalDateKey(new Date()),names=prayerNames.map(p=>p.name),todayData=stats[today]||{};
  $("#prayerChecklist").innerHTML=names.map((name,i)=>`<label class="check-item"><input type="checkbox" data-prayer="${name}" ${todayData[name]?"checked":""}><span>${name}</span></label>`).join("");
  const done=names.filter(n=>todayData[n]).length;$("#todayProgress").textContent=`${done} dari 5`;$("#weeklyPercent").textContent=`${Math.round(done/5*100)}%`;
  $("#prayerChecklist").querySelectorAll("input").forEach(input=>input.addEventListener("change",()=>{
    const all=getStats(),key=getLocalDateKey(new Date());all[key]=all[key]||{};all[key][input.dataset.prayer]=input.checked;saveStats(all);renderStats();
  }));
  const weekdays=["Min","Sen","Sel","Rab","Kam","Jum","Sab"],days=[];
  for(let offset=6;offset>=0;offset--){const d=new Date();d.setDate(d.getDate()-offset);const key=getLocalDateKey(d),dayStats=stats[key]||{},count=names.filter(n=>dayStats[n]).length;days.push({d,key,count,label:weekdays[d.getDay()],today:offset===0})}
  $("#weeklyDays").innerHTML=days.map(day=>`<div class="week-day ${day.today?"today":""}"><div class="day-name">${day.label}</div><div class="day-track"><div class="day-fill" style="height:${day.count/5*100}%"></div></div><div class="week-count">${day.count}/5</div></div>`).join("");
}
const dhikrData={
  pagi:{title:"Dzikir pagi",entries:[
    {title:"Memohon perlindungan",arabic:"أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ",trans:"A‘ūdzu bi kalimātillāhit-tāmmāti min syarri mā khalaq.",translation:"Aku berlindung dengan kalimat-kalimat Allah yang sempurna dari kejahatan makhluk yang Dia ciptakan."},
    {title:"Tasbih",arabic:"سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",trans:"Subḥānallāhi wa biḥamdih.",translation:"Mahasuci Allah dan segala puji bagi-Nya. (Dapat dibaca berulang sebagai dzikir.)"}
  ]},
  petang:{title:"Dzikir petang",entries:[
    {title:"Memohon perlindungan",arabic:"أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ",trans:"A‘ūdzu bi kalimātillāhit-tāmmāti min syarri mā khalaq.",translation:"Aku berlindung dengan kalimat-kalimat Allah yang sempurna dari kejahatan makhluk yang Dia ciptakan."},
    {title:"Istighfar",arabic:"أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ",trans:"Astaghfirullāha wa atūbu ilaih.",translation:"Aku memohon ampun kepada Allah dan bertobat kepada-Nya."}
  ]},
  setelah:{title:"Doa setelah sholat",entries:[
    {title:"Memohon pertolongan untuk berdzikir",arabic:"اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ",trans:"Allāhumma a‘innī ‘alā dzikrika wa syukrika wa ḥusni ‘ibādatik.",translation:"Ya Allah, bantulah aku untuk mengingat-Mu, bersyukur kepada-Mu, dan beribadah dengan baik kepada-Mu."},
    {title:"Istighfar",arabic:"أَسْتَغْفِرُ اللَّهَ",trans:"Astaghfirullāh.",translation:"Aku memohon ampun kepada Allah."}
  ]}
};
function openDhikr(key){const data=dhikrData[key];if(!data)return;$("#dhikrTitle").textContent=data.title;$("#dhikrBody").innerHTML=data.entries.map(e=>`<article class="dhikr-entry"><h3>${escapeHTML(e.title)}</h3><p class="arabic" lang="ar" dir="rtl">${e.arabic}</p><p class="transliteration">${escapeHTML(e.trans)}</p><p class="translation">${escapeHTML(e.translation)}</p></article>`).join("");$("#dhikrDialog").showModal()}
function saveLocation(){
  const city=$("#cityInput").value.trim(),country=$("#countryInput").value.trim(),method=$("#methodSelect").value;
  if(!city||!country){$("#locationError").textContent="Isi kota dan negara terlebih dahulu.";return}
  state.city=city;state.country=country;state.method=method;
  localStorage.setItem("rp-city",city);localStorage.setItem("rp-country",country);localStorage.setItem("rp-method",method);
  $("#locationError").textContent="";$("#locationDialog").close();fetchPrayerTimes();
}
async function useGeolocation(){
  if(!navigator.geolocation){toast("Browser tidak mendukung lokasi.");return}
  toast("Meminta izin lokasi…");
  navigator.geolocation.getCurrentPosition(async pos=>{
    state.latitude=pos.coords.latitude;state.longitude=pos.coords.longitude;calculateQibla();
    try{
      const res=await fetch(`https://api.aladhan.com/v1/timings/${Math.floor(Date.now()/1000)}?latitude=${state.latitude}&longitude=${state.longitude}&method=${encodeURIComponent(state.method)}`);
      const json=await res.json();
      if(json.code===200&&json.data?.timings){state.timings=json.data.timings;const address=json.data.meta?.timezone||"Lokasi perangkat";$("#currentLocation").textContent=address.split("/").pop().replaceAll("_"," ");$("#scheduleNote").textContent="Jadwal berdasarkan koordinat perangkat. Nama kota dapat berbeda dari nama lokasi sebenarnya.";renderPrayerCards();updateCountdown()}
    }catch{toast("Lokasi didapat, tetapi jadwal online gagal dimuat.")}
    toast("Lokasi perangkat berhasil digunakan.");
  },()=>toast("Izin lokasi ditolak atau lokasi tidak tersedia."),{enableHighAccuracy:true,timeout:10000});
}
$("#locationOpen").addEventListener("click",()=>{$("#cityInput").value=state.city;$("#countryInput").value=state.country;$("#methodSelect").value=state.method;$("#locationDialog").showModal()});
$("#saveLocationBtn").addEventListener("click",saveLocation);
$("#refreshBtn").addEventListener("click",fetchPrayerTimes);
$("#geoBtn").addEventListener("click",useGeolocation);
$("#notificationBtn").addEventListener("click",enableNotifications);
$("#quickAlarmBtn").addEventListener("click",async()=>{
  if(!state.alarmEnabled){const ok=await enableNotifications();state.alarmEnabled=true;$("#quickAlarmText").textContent="Pengingat aktif";$("#quickAlarmBtn").classList.add("alarm-on");toast(ok?"Pengingat diaktifkan selama halaman tetap terbuka.":"Alarm lokal aktif selama halaman tetap terbuka.");}
  else{state.alarmEnabled=false;$("#quickAlarmText").textContent="Aktifkan pengingat";$("#quickAlarmBtn").classList.remove("alarm-on");toast("Pengingat dinonaktifkan.")}
});
document.querySelectorAll("[data-open]").forEach(btn=>btn.addEventListener("click",()=>openDhikr(btn.dataset.open)));
document.querySelectorAll(".nav-link").forEach(link=>link.addEventListener("click",()=>{document.querySelectorAll(".nav-link").forEach(x=>x.classList.remove("active"));link.classList.add("active")}));
updateDateLabels();renderStats();calculateQibla();fetchPrayerTimes();state.countdownTimer=setInterval(updateCountdown,1000);
