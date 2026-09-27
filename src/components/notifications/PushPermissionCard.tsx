'use client';

import {useEffect, useState} from 'react';

type State = 'checking' | 'unsupported' | 'not-configured' | 'ready' | 'subscribed' | 'denied' | 'working' | 'error';

export function PushPermissionCard({activeDeviceCount}: {activeDeviceCount: number}) {
  const [state, setState] = useState<State>('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setState('unsupported');
      return;
    }

    void navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        if (Notification.permission === 'denied') {
          setState('denied');
        } else {
          setState(subscription ? 'subscribed' : 'ready');
        }
      })
      .catch(() => setState('error'));
  }, []);

  async function enablePush() {
    setState('working');
    setMessage('');
    try {
      const keyResponse = await fetch('/api/push/vapid-key', {cache: 'no-store'});
      if (!keyResponse.ok) {
        setState('not-configured');
        return;
      }
      const {publicKey} = await keyResponse.json() as {publicKey?: string};
      if (!publicKey) {
        setState('not-configured');
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'ready');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const json = subscription.toJSON();
      const response = await fetch('/api/push/subscriptions', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });
      if (!response.ok) throw new Error('Subscription could not be saved.');

      setState('subscribed');
      setMessage('Notifications are enabled on this device.');
    } catch (error) {
      console.error('Push notification setup failed.', error);
      setState('error');
      setMessage('Notifications could not be enabled on this device.');
    }
  }

  async function disablePush() {
    setState('working');
    setMessage('');
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch('/api/push/subscriptions', {
          method: 'DELETE',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({endpoint: subscription.endpoint}),
        });
        await subscription.unsubscribe();
      }
      setState('ready');
      setMessage('Notifications are disabled on this device.');
    } catch (error) {
      console.error('Push notification disable failed.', error);
      setState('error');
      setMessage('Notifications could not be disabled on this device.');
    }
  }

  return (
    <div style={{display:'grid',gap:'12px'}}>
      <div>
        <strong style={{display:'block'}}>Push notifications</strong>
        <span style={{fontSize:'12px',opacity:.72}}>
          {state === 'checking' ? 'Checking this device…' : null}
          {state === 'unsupported' ? 'This browser does not support Web Push.' : null}
          {state === 'not-configured' ? 'Push delivery is not configured in this preview yet.' : null}
          {state === 'denied' ? 'Notifications are blocked in this browser’s settings.' : null}
          {state === 'ready' ? 'Enable useful Team Clash alerts on this device.' : null}
          {state === 'subscribed' ? 'This device is subscribed to Team Clash alerts.' : null}
          {state === 'working' ? 'Updating notification settings…' : null}
          {state === 'error' ? 'There was a problem with notification setup.' : null}
        </span>
      </div>

      {activeDeviceCount > 0 ? (
        <span style={{fontSize:'11px',opacity:.65}}>{activeDeviceCount} active subscribed {activeDeviceCount === 1 ? 'device' : 'devices'} on this account</span>
      ) : null}

      {(state === 'ready' || state === 'not-configured' || state === 'error') ? (
        <button type="button" onClick={enablePush} disabled={state === 'not-configured'}>
          Enable on this device
        </button>
      ) : null}
      {state === 'subscribed' ? <button type="button" onClick={disablePush}>Disable on this device</button> : null}
      {message ? <span style={{fontSize:'12px'}}>{message}</span> : null}
    </div>
  );
}

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}
