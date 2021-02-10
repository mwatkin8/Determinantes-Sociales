let express = require('express');
let path = require('path');
let fetch = require('node-fetch');
let _ = require("lodash");
let app = express();
app.set('views', path.join(__dirname, 'views'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.use(express.static(path.join(__dirname, '/public/')));

const server = '';
const google_map_api_key = '';

app.get('/', async (request, response) => {
    let dni = '';
    if(request.query.dni){
        dni = request.query.dni
    }
    response.render('select',{
        visibility:"hidden",
        patient_id:"",
        dni:dni,
        name:"",
        gender:"",
        birthDate:"",
        street:"",
        dpto:"",
        district:"",
        province:""
    });
});

app.get('/socioeconomico', async (request, response) => {
    let patient_id = request.query.pid;
    let name = request.query.n;
    let bundle = await getResource(server + 'Questionnaire?url=http://fake-insn-url.org/fhir/Questionnaire/insn_socioeconomico');
    let q = _.get(bundle,'entry[0].resource',{});
    bundle = await getResource(server + 'QuestionnaireResponse?subject=' + patient_id + '&questionnaire=' + q.id);
    let qr = 'None';
    if(bundle.total !== 0){
        qr = JSON.stringify(_.get(bundle,'entry[0].resource',''));
    }
    response.render('socioeconomico',{ patient_id: patient_id, name: name , questionnaire: JSON.stringify(q), qr: qr });
});

app.get('/registrarse', async (request, response) => {
    response.render('registration',{dni:"",server:server});
});

let gender_toSpanish = {'male':'Hombre','female':'Mujer','other':'Otra','unknown':'Sin información'};
let gender_toEnglish = {'Hombre':'male','Mujer':'female','Otra':'other','Sin información':'unknown'}
app.get('/editar', async (request, response) => {
    let patient_id = request.query.p;
    let name = request.query.n;
    let fname = name.split(' ').slice(0,-1).join(' ');
    let lname = name.split(' ').pop()
    let dni = request.query.d;
    let gender = gender_toEnglish[request.query.g];
    let birthDate = request.query.b;
    let street = request.query.s;
    let dpto = request.query.dp;
    let district = request.query.ds;
    let province = request.query.pr;
    response.render('edit',{
        patient_id: patient_id,
        server:server,
        fname: fname,
        lname: lname,
        dni: dni,
        gender: gender,
        birthDate: birthDate,
        street: decodeURIComponent(street),
        dpto: dpto,
        district: district,
        province: province
    });
});

app.get('/buscar', async (request, response) => {
    let dni = request.query.dni;
    let bundle = await getResource(server + 'Patient?identifier=http://fake.hl7.org/fhir/sid/pe-dni|' + dni);
    if(bundle.total === 0) {
        response.render('registration',{dni:dni,server:server});
    }
    else {
        let p = bundle.entry[0].resource;
        let name = '';
        p.name[0].given.forEach(g => {
            name += g + ' ';
        });
        name += p.name[0].family;
        let gender = p.gender;
        let birthDate = p.birthDate;
        let street = _.get(p,'address[0].line[0]','');
        let dpto = _.get(p,'address[0].city','');
        let district = _.get(p,'address[0].district','');
        let province = _.get(p,'address[0].state','');
        response.render('select',{
            visibility: "visible",
            patient_id: p.id,
            dni: dni,
            name: name,
            gender: gender_toSpanish[gender],
            birthDate: birthDate,
            street: street,
            dpto: dpto,
            district: district,
            province: province
        });
    }
});

let summary = {
    "historia": "",
    "cronica":[],
    "discapacidad":[],
    "vida":[],
    "financiera": [],
    "social_emocional": [],
    "seguridad": []
};

app.get('/carga', async (request, response) => {
    let patient_id = request.query.pid;
    let p = await getResource(server + 'Patient/' + patient_id);
    let dni = '';
    _.get(p, 'identifier', []).forEach(i => {
        if(_.get(i, 'system', '') === 'http://fake.hl7.org/fhir/sid/pe-dni'){
            dni = _.get(i, 'value', '');
        }
    });
    let name = '';
    _.get(p, 'name[0].given', []).forEach(g => {
        name += g + ' ';
    });
    name += _.get(p, 'name[0].family', '');
    let gender = _.get(p, 'gender', '');
    let birthDate = _.get(p, 'birthDate', '');
    let street = _.get(p,'address[0].line[0]','');
    let dpto = _.get(p,'address[0].city','');
    let district = _.get(p,'address[0].district','');
    let province = _.get(p,'address[0].state','');
    //Retrieve any QuestionnaireResponse History
    await getQRHistory(patient_id);

    response.render('dashboard',{
        patient_id: patient_id,
        key: google_map_api_key,
        dni: dni,
        name: name,
        gender: gender_toSpanish[gender],
        birthDate: birthDate,
        street: street,
        dpto: dpto,
        district: district,
        province: province,
        summary: JSON.stringify(summary),
    });
});

async function getQRHistory(patient_id){
    summary = {
        "historia": "",
        "diagnostico": "",
        "entrevistado": "",
        "cronica": [],
        "discapacidad": [],
        "miembros": [],
        "bienes": [],
        "vida":[],
        "financiera": [],
        "social_emocional": [],
        "seguridad": []
    };
    let bundle = await getResource(server + 'Questionnaire?url=http://fake-insn-url.org/fhir/Questionnaire/insn_socioeconomico');
    let q = _.get(bundle,'entry[0].resource',{'id':'fake'});
    bundle = await getResource(server + 'QuestionnaireResponse?subject=' + patient_id + '&questionnaire=' + q.id);
    if(bundle.total !== 0){
        let qr = _.get(bundle,'entry[0].resource',{'item':[]});
        if(qr.hasOwnProperty('meta')){
            summary.historia = 'Ultima actualización en: ' + qr.meta.lastUpdated;
        }
        bundle = await getResource(server + 'ValueSet?url=' + 'http://fake-insn-url.org/fhir/ValueSet/socioeconomico-familiar-descriptions');
        let descriptions = _.get(bundle,'entry[0].resource.compose.include[0].concept',[]);
        qr.item.forEach(item => {
            if(item.linkId === '/3.0.0.0'){
                addMiembro(item)
            }
            else{
                findDescription(item, descriptions);
            }
        })
    }
}

function addMiembro(miembro){
    let m = {
        "name": "",
        "age": "",
        "dni": "",
        "insurance": "",
        "marriage": "",
        "gender": "",
        "relation": ""
    };
    miembro.item.forEach(item => {
        if(item.linkId === "/3.0.0.0/45392-8"){
            m.name = item.answer[0].valueString
        }
        else if(item.linkId === "/3.0.0.0/45394-4"){
            m.name += ' ' + item.answer[0].valueString
        }
        else if(item.linkId === "/3.0.0.0/30525-0"){
            m.age = item.answer[0].valueInteger
        }
        else if(item.linkId === "/3.0.0.0/1.1.0.0"){
            m.dni = item.answer[0].valueString
        }
        else if(item.linkId === "/3.0.0.0/1.3.0.0"){
            m.insurance = item.answer[0].valueCoding.display
        }
        else if(item.linkId === "/3.0.0.0/LL3271-5"){
            m.marriage = item.answer[0].valueCoding.display
        }
        else if(item.linkId === "/3.0.0.0/76691-5"){
            m.gender = item.answer[0].valueCoding.display
        }
        else if(item.linkId === "/3.0.0.0/3.1.0.0"){
            m.relation = item.answer[0].valueString
        }
    });
    summary.miembros.push(m)
}

function addCronica(item){
    let display = '';
    item.forEach(item => {
        if(item.linkId === '/7.0.0.0/7.1.0.0/7.1.1.0/2.1.0.0'){
            display = item.answer[0].valueString + ' del paciente '
        }
        if(item.linkId === '/7.0.0.0/7.1.0.0/7.1.1.0/7.1.1.1'){
            if(item.answer[0].hasOwnProperty('valueCoding')){
                display += 'tienes ' + item.answer[0].valueCoding.display
            }
            else{
                display += 'tienes ' + item.answer[0].valueString
            }
        }
    });
    summary.cronica.push(display)
}

function addDiscapacidad(item){
    let display = '';
    item.forEach(item => {
        if(item.linkId === '/7.0.0.0/7.1.0.0/7.1.2.0/2.1.0.0'){
            display = item.answer[0].valueString + ' del paciente '
        }
        if(item.linkId === '/7.0.0.0/7.1.0.0/7.1.2.0/7.1.2.1'){
            display += 'tienes la siguiente discapacidad: ' + item.answer[0].valueString
        }
    });
    summary.discapacidad.push(display)
}

function findDescription(item, descriptions){
    if(item.linkId === '/7.0.0.0/7.1.0.0/7.1.1.0'){
        item.answer.forEach(answer => {
            addCronica(answer.item)
        });
    }
    else if(item.linkId === '/7.0.0.0/7.1.0.0/7.1.2.0'){
        item.answer.forEach(answer => {
            addDiscapacidad(answer.item)
        });
    }
    else if(item.hasOwnProperty('item')){
        item.item.forEach(sub => {
            findDescription(sub, descriptions);
        });
    }
    else{
        let linkId = item.linkId
        if(linkId.split('/')[1] === '9.0.0.0'){
            summary.diagnostico = 'Diagnostico Social: ' + item.answer[0].valueString
        }
        else if(linkId.split('/')[1] === '8.0.0.0'){
            summary.seguridad.push(item.text)
        }
        else if(linkId === '/2.0.0.0/2.1.0.0'){
            summary.entrevistado += item.answer[0].valueString + ' del paciente, '
        }
        else if(linkId === '/2.0.0.0/45392-8' || linkId === '/2.0.0.0/74548-9'){
            summary.entrevistado += item.answer[0].valueString
        }
        else if(linkId === '/2.0.0.0/45394-4'){
            summary.entrevistado += ' ' + item.answer[0].valueString + ', '
        }
        else if(linkId === '/2.0.0.0/56799-0' || linkId === '/2.0.0.0/2.2.0.0' || linkId === '/2.0.0.0/2.3.0.0' || linkId === '/2.0.0.0/2.4.0.0'){
            summary.entrevistado += item.answer[0].valueString + ', '
        }
        else if(linkId === '/6.0.0.0/6.3.0.0/6.3.1.0' || linkId === '/6.0.0.0/6.3.0.0/6.3.2.0' || linkId === '/6.0.0.0/6.3.0.0/6.3.3.0' || linkId === '/6.0.0.0/6.3.0.0/6.3.4.0' || linkId === '/6.0.0.0/6.3.0.0/6.3.5.0' || linkId === '/6.0.0.0/6.3.0.0/6.3.6.0' || linkId === '/6.0.0.0/6.3.0.0/6.3.7.0' || linkId === '/6.0.0.0/6.3.0.0/6.3.8.0'){
            summary.bienes.push(item.text)
        }
        else if(linkId === '/6.0.0.0/6.3.0.0/1.3.1.0'){
            summary.financiera.push('El (La) paciente no tiene ningún artículo doméstico común, como teléfono o refrigeradora')
        }
        else if(linkId === '/5.0.0.0/5.5.0.0'){
            summary.vida.push('El paciente no tiene un lugar exclusivo para cocinar')
        }

        else{
            for (let i = 0; i < descriptions.length; i++){
                if(descriptions[i].code === linkId){
                    let answer;
                    if(item.answer[0].hasOwnProperty('valueCoding')){
                        answer = item.answer[0].valueCoding.display;
                    }
                    if(item.answer[0].hasOwnProperty('valueString')){
                        answer = item.answer[0].valueString;
                    }
                    if(item.answer[0].hasOwnProperty('valueInteger')){
                        answer = item.answer[0].valueInteger;
                    }
                    summary[descriptions[i].designation[0].value].push(descriptions[i].display + answer)
                }
            }
        }
    }
}

async function getResource(url){
    let r = await fetch(url)
    return await r.json();
}

app.listen(3000);
