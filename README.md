# Determinantes-Sociales
 This FHIR-based application was developed to support the INSN clinic in Lima, Peru in gathering social determinants of health in a standardized and computable format.

## 1. Workflow

### Finding a patient
The root URL will navigate to a search page:

<img src="public/img/dni-search.png" alt="drawing" >

This takes in a patient DNI identifier and returns matching patients found within the FHIR server using the following query:<br>
<code>baseURL + 'Patient?identifier=http://fake.hl7.org/fhir/sid/pe-dni|' + dni</code><br>
The DNI for an individual is stored within their [Patient](https://www.hl7.org/fhir/patient.html) FHIR resource in the "identifier" field where it has the following structure:
```json
"identifier": [
    {
      "system": "http://fake.hl7.org/fhir/sid/pe-dni",
      "value": "70025425-8"
    }
  ]
```
### Adding a patient
If a patient is new to the clinic, their Patient FHIR resource will not yet exist and the user will be directed to a patient registration page.

<img src="public/img/register.png" alt="drawing" >

On this page, demographics are collected and used to create a Patient resource for the individual. When the "Entrar" button is clicked, the new resource is pushed to the FHIR server and the user is redirected back to the search page.

### Confirming a patient
<img src="public/img/confirm.png" alt="drawing" >

When a DNI search matches a patient, a module is presented for the user to confirm the matched patient.

<img src="public/img/main.png" alt="drawing" >

Upon confirmation, the patient will be loaded and the user redirected to the main page of the app. The address of the patient will attempt to be loaded within an embedded Google Maps view and their demographics will be displayed. These demographics come from the Patient FHIR resource and can be modified by clicking "editar". This will navigate the user to a page for editing Patient demographic data.

### Editing a patient
<img src="public/img/edits.png" alt="drawing" >

When the "Entrar" button is clicked, a PUT request will update the Patient resource on the FHIR server and increment the version. Previous versions are still stored and can be accessed on the server.

<img src="public/img/new-address.png" alt="drawing" >

Initially, there are no social determinants displayed for the patient. They must first answer questions on the "Socioeconomico Familiar" questionnaire (or others that may be supported in the future). To access this questionnaire, the user should select the "Socioeconomico Familiar" questionnaire from the navigation bar on the left. Also on the navigation bar is a back arrow that will return the user to the search page.

### Recording social determinants
<img src="public/img/questionnaire.png" alt="drawing" >

When a questionnaire is selected, the user will be navigated to a page where the questionnaire is displayed. The questionnaire itself is stored on the FHIR server as a [Questionnaire](https://www.hl7.org/fhir/questionnaire.html) resource and is not linked to any specific patient. It is retrieved using the "URL" field with the following query:<br>
<code>baseURL + 'Questionnaire?url=http://fake-insn-url.org/fhir/Questionnaire/insn_socioeconomico</code><br>
Very few fields are required and any response can be updated at a later time. The responses for the patient will be recorded when the "Enviar Respuesta" button on the bottom of the page is clicked.

### Patient summary
<img src="public/img/summary.png" alt="drawing" >

The response is stored on the FHIR server as a [QuestionnaireResponse](https://www.hl7.org/fhir/questionnaireresponse.html#QuestionnaireResponse) and is linked to the specific patient. It is retrieved using the "subject" field which contains a reference to the server ID of the Patient resource and has the following structure:
```json
"subject":{
    "reference": "Patient/patient-resource-id"
}
```
A "History" pane will tell the user when the patient's last responses were submitted. The user can go back into the questionnaire and update/add/delete the response of any specific quesiton at any time. Previous responses will be available on the FHIR server.

## 2. Architecture

### Google Maps API Key
The app uses the Google Maps service to provide a glimpse of the patient's living situation. This functionality can be easily removed if needed. In order to work, the implementers must [register for an API key](https://developers.google.com/maps/documentation/javascript/get-api-key) from the Google Maps Platform. This key will be used to leverage two API services (both shown in the loadMap() function in the <code>public/js/script.js</code> file) and should be included in the <code>index.js</code> file.

1. Geocoding API - Takes an address and returns the latitude and longitude needed for the street view of an address.
2. Maps Embed API - Embeds a map into the application display.

<img src="public/img/maps-api.png" alt="drawing" >


### 'Socioeconomico Familiar' questionnaire
A FHIR Questionnaire resource consists of several lists of items. These items can have several different types. For example, a "group" type item can be used to name and collect a subset of questions, an "open-choice" type item can have several answerOption fields available through a drop-down selection, a "string" type item can collect text, etc.
**Each item in a questionnaire has a unique "linkId"**. This linkId is used to store the responses of each question. While the FHIR [Questionnaire](https://www.hl7.org/fhir/questionnaire.html) specification does not dictate the strategy or data type to be used for these linkId's, a common convention is to use a URL-type path with the terminology binding used to code each item.

The following example shows a group of questions regarding social problems that the patient may be facing. Each item has a code that defines the item. These codes should be drawn from established terminologies such as LOINC, SNOMED-CT, ICD-10, or others. An example of using a code from an established terminology is the "Alcholismo" question shown below. In this questionnaire, concepts that did not exist in established terminologies were represented using unique codes from a custom INSN terminology (explained in next section). Examples of these custom codes are the "Problemas sociales" group and the "Abando familiar" question shown below. As you can see, the linkId for each item models a URL path, with the codes of parent items combined with the code for the specific question. This ensures a unique linkId for each question and improves the readability of the resource.
```json
{
  "type": "group",
  "code": [
    {
      "system": "Custom",
      "code": "8.0.0.0",
      "display": "Problemas sociales"
    }
  ],
  "text": "Problemas sociales",
  "linkId": "/8.0.0.0",
  "item": [
    {
        "type": "boolean",
        "code": [
          {
            "system": "http://snomed.info/sct",
            "code": "15167005",
            "display": "Alcholismo"
          }
        ],
        "text": "Alcholismo",
        "linkId": "/8.0.0.0/15167005",
    },
    {
        "type": "boolean",
        "code": [
        {
          "system": "Custom",
          "code": "8.1.0.0",
          "display": "Abandono familiar"
        }
        ],
        "text": "Abandono familiar",
        "linkId": "/8.0.0.0/8.1.0.0",
    },
    ...
  ]
}
```
### The LHC-Forms Widget
The app uses an external service, [LHC Forms](https://lhcforms.nlm.nih.gov/) to display the questionnaire, capture the results, generate a response, and pre-fill the questionnaire with previous responses. Specifically, it uses a JS widget that is explained in various demos in the following tutorial: http://lhncbc.github.io/lforms/

### Custom terminology
Each custom concept used in the 'Socioeconomico Familiar' questionnaire (and future questionnaires) should be carefully recorded and reviewed. The FHIR community depends on collaborative approaches to data modeling. The goal of institutions that deploy this app should be to eventually have all custom terminology codes replaced by codes from an established terminology service. [LOINC](https://loinc.org/) is not subscription-based and has a well-documented process for submitting new concepts. You may also consider collaboration with the [HL7 Gravity Project](https://www.hl7.org/gravity/) whose goal is to increase the number of standardized social determinants of health concepts (see the paper [here](https://confluence.hl7.org/display/GRAV/ICD-10+Coding+Submissions?preview=/97470545/97470547/Gravity%20Multi-Domain%20ICD%20Application.12.4.FINAL.pdf) for an example) and build related applications and materials.

The custom concepts used for INSN are stored in the file: <code>socioeconomico/custom-terminology.json</code>


### Response mappings
In order to provide a useful display of the social determinants of a patient (rather than just display the answers within the questionnaire itself). This app filters the patient's response to each question to one of four categories.

1. SITUACIÓN DE VIDA
2. SEGURIDAD FINANCIERA
3. SOCIAL Y EMOCIONAL
4. LA SEGURIDAD

In order to dynamically sort these responses, we have created a collection of mappings that contains both the category (vida, financiera, social_emocional, or seguridad) and a useful summarization to display that can be parsed out using the linkId. These mappings are stored on the server in a ValueSet resource. It is retrieved using the "URL" field with the following query:<br>
<code>baseURL + 'ValueSet?url=' + 'http://fake-insn-url.org/fhir/ValueSet/socioeconomico-familiar-descriptions'</code><br>

A sample of these mappings is shown below.
```json
{
    "code": "/1.0.0.0/76691-5",
    "designation": {
        "value": "social_emocional"
    },
    "display": "Identidad de género: "
},
{
    "code": "/1.0.0.0/1.2.0.0",
    "designation": {
        "value": "financiera"
    },
    "display": "Grado de instrucción: "
}...
```
Some questions required more finely-tuned mapping and display and are explained through in-line codes in the file: <code>index.js</code>

## 3. Deployment
This an [Express](http://expressjs.com/) App running on a NodeJS server. The server is locally-deployed to run on port 3000 using docker-compose. This docker structure should ease the process of deploying the Express/Node packages on an institutional server.

### Start the app server
With [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed, open the terminal app (Mac) or the Docker terminal (Windows), go to the home directory of this project.

Launch the server with the command <code>docker-compose -p sdh up --build &</code>

* View server output: <code>docker logs sdh\_app_1</code>
* Stop server: <code>docker stop sdh\_app_1</code>
* Start server again: <code>docker start sdh\_app_1</code>
* To wipe a previous build if you want to start over:
    * <code>docker stop sdh\_app_1</code>
    * <code>docker rm sdh\_app_1</code>
    * <code>docker rmi sdh\_app</code>
    * <code>docker volume prune</code>

### Creating a FHIR server
There are many open source projects and tutorials around setting up a FHIR server. One very popular approach https://github.com/hapifhir/hapi-fhir-jpaserver-starter, will create a robust FHIR server and provide a useful user interface that can be used to manage the server (demonstration can be viewed [here](http://hapi.fhir.org/)). Once created, the app requires the server's FHIR Base URL to be entered in the <code>index.js</code> file. If you choose to use the hapi-fhir-jpaserver-starter, it will look something like: <code>http://your-server.com/hapi-fhir-jpaserver/fhir/</code>.

### Security Considerations
The app depends uses an Open FHIR Endpoint for server transactions. This can be updated to follow the [SMART App Launch Framework](http://hl7.org/fhir/smart-app-launch/). This would mean the app would be required to go through an authorization process (OAuth2) in order to get a data access token. This process requires an additional authorization server and other aspects that may be difficult to implement.
