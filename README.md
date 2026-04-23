# Software_IRIS
al clonar el repositorio en la raiz se debe ejecutar:

    npm install
    cordova prepare

probar el front en navegador

    python3 -m http.server 8080

en el enlace: 

    http://localhost:8080/www/

probar en simulador, al hacer una modificacion en la carpeta www/, se debe actualizar la carpeta www/ de la plataforma a usar
actualizar para IOS:

        cordova prepare ios

actualizar para android:

        cordova prepare android
