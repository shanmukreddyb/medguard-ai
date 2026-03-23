import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* Firebase config */
const firebaseConfig = {
  apiKey: "AIzaSyBr1fstyWNOA-YB3K6Gb8AxJwm1xcOW57U",
  authDomain: "medguard-ai-ce760.firebaseapp.com",
  projectId: "medguard-ai-ce760",
  storageBucket: "medguard-ai-ce760.firebasestorage.app",
  messagingSenderId: "383683331845",
  appId: "1:383683331845:web:afdafa657d9f5cfe59596c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* Parse patient text using regex */
function parsePatient(text) {

  const get = (regex) => {
    const m = text.match(regex);
    return m ? m[1].trim() : null;
  };

  const patientId = get(/PATIENT ID:\s*(.*)/i);
  const name = get(/Name:\s*(.*)/i);
  const age = parseInt(get(/Age:\s*(\d+)/i));
  const symptoms = get(/Symptoms:\s*(.*)/i);
  const allergies = get(/Allergies:\s*(.*)/i);
  const medications = get(/Medications:\s*(.*)/i);
  const bp = get(/BP\s*([0-9\/]+)/i);
  const pulse = get(/Pulse\s*(\d+)/i);
  const spo2 = get(/SpO2\s*(\d+)/i);
  const doctorNotes = get(/Doctor Notes:\s*(.*)/i);

  return {
    patientId,
    name,
    age,
    symptoms,
    allergies,
    medications,
    bp,
    pulse,
    spo2,
    doctorNotes
  };
}

/* Triage rules */
function classify(data) {

  if (
    data.symptoms?.toLowerCase().includes("chest pain") ||
    data.symptoms?.toLowerCase().includes("shortness of breath") ||
    parseInt(data.spo2) < 96 ||
    parseInt(data.bp?.split("/")[0]) > 160 ||
    data.allergies?.toLowerCase().includes("aspirin")
  ) {
    return "CRITICAL";
  }

  if (!data.name || !data.age || !data.bp) {
    return "MODERATE";
  }

  return "SAFE";
}

/* Button handler */
window.screenPatient = async function () {

  const input = document.getElementById("inputText").value;

  if (!input) {
    alert("Paste patient intake record first.");
    return;
  }

  const data = parsePatient(input);
  data.status = classify(data);

  document.getElementById("output").innerText =
    JSON.stringify(data, null, 2);

  await setDoc(doc(db, "patients", data.patientId), {
    ...data,
    rawInput: input,
    timestamp: serverTimestamp()
  });

};

/* Live dashboard */
const dashboard = document.getElementById("dashboard");

onSnapshot(collection(db, "patients"), (snapshot) => {

  dashboard.innerHTML = "";

  snapshot.forEach((docItem) => {

    const data = docItem.data();

    const card = document.createElement("div");
    card.className = "card " + data.status;

    card.innerHTML = `
      <h3>${data.patientId}</h3>
      <p>Name: ${data.name ?? "Unknown"}</p>
      <p>Status: ${data.status}</p>
      <p>Symptoms: ${data.symptoms ?? "Not available"}</p>
    `;

    dashboard.appendChild(card);

  });

});