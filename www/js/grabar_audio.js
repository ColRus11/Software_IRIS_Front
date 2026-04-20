var mediaRec = null;
var recordingFilePath = null;

function getRecordingPath() {
  var fileName = 'recording_' + Date.now() + '.wav';

  if (device.platform === 'Android') {
    return cordova.file.externalDataDirectory + fileName;
  } else {
    // iOS
    return cordova.file.documentsDirectory + fileName;
  }
}

function startRecording() {
  recordingFilePath = getRecordingPath();

  mediaRec = new Media(
    recordingFilePath,
    function () {
      console.log('Media creado correctamente');
    },
    function (err) {
      console.error('Error en Media:', err.code, err.message);
    }
  );

  mediaRec.startRecord();
  console.log('Grabando en:', recordingFilePath);
}

function stopRecording() {
  if (!mediaRec) return;

  mediaRec.stopRecord();
  mediaRec.release();
  mediaRec = null;

  console.log('Grabación guardada en:', recordingFilePath);
  // Aquí puedes usar recordingFilePath para subir el archivo
}