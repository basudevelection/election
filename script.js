// Nepal data (assuming nepal-data.json is available locally or hosted)
const nepalDataUrl = 'nepal-data.json'; // Adjust path if hosted

async function fetchNepalData() {
  try {
    const response = await fetch(nepalDataUrl);
    return await response.json();
  } catch (error) {
    console.error('Error fetching Nepal data:', error);
    return null;
  }
}

async function populateProvinces() {
  const data = await fetchNepalData();
  if (!data) return;
  const provinceSelect = document.getElementById('province');
  provinceSelect.innerHTML = '<option value="">Select Province</option>' +
    data.provinceList.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
}

async function populateDistricts() {
  const provinceName = document.getElementById('province').value;
  const data = await fetchNepalData();
  if (!data) return;
  const province = data.provinceList.find(p => p.name === provinceName);
  const districtSelect = document.getElementById('district');
  districtSelect.innerHTML = '<option value="">Select District</option>';
  const municipalitySelect = document.getElementById('municipality');
  municipalitySelect.innerHTML = '<option value="">Select Municipality</option>';
  if (province) {
    districtSelect.innerHTML += province.districtList.map(d => `<option value="${d.name}">${d.name}</option>`).join('');
  }
}

async function populateMunicipalities() {
  const provinceName = document.getElementById('province').value;
  const districtName = document.getElementById('district').value;
  const data = await fetchNepalData();
  if (!data) return;
  const province = data.provinceList.find(p => p.name === provinceName);
  const municipalitySelect = document.getElementById('municipality');
  municipalitySelect.innerHTML = '<option value="">Select Municipality</option>';
  if (province) {
    const district = province.districtList.find(d => d.name === districtName);
    if (district) {
      municipalitySelect.innerHTML += district.municipalityList.map(m => `<option value="${m.name}">${m.name}</option>`).join('');
    }
  }
}

async function loadElection() {
  const eid = getUrlParam('eid');
  if (!eid) return showMsg('msg', 'No election selected', 'error');
  const { data } = await supabase.from('elections').select('*').eq('id', eid).single();
  if (!data) return showMsg('msg', 'Election not found', 'error');
  if (data.status !== 'active' && window.location.pathname.includes('vote.html')) {
    showMsg('msg', 'Voting is not active for this election', 'error');
  }
  if (new Date() > new Date(data.nomination_end) && window.location.pathname.includes('candidate-register.html')) {
    showMsg('msg', 'Candidate registration period has ended', 'error');
  }
}

function getUrlParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

function showMsg(elementId, message, type) {
  document.getElementById(elementId).innerHTML = `<div class="${type}">${message}</div>`;
}
