// script.js
const ADMIN_EMAIL = 'admin@election.com';
let currentElection = null;
let currentVoter = null;

const getUrlParam = (name) => new URLSearchParams(location.search).get(name);
const showMsg = (id, msg, type = 'success') => {
  const el = document.getElementById(id);
  if (el) {
    el.innerHTML = `<div class="${type}">${msg}</div>`;
    el.style.display = 'block';
  }
};

let nepalData = [];
fetch('nepal-data.json')
  .then(r => r.json())
  .then(d => { nepalData = d.provinceList; })
  .catch(() => showMsg('msg', 'Nepal data failed to load', 'error'));

function generateVoterId() {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

function calculateAge(dob) {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

async function loadElection() {
  const eid = getUrlParam('eid');
  if (!eid) return (window.location.href = 'index.html');
  const { data, error } = await supabase.from('elections').select('*').eq('id', eid).single();
  if (error) return showMsg('msg', 'Election not found', 'error');
  currentElection = data;
  document.title = data.name;
  const nameEl = document.getElementById('electionName');
  if (nameEl) nameEl.textContent = data.name;
  updateElectionStatus();
}

function updateElectionStatus() {
  if (!currentElection) return;
  const now = new Date();
  const start = new Date(currentElection.start_date);
  const end = new Date(currentElection.end_date);
  const nom = new Date(currentElection.nomination_deadline);

  let status = 'upcoming';
  if (now >= start && now <= end) status = 'active';
  else if (now > end) status = 'ended';

  document.querySelectorAll('.nomination-only').forEach(el => el.style.display = now < nom ? 'block' : 'none');
  document.querySelectorAll('.voting-only').forEach(el => el.style.display = status === 'active' ? 'block' : 'none');
  document.querySelectorAll('.result-only').forEach(el => el.style.display = status === 'ended' ? 'block' : 'none');
}
