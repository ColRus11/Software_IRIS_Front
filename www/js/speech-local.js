/**
 * IRIS - Transcripción Auxiliar (Offline)
 * ----------------------------------------
 * Usa la Web Speech API nativa del navegador.
 * No requiere internet ni backend.
 *
 * Compatibilidad:
 *   - Chrome / Opera GX / Edge  → funciona completo
 *   - Safari                    → funciona con limitaciones
 *   - Firefox                   → NO soportado
 *
 * Uso:
 *   <script src="js/speech-local.js"></script>
 *
 *   SpeechLocal.start(onResultado, onError);
 *   SpeechLocal.stop();
 *   SpeechLocal.estaDisponible(); // → true / false
 */

var SpeechLocal = (function () {

  var reconocedor = null;
  var activo = false;
  var _onResultado = null;
  var _onError = null;

  function estaDisponible() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  function _crear() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    reconocedor = new SR();

    reconocedor.lang = 'es-CO';
    reconocedor.continuous = true;
    reconocedor.interimResults = true;
    reconocedor.maxAlternatives = 1;

    reconocedor.onstart = function () {
      console.log('[SpeechLocal] Reconocedor iniciado y escuchando');
    };

    reconocedor.onspeechstart = function () {
      console.log('[SpeechLocal] Voz detectada');
    };

    reconocedor.onspeechend = function () {
      console.log('[SpeechLocal] Voz terminada');
    };

    reconocedor.onresult = function (event) {
      var textoParcial = '';
      var textoFinal = '';

      for (var i = event.resultIndex; i < event.results.length; i++) {
        var t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          textoFinal += t;
        } else {
          textoParcial += t;
        }
      }

      if (_onResultado) {
        _onResultado({
          parcial: textoParcial,
          final: textoFinal,
          esFinal: textoFinal !== ''
        });
      }
    };

    reconocedor.onnomatch = function () {
      console.warn('[SpeechLocal] No se reconoció ninguna palabra');
    };

    reconocedor.onerror = function (event) {
      var mensajes = {
        'no-speech': 'No se detectó voz. Habla más cerca del micrófono.',
        'audio-capture': 'No se pudo acceder al micrófono.',
        'not-allowed': 'Permiso de micrófono denegado. Revisa los permisos del navegador.',
        'network': 'Error de red.',
        'aborted': 'Reconocimiento cancelado.',
        'service-not-allowed': 'Servicio no permitido. Usa localhost o HTTPS.'
      };
      var msg = mensajes[event.error] || ('Error desconocido: ' + event.error);
      console.error('[SpeechLocal] Error:', event.error, '-', msg);
      if (_onError) _onError(msg);
    };

    // Si el reconocedor se detiene solo, lo reinicia automáticamente
    reconocedor.onend = function () {
      console.log('[SpeechLocal] onend disparado. activo =', activo);
      if (activo) {
        setTimeout(function () {
          if (activo && reconocedor) {
            try {
              reconocedor.start();
              console.log('[SpeechLocal] Reiniciado automáticamente');
            } catch (e) {
              console.warn('[SpeechLocal] No se pudo reiniciar:', e.message);
            }
          }
        }, 200);
      }
    };
  }

  function start(onResultado, onError) {
    if (!estaDisponible()) {
      var msg = 'Web Speech API no disponible. Usa Chrome, Opera GX o Edge.';
      console.warn('[SpeechLocal]', msg);
      if (onError) onError(msg);
      return;
    }

    _onResultado = onResultado;
    _onError = onError;
    activo = true;

    _crear();

    try {
      reconocedor.start();
      console.log('[SpeechLocal] start() llamado');
    } catch (e) {
      console.error('[SpeechLocal] Error al iniciar:', e.message);
      if (_onError) _onError(e.message);
    }
  }

  function stop() {
    activo = false;
    if (reconocedor) {
      try { reconocedor.stop(); } catch (e) { }
      reconocedor = null;
      console.log('[SpeechLocal] Detenido');
    }
  }

  return { start: start, stop: stop, estaDisponible: estaDisponible };

})();
