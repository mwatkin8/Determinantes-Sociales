function loadPatient(patient_id){
    window.location.href = '/carga?pid=' + patient_id;
}

async function clearSummary(){
    document.getElementById('vida').innerHTML = '';
    document.getElementById('financiera').innerHTML = '';
    document.getElementById('social_emocional').innerHTML = '';
    document.getElementById('seguridad').innerHTML = '';
    document.getElementById('miembros').innerHTML = '';
}
async function loadMap(key, street, department, district, province){
    let r = await fetch('https://maps.googleapis.com/maps/api/geocode/json?address=' + encodeURI(street + ', ' + district + ', ' + department + ', ' + province + ', PERU') + '&key=' + key)
    let geocode = await r.json();
    if(geocode.hasOwnProperty('results')){
        if(geocode.results[0].hasOwnProperty('geometry')){
            let lat = geocode.results[0].geometry.location.lat
            let lng = geocode.results[0].geometry.location.lng
            document.getElementById('map').innerHTML = "<iframe width=\"90%\" height=\"90%\" frameborder=\"0\" style=\"border:0\" src=\"https://www.google.com/maps/embed/v1/streetview?location=" + lat + ',' + lng + "&key=" + key + "\" allowfullscreen></iframe>";
        }
    }
}

async function loadSummary(summary){
    await clearSummary();
    let s = await JSON.parse(summary);
    if(s.historia !== ''){
        document.getElementById('historia').innerHTML = "<li class=\"h6 mb-0 text-gray-800\">" + s.historia + "</li>"
    }
    if(s.entrevistado !== ''){
        document.getElementById('historia').innerHTML += "<li class=\"h6 mb-0 text-gray-800\">Entrevistado(a): " + s.entrevistado + "</li>"
    }
    if(s.diagnostico !== ''){
        document.getElementById('historia').innerHTML += "<li class=\"h6 mb-0 text-gray-800\">" + s.diagnostico + "</li>"
    }
    s.vida.forEach(li => {
        document.getElementById('vida').innerHTML += "<li class=\"h6 mb-0 text-gray-800\">" + li + "</li>"
    });
    s.financiera.forEach(li => {
        document.getElementById('financiera').innerHTML += "<li class=\"h6 mb-0 text-gray-800\">" + li + "</li>"
    });
    s.social_emocional.forEach(li => {
        document.getElementById('social_emocional').innerHTML += "<li class=\"h6 mb-0 text-gray-800\">" + li + "</li>"
    });
    s.cronica.forEach(li => {
        document.getElementById('social_emocional').innerHTML += "<li class=\"h6 mb-0 text-gray-800\">" + li + "</li>"
    });
    s.discapacidad.forEach(li => {
        document.getElementById('social_emocional').innerHTML += "<li class=\"h6 mb-0 text-gray-800\">" + li + "</li>"
    });
    s.seguridad.forEach(li => {
        document.getElementById('seguridad').innerHTML += "<li class=\"h6 mb-0 text-gray-800\">" + li + "</li>"
    });
    let bienes = '';
    s.bienes.forEach(g => {
        bienes += g + ', '
    });
    if(bienes !== ''){
        document.getElementById('financiera').innerHTML += "<li class=\"h6 mb-0 text-gray-800\">El (La) paciente posee los siguientes bienes: " + bienes.slice(0,-2) + "</li>"
    }
    for (let i = 0; i < s.miembros.length; i++){
        let m = s.miembros[i];
        d3.select('#miembro-card').style('visibility','visible');
        if(m.relation !== ''){
            document.getElementById('miembros').innerHTML += "<li style=\"list-style:none;\" class=\"h6 mb-0 text-gray-800 font-weight-bold\">" + m.relation + "</li>"
        }
        if(m.name !== ''){
            document.getElementById('miembros').innerHTML += "<li style=\"list-style:none;\" class=\"h6 mb-0 text-gray-800\">" + m.name + "</li>"
        }
        if(m.age !== ''){
            document.getElementById('miembros').innerHTML += "<li style=\"list-style:none;\" class=\"h6 mb-0 text-gray-800\">" + m.age + " años</li>"
        }
        if(m.dni !== ''){
            document.getElementById('miembros').innerHTML += "<li style=\"list-style:none;\" class=\"h6 mb-0 text-gray-800\">DNI: " + m.dni + "</li>"
        }
        if(m.insurance !== ''){
            document.getElementById('miembros').innerHTML += "<li style=\"list-style:none;\" class=\"h6 mb-0 text-gray-800\">Seguro: " + m.insurance + "</li>"
        }
        if(m.marriage !== ''){
            document.getElementById('miembros').innerHTML += "<li style=\"list-style:none;\" class=\"h6 mb-0 text-gray-800\">Estado Civil: " + m.marriage + "</li>"
        }
        if(m.gender !== ''){
            document.getElementById('miembros').innerHTML += "<li style=\"list-style:none;\" class=\"h6 mb-0 text-gray-800\">Identidad de Género: " + m.dni + "</li>"
        }
        if(i !== s.miembros.length - 1){
            document.getElementById('miembros').innerHTML += "<hr />"
        }
    }
}

function findPatient(){
    let dni = d3.select('#dni').property('value');
    window.location.href = '/buscar?dni=' + dni;
}

function home(){
    window.location.href = '/';
}

function register(){
    window.location.href = '/registrarse';
}

function setGender(gender){
    let options = document.getElementById('gender').options;
    for(let i=0; i < options.length; i++){
        if(options[i].value === gender){
            options[i].selected = true;
        }
    }
}

async function editPatient(patient_id,name,dni,gender,birthDate,street,dpto,district,province){
    window.location.href = '/editar?p=' + patient_id +
    '&n=' + name +
    '&d=' + dni +
    '&g=' + gender +
    '&b=' + birthDate +
    '&s=' + encodeURIComponent(street) +
    '&dp=' + dpto +
    '&ds=' + district +
    '&pr=' + province;
}

async function createPatient(patient_id,server){
    console.log(patient_id,server);
    let fname = d3.select('#fname').property('value');
    let lname = d3.select('#lname').property('value');
    let dni = d3.select('#dni').property('value');
    let gender = d3.select('#gender').property('value');
    let birthDate = d3.select('#bdate').property('value');
    if (fname === ''){
        alert('Por favor ingrese el valor para \"Nombres\"')
    }
    else if (lname === ''){
        alert('Por favor ingrese el valor para \"Apellidos\"')
    }
    else if (birthDate === ''){
        alert('Por favor ingrese el valor para \"Fecha de nacimiento\"')
    }
    else if (birthDate.split('-')[0].length !== 4){
        alert('Utilice el formato de fecha correcto: \"YYYY-MM-DD\"')
    }
    else if (gender === ''){
        alert('Por favor ingrese el valor para \"Sexo\"')
    }
    else if (dni === ''){
        alert('Por favor ingrese el valor para \"DNI\"')
    }
    else{
        let patient = new Object();
        patient.resourceType = "Patient";
        patient.identifier = [
            {
                "system": "http://fake.hl7.org/fhir/sid/pe-dni",
                "value": dni
            }
        ];
        let given = fname.split(' ');
        patient.name = [{
            "given": given,
            "family": lname
        }]
        patient.gender = gender;
        patient.birthDate = birthDate;
        patient.address = [{
            "line": [d3.select('#address').property('value')],
            "city": d3.select('#dpto').property('value'),
            "district": d3.select('#district').property('value'),
            "state": d3.select('#province').property('value')
        }];
        if(patient_id === ''){
            let bundle = new Object();
            bundle.resourceType = "Bundle";
            bundle.type = "transaction";
            bundle.total = 1;
            bundle.entry = [{
                "resource": patient,
                "request": {
                    "method": "POST",
                    "url": "Patient"
                }
            }]
            let r = await fetch(server, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/fhir+json'
                },
                body: JSON.stringify(bundle)
            })
            let response = await r.json();
            console.log(response);
            window.location.href = '/buscar?dni=' + dni;
        }
        else{
            patient.id = patient_id;
            let r = await fetch(server + 'Patient/' + patient_id, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/fhir+json'
                },
                body: JSON.stringify(patient)
            })
            let response = await r.json();
            console.log(response);
            window.location.href = '/carga?pid=' + patient_id;
        }
    }
}
