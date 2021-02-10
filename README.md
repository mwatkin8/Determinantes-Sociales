# INSN-SDH-App

## Start the app server
Open the terminal app (Mac) or the Docker terminal (Windows), go to the home directory of this project.

Launch the server with the command <code>docker-compose -p sdh up --build &</code>

* View server output: <code>docker logs sdh\_app_1</code>
* Stop server: <code>docker stop sdh\_app_1</code>
* Start server again: <code>docker start sdh\_app_1</code>
* To wipe a previous build if you want to start over:
    * <code>docker stop sdh\_app_1</code>
    * <code>docker rm sdh\_app_1</code>
    * <code>docker rmi sdh\_app</code>
    * <code>docker volume prune</code>

## Onboarding a new patient

## Socioeconomico Familiar questionnaire

## The LHC-Forms Widget
