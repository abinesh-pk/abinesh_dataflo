import { useState, useRef, useCallback, useEffect } from 'react';
import { fmtTs } from '../utils/helpers';

export default function useTranscription(videoRef) {
  const [transcripts, setTranscripts] = useState([]);
  const [interimText, setInterimText] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [alertCount, setAlertCount] = useState(0);
  const [status, setStatus] = useState({ text: 'Not connected', color: '#555' });
  const [connected, setConnected] = useState(false);

  const wsRef = useRef(null);
  const startedRef = useRef(false);
  const pipelineActiveRef = useRef(false);
  const isLiveStreamRef = useRef(false);
  const transcriptQueueRef = useRef([]);
  const alertQueueRef = useRef([]);
  const syncTimerRef = useRef(null);

  const send = useCallback((obj) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  }, []);

  const clearQueues = useCallback(() => {
    transcriptQueueRef.current = [];
    alertQueueRef.current = [];
  }, []);

  const startSyncTimer = useCallback(() => {
    if (syncTimerRef.current) return;
    syncTimerRef.current = setInterval(() => {
      const vid = videoRef.current;
      if (!vid || vid.paused) return;
      const ct = vid.currentTime;

      const tq = transcriptQueueRef.current;
      let lastInterim = null;
      const finalsToAdd = [];
      let idx = 0;
      while (idx < tq.length && tq[idx].start <= ct) {
        const item = tq[idx];
        if (item.is_final) {
          finalsToAdd.push({ text: item.text, timestamp: item.timestamp });
          lastInterim = null;
        } else {
          lastInterim = { text: item.text, timestamp: item.timestamp };
        }
        idx++;
      }
      if (idx > 0) tq.splice(0, idx);

      if (finalsToAdd.length > 0) {
        setTranscripts((prev) => [...prev, ...finalsToAdd]);
        setInterimText(lastInterim);
      } else if (lastInterim) {
        setInterimText(lastInterim);
      }

      while (alertQueueRef.current.length > 0 && alertQueueRef.current[0].showAt <= ct) {
        const item = alertQueueRef.current.shift();
        setAlerts((prev) => [item, ...prev]);
        setAlertCount((prev) => prev + 1);
      }
    }, 100);
  }, [videoRef]);

  const stopSyncTimer = useCallback(() => {
    if (syncTimerRef.current) {
      clearInterval(syncTimerRef.current);
      syncTimerRef.current = null;
    }
  }, []);

  const closeWs = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const connect = useCallback((source, keywords, isLiveStream) => {
    setTranscripts([]);
    setInterimText(null);
    setAlerts([]);
    setAlertCount(0);
    setStatus({ text: 'Not connected', color: '#555' });
    startedRef.current = false;
    pipelineActiveRef.current = false;
    isLiveStreamRef.current = isLiveStream;
    clearQueues();
    stopSyncTimer();
    closeWs();

    const ws = new WebSocket('ws://' + location.host + '/ws');
    wsRef.current = ws;

    ws.addEventListener('open', () => {
      if (wsRef.current !== ws) return;
      send({ action: 'init', source, keywords });
      setStatus({ text: 'Ready \u2014 play the video', color: '#4caf50' });
      setConnected(true);
    });

    ws.addEventListener('message', (e) => {
      if (wsRef.current !== ws) return;
      const msg = JSON.parse(e.data);

      if (msg.type === 'transcript') {
        const ts = msg.timestamp || fmtTs(msg.start);

        if (isLiveStreamRef.current) {
          if (msg.is_final) {
            setInterimText(null);
            setTranscripts((prev) => [...prev, { text: msg.text, timestamp: ts }]);
          } else {
            setInterimText({ text: msg.text, timestamp: ts });
          }
        } else {
          transcriptQueueRef.current.push({
            text: msg.text,
            timestamp: ts,
            start: msg.start,
            is_final: msg.is_final,
          });
        }
      }

      if (msg.type === 'alert') {
        if (isLiveStreamRef.current) {
          setAlerts((prev) => [msg, ...prev]);
          setAlertCount((prev) => prev + 1);
        } else {
          alertQueueRef.current.push({
            keyword: msg.keyword,
            timestamp: msg.timestamp,
            start: msg.start,
            context: msg.context,
            match_type: msg.match_type,
            showAt: msg.start,
          });
        }
      }

      if (msg.type === 'status') {
        if (msg.status === 'running')  setStatus({ text: 'Transcribing...', color: '#4caf50' });
        if (msg.status === 'paused')   setStatus({ text: 'Paused', color: '#ff9800' });
        if (msg.status === 'stopped')  setStatus({ text: 'Stopped', color: '#999' });
        if (msg.status === 'finished') {
          if (isLiveStreamRef.current) {
            setStatus({ text: 'Finished', color: '#999' });
            pipelineActiveRef.current = false;
          } else {
            setStatus({ text: 'Processing complete \u2014 play to see transcript', color: '#4caf50' });
          }
        }
        if (msg.status === 'error') setStatus({ text: 'Error', color: '#d32f2f' });
        if (msg.status === 'ready') {
          if (isLiveStreamRef.current && !startedRef.current) {
            send({ action: 'start' });
            startedRef.current = true;
            pipelineActiveRef.current = true;
          } else {
            setStatus({ text: 'Ready \u2014 play the video', color: '#4caf50' });
          }
        }
      }
    });

    ws.addEventListener('close', () => {
      if (wsRef.current !== ws) return;
      wsRef.current = null;
      setStatus({ text: 'Disconnected', color: '#999' });
      setConnected(false);
      pipelineActiveRef.current = false;
      stopSyncTimer();
    });
  }, [send, clearQueues, stopSyncTimer, closeWs]);

  const stop = useCallback(() => {
    send({ action: 'stop' });
    const vid = videoRef.current;
    if (vid) vid.pause();
    startedRef.current = false;
    pipelineActiveRef.current = false;
    setConnected(false);
    closeWs();
    clearQueues();
    stopSyncTimer();
  }, [send, videoRef, clearQueues, stopSyncTimer, closeWs]);

  const onPlay = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (!startedRef.current) {
      send({ action: 'start' });
      startedRef.current = true;
      pipelineActiveRef.current = true;
    } else if (isLiveStreamRef.current && pipelineActiveRef.current) {
      send({ action: 'resume' });
    }
    if (!isLiveStreamRef.current) startSyncTimer();
  }, [send, startSyncTimer]);

  const onPause = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (isLiveStreamRef.current && pipelineActiveRef.current) send({ action: 'pause' });
  }, [send]);

  const onSeeked = useCallback(() => {
    if (isLiveStreamRef.current) return;
    alertQueueRef.current = [];
    setInterimText(null);
  }, []);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    };
  }, []);

  return {
    transcripts,
    interimText,
    alerts,
    alertCount,
    status,
    connected,
    connect,
    stop,
    onPlay,
    onPause,
    onSeeked,
  };
}
