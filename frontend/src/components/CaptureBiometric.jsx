import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { verifyBiometric } from '../services/biometricApi';

export default function CaptureBiometric({ onResult }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [loadingModels, setLoadingModels] = useState(true);
  const [status, setStatus] = useState('inicial');
  const [distance, setDistance] = useState(null);
  const isTest = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('test') === 'true';

  useEffect(() => {
    const load = async () => {
      const modelUrl = '/models'; // coloca los modelos en public/models o usa CDN
      await faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl);
      await faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl);
      await faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl);
      setLoadingModels(false);
    };
    load();
  }, []);

  const startCamera = async () => {
    setStatus('camera');
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoRef.current.srcObject = stream;
    await videoRef.current.play();
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    if (stream) stream.getTracks().forEach(t => t.stop());
    videoRef.current.srcObject = null;
  };

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg');
  };

  const getDescriptorFromDataUrl = async (dataUrl) => {
    const img = await faceapi.fetchImage(dataUrl);
    const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
    if (!detection) throw new Error('No se detectó rostro');
    return detection.descriptor;
  };

  const handleVerify = async () => {
    try {
      setStatus('capturing');
      let selfieData;
      let docDataUrl;

      if (isTest) {
        // En modo test usamos inputs de fichero añadidos al DOM (para automatización E2E)
        const selfieInput = document.getElementById('test-selfie');
        const docInput = document.getElementById('test-doc');
        if (!selfieInput || !docInput || !selfieInput.files.length || !docInput.files.length) {
          throw new Error('Faltan archivos de prueba (selfie/document) en modo test');
        }
        selfieData = await readFileAsDataUrl(selfieInput.files[0]);
        docDataUrl = await readFileAsDataUrl(docInput.files[0]);
      } else {
        const selfie = captureFrame();
        selfieData = selfie;
        stopCamera();

        // Pedir al usuario subir la foto del documento (archivo) — simple input
        setStatus('upload_doc');
        const file = await promptForFile();
        const reader = new FileReader();
        docDataUrl = await new Promise((res, rej) => {
          reader.onload = () => res(reader.result);
          reader.onerror = rej;
          reader.readAsDataURL(file);
        });
      }

      setStatus('comparing');
      const desc1 = await getDescriptorFromDataUrl(selfieData);
      const desc2 = await getDescriptorFromDataUrl(docDataUrl);

      const d = faceapi.euclideanDistance(desc1, desc2);
      setDistance(d);
      const match = d < 0.45; // threshold empírico

      // Enviar resultado al backend (opcional)
      try {
        await verifyBiometric({ match, distance: d });
      } catch (e) {
        console.warn('No se pudo enviar resultado al backend', e.message);
      }

      setStatus(match ? 'match' : 'no_match');
      onResult && onResult({ match, distance: d });
    } catch (error) {
      setStatus('error');
      console.error(error);
    }
  };

  const promptForFile = () => new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => resolve(input.files[0]);
    input.click();
  });

  const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  return (
    <div style={{ padding: 12 }}>
      <h3>Prueba biométrica (PoC)</h3>
      {loadingModels && <p>Cargando modelos de reconocimiento facial...</p>}
      {!loadingModels && (
        <>
          {isTest && (
            <div style={{ display: 'none' }}>
              <input id="test-selfie" type="file" accept="image/*" />
              <input id="test-doc" type="file" accept="image/*" />
            </div>
          )}
          {status !== 'camera' && <button onClick={startCamera}>Iniciar cámara</button>}
          {status === 'camera' && <button onClick={stopCamera}>Detener cámara</button>}
          <div style={{ marginTop: 8 }}>
            <video ref={videoRef} style={{ width: 320, height: 240, background: '#000' }} playsInline muted />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>

          <div style={{ marginTop: 8 }}>
            <button onClick={handleVerify} disabled={status === 'capturing' || status === 'comparing'}>Capturar selfie y comparar con documento</button>
          </div>

          <div style={{ marginTop: 12 }}>
            <p>Status: {status}</p>
            {distance !== null && <p>Distancia: {distance.toFixed(4)}</p>}
            {status === 'match' && <p style={{ color: 'green' }}>Rostro coincide ✅</p>}
            {status === 'no_match' && <p style={{ color: 'red' }}>No coincide ❌</p>}
            {status === 'error' && <p style={{ color: 'orange' }}>Error procesando imagen</p>}
          </div>
        </>
      )}
    </div>
  );
}
