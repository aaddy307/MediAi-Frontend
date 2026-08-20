import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scanFace } from '../../api/emergency';
import { colors } from '../../constants/theme';

export default function EmergencyScanScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const cameraRef = useRef(null);

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Loading camera permissions...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>MediAI needs camera access to identify patients in emergencies.</Text>
        <TouchableOpacity style={styles.grantButton} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    setScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      const formData = new FormData();
      // NOTE: confirm exact field name + response shape against emergency.routes.js
      formData.append('image', { uri: photo.uri, name: 'scan.jpg', type: 'image/jpeg' });
      const data = await scanFace(formData);
      setResult(data);
    } catch (err) {
      setResult({ error: 'No match found or scan failed. Please try again or call emergency services directly.' });
    } finally {
      setScanning(false);
    }
  };

  return (
    <View style={styles.container}>
      {!result ? (
        <>
          <CameraView ref={cameraRef} style={styles.camera} facing="front" />
          <TouchableOpacity 
            style={[styles.captureButton, { paddingBottom: Math.max(insets.bottom, 18), paddingTop: 18 }]} 
            onPress={handleCapture} 
            disabled={scanning}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>{scanning ? 'Scanning...' : 'Capture & Identify'}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={[styles.resultBox, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          {result.error ? (
            <Text style={styles.errorText}>{result.error}</Text>
          ) : (
            <>
              <Text style={styles.resultTitle}>Patient Identified</Text>
              <Text style={styles.text}>Name: {result.name}</Text>
              <Text style={styles.text}>Blood Type: {result.bloodType}</Text>
              <Text style={styles.text}>Allergies: {result.allergies?.join(', ') || 'None listed'}</Text>
              <Text style={styles.text}>Emergency Contact: {result.emergencyContact}</Text>
            </>
          )}
          <TouchableOpacity style={styles.grantButton} onPress={() => setResult(null)}>
            <Text style={styles.buttonText}>Scan Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.background },
  camera: { flex: 1 },
  captureButton: { backgroundColor: colors.danger, padding: 18, alignItems: 'center' },
  grantButton: { backgroundColor: colors.primary, padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  resultBox: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: colors.background },
  resultTitle: { fontSize: 22, fontWeight: '700', color: colors.primary, marginBottom: 12 },
  text: { fontSize: 16, color: colors.text, marginBottom: 6 },
  errorText: { fontSize: 16, color: colors.danger, textAlign: 'center' },
});
